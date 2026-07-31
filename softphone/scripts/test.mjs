/**
 * Checks the parts that fail silently: Twilio's webhook signature math
 * (wrong => every call 403s) and the access token shape (wrong => the
 * browser never registers).
 *
 *   node scripts/test.mjs
 */

import assert from 'node:assert/strict';
import { _internal } from '../softphone-worker.js';

const {
  verifyTwilioSignature, mintAccessToken, inboundTwiml, afterDialTwiml,
  outboundTwiml, sipOutboundTwiml, toE164, sipUserPart, sipEnabled, xml,
} = _internal;

let passed = 0;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

/* ---------- Twilio's documented signature vector ---------- */

test('validates Twilio\'s published signature example', async () => {
  // From Twilio's request-validation docs.
  const url = 'https://mycompany.com/myapp.php?foo=1&bar=2';
  const params = {
    CallSid: 'CA1234567890ABCDE',
    Caller: '+14158675309',
    Digits: '1234',
    From: '+14158675309',
    To: '+18005551212',
  };
  const expected = 'RSOYDt4T1cUTdK1PDd93/VVr8B8=';

  const request = {
    url,
    headers: { get: (h) => (h === 'X-Twilio-Signature' ? expected : null) },
  };
  const env = { TWILIO_AUTH_TOKEN: '12345', PUBLIC_BASE_URL: 'https://mycompany.com' };

  assert.equal(await verifyTwilioSignature(request, params, env), true);
});

test('rejects a tampered signature', async () => {
  const request = {
    url: 'https://mycompany.com/myapp.php?foo=1&bar=2',
    headers: { get: () => 'AAAAAAAAAAAAAAAAAAAAAAAAAAA=' },
  };
  const env = { TWILIO_AUTH_TOKEN: '12345', PUBLIC_BASE_URL: 'https://mycompany.com' };
  assert.equal(await verifyTwilioSignature(request, { To: '+1' }, env), false);
});

test('rejects a missing signature header', async () => {
  const request = { url: 'https://x.dev/voice/inbound', headers: { get: () => null } };
  assert.equal(
    await verifyTwilioSignature(request, {}, { TWILIO_AUTH_TOKEN: '12345' }),
    false
  );
});

test('rejects when no auth token is configured', async () => {
  const request = { url: 'https://x.dev/voice/inbound', headers: { get: () => 'sig' } };
  assert.equal(await verifyTwilioSignature(request, {}, {}), false);
});

/* ---------- access token ---------- */

