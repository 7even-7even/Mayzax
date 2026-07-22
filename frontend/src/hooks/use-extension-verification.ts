import { useState, useEffect } from 'react';
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
  'previously-applied'
];

export function useExtensionVerification(jobLink: string) {
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [verificationResult, setVerificationResult] = useState<ExtensionVerificationResult | null>(null);

  useEffect(() => {
    setIsVerified(false);
    setVerificationResult(null);

    if (!jobLink) return;

    try {
      new URL(jobLink);
    } catch {
      return; // Invalid URL
    }

    const lowercaseUrl = jobLink.toLowerCase();
    const hasKeyword = VERIFICATION_KEYWORDS.some(keyword => lowercaseUrl.includes(keyword));

    if (hasKeyword) {
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
        matchedKeywords: []
      });
      setIsChecking(false);
      return;
    }

    setIsChecking(true);

    // Query external extension port using the loaded extension ID
    const extensionId = import.meta.env.VITE_EXTENSION_ID || 'nmbkoelklehokgbdakioefnikogeakpc';

    // Query external extension port
    try {
      const chromeObj = (window as any).chrome;
      if (chromeObj?.runtime?.sendMessage) {
        chromeObj.runtime.sendMessage(
          extensionId,
          { action: 'VERIFY_URL', url: jobLink },
          (response: ExtensionVerificationResult & { error?: string }) => {
            setIsChecking(false);
            if (chromeObj.runtime.lastError) {
              console.warn('[Mayzax Extension Hook] Extension not detected or not connectable:', chromeObj.runtime.lastError.message);
              return;
            }
            if (response && response.verified) {
              setIsVerified(true);
              setVerificationResult(response);
            }
          }
        );
      } else {
        setIsChecking(false);
      }
    } catch (err) {
      console.warn('[Mayzax Extension Hook] External messaging failed:', err);
      setIsChecking(false);
    }
  }, [jobLink]);

  return { isVerified, isChecking, verificationResult };
}
