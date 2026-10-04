import { apiClient } from './client';
import { ApiResponse, User } from '../types';

export const usersApi = {
  getAll: (params?: Record<string, string | number>) =>
    apiClient.get<ApiResponse<User[]>>('/users', { params }),

  getSalespeople: () =>
    apiClient.get<ApiResponse<User[]>>('/users/salespeople'),

  getById: (id: string) =>
    apiClient.get<ApiResponse<User>>(`/users/${id}`),

  create: (data: Partial<User> & { password: string }) =>
    apiClient.post<ApiResponse<User>>('/users', data),

  update: (id: string, data: Partial<User>) =>
    apiClient.put<ApiResponse<User>>(`/users/${id}`, data),

  resetPassword: (id: string, password: string) =>
    apiClient.post<ApiResponse<null>>(`/users/${id}/reset-password`, { password }),
};
