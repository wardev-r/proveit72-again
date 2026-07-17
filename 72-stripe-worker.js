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
      } else if (path === '/voice' && request.method === 'POST') {
        return await handleVoice(request, env);
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
    success_url: successUrl || `${platformUrl}/dashboard.html?signup=success&session={CHECKOUT_SESSION_ID}`,
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
  };
}

// Caller pays via hosted Checkout, then is redirected into a fresh private room.
// Destination charge: creator keeps 72% (amount − 28% application fee). Inviolable.
async function handleCallCheckout(request, env) {
  const { handle, mode, memberId } = await request.json();
  if (!handle) throw new Error('handle is required');
  const creator = await resolveCreatorByHandle(env, handle);
  if (!creator) throw new Error('Creator not found');
  if (creator.isOnline === false) throw new Error('This creator is not taking calls right now');
  if (!creator.stripeAccountId || creator.chargesEnabled === false) {
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
      // the call actually connects (both parties in the room). No connect = voided.
      capture_method: 'manual',
      application_fee_amount: feeCents,
      transfer_data: { destination: creator.stripeAccountId },
      description: label,
      metadata: {
        creator_id: creator.userId,
        creator_account: creator.stripeAccountId,
        room,
        platform_fee_cents: feeCents,
        creator_earnings_cents: amountCents - feeCents,
      },
    },
    success_url: `${platformUrl}/room.html?r=${encodeURIComponent(room)}&role=caller&t=${token}`,
    cancel_url: `${platformUrl}/call/${encodeURIComponent(handle)}`,
    metadata: { creator_id: creator.userId, room, token, kind: 'call' },
  });

  // Track the call session so the room can capture-on-connect or void-on-no-show.
  await putSession(env, room, {
    room, token,
    creatorId: creator.userId,
    creatorAccount: creator.stripeAccountId,
    name, amountCents, feeCents,
    mode: mode || 'standard',
    memberId: memberId || null,
    status: 'pending',       // pending → authorized → connected → completed | voided
    paymentIntentId: null,
    createdAt: Date.now(),
  });

  return { url: session.url, room };
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
    refresh_url: `${platformUrl}/dashboard.html?onboard=refresh&userId=${userId}`,
    return_url: `${platformUrl}/dashboard.html?onboard=complete&userId=${userId}`,
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
    const allowed = ['pricePerCall', 'isOnline', 'displayName', 'bio', 'phoneNumber', 'username', 'twilioNumber', 'forwardNumber'];
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
  // Quick demo: webhook URL ?fwd=+1XXXXXXXXXX dials that number directly (no KV needed).
  let forward = url.searchParams.get('fwd');
  if (!forward) {
    const creator = await findCreatorByTwilioNumber(env, called);
    if (creator && creator.isOnline !== false) forward = creator.forwardNumber;
  }
  if (!forward) return xml(`<Say>This 72 number isn't taking calls right now. Goodbye.</Say>`);
  return xml(`<Say>Connecting you on 72.</Say><Dial callerId="${called}">${forward}</Dial>`);
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
