/**
 * 72 Marketplace — Cloudflare Worker
 * Model: Stripe Application Fees (manual payouts at scale)
 *
 * Required environment variables (set in Cloudflare dashboard):
 *   STRIPE_SECRET_KEY      — sk_test_... or sk_live_...
 *   STRIPE_WEBHOOK_SECRET  — whsec_... (from Stripe dashboard → Webhooks)
 *   PLATFORM_URL           — https://your-domain.com
 *
 * Optional KV namespace binding (name: KV_72) for creator data storage.
 *
 * Routes:
 *   POST /create-checkout-session   Creator subscription signup
 *   POST /create-call-payment       Per-call payment with 28% platform fee
 *   POST /connect-onboard           Stripe Connect Express account creation
 *   GET  /dashboard-link            Stripe Express dashboard link
 *   GET  /creator/:id               Get creator profile
 *   PUT  /creator/:id               Update creator price/status
 *   GET  /creators                  List all creators (owner only)
 *   POST /webhook                   Stripe webhook handler
 */

const STRIPE_API = 'https://api.stripe.com/v1';
// ⚠ INVIOLABLE: creators keep 72%. This is the brand's defining promise — never
// raise this above 0.28. Any fee/cost comes from the CALLER's total or the
// platform's 28%, never from the creator's 72%. (Owner: close doors before 71%.)
const PLATFORM_FEE_PERCENT = 0.28;   // platform keeps 28%, creators keep 72%
const PRODUCT_NAME = '72 Membership'; // created inline per-mode; no pre-made product id needed
const SUBSCRIPTION_AMOUNT_CENTS = 720; // $7.20/month
const TRIAL_DAYS = 30;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Owner-Key',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      let result;
      const path = url.pathname;

      if (path === '/create-checkout-session' && request.method === 'POST') {
        result = await handleCheckout(request, env);
      } else if (path === '/create-call-payment' && request.method === 'POST') {
        result = await handleCallPayment(request, env);
      } else if (path === '/create-call-checkout' && request.method === 'POST') {
        result = await handleCallCheckout(request, env);
      } else if (path === '/membership-start' && request.method === 'POST') {
        result = await handleMembershipStart(request, env);
      } else if (path === '/membership-confirm' && request.method === 'POST') {
        result = await handleMembershipConfirm(request, env);
      } else if (path === '/provision-number' && request.method === 'POST') {
        result = await handleProvisionNumber(request, env);
      } else if (path.startsWith('/call-info/') && request.method === 'GET') {
        result = await handleCallInfo(request, env, path);
      } else if (path.startsWith('/room/') && path.endsWith('/connected') && request.method === 'POST') {
        result = await handleRoomConnected(request, env, roomFromPath(path));
      } else if (path.startsWith('/room/') && path.endsWith('/void') && request.method === 'POST') {
        result = await handleRoomVoid(request, env, roomFromPath(path));
      } else if (path.startsWith('/room/') && request.method === 'GET') {
        result = await handleRoomStatus(env, roomFromPath(path));
      } else if (path === '/connect-onboard' && request.method === 'POST') {
        result = await handleConnectOnboard(request, env);
      } else if (path === '/dashboard-link' && request.method === 'GET') {
        result = await handleDashboardLink(request, env, url);
      } else if (path === '/creators' && request.method === 'GET') {
        result = await handleListCreators(request, env);
      } else if (path === '/test/setup-jane' && request.method === 'GET') {
        result = await handleTestSetupJane(request, env);
      } else if (path === '/voice' && request.method === 'POST') {
        return await handleVoice(request, env);
      } else if (path === '/voice/verify' && request.method === 'POST') {
        return await handleVoiceVerify(request, env);
      } else if (path === '/voice/status' && request.method === 'POST') {
        return await handleVoiceStatus(request, env);
      } else if (path === '/call/start' && request.method === 'POST') {
        result = await handleCallStart(request, env);
      } else if (path.startsWith('/twiml/')) {
        return await handleTwiml(request, env, path);
      } else if (path === '/call/member-status' && request.method === 'POST') {
        return await handleMemberStatus(request, env);
      } else if (path === '/call/caller-status' && request.method === 'POST') {
        return await handleCallerStatus(request, env);
      } else if (path === '/webhook' && request.method === 'POST') {
        return await handleWebhook(request, env);
      } else if (path.startsWith('/creator/')) {
        result = await handleCreatorRoute(request, env, path);
      } else {
        return new Response('Not Found', { status: 404 });
      }

      return json(result, 200, corsHeaders);
    } catch (err) {
      console.error('Worker error:', err.message);
      return json({ error: err.message }, 500, corsHeaders);
    }
  },
};

// ─── Stripe helpers ──────────────────────────────────────────────────────────

async function stripe(env, method, path, body = null) {
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2024-04-10',
    },
  };
  if (body) opts.body = encodeBody(body);
  const res = await fetch(`${STRIPE_API}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Stripe error ${res.status}`);
  return data;
}

function encodeBody(obj, prefix = '') {
  return Object.entries(flatten(obj, prefix))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v !== null && v !== undefined) {
      if (typeof v === 'object' && !Array.isArray(v)) {
        Object.assign(out, flatten(v, key));
      } else if (Array.isArray(v)) {
        v.forEach((item, i) => {
          if (typeof item === 'object') Object.assign(out, flatten(item, `${key}[${i}]`));
          else out[`${key}[${i}]`] = item;
        });
      } else {
        out[key] = String(v);
      }
    }
  }
  return out;
}

// Cryptographically-random lowercase-alnum token (room ids, capture tokens).
function randToken(len = 12) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(bytes, b => alphabet[b % 36]).join('');
}

// ─── Route handlers ───────────────────────────────────────────────────────────

