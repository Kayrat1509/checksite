import axios from './axios'

// Интерфейсы
export interface MaterialRequestItem {
  id?: number
  request?: number  // ID заявки
  request_number?: string  // Номер заявки (для Склада)
  project_id?: number  // ID проекта (для Склада)
  project_name?: string  // Название проекта (для Склада)
  material_name: string
  quantity: number  // Количество по заявке
  actual_quantity?: number | null  // Количество по факту (фактически получено)
  issued_quantity?: number | null  // Количество выданное со склада
  issued_by?: number | null  // ID пользователя, который изменил issued_quantity
  issued_by_data?: {
    id: number
    full_name: string
    role: string
  }
  unit: string
  specifications?: string
  order: number
  status?: string
  status_display?: string
  approval_status?: string
  approval_status_display?: string
  availability_status?: string
  availability_status_display?: string
  item_status?: string
  item_status_display?: string
  available_quantity?: number
  cancellation_reason?: string
  cancelled_by?: number
  cancelled_by_data?: {
    id: number
    full_name: string
  }
  cancelled_at?: string
  previous_item_status?: string  // Статус позиции до отмены (для восстановления)
  created_at?: string
  warehouse_receipt_date?: string  // Дата поступления на склад (для Склада)
  warehouse_receipt_id?: number  // ID записи склада (для Склада)
}

export interface MaterialRequest {
  id: number
  request_number: string
  project: number
  project_data?: {
    id: number
    name: string
  }
  author_data?: {
    id: number
    full_name: string
  }
  responsible_data?: {
    id: number
    full_name: string
    role: string
  }
  status: string
  status_display: string
  first_material?: {
    material_name: string
    quantity: string
    unit: string
  }
  items_count: number
  items?: MaterialRequestItem[]  // Добавляем массив всех материалов
  current_step?: number  // Текущий этап согласования (порядковый номер)
  created_at: string
  updated_at: string
}

export interface CreateMaterialRequestData {
  project: number
  drawing_reference?: string
  work_type?: string
  notes?: string
  items: MaterialRequestItem[]
}

// API методы
export const materialRequestsAPI = {
  // Получить список заявок
  getMaterialRequests: async (params?: any) => {
    const response = await axios.get('/material-requests/', { params })
    return response.data
  },

  // Получить одну заявку
  getMaterialRequest: async (id: number) => {
    const response = await axios.get(`/material-requests/${id}/`)
    return response.data
  },

  // Создать заявку
  createMaterialRequest: async (data: CreateMaterialRequestData) => {
    const response = await axios.post('/material-requests/', data)
    return response.data
  },

  // Обновить заявку
  updateMaterialRequest: async (id: number, data: Partial<CreateMaterialRequestData>) => {
    const response = await axios.patch(`/material-requests/${id}/`, data)
    return response.data
  },

  // Удалить заявку
  deleteMaterialRequest: async (id: number) => {
    await axios.delete(`/material-requests/${id}/`)
  },

  // Изменить статус
  changeStatus: async (id: number, data: { new_status: string; comment?: string }) => {
    const response = await axios.patch(`/material-requests/${id}/change_status/`, data)
    return response.data
  },

  // Загрузить документ
  uploadDocument: async (id: number, data: FormData) => {
    const response = await axios.post(`/material-requests/${id}/upload/`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Добавить комментарий
  addComment: async (id: number, data: { text: string }) => {
    const response = await axios.post(`/material-requests/${id}/add_comment/`, data)
    return response.data
  },

  // Добавить материал
  addItem: async (id: number, data: MaterialRequestItem) => {
    const response = await axios.post(`/material-requests/${id}/add_item/`, data)
    return response.data
  },

  // Отменить позицию материала
  cancelItem: async (itemId: number, cancellation_reason?: string) => {
    const response = await axios.patch(`/material-request-items/${itemId}/cancel_item/`, {
      cancellation_reason: cancellation_reason || 'Отменено'
    })
    return response.data
  },

  // Восстановить отмененную позицию материала
  restoreItem: async (itemId: number) => {
    const response = await axios.patch(`/material-request-items/${itemId}/restore_item/`)
    return response.data
  },

  // Экспортировать заявку в Excel
  exportExcel: async (id: number) => {
    const response = await axios.get(`/material-requests/${id}/export_excel/`, {
      responseType: 'blob', // Важно для получения файла
    })
    return response.data
  },

  // Согласовать/отклонить/отправить на доработку позицию материала (для Директора)
  approveItem: async (itemId: number, approval_status: 'APPROVED' | 'REJECTED' | 'REWORK') => {
    const response = await axios.patch(`/material-request-items/${itemId}/approve_item/`, {
      approval_status
    })
    return response.data
  },

  // Обновить статус наличия материала на складе (для Зав.центрскладом)
  updateAvailability: async (itemId: number, availability_status: 'IN_STOCK' | 'PARTIALLY_IN_STOCK' | 'OUT_OF_STOCK', available_quantity?: number) => {
    const response = await axios.patch(`/material-request-items/${itemId}/update_availability/`, {
      availability_status,
      available_quantity
    })
    return response.data
  },

  // Изменить статус отдельной позиции материала
  changeItemStatus: async (itemId: number, data: { new_status: string; comment?: string }) => {
    const response = await axios.patch(`/material-request-items/${itemId}/change_item_status/`, data)
    return response.data
  },

  // Обновить позицию материала (название, количество, единицу измерения, примечания)
  updateItem: async (itemId: number, data: Partial<MaterialRequestItem>) => {
    const response = await axios.patch(`/material-request-items/${itemId}/`, data)
    return response.data
  },

  // Зафиксировать фактическое количество (создает запись на складе и обновляет actual_quantity)
  recordActualQuantity: async (itemId: number, data: {
    actual_quantity: number
    receipt_date?: string
    waybill_number?: string
    supplier?: string
    quality_status?: 'GOOD' | 'DAMAGED' | 'DEFECTIVE' | 'PARTIAL'
    notes?: string
  }) => {
    const response = await axios.patch(`/material-request-items/${itemId}/record_actual_quantity/`, data)
    return response.data
  },

  // Обновить фактическое количество (НОВАЯ УПРОЩЕННАЯ ЛОГИКА)
  // Используется на вкладке "На доставке" для ИТР на объекте
  // Если actual_quantity >= quantity И item_status == DELIVERY → автоматически переходит в COMPLETED
  updateActualQuantity: async (itemId: number, data: {
    actual_quantity: number
  }): Promise<MaterialRequestItem & { auto_completed?: boolean }> => {
    const response = await axios.patch(`/material-request-items/${itemId}/update_actual_quantity/`, data)
    return response.data
  },

  // Получить материалы с заполненным actual_quantity (для страницы Склад)
  getMaterialItemsWithActualQuantity: async (params?: {
    request__project?: number  // Фильтр по проекту
    has_actual_quantity?: boolean  // Фильтр по наличию actual_quantity
  }) => {
    const response = await axios.get('/material-request-items/', { params })
    return response.data
  },
}
