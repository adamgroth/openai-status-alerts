// Environment variables are provided directly in GitHub Actions.

import axios from 'axios';
import { IncomingWebhook } from '@slack/webhook';
// Removed cron usage to allow the script to exit after one run in GitHub Actions
// import cron from 'node-cron';

const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);
let lastAlertedIds = new Set();

import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const seenFile = path.join(__dirname, 'seen.json');
let seen = {};

if (fs.existsSync(seenFile)) {
  try {
    seen = JSON.parse(fs.readFileSync(seenFile, 'utf-8'));
  } catch (e) {
    console.error('Failed to parse seen.json:', e.message);
    seen = {};
  }
}

async function checkStatus() {
  try {
    const res = await axios.get('https://openai.statuspage.io/api/v2/incidents/unresolved.json');
    const incidents = Array.isArray(res.data.incidents) ? res.data.incidents : [];

    const filtered = incidents.filter(i => /chatgpt/i.test(i.name));

    for (const incident of filtered) {
      const previousStatus = seen[incident.id];

      if (incident.status !== previousStatus) {
        const message = `🚨 *Incident Update*: ${incident.name}\n• Status: ${incident.status}\n• Affected: ${incident.impact || 'N/A'}\n• More: ${incident.shortlink}`;
        console.log('Sending Slack alert:', message);
        await webhook.send({ text: message });
        seen[incident.id] = incident.status;
      }
    }

    // ✅ Save updated status map to disk after processing
    fs.writeFileSync(seenFile, JSON.stringify(seen, null, 2));
  } catch (err) {
    console.error('Failed to fetch status:', err.message);
  }
}

checkStatus();