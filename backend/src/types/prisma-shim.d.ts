/**
 * Type augmentation for @prisma/client.
 *
 * Because Prisma engines can't be downloaded in the sandboxed build environment,
 * this file re-declares the Prisma namespace with the enums and type helpers our
 * code depends on so TypeScript can type-check. At runtime, after `prisma generate`,
 * Prisma produces the same enum values and input types, so the shim is a
 * compile-time-only aid.
 */
declare module '@prisma/client' {
  export const PrismaClient: any;
  export const Prisma: {
    PrismaClientKnownRequestError: any;
    sql: any;
    join: any;
    empty: any;
    Validator: any;
  };

  export enum Role {
    ADMIN = 'ADMIN',
    TEAM_LEADER = 'TEAM_LEADER',
    RECRUITER = 'RECRUITER',
    RESUME_ASSIST = 'RESUME_ASSIST',
    SALES_EXEC = 'SALES_EXEC',
    CLIENT = 'CLIENT',
  }
  export enum ClientType {
    WEB = 'WEB',
    MOBILE = 'MOBILE',
  }
  export enum ApplicationStatus {
    APPLIED = 'APPLIED',
    IN_REVIEW = 'IN_REVIEW',
    SHORTLISTED = 'SHORTLISTED',
    INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
    INTERVIEWED = 'INTERVIEWED',
    OFFERED = 'OFFERED',
    REJECTED = 'REJECTED',
    WITHDRAWN = 'WITHDRAWN',
    ON_HOLD = 'ON_HOLD',
  }
  export enum UserStatus {
    ONLINE = 'ONLINE',
    ACTIVE = 'ACTIVE',
    SHORT_BREAK = 'SHORT_BREAK',
    DINNER_BREAK = 'DINNER_BREAK',
    BRIEFING_TRAINING = 'BRIEFING_TRAINING',
    MEETING = 'MEETING',
    SYSTEM_ISSUE = 'SYSTEM_ISSUE',
    OFFLINE = 'OFFLINE',
  }
  export enum JobPortal {
    LINKEDIN = 'LINKEDIN',
    INDEED = 'INDEED',
    GLASSDOOR = 'GLASSDOOR',
    JOBRIGHT = 'JOBRIGHT',
    SIMPLIFY = 'SIMPLIFY',
    SIMPLYHIRED = 'SIMPLYHIRED',
    WELLFOUND = 'WELLFOUND',
    HANDSHAKE = 'HANDSHAKE',
    NAUKRI = 'NAUKRI',
    DICE = 'DICE',
    MONSTER = 'MONSTER',
    ZIPRECRUITER = 'ZIPRECRUITER',
    COMPANY_WEBSITE = 'COMPANY_WEBSITE',
    CAREERBUILDER = 'CAREERBUILDER',
    LEVER = 'LEVER',
    GREENHOUSE = 'GREENHOUSE',
    SPEEDY_APPLY = 'SPEEDY_APPLY',
    THE_MUSE = 'THE_MUSE',
    Y_COMBINATOR = 'Y_COMBINATOR',
    CAREER_SITE = 'CAREER_SITE',
    OTHER = 'OTHER',
  }
  export enum DevicePlatform {
    ANDROID = 'ANDROID',
    IOS = 'IOS',
    WEB = 'WEB',
  }
  export enum NotificationType {
    BREAK_5MIN = 'BREAK_5MIN',
    BREAK_2MIN = 'BREAK_2MIN',
    BREAK_EXPIRED = 'BREAK_EXPIRED',
    SHIFT_ENDING_15MIN = 'SHIFT_ENDING_15MIN',
    SHIFT_ENDING_5MIN = 'SHIFT_ENDING_5MIN',
    SHIFT_START_REMINDER = 'SHIFT_START_REMINDER',
    ATTENDANCE_REMINDER = 'ATTENDANCE_REMINDER',
    COMPANY_NOTICE = 'COMPANY_NOTICE',
    SYSTEM = 'SYSTEM',
    PENALTY_NOTICE = 'PENALTY_NOTICE',
  }
  export enum AttendanceStatus {
    PRESENT = 'PRESENT',
    ABSENT = 'ABSENT',
    HALF_DAY = 'HALF_DAY',
    WEEK_OFF = 'WEEK_OFF',
    HOLIDAY = 'HOLIDAY',
    LEAVE = 'LEAVE',
    NOT_STARTED = 'NOT_STARTED',
  }
  export enum OnboardingStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
  }

  // User model (used as type in some places)
  export type User = {
    id: string;
    name: string;
    email: string;
    role: Role;
    isActive: boolean;
    deletedAt: Date | null;
  };

  export namespace Prisma {
    type JobApplicationWhereInput = any;
    type JobApplicationUncheckedCreateInput = any;
    type JobApplicationUpdateInput = any;
    type JobApplicationOrderByWithRelationInput = any;
    type ClientProfileWhereInput = any;
    type ClientProfileUncheckedUpdateInput = any;
    type ClientProfileOrderByWithRelationInput = any;
    type UserWhereInput = any;
    type UserOrderByWithRelationInput = any;
    type UserUncheckedCreateInput = any;
    type AttendanceDayCreateInput = any;
    type AttendanceDayUpdateInput = any;
    type AttendanceDayUncheckedCreateInput = any;
    type AttendanceDayUncheckedUpdateInput = any;
    type InputJsonValue = any;
    type JsonNull = any;
    type Enumerable<T> = T | T[];
  }
}
