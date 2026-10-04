import { apiClient } from './client';
import { ApiResponse, Customer, CustomerWithStats } from '../types';

export const customersApi = {
  getAll: (params?: Record<string, string | number>) =>
    apiClient.get<ApiResponse<Customer[]>>('/customers', { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<CustomerWithStats>>(`/customers/${id}`),

  create: (data: Partial<Customer>) =>
    apiClient.post<ApiResponse<Customer>>('/customers', data),

  update: (id: string, data: Partial<Customer>) =>
    apiClient.put<ApiResponse<Customer>>(`/customers/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/customers/${id}`),
};
