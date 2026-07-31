/**
 * Softphone worker for a single Twilio number.
 *
 * Serves the browser softphone UI (from ./public) and the four Twilio
 * webhooks behind it. Deliberately standalone: no Stripe, no KV, no
 * marketplace logic. The only thing it knows about is one phone number.
 *
 * Routes
 *   GET  /                      browser softphone UI (static asset)
 *   POST /token                 mint a Voice access token for the browser
 *   POST /voice/inbound         number rings -> fan out to laptop (+ phone)
 *   POST /voice/client-outbound browser dials out
 *   POST /voice/sip-outbound    SIP phone dials out (used once SIP is on)
 *   POST /voice/voicemail-done  recording finished
 *   GET  /health                config sanity check, no secrets echoed
 */

const TOKEN_TTL_SECONDS = 3600;
const RING_TIMEOUT_SECONDS = 25;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    try {
      switch (path) {
        case '/health':
          return health(env);
        case '/token':
          return await issueToken(request, env);
        case '/voice/inbound':
          return await handleVoice(request, env, inboundTwiml);
        case '/voice/after-dial':
          return await handleVoice(request, env, afterDialTwiml);
        case '/voice/client-outbound':
          return await handleVoice(request, env, clientOutboundTwiml);
        case '/voice/sip-outbound':
          return await handleVoice(request, env, sipOutboundTwiml);
        case '/voice/voicemail-done':
          return await handleVoice(request, env, () => '<Hangup/>');
        default:
          // Static assets are served ahead of the worker, so anything
          // reaching here is genuinely unknown.
          return new Response('Not found', { status: 404 });
      }
    } catch (err) {
      // Never leak internals to a caller. Voice routes still need valid
      // TwiML or Twilio plays its own generic error to the caller.
      console.error(`${path} failed:`, err && err.stack ? err.stack : err);
      if (path.startsWith('/voice/')) {
        return twiml(
          '<Say voice="Polly.Matthew">This line is not available right now. ' +
            'Please try again later.</Say><Hangup/>'
        );
      }
      return new Response('Internal error', { status: 500 });
    }
  },
};

/* ------------------------------------------------------------------ *
 * Voice webhooks
 * ------------------------------------------------------------------ */

/**
 * Shared wrapper: verify the request really came from Twilio, parse the
 * form body, hand off to a TwiML builder.
 */
async function handleVoice(request, env, build) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const raw = await request.text();
  const params = Object.fromEntries(new URLSearchParams(raw));

  const ok = await verifyTwilioSignature(request, params, env);
  if (!ok) {
    // Unsigned callers could otherwise make this number place calls.
    console.warn('Rejected unsigned Twilio request');
    return new Response('Invalid signature', { status: 403 });
  }

  return twiml(await build(params, env));
}

/**
 * Someone dialed the number. Ring the laptop, and the phone too once
 * SIP_ENABLED is turned on. First device to pick up wins; the others
 * stop ringing.
 */
function inboundTwiml(params, env) {
  const identity = clientIdentity(env);
  const legs = [`<Client>${xml(identity)}</Client>`];

  if (sipEnabled(env)) {
    const sipUri = `sip:${env.SIP_USERNAME}@${env.SIP_DOMAIN}`;
    legs.push(`<Sip>${xml(sipUri)}</Sip>`);
  }

  // answerOnBridge keeps the caller hearing real ringback and stops the
  // call being billed/"answered" until a device actually picks up.
  // callerId is left alone so the original caller's number shows through.
  //
  // The action handler decides answered-vs-missed. Without it, Twilio
  // would fall through to the next verb whenever the *answering* side
  // hung up, sending a perfectly normal call to voicemail.
  return (
    `<Dial answerOnBridge="true" timeout="${RING_TIMEOUT_SECONDS}" ` +
    `action="/voice/after-dial">` +
    legs.join('') +
    `</Dial>`
  );
}

/**
 * Runs once the inbound <Dial> finishes. A call that actually connected
 * is simply over; anything else (nobody home, all devices busy, failed)
 * gets the voicemail prompt.
 */
