import * as fs from 'fs';
import * as path from 'path';
import { AppStoreReviewDetailAttributes, LocalizedStorefrontOutput, ReleaseNotesOutput } from '../types';
import { logger } from './logger';

export function saveReleaseNotesToDisk(basePath: string, releaseNotes: ReleaseNotesOutput): void {
  const resolvedBase = path.resolve(process.cwd(), basePath);
  logger.info(`Saving release notes to disk at: ${resolvedBase}`);

  for (const [locale, notes] of Object.entries(releaseNotes)) {
    const localeDir = path.join(resolvedBase, locale);
    if (!fs.existsSync(localeDir)) {
      fs.mkdirSync(localeDir, { recursive: true });
    }

    const filePath = path.join(localeDir, 'release_notes.txt');
    fs.writeFileSync(filePath, notes, 'utf-8');
    logger.success(`Wrote ${filePath}`);
  }
}

export function saveStorefrontToDisk(basePath: string, storefrontData: LocalizedStorefrontOutput): void {
  const resolvedBase = path.resolve(process.cwd(), basePath);
  logger.info(`Saving full storefront metadata to disk at: ${resolvedBase}`);

  for (const [locale, meta] of Object.entries(storefrontData)) {
    const localeDir = path.join(resolvedBase, locale);
    if (!fs.existsSync(localeDir)) {
      fs.mkdirSync(localeDir, { recursive: true });
    }

    if (meta.whatsNew) fs.writeFileSync(path.join(localeDir, 'release_notes.txt'), meta.whatsNew, 'utf-8');
    if (meta.subtitle) fs.writeFileSync(path.join(localeDir, 'subtitle.txt'), meta.subtitle, 'utf-8');
    if (meta.keywords) fs.writeFileSync(path.join(localeDir, 'keywords.txt'), meta.keywords, 'utf-8');
    if (meta.promotionalText) fs.writeFileSync(path.join(localeDir, 'promotional_text.txt'), meta.promotionalText, 'utf-8');
    if (meta.description) fs.writeFileSync(path.join(localeDir, 'description.txt'), meta.description, 'utf-8');

    logger.success(`Wrote storefront metadata files for '${locale}'.`);
  }
}

export function saveReviewInfoToDisk(basePath: string, reviewInfo: AppStoreReviewDetailAttributes): void {
  const resolvedBase = path.resolve(process.cwd(), basePath);
  const reviewDir = path.join(resolvedBase, 'review_information');
  if (!fs.existsSync(reviewDir)) {
    fs.mkdirSync(reviewDir, { recursive: true });
  }

  if (reviewInfo.contactFirstName) fs.writeFileSync(path.join(reviewDir, 'first_name.txt'), reviewInfo.contactFirstName, 'utf-8');
  if (reviewInfo.contactLastName) fs.writeFileSync(path.join(reviewDir, 'last_name.txt'), reviewInfo.contactLastName, 'utf-8');
  if (reviewInfo.contactPhone) fs.writeFileSync(path.join(reviewDir, 'phone_number.txt'), reviewInfo.contactPhone, 'utf-8');
  if (reviewInfo.contactEmail) fs.writeFileSync(path.join(reviewDir, 'email_address.txt'), reviewInfo.contactEmail, 'utf-8');
  if (reviewInfo.demoAccountName) fs.writeFileSync(path.join(reviewDir, 'demo_user.txt'), reviewInfo.demoAccountName, 'utf-8');
  if (reviewInfo.demoAccountPassword) fs.writeFileSync(path.join(reviewDir, 'demo_password.txt'), reviewInfo.demoAccountPassword, 'utf-8');
  if (reviewInfo.notes) fs.writeFileSync(path.join(reviewDir, 'notes.txt'), reviewInfo.notes, 'utf-8');

  logger.success(`Wrote review_information files to ${reviewDir}`);
}
