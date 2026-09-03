import { useState, useEffect, useCallback } from 'react';
import { JobPortal } from '../types';
import { apiClient, getAccessToken } from '@/lib/api-client';

export interface VerificationEvidence {
  portal: JobPortal;
  hostname: string;
  pathname: string;
  fullUrl: string;
  normalizedUrl: string;
  title: string;
  headings: string[];
  confirmationText: string;
  applicationReference: string | null;
  detectedButtons: { text: string; disabled: boolean; visible: boolean }[];
  domFingerprint: {
    hasConfirmationCard: boolean;
    hasSuccessBanner: boolean;
    expectedContainersFound: number;
    unexpectedApplyButtonPresent: boolean;
  };
  verificationTimestamp: number;
  extensionVersion: string;
  https: boolean;
  timeOnPageMs?: number;
  userInteractionDetected?: boolean;
  historyManipulationDetected?: boolean;
}

export interface ExtensionVerificationResult {
  verified: boolean;
  score: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  confidenceScore: number; // legacy compat
  portal: JobPortal;
  company: string;
  jobTitle: string;
  pageTitle: string;
  timestamp: number;
  matchedRules: string[];
  matchedKeywords: string[];
  evidence?: VerificationEvidence;
  verificationHash?: string;
  version?: string;
  applicationReference?: string | null;
  reasons?: string[];
  fraudSignals?: string[];
  isReplay?: boolean;
}

export type ExtensionState = 'idle' | 'checking' | 'verifying_hash' | 'verified' | 'suspicious' | 'not_verified' | 'not_installed' | 'unavailable' | 'fraud_detected';

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
  // v2 extras
  requiresHash: boolean;
  verificationHash: string | null;
  evidence: VerificationEvidence | null;
}

const DEFAULT_EXTENSION_ID = 'megkihjbidafcafpjhmgihgoohfhnlec';
const CHROME_WEBSTORE_URL = 'https://chromewebstore.google.com/detail/mayzax-crm-%E2%80%94-application/megkihjbidafcafpjhmgihgoohfhnlec';

