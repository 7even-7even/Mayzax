import { JobPortal, PortalPlugin } from '../types';
import { GreenhouseVerifier } from './GreenhouseVerifier';
import { LeverVerifier } from './LeverVerifier';
import { WorkdayVerifier } from './WorkdayVerifier';
import { LinkedInVerifier } from './LinkedInVerifier';
import { IndeedVerifier } from './IndeedVerifier';
import { SuccessFactorsVerifier } from './SuccessFactorsVerifier';
import { OracleVerifier } from './OracleVerifier';
import { TaleoVerifier } from './TaleoVerifier';
import { GenericCareerVerifier, OtherVerifier, ZipRecruiterVerifier, GlassdoorVerifier, NaukriVerifier, DiceVerifier } from './GenericVerifiers';

export class PortalRegistryV2 {
  private static instance: PortalRegistryV2;
  private verifiers: PortalPlugin[];
  private fallback: PortalPlugin;

  private constructor() {
    this.verifiers = [
      new GreenhouseVerifier(),
      new LeverVerifier(),
      new WorkdayVerifier(),
      new LinkedInVerifier(),
      new IndeedVerifier(),
      new SuccessFactorsVerifier(),
      new OracleVerifier(),
      new TaleoVerifier(),
      new ZipRecruiterVerifier(),
      new GlassdoorVerifier(),
      new NaukriVerifier(),
      new DiceVerifier(),
      new GenericCareerVerifier(),
    ];
    this.fallback = new OtherVerifier();
  }

  static getInstance(): PortalRegistryV2 {
    if (!PortalRegistryV2.instance) {
      PortalRegistryV2.instance = new PortalRegistryV2();
    }
    return PortalRegistryV2.instance;
  }

  getAll(): PortalPlugin[] {
    return [...this.verifiers, this.fallback];
  }

  getPluginForHostname(hostname: string): PortalPlugin {
    const normalized = hostname.toLowerCase().replace(/^www\./, '');
    for (const verifier of this.verifiers) {
      if (verifier.canHandle(normalized)) {
        return verifier;
      }
    }
    return this.fallback;
  }

  getPluginForUrl(urlString: string): PortalPlugin {
    try {
      const url = new URL(urlString);
      return this.getPluginForHostname(url.hostname);
    } catch {
      return this.fallback;
    }
  }

  detectPortalEnum(hostname: string): JobPortal {
    const plugin = this.getPluginForHostname(hostname);
    return plugin.portal;
  }
}

export * from './GreenhouseVerifier';
export * from './LeverVerifier';
export * from './WorkdayVerifier';
export * from './LinkedInVerifier';
export * from './IndeedVerifier';
export * from './GenericVerifiers';