test('mints a well-formed Twilio access token', async () => {
  const env = {
    TWILIO_ACCOUNT_SID: 'AC' + 'f'.repeat(32),
    TWILIO_API_KEY_SID: 'SK' + '1'.repeat(32),
    TWILIO_API_KEY_SECRET: 'super-secret',
    TWIML_APP_SID: 'AP' + '2'.repeat(32),
  };
  const jwt = await mintAccessToken(env, 'laptop');
  const [h, p, s] = jwt.split('.');
  assert.equal(jwt.split('.').length, 3, 'three JWT segments');
  assert.ok(s.length > 0, 'signature present');
  // base64url must not leak base64 alphabet
  assert.ok(!/[+/=]/.test(h + p + s), 'segments are base64url');

  const b64 = (x) => Buffer.from(x.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const header = JSON.parse(b64(h));
  const payload = JSON.parse(b64(p));

  assert.equal(header.alg, 'HS256');
  assert.equal(header.cty, 'twilio-fpa;v=1', 'Twilio requires this cty');
  assert.equal(payload.iss, env.TWILIO_API_KEY_SID, 'issuer is the API key');
  assert.equal(payload.sub, env.TWILIO_ACCOUNT_SID, 'subject is the account');
  assert.equal(payload.grants.identity, 'laptop');
  assert.equal(payload.grants.voice.incoming.allow, true, 'can receive calls');
  assert.equal(payload.grants.voice.outgoing.application_sid, env.TWIML_APP_SID);
  assert.ok(payload.exp > payload.nbf, 'expiry after not-before');
});

/* ---------- inbound fan-out ---------- */

test('rings only the laptop while SIP is off', () => {
  const env = { CLIENT_IDENTITY: 'laptop', SIP_ENABLED: 'false' };
  const t = inboundTwiml({}, env);
  assert.match(t, /<Client>laptop<\/Client>/);
  assert.ok(!t.includes('<Sip>'), 'no dead SIP leg');
  assert.match(t, /answerOnBridge="true"/, 'caller hears real ringback');
});

test('inbound defers the missed-call decision to the action handler', () => {
  const t = inboundTwiml({}, { CLIENT_IDENTITY: 'laptop', SIP_ENABLED: 'false' });
  assert.match(t, /action="\/voice\/after-dial"/);
  // A <Dial action> discards any following verbs, so inlining voicemail
  // here would mean it never plays.
  assert.ok(!t.includes('<Record'), 'voicemail must not be inlined after Dial');
});

test('a connected call just ends — no surprise voicemail', () => {
  // The regression that testing caught: hanging up a normal call used to
  // drop the caller into the voicemail prompt.
  for (const status of ['completed', 'answered']) {
    const t = afterDialTwiml({ DialCallStatus: status });
    assert.match(t, /<Hangup\/>/);
    assert.ok(!t.includes('<Record'), `${status} must not record`);
  }
});

test('a missed call records voicemail', () => {
  for (const status of ['no-answer', 'busy', 'failed', 'canceled', '']) {
    const t = afterDialTwiml({ DialCallStatus: status });
    assert.match(t, /<Record/, `${status} should record`);
    assert.match(t, /action="\/voice\/voicemail-done"/);
  }
});

test('rings laptop and phone together once SIP is on', () => {
  const env = {
    CLIENT_IDENTITY: 'laptop',
    SIP_ENABLED: 'true',
    SIP_DOMAIN: 'demo.sip.twilio.com',
    SIP_USERNAME: 'phone',
  };
  const t = inboundTwiml({}, env);
  assert.match(t, /<Client>laptop<\/Client>/);
  assert.match(t, /<Sip>sip:phone@demo\.sip\.twilio\.com<\/Sip>/);
  // Both legs must sit inside one <Dial> to ring simultaneously.
  const dial = t.match(/<Dial[^>]*>([\s\S]*?)<\/Dial>/)[1];
  assert.ok(dial.includes('<Client>') && dial.includes('<Sip>'),
    'both legs in a single Dial');
});

test('SIP stays off if the domain or username is blank', () => {
  assert.equal(sipEnabled({ SIP_ENABLED: 'true', SIP_DOMAIN: '', SIP_USERNAME: 'p' }), false);
  assert.equal(sipEnabled({ SIP_ENABLED: 'true', SIP_DOMAIN: 'd', SIP_USERNAME: '' }), false);
  assert.equal(sipEnabled({ SIP_ENABLED: 'TRUE', SIP_DOMAIN: 'd', SIP_USERNAME: 'p' }), true);
});

/* ---------- outbound ---------- */

test('outbound dials E.164 with the softphone caller ID', () => {
  const env = { SOFTPHONE_NUMBER: '+16025615116' };
  const t = outboundTwiml('(602) 555-0123', env);
  assert.match(t, /callerId="\+16025615116"/);
  assert.match(t, /<Number>\+16025550123<\/Number>/);
});

test('outbound refuses an undialable number instead of erroring', () => {
  const t = outboundTwiml('12', { SOFTPHONE_NUMBER: '+16025615116' });
  assert.match(t, /<Say/);
  assert.ok(!t.includes('<Dial'), 'no half-formed Dial');
});

test('outbound refuses when the caller ID is unset', () => {
  const t = outboundTwiml('6025550123', {});
  assert.ok(!t.includes('<Dial'));
});

test('SIP outbound extracts the number from the SIP URI', () => {
  const env = { SOFTPHONE_NUMBER: '+16025615116' };
  const t = sipOutboundTwiml({ To: 'sip:+18005551212@demo.sip.twilio.com' }, env);
  assert.match(t, /<Number>\+18005551212<\/Number>/);
});

test('parses SIP URI user parts', () => {
  assert.equal(sipUserPart('sip:+1800@d.com'), '+1800');
  assert.equal(sipUserPart('sips:6025550123@d.com'), '6025550123');
  assert.equal(sipUserPart(''), '');
});

/* ---------- number normalization ---------- */

test('normalizes dialed numbers', () => {
  assert.equal(toE164('6025550123'), '+16025550123');
  assert.equal(toE164('(602) 555-0123'), '+16025550123');
  assert.equal(toE164('16025550123'), '+16025550123');
  assert.equal(toE164('+442071838750'), '+442071838750');
  assert.equal(toE164('+1 602 555 0123'), '+16025550123');
  // Ambiguous or junk must not be guessed at.
  assert.equal(toE164('555'), null);
  assert.equal(toE164('001234567890123'), null);
  assert.equal(toE164(''), null);
  assert.equal(toE164(null), null);
  assert.equal(toE164('abc'), null);
});

/* ---------- injection safety ---------- */

test('escapes hostile input before it reaches TwiML', () => {
  assert.equal(xml('a"><Dial>evil</Dial>'),
    'a&quot;&gt;&lt;Dial&gt;evil&lt;/Dial&gt;');
  // A crafted identity cannot break out of the Client element.
  const t = inboundTwiml({}, { CLIENT_IDENTITY: 'x</Client><Number>+1900', SIP_ENABLED: 'false' });
  assert.ok(!t.includes('<Number>'), 'no injected Number leg');
});

/* ---------- run ---------- */

for (const [name, fn] of tests) {
  try {
    await fn();
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    passed++;
  } catch (err) {
    console.error(`  \x1b[31m✗\x1b[0m ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log(`\n${passed}/${tests.length} passed`);
