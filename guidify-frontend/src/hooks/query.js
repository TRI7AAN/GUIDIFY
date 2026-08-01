import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  authAPI, 
  resumeAPI, 
  roadmapAPI, 
  missionsAPI, 
  interviewAPI, 
  dashboardAPI, 
  adaptationAPI 
} from '../lib/api';

// Query keys for cache invalidation
export const queryKeys = {
  auth: {
    profile: ['profile'],
  },
  resume: {
    current: ['resume', 'current'],
    byId: (id) => ['resume', id],
    list: ['resume', 'list'],
  },
  roadmap: {
    current: ['roadmap', 'current'],
    history: ['roadmap', 'history'],
  },
  missions: {
    today: ['missions', 'today'],
    list: ['missions', 'list'],
  },
  interview: {
    session: (id) => ['interview', 'session', id],
    sessions: ['interview', 'sessions'],
  },
  dashboard: {
    data: ['dashboard', 'data'],
    deliveryTrends: ['dashboard', 'delivery-trends'],
  },
  adaptation: {
    status: ['adaptation', 'status'],
    skillGap: ['adaptation', 'skill-gap'],
  },
};

// Authentication hooks
export const useProfile = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.auth.profile,
    queryFn: authAPI.getProfile,
    ...options,
  });
};

// Resume hooks
export const useCurrentResume = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.resume.current,
    queryFn: resumeAPI.getCurrent,
    ...options,
  });
};

export const useResume = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.resume.byId(id),
    queryFn: () => resumeAPI.get(id),
    enabled: !!id,
    ...options,
  });
};

// Roadmap hooks
export const useCurrentRoadmap = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.roadmap.current,
    queryFn: roadmapAPI.getCurrent,
    ...options,
  });
};

export const useRoadmapHistory = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.roadmap.history,
    queryFn: roadmapAPI.getHistory,
    ...options,
  });
};

// Missions hooks
export const useTodayMission = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.missions.today,
    queryFn: missionsAPI.getToday,
    ...options,
  });
};

// Interview hooks
export const useInterviewSession = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.interview.session(id),
    queryFn: () => interviewAPI.getSession(id),
    enabled: !!id,
    ...options,
  });
};

// Dashboard hooks
export const useDashboardData = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.dashboard.data,
    queryFn: dashboardAPI.get,
    ...options,
  });
};

export const useDeliveryTrends = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.dashboard.deliveryTrends,
    queryFn: dashboardAPI.getDeliveryTrends,
    ...options,
  });
};

// Adaptation hooks
export const useAdaptationStatus = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.adaptation.status,
    queryFn: adaptationAPI.getStatus,
    ...options,
  });
};

export const useSkillGap = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.adaptation.skillGap,
    queryFn: adaptationAPI.getSkillGap,
    ...options,
  });
};

// Mutation hooks
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: authAPI.updateTargetRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile });
    },
  });
};

export const useSubmitOnboarding = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: authAPI.submitOnboarding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile });
    },
  });
};

export const useUploadResume = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: resumeAPI.upload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resume.current });
    },
  });
};

export const useRegenerateRoadmap = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: roadmapAPI.regenerate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roadmap.current });
    },
  });
};

export const useCompleteMission = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: missionsAPI.complete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.missions.today });
    },
  });
};

export const useUpdateMissionStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: missionsAPI.updateStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.missions.today });
    },
  });
};

export const useSubmitDeliveryMetrics = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: interviewAPI.submitDeliveryMetrics,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.deliveryTrends });
    },
  });
};

export const useStartInterviewSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: interviewAPI.startSession,
    onSuccess: (data) => {
      queryClient.setQueryData(['interview', 'session', data.session_id], data);
    },
  });
};