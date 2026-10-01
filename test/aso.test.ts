import test from 'node:test';
import assert from 'node:assert';
import { sanitizeASOKeywords, sanitizeSubtitle, sanitizePromotionalText, buildStorefrontPrompt } from '../src/ai/prompts';
import { saveStorefrontToDisk } from '../src/utils/exporter';
import * as fs from 'fs';

test('sanitizeASOKeywords strictly enforces 100 character Apple limit without cut words', () => {
  // Overly long keyword list
  const raw = 'fitness, workout, gym, running, exercise, cardio, health, crossfit, bodybuilding, yoga, pilates, tracker, coach, trainer, stopwatch, interval, endurance, stamina';
  const sanitized = sanitizeASOKeywords(raw);

  assert.ok(sanitized.length <= 100, `Length ${sanitized.length} must be <= 100`);
  assert.ok(!sanitized.includes(' '), 'Keywords must not contain spaces');
  assert.ok(sanitized.split(',').length >= 5, 'Should preserve as many full keywords as possible');

  // Verify no duplicate words
  const words = sanitized.split(',');
  const uniqueWords = new Set(words);
  assert.strictEqual(words.length, uniqueWords.size, 'All keywords must be unique');
});

test('sanitizeSubtitle strictly clamps to 30 characters', () => {
  const longSubtitle = 'The Ultimate Workout & Fitness Companion For Everyone';
  const sanitized = sanitizeSubtitle(longSubtitle);
  assert.ok(sanitized.length <= 30, `Subtitle length ${sanitized.length} must be <= 30`);
});

test('sanitizePromotionalText clamps to 170 characters', () => {
  const longPromo = 'A'.repeat(250);
  const sanitized = sanitizePromotionalText(longPromo);
  assert.strictEqual(sanitized.length, 170);
});

test('saveStorefrontToDisk creates complete Fastlane metadata file structure', () => {
  const testDir = 'test-storefront-export';

  saveStorefrontToDisk(testDir, {
    'en-US': {
      whatsNew: '• New update',
      subtitle: 'Track Workouts',
      keywords: 'fitness,gym,workout',
      promotionalText: 'Special promo!',
      description: 'Full app description'
    }
  });

  assert.ok(fs.existsSync(`${testDir}/en-US/release_notes.txt`));
  assert.ok(fs.existsSync(`${testDir}/en-US/subtitle.txt`));
  assert.ok(fs.existsSync(`${testDir}/en-US/keywords.txt`));
  assert.ok(fs.existsSync(`${testDir}/en-US/promotional_text.txt`));
  assert.ok(fs.existsSync(`${testDir}/en-US/description.txt`));

  assert.strictEqual(fs.readFileSync(`${testDir}/en-US/subtitle.txt`, 'utf-8'), 'Track Workouts');
  assert.strictEqual(fs.readFileSync(`${testDir}/en-US/keywords.txt`, 'utf-8'), 'fitness,gym,workout');

  // Cleanup
  fs.rmSync(testDir, { recursive: true, force: true });
});