async function handleCheckout(request, env) {
  const { email, creatorId, successUrl, cancelUrl } = await request.json();
  if (!email) throw new Error('email is required');

  const platformUrl = env.PLATFORM_URL || 'https://your-domain.com';

  const session = await stripe(env, 'POST', '/checkout/sessions', {
    payment_method_types: ['card'],
    mode: 'subscription',
    customer_email: email,
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: PRODUCT_NAME },
        recurring: { interval: 'month' },
        unit_amount: SUBSCRIPTION_AMOUNT_CENTS,
      },
      quantity: 1,
    }],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { creator_id: creatorId || '' },
    },
    success_url: successUrl || `${platformUrl}/72-app-dashboard.html?signup=success&session={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || `${platformUrl}/`,
    metadata: { creator_id: creatorId || '', source: '72-landing' },
  });

  return { url: session.url, sessionId: session.id };
}

async function handleCallPayment(request, env) {
  const { amountDollars, creatorStripeAccountId, description, callId, callerEmail } = await request.json();
  if (!amountDollars || !creatorStripeAccountId) {
    throw new Error('amountDollars and creatorStripeAccountId are required');
  }
  if (amountDollars < 5) {
    throw new Error('Call amount must be at least $5');
  }

  const amountCents = Math.round(amountDollars * 100);
  const feeCents = Math.round(amountCents * PLATFORM_FEE_PERCENT);
  const creatorCents = amountCents - feeCents;

  const paymentIntent = await stripe(env, 'POST', '/payment_intents', {
    amount: amountCents,
    currency: 'usd',
    application_fee_amount: feeCents,
    transfer_data: { destination: creatorStripeAccountId },
    description: description || '72 call payment',
    receipt_email: callerEmail || undefined,
    metadata: {
      call_id: callId || '',
      creator_account: creatorStripeAccountId,
      platform_fee_cents: feeCents,
      creator_earnings_cents: creatorCents,
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    breakdown: {
      total: amountDollars,
      platformFee: (feeCents / 100).toFixed(2),
      creatorEarning: (creatorCents / 100).toFixed(2),
      platformPercent: 28,
      creatorPercent: 72,
    },
  };
}

// Resolve a creator by public handle: try it as a userId first, then match username.
async function resolveCreatorByHandle(env, handle) {
  const direct = await getCreator(env, handle);
  if (direct) return direct;
  if (!env.KV_72) return null;
  const list = await env.KV_72.list({ prefix: 'creator:' });
  for (const k of list.keys) {
    const raw = await env.KV_72.get(k.name);
    if (!raw) continue;
    const c = JSON.parse(raw);
    if (c.username === handle) return c;
  }
  return null;
}

// Public: the /call/<handle> page reads this to show name + price before paying.
async function handleCallInfo(request, env, path) {
  const handle = path.split('/').filter(Boolean)[1];
  if (!handle) throw new Error('handle required');
  const c = await resolveCreatorByHandle(env, handle);
  if (!c) throw new Error('Creator not found');
  return {
    handle: c.username || c.userId,
    name: c.displayName || c.username || 'a 72 creator',
    pricePerCall: Math.max(5, Number(c.pricePerCall) || 5),
    isOnline: c.isOnline !== false,
    ready: !!(c.stripeAccountId && c.chargesEnabled !== false),
    // Delivery mode: 'frontdesk' = we call the caller (needs their number); else the
    // proven 'code' dial-in. Default is always the safe 'code' path.
    callMode: c.callMode === 'frontdesk' ? 'frontdesk' : 'code',
  };
}

// Caller pays via hosted Checkout, then is redirected into a fresh private room.
// Destination charge: creator keeps 72% (amount − 28% application fee). Inviolable.
async function handleCallCheckout(request, env) {
  const { handle, mode, memberId, channel, callerNumber } = await request.json();
  if (!handle) throw new Error('handle is required');
  const creator = await resolveCreatorByHandle(env, handle);
  if (!creator) throw new Error('Creator not found');
  if (creator.isOnline === false) throw new Error('This creator is not taking calls right now');

  // Delivery mode is the member's choice. 'frontdesk' = we ring the caller AND the member,
  // park the caller in a lobby, the member screens & accepts (press 1), we bridge & capture.
  // Anything else = the proven 'code' dial-in. Front desk needs the caller's number.
  const callMode = creator.callMode === 'frontdesk' ? 'frontdesk' : 'code';
  const callerNum = typeof callerNumber === 'string' ? callerNumber.replace(/[^\d+]/g, '') : '';
  if (callMode === 'frontdesk' && callerNum.length < 10) {
    throw new Error('A phone number is required so we can call you.');
  }
  // Direct-charge path: a member flagged allowDirectCharge (with no Connect account)
  // takes a paid call WITHOUT Stripe Connect — the charge lands in the platform's own
  // Stripe. Used to prove the phone flow without onboarding. Real creators use Connect.
  const directCharge = creator.allowDirectCharge === true && !creator.stripeAccountId;
  if (!directCharge && (!creator.stripeAccountId || creator.chargesEnabled === false)) {
    throw new Error('This creator has not finished payout setup yet');
  }

  // The 17.2%-covered "join" rate is only for actual members. No membership → no
  // discount. We verify the caller's own member record has a live subscription;
  // spoofing mode:'join' without one is rejected here, not just hidden in the UI.
  if (mode === 'join') {
    const member = memberId ? await getCreator(env, memberId) : null;
    const active = member && ['active_trial', 'active', 'trialing'].includes(member.subscriptionStatus);
    if (!active) throw new Error('The member rate requires a 72 membership — join first.');
    // Acquisition deal only: the 17.2%-covered call is a one-time new-member welcome,
    // not a standing discount. Once used, they pay standard rates like everyone else.
    if (member.acquisitionCallUsed) throw new Error('The new-member rate is a one-time welcome — already used.');
  }

  const handleSlug = (creator.username || creator.userId).toString().replace(/[^a-zA-Z0-9]/g, '');
  const room = `velvetrope-${handleSlug}-${randToken(10)}`; // one-time, hard to guess
  const token = randToken(24);                              // gates connect/void on this room
  const platformUrl = env.PLATFORM_URL || 'https://velvetrope2you.com';
  const name = creator.displayName || creator.username || 'a 72 creator';

  // Amount by mode. 'first-call' = the fixed $10 Emergence first call. 'join' covers
  // 17.2% for a caller who becomes a member (→ $8.28). Any other/absent mode falls back
  // to the creator's standard per-call rate (the simple pay-and-connect flow). The
  // member's 72% of the STATED $10 ($7.20) is inviolable in both first-call modes — the
  // join discount comes out of the platform's cut, never the creator's.
  const STATED_FIRST_CALL_CENTS = 1000;
  const MEMBER_FIRST_CALL_CENTS = Math.round(STATED_FIRST_CALL_CENTS * (1 - PLATFORM_FEE_PERCENT)); // 720
  let amountCents, feeCents, label;
  if (mode === 'first-call') {
    amountCents = STATED_FIRST_CALL_CENTS;                     // $10.00
    feeCents = amountCents - MEMBER_FIRST_CALL_CENTS;          // $2.80 platform · $7.20 member
    label = `72 first call with ${name}`;
  } else if (mode === 'join') {
    amountCents = Math.round(STATED_FIRST_CALL_CENTS * (1 - 0.172)); // $8.28 (17.2% covered)
    feeCents = amountCents - MEMBER_FIRST_CALL_CENTS;          // $1.08 platform · $7.20 member
    label = `72 first call with ${name} · member rate`;
  } else {
    const amt = Math.max(5, Number(creator.pricePerCall) || 5);
    amountCents = Math.round(amt * 100);
    feeCents = Math.round(amountCents * PLATFORM_FEE_PERCENT); // standard 28%
    label = `72 call with ${name}`;
  }

  // Phone delivery: the caller gets a 6-digit code + the member's 772 number. They
  // call it, punch the code, and the member's phone rings. Card captures only when
  // the call actually connects (Twilio dial status), voids otherwise.
  const pin = String(Math.floor(100000 + Math.random() * 900000));
  const dialNumber = creator.twilioNumber || env.PLATFORM_CALL_NUMBER || '';

  // Never authorize a card for a call we cannot connect. The 'code' path needs a
  // number for the caller to dial; without one connect.html has nothing to show
  // and the caller is left holding a PIN with no way to use it. Front desk calls
  // the caller instead, and video goes to the browser room, so neither needs this.
  if (channel !== 'video' && callMode !== 'frontdesk' && !dialNumber) {
    throw new Error(
      `${name} has not finished phone setup yet — no number to call. ` +
      `Nothing was charged.`
    );
  }

  // Base product = phone call (connect.html: call the 772 number + code). Video is the
  // upsell (channel='video' → the browser room). Both share the same money/capture engine.
  // Success routing by delivery mode: video room (upsell) → room.html; front-desk →
  // frontdesk.html (we call you); default phone → connect.html (code dial-in).
  const successUrl = channel === 'video'
    ? `${platformUrl}/room.html?r=${encodeURIComponent(room)}&role=caller&t=${token}`
    : callMode === 'frontdesk'
      ? `${platformUrl}/frontdesk.html?r=${encodeURIComponent(room)}&t=${token}`
      : `${platformUrl}/connect.html?pin=${pin}&num=${encodeURIComponent(dialNumber)}&r=${encodeURIComponent(room)}&t=${token}`;

  const session = await stripe(env, 'POST', '/checkout/sessions', {
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: label },
        unit_amount: amountCents,
      },
      quantity: 1,
    }],
    payment_intent_data: {
      // AUTHORIZE only — the card is held, not charged. Capture happens the moment
      // the call actually connects (Twilio dial status). No connect = voided.
      capture_method: 'manual',
      // Connect split (creator keeps 72%). Omitted on the direct-charge test path,
      // where the whole amount lands in the platform's own Stripe.
      ...(directCharge ? {} : {
        application_fee_amount: feeCents,
        transfer_data: { destination: creator.stripeAccountId },
      }),
      description: label,
      metadata: {
        creator_id: creator.userId,
        creator_account: creator.stripeAccountId || 'direct',
        room,
        platform_fee_cents: directCharge ? 0 : feeCents,
        creator_earnings_cents: directCharge ? amountCents : amountCents - feeCents,
      },
    },
    success_url: successUrl,
    cancel_url: `${platformUrl}/call/${encodeURIComponent(handle)}`,
    metadata: { creator_id: creator.userId, room, token, kind: 'call' },
  });

  // Track the call session so the phone gate can capture-on-connect or void-on-no-show.
  await putSession(env, room, {
    room, token,
    creatorId: creator.userId,
    creatorAccount: creator.stripeAccountId,
    name, amountCents, feeCents,
    pin,
    creatorTwilioNumber: dialNumber || null,
    forwardNumber: creator.forwardNumber || null,
    used: false,
    callMode,
    callerNumber: callMode === 'frontdesk' ? callerNum : null,
    mode: mode || 'standard',
    memberId: memberId || null,
    status: 'pending',       // pending → authorized → connected → completed | voided
    paymentIntentId: null,
    createdAt: Date.now(),
  });

  // Code → room pointer so the phone leg can find the paid session. Auto-expires (1h).
  if (env.KV_72) {
    await env.KV_72.put(`callpass:${pin}`, JSON.stringify({ room }), { expirationTtl: 3600 });
  }

  return { url: session.url, room, pin };
}

// ─── Join-and-call: new-member acquisition signup (free month) ────────────────
// A caller becoming a member to unlock the one-time 17.2%-covered call. Creates a
// free-trial subscription (card on file, $0 now) and sends them back to the call
// page as a member. Twilio free-number provisioning is a separate, later step.
async function handleMembershipStart(request, env) {
  const { email, handle } = await request.json();
  if (!email) throw new Error('email is required');
  const userId = 'member-' + randToken(12);
  const platformUrl = env.PLATFORM_URL || 'https://velvetrope2you.com';
  const backTo = handle ? `/call/${encodeURIComponent(handle)}` : '/';

  // Pre-create the member record (pending until the subscription is confirmed).
  await putCreator(env, userId, {
    userId, email, role: 'member',
    subscriptionStatus: 'pending',
    acquisitionCallUsed: false,
    createdAt: Date.now(), updatedAt: Date.now(),
  });

  const session = await stripe(env, 'POST', '/checkout/sessions', {
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: PRODUCT_NAME },
        recurring: { interval: 'month' },
        unit_amount: SUBSCRIPTION_AMOUNT_CENTS,
      },
      quantity: 1,
    }],
    subscription_data: { trial_period_days: TRIAL_DAYS, metadata: { creator_id: userId } },
    success_url: `${platformUrl}${backTo}?joined=${userId}&s={CHECKOUT_SESSION_ID}`,
    cancel_url: `${platformUrl}${backTo}`,
    metadata: { creator_id: userId, source: 'join-and-call' },
  });

  return { url: session.url, userId };
}

// Confirm the membership synchronously on return (no webhook race), so the caller
// can immediately take their discounted call.
async function handleMembershipConfirm(request, env) {
  const { userId, sessionId } = await request.json();
  if (!userId || !sessionId) throw new Error('userId and sessionId are required');
  const member = await getCreator(env, userId);
  if (!member) throw new Error('member not found');

  const cs = await stripe(env, 'GET', `/checkout/sessions/${sessionId}`);
  let active = false;
  if (cs.subscription) {
    const sub = await stripe(env, 'GET', `/subscriptions/${cs.subscription}`);
    active = ['trialing', 'active'].includes(sub.status);
  }
  if (!active) throw new Error('membership not active yet');

  await putCreator(env, userId, {
    ...member,
    stripeCustomerId: cs.customer || member.stripeCustomerId,
    subscriptionId: cs.subscription,
    subscriptionStatus: 'active_trial',
    subscriptionStarted: Date.now(),
    updatedAt: Date.now(),
  });
  return { ok: true, memberId: userId };
}

// ─── Twilio number — a member's free number, provisioned ON REQUEST ───────────
// Not automatic: the member claims it from their dashboard when they log back in.
// Idempotent and gated on an active membership. No-ops safely until Twilio creds
// (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN) are configured, so preview won't buy.
async function handleProvisionNumber(request, env) {
  const { memberId } = await request.json();
  if (!memberId) throw new Error('memberId is required');
  const member = await getCreator(env, memberId);
  if (!member) throw new Error('member not found');
  const active = ['active_trial', 'active', 'trialing'].includes(member.subscriptionStatus);
  if (!active) throw new Error('An active membership is required to claim a number.');
  if (member.twilioNumber) return { number: member.twilioNumber, alreadyHad: true };
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    return { number: null, pending: true, reason: 'Number provisioning is not switched on yet.' };
  }
  const number = await buyTwilioNumber(env);
  await putCreator(env, memberId, {
    ...member, twilioNumber: number, numberProvisionedAt: Date.now(), updatedAt: Date.now(),
  });
  return { number };
}

async function twilio(env, method, path, body) {
  const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
  const opts = { method, headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' } };
  if (body) opts.body = new URLSearchParams(body).toString();
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Twilio error ${res.status}`);
  return data;
}

