// API для работы с заявками на материалы
import axios from './axios'

// Типы данных для заявок
export interface MaterialRequestItem {
  id?: number
  material_name: string
  unit: string
  quantity_requested: number
  quantity_actual?: number | null
  notes?: string
  order?: number
}

export interface User {
  id: number
  first_name: string
  last_name: string
  email: string
  role: string
}

export interface Project {
  id: number
  name: string
}

export interface MaterialRequest {
  id: number
  number: string
  company?: {
    id: number
    name: string
  }
  project?: Project
  created_by?: User
  status: string
  status_display: string
  current_approver_role?: string | null
  current_approver?: User | null
  approval_chain?: string[]
  approval_chain_index?: number
  approval_history?: Array<{
    role: string
    approver: string
    decision: string
    date: string
    comment: string
  }>
  rejection_reason?: string | null
  items?: MaterialRequestItem[]
  created_at: string
  updated_at: string
  submitted_at?: string | null
  approved_at?: string | null
  completed_at?: string | null
}

export interface CreateMaterialRequestData {
  project_id?: number
  items_data: MaterialRequestItem[]
}

// API функции
export const materialRequestsAPI = {
  // Получить список всех заявок
  getAll: async (): Promise<MaterialRequest[]> => {
    const response = await axios.get('/material-requests/requests/')
    // Backend возвращает paginated результат, берём results
    return response.data.results || response.data
  },

  // Получить заявку по ID
  getById: async (id: number): Promise<MaterialRequest> => {
    const response = await axios.get(`/material-requests/requests/${id}/`)
    return response.data
  },

  // Создать новую заявку (черновик)
  create: async (data: CreateMaterialRequestData): Promise<MaterialRequest> => {
    const response = await axios.post('/material-requests/requests/', data)
    return response.data
  },

  // Обновить заявку (только черновики)
  update: async (id: number, data: CreateMaterialRequestData): Promise<MaterialRequest> => {
    const response = await axios.put(`/material-requests/requests/${id}/`, data)
    return response.data
  },

  // Отправить заявку на согласование
  submit: async (id: number): Promise<{ message: string; current_status: string }> => {
    const response = await axios.post(`/material-requests/requests/${id}/submit/`)
    return response.data
  },

  // Согласовать заявку
  approve: async (id: number, comment?: string): Promise<{ message: string }> => {
    const response = await axios.post(`/material-requests/requests/${id}/approve/`, { comment: comment || '' })
    return response.data
  },

  // Отклонить заявку (на доработку)
  reject: async (id: number, reason: string): Promise<{ message: string }> => {
    const response = await axios.post(`/material-requests/requests/${id}/reject/`, { reason })
    return response.data
  },

  // Отметить как оплачено (Снабженец)
  markPaid: async (id: number, comment?: string): Promise<{ message: string }> => {
    const response = await axios.post(`/material-requests/requests/${id}/mark-paid/`, { comment: comment || '' })
    return response.data
  },

  // Принять материал (Мастер/Прораб/Нач.участка/Завсклад)
  markDelivered: async (
    id: number,
    items: { item_id: number; quantity_actual: number }[],
    comment?: string
  ): Promise<{ message: string }> => {
    const response = await axios.post(`/material-requests/requests/${id}/mark-delivered/`, {
      items,
      comment: comment || '',
    })
    return response.data
  },

  // Получить историю согласования
  getApprovalHistory: async (id: number): Promise<{
    approval_chain: string[]
    approval_history: Array<{
      role: string
      approver: string
      decision: string
      date: string
      comment: string
    }>
    current_approver_role: string | null
    status: string
  }> => {
    const response = await axios.get(`/material-requests/requests/${id}/approval-history/`)
    return response.data
  },

  // Удалить заявку (soft delete)
  delete: async (id: number): Promise<void> => {
    await axios.delete(`/material-requests/requests/${id}/`)
  },

  // Получить список проектов (для фильтров)
  getProjects: async (): Promise<Array<{ id: number; name: string }>> => {
    const response = await axios.get('/projects/projects/')
    return response.data.results || response.data
  },

  // Получить список пользователей (для фильтров)
  getUsers: async (): Promise<Array<{ id: number; full_name: string; role: string }>> => {
    const response = await axios.get('/auth/users/')
    return response.data.results || response.data
  },
}
