import * as core from '@actions/core';
import { ActionConfig, ReleaseNotesOutput } from './types';
import { logger } from './utils/logger';
import { extractGitCommits } from './git/commits';
import { createAIProvider } from './ai/factory';
import { AppStoreConnectClient } from './apple/client';
import { saveReleaseNotesToDisk } from './utils/exporter';
import { upsertPRComment } from './github/pr';
import { sendWebhookNotification } from './notifications/webhook';

export interface RunResult {
  version: string;
  releaseNotes: ReleaseNotesOutput;
  status: 'updated' | 'dry-run-preview';
}

export async function runAction(config: ActionConfig): Promise<RunResult> {
  // Mask sensitive values from CI logs
  if (config.apiKey) logger.maskSecret(config.apiKey);
  if (config.ascPrivateKey) logger.maskSecret(config.ascPrivateKey);

  logger.info(`Starting Apple Store AI Connect...`);
  logger.info(`AI Provider: ${config.provider} (Model: ${config.model || 'default'})`);
  logger.info(`Target Locales: ${config.locales.join(', ')}`);
  logger.info(`Style: ${config.style}`);
  logger.info(`Dry Run: ${config.dryRun ? 'YES (No App Store changes will be made)' : 'NO'}`);

  // 1. Analyze Git history
  logger.group('Step 1: Extracting Git History', () => {});
  const gitContext = extractGitCommits(config.gitSince);
  logger.endGroup();

  // 2. Generate Release Notes via AI
  logger.group(`Step 2: Generating Release Notes using ${config.provider.toUpperCase()}`, () => {});
  const aiProvider = createAIProvider({
    provider: config.provider,
    apiKey: config.apiKey,
    model: config.model
  });

  const releaseNotes = await aiProvider.generateReleaseNotes(gitContext, {
    locales: config.locales,
    style: config.style,
    appContext: config.appContext,
    version: config.version
  });

  logger.success('Release notes generated successfully for all target locales:');
  for (const [locale, notes] of Object.entries(releaseNotes)) {
    console.log(`\n--- [${locale}] Release Notes ---`);
    console.log(notes);
    console.log('--------------------------------\n');
  }
  logger.endGroup();

  // 3. Optional: Save to disk (e.g. Fastlane directory)
  if (config.saveToDisk) {
    logger.group(`Step 3: Saving to Local Disk (${config.saveToDisk})`, () => {});
    saveReleaseNotesToDisk(config.saveToDisk, releaseNotes);
    logger.endGroup();
  }

  // 4. Update App Store Connect
  let targetVersionString = config.version || 'unknown';
  let status: 'updated' | 'dry-run-preview' = config.dryRun ? 'dry-run-preview' : 'updated';

  if (!config.dryRun && config.appId && config.ascKeyId && config.ascIssuerId && config.ascPrivateKey) {
    logger.group('Step 4: Updating App Store Connect API', () => {});
    const appleClient = new AppStoreConnectClient({
      appId: config.appId,
      keyId: config.ascKeyId,
      issuerId: config.ascIssuerId,
      privateKey: config.ascPrivateKey,
      dryRun: config.dryRun
    });

    const targetVersion = await appleClient.findTargetVersion(config.version);
    targetVersionString = targetVersion.attributes.versionString;

    logger.info(`Target App Store Version: ${targetVersionString} (ID: ${targetVersion.id})`);

    const { updatedLocales, createdLocales } = await appleClient.updateReleaseNotes(
      targetVersion.id,
      releaseNotes
    );

    logger.success(`App Store Connect update complete! Updated: [${updatedLocales.join(', ')}], Created: [${createdLocales.join(', ')}]`);
    logger.endGroup();
  } else if (config.dryRun) {
    logger.info('[DRY-RUN] Skipped App Store Connect API calls as dry_run is enabled.');
  }

  // 5. Post Sticky Pull Request Comment (if in PR context)
  if (config.prComment && (config.githubToken || process.env.GITHUB_TOKEN)) {
    const token = config.githubToken || process.env.GITHUB_TOKEN!;
    logger.group('Step 5: Pull Request Preview Comment', () => {});
    try {
      await upsertPRComment(token, {
        releaseNotes,
        version: targetVersionString,
        provider: config.provider,
        model: config.model,
        status
      });
    } catch (err: any) {
      logger.warn(`Failed to post/update PR comment: ${err.message}`);
    }
    logger.endGroup();
  }

  // 6. Optional: Send Webhook Notification (Slack / Discord)
  if (config.webhookUrl) {
    logger.group('Step 6: Sending Webhook Notification', () => {});
    await sendWebhookNotification({
      webhookUrl: config.webhookUrl,
      version: targetVersionString,
      provider: config.provider,
      releaseNotes,
      status
    });
    logger.endGroup();
  }

  return {
    version: targetVersionString,
    releaseNotes,
    status
  };
}