async function buyTwilioNumber(env) {
  // Grab one available US local number, buy it, and point its Voice webhook at us.
  // Brand rule (agents.json): numbers must be in the 772 area code ONLY.
  const voiceBase = env.PLATFORM_API || 'https://api.velvetrope2you.com';
  const areaCode = env.TWILIO_AREA_CODE || '772';
  const avail = await twilio(env, 'GET', `/AvailablePhoneNumbers/US/Local.json?AreaCode=${encodeURIComponent(areaCode)}&VoiceEnabled=true&SmsEnabled=true&PageSize=1`);
  const candidate = avail.available_phone_numbers && avail.available_phone_numbers[0] && avail.available_phone_numbers[0].phone_number;
  if (!candidate) throw new Error(`No ${areaCode} numbers available right now — try again shortly.`);
  const bought = await twilio(env, 'POST', '/IncomingPhoneNumbers.json', {
    PhoneNumber: candidate,
    VoiceUrl: `${voiceBase}/voice`,
    VoiceMethod: 'POST',
    FriendlyName: '72 member number',
  });
  return bought.phone_number;
}

async function handleConnectOnboard(request, env) {
  const { email, userId, firstName, lastName } = await request.json();
  if (!email || !userId) throw new Error('email and userId are required');

  const platformUrl = env.PLATFORM_URL || 'https://your-domain.com';

  const account = await stripe(env, 'POST', '/accounts', {
    type: 'express',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
    individual: {
      first_name: firstName || '',
      last_name: lastName || '',
      email,
    },
    metadata: { user_id: userId, source: '72-platform' },
  });

  const link = await stripe(env, 'POST', '/account_links', {
    account: account.id,
    refresh_url: `${platformUrl}/72-app-dashboard.html?onboard=refresh&userId=${userId}`,
    return_url: `${platformUrl}/72-app-dashboard.html?onboard=complete&userId=${userId}`,
    type: 'account_onboarding',
  });

  if (env.KV_72) {
    const existing = await getCreator(env, userId);
    await putCreator(env, userId, {
      ...existing,
      userId,
      email,
      stripeAccountId: account.id,
      onboardingComplete: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
  }

  return { accountId: account.id, onboardingUrl: link.url };
}

async function handleDashboardLink(request, env, url) {
  const accountId = url.searchParams.get('accountId');
  if (!accountId) throw new Error('accountId query param required');
  const link = await stripe(env, 'POST', `/accounts/${accountId}/login_links`, {});
  return { url: link.url };
}

async function handleListCreators(request, env) {
  requireOwnerKey(request, env);
  if (!env.KV_72) return { creators: [], total: 0 };
  const list = await env.KV_72.list({ prefix: 'creator:' });
  const creators = await Promise.all(
    list.keys.map(async (k) => {
      const raw = await env.KV_72.get(k.name);
      return raw ? JSON.parse(raw) : null;
    })
  );
  return { creators: creators.filter(Boolean), total: creators.length };
}

async function handleCreatorRoute(request, env, path) {
  const segments = path.split('/').filter(Boolean);
  const userId = segments[1];
  if (!userId) throw new Error('userId required');

  if (request.method === 'GET') {
    const creator = await getCreator(env, userId);
    if (!creator) throw new Error('Creator not found');
    return creator;
  }

  if (request.method === 'PUT') {
    const body = await request.json();
    const allowed = ['pricePerCall', 'isOnline', 'displayName', 'bio', 'phoneNumber', 'username', 'twilioNumber', 'forwardNumber', 'callMode'];
    const updates = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }
    if (updates.pricePerCall !== undefined) {
      if (updates.pricePerCall < 5) {
        throw new Error('Price must be at least $5');
      }
    }
    const existing = await getCreator(env, userId) || { userId };
    const updated = { ...existing, ...updates, updatedAt: Date.now() };
    await putCreator(env, userId, updated);
    return updated;
  }

  throw new Error('Method not allowed');
}

// ─── Webhook ──────────────────────────────────────────────────────────────────

async function handleWebhook(request, env) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  // Signature verification using HMAC-SHA256
  if (env.STRIPE_WEBHOOK_SECRET && sig) {
    const valid = await verifyWebhookSignature(body, sig, env.STRIPE_WEBHOOK_SECRET);
    if (!valid) {
      return new Response('Invalid signature', { status: 400 });
    }
  }

  let event;
  try { event = JSON.parse(body); }
  catch { return new Response('Invalid JSON', { status: 400 }); }

  console.log(`Webhook: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed':
      await onCheckoutComplete(event.data.object, env);
      break;
    case 'customer.subscription.trial_will_end':
      await onTrialEnding(event.data.object, env);
      break;
    case 'customer.subscription.deleted':
      await onSubscriptionDeleted(event.data.object, env);
      break;
    case 'account.updated':
      await onConnectAccountUpdated(event.data.object, env);
      break;
    case 'payment_intent.succeeded':
      await onCallPaymentSucceeded(event.data.object, env);
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function verifyWebhookSignature(payload, sigHeader, secret) {
  const parts = Object.fromEntries(
    sigHeader.split(',').map(p => p.split('='))
  );
  const timestamp = parts.t;
  const expectedSig = parts.v1;
  if (!timestamp || !expectedSig) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const computed = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return computed === expectedSig;
}

async function onCheckoutComplete(session, env) {
  if (!env.KV_72) return;
  const creatorId = session.metadata?.creator_id;
  if (!creatorId) return;
  const creator = await getCreator(env, creatorId) || { userId: creatorId };

  // A caller just authorized a call — record the held PaymentIntent against the
  // room and surface the room so the creator can accept/join it.
  if (session.metadata?.kind === 'call') {
    const room = session.metadata.room;
    const s = await getSession(env, room);
    if (s) {
      s.paymentIntentId = session.payment_intent || s.paymentIntentId;
      s.status = 'authorized';
      s.authorizedAt = Date.now();
      await putSession(env, room, s);
    }
    await putCreator(env, creatorId, {
      ...creator,
      activeRoom: room,
      activeRoomToken: session.metadata.token || null,
      activeRoomAt: Date.now(),
      updatedAt: Date.now(),
    });
    return;
  }

  // Otherwise this is a membership signup.
  await putCreator(env, creatorId, {
    ...creator,
    stripeCustomerId: session.customer,
    subscriptionId: session.subscription,
    subscriptionStatus: 'active_trial',
    subscriptionStarted: Date.now(),
    updatedAt: Date.now(),
  });
}

async function onTrialEnding(subscription, env) {
  if (!env.KV_72) return;
  const creatorId = subscription.metadata?.creator_id;
  if (!creatorId) return;
  const creator = await getCreator(env, creatorId);
  if (creator) {
    await putCreator(env, creatorId, { ...creator, trialEndingSoon: true, updatedAt: Date.now() });
  }
}

async function onSubscriptionDeleted(subscription, env) {
  if (!env.KV_72) return;
  const creatorId = subscription.metadata?.creator_id;
  if (!creatorId) return;
  const creator = await getCreator(env, creatorId);
  if (creator) {
    await putCreator(env, creatorId, {
      ...creator, subscriptionStatus: 'cancelled', isOnline: false, updatedAt: Date.now(),
    });
  }
}

async function onConnectAccountUpdated(account, env) {
  if (!env.KV_72) return;
  const userId = account.metadata?.user_id;
  if (!userId) return;
  const creator = await getCreator(env, userId);
  if (creator) {
    await putCreator(env, userId, {
      ...creator,
      onboardingComplete: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      updatedAt: Date.now(),
    });
  }
}

async function onCallPaymentSucceeded(paymentIntent, env) {
  if (!env.KV_72) return;
  const meta = paymentIntent.metadata || {};
  const creatorAccount = meta.creator_account;
  if (!creatorAccount) return;

  // Find creator by stripe account ID and update total earnings
  const list = await env.KV_72.list({ prefix: 'creator:' });
  for (const key of list.keys) {
    const raw = await env.KV_72.get(key.name);
    if (!raw) continue;
    const creator = JSON.parse(raw);
    if (creator.stripeAccountId === creatorAccount) {
      const earned = parseInt(meta.creator_earnings_cents || 0, 10);
      await putCreator(env, creator.userId, {
        ...creator,
        totalEarningsCents: (creator.totalEarningsCents || 0) + earned,
        totalCalls: (creator.totalCalls || 0) + 1,
        updatedAt: Date.now(),
      });
      break;
    }
  }
}

// ─── Call sessions — charge only when a call actually connects ────────────────
// The room page calls these. On a real connection we CAPTURE the held payment;
// on a no-show we CANCEL the authorization so the caller is never charged.
// All transitions are idempotent so duplicate webhooks / retries can't double-act.

function roomFromPath(path) {
  // /room/<room>  or  /room/<room>/connected  or  /room/<room>/void
  const seg = path.split('/').filter(Boolean); // ['room', <room>, ...]
  return decodeURIComponent(seg[1] || '');
}

async function getSession(env, room) {
  if (!env.KV_72 || !room) return null;
  const raw = await env.KV_72.get(`callsession:${room}`);
  return raw ? JSON.parse(raw) : null;
}

async function putSession(env, room, s) {
  if (!env.KV_72 || !room) return;
  await env.KV_72.put(`callsession:${room}`, JSON.stringify(s));
}

// Public status for the room page: safe fields only.
async function handleRoomStatus(env, room) {
  const s = await getSession(env, room);
  if (!s) throw new Error('room not found');
  return {
    room: s.room,
    name: s.name,
    amount: (s.amountCents / 100).toFixed(2),
    status: s.status,
  };
}

// Both parties are in the room → capture the held payment. Idempotent.
async function handleRoomConnected(request, env, room) {
  const body = await request.json().catch(() => ({}));
  const s = await getSession(env, room);
  if (!s) throw new Error('room not found');
  if (s.token && body.token && s.token !== body.token) throw new Error('invalid token');
  if (s.status === 'completed') return { ok: true, status: 'completed' }; // already captured
  if (s.status === 'voided') throw new Error('this call was cancelled');
  if (!s.paymentIntentId) throw new Error('payment not authorized yet');

  // Capture the authorization. payment_intent.succeeded then records earnings.
  const pi = await stripe(env, 'POST', `/payment_intents/${s.paymentIntentId}/capture`, {});
  s.status = 'completed';
  s.connectedAt = s.connectedAt || Date.now();
  s.completedAt = Date.now();
  await putSession(env, room, s);
  await clearCreatorActiveRoom(env, s.creatorId, room); // stop the dashboard ringing

  // Burn the one-time new-member acquisition deal only on a completed join call.
  if (s.mode === 'join' && s.memberId) {
    const m = await getCreator(env, s.memberId);
    if (m && !m.acquisitionCallUsed) {
      await putCreator(env, s.memberId, { ...m, acquisitionCallUsed: true, acquisitionCallAt: Date.now(), updatedAt: Date.now() });
    }
  }
  return { ok: true, status: 'completed', paymentStatus: pi.status };
}

// No connection happened → release the hold. Idempotent; won't undo a capture.
async function handleRoomVoid(request, env, room) {
  const body = await request.json().catch(() => ({}));
  const s = await getSession(env, room);
  if (!s) throw new Error('room not found');
  if (s.token && body.token && s.token !== body.token) throw new Error('invalid token');
  if (s.status === 'completed') return { ok: false, status: 'completed' }; // too late — call connected
  if (s.status === 'voided') return { ok: true, status: 'voided' };
  if (s.paymentIntentId) {
    try { await stripe(env, 'POST', `/payment_intents/${s.paymentIntentId}/cancel`, {}); }
    catch (_) { /* already cancelled/expired — treat as voided */ }
  }
  s.status = 'voided';
  s.voidedAt = Date.now();
  await putSession(env, room, s);
  await clearCreatorActiveRoom(env, s.creatorId, room); // stop the dashboard ringing
  return { ok: true, status: 'voided' };
}

// Clear a creator's active-room pointer once its call resolves (captured/voided).
async function clearCreatorActiveRoom(env, creatorId, room) {
  if (!env.KV_72 || !creatorId) return;
  const c = await getCreator(env, creatorId);
  if (c && c.activeRoom === room) {
    await putCreator(env, creatorId, { ...c, activeRoom: null, activeRoomToken: null, updatedAt: Date.now() });
  }
}

// ─── Twilio voice — MVP: connect a caller to the creator's real phone ─────────
// Phase 2: gate on payment before <Dial> (Stripe pre-pay or Twilio <Pay>).
async function handleVoice(request, env) {
  const url = new URL(request.url);
  const form = await request.formData();
  const called = form.get('To') || '';
  const xml = (body) => new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  );
  // Escape hatch for a raw forward test (no pay gate): ?fwd=+1XXXXXXXXXX
  const fwd = url.searchParams.get('fwd');
  if (fwd) return xml(`<Say>Connecting you on 72.</Say><Dial callerId="${called}">${fwd}</Dial>`);

  // Pay-gate: ask for the 6-digit access code the caller received after paying.
  const creator = await findCreatorByTwilioNumber(env, called);
  const who = creator?.displayName ? ` with ${creator.displayName}` : '';
  return xml(
    `<Gather numDigits="6" action="/voice/verify?to=${encodeURIComponent(called)}" method="POST" timeout="15" finishOnKey="#">` +
    `<Say>You've got 72. Enter the six digit access code from your payment confirmation to connect${who}.</Say>` +
    `</Gather>` +
    `<Say>We didn't get a code. Goodbye.</Say>`
  );
}

