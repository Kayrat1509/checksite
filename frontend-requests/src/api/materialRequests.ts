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
}

export interface MaterialRequest {
  id: number
  number: string
  project: {
    id: number
    name: string
  }
  author: {
    id: number
    full_name: string
    role: string
  }
  status: string
  status_display: string
  current_approver_role?: string | null
  current_approver?: {
    id: number
    full_name: string
  } | null
  items: MaterialRequestItem[]
  created_at: string
  updated_at: string
}

export interface CreateMaterialRequestData {
  project_id: number
  items: MaterialRequestItem[]
}

// API функции
export const materialRequestsAPI = {
  // Получить список всех заявок
  getAll: async (): Promise<MaterialRequest[]> => {
    const response = await axios.get('/material-requests/')
    return response.data
  },

  // Получить заявку по ID
  getById: async (id: number): Promise<MaterialRequest> => {
    const response = await axios.get(`/material-requests/${id}/`)
    return response.data
  },

  // Создать новую заявку
  create: async (data: CreateMaterialRequestData): Promise<MaterialRequest> => {
    const response = await axios.post('/material-requests/', data)
    return response.data
  },

  // Согласовать заявку
  approve: async (id: number, comment?: string): Promise<{ message: string }> => {
    const response = await axios.post(`/material-requests/${id}/approve/`, { comment })
    return response.data
  },

  // Отклонить заявку (на доработку)
  reject: async (id: number, reason: string): Promise<{ message: string }> => {
    const response = await axios.post(`/material-requests/${id}/reject/`, { reason })
    return response.data
  },

  // Отметить как оплачено (Снабженец)
  markPaid: async (id: number, comment?: string): Promise<{ message: string }> => {
    const response = await axios.post(`/material-requests/${id}/mark-paid/`, { comment })
    return response.data
  },

  // Принять материал (Мастер/Прораб/Нач.участка/Завсклад)
  markDelivered: async (
    id: number,
    items: { item_id: number; quantity_actual: number }[],
    comment?: string
  ): Promise<{ message: string }> => {
    const response = await axios.post(`/material-requests/${id}/mark-delivered/`, {
      items,
      comment,
    })
    return response.data
  },

  // Получить список проектов (для фильтров)
  getProjects: async (): Promise<Array<{ id: number; name: string }>> => {
    const response = await axios.get('/projects/')
    return response.data.results || response.data
  },

  // Получить список пользователей (для фильтров)
  getUsers: async (): Promise<Array<{ id: number; full_name: string; role: string }>> => {
    const response = await axios.get('/users/')
    return response.data.results || response.data
  },
}
