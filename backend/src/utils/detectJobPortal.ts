import { JobPortal } from '@prisma/client';

/**
 * Best-effort job portal detection from a URL. Returns OTHER when no confident
 * match is found so the caller can keep/ask for a manual selection.
 */
export function detectJobPortalFromUrl(url: string): JobPortal {
  let hostname = '';
  try {
    hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return JobPortal.OTHER;
  }

  if (hostname.includes('linkedin.com')) return JobPortal.LINKEDIN;
  if (hostname.includes('indeed.com')) return JobPortal.INDEED;
  if (hostname.includes('glassdoor.com')) return JobPortal.GLASSDOOR;
  if (hostname.includes('jobright.ai')) return JobPortal.JOBRIGHT;
  if (hostname.includes('simplify.jobs')) return JobPortal.SIMPLIFY;
  if (hostname.includes('simplyhired.com')) return JobPortal.SIMPLYHIRED;
  if (hostname.includes('wellfound.com') || hostname.includes('angel.co')) return JobPortal.WELLFOUND;
  if (hostname.includes('joinhandshake.com')) return JobPortal.HANDSHAKE;
  if (hostname === 'jobs.lever.co' || hostname.endsWith('.lever.co')) return JobPortal.LEVER;
  if (hostname.includes('greenhouse.io') || hostname.includes('greenhouse.com')) return JobPortal.GREENHOUSE;
  if (hostname.includes('careerbuilder.com')) return JobPortal.CAREERBUILDER;
  if (hostname.includes('ziprecruiter.com')) return JobPortal.ZIPRECRUITER;
  if (hostname.includes('naukri.com')) return JobPortal.NAUKRI;
  if (hostname.includes('dice.com')) return JobPortal.DICE;
  if (hostname.includes('monster.com')) return JobPortal.MONSTER;
  if (hostname.includes('themuse.com')) return JobPortal.THE_MUSE;
  if (hostname.includes('ycombinator.com') || hostname.includes('workatastartup.com')) return JobPortal.Y_COMBINATOR;

  return JobPortal.OTHER;
}