// Caller entered their code → verify the paid session, then dial the member's phone.
async function handleVoiceVerify(request, env) {
  const url = new URL(request.url);
  const form = await request.formData();
  const digits = (form.get('Digits') || '').trim();
  const called = url.searchParams.get('to') || form.get('To') || '';
  const xml = (body) => new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  );
  const reject = (msg) => xml(`<Say>${msg}</Say><Hangup/>`);

  if (!env.KV_72 || !digits) return reject('No code entered. Goodbye.');
  const raw = await env.KV_72.get(`callpass:${digits}`);
  if (!raw) return reject('That code is not valid. Goodbye.');
  const s = await getSession(env, JSON.parse(raw).room);
  if (!s) return reject('That code is not valid. Goodbye.');
  if (s.used) return reject('That code has already been used. Goodbye.');
  if (s.status === 'voided' || s.status === 'completed') return reject('This call is already closed. Goodbye.');
  if (!s.paymentIntentId) return reject('Your payment is not confirmed yet. Please wait a moment, then call again.');
  if (s.creatorTwilioNumber && called && s.creatorTwilioNumber !== called) {
    return reject('That code is not valid for this number. Goodbye.');
  }
  const forward = s.forwardNumber || (await getCreator(env, s.creatorId))?.forwardNumber;
  if (!forward) return reject('This number is not taking calls right now. Goodbye.');

  // Spend the code so it can't be reused, then connect the two phones.
  s.used = true;
  s.dialStartedAt = Date.now();
  await putSession(env, s.room, s);
  await env.KV_72.delete(`callpass:${digits}`).catch(() => {});

  const callerId = s.creatorTwilioNumber || called;
  return xml(
    `<Say>Rope's open. Connecting you now.</Say>` +
    `<Dial callerId="${callerId}" action="/voice/status?room=${encodeURIComponent(s.room)}" method="POST" timeout="25">` +
    `<Number>${forward}</Number></Dial>`
  );
}

