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

  test('CORS: Should allow origin https://api.techno.rku.ac.in and respond to OPTIONS', async () => {
    const res = await fetch(`${baseUrl}/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://api.techno.rku.ac.in',
        'Access-Control-Request-Method': 'POST',
      },
    });
    assert.strictEqual(res.headers.get('access-control-allow-origin'), 'https://api.techno.rku.ac.in');
  });

  test('Swagger: /api-docs/swagger.json should contain relative / server', async () => {
    const res = await fetch(`${baseUrl}/api-docs/swagger.json`);
    assert.strictEqual(res.status, 200);
    const spec = await res.json();
    assert.ok(spec.servers.some(s => s.url === '/'));
    assert.ok(spec.servers.some(s => s.url === 'https://api.techno.rku.ac.in'));
    assert.ok(spec.paths['/api/events/register/team']);
    assert.ok(spec.paths['/api/events/team/{registrationId}']);
  });

  test('Team Registration: POST /api/events/register/team requires authentication (401)', async () => {
    const res = await fetch(`${baseUrl}/api/events/register/team`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: 'fake-id', teamName: 'Test Team' }),
    });
    assert.strictEqual(res.status, 401);
  });

  test('Team Registration: POST /api/events/team-register requires authentication (401)', async () => {
    const res = await fetch(`${baseUrl}/api/events/team-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: 'fake-id', teamName: 'Test Team' }),
    });
    assert.strictEqual(res.status, 401);
  });
});
