import axios from './axios'

// ===== ТИПЫ =====

export interface ApprovalRole {
  value: string
  label: string
}

export interface ApprovalStep {
  id?: number
  flow_template?: number
  role: string
  role_display?: string
  order: number
  skip_if_empty: boolean
  is_mandatory: boolean
  description: string
  created_at?: string
}

export interface ApprovalFlowTemplate {
  id?: number
  company: number
  company_name?: string
  name: string
  description: string
  is_active: boolean
  steps?: ApprovalStep[]
  steps_count?: number
  created_by?: number
  created_by_data?: any
  created_at?: string
  updated_at?: string
}

export interface MaterialRequestApproval {
  id: number
  material_request: number
  material_request_number?: string
  step: number
  step_data?: ApprovalStep
  approver?: number
  approver_data?: any
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED'
  status_display?: string
  comment?: string
  approved_at?: string
  created_at?: string
  updated_at?: string
}

// ========== УДАЛЕНО: CompanyApprovalSettings ==========
// ПРИЧИНА: Старая логика доступа, заменена на ButtonAccess
// export interface CompanyApprovalSettings { ... }
// ========== КОНЕЦ УДАЛЕННОГО КОДА ==========

export interface ApprovalActionRequest {
  comment?: string
}

// ===== API МЕТОДЫ =====

export const approvalFlowsAPI = {
  // ========== APPROVAL FLOW TEMPLATES ==========

  // Получить список шаблонов цепочек компании
  getFlowTemplates: async () => {
    const response = await axios.get('/approval-flows/')
    return response.data
  },

  // Получить детали шаблона цепочки
  getFlowTemplate: async (id: number) => {
    const response = await axios.get(`/approval-flows/${id}/`)
    return response.data
  },

  // Получить активный шаблон цепочки для компании
  getActiveFlow: async (companyId?: number) => {
    const params = companyId ? { company_id: companyId } : {}
    const response = await axios.get('/approval-flows/active/', { params })
    return response.data
  },

  // Создать новый шаблон цепочки
  createFlowTemplate: async (data: Partial<ApprovalFlowTemplate>) => {
    const response = await axios.post('/approval-flows/', data)
    return response.data
  },

  // Обновить шаблон цепочки
  updateFlowTemplate: async (id: number, data: Partial<ApprovalFlowTemplate>) => {
    const response = await axios.patch(`/approval-flows/${id}/`, data)
    return response.data
  },

  // Удалить шаблон цепочки
  deleteFlowTemplate: async (id: number) => {
    await axios.delete(`/approval-flows/${id}/`)
  },

  // Активировать шаблон цепочки
  activateFlow: async (id: number) => {
    const response = await axios.post(`/approval-flows/${id}/activate/`)
    return response.data
  },

  // ========== APPROVAL STEPS ==========

  // Получить список этапов
  getSteps: async (flowTemplateId?: number) => {
    const params = flowTemplateId ? { flow_template: flowTemplateId } : {}
    const response = await axios.get('/approval-steps/', { params })
    return response.data
  },

  // Получить детали этапа
  getStep: async (id: number) => {
    const response = await axios.get(`/approval-steps/${id}/`)
    return response.data
  },

  // Создать этап
  createStep: async (data: Partial<ApprovalStep>) => {
    const response = await axios.post('/approval-steps/', data)
    return response.data
  },

  // Обновить этап
  updateStep: async (id: number, data: Partial<ApprovalStep>) => {
    const response = await axios.patch(`/approval-steps/${id}/`, data)
    return response.data
  },

  // Удалить этап
  deleteStep: async (id: number) => {
    await axios.delete(`/approval-steps/${id}/`)
  },

  // ========== MATERIAL REQUEST APPROVALS ==========

  // Получить список согласований
  getApprovals: async (materialRequestId?: number) => {
    const params = materialRequestId ? { material_request: materialRequestId } : {}
    const response = await axios.get('/material-request-approvals/', { params })
    return response.data
  },

  // Получить мои ожидающие согласования
  getMyPendingApprovals: async () => {
    const response = await axios.get('/material-request-approvals/my-pending/')
    return response.data
  },

  // Получить детали согласования
  getApproval: async (id: number) => {
    const response = await axios.get(`/material-request-approvals/${id}/`)
    return response.data
  },

  // Согласовать этап
  approveStep: async (id: number, data: ApprovalActionRequest) => {
    const response = await axios.post(`/material-request-approvals/${id}/approve/`, data)
    return response.data
  },

  // Отклонить заявку
  rejectRequest: async (id: number, data: ApprovalActionRequest) => {
    const response = await axios.post(`/material-request-approvals/${id}/reject/`, data)
    return response.data
  },

  // ========== УДАЛЕНО: COMPANY APPROVAL SETTINGS ==========
  // ПРИЧИНА: Старая логика доступа через can_manage_approval_flow
  // ЗАМЕНЕНО НА: ButtonAccess - доступ проверяется через /admin/core/buttonaccess/
  //
  // getCompanySettings() - УДАЛЕНО
  // getMyCompanySettings() - УДАЛЕНО
  // getCompanySettingsById() - УДАЛЕНО
  // updateCompanySettings() - УДАЛЕНО
  // ========== КОНЕЦ УДАЛЕННОГО КОДА ==========

  // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

  // Получить цепочку согласования для конкретной заявки
  getMaterialRequestApprovals: async (materialRequestId: number) => {
    const response = await axios.get(`/material-requests/${materialRequestId}/approvals/`)
    return response.data
  },

  // Согласовать текущий этап заявки
  approveMaterialRequest: async (materialRequestId: number, data: ApprovalActionRequest) => {
    const response = await axios.post(`/material-requests/${materialRequestId}/approve/`, data)
    return response.data
  },

  // Отклонить заявку
  rejectMaterialRequest: async (materialRequestId: number, data: ApprovalActionRequest) => {
    const response = await axios.post(`/material-requests/${materialRequestId}/reject/`, data)
    return response.data
  },
}

// ===== КОНСТАНТЫ =====

// Доступные роли для согласования (обновлено: добавлены роли энергетиков)
export const APPROVAL_ROLES: ApprovalRole[] = [
  { value: 'DIRECTOR', label: 'Директор' },
  { value: 'CHIEF_ENGINEER', label: 'Главный инженер' },
  { value: 'PROJECT_MANAGER', label: 'Руководитель проекта' },
  { value: 'CHIEF_POWER_ENGINEER', label: 'Главный энергетик' },  // Новая роль
  { value: 'ENGINEER', label: 'Инженер ПТО' },
  { value: 'SITE_MANAGER', label: 'Начальник участка' },
  { value: 'FOREMAN', label: 'Прораб' },
  { value: 'POWER_ENGINEER', label: 'Энергетик' },  // Новая роль
  { value: 'SUPPLY_MANAGER', label: 'Снабженец' },
  { value: 'WAREHOUSE_HEAD', label: 'Завсклад центрального склада' },
  { value: 'SITE_WAREHOUSE_MANAGER', label: 'Завсклад объекта' },
]

// Статусы согласования
export const APPROVAL_STATUSES = {
  PENDING: { label: 'Ожидает согласования', color: 'orange' },
  APPROVED: { label: 'Согласовано', color: 'green' },
  REJECTED: { label: 'Отклонено', color: 'red' },
  SKIPPED: { label: 'Пропущено', color: 'gray' },
}