// Twilio reports how the dial ended → capture on a real connection, void otherwise.
async function handleVoiceStatus(request, env) {
  const url = new URL(request.url);
  const form = await request.formData();
  const room = url.searchParams.get('room');
  const status = form.get('DialCallStatus') || '';
  if (room) {
    if (status === 'completed') await captureSessionByRoom(env, room).catch(() => {});
    else await voidSessionByRoom(env, room).catch(() => {});
  }
  const msg = status === 'completed'
    ? 'Thanks for using 72. Goodbye.'
    : 'That call did not connect, so you were not charged. Goodbye.';
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Say>${msg}</Say></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  );
}

// Capture the held payment for a resolved session (shared by phone + room). Idempotent.
async function captureSessionByRoom(env, room) {
  const s = await getSession(env, room);
  if (!s || s.status === 'completed' || s.status === 'voided' || !s.paymentIntentId) return;
  await stripe(env, 'POST', `/payment_intents/${s.paymentIntentId}/capture`, {});
  s.status = 'completed';
  s.connectedAt = s.connectedAt || Date.now();
  s.completedAt = Date.now();
  await putSession(env, room, s);
  await clearCreatorActiveRoom(env, s.creatorId, room);
  if (s.mode === 'join' && s.memberId) {
    const m = await getCreator(env, s.memberId);
    if (m && !m.acquisitionCallUsed) {
      await putCreator(env, s.memberId, { ...m, acquisitionCallUsed: true, acquisitionCallAt: Date.now(), updatedAt: Date.now() });
    }
  }
}

