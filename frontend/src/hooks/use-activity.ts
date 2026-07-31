import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ApiSuccess, UserStatus } from '@/types';
import { useAuth } from '@/context/auth-context';

export interface CurrentStatusData {
  status: UserStatus;
  startedAt: string;
  optionalNote: string | null;
  currentDurationSeconds: number;
}

export interface TodayActivityData {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  date: string;
  loginTime: string | null;
  logoutTime: string | null;
  totalLoggedInSeconds: number;
  totalProductiveSeconds: number;
  totalOnlineSeconds?: number;
  totalBreakSeconds: number;
  breakDetails: {
    shortBreakSeconds: number;
    dinnerBreakSeconds: number;
    briefingTrainingSeconds: number;
    meetingSeconds: number;
    systemIssueSeconds: number;
    onlineSeconds?: number;
  };
  currentStatus: UserStatus;
  currentDurationSeconds: number;
  logs: {
    id: string;
    status: UserStatus;
    startedAt: string;
    endedAt: string | null;
    durationSeconds: number;
    optionalNote: string | null;
  }[];
}

export interface LiveStatusItemData {
  userId: string;
  name: string;
  email: string;
  role: string;
  createdById: string | null;
  teamName: string | null;
  status: UserStatus;
  startedAt: string;
  currentDurationSeconds: number;
  optionalNote: string | null;
  todayLoggedInSeconds: number;
  todayProductiveSeconds: number;
  todayBreakSeconds: number;
  lastHeartbeatAt: string | null;
  isOnline: boolean;
}

export interface LiveStatusMetricsData {
  totalActiveCount: number;
  totalBreakCount: number;
  totalIssueCount: number;
  totalOfflineCount: number;
  members: LiveStatusItemData[];
}

export interface ProductivityMetricsData {
  totalProductiveHours: number;
  totalBreakHours: number;
  averageProductiveHoursPerUser: number;
  shiftUtilizationPercentage: number;
  attendancePercentage: number;
  activeUsersCount: number;
}

export interface ActivityHistoryItem {
  id: string;
  userId: string;
  status: UserStatus;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  optionalNote: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function useCurrentStatus() {
  const { user } = useAuth();
  const isTracked = ['RECRUITER', 'TEAM_LEADER', 'RESUME_ASSIST', 'SALES_EXEC'].includes(user?.role || '');

  return useQuery({
    queryKey: ['activity-current-status'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<CurrentStatusData>>('/activity/current');
      return data.data;
    },
    enabled: !!user && isTracked,
    refetchInterval: 60000, // Sync every 1 minute
  });
}

export function useChangeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { status: UserStatus; optionalNote?: string | null }) => {
      const { data } = await apiClient.post<ApiSuccess<CurrentStatusData>>('/activity/status', payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activity-current-status'] });
      qc.invalidateQueries({ queryKey: ['activity-today'] });
      qc.invalidateQueries({ queryKey: ['activity-live-status'] });
      qc.invalidateQueries({ queryKey: ['activity-history'] });
      qc.invalidateQueries({ queryKey: ['activity-productivity'] });
    },
  });
}

export function useTodayActivity() {
  const { user } = useAuth();
  const isTracked = ['RECRUITER', 'TEAM_LEADER', 'RESUME_ASSIST', 'SALES_EXEC'].includes(user?.role || '');

  return useQuery({
    queryKey: ['activity-today'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<TodayActivityData>>('/activity/today');
      return data.data;
    },
    enabled: !!user && isTracked,
  });
}

export function useLiveStatus() {
  const { user } = useAuth();
  const canMonitor = user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER';

  return useQuery({
    queryKey: ['activity-live-status'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<LiveStatusMetricsData>>('/activity/live-status');
      return data.data;
    },
    enabled: !!user && canMonitor,
    refetchInterval: 15000, // Refresh live board every 15 seconds
  });
}

export function useActivityHistory(params: {
  userId?: string;
  fromDate?: string;
  toDate?: string;
  status?: UserStatus;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ['activity-history', params],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<ActivityHistoryItem[]>>('/activity/history', { params });
      return data;
    },
  });
}

export interface ActivityUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function useActivityUsers() {
  return useQuery({
    queryKey: ['activity-users'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<ActivityUserItem[]>>('/activity/users');
      return data.data;
    },
  });
}

export function useProductivityMetrics(params: { fromDate?: string; toDate?: string; recruiterId?: string }) {
  const { user } = useAuth();
  const canMonitor = user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER';

  return useQuery({
    queryKey: ['activity-productivity', params],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<ProductivityMetricsData>>('/activity/productivity', { params });
      return data.data;
    },
    enabled: !!user && canMonitor,
  });
}

/**
 * Hook to send a lightweight heartbeat every 2 minutes for active Recruiters & TLs.
 */
export function useActivityHeartbeat() {
  const { user, logout } = useAuth();
  const isTracked = ['RECRUITER', 'TEAM_LEADER', 'RESUME_ASSIST', 'SALES_EXEC'].includes(user?.role || '');
  const changeStatus = useChangeStatus();
  const { data: currentStatusData } = useCurrentStatus();

  useEffect(() => {
    if (!user || !isTracked) return;

    // Send immediate heartbeat on mount
    apiClient.post('/activity/heartbeat').catch(() => { });

    // Periodic 2-minute heartbeat interval
    const heartbeatInterval = setInterval(() => {
      apiClient.post('/activity/heartbeat').catch(() => { });
    }, 2 * 60 * 1000);
    
    const isCompanionRole = user?.role === 'RESUME_ASSIST' || user?.role === 'SALES_EXEC';
    if (isCompanionRole) {
      return () => {
        clearInterval(heartbeatInterval);
      };
    }

    // Track user activity
    let lastActivityTime = Date.now();
    let statusTransitionedToOffline = false;

    const handleActivity = () => {
      lastActivityTime = Date.now();
      statusTransitionedToOffline = false;
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    // Check inactivity every 10 seconds
    const inactivityCheckInterval = setInterval(async () => {
      const elapsedMs = Date.now() - lastActivityTime;

      // 15 minutes of inactivity -> Transition status to OFFLINE
      if (elapsedMs >= 25 * 60 * 1000) {
        const currentStatus = currentStatusData?.status;
        if (currentStatus && (currentStatus === 'ACTIVE' || currentStatus === 'ONLINE') && !statusTransitionedToOffline) {
          statusTransitionedToOffline = true;
          try {
            await changeStatus.mutateAsync({
              status: 'OFFLINE',
              optionalNote: 'Disconnected due to inactivity',
            });
          } catch (e) {
            console.error('Failed to auto-transition to OFFLINE due to inactivity', e);
          }
        }
      }

      // 20 minutes of inactivity (5 mins after OFFLINE transition) -> Logout automatically
      if (elapsedMs >= 30 * 60 * 1000) {
        clearInterval(heartbeatInterval);
        clearInterval(inactivityCheckInterval);
        try {
          await logout();
        } catch (e) {
          console.error('Failed to auto-logout due to inactivity', e);
        }
      }
    }, 10000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(inactivityCheckInterval);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [user, isTracked, currentStatusData?.status, changeStatus, logout]);
}
