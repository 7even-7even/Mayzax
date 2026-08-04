// src/manifest.ts — Typed MV3 manifest consumed by @crxjs/vite-plugin
import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Mayzax CRM — Application Verifier',
  version: '2.0.0',
  key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAw220UyDVVNfL81OzAEqBsrlsKl6S/QXy/imnWSEKXR75upb1oG/2rVDvTpNHMXBRLcmoNJE3YPJh/6SivUeOowTAPN8aCLBu5opxM0adn0SuKQFPkQFDFI1EtpGL9GbymGbQ7OJ6I1itHhgCvWjkh2EFevFx13DFAmZ+9sSXCPphH8aSxkHD5EfmI5u/64wnaUt4UmdvV4J+PC4CRup2dmqWUWjYGaUnLrlRVFVS+Rjy1MUbpLElTxtS2bYoNwlAXNVuurCbwW6jL5mOCZcF+g80hazcqqrKsgqeQGXEPBqAVL3bE8RGF8OYnnkMpRSeW34oVco7ZOWpwiY3wcoYpwIDAQAB',
  description:
    'Enterprise-grade job application verification engine — fraud-resistant detection with HMAC proof, multi-portal fingerprints, and evidence collection.',

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
        // Broad coverage for enterprise ATS + generic career sites (filtered in code via PortalRegistry)
        'https://*/*',
        'http://*/*',
        // Explicit ATS for clarity (also covered by above)
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
        'https://*.myworkdayjobs.com/*',
        'https://*.myworkday.com/*',
        'https://*.workday.com/*',
        'https://*.successfactors.com/*',
        'https://*.sapsf.com/*',
        'https://*.oraclecloud.com/*',
        'https://*.taleo.net/*',
<<<<<<< Updated upstream
=======
        // Generic career/job paths (avoid invalid host wildcards)
        'https://*/careers/*',
        'https://*/jobs/*',
>>>>>>> Stashed changes
      ],
      js: ['src/content.ts'],
      run_at: 'document_idle',
      all_frames: false,
    },
  ],

  permissions: ['storage', 'tabs', 'activeTab', 'scripting'],

  host_permissions: [
    'https://*/*',
    'http://*/*',
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