// Release the hold for a session that never connected. Idempotent; won't undo a capture.
async function voidSessionByRoom(env, room) {
  const s = await getSession(env, room);
  if (!s || s.status === 'completed' || s.status === 'voided') return;
  if (s.paymentIntentId) {
    try { await stripe(env, 'POST', `/payment_intents/${s.paymentIntentId}/cancel`, {}); } catch (_) {}
  }
  s.status = 'voided';
  s.voidedAt = Date.now();
  await putSession(env, room, s);
  await clearCreatorActiveRoom(env, s.creatorId, room);
}

async function findCreatorByTwilioNumber(env, number) {
  if (!env.KV_72 || !number) return null;
  const list = await env.KV_72.list({ prefix: 'creator:' });
  for (const k of list.keys) {
    const raw = await env.KV_72.get(k.name);
    if (raw) { const c = JSON.parse(raw); if (c.twilioNumber === number) return c; }
  }
  return null;
}

// ─── KV helpers ───────────────────────────────────────────────────────────────

async function getCreator(env, userId) {
  if (!env.KV_72) return null;
  const raw = await env.KV_72.get(`creator:${userId}`);
  return raw ? JSON.parse(raw) : null;
}

// ─── One-time TEST helper: finish Jane's Connect account + seed her in KV ─────
// Test-mode only. Accepts ToS, sets DOB, requests the Transfers capability
// (Stripe clears these instantly in test mode), then seeds creator:testcreator.
// Hit it once: GET /test/setup-jane?acct=acct_XXXX  (defaults to Jane's acct).
async function handleTestSetupJane(request, env) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
    throw new Error('Refusing to run: this endpoint only works on a TEST Stripe key (sk_test_…).');
  }
  const url = new URL(request.url);
  const acct = url.searchParams.get('acct') || 'acct_1TuZa1PxRH6hMZgu';

  // 1) Update the connected account — the test-mode requirement bypass.
  const account = await stripe(env, 'POST', `/accounts/${acct}`, {
    business_type: 'individual',
    tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: '127.0.0.1' },
    individual: {
      first_name: 'Jane',
      last_name: 'Rivers',
      email: 'jane@test72.com',
      dob: { day: 1, month: 1, year: 1990 },
    },
    external_account: 'btok_us',
    capabilities: { transfers: { requested: true } },
  });

  // 2) Seed Jane into KV so the call flow can find her.
  const creator = {
    userId: 'testcreator',
    username: 'jane',
    displayName: 'Jane Rivers',
    stripeAccountId: acct,
    chargesEnabled: true,
    isOnline: true,
    pricePerCall: 20,
    forwardNumber: '+15555550100',
    subscriptionStatus: 'active_trial',
    acquisitionCallUsed: false,
  };
  await putCreator(env, 'testcreator', creator);

  const transfers = account.capabilities?.transfers || 'unknown';
  return {
    ok: true,
    message: transfers === 'active'
      ? 'Jane is READY — Transfers active and seeded into KV as creator:testcreator.'
      : `ToS accepted + transfers requested; capability now "${transfers}". Seeded into KV.`,
    account: acct,
    transfers,
    seeded: creator,
  };
}

