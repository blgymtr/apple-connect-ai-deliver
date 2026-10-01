import test from 'node:test';
import assert from 'node:assert';
import { sendWebhookNotification } from '../src/notifications/webhook';

test('sendWebhookNotification formats and dispatches Discord and Slack payloads correctly', async (t) => {
  let capturedUrl = '';
  let capturedBody: any = null;

  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async (url: any, init: any) => {
    capturedUrl = String(url);
    capturedBody = JSON.parse(init.body);
    return { ok: true, status: 200 } as any;
  };

  // Test Discord payload
  await sendWebhookNotification({
    webhookUrl: 'https://discord.com/api/webhooks/12345/abcdef',
    version: '1.2.0',
    provider: 'gemini',
    releaseNotes: { 'en-US': '• Test Discord notes' },
    status: 'updated'
  });

  assert.ok(capturedUrl.includes('discord.com'));
  assert.ok(capturedBody.embeds);
  assert.strictEqual(capturedBody.embeds[0].color, 0x34c759);
  assert.ok(capturedBody.embeds[0].description.includes('Test Discord notes'));

  // Test Slack payload
  await sendWebhookNotification({
    webhookUrl: 'https://hooks.slack.com/services/T00/B00/XXXX',
    version: '1.2.0',
    provider: 'claude',
    releaseNotes: { 'tr': '• Test Slack notları' },
    status: 'dry-run'
  });

  assert.ok(capturedUrl.includes('slack.com'));
  assert.ok(capturedBody.blocks);
  assert.ok(capturedBody.blocks[0].text.text.includes('App Store Release Notes'));
});
