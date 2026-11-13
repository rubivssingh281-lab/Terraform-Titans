import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const port = process.env.SMOKE_PORT || '4173';
const baseUrl = `http://127.0.0.1:${port}`;
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'echolytix-smoke-'));
const databasePath = path.join(tempDir, 'echolytix.db');
const server = spawn(process.execPath, ['dist/server.cjs'], {
  env: {
    ...process.env,
    DATABASE_PATH: databasePath,
    NODE_ENV: 'production',
    PORT: port,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverOutput = '';
server.stdout.on('data', (chunk) => { serverOutput += chunk; });
server.stderr.on('data', (chunk) => { serverOutput += chunk; });

async function waitForServer() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.ok) return;
    } catch {
      // The server may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not start within 30 seconds.\n${serverOutput}`);
}

try {
  await waitForServer();
  const smoke = spawn(process.execPath, ['scripts/smoke-test.mjs'], {
    env: { ...process.env, BASE_URL: baseUrl, EXPECT_PRODUCTION: '1' },
    stdio: 'inherit',
  });
  const result = await new Promise((resolve, reject) => {
    smoke.on('error', reject);
    smoke.on('exit', (code, signal) => resolve({ code, signal }));
  });
  if (result.signal || result.code !== 0) {
    throw new Error(`Smoke test exited with ${result.signal || result.code}.`);
  }
} finally {
  server.kill('SIGTERM');
  await new Promise((resolve) => server.once('exit', resolve));
  await fs.rm(tempDir, { recursive: true, force: true });
}
