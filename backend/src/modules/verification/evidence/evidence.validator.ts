import { EvidenceInput } from './evidence.schemas';
import { PortalRegistry } from '../portals/portal.registry';
import { env } from '@/config/env';

export interface ValidationResult {
  valid: boolean;
  reasons: string[];
  fraudSignals: string[];
  normalizedHostname: string;
  normalizedPathname: string;
}

export class EvidenceValidator {
  private registry = PortalRegistry.getInstance();

  validate(evidence: EvidenceInput): ValidationResult {
    const reasons: string[] = [];
    const fraudSignals: string[] = [];

    // 1. Timestamp check (Allow any age in the past, but flag future timestamps)
    const now = Date.now();
    const age = now - evidence.verificationTimestamp;
    const tolerance = env.VERIFICATION_TIMESTAMP_TOLERANCE_MS;
    if (age < -tolerance) {
      fraudSignals.push('FUTURE_TIMESTAMP');
      reasons.push(`Future timestamp detected: ${evidence.verificationTimestamp}`);
    }

    // 2. HTTPS
    if (!evidence.https) {
      return {
        valid: false,
        reasons: ['HTTPS required'],
        fraudSignals: ['INSECURE_PROTOCOL'],
        normalizedHostname: evidence.hostname,
        normalizedPathname: evidence.pathname,
      };
    }

    // 3. Hostname basic checks
    const hostname = evidence.hostname.toLowerCase().replace(/^www\./, '');
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname) || !hostname.includes('.')) {
      return {
        valid: false,
        reasons: [`Blocked or invalid hostname: ${hostname}`],
        fraudSignals: ['INVALID_HOSTNAME'],
        normalizedHostname: hostname,
        normalizedPathname: evidence.pathname,
      };
    }

    // 4. URL parse
    try {
      const url = new URL(evidence.fullUrl);
      if (url.protocol !== 'https:') {
        return {
          valid: false,
          reasons: ['Full URL must be HTTPS'],
          fraudSignals: ['INSECURE_PROTOCOL'],
          normalizedHostname: hostname,
          normalizedPathname: evidence.pathname,
        };
      }
      const urlHost = url.hostname.toLowerCase().replace(/^www\./, '');
      if (urlHost !== hostname) {
        fraudSignals.push('HOSTNAME_MISMATCH');
        reasons.push(`Hostname mismatch: evidence.hostname ${hostname} vs fullUrl host ${urlHost}`);
        // Don't fail immediately, but flag
      }
    } catch {
      return {
        valid: false,
        reasons: ['Invalid fullUrl'],
        fraudSignals: ['INVALID_URL'],
        normalizedHostname: hostname,
        normalizedPathname: evidence.pathname,
      };
    }

    // 5. Supported hostname?
    if (!this.registry.isSupportedHostname(hostname)) {
      return {
        valid: false,
        reasons: [`Unsupported hostname: ${hostname}`],
        fraudSignals: ['UNSUPPORTED_DOMAIN'],
        normalizedHostname: hostname,
        normalizedPathname: evidence.pathname,
      };
    }

    // 6. Evidence sanity
    if (!evidence.title && evidence.headings.length === 0 && !evidence.confirmationText) {
      return {
        valid: false,
        reasons: ['Evidence lacks title, headings, and confirmation text'],
        fraudSignals: ['EMPTY_EVIDENCE'],
        normalizedHostname: hostname,
        normalizedPathname: evidence.pathname,
      };
    }

    // 7. History manipulation flag
    if (evidence.historyManipulationDetected) {
      fraudSignals.push('HISTORY_MANIPULATION');
      reasons.push('Client detected history manipulation');
    }

    // 8. Extension version check
    const minVersion = env.MIN_EXTENSION_VERSION;
    if (minVersion && evidence.extensionVersion) {
      // Simple semver compare — assume major.minor.patch numeric
      if (this.isVersionLess(evidence.extensionVersion, minVersion)) {
        fraudSignals.push('OUTDATED_EXTENSION_VERSION');
        reasons.push(`Extension version ${evidence.extensionVersion} < minimum ${minVersion}`);
        // Don't reject, but warn
      }
    }

    return {
      valid: true,
      reasons,
      fraudSignals,
      normalizedHostname: hostname,
      normalizedPathname: evidence.pathname,
    };
  }

  private isVersionLess(current: string, min: string): boolean {
    try {
      const cParts = current.split('.').map(n => parseInt(n, 10));
      const mParts = min.split('.').map(n => parseInt(n, 10));
      for (let i = 0; i < Math.max(cParts.length, mParts.length); i++) {
        const c = cParts[i] || 0;
        const m = mParts[i] || 0;
        if (c < m) return true;
        if (c > m) return false;
      }
      return false;
    } catch {
      return false;
    }
  }
}
