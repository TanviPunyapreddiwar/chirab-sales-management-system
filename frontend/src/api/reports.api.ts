import { apiClient } from './client';
import { ApiResponse } from '../types';

export const reportsApi = {
  getOfferSummary: (params?: Record<string, string>) =>
    apiClient.get<ApiResponse<unknown>>('/reports/offer-summary', { params }),

  getSalespersonPerformance: (params?: Record<string, string>) =>
    apiClient.get<ApiResponse<unknown[]>>('/reports/salesperson-performance', { params }),

  getWonLost: (params?: Record<string, string>) =>
    apiClient.get<ApiResponse<unknown>>('/reports/won-lost', { params }),

  getFollowUpReport: (params?: Record<string, string>) =>
    apiClient.get<ApiResponse<unknown[]>>('/reports/follow-ups', { params }),
};
