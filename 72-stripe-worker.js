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
      } else if (path.startsWith('/call-info/') && request.method === 'GET') {
        result = await handleCallInfo(request, env, path);
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
  };
}

// Caller pays via hosted Checkout, then is redirected into a fresh private room.
// Destination charge: creator keeps 72% (amount − 28% application fee). Inviolable.
async function handleCallCheckout(request, env) {
  const { handle } = await request.json();
  if (!handle) throw new Error('handle is required');
  const creator = await resolveCreatorByHandle(env, handle);
  if (!creator) throw new Error('Creator not found');
  if (creator.isOnline === false) throw new Error('This creator is not taking calls right now');
  if (!creator.stripeAccountId || creator.chargesEnabled === false) {
    throw new Error('This creator has not finished payout setup yet');
  }

  const amountDollars = Math.max(5, Number(creator.pricePerCall) || 5);
  const amountCents = Math.round(amountDollars * 100);
  const feeCents = Math.round(amountCents * PLATFORM_FEE_PERCENT); // 28% platform
  const handleSlug = (creator.username || creator.userId).toString().replace(/[^a-zA-Z0-9]/g, '');
  const room = `velvetrope-${handleSlug}-${Math.random().toString(36).slice(2, 8)}`;
  const platformUrl = env.PLATFORM_URL || 'https://velvetrope2you.com';
  const name = creator.displayName || creator.username || 'a 72 creator';

  const session = await stripe(env, 'POST', '/checkout/sessions', {
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `72 call with ${name}` },
        unit_amount: amountCents,
      },
      quantity: 1,
    }],
    payment_intent_data: {
      application_fee_amount: feeCents,
      transfer_data: { destination: creator.stripeAccountId },
      description: `72 call with ${name}`,
      metadata: {
        creator_id: creator.userId,
        creator_account: creator.stripeAccountId,
        room,
        platform_fee_cents: feeCents,
        creator_earnings_cents: amountCents - feeCents,
      },
    },
    success_url: `${platformUrl}/room.html?r=${encodeURIComponent(room)}&role=caller`,
    cancel_url: `${platformUrl}/call/${encodeURIComponent(handle)}`,
    metadata: { creator_id: creator.userId, room, kind: 'call' },
  });

  return { url: session.url, room };
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

  // A caller just paid for a call — surface the room so the creator can join it.
  if (session.metadata?.kind === 'call') {
    await putCreator(env, creatorId, {
      ...creator,
      activeRoom: session.metadata.room,
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