function afterDialTwiml(params) {
  const status = String(params.DialCallStatus || '').toLowerCase();

  if (status === 'completed' || status === 'answered') {
    return '<Hangup/>';
  }

  return (
    '<Say voice="Polly.Matthew">No one is available. ' +
    'Please leave a message after the tone.</Say>' +
    '<Record maxLength="120" playBeep="true" ' +
    'action="/voice/voicemail-done" timeout="5"/>' +
    '<Hangup/>'
  );
}

/** Browser dialed out: bridge to the PSTN showing the Twilio number. */
function clientOutboundTwiml(params, env) {
  return outboundTwiml(params.To, env);
}

/**
 * SIP phone dialed out. Twilio delivers the destination as a SIP URI
 * like sip:+16025551234@your-domain.sip.twilio.com, so the user part is
 * what we actually want to dial.
 */
function sipOutboundTwiml(params, env) {
  return outboundTwiml(sipUserPart(params.To), env);
}

function outboundTwiml(rawDestination, env) {
  const to = toE164(rawDestination);

  if (!to) {
    return (
      '<Say voice="Polly.Matthew">That number could not be dialed. ' +
      'Please check it and try again.</Say><Hangup/>'
    );
  }

  if (!env.SOFTPHONE_NUMBER) {
    console.error('SOFTPHONE_NUMBER is not configured');
    return (
      '<Say voice="Polly.Matthew">This line is not configured for ' +
      'outbound calls.</Say><Hangup/>'
    );
  }

  return (
    `<Dial callerId="${xml(env.SOFTPHONE_NUMBER)}" answerOnBridge="true">` +
    `<Number>${xml(to)}</Number>` +
    `</Dial>`
  );
}

/* ------------------------------------------------------------------ *
 * Access tokens for the browser client
 * ------------------------------------------------------------------ */

/**
 * The browser needs a short-lived Twilio access token to register. This
 * endpoint is passcode-gated: an open token endpoint lets anyone on the
 * internet place calls billed to this Twilio account.
 */
async function issueToken(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const required = [
    'SOFTPHONE_PASSCODE',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_API_KEY_SID',
    'TWILIO_API_KEY_SECRET',
    'TWIML_APP_SID',
  ];
  const missing = required.filter((k) => !env[k]);
  if (missing.length) {
    console.error('Token endpoint missing config:', missing.join(', '));
    return json({ error: 'Server not configured' }, 500);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Expected JSON body' }, 400);
  }

  const supplied = typeof body.passcode === 'string' ? body.passcode : '';
  if (!timingSafeEqual(supplied, env.SOFTPHONE_PASSCODE)) {
    return json({ error: 'Wrong passcode' }, 401);
  }

  const identity = clientIdentity(env);
  const token = await mintAccessToken(env, identity);

  return json({
    token,
    identity,
    number: env.SOFTPHONE_NUMBER || null,
    expiresIn: TOKEN_TTL_SECONDS,
  });
}

/**
 * Build a Twilio access token. It is a plain HS256 JWT signed with the
 * API key secret, plus Twilio's cty header and a voice grant.
 */
async function mintAccessToken(env, identity) {
  const now = Math.floor(Date.now() / 1000);

  const header = { typ: 'JWT', alg: 'HS256', cty: 'twilio-fpa;v=1' };
  const payload = {
    jti: `${env.TWILIO_API_KEY_SID}-${now}`,
    iss: env.TWILIO_API_KEY_SID,
    sub: env.TWILIO_ACCOUNT_SID,
    nbf: now,
    exp: now + TOKEN_TTL_SECONDS,
    grants: {
      identity,
      voice: {
        incoming: { allow: true },
        outgoing: { application_sid: env.TWIML_APP_SID },
      },
    },
  };

  const signingInput =
    `${base64Url(JSON.stringify(header))}.` +
    `${base64Url(JSON.stringify(payload))}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.TWILIO_API_KEY_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64UrlBytes(new Uint8Array(sig))}`;
}

/* ------------------------------------------------------------------ *
 * Twilio request signing
 * ------------------------------------------------------------------ */

/**
 * Twilio signs each webhook: HMAC-SHA1 over the exact request URL plus
 * every POST param sorted by name, keyed on the account auth token.
 *
 * The URL has to match byte for byte what Twilio requested. Behind a
 * proxy the incoming request URL can differ, so PUBLIC_BASE_URL can pin
 * it explicitly.
 */
