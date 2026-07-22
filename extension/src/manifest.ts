// src/manifest.ts — Typed MV3 manifest consumed by @crxjs/vite-plugin
import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Mayzax CRM — Application Verifier',
  version: '1.0.0',
  description:
    'Verifies job application submissions on supported portals and reports confirmation to Mayzax CRM.',

  icons: {
    '16': 'icons/icon16.png',
    '32': 'icons/icon32.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
  },

  action: {
    default_popup: 'src/popup/popup.html',
    default_icon: {
      '16': 'icons/icon16.png',
      '32': 'icons/icon32.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
    default_title: 'Mayzax Application Verifier',
  },

  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },

  content_scripts: [
    {
      matches: [
        // LinkedIn
        'https://*.linkedin.com/jobs/*',
        'https://*.linkedin.com/easy-apply/*',
        // Indeed
        'https://*.indeed.com/*',
        // Glassdoor
        'https://*.glassdoor.com/*',
        // Jobright
        'https://*.jobright.ai/*',
        'https://*.jobright.com/*',
        // Simplify
        'https://*.simplify.jobs/*',
        // SimplyHired
        'https://*.simplyhired.com/*',
        // Wellfound / AngelList
        'https://*.wellfound.com/*',
        'https://*.angel.co/*',
        // Handshake
        'https://*.joinhandshake.com/*',
        'https://*.handshake.com/*',
        // Naukri
        'https://*.naukri.com/*',
        // Dice
        'https://*.dice.com/*',
        // Monster
        'https://*.monster.com/*',
        // ZipRecruiter
        'https://*.ziprecruiter.com/*',
        // CareerBuilder
        'https://*.careerbuilder.com/*',
        // Lever
        'https://*.lever.co/*',
        // Greenhouse
        'https://*.greenhouse.io/*',
        'https://*.greenhouse.com/*',
        // SpeedyApply
        'https://*.speedyapply.com/*',
        // The Muse
        'https://*.themuse.com/*',
        // Y Combinator / Work at a Startup
        'https://*.ycombinator.com/*',
        'https://*.workatastartup.com/*',
      ],
      js: ['src/content.ts'],
      run_at: 'document_idle',
    },
  ],

  permissions: ['storage', 'tabs', 'activeTab', 'scripting'],

  host_permissions: [
    'https://*.linkedin.com/*',
    'https://*.indeed.com/*',
    'https://*.glassdoor.com/*',
    'https://*.jobright.ai/*',
    'https://*.jobright.com/*',
    'https://*.simplify.jobs/*',
    'https://*.simplyhired.com/*',
    'https://*.wellfound.com/*',
    'https://*.angel.co/*',
    'https://*.joinhandshake.com/*',
    'https://*.handshake.com/*',
    'https://*.naukri.com/*',
    'https://*.dice.com/*',
    'https://*.monster.com/*',
    'https://*.ziprecruiter.com/*',
    'https://*.careerbuilder.com/*',
    'https://*.lever.co/*',
    'https://*.greenhouse.io/*',
    'https://*.greenhouse.com/*',
    'https://*.speedyapply.com/*',
    'https://*.themuse.com/*',
    'https://*.ycombinator.com/*',
    'https://*.workatastartup.com/*',
  ],

  // Allows the Mayzax frontend to send messages to this extension.
  // Update MAYZAX_FRONTEND_ORIGIN to your production URL before packaging.
  externally_connectable: {
    matches: [
      // Production (update to your actual domain)
      'https://*.mayzax.app/*',
      'https://*.mayzax.vercel.app/*',
      // Local development
      'http://localhost:*/*',
      'http://127.0.0.1:*/*',
    ],
  },
});
