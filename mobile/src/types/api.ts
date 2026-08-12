export type UserStatus =
  | 'ACTIVE'
  | 'SHORT_BREAK'
  | 'DINNER_BREAK'
  | 'BRIEFING_TRAINING'
  | 'MEETING'
  | 'SYSTEM_ISSUE'
  | 'OFFLINE';

export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'HALF_DAY'
  | 'WEEK_OFF'
  | 'HOLIDAY'
  | 'LEAVE'
  | 'NOT_STARTED'
  | 'ON_BREAK';

export type Role = 'ADMIN' | 'TEAM_LEADER' | 'RECRUITER' | 'CLIENT' | 'SALES_EXEC' | 'RESUME_ASSIST';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export interface MeUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  avatarUrl: string | null;
  bio: string | null;
  department: string | null;
  location: string | null;
  designation: string | null;
  employeeId: string | null;
  joinDate: string | null;
  shiftPreference: string | null;
  skills: string[];
  teamName: string | null;
  reportingManager: PublicUser | null;
  lastActiveAt: string | null;
  isActive: boolean;
  clientProfileId?: string | null;
  clientProfile?: any;
}

export interface AuthResponse {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  user: MeUser;
}

export interface TimelineItem {
  id: string;
  status: UserStatus;
  label: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number;
  note: string | null;
}

export interface CurrentBreak {
  type: UserStatus;
  label: string;
  startedAt: string;
  allowedSec: number;
  usedSec: number;
  remainingSec: number;
  expiresAt: string | null;
  isOver: boolean;
}

export interface TodayDto {
  user: {
    id: string;
    name: string;
    email: string;
    employeeId: string | null;
    designation: string | null;
    department: string | null;
    avatarUrl: string | null;
    phone: string | null;
    teamName: string | null;
    manager: PublicUser | null;
  };
  shift: {
    name: string;
    timezone: string;
    startAt: string;
    endAt: string;
    windowText: string;
    expectedWorkSeconds: number;
  };
  today: {
    businessDate: string;
    currentStatus: UserStatus;
    currentStatusLabel: string;
    currentStatusSince: string | null;
    firstLoginAt: string | null;
    lastLogoutAt: string | null;
    isLoggedIn: boolean;
    workedSeconds: number;
    productiveSeconds: number;
    breakSeconds: number;
    remainingWorkSeconds: number;
    expectedLogoutAt: string | null;
    currentBreak: CurrentBreak | null;
    status: AttendanceStatus;
    lateByMinutes: number;
    earlyByMinutes: number;
    penaltyMinutes: number;
    totals: {
      shortBreakSec: number;
      dinnerBreakSec: number;
      briefingSec: number;
      meetingSec: number;
      systemIssueSec: number;
      shortBreakAllowedSec: number;
      dinnerBreakAllowedSec: number;
    };
  };
  timeline: TimelineItem[];
  serverTime: string;
}

export interface ShiftDto {
  config: {
    id: string | null;
    name: string;
    timezone: string;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
    shortBreakAllowedSec: number;
    dinnerBreakAllowedSec: number;
    briefingAllowedSec: number;
    meetingAllowedSec: number;
    systemIssueAllowedSec: number;
    expectedWorkSeconds: number;
    lateGraceMinutes: number;
    earlyGraceMinutes: number;
  };
  today: {
    businessDate: string;
    startAt: string;
    endAt: string;
  };
}

export interface DayDetailDto {
  businessDate: string;
  firstLoginAt: string | null;
  lastLogoutAt: string | null;
  totalLoggedInSec: number;
  totalProductiveSec: number;
  totalBreakSec: number;
  shortBreakSec: number;
  dinnerBreakSec: number;
  briefingSec: number;
  meetingSec: number;
  systemIssueSec: number;
  onlineSec: number;
  lateByMinutes: number;
  earlyByMinutes: number;
  penaltyMinutes: number;
  expectedLogoutAt: string | null;
  status: AttendanceStatus;
  remarks: string | null;
  timeline: TimelineItem[];
  shift: { startAt: string; endAt: string };
}

export interface MonthDay {
  date: string;
  status: AttendanceStatus;
  totalProductiveSec: number;
  penaltyMinutes: number;
  firstLoginAt: string | null;
}

export interface MonthSummaryDto {
  month: string;
  days: MonthDay[];
}

export interface NotificationItem {
  id: string;
  type:
    | 'BREAK_5MIN'
    | 'BREAK_2MIN'
    | 'BREAK_EXPIRED'
    | 'SHIFT_ENDING_15MIN'
    | 'SHIFT_ENDING_5MIN'
    | 'SHIFT_START_REMINDER'
    | 'ATTENDANCE_REMINDER'
    | 'COMPANY_NOTICE'
    | 'SYSTEM'
    | 'PENALTY_NOTICE';
  title: string;
  body: string;
  data: Record<string, any> | null;
  readAt: string | null;
  pushSentAt: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface Device {
  id: string;
  platform: 'ANDROID' | 'IOS' | 'WEB';
  deviceName: string | null;
  deviceModel: string | null;
  appVersion: string | null;
  lastSeen: string;
  createdAt: string;
}

export interface TeamSummaryItem {
  tlId: string;
  tlName: string;
  teamName: string | null;
  memberCount: number;
  totalApplications: number;
  currentApplications: number;
}

export interface AnalyticsSummaryDto {
  totalRecruiters: number;
  activeRecruiters: number;
  totalProfiles: number;
  totalApplications: number;
  currentShiftApplications: number;
  currentBusinessDate: string;
  shiftWindowText: string;
  totalTeams: number;
  teams: TeamSummaryItem[];
  myTotalApplications?: number;
  myCurrentShiftApplications?: number;
  activeMemberCount?: number;
  onBreakMemberCount?: number;
  topPerformer?: string;
  roleBreakdown?: Record<string, number>;
}

export interface JobPortalItem {
  portal: string;
  count: number;
}

export interface JobPortalAnalyticsDto {
  totalApplications: number;
  currentBusinessDate: string;
  portals: JobPortalItem[];
}
