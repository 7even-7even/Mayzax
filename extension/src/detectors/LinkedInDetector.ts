import { BaseDetector } from './BaseDetector';
import { JobPortal } from '../types';

export class LinkedInDetector extends BaseDetector {
  readonly portal = JobPortal.LINKEDIN;

  canHandle(url: string): boolean {
    return url.includes('linkedin.com') || url.includes('linkedin.cn');
  }
}
