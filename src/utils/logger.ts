import * as core from '@actions/core';

const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

export const logger = {
  info: (message: string) => {
    if (isGitHubActions) {
      core.info(message);
    } else {
      console.log(`\x1b[36mℹ\x1b[0m ${message}`);
    }
  },
  success: (message: string) => {
    if (isGitHubActions) {
      core.info(`✅ ${message}`);
    } else {
      console.log(`\x1b[32m✔\x1b[0m ${message}`);
    }
  },
  warn: (message: string) => {
    if (isGitHubActions) {
      core.warning(message);
    } else {
      console.warn(`\x1b[33m⚠\x1b[0m ${message}`);
    }
  },
  error: (message: string) => {
    if (isGitHubActions) {
      core.error(message);
    } else {
      console.error(`\x1b[31m✖\x1b[0m ${message}`);
    }
  },
  group: (name: string, fn: () => void | Promise<void>) => {
    if (isGitHubActions) {
      core.startGroup(name);
    } else {
      console.log(`\n\x1b[1m=== ${name} ===\x1b[0m`);
    }
  },
  endGroup: () => {
    if (isGitHubActions) {
      core.endGroup();
    } else {
      console.log(`\x1b[90m-----------------------------------\x1b[0m\n`);
    }
  },
  maskSecret: (secret: string) => {
    if (isGitHubActions && secret) {
      core.setSecret(secret);
    }
  }
};
