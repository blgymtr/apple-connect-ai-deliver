import { ExtractedGitContext, ReleaseNotesOutput, ReleaseNotesStyle } from '../types';
import { GenerateReleaseNotesOptions } from './types';

export function buildSystemPrompt(): string {
  return `You are an expert iOS Mobile Product Manager and App Store Optimization (ASO) specialist.
Your task is to write compelling, clear, user-facing Apple App Store release notes ("What's New") for an upcoming iOS application update.

CRITICAL APPLE APP STORE GUIDELINES:
1. USER-FACING FOCUS: Translate technical commits and developer jargon into benefits the end user cares about. (e.g. instead of "fixed race condition in AuthTokenHandler", write "Fixed an issue that could cause unexpected logouts").
2. NO MENTION OF COMPETITORS: NEVER mention Android, Google Play, Windows, or other non-Apple platforms. Apple App Review will immediately reject updates referencing other platforms.
3. NO INTERNAL IDs: Strip out Jira/Linear/GitHub issue numbers, commit SHAs, or internal acronyms.
4. CHAR LIMIT: Must be under 4000 characters per language (aim for 200 - 800 characters for high readability).
5. NATIVE TONE: For each requested language, write in natural, native-sounding phrasing (not literal word-by-word machine translation).
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
