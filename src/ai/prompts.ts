import { ExtractedGitContext, LocalizedStorefrontOutput, ReleaseNotesOutput, ReleaseNotesStyle } from '../types';
import { GenerateReleaseNotesOptions, GenerateStorefrontOptions } from './types';

export function buildSystemPrompt(): string {
  return `You are an expert iOS Mobile Product Manager and App Store Optimization (ASO) specialist.
Your task is to write compelling, clear, user-facing Apple App Store release notes ("What's New") and storefront metadata.

CRITICAL APPLE APP STORE GUIDELINES:
1. USER-FACING FOCUS: Translate technical commits and developer jargon into benefits the end user cares about.
2. NO MENTION OF COMPETITORS: NEVER mention Android, Google Play, Windows, or other non-Apple platforms. Apple App Review will immediately reject updates referencing other platforms.
3. NO INTERNAL IDs: Strip out Jira/Linear/GitHub issue numbers, commit SHAs, or internal acronyms.
4. CHAR LIMITS:
   - "keywords": MAXIMUM 100 CHARACTERS strictly! Single comma-separated words with NO SPACES (e.g. "fitness,workout,gym,tracker").
   - "subtitle": MAXIMUM 30 CHARACTERS strictly!
   - "promotionalText": MAXIMUM 170 CHARACTERS strictly!
   - "description": Under 4000 characters.
   - "whatsNew": Under 4000 characters (aim for 200 - 800 characters).
5. NATIVE TONE: For each requested language, write in natural, native-sounding phrasing.
6. FORMAT: Respond ONLY with a valid JSON object matching the requested schema.`;
}

export function buildReleaseNotesPrompt(
  gitContext: ExtractedGitContext,
  options: GenerateReleaseNotesOptions
): string {
  const { locales, style, appContext, version } = options;

  const styleInstructions: Record<ReleaseNotesStyle, string> = {
    'bullet-points': 'Format as clean bullet points starting with standard bullets (•). Group into New Features and Bug Fixes/Improvements if appropriate.',
    'emojis': 'Format with tasteful and relevant modern emojis at the start of each bullet point (e.g. ✨, 🚀, 🛠️, ⚡, 🔒).',
    'minimal': 'Keep it very concise and punchy. Maximum 2 to 4 high-impact sentences or bullets summarizing the update.',
    'detailed': 'Provide a comprehensive breakdown with section headers: "What\'s New", "Performance & Polish", and "Bug Fixes".'
  };

  const formattedCommits = gitContext.commits.slice(0, 50).map(c => {
    return `- [${c.type || 'change'}] ${c.subject}${c.body ? ` (${c.body.trim().replace(/\n+/g, ' ')})` : ''}`;
  }).join('\n');

  return `Please generate the Apple App Store "What's New" release notes for version ${version || 'next'}.

### App Context:
${appContext ? appContext : 'General iOS mobile application.'}

### Target Locales:
${locales.join(', ')}

### Selected Style:
${styleInstructions[style]}

### Recent Git Changes & Commits (${gitContext.commits.length} commits between ${gitContext.sinceRef} and ${gitContext.untilRef}):
${formattedCommits || 'General bug fixes, performance improvements, and stability enhancements.'}

### Categorized Git Summary:
- Features: ${gitContext.summary.features.slice(0, 10).join('; ') || 'None listed'}
- Fixes: ${gitContext.summary.fixes.slice(0, 10).join('; ') || 'None listed'}
- Improvements: ${gitContext.summary.improvements.slice(0, 10).join('; ') || 'None listed'}

### OUTPUT REQUIREMENT:
You MUST respond with ONLY a raw JSON object mapping each locale code to its release notes string. Do NOT wrap in additional commentary.
Example:
{
  "en-US": "• What's New text in English...",
  "tr": "• Türkçe yenilikler metni..."
}
`;
}

export function buildStorefrontPrompt(
  gitContext: ExtractedGitContext,
  options: GenerateStorefrontOptions
): string {
  const { locales, style, appContext, appCategory, version } = options;

  const formattedCommits = gitContext.commits.slice(0, 30).map(c => `- ${c.subject}`).join('\n');

  return `You are a world-class App Store Optimization (ASO) specialist.
Please generate comprehensive Apple App Store metadata for version ${version || 'next'}.

### App Category:
${appCategory || 'General Utility / Productivity'}

### App Context:
${appContext || 'High quality iOS mobile application.'}

### Target Locales:
${locales.join(', ')}

### Recent Changes:
${formattedCommits || 'Quality improvements and enhancements.'}

### CRITICAL APPLE STOREFRONT CONSTRAINTS:
1. "keywords": MAXIMUM 100 CHARACTERS strictly! Single comma-separated words with NO SPACES (e.g. "fitness,workout,gym,tracker,calorie,health,coach"). Highest search intent, zero repetition.
2. "subtitle": MAXIMUM 30 CHARACTERS strictly! Punchy, high-converting slogan.
3. "promotionalText": MAXIMUM 170 CHARACTERS strictly! Highlights latest update or top value prop.
4. "description": Detailed feature breakdown, benefits, social proof (under 4000 chars).
5. "whatsNew": User-friendly release notes matching style "${style}".

### OUTPUT REQUIREMENT:
Respond with ONLY a raw JSON object where each key is a locale code:
{
  "en-US": {
    "whatsNew": "• Features and fixes...",
    "subtitle": "Track workouts easily",
    "keywords": "workout,gym,fitness,tracker,routine,exercise,planner",
    "promotionalText": "Special update with enhanced tracking features!",
    "description": "Welcome to the best fitness experience on iOS..."
  }
}
`;
}

export function sanitizeASOKeywords(raw: string): string {
  if (!raw) return '';
  const parts = raw
    .toLowerCase()
    .split(/[,;\n]+/)
    .map(w => w.trim().replace(/[^a-z0-9ğüşıöç\-_]/gi, ''))
    .filter(w => w.length > 1);

  const unique = Array.from(new Set(parts));
  const selected: string[] = [];
  let currentLen = 0;

  for (const word of unique) {
    const nextLen = selected.length === 0 ? word.length : currentLen + 1 + word.length;
    if (nextLen <= 100) {
      selected.push(word);
      currentLen = nextLen;
    } else {
      break;
    }
  }

  return selected.join(',');
}

export function sanitizeSubtitle(raw: string): string {
  if (!raw) return '';
  let sub = raw.trim().replace(/^["']|["']$/g, '');
  if (sub.length > 30) {
    sub = sub.substring(0, 30).trim();
  }
  return sub;
}

export function sanitizePromotionalText(raw: string): string {
  if (!raw) return '';
  let promo = raw.trim();
  if (promo.length > 170) {
    promo = promo.substring(0, 170).trim();
  }
  return promo;
}

export function parseJsonResponse<T>(raw: string): T {
  let cleaned = raw.trim();

  // Strip markdown code fences if model enclosed in ```json ... ```
  if (cleaned.startsWith('```')) {
    const lines = cleaned.split('\n');
    lines.shift(); // remove opening ``` or ```json
    if (lines.length > 0 && lines[lines.length - 1].trim().startsWith('```')) {
      lines.pop(); // remove closing ```
    }
    cleaned = lines.join('\n').trim();
  }

  // Find first '{' and last '}'
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (err: any) {
    throw new Error(`Failed to parse AI response as JSON: ${err.message}\nRaw response:\n${raw}`);
  }
}
