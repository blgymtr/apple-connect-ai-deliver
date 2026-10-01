import test from 'node:test';
import assert from 'node:assert';
import { buildReviewNotesPrompt } from '../src/ai/prompts';
import { saveReviewInfoToDisk } from '../src/utils/exporter';
import { runAction } from '../src/runner';
import * as fs from 'fs';

test('buildReviewNotesPrompt includes demo account details and feature highlights', () => {
  const prompt = buildReviewNotesPrompt(
    {
      sinceRef: 'v1.0.0',
      untilRef: 'HEAD',
      commits: [],
      summary: {
        features: ['Apple Pay integration'],
        fixes: ['Fix biometric login'],
        improvements: [],
        others: []
      }
    },
    {
      appContext: 'Food Delivery App',
      demoUser: 'reviewer@fooddelivery.com',
      demoPassword: 'TestPassword123!',
      version: '2.1.0'
    }
  );

  assert.ok(prompt.includes('reviewer@fooddelivery.com'));
  assert.ok(prompt.includes('TestPassword123!'));
  assert.ok(prompt.includes('Apple Pay integration'));
});

test('saveReviewInfoToDisk exports review_information directory files', () => {
  const testDir = 'test-review-export';

  saveReviewInfoToDisk(testDir, {
    contactFirstName: 'Jane',
    contactLastName: 'Doe',
    contactEmail: 'jane@example.com',
    contactPhone: '+1 555 123 4567',
    demoAccountName: 'testuser',
    demoAccountPassword: 'SecretPassword',
    notes: 'Please tap Demo Mode on first launch.'
  });

  assert.ok(fs.existsSync(`${testDir}/review_information/first_name.txt`));
  assert.ok(fs.existsSync(`${testDir}/review_information/demo_user.txt`));
  assert.ok(fs.existsSync(`${testDir}/review_information/notes.txt`));

  assert.strictEqual(fs.readFileSync(`${testDir}/review_information/first_name.txt`, 'utf-8'), 'Jane');
  assert.strictEqual(fs.readFileSync(`${testDir}/review_information/demo_user.txt`, 'utf-8'), 'testuser');
  assert.strictEqual(fs.readFileSync(`${testDir}/review_information/notes.txt`, 'utf-8'), 'Please tap Demo Mode on first launch.');

  // Cleanup
  fs.rmSync(testDir, { recursive: true, force: true });
});

test('runAction with submitForReview and generateReviewNotes runs properly in dry-run', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async () => {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify({ 'en-US': '• New features' }) }]
            }
          }
        ]
      })
    } as any;
  };

  const result = await runAction({
    provider: 'gemini',
    apiKey: 'mock-key',
    appId: '123456',
    ascKeyId: 'K1',
    ascIssuerId: 'I1',
    ascPrivateKey: 'P1',
    locales: ['en-US'],
    style: 'bullet-points',
    gitSince: 'auto',
    demoUser: 'demo@test.com',
    demoPassword: 'password123',
    submitForReview: true,
    generateReviewNotes: true,
    dryRun: true
  });

  assert.strictEqual(result.submittedForReview, true);
  assert.ok(result.reviewNotes);
});
