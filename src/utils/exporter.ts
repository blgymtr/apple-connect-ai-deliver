import * as fs from 'fs';
import * as path from 'path';
import { LocalizedStorefrontOutput, ReleaseNotesOutput } from '../types';
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
