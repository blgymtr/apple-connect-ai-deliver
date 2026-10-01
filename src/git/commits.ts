import { execSync } from 'child_process';
import { CommitInfo, ExtractedGitContext } from '../types';
import { logger } from '../utils/logger';

function execGit(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (err: any) {
    return '';
  }
}

export function findLatestTag(): string | null {
  const tag = execGit('git describe --tags --abbrev=0');
  return tag || null;
}

export function extractGitCommits(sinceOption: string = 'auto'): ExtractedGitContext {
  let sinceRef = sinceOption;
  let untilRef = 'HEAD';

  if (sinceRef === 'auto') {
    const latestTag = findLatestTag();
    if (latestTag) {
      sinceRef = latestTag;
      logger.info(`Auto-detected latest git tag: ${latestTag}`);
    } else {
      // If no git tags exist, check total commit count
      const totalCommitsStr = execGit('git rev-list --count HEAD');
      const totalCommits = parseInt(totalCommitsStr, 10) || 0;
      if (totalCommits > 15) {
        sinceRef = 'HEAD~15';
        logger.info(`No git tags found. Using recent 15 commits (HEAD~15..HEAD).`);
      } else {
        // Just analyze all available commits
        const rootCommit = execGit('git rev-list --max-parents=0 HEAD');
        sinceRef = rootCommit ? `${rootCommit}^!` : 'HEAD';
        logger.info(`No git tags found. Analyzing repository commit history.`);
      }
    }
  }

  // Range syntax
  const gitRange = sinceRef.includes('..') || sinceRef.endsWith('^!') ? sinceRef : `${sinceRef}..${untilRef}`;
  logger.info(`Reading git log for range: ${gitRange}`);

  // Format: Hash, Subject, Body, Author, Date separated by ASCII unit separator 0x1F
  // Records separated by 0x1E
  const rawLog = execGit(`git log "${gitRange}" --pretty=format:"%H%x1f%s%x1f%b%x1f%an%x1f%ad%x1e"`);

  const commits: CommitInfo[] = [];
  const features: string[] = [];
  const fixes: string[] = [];
  const improvements: string[] = [];
  const others: string[] = [];

  if (rawLog) {
    const entries = rawLog.split('\x1e');
    for (const entry of entries) {
      const trimmed = entry.trim();
      if (!trimmed) continue;

      const [hash, subject, body, author, date] = trimmed.split('\x1f');
      if (!subject) continue;

      // Filter out automated merge commits
      if (/^Merge (branch|pull request|remote-tracking)/i.test(subject)) {
        continue;
      }

      // Detect Conventional Commit type
      let type: CommitInfo['type'] = 'other';
      const convMatch = subject.match(/^([a-zA-Z]+)(\([^\)]+\))?(!)?:\s*(.+)$/);
      let cleanSubject = subject;

      if (convMatch) {
        const prefix = convMatch[1].toLowerCase();
        cleanSubject = convMatch[4];
        if (prefix === 'feat') type = 'feat';
        else if (prefix === 'fix') type = 'fix';
        else if (prefix === 'perf') type = 'perf';
        else if (prefix === 'refactor') type = 'refactor';
        else if (prefix === 'docs') type = 'docs';
        else if (prefix === 'chore') type = 'chore';
      }

      const info: CommitInfo = {
        hash: (hash || '').substring(0, 7),
        subject: cleanSubject,
        body: (body || '').trim(),
        author: author || 'Developer',
        date: date || '',
        type
      };

      commits.push(info);

      if (type === 'feat') {
        features.push(cleanSubject);
      } else if (type === 'fix') {
        fixes.push(cleanSubject);
      } else if (type === 'perf' || type === 'refactor') {
        improvements.push(cleanSubject);
      } else {
        others.push(cleanSubject);
      }
    }
  }

  logger.info(`Extracted ${commits.length} commits (${features.length} features, ${fixes.length} fixes, ${improvements.length} improvements).`);

  return {
    sinceRef,
    untilRef,
    commits,
    summary: {
      features,
      fixes,
      improvements,
      others
    }
  };
}