async function putCreator(env, userId, data) {
  if (!env.KV_72) return;
  await env.KV_72.put(`creator:${userId}`, JSON.stringify(data));
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────

function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function requireOwnerKey(request, env) {
  if (!env.OWNER_API_KEY) return; // not configured — skip
  const provided = request.headers.get('X-Owner-Key');
  if (provided !== env.OWNER_API_KEY) throw new Error('Unauthorized');
}

// ─── Front Desk call flow (per-member callMode='frontdesk') ───────────────────
// Instead of the caller dialing in with a code, WE place the call. The caller is rung
// into a lobby (a Twilio Conference, on hold, isolated); the member is rung as a "front
// desk" screen and presses 1 to accept; we bridge them and CAPTURE. Decline / no-answer
// → VOID. Reuses the same manual-capture money engine — 72% intact. See
// 72-CONFERENCE-CALL-BUILD.md. Inert unless a member sets callMode='frontdesk' AND the
// Twilio secrets are configured, so it can never touch the live 'code' flow.

const CONF_PREFIX = 'vr72conf-';

function xmlResp(body) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,
    { headers: { 'Content-Type': 'text/xml' } });
}

function apiBase(env) { return env.PLATFORM_API || 'https://api.velvetrope2you.com'; }

// Kicked off by frontdesk.html after checkout success. Rings the caller + the member.
async function handleCallStart(request, env) {
  const { room, token } = await request.json();
  const s = await getSession(env, room);
  if (!s) throw new Error('call session not found');
  if (s.token !== token) throw new Error('invalid token');
  if (s.callMode !== 'frontdesk') throw new Error('this call is not a front-desk call');
  if (s.status === 'voided' || s.status === 'completed') throw new Error('this call is already closed');
  if (!s.paymentIntentId) return { ok: false, pending: true }; // payment webhook not in yet — retry
  if (s.dialStartedAt) return { ok: true, already: true };     // idempotent — don't double-ring
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) throw new Error('calling is not switched on yet');
  if (!s.callerNumber) throw new Error('no caller number on file');
  const forward = s.forwardNumber || (await getCreator(env, s.creatorId))?.forwardNumber;
  if (!forward) throw new Error('this member is not taking calls right now');
  const callerId = s.creatorTwilioNumber || env.PLATFORM_CALL_NUMBER;
  if (!callerId) throw new Error('no 72 number configured for this member');
  const api = apiBase(env);
  const r = encodeURIComponent(room);

  // 1) Ring the caller → lobby conference (on hold, isolated until the member accepts).
  const callerCall = await twilio(env, 'POST', '/Calls.json', {
    To: s.callerNumber, From: callerId,
    Url: `${api}/twiml/lobby?room=${r}`, Method: 'POST',
    StatusCallback: `${api}/call/caller-status?room=${r}`, StatusCallbackMethod: 'POST',
    StatusCallbackEvent: 'completed', TimeLimit: 3600,
  });
  // 2) Ring the member → the front-desk screen (press 1 to accept).
  const memberCall = await twilio(env, 'POST', '/Calls.json', {
    To: forward, From: callerId,
    Url: `${api}/twiml/frontdesk?room=${r}`, Method: 'POST',
    StatusCallback: `${api}/call/member-status?room=${r}`, StatusCallbackMethod: 'POST',
    StatusCallbackEvent: 'completed', Timeout: 25,
  });

  s.callerCallSid = callerCall.sid;
  s.memberCallSid = memberCall.sid;
  s.dialStartedAt = Date.now();
  s.status = 'ringing';
  await putSession(env, room, s);
  return { ok: true, ringing: true };
}

