import test from 'node:test';
import assert from 'node:assert';
import { buildReleaseNotesPrompt, parseJsonResponse } from '../src/ai/prompts';
import { ExtractedGitContext } from '../src/types';

test('parseJsonResponse extracts clean JSON even when markdown code blocks are present', () => {
  const markdownSample = '```json\n{\n  "en-US": "• Fixed crashes on login",\n  "tr": "• Giriş ekranındaki hatalar giderildi"\n}\n```';
  const parsed = parseJsonResponse<Record<string, string>>(markdownSample);
  assert.strictEqual(parsed['en-US'], '• Fixed crashes on login');
  assert.strictEqual(parsed['tr'], '• Giriş ekranındaki hatalar giderildi');
});

test('parseJsonResponse handles raw JSON without markdown', () => {
  const raw = '{"en-US": "• Performance improvements"}';
  const parsed = parseJsonResponse<Record<string, string>>(raw);
  assert.strictEqual(parsed['en-US'], '• Performance improvements');
});

test('buildReleaseNotesPrompt builds comprehensive prompt with commit summaries', () => {
  const mockContext: ExtractedGitContext = {
    sinceRef: 'v1.0.0',
    untilRef: 'HEAD',
    commits: [
      {
        hash: 'abc1234',
        subject: 'add dark mode support',
        body: '',
        author: 'Developer',
        date: '2026-10-01',
        type: 'feat'
      },
      {
        hash: 'def5678',
        subject: 'fix push notification delay',
        body: '',
        author: 'Developer',
        date: '2026-10-01',
        type: 'fix'
      }
    ],
    summary: {
      features: ['add dark mode support'],
      fixes: ['fix push notification delay'],
      improvements: [],
      others: []
    }
  };

  const prompt = buildReleaseNotesPrompt(mockContext, {
    locales: ['en-US', 'tr'],
    style: 'bullet-points',
    appContext: 'My Fitness App',
    version: '1.1.0'
  });

  assert.ok(prompt.includes('My Fitness App'));
  assert.ok(prompt.includes('en-US, tr'));
  assert.ok(prompt.includes('add dark mode support'));
  assert.ok(prompt.includes('fix push notification delay'));
});
