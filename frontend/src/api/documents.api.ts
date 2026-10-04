import { apiClient } from './client';
import { ApiResponse, DocumentRecord } from '../types';

export const documentsApi = {
  getAll: (params?: Record<string, string | number>) =>
    apiClient.get<ApiResponse<DocumentRecord[]>>('/documents', { params }),
};