function getExtensionId(): string {
  const envId = import.meta.env.VITE_EXTENSION_ID as string | undefined;
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

/**
 * Secure v2 verification hook
 * - REMOVES URL keyword fast-path (was critical bypass)
 * - Requires extension to be installed and return evidence
 * - Calls backend to generate HMAC hash for proof
 * - Only marks verified true if backend returns HIGH confidence + hash
 */
export function useExtensionVerification(jobLink: string): UseExtensionVerificationReturn {
  const extensionId = getExtensionId();
  const [state, setState] = useState<ExtensionState>('idle');
  const [isVerified, setIsVerified] = useState(false);
  const [verificationResult, setVerificationResult] = useState<ExtensionVerificationResult | null>(null);
  const [verificationHash, setVerificationHash] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<VerificationEvidence | null>(null);
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
      setVerificationHash(null);
      setEvidence(null);
      setState('idle');
      setIsExtensionInstalled(false);
    };

    reset();

    if (!jobLink) return;

    try {
      const parsed = new URL(jobLink);
      if (parsed.protocol !== 'https:') {
        setState('not_verified');
        return;
      }
      const hostname = parsed.hostname.toLowerCase();
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || ['localhost', '127.0.0.1'].includes(hostname)) {
        setState('not_verified');
        return;
      }
    } catch {
      setState('not_verified');
      return;
    }

    if (!isChromeRuntimeAvailable()) {
      setState('not_installed');
      return;
    }

    setState('checking');
    const chromeObj = (window as any).chrome;

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
        const token = getAccessToken();
        if (token) {
          try {
            chromeObj.runtime.sendMessage(currentId, { action: 'SET_ACCESS_TOKEN', token });
          } catch {}
        }
        chromeObj.runtime.sendMessage(
          currentId,
          { action: 'VERIFY_URL', url: jobLink },
          async (response: any) => {
            if (cancelled) return;

            if (chromeObj.runtime.lastError) {
              console.debug('[Mayzax v2] runtime.lastError:', chromeObj.runtime.lastError.message, 'ID', currentId);
              if (attempt < idsToTry.length) {
                tryNextId();
              } else {
                setState('not_installed');
              }
              return;
            }

            setIsExtensionInstalled(true);

            if (!response) {
              setState('not_verified');
              return;
            }

            // If extension says not verified at all (no evidence)
            if (!response.verified && !response.evidence && !response.score) {
              // Check if suspicious (50-79)
              if (response.suspicious) {
                setState('suspicious');
              } else {
                setState('not_verified');
              }
              return;
            }

            // We have extension evidence — now request backend hash for proof
            const ev = response.evidence as VerificationEvidence | undefined;
            const threshold = Number(import.meta.env.VITE_VERIFICATION_THRESHOLD || 60);
            const confidence = response.confidence || (response.score > threshold ? 'HIGH' : 'LOW');

            // Now call backend to get HMAC hash — this is the enterprise proof
            if (!ev) {
              // No evidence, can't get hash — treat as legacy verified but without proof
              setVerificationResult(response);
              if (response.verified || response.score > threshold) {
                setState('verified');
                setIsVerified(true);
              } else {
                setState('not_verified');
              }
              return;
            }

            try {
              setState('verifying_hash');
              const backendRes = await apiClient.post('/verifications/verify-evidence', {
                evidence: ev,
                jobLink,
              });

              const data = backendRes.data.data;
              const hash = data.verificationHash;
              const backendVerified = data.verified;
              const backendScore = data.score;
              const backendConfidence = data.confidence;

              if (cancelled) return;

              const finalResult: ExtensionVerificationResult = {
                verified: backendVerified,
                score: backendScore,
                confidence: 'HIGH',
                confidenceScore: backendScore,
                portal: data.portal,
                company: response.company || '',
                jobTitle: response.jobTitle || '',
                pageTitle: ev.title || '',
                timestamp: data.verificationTimestamp || Date.now(),
                matchedRules: data.reasons || response.matchedRules || [],
                matchedKeywords: ev.headings || [],
                evidence: ev,
                verificationHash: hash,
                version: 'v2',
                applicationReference: data.applicationReference || ev.applicationReference,
                reasons: data.reasons,
                fraudSignals: [],
                isReplay: false,
              };

              setVerificationResult(finalResult);
              setVerificationHash(hash);
              setEvidence(ev);
              setIsVerified(backendVerified);

              if (backendVerified) {
                setState('verified');
              } else {
                setState('not_verified');
              }
            } catch (err: any) {
              console.warn('[Mayzax v2] Backend hash verification failed', err);
              // If backend fails but extension says verified, still show verified but without hash — will be downgraded on submit if REQUIRE_HASH is false
              // For security, if backend returns 400 invalid evidence, mark as not_verified
              const status = err?.response?.status;
              if (status === 400) {
                setState('not_verified');
                setVerificationResult({
                  ...response,
                  verified: false,
                  reasons: [err?.response?.data?.error?.message || 'Backend validation failed'],
                  fraudSignals: ['BACKEND_VALIDATION_FAILED'],
                });
              } else {
                // Network error — still allow extension result but mark as unverified hash
                setVerificationResult({
                  ...response,
                  verified: response.verified,
                  score: response.score,
                  confidenceScore: response.score,
                  confidence,
                });
                setIsVerified(response.verified);
                setState(response.verified ? 'verified' : 'not_verified');
                setEvidence(ev);
              }
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
    isChecking: state === 'checking' || state === 'verifying_hash',
    state,
    verificationResult,
    isExtensionInstalled,
    isExtensionAvailable,
    extensionId,
    installUrl: CHROME_WEBSTORE_URL,
    retry,
    requiresHash: true,
    verificationHash,
    evidence,
  };
}
