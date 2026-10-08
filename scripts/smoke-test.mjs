// End-to-end API smoke test for EcholytiX.
// Usage: start the server, then run
//   BASE_URL=http://localhost:3000 node scripts/smoke-test.mjs
// Set EXPECT_PRODUCTION=1 when testing a production server (asserts the reset
// OTP is not leaked in API responses). Exits non-zero if any check fails.

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const EXPECT_PRODUCTION = process.env.EXPECT_PRODUCTION === '1';
const results = [];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`PASS  ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
    console.log(`FAIL  ${name}  ->  ${err.message}`);
  }
}

async function api(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

const unique = () => `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
const PASSWORD = 'Passw0rd123';

async function registerAndLogin(label) {
  const email = `smoke_${label}_${unique()}@test.com`;
  const reg = await api('POST', '/api/auth/register', { email, password: PASSWORD, name: `Smoke ${label}` });
  assert(reg.status === 201, `register ${label}: HTTP ${reg.status}`);
  const login = await api('POST', '/api/auth/login', { email, password: PASSWORD });
  assert(login.status === 200 && login.data.sessionToken, `login ${label}: HTTP ${login.status}`);
  return { email, id: reg.data.id, token: login.data.sessionToken };
}

async function readUntil(reader, predicate, timeoutMs) {
  const decoder = new TextDecoder();
  let buffer = '';
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const chunk = await Promise.race([
      reader.read(),
      new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), deadline - Date.now())),
    ]);
    if (chunk.timeout || chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    if (predicate(buffer)) return buffer;
  }
  return buffer;
}

