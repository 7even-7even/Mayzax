import { BaseDetector } from './BaseDetector';
import { LinkedInDetector } from './LinkedInDetector';
import {
  IndeedDetector,
  GlassdoorDetector,
  JobRightDetector,
  SimplifyDetector,
  SimplyHiredDetector,
  WellfoundDetector,
  HandshakeDetector,
  NaukriDetector,
  DiceDetector,
  MonsterDetector,
  ZipRecruiterDetector,
  CareerBuilderDetector,
  LeverDetector,
  GreenhouseDetector,
  SpeedyApplyDetector,
  TheMuseDetector,
  YCombinatorDetector,
  CompanyWebsiteDetector,
  CareerSiteDetector,
  OtherDetector
} from './Portals';

export class PortalRegistry {
  private static instance: PortalRegistry;
  private detectors: BaseDetector[];
  private fallbackDetector: BaseDetector;

  private constructor() {
    this.detectors = [
      new LinkedInDetector(),
      new IndeedDetector(),
      new GlassdoorDetector(),
      new JobRightDetector(),
      new SimplifyDetector(),
      new SimplyHiredDetector(),
      new WellfoundDetector(),
      new HandshakeDetector(),
      new NaukriDetector(),
      new DiceDetector(),
      new MonsterDetector(),
      new ZipRecruiterDetector(),
      new CareerBuilderDetector(),
      new LeverDetector(),
      new GreenhouseDetector(),
      new SpeedyApplyDetector(),
      new TheMuseDetector(),
      new YCombinatorDetector(),
      new CareerSiteDetector(),
      new CompanyWebsiteDetector()
    ];
    this.fallbackDetector = new OtherDetector();
  }

  public static getInstance(): PortalRegistry {
    if (!PortalRegistry.instance) {
      PortalRegistry.instance = new PortalRegistry();
    }
    return PortalRegistry.instance;
  }

  public getDetector(url: string): BaseDetector {
    for (const detector of this.detectors) {
      if (detector.canHandle(url)) {
        return detector;
      }
    }
    return this.fallbackDetector;
  }
}
