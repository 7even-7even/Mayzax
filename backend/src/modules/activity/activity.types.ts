import { UserStatus, Role } from '@prisma/client';

export interface ActivityRequester {
  id: string;
  role: Role;
  name: string;
  email: string;
}

export interface ActivityMeta {
  ip?: string;
  userAgent?: string;
}

export interface CurrentStatusResponse {
  status: UserStatus;
  startedAt: Date;
  optionalNote: string | null;
  currentDurationSeconds: number;
}

export interface DailyActivitySummary {
  userId: string;
  userName: string;
  userEmail: string;
  role: Role;
  date: string;
  loginTime: Date | null;
  logoutTime: Date | null;
  totalLoggedInSeconds: number;
  totalProductiveSeconds: number;
  totalBreakSeconds: number;
  breakDetails: {
    shortBreakSeconds: number;
    dinnerBreakSeconds: number;
    briefingTrainingSeconds: number;
    meetingSeconds: number;
    systemIssueSeconds: number;
  };
  currentStatus: UserStatus;
  currentDurationSeconds: number;
  logs: {
    id: string;
    status: UserStatus;
    startedAt: Date;
    endedAt: Date | null;
    durationSeconds: number;
    optionalNote: string | null;
  }[];
}

export interface LiveStatusItem {
  userId: string;
  name: string;
  email: string;
  role: Role;
  createdById: string | null;
  status: UserStatus;
  startedAt: Date;
  currentDurationSeconds: number;
  optionalNote: string | null;
  todayLoggedInSeconds: number;
  todayProductiveSeconds: number;
  todayBreakSeconds: number;
  lastHeartbeatAt: Date | null;
  isOnline: boolean;
}

export interface LiveStatusMetrics {
  totalActiveCount: number;
  totalBreakCount: number;
  totalIssueCount: number;
  totalOfflineCount: number;
  members: LiveStatusItem[];
}

export interface ProductivityMetrics {
  totalProductiveHours: number;
  totalBreakHours: number;
  averageProductiveHoursPerUser: number;
  shiftUtilizationPercentage: number;
  attendancePercentage: number;
  activeUsersCount: number;
}

export interface ActivityUserOption {
  id: string;
  name: string;
  email: string;
  role: Role;
}
