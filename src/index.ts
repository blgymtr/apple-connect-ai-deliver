import * as core from '@actions/core';
import { loadConfig } from './config';
import { runAction } from './runner';

async function main() {
  try {
    const config = loadConfig();
    const result = await runAction(config);

    core.setOutput('release_notes_json', JSON.stringify(result.releaseNotes));
    core.setOutput('app_version', result.version);
    core.setOutput('status', result.status);
  } catch (error: any) {
    core.setFailed(error.message || 'An unknown error occurred during execution.');
  }
}

main();