async function verifyTwilioSignature(request, params, env) {
  const signature = request.headers.get('X-Twilio-Signature');
  if (!signature) return false;

  if (!env.TWILIO_AUTH_TOKEN) {
    console.error('TWILIO_AUTH_TOKEN missing; cannot verify webhooks');
    return false;
  }

  const url = new URL(request.url);
  const candidates = [];

  if (env.PUBLIC_BASE_URL) {
    const base = env.PUBLIC_BASE_URL.replace(/\/+$/, '');
    candidates.push(`${base}${url.pathname}${url.search}`);
  }
  candidates.push(`https://${url.host}${url.pathname}${url.search}`);

  const sorted = Object.keys(params).sort();
  let suffix = '';
  for (const k of sorted) suffix += k + params[k];

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.TWILIO_AUTH_TOKEN),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  for (const candidate of candidates) {
    const mac = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(candidate + suffix)
    );
    const expected = base64Bytes(new Uint8Array(mac));
    if (timingSafeEqual(expected, signature)) return true;
  }

  return false;
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function health(env) {
  const flag = (k) => Boolean(env[k]);
  return json({
    ok: true,
    number: env.SOFTPHONE_NUMBER || null,
    clientIdentity: clientIdentity(env),
    sipEnabled: sipEnabled(env),
    sipDomain: sipEnabled(env) ? env.SIP_DOMAIN || null : null,
    configured: {
      TWILIO_ACCOUNT_SID: flag('TWILIO_ACCOUNT_SID'),
      TWILIO_AUTH_TOKEN: flag('TWILIO_AUTH_TOKEN'),
      TWILIO_API_KEY_SID: flag('TWILIO_API_KEY_SID'),
      TWILIO_API_KEY_SECRET: flag('TWILIO_API_KEY_SECRET'),
      TWIML_APP_SID: flag('TWIML_APP_SID'),
      SOFTPHONE_PASSCODE: flag('SOFTPHONE_PASSCODE'),
    },
  });
}

function clientIdentity(env) {
  return env.CLIENT_IDENTITY || 'laptop';
}

/** SIP stays off until a phone is actually registered to the domain. */
function sipEnabled(env) {
  return (
    String(env.SIP_ENABLED).toLowerCase() === 'true' &&
    Boolean(env.SIP_USERNAME) &&
    Boolean(env.SIP_DOMAIN)
  );
}

/** "sip:+16025551234@example.sip.twilio.com" -> "+16025551234" */
function sipUserPart(uri) {
  if (!uri) return '';
  return String(uri)
    .replace(/^sips?:/i, '')
    .split('@')[0];
}

/**
 * Normalize a dialed string to E.164, assuming North America when no
 * country code is given. Returns null if it cannot be trusted.
 */
function toE164(input) {
  if (!input) return null;

  const trimmed = String(input).trim();
  const hadPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (!digits) return null;
  if (hadPlus) return digits.length >= 8 ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  // Anything else is ambiguous; make the caller be explicit with a +.
  return null;
}

function twiml(body) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,
    { headers: { 'Content-Type': 'text/xml; charset=utf-8' } }
  );
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

/** Escape text destined for an XML attribute or node. */
function xml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function base64Bytes(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function base64UrlBytes(bytes) {
  return base64Bytes(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64Url(str) {
  return base64UrlBytes(new TextEncoder().encode(str));
}

/** Constant-time-ish compare so secrets don't leak via timing. */
function timingSafeEqual(a, b) {
  const av = String(a);
  const bv = String(b);
  if (av.length !== bv.length) return false;
  let diff = 0;
  for (let i = 0; i < av.length; i++) {
    diff |= av.charCodeAt(i) ^ bv.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Exposed for scripts/test.mjs. The signature and token math is the part
 * that silently breaks every call if it drifts, so it is worth asserting
 * against Twilio's published vectors.
 */
export const _internal = {
  verifyTwilioSignature,
  mintAccessToken,
  inboundTwiml,
  afterDialTwiml,
  outboundTwiml,
  sipOutboundTwiml,
  toE164,
  sipUserPart,
  sipEnabled,
  xml,
};
