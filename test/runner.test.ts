import test from 'node:test';
import assert from 'node:assert';
import { runAction } from '../src/runner';
import { ActionConfig } from '../src/types';

test('runAction in dry_run mode completes pipeline and formats release notes', async (t) => {
  // Mock fetch to simulate Gemini response
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async (url: any) => {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    'en-US': '• Added new dashboard view\n• Fixed push notification delivery',
                    'tr': '• Yeni kontrol paneli eklendi\n• Bildirim iletim sorunları düzeltildi'
                  })
                }
              ]
            }
          }
        ]
      })
    } as any;
  };

  const testConfig: ActionConfig = {
    provider: 'gemini',
    apiKey: 'mock-gemini-key',
    appId: '123456789',
    ascKeyId: 'KEY123',
    ascIssuerId: 'uuid-123',
    ascPrivateKey: '-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----',
    version: '2.0.0',
    locales: ['en-US', 'tr'],
    style: 'bullet-points',
    gitSince: 'auto',
    dryRun: true,
    saveToDisk: 'test-metadata-output'
  };

  const result = await runAction(testConfig);

  assert.strictEqual(result.status, 'dry-run-preview');
  assert.ok(result.releaseNotes['en-US'].includes('dashboard view'));
  assert.ok(result.releaseNotes['tr'].includes('kontrol paneli'));

  // Clean up test generated directory
  const fs = await import('fs');
  if (fs.existsSync('test-metadata-output')) {
    fs.rmSync('test-metadata-output', { recursive: true, force: true });
  }
});
