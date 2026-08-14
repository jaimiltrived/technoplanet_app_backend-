import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';

describe('API Health & System Status Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('GET / should return 200 with welcome message', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.message, 'Welcome to RKU Technoplanet API');
    assert.strictEqual(body.version, '1.0.0');
  });

  test('GET /health should return 200 status UP', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, 'UP');
    assert.strictEqual(body.message, 'RKU Technoplanet API is running smoothly');
    assert.ok(body.timestamp);
  });

  test('GET /unknown-route-xyz should return 404 Not Found', async () => {
    const res = await fetch(`${baseUrl}/unknown-route-xyz`);
    assert.strictEqual(res.status, 404);
  });
});