async function main() {
  console.log(`EcholytiX smoke test against ${BASE}${EXPECT_PRODUCTION ? ' (production)' : ''}\n`);

  // ---------- Frontend & static assets ----------
  await check('frontend: GET / serves the app shell', async () => {
    const res = await fetch(BASE + '/');
    const html = await res.text();
    assert(res.status === 200, `HTTP ${res.status}`);
    assert(html.includes('id="root"'), 'index.html root element missing');
  });

  await check('frontend: SPA deep link falls back to index.html', async () => {
    const res = await fetch(BASE + '/some/deep/link');
    const html = await res.text();
    assert(res.status === 200 && html.includes('id="root"'), `HTTP ${res.status}`);
  });

  for (const asset of ['/models/face_landmarker.task', '/models/hand_landmarker.task', '/wasm/vision_bundle.mjs']) {
    await check(`static: ${asset} is served`, async () => {
      const res = await fetch(BASE + asset);
      await res.arrayBuffer();
      assert(res.status === 200, `HTTP ${res.status}`);
    });
  }

  // ---------- Public content APIs ----------
  await check('GET /api/quick-phrases', async () => {
    const r = await api('GET', '/api/quick-phrases');
    assert(r.status === 200 && Array.isArray(r.data), `HTTP ${r.status}`);
  });

  await check('POST + DELETE /api/quick-phrases', async () => {
    const created = await api('POST', '/api/quick-phrases', { label: `Smoke ${unique()}`, morse: '... --- ...', category: 'Test' });
    assert(created.status === 201 && created.data.id, `create HTTP ${created.status}`);
    const del = await api('DELETE', `/api/quick-phrases/${created.data.id}`);
    assert(del.status === 200, `delete HTTP ${del.status}`);
  });

  await check('GET /api/categories', async () => {
    const r = await api('GET', '/api/categories');
    assert(r.status === 200 && Array.isArray(r.data), `HTTP ${r.status}`);
  });

  await check('POST /api/categories + add phrase to category', async () => {
    const cat = await api('POST', '/api/categories', { name: `Smoke ${unique()}` });
    assert(cat.status === 201 && cat.data.id, `category HTTP ${cat.status}`);
    const phrase = await api('POST', `/api/categories/${cat.data.id}/phrases`, { text: 'Smoke phrase' });
    assert(phrase.status === 201, `phrase HTTP ${phrase.status}`);
  });

  await check('GET /api/settings', async () => {
    const r = await api('GET', '/api/settings');
    assert(r.status === 200, `HTTP ${r.status}`);
  });

  await check('POST /api/support (valid)', async () => {
    const r = await api('POST', '/api/support', { name: 'Smoke', email: 'smoke@test.com', message: 'hello' });
    assert(r.status === 201, `HTTP ${r.status}`);
  });

  await check('POST /api/support rejects invalid email', async () => {
    const r = await api('POST', '/api/support', { name: 'Smoke', email: 'not-an-email', message: 'hello' });
    assert(r.status === 400, `expected 400, got ${r.status}`);
  });

  await check('POST /api/ai/complete (local model fallback)', async () => {
    const r = await api('POST', '/api/ai/complete', { text: 'i need', mode: 'blink' });
    assert(r.status === 200, `HTTP ${r.status}`);
    assert(typeof r.data.expanded === 'string' && Array.isArray(r.data.suggestions), 'bad response shape');
  });

  // ---------- Emergency SOS ----------
  await check('POST /api/emergency/sos stores the alert', async () => {
    const message = `Smoke SOS ${unique()}`;
    const r = await api('POST', '/api/emergency/sos', { message, latitude: 0, longitude: 0 });
    assert(r.status === 201 && r.data.success === true, `HTTP ${r.status}`);
    const list = await api('GET', '/api/emergency/sos?limit=20');
    assert(list.status === 200 && list.data.some((a) => a.message === message), 'alert not found in list');
  });

  // ---------- Remote session (pairing + SSE) ----------
  await check('GET /api/remote/session/info', async () => {
    const r = await api('GET', '/api/remote/session/info');
    assert(r.status === 200 && Array.isArray(r.data.ips), `HTTP ${r.status}`);
  });

  await check('remote session: create -> validate -> SSE receives event', async () => {
    const created = await api('POST', '/api/remote/session/create', {});
    assert(created.status === 200 && /^\d{6}$/.test(created.data.code), `create HTTP ${created.status}`);
    const code = created.data.code;

    const valid = await api('GET', `/api/remote/session/validate?code=${code}`);
    assert(valid.status === 200 && valid.data.success === true, `validate HTTP ${valid.status}`);

    const invalid = await api('GET', '/api/remote/session/validate?code=000000');
    assert(invalid.status === 404, `invalid code should 404, got ${invalid.status}`);

    const controller = new AbortController();
    const stream = await fetch(`${BASE}/api/remote/session/stream?code=${code}`, { signal: controller.signal });
    assert(stream.status === 200, `stream HTTP ${stream.status}`);
    const reader = stream.body.getReader();
    await readUntil(reader, (b) => b.includes('"type":"status"'), 5000);

    const sent = await api('POST', '/api/remote/session/send', { code, type: 'char', value: 'Z' });
    assert(sent.status === 200, `send HTTP ${sent.status}`);
    const got = await readUntil(reader, (b) => b.includes('"value":"Z"'), 5000);
    controller.abort();
    assert(got.includes('"value":"Z"'), 'sent event was not received on the stream');
  });

  // ---------- Authentication ----------
  let userA;
  let userB;

  await check('auth: register + login (user A)', async () => {
    userA = await registerAndLogin('a');
  });

  await check('auth: register + login (user B)', async () => {
    userB = await registerAndLogin('b');
  });

  await check('auth: register never returns the password hash', async () => {
    const email = `smoke_pw_${unique()}@test.com`;
    const r = await api('POST', '/api/auth/register', { email, password: PASSWORD, name: 'Smoke PW' });
    assert(r.status === 201, `HTTP ${r.status}`);
    assert(r.data.password === undefined, 'password field leaked in response');
  });

  await check('auth: duplicate email -> 409', async () => {
    const r = await api('POST', '/api/auth/register', { email: userA.email, password: PASSWORD, name: 'Dup' });
    assert(r.status === 409, `expected 409, got ${r.status}`);
  });

  await check('auth: weak password -> 400', async () => {
    const r = await api('POST', '/api/auth/register', { email: `weak_${unique()}@test.com`, password: 'short', name: 'Weak' });
    assert(r.status === 400, `expected 400, got ${r.status}`);
  });

  await check('auth: wrong password -> 401', async () => {
    const r = await api('POST', '/api/auth/login', { email: userA.email, password: 'wrongpass123' });
    assert(r.status === 401, `expected 401, got ${r.status}`);
  });

  await check('auth: GET /api/auth/me with token', async () => {
    const r = await api('GET', '/api/auth/me', null, userA.token);
    assert(r.status === 200 && r.data.email === userA.email, `HTTP ${r.status}`);
  });

  await check('auth: GET /api/auth/me without token -> 401', async () => {
    const r = await api('GET', '/api/auth/me');
    assert(r.status === 401, `expected 401, got ${r.status}`);
  });

  await check('auth: GET /api/auth/me with bogus token -> 401', async () => {
    const r = await api('GET', '/api/auth/me', null, 'not-a-real-token');
    assert(r.status === 401, `expected 401, got ${r.status}`);
  });

  await check('auth: profile update saves own profile', async () => {
    const r = await api('POST', '/api/auth/profile', { id: userA.id, name: 'Smoke A Updated', age: 30 }, userA.token);
    assert(r.status === 200 && r.data.name === 'Smoke A Updated', `HTTP ${r.status}`);
    assert(r.data.password === undefined, 'password field leaked in response');
  });

  await check('auth: profile update cannot modify another patient (IDOR)', async () => {
    await api('POST', '/api/auth/profile', { id: userB.id, name: 'HIJACKED' }, userA.token);
    const me = await api('GET', '/api/auth/me', null, userB.token);
    assert(me.status === 200, `HTTP ${me.status}`);
    assert(me.data.name !== 'HIJACKED', "user A was able to overwrite user B's profile");
  });

  await check('auth: PUT /api/settings requires a token', async () => {
    const r = await api('PUT', '/api/settings', { key: 'smoke_key', value: '1' });
    assert(r.status === 401, `expected 401, got ${r.status}`);
  });

  await check('auth: PUT /api/settings with token', async () => {
    const r = await api('PUT', '/api/settings', { key: 'smoke_key', value: '1' }, userA.token);
    assert(r.status === 200, `HTTP ${r.status}`);
  });

  // ---------- Phrase history (must be private per patient) ----------
  await check('phrases: POST requires a token', async () => {
    const r = await api('POST', '/api/phrases', { text: 'x', mode: 'TTS' });
    assert(r.status === 401, `expected 401, got ${r.status}`);
  });

  await check('phrases: save + list own history', async () => {
    const text = `"Smoke A phrase ${unique()}"`;
    const saved = await api('POST', '/api/phrases', { text, mode: 'TTS' }, userA.token);
    assert(saved.status === 201, `save HTTP ${saved.status}`);
    const list = await api('GET', '/api/phrases', null, userA.token);
    assert(list.status === 200 && list.data.some((p) => p.text === text), 'saved phrase not in own history');
  });

  await check('phrases: rapid saves do not collide', async () => {
    const saves = await Promise.all(
      [1, 2, 3, 4, 5].map((n) => api('POST', '/api/phrases', { text: `"burst ${n}"`, mode: 'TTS' }, userA.token))
    );
    assert(saves.every((s) => s.status === 201), `statuses: ${saves.map((s) => s.status).join(',')}`);
  });

  await check("phrases: one patient cannot see another's history", async () => {
    const secret = `"Private A ${unique()}"`;
    await api('POST', '/api/phrases', { text: secret, mode: 'TTS' }, userA.token);
    const listB = await api('GET', '/api/phrases', null, userB.token);
    const leaked = Array.isArray(listB.data) && listB.data.some((p) => p.text === secret);
    assert(!leaked, "user B can read user A's phrase history");
  });

  await check("phrases: one patient cannot clear another's history", async () => {
    const keep = `"Keep A ${unique()}"`;
    await api('POST', '/api/phrases', { text: keep, mode: 'TTS' }, userA.token);
    await api('DELETE', '/api/phrases', null, userB.token);
    const listA = await api('GET', '/api/phrases', null, userA.token);
    assert(Array.isArray(listA.data) && listA.data.some((p) => p.text === keep), "user B wiped user A's history");
  });

  // ---------- Password reset ----------
  await check('reset: forgot-password responds for a known email', async () => {
    const r = await api('POST', '/api/auth/forgot-password', { email: userB.email });
    assert(r.status === 200 && r.data.success === true, `HTTP ${r.status}`);
    if (EXPECT_PRODUCTION) {
      assert(r.data.devOtp === undefined, 'reset OTP is leaked in the API response in production');
    }
  });

  await check('reset: wrong OTP is rejected', async () => {
    const r = await api('POST', '/api/auth/reset-password', { email: userB.email, otp: '000000', newPassword: 'NewPassw0rd1' });
    assert(r.status === 400, `expected 400, got ${r.status}`);
  });

  if (!EXPECT_PRODUCTION) {
    await check('reset: full OTP flow (dev) -> login with new password', async () => {
      const f = await api('POST', '/api/auth/forgot-password', { email: userB.email });
      assert(f.data.devOtp, 'devOtp missing in development');
      const r = await api('POST', '/api/auth/reset-password', { email: userB.email, otp: f.data.devOtp, newPassword: 'NewPassw0rd1' });
      assert(r.status === 200, `reset HTTP ${r.status}`);
      const login = await api('POST', '/api/auth/login', { email: userB.email, password: 'NewPassw0rd1' });
      assert(login.status === 200, `login with new password HTTP ${login.status}`);
    });
  }

  // ---------- Logout ----------
  await check('auth: logout invalidates the session', async () => {
    const out = await api('POST', '/api/auth/logout', null, userA.token);
    assert(out.status === 200, `logout HTTP ${out.status}`);
    const me = await api('GET', '/api/auth/me', null, userA.token);
    assert(me.status === 401, `token still valid after logout (HTTP ${me.status})`);
  });

  // ---------- Summary ----------
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) {
    console.log('\nFailures:');
    for (const f of failed) console.log(`  - ${f.name}: ${f.error}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
