import axios from './axios'

// Интерфейсы для замечаний
export interface Issue {
  id: number
  title: string
  description: string
  project: number
  project_name: string
  site: number
  site_name: string
  category?: number
  status: 'NEW' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'COMPLETED' | 'OVERDUE' | 'REJECTED'
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL'
  created_by?: number
  assigned_to?: number
  assigned_to_name?: string
  deadline?: string
  is_overdue: boolean
  photo_count?: number
  created_at: string
}

export interface CreateIssueData {
  title: string
  description: string
  project: number
  site: number
  category?: number
  priority?: 'CRITICAL' | 'HIGH' | 'NORMAL'
  assigned_to?: number
  deadline?: string
  correction_technology?: string
  location_notes?: string
}

export const issuesAPI = {
  getIssues: async (params?: any) => {
    const response = await axios.get('/issues/issues/', { params })
    return response.data
  },

  getIssue: async (id: number) => {
    const response = await axios.get(`/issues/issues/${id}/`)
    return response.data
  },

  createIssue: async (data: any) => {
    const response = await axios.post('/issues/issues/', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  updateIssue: async (id: number, data: any) => {
    const response = await axios.patch(`/issues/issues/${id}/`, data)
    return response.data
  },

  updateStatus: async (id: number, data: { status: string; comment?: string }) => {
    const response = await axios.post(`/issues/issues/${id}/update_status/`, data)
    return response.data
  },

  uploadPhoto: async (id: number, data: FormData) => {
    const response = await axios.post(`/issues/issues/${id}/upload_photo/`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  addComment: async (id: number, data: { text: string }) => {
    const response = await axios.post(`/issues/issues/${id}/add_comment/`, data)
    return response.data
  },

  getMyIssues: async () => {
    const response = await axios.get('/issues/issues/my_issues/')
    return response.data
  },

  getPendingReview: async () => {
    const response = await axios.get('/issues/issues/pending_review/')
    return response.data
  },

  getOverdue: async () => {
    const response = await axios.get('/issues/issues/overdue/')
    return response.data
  },

  getStatistics: async () => {
    const response = await axios.get('/issues/issues/statistics/')
    return response.data
  },
}
