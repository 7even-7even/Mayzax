import { JobPortal } from '@prisma/client';
import { SUPPORTED_PORTALS, STRICT_SUPPORTED_PORTALS } from './portal.definitions';
import { PortalDefinition } from '../types/verification.types';

export class PortalRegistry {
  private static instance: PortalRegistry;
  private portals: PortalDefinition[];

  private constructor() {
    this.portals = SUPPORTED_PORTALS;
  }

  static getInstance(): PortalRegistry {
    if (!PortalRegistry.instance) {
      PortalRegistry.instance = new PortalRegistry();
    }
    return PortalRegistry.instance;
  }

  getAll(): PortalDefinition[] {
    return this.portals;
  }

  /**
   * Strict hostname validation — prevents evil-linkedin.com bypass
   * Uses anchored regex (?:^|\.) to ensure exact domain or subdomain
   */
  private matchesHost(hostname: string, pattern: RegExp): boolean {
    return pattern.test(hostname.toLowerCase());
  }

  isSupportedHostname(hostname: string): boolean {
    const lower = hostname.toLowerCase().replace(/^www\./, '');
    // Reject IP addresses, localhost, single label
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(lower)) return false;
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(lower)) return false;
    if (!lower.includes('.')) return false;
    if (lower.length < 4) return false;

    // Check strict portals
    for (const portal of STRICT_SUPPORTED_PORTALS) {
      for (const pat of portal.hostPatterns) {
        if (this.matchesHost(lower, pat)) return true;
      }
    }
    // Check generic career patterns — allow but mark as OTHER with cap
    // Require careers. or jobs. or /careers or /jobs in path handled elsewhere
    if (lower.includes('careers.') || lower.includes('jobs.') || lower.startsWith('careers') || lower.startsWith('jobs')) {
      return true;
    }
    // For OTHER category, we allow any hostname with at least one dot and not blocked,
    // but will cap score. So return true for general domains as long as not blocked.
    // However, if we want strict allowlist, return false. We'll allow general but flag.
    return true;
  }

  detectPortal(hostname: string, pathname: string = ''): PortalDefinition | null {
    const lowerHost = hostname.toLowerCase().replace(/^www\./, '');
    const lowerPath = pathname.toLowerCase();

    // Try strict match first
    for (const portal of this.portals) {
      for (const hostPat of portal.hostPatterns) {
        if (this.matchesHost(lowerHost, hostPat)) {
          // If path patterns exist, at least one should match for confirmation pages, but we still return portal even if path doesn't match
          // Caller will check path separately for scoring
          return portal;
        }
      }
    }
    return null;
  }

  detectPortalFromUrl(urlString: string): PortalDefinition | null {
    try {
      const url = new URL(urlString);
      return this.detectPortal(url.hostname, url.pathname);
    } catch {
      return null;
    }
  }

  getPortalDefinition(portal: JobPortal): PortalDefinition | undefined {
    return this.portals.find(p => p.portal === portal);
  }

  isPathAllowedForPortal(hostname: string, pathname: string): { allowed: boolean; portal?: PortalDefinition } {
    const portal = this.detectPortal(hostname, pathname);
    if (!portal) {
      // For generic, check if path contains confirmation patterns
      const genericAllowed = /confirmation|thank-?you|success|submitted|applied/i.test(pathname);
      return { allowed: genericAllowed };
    }
    if (portal.pathPatterns.length === 0) {
      return { allowed: true, portal };
    }
    const allowed = portal.pathPatterns.some(pat => pat.test(pathname));
    return { allowed, portal };
  }

  validateHttps(protocol: string): boolean {
    return protocol === 'https:';
  }
}
