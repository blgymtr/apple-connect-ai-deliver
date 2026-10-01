import * as core from '@actions/core';
import { ActionConfig, AppStoreReviewDetailAttributes, LocalizedStorefrontOutput, ReleaseNotesOutput } from './types';
import { logger } from './utils/logger';
import { extractGitCommits } from './git/commits';
import { createAIProvider } from './ai/factory';
import { AppStoreConnectClient } from './apple/client';
import { saveReleaseNotesToDisk, saveReviewInfoToDisk, saveStorefrontToDisk } from './utils/exporter';
import { buildReviewNotesPrompt } from './ai/prompts';
import { upsertPRComment } from './github/pr';
import { sendWebhookNotification } from './notifications/webhook';
import { scanPrivacyInWorkspace, PrivacyReport } from './scanner/privacy';

export interface RunResult {
  version: string;
  releaseNotes: ReleaseNotesOutput;
  storefront?: LocalizedStorefrontOutput;
  reviewNotes?: string;
  submittedForReview?: boolean;
  privacyReport?: PrivacyReport;
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

  // 2. Generate Release Notes or Full Storefront via AI
  const isFullStorefront = config.mode === 'full-storefront';
  let storefrontData: LocalizedStorefrontOutput | undefined;
  let releaseNotes: ReleaseNotesOutput = {};

  const aiProvider = createAIProvider({
    provider: config.provider,
    apiKey: config.apiKey,
    model: config.model
  });

  if (isFullStorefront) {
    logger.group(`Step 2: Generating Full ASO Storefront Metadata using ${config.provider.toUpperCase()}`, () => {});
    storefrontData = await aiProvider.generateStorefront(gitContext, {
      locales: config.locales,
      style: config.style,
      appContext: config.appContext,
      appCategory: config.appCategory,
      version: config.version
    });

    for (const [locale, meta] of Object.entries(storefrontData)) {
      releaseNotes[locale] = meta.whatsNew || '';
      console.log(`\n=== [${locale}] ASO Storefront Metadata ===`);
      if (meta.subtitle) console.log(`📌 Subtitle (${meta.subtitle.length}/30): ${meta.subtitle}`);
      if (meta.keywords) console.log(`🔑 Keywords (${meta.keywords.length}/100): ${meta.keywords}`);
      if (meta.promotionalText) console.log(`📢 Promo Text (${meta.promotionalText.length}/170): ${meta.promotionalText}`);
      if (meta.whatsNew) console.log(`📝 What's New:\n${meta.whatsNew}`);
      console.log(`==========================================\n`);
    }
    logger.endGroup();
  } else {
    logger.group(`Step 2: Generating Release Notes using ${config.provider.toUpperCase()}`, () => {});
    releaseNotes = await aiProvider.generateReleaseNotes(gitContext, {
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
  }

  // 2.5 Generate / Process Review Notes & Information
  let reviewDetail: AppStoreReviewDetailAttributes | undefined;
  let generatedReviewNotes = config.reviewNotes;

  if (config.generateReviewNotes || config.reviewNotes || config.demoUser || config.contactEmail) {
    if (config.generateReviewNotes) {
      logger.group(`Generating App Reviewer Notes via ${config.provider.toUpperCase()}`, () => {});
      const reviewPrompt = buildReviewNotesPrompt(gitContext, {
        appContext: config.appContext,
        demoUser: config.demoUser,
        demoPassword: config.demoPassword,
        version: config.version
      });
      generatedReviewNotes = await aiProvider.generateText(reviewPrompt);
      console.log(`\n--- [App Reviewer Notes] ---`);
      console.log(generatedReviewNotes);
      console.log(`----------------------------\n`);
      logger.endGroup();
    }

    reviewDetail = {
      contactFirstName: config.contactFirstName,
      contactLastName: config.contactLastName,
      contactPhone: config.contactPhone,
      contactEmail: config.contactEmail,
      demoAccountName: config.demoUser,
      demoAccountPassword: config.demoPassword,
      demoAccountRequired: !!config.demoUser,
      notes: generatedReviewNotes || undefined
    };
  }

  // 3. Optional: Save to disk (e.g. Fastlane directory)
  if (config.saveToDisk) {
    logger.group(`Step 3: Saving to Local Disk (${config.saveToDisk})`, () => {});
    if (isFullStorefront && storefrontData) {
      saveStorefrontToDisk(config.saveToDisk, storefrontData);
    } else {
      saveReleaseNotesToDisk(config.saveToDisk, releaseNotes);
    }
    if (reviewDetail) {
      saveReviewInfoToDisk(config.saveToDisk, reviewDetail);
    }
    logger.endGroup();
  }

  // 3.5 Optional: Privacy Nutrition Labels Scanner
  let privacyReport: PrivacyReport | undefined;
  if (config.scanPrivacy) {
    logger.group('Step: Scanning Apple Privacy Nutrition Labels', () => {});
    privacyReport = scanPrivacyInWorkspace();
    console.log(`\n${privacyReport.markdownSummary}\n`);
    if (config.saveToDisk) {
      const fs = await import('fs');
      const path = await import('path');
      fs.writeFileSync(path.join(config.saveToDisk, 'privacy_report.md'), privacyReport.markdownSummary, 'utf-8');
      logger.success(`Wrote privacy report to ${path.join(config.saveToDisk, 'privacy_report.md')}`);
    }
    logger.endGroup();
  }

  // 4. Update App Store Connect
  let targetVersionString = config.version || 'unknown';
  let status: 'updated' | 'dry-run-preview' = config.dryRun ? 'dry-run-preview' : 'updated';
  let submittedForReview = false;

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

    if (isFullStorefront && storefrontData) {
      const { updatedLocales, createdLocales } = await appleClient.updateStorefrontMetadata(
        targetVersion.id,
        storefrontData
      );
      logger.success(`App Store Connect storefront update complete! Updated: [${updatedLocales.join(', ')}], Created: [${createdLocales.join(', ')}]`);
    } else {
      const { updatedLocales, createdLocales } = await appleClient.updateReleaseNotes(
        targetVersion.id,
        releaseNotes
      );
      logger.success(`App Store Connect release notes update complete! Updated: [${updatedLocales.join(', ')}], Created: [${createdLocales.join(', ')}]`);
    }

    if (reviewDetail) {
      await appleClient.updateReviewDetails(targetVersion.id, reviewDetail);
    }

    if (config.submitForReview) {
      logger.group('Submitting App Store Version for Review', () => {});
      await appleClient.submitForReview(targetVersion.id);
      submittedForReview = true;
      logger.endGroup();
    }

    logger.endGroup();
  } else if (config.dryRun) {
    logger.info('[DRY-RUN] Skipped App Store Connect API calls as dry_run is enabled.');
    if (reviewDetail) {
      const appleClient = new AppStoreConnectClient({
        appId: config.appId || 'mock',
        keyId: config.ascKeyId || 'mock',
        issuerId: config.ascIssuerId || 'mock',
        privateKey: config.ascPrivateKey || 'mock',
        dryRun: true
      });
      await appleClient.updateReviewDetails('mock-version', reviewDetail);
    }
    if (config.submitForReview) {
      logger.info(`[DRY-RUN] Would submit version for App Store Review.`);
      submittedForReview = true;
    }
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
    storefront: storefrontData,
    reviewNotes: generatedReviewNotes,
    submittedForReview,
    privacyReport,
    status
  };
}
