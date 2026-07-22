import { BaseDetector } from './BaseDetector';
import { JobPortal } from '../types';

export class IndeedDetector extends BaseDetector {
  readonly portal = JobPortal.INDEED;
  canHandle(url: string): boolean { return url.includes('indeed.'); }
}

export class GlassdoorDetector extends BaseDetector {
  readonly portal = JobPortal.GLASSDOOR;
  canHandle(url: string): boolean { return url.includes('glassdoor.'); }
}

export class JobRightDetector extends BaseDetector {
  readonly portal = JobPortal.JOBRIGHT;
  canHandle(url: string): boolean { return url.includes('jobright.ai') || url.includes('jobright.com'); }
}

export class SimplifyDetector extends BaseDetector {
  readonly portal = JobPortal.SIMPLIFY;
  canHandle(url: string): boolean { return url.includes('simplify.jobs'); }
}

export class SimplyHiredDetector extends BaseDetector {
  readonly portal = JobPortal.SIMPLYHIRED;
  canHandle(url: string): boolean { return url.includes('simplyhired.com'); }
}

export class WellfoundDetector extends BaseDetector {
  readonly portal = JobPortal.WELLFOUND;
  canHandle(url: string): boolean { return url.includes('wellfound.com') || url.includes('angel.co'); }
}

export class HandshakeDetector extends BaseDetector {
  readonly portal = JobPortal.HANDSHAKE;
  canHandle(url: string): boolean { return url.includes('joinhandshake.com') || url.includes('handshake.com'); }
}

export class NaukriDetector extends BaseDetector {
  readonly portal = JobPortal.NAUKRI;
  canHandle(url: string): boolean { return url.includes('naukri.com'); }
}

export class DiceDetector extends BaseDetector {
  readonly portal = JobPortal.DICE;
  canHandle(url: string): boolean { return url.includes('dice.com'); }
}

export class MonsterDetector extends BaseDetector {
  readonly portal = JobPortal.MONSTER;
  canHandle(url: string): boolean { return url.includes('monster.com'); }
}

export class ZipRecruiterDetector extends BaseDetector {
  readonly portal = JobPortal.ZIPRECRUITER;
  canHandle(url: string): boolean { return url.includes('ziprecruiter.com'); }
}

export class CareerBuilderDetector extends BaseDetector {
  readonly portal = JobPortal.CAREERBUILDER;
  canHandle(url: string): boolean { return url.includes('careerbuilder.com'); }
}

export class LeverDetector extends BaseDetector {
  readonly portal = JobPortal.LEVER;
  canHandle(url: string): boolean { return url.includes('lever.co'); }
}

export class GreenhouseDetector extends BaseDetector {
  readonly portal = JobPortal.GREENHOUSE;
  canHandle(url: string): boolean { return url.includes('greenhouse.io') || url.includes('greenhouse.com'); }
}

export class SpeedyApplyDetector extends BaseDetector {
  readonly portal = JobPortal.SPEEDY_APPLY;
  canHandle(url: string): boolean { return url.includes('speedyapply.com') || url.includes('speedy-apply.com'); }
}

export class TheMuseDetector extends BaseDetector {
  readonly portal = JobPortal.THE_MUSE;
  canHandle(url: string): boolean { return url.includes('themuse.com') || url.includes('themuse.co'); }
}

export class YCombinatorDetector extends BaseDetector {
  readonly portal = JobPortal.Y_COMBINATOR;
  canHandle(url: string): boolean { return url.includes('ycombinator.com') || url.includes('workatastartup.com'); }
}

export class CompanyWebsiteDetector extends BaseDetector {
  readonly portal = JobPortal.COMPANY_WEBSITE;
  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname;
      return !hostname.includes('.') || (!url.includes('careers.') && !url.includes('jobs.'));
    } catch {
      return false;
    }
  }
}

export class CareerSiteDetector extends BaseDetector {
  readonly portal = JobPortal.CAREER_SITE;
  canHandle(url: string): boolean {
    return url.includes('careers.') || url.includes('jobs.') || url.includes('/careers') || url.includes('/jobs');
  }
}

export class OtherDetector extends BaseDetector {
  readonly portal = JobPortal.OTHER;
  canHandle(): boolean { return true; } // Fallback detector
}
