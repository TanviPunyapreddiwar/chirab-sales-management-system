import { apiClient } from './client';
import { ApiResponse, User } from '../types';

export interface LoginCredentials { email: string; password: string; }
export interface LoginResponse { token: string; user: User; }

export const authApi = {
  login: (credentials: LoginCredentials) =>
    apiClient.post<ApiResponse<LoginResponse>>('/auth/login', credentials),

  getProfile: () =>
    apiClient.get<ApiResponse<User>>('/auth/profile'),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.post<ApiResponse<null>>('/auth/change-password', data),
};
