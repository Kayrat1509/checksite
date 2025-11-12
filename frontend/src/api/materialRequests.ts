import axios from './axios'

/**
 * API клиент для работы с заявками на строительные материалы
 */

// Статусы заявок
export type MaterialRequestStatus =
  | 'DRAFT'
  | 'IN_APPROVAL'
  | 'APPROVED'
  | 'IN_PAYMENT'
  | 'IN_DELIVERY'
  | 'COMPLETED'
  | 'REJECTED'

// Статусы этапов согласования
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED'

// Интерфейс для позиции заявки
export interface MaterialRequestItem {
  id?: number
  material_name: string
  unit: string
  quantity_requested: number
  quantity_actual?: number
  notes?: string
}

// Интерфейс для этапа согласования
export interface ApprovalStep {
  id: number
  role: string
  role_display: string
  approver?: number
  approver_name?: string
  status: ApprovalStatus
  decision_date?: string
  rejection_reason?: string
  created_at: string
}

// Интерфейс для истории изменений
export interface MaterialRequestHistory {
  id: number
  action: string
  user: number
  user_name: string
  details?: string
  timestamp: string
}

// Интерфейс для заявки
export interface MaterialRequest {
  id: number
  request_number: string
  title: string
  description?: string
  author: number
  author_name?: string
  project: number
  project_name?: string
  status: MaterialRequestStatus
  status_display: string
  items: MaterialRequestItem[]
  approval_steps: ApprovalStep[]
  history: MaterialRequestHistory[]
  company: number
  company_name?: string
  created_at: string
  updated_at: string
  approved_at?: string
  completed_at?: string
  current_approver?: number
  current_approver_name?: string
  current_approval_role?: string
  is_deleted: boolean
}

// Данные для создания заявки
export interface CreateMaterialRequestData {
  title: string
  description?: string
  project: number
  items: Omit<MaterialRequestItem, 'id'>[]
}

// Данные для обновления заявки
export interface UpdateMaterialRequestData {
  title?: string
  description?: string
  project?: number
  items?: MaterialRequestItem[]
}

// Данные для согласования/отклонения
export interface ApprovalDecisionData {
  rejection_reason?: string
}

// Данные для обновления фактического количества
export interface UpdateActualQuantityData {
  item_id: number
  quantity_actual: number
  notes?: string
}

// Фильтры для списка заявок
export interface MaterialRequestFilters {
  tab?: 'draft' | 'all' | 'in_approval' | 'approved' | 'in_payment' | 'in_delivery' | 'completed' | 'my'
  status?: MaterialRequestStatus
  project?: number
  author?: number
  search?: string
  ordering?: string
}

// Статистика по заявкам
export interface MaterialRequestStats {
  total: number
  draft: number
  in_approval: number
  approved: number
  in_payment: number
  in_delivery: number
  completed: number
  rejected: number
}

export const materialRequestsAPI = {
  /**
   * Получить список заявок с фильтрацией по табам
   */
  getMaterialRequests: async (params?: MaterialRequestFilters) => {
    const response = await axios.get('/material-requests/', { params })
    return response.data
  },

  /**
   * Получить детали заявки
   */
  getMaterialRequest: async (id: number) => {
    const response = await axios.get(`/material-requests/${id}/`)
    return response.data
  },

  /**
   * Создать новую заявку (в статусе DRAFT)
   */
  createMaterialRequest: async (data: CreateMaterialRequestData) => {
    const response = await axios.post('/material-requests/', data)
    return response.data
  },

  /**
   * Обновить заявку (только в статусе DRAFT)
   */
  updateMaterialRequest: async (id: number, data: UpdateMaterialRequestData) => {
    const response = await axios.patch(`/material-requests/${id}/`, data)
    return response.data
  },

  /**
   * Удалить заявку (soft delete)
   */
  deleteMaterialRequest: async (id: number) => {
    await axios.delete(`/material-requests/${id}/`)
  },

  /**
   * Отправить заявку на согласование
   */
  submitForApproval: async (id: number) => {
    const response = await axios.post(`/material-requests/${id}/submit/`)
    return response.data
  },

  /**
   * Согласовать заявку (для текущего согласующего)
   */
  approve: async (id: number) => {
    const response = await axios.post(`/material-requests/${id}/approve/`)
    return response.data
  },

  /**
   * Отклонить заявку (для текущего согласующего)
   */
  reject: async (id: number, data: ApprovalDecisionData) => {
    const response = await axios.post(`/material-requests/${id}/reject/`, data)
    return response.data
  },

  /**
   * Взять заявку в работу (Завсклад)
   */
  takeToWork: async (id: number) => {
    const response = await axios.post(`/material-requests/${id}/take-to-work/`)
    return response.data
  },

  /**
   * Перевести заявку в статус "На оплате" (Снабжение)
   */
  moveToPayment: async (id: number) => {
    const response = await axios.post(`/material-requests/${id}/mark-payment/`)
    return response.data
  },

  /**
   * Перевести заявку в статус "На доставке" (Снабжение после оплаты)
   */
  moveToDelivery: async (id: number) => {
    const response = await axios.post(`/material-requests/${id}/mark-paid/`)
    return response.data
  },

  /**
   * Обновить фактическое количество доставленного материала
   */
  updateActualQuantity: async (id: number, data: UpdateActualQuantityData) => {
    const response = await axios.post(`/material-requests/${id}/update-actual-quantity/`, data)
    return response.data
  },

  /**
   * Завершить заявку (когда все материалы доставлены)
   */
  complete: async (id: number) => {
    const response = await axios.post(`/material-requests/${id}/mark-received/`)
    return response.data
  },

  /**
   * Получить заявки на согласовании у текущего пользователя
   */
  getMyApprovals: async () => {
    const response = await axios.get('/material-requests/my_approvals/')
    return response.data
  },

  /**
   * Получить заявки, созданные текущим пользователем
   */
  getMyRequests: async () => {
    const response = await axios.get('/material-requests/my_requests/')
    return response.data
  },

  /**
   * Получить статистику по заявкам
   */
  getStats: async () => {
    const response = await axios.get<MaterialRequestStats>('/material-requests/stats/')
    return response.data
  },

  /**
   * Экспорт заявки в Excel
   */
  exportToExcel: async (id: number) => {
    const response = await axios.get(`/material-requests/${id}/export_excel/`, {
      responseType: 'blob',
    })
    return response.data
  },

  /**
   * Экспорт заявки в PDF
   */
  exportToPdf: async (id: number) => {
    const response = await axios.get(`/material-requests/${id}/export_pdf/`, {
      responseType: 'blob',
    })
    return response.data
  },
}
