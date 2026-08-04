// src/manifest.ts — Typed MV3 manifest consumed by @crxjs/vite-plugin
import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Mayzax CRM — Application Verifier',
  version: '1.0.0',
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
      // Universal injection — the RecruitmentPageDetector inside content.ts
      // immediately filters out non-recruitment pages in <1ms, so there is
      // no performance cost on regular browsing.
      matches: ['https://*/*'],
      js: ['src/content.ts'],
      run_at: 'document_idle',
    },
  ],

  permissions: ['storage', 'tabs', 'activeTab', 'scripting'],

  // Universal host permission — required to match the universal content_script.
  // The actual filtering happens inside the content script via RecruitmentPageDetector.
  host_permissions: ['https://*/*'],

  // Allows the Mayzax frontend to send messages to this extension.
  externally_connectable: {
    matches: [
      // Production
      'https://*.mayzax.app/*',
      'https://*.mayzax.vercel.app/*',
      // Local development — explicit Vite port + wildcard fallback
      'http://localhost:5173/*',
      'http://localhost:*/*',
      'http://127.0.0.1:5173/*',
      'http://127.0.0.1:*/*',
    ],
  },
});