// TwiML router for the front-desk legs (Twilio POSTs here).
async function handleTwiml(request, env, path) {
  const room = new URL(request.url).searchParams.get('room') || '';
  const leg = path.split('/')[2] || '';
  if (leg === 'lobby') {
    const api = apiBase(env), r = encodeURIComponent(room);
    // Caller waits here (default hold music) until the member joins and starts the conference.
    return xmlResp(
      `<Say>One moment. Connecting your 72 call.</Say>` +
      `<Dial><Conference startConferenceOnEnter="false" endConferenceOnExit="true" beep="false">` +
      `${CONF_PREFIX}${room}</Conference></Dial>`
    );
  }
  if (leg === 'frontdesk') {
    const api = apiBase(env), r = encodeURIComponent(room);
    return xmlResp(
      `<Gather numDigits="1" action="${api}/twiml/accept?room=${r}" method="POST" timeout="20">` +
      `<Say>You've got 72. A paid call is waiting. Press 1 to open the rope.</Say>` +
      `</Gather>` +
      `<Redirect method="POST">${api}/twiml/decline?room=${r}</Redirect>`
    );
  }
  if (leg === 'accept') {
    const form = await request.formData().catch(() => null);
    const digit = form ? (form.get('Digits') || '') : '';
    if (digit !== '1') return await handleTwiml(request, env, '/twiml/decline');
    // Member accepted → capture (idempotent) → bridge into the conference.
    await captureSessionByRoom(env, room).catch(() => {});
    return xmlResp(
      `<Say>Rope's open. Connecting you now.</Say>` +
      `<Dial><Conference startConferenceOnEnter="true" endConferenceOnExit="true" beep="false">` +
      `${CONF_PREFIX}${room}</Conference></Dial>`
    );
  }
  if (leg === 'decline') {
    await voidSessionByRoom(env, room).catch(() => {});
    await endCallerLobby(env, room);
    return xmlResp(`<Say>No call taken. Goodbye.</Say><Hangup/>`);
  }
  return xmlResp(`<Hangup/>`);
}

// Member call ended. If they never accepted (no-answer/busy/failed/declined) → void +
// release the caller. void is idempotent — a captured call is never undone.
async function handleMemberStatus(request, env) {
  const room = new URL(request.url).searchParams.get('room') || '';
  const form = await request.formData().catch(() => null);
  const status = form ? (form.get('CallStatus') || '') : '';
  if (['no-answer', 'busy', 'failed', 'canceled', 'completed'].includes(status)) {
    const s = await getSession(env, room);
    if (s && s.status !== 'completed') {
      await voidSessionByRoom(env, room).catch(() => {});
      await endCallerLobby(env, room);
    }
  }
  return xmlResp('');
}

// Caller leg ended and we never captured → the call didn't happen → void.
async function handleCallerStatus(request, env) {
  const room = new URL(request.url).searchParams.get('room') || '';
  const form = await request.formData().catch(() => null);
  const status = form ? (form.get('CallStatus') || '') : '';
  if (['completed', 'no-answer', 'busy', 'failed', 'canceled'].includes(status)) {
    const s = await getSession(env, room);
    if (s && s.status !== 'completed') await voidSessionByRoom(env, room).catch(() => {});
  }
  return xmlResp('');
}

// Send the still-held caller a "not charged" hangup when the member doesn't take the call.
async function endCallerLobby(env, room) {
  const s = await getSession(env, room);
  if (!s || !s.callerCallSid) return;
  try {
    await twilio(env, 'POST', `/Calls/${s.callerCallSid}.json`, {
      Twiml: `<?xml version="1.0" encoding="UTF-8"?><Response><Say>They didn't pick up, so you were not charged. Goodbye.</Say><Hangup/></Response>`,
    });
  } catch (_) {}
}
