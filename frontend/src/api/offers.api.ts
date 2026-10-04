import { apiClient } from './client';
import {
  ApiResponse, Offer, OfferRevision, FollowUp,
  OfferApproval, OfferDocument, OfferFilters,
} from '../types';

export const offersApi = {
  getAll: (filters?: OfferFilters) =>
    apiClient.get<ApiResponse<Offer[]>>('/offers', { params: filters }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Offer>>(`/offers/${id}`),

  create: (data: Partial<Offer>) =>
    apiClient.post<ApiResponse<Offer>>('/offers', data),

  update: (id: string, data: Partial<Offer>) =>
    apiClient.put<ApiResponse<Offer>>(`/offers/${id}`, data),

  changeStatus: (id: string, status: string, remarks?: string) =>
    apiClient.patch<ApiResponse<Offer>>(`/offers/${id}/status`, { status, remarks }),

  // Revisions
  getRevisions: (offerId: string) =>
    apiClient.get<ApiResponse<OfferRevision[]>>(`/offers/${offerId}/revisions`),

  createRevision: (offerId: string, data: Partial<OfferRevision> & { changeReason: string }) =>
    apiClient.post<ApiResponse<OfferRevision>>(`/offers/${offerId}/revisions`, data),

  // Follow-ups
  getFollowUps: (offerId: string) =>
    apiClient.get<ApiResponse<FollowUp[]>>(`/offers/${offerId}/followups`),

  createFollowUp: (offerId: string, data: Partial<FollowUp>) =>
    apiClient.post<ApiResponse<FollowUp>>(`/offers/${offerId}/followups`, data),

  // Approvals
  createApproval: (offerId: string, data: { action: string; comments?: string }) =>
    apiClient.post<ApiResponse<OfferApproval>>(`/offers/${offerId}/approvals`, data),

  // Documents
  uploadDocument: (offerId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<ApiResponse<OfferDocument>>(
      `/offers/${offerId}/documents`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  getDocumentDownloadUrl: (offerId: string, docId: string) => {
    // Use a root-relative path so the Vite dev proxy forwards it correctly,
    // and so production deployments behind a reverse proxy also work.
    // The token is appended as a query param because browser <a> navigation
    // cannot set custom Authorization headers.
    const token = localStorage.getItem('token') ?? '';
    return `/api/offers/${offerId}/documents/${docId}/download?token=${encodeURIComponent(token)}`;
  },
};
