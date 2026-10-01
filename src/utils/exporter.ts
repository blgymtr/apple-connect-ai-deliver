import * as fs from 'fs';
import * as path from 'path';
import { ReleaseNotesOutput } from '../types';
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
