import { useState, useEffect, useCallback } from 'react';
import { JobPortal } from '../types';

export interface ExtensionVerificationResult {
  verified: boolean;
  confidenceScore: number;
  portal: JobPortal;
  company: string;
  jobTitle: string;
  pageTitle: string;
  timestamp: number;
  matchedRules: string[];
  matchedKeywords: string[];
}

export type ExtensionState = 'idle' | 'checking' | 'verified' | 'not_verified' | 'not_installed' | 'unavailable';

const VERIFICATION_KEYWORDS = [
  'completed',
  'finish',
  'thankyou',
  'thank-you',
  'submitted',
  'confirmation',
  'success',
  'done',
  'complete',
  'application-complete',
  'apply-complete',
  'received',
  'post-apply',
  'already-applied',
  'alreadyapplied',
  'previously-applied',
  'applied',
];

interface UseExtensionVerificationReturn {
  isVerified: boolean;
  isChecking: boolean;
  state: ExtensionState;
  verificationResult: ExtensionVerificationResult | null;
  isExtensionInstalled: boolean;
  isExtensionAvailable: boolean;
  extensionId: string;
  installUrl: string | null;
  retry: () => void;
}

const DEFAULT_EXTENSION_ID = 'nmbkoelklehokgbdakioefnikogeakpc';
const CHROME_WEBSTORE_URL = 'https://chrome.google.com/webstore'; // Replace with actual listing when published

function getExtensionId(): string {
  const envId = import.meta.env.VITE_EXTENSION_ID as string | undefined;
  // Allow comma-separated fallback list for dev vs prod
  if (envId) {
    const first = envId.split(',')[0].trim();
    if (first) return first;
  }
  return DEFAULT_EXTENSION_ID;
}

function isChromeRuntimeAvailable(): boolean {
  const chromeObj = (window as any).chrome;
  return !!(chromeObj?.runtime?.sendMessage);
}

export function useExtensionVerification(jobLink: string): UseExtensionVerificationReturn {
  const extensionId = getExtensionId();
  const [state, setState] = useState<ExtensionState>('idle');
  const [isVerified, setIsVerified] = useState(false);
  const [verificationResult, setVerificationResult] = useState<ExtensionVerificationResult | null>(null);
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);
  const [retryCounter, setRetryCounter] = useState(0);

  const isExtensionAvailable = isChromeRuntimeAvailable();

  const retry = useCallback(() => {
    setRetryCounter((c) => c + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const reset = () => {
      setIsVerified(false);
      setVerificationResult(null);
      setState('idle');
      setIsExtensionInstalled(false);
    };

    reset();

    if (!jobLink) return;

    try {
      new URL(jobLink);
    } catch {
      setState('not_verified');
      return;
    }

    const lowercaseUrl = jobLink.toLowerCase();
    const hasKeyword = VERIFICATION_KEYWORDS.some((kw) => lowercaseUrl.includes(kw));

    if (hasKeyword) {
      // Fast-path URL keyword heuristic - still counts as verified without extension
      setIsVerified(true);
      setVerificationResult({
        verified: true,
        confidenceScore: 100,
        portal: 'OTHER',
        company: '',
        jobTitle: '',
        pageTitle: '',
        timestamp: Date.now(),
        matchedRules: ['URL_KEYWORD_MATCH'],
        matchedKeywords: VERIFICATION_KEYWORDS.filter((k) => lowercaseUrl.includes(k)),
      });
      setState('verified');
      setIsExtensionInstalled(true);
      return;
    }

    if (!isChromeRuntimeAvailable()) {
      setState('not_installed');
      return;
    }

    setState('checking');
    const chromeObj = (window as any).chrome;

    // Try primary ID, then fallback default if different
    const idsToTry = [extensionId];
    if (extensionId !== DEFAULT_EXTENSION_ID) idsToTry.push(DEFAULT_EXTENSION_ID);

    let attempt = 0;

    const tryNextId = () => {
      if (cancelled) return;
      if (attempt >= idsToTry.length) {
        setState('not_installed');
        return;
      }

      const currentId = idsToTry[attempt];
      attempt++;

      try {
        chromeObj.runtime.sendMessage(
          currentId,
          { action: 'VERIFY_URL', url: jobLink },
          (response: ExtensionVerificationResult & { error?: string }) => {
            if (cancelled) return;

            if (chromeObj.runtime.lastError) {
              // If error, try next ID or mark not installed
              console.debug('[Mayzax Verification] runtime.lastError:', chromeObj.runtime.lastError.message, 'for ID', currentId);
              if (attempt < idsToTry.length) {
                tryNextId();
              } else {
                setState('not_installed');
              }
              return;
            }

            // We got a response -> extension is installed
            setIsExtensionInstalled(true);

            if (response && response.verified) {
              setIsVerified(true);
              setVerificationResult(response);
              setState('verified');
            } else {
              setState('not_verified');
            }
          }
        );
      } catch (err) {
        console.warn('[Mayzax Extension] External messaging failed:', err);
        if (attempt < idsToTry.length) {
          tryNextId();
        } else {
          setState('not_installed');
        }
      }
    };

    tryNextId();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobLink, retryCounter, extensionId]);

  return {
    isVerified,
    isChecking: state === 'checking',
    state,
    verificationResult,
    isExtensionInstalled,
    isExtensionAvailable,
    extensionId,
    installUrl: CHROME_WEBSTORE_URL,
    retry,
  };
}
