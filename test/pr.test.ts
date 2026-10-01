import test from 'node:test';
import assert from 'node:assert';
import { formatPRComment, getLocaleFlag, PR_COMMENT_MARKER } from '../src/github/pr';

test('getLocaleFlag returns correct country flag for known locales', () => {
  assert.strictEqual(getLocaleFlag('en-US'), '🇺🇸');
  assert.strictEqual(getLocaleFlag('tr'), '🇹🇷');
  assert.strictEqual(getLocaleFlag('de-DE'), '🇩🇪');
  assert.strictEqual(getLocaleFlag('ja'), '🇯🇵');
  assert.strictEqual(getLocaleFlag('unknown-locale'), '🌐');
});

test('formatPRComment produces valid markdown with marker and collapsible details', () => {
  const comment = formatPRComment({
    releaseNotes: {
      'en-US': '• Added dark mode\n• Performance improvements',
      'tr': '• Karanlık mod eklendi\n• Performans iyileştirmeleri'
    },
    version: '1.4.0',
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    status: 'dry-run-preview'
  });

  // Verify hidden sticky comment marker
  assert.ok(comment.includes(PR_COMMENT_MARKER));
  assert.ok(comment.includes('1.4.0'));
  assert.ok(comment.includes('Target Version:'));
  assert.ok(comment.includes('gemini-2.0-flash'));
  assert.ok(comment.includes('🇺🇸 en-US'));
  assert.ok(comment.includes('🇹🇷 tr'));
  assert.ok(comment.includes('Added dark mode'));
  assert.ok(comment.includes('Karanlık mod eklendi'));
  assert.ok(comment.includes('<details open>')); // first locale open
  assert.ok(comment.includes('<details>')); // second locale collapsible
});
