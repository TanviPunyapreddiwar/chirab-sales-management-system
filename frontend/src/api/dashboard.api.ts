import { apiClient } from './client';
import { ApiResponse, DashboardSummary, Offer } from '../types';

export const dashboardApi = {
  getSummary: () =>
    apiClient.get<ApiResponse<DashboardSummary>>('/dashboard/summary'),

  getFollowUpsDue: () =>
    apiClient.get<ApiResponse<Offer[]>>('/dashboard/followups-due'),
};
