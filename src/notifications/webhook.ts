import { ReleaseNotesOutput } from '../types';
import { logger } from '../utils/logger';

export interface WebhookNotificationOptions {
  webhookUrl: string;
  version: string;
  provider: string;
  releaseNotes: ReleaseNotesOutput;
  status: string;
}

export async function sendWebhookNotification(options: WebhookNotificationOptions): Promise<void> {
  const { webhookUrl, version, provider, releaseNotes, status } = options;

  if (!webhookUrl) return;

  logger.info(`Sending notification webhook...`);

  const locales = Object.keys(releaseNotes);
  const primaryLocale = locales[0] || 'en-US';
  const primaryNotes = releaseNotes[primaryLocale] || '';

  const isDiscord = webhookUrl.includes('discord.com');
  const isSlack = webhookUrl.includes('slack.com');

  let payload: any;

  if (isDiscord) {
    payload = {
      content: `🍎 **Apple App Store Release Notes (${version || 'vNext'})**`,
      embeds: [
        {
          title: `Status: ${status}`,
          color: status.includes('updated') ? 0x34c759 : 0x007aff,
          description: `**AI Provider:** ${provider}\n\n**${primaryLocale} Release Notes:**\n\`\`\`text\n${primaryNotes.substring(0, 1500)}\n\`\`\``,
          footer: {
            text: `Target Locales: ${locales.join(', ')}`
          },
          timestamp: new Date().toISOString()
        }
      ]
    };
  } else if (isSlack) {
    payload = {
      text: `🍎 *Apple App Store Release Notes (${version || 'vNext'})*`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🍎 App Store Release Notes (${version || 'vNext'})`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*AI Provider:*\n${provider}` },
            { type: 'mrkdwn', text: `*Status:*\n${status}` }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${primaryLocale} Notes:*\n\`\`\`\n${primaryNotes.substring(0, 1500)}\n\`\`\``
          }
        }
      ]
    };
  } else {
    // Universal JSON payload
    payload = {
      event: 'appstore_release_notes',
      version,
      provider,
      status,
      locales,
      releaseNotes
    };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      logger.success('Webhook notification sent successfully.');
    } else {
      const err = await res.text();
      logger.warn(`Webhook returned ${res.status}: ${err}`);
    }
  } catch (err: any) {
    logger.warn(`Failed to send webhook notification: ${err.message}`);
  }
}
