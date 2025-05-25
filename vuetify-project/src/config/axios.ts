// config/axios.js
import axios, { type AxiosResponse, type AxiosRequestConfig } from 'axios'
import type { Organization, User, UserCredentials } from './user'
import type { IjazahInput, SignatureInput } from './ijazah'

// Define proper response types
interface ApiResponse<T = unknown> {
  data: T
  success?: boolean
  message?: string
  error?: string
}

interface ApiError {
  response?: {
    data?: {
      message?: string
      error?: string
    }
    status?: number
  }
  message?: string
  request?: unknown
}

// Create axios instance dengan konfigurasi base
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - untuk menambahkan auth token
apiClient.interceptors.request.use(
  (config) => {
    // Ambil token dari localStorage atau store (Pinia/Vuex)
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Log request untuk debugging (bisa dihapus di production)
    if (import.meta.env.VITE_APP_ENV === 'development') {
      console.log(
        `🚀 [${config.method?.toUpperCase()}] ${config.url}`,
        config.data
      )
    }

    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor - untuk handle response dan error
apiClient.interceptors.response.use(
  (response) => {
    // Log response untuk debugging
    if (import.meta.env.VITE_APP_ENV === 'development') {
      console.log(
        `✅ [${response.config.method?.toUpperCase()}] ${response.config.url}`,
        response.data
      )
    }
    return response
  },
  (error) => {
    // Handle different types of errors
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response

      switch (status) {
        case 401:
          // Unauthorized - redirect to login atau refresh token
          console.error('Unauthorized access - redirecting to login')
          localStorage.removeItem('authToken')
          window.location.href = '/login'
          break

        case 403:
          console.error('Forbidden access - insufficient permissions')
          break

        case 404:
          console.error('Resource not found')
          break

        case 422:
          console.error('Validation error:', data)
          break

        case 503:
          console.error('Service unavailable')
          break

        case 500:
          console.error('Internal server error')
          break

        default:
          console.error(`HTTP ${status}:`, data)
      }
    } else if (error.request) {
      // Network error
      console.error('Network error:', error.request)
    } else {
      // Something else happened
      console.error('Error:', error.message)
    }

    return Promise.reject(error)
  }
)

// API Services untuk semua endpoint
export const apiService = {
  // System endpoints
  system: {
    healthCheck: () => apiClient.get('/api/health'),
    getInfo: () => apiClient.get('/api/info'),
  },

  // User Management
  users: {
    // User CRUD
    create: (userData: unknown, token: string) =>
      apiClient.post('/api/user', userData, {
        headers: { Authorization: `Bearer ${token}` },
      }),

    getCurrentUser: () => apiClient.get('/api/user/me'),

    getAll: (params: Record<string, unknown> = {}) =>
      apiClient.get('/api/user', { params }),

    getById: (id: string) => apiClient.get(`/api/user/${id}`),

    update: (id: string, userData: User) =>
      apiClient.put(`/api/user/${id}`, userData),

    delete: (id: string) => apiClient.delete(`/api/user/${id}`),

    // User credentials
    setCredentials: (id: string, credentials: UserCredentials, token: string) =>
      apiClient.post(`/api/user/${id}/credentials`, credentials, {
        headers: { Authorization: `Bearer ${token}` },
      }),

    deleteCredentials: (id: string) =>
      apiClient.delete(`/api/user/${id}/credentials`),

    // User organization & status
    getByOrganization: (organization: Organization) =>
      apiClient.get(`/api/user/organization/${organization}`),

    getActiveUsers: () => apiClient.get('/api/user/active'),

    activateUser: (id: string) => apiClient.put(`/api/user/${id}/activate`),

    deactivateUser: (id: string) => apiClient.put(`/api/user/${id}/deactivate`),
  },

  // Ijazah Certificate Management
  ijazah: {
    // Public endpoints (no auth required)
    getPublic: (id: string) => apiClient.get(`/api/ijazah/${id}`),

    validate: (id: string) => apiClient.get(`/api/ijazah/${id}/validate`),

    verify: (id: string) => apiClient.get(`/api/ijazah/${id}/verify`),

    // CRUD operations
    create: (ijazahData: IjazahInput) =>
      apiClient.post('/api/ijazah', ijazahData),

    getAll: (params: Record<string, unknown> = {}) =>
      apiClient.get('/api/ijazah', { params }),

    getById: (id: string) => apiClient.get(`/api/ijazah/${id}`),

    update: (id: string, ijazahData: IjazahInput) =>
      apiClient.put(`/api/ijazah/${id}`, ijazahData),

    delete: (id: string) => apiClient.delete(`/api/ijazah/${id}`),

    // Status management
    getPending: () => apiClient.get('/api/ijazah/pending'),

    getByStatus: (status: string) =>
      apiClient.get(`/api/ijazah/status/${status}`),

    updateStatus: (id: string, statusData: string) =>
      apiClient.put(`/api/ijazah/${id}/status`, statusData),

    getStatuses: () => apiClient.get('/api/ijazah/statuses'),

    // Approval workflow
    approve: (id: string, signatureId: string) =>
      apiClient.put(`/api/ijazah/${id}/approve`, signatureId),

    reject: (id: string, signatureId: string) =>
      apiClient.put(`/api/ijazah/${id}/reject`, signatureId),

    activate: (id: string) => apiClient.put(`/api/ijazah/${id}/activate`),

    regenerate: (id: string, signatureId: string) =>
      apiClient.put(`/api/ijazah/${id}/regenerate`, signatureId),

    bulkApprove: (ijazahIds: Array<string>, signatureId: string) =>
      apiClient.post('/api/ijazah/bulk-approve', {
        ijazahIds,
        signatureId,
      }),

    // File access
    getCertificateUrl: (id: string) =>
      apiClient.get(`/api/ijazah/${id}/certificate`),

    getPhotoUrl: (id: string) => apiClient.get(`/api/ijazah/${id}/photo`),
  },

  // Signature Management
  signature: {
    // CRUD operations
    create: (signatureData: SignatureInput) =>
      apiClient.post('/api/signature', signatureData),

    upload: (formData: FormData) =>
      apiClient.post('/api/signature/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }),

    getAll: (params: Record<string, unknown> = {}) =>
      apiClient.get('/api/signature', { params }),

    getById: (id: string) => apiClient.get(`/api/signature/${id}`),

    update: (id: string, signatureData: SignatureInput) =>
      apiClient.put(`/api/signature/${id}`, signatureData),

    delete: (id: string) => apiClient.delete(`/api/signature/${id}`),

    // Status management
    getActive: () => apiClient.get('/api/signature/active'),

    activate: (id: string) => apiClient.put(`/api/signature/${id}/activate`),

    deactivate: (id: string) =>
      apiClient.put(`/api/signature/${id}/deactivate`),

    // Utility
    getStats: () => apiClient.get('/api/signature/stats'),

    validateUrl: (urlData: string) =>
      apiClient.post('/api/signature/validate-url', urlData),
  },

  // Generic methods untuk custom calls
  get: (url: string, config: AxiosRequestConfig = {}) =>
    apiClient.get(url, config),
  post: (url: string, data: unknown = {}, config: AxiosRequestConfig = {}) =>
    apiClient.post(url, data, config),
  put: (url: string, data: unknown = {}, config: AxiosRequestConfig = {}) =>
    apiClient.put(url, data, config),
  patch: (url: string, data: unknown = {}, config: AxiosRequestConfig = {}) =>
    apiClient.patch(url, data, config),
  delete: (url: string, config: AxiosRequestConfig = {}) =>
    apiClient.delete(url, config),
}

// Helper functions untuk handling response
export const apiHelper = {
  // Extract data from response
  getData: <T>(response: AxiosResponse<T>) => response.data,

  // Check if response is successful
  isSuccess: (response: AxiosResponse<ApiResponse>) =>
    response.data?.success === true,

  // Get error message from error response
  getErrorMessage: (error: ApiError): string => {
    if (error.response?.data?.message) {
      return error.response.data.message
    }
    if (error.response?.data?.error) {
      return error.response.data.error
    }
    if (error.message) {
      return error.message
    }
    return 'An unknown error occurred'
  },

  // Handle API response with success/error callbacks
  handleResponse: async <T>(
    apiCall: () => Promise<AxiosResponse<T>>,
    onSuccess?: (data: T) => void,
    onError?: (error: string) => void
  ) => {
    try {
      const response = await apiCall()
      if (apiHelper.isSuccess(response as AxiosResponse<ApiResponse>)) {
        onSuccess?.(response.data)
      } else {
        const errorMessage =
          (response.data as ApiResponse)?.message || 'Operation failed'
        onError?.(errorMessage)
      }
      return response
    } catch (error) {
      const errorMessage = apiHelper.getErrorMessage(error as ApiError)
      onError?.(errorMessage)
      throw error
    }
  },
}

// Constants untuk status dan role
export const API_CONSTANTS = {
  ORGANIZATIONS: {
    AKADEMIK: 'AKADEMIK',
    REKTOR: 'REKTOR',
    PUBLIC: 'PUBLIC',
  },

  ROLES: {
    USER: 'user',
    ADMIN: 'admin',
  },

  IJAZAH_STATUS: {
    DRAFT: 'draft',
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    ACTIVE: 'active',
  },
}

export default apiClient
