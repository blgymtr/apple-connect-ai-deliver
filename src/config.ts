import * as core from '@actions/core';
import { ActionConfig, AIProviderType, ReleaseNotesStyle } from './types';

const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

function getInput(name: string, envVar: string, defaultValue = ''): string {
  if (isGitHubActions) {
    const val = core.getInput(name);
    if (val) return val;
  }
  return process.env[envVar] || defaultValue;
}

export function loadConfig(overrides: Partial<ActionConfig> = {}): ActionConfig {
  const provider = (overrides.provider || getInput('provider', 'AI_PROVIDER', 'gemini')) as AIProviderType;
  const model = overrides.model || getInput('model', 'AI_MODEL', '');

  let apiKey = overrides.apiKey || getInput('api_key', 'AI_API_KEY', '');
  if (!apiKey) {
    if (provider === 'gemini') apiKey = process.env.GEMINI_API_KEY || '';
    else if (provider === 'claude') apiKey = process.env.ANTHROPIC_API_KEY || '';
    else if (provider === 'openai') apiKey = process.env.OPENAI_API_KEY || '';
  }

  const appId = overrides.appId || getInput('app_id', 'APP_STORE_APP_ID', '');
  const ascKeyId = overrides.ascKeyId || getInput('asc_key_id', 'APP_STORE_KEY_ID', '');
  const ascIssuerId = overrides.ascIssuerId || getInput('asc_issuer_id', 'APP_STORE_ISSUER_ID', '');
  const ascPrivateKey = overrides.ascPrivateKey || getInput('asc_private_key', 'APP_STORE_PRIVATE_KEY', '');

  const version = overrides.version || getInput('version', 'APP_VERSION', '');
  const rawLocales = overrides.locales ? overrides.locales.join(',') : getInput('locales', 'APP_STORE_LOCALES', 'en-US');
  const locales = rawLocales.split(',').map(l => l.trim()).filter(Boolean);

  const style = (overrides.style || getInput('style', 'RELEASE_NOTES_STYLE', 'bullet-points')) as ReleaseNotesStyle;
  const gitSince = overrides.gitSince || getInput('git_since', 'GIT_SINCE', 'auto');
  const appContext = overrides.appContext || getInput('app_context', 'APP_CONTEXT', '');
  const appCategory = overrides.appCategory || getInput('app_category', 'APP_CATEGORY', '');
  const mode = (overrides.mode || getInput('mode', 'DELIVERY_MODE', 'release-notes-only')) as import('./types').DeliveryMode;

  const dryRunStr = overrides.dryRun !== undefined
    ? String(overrides.dryRun)
    : getInput('dry_run', 'DRY_RUN', 'false');
  const dryRun = dryRunStr.toLowerCase() === 'true' || dryRunStr === '1';

  const saveToDisk = overrides.saveToDisk || getInput('save_to_disk', 'SAVE_TO_DISK', '');

  const githubToken = overrides.githubToken || getInput('github_token', 'GITHUB_TOKEN', '');
  const prCommentStr = overrides.prComment !== undefined
    ? String(overrides.prComment)
    : getInput('pr_comment', 'PR_COMMENT', 'true');
  const prComment = prCommentStr.toLowerCase() !== 'false' && prCommentStr !== '0';

  const webhookUrl = overrides.webhookUrl || getInput('webhook_url', 'WEBHOOK_URL', '');

  // Validation
  if (!apiKey) {
    throw new Error(
      `AI API key missing. Please provide "api_key" input or set ${
        provider === 'claude'
          ? 'ANTHROPIC_API_KEY'
          : provider === 'openai'
          ? 'OPENAI_API_KEY'
          : 'GEMINI_API_KEY'
      } environment variable.`
    );
  }

  if (!dryRun) {
    if (!appId) throw new Error('Missing Apple App Store App ID ("app_id").');
    if (!ascKeyId) throw new Error('Missing App Store Connect Key ID ("asc_key_id").');
    if (!ascIssuerId) throw new Error('Missing App Store Connect Issuer ID ("asc_issuer_id").');
    if (!ascPrivateKey) throw new Error('Missing App Store Connect Private Key ("asc_private_key").');
  }

  return {
    provider,
    model: model || undefined,
    apiKey,
    appId,
    ascKeyId,
    ascIssuerId,
    ascPrivateKey,
    version: version || undefined,
    locales: locales.length > 0 ? locales : ['en-US'],
    style,
    gitSince,
    appContext: appContext || undefined,
    appCategory: appCategory || undefined,
    mode: mode || 'release-notes-only',
    dryRun,
    saveToDisk: saveToDisk || undefined,
    githubToken: githubToken || undefined,
    prComment,
    webhookUrl: webhookUrl || undefined
  };
}
