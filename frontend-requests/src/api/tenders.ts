import api from './axios'

// Интерфейсы для типизации данных тендеров
export interface Tender {
  id: number
  title: string
  description: string
  tender_type: 'MATERIALS' | 'WORKS' | 'EQUIPMENT' | 'SERVICES'
  company_name: string
  city: string
  project: number
  project_name?: string
  status: 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'CLOSED' | 'CANCELLED'
  start_date: string | null
  end_date: string | null
  budget: string | null
  execution_period: string
  created_by: number
  created_by_name?: string
  responsible: number | null
  responsible_name?: string
  winner: number | null
  winner_name?: string
  winning_amount: string | null
  created_at: string
  updated_at: string
}

export interface TenderDocument {
  id: number
  tender: number
  file: string
  file_name: string
  description: string
  uploaded_by: number
  uploaded_by_name?: string
  uploaded_at: string
}

export interface TenderBid {
  id: number
  tender: number
  participant: number
  participant_name?: string
  company_name: string
  amount: string
  comment: string
  submitted_at: string
  is_winner: boolean
}

export interface TenderCreateData {
  title: string
  description?: string
  tender_type: string
  company_name?: string
  city?: string
  project: number
  start_date?: string
  end_date?: string
  budget?: string
  execution_period?: string
  responsible?: number
}

export interface TenderUpdateData {
  title?: string
  description?: string
  tender_type?: string
  company_name?: string
  city?: string
  status?: string
  start_date?: string
  end_date?: string
  budget?: string
  execution_period?: string
  responsible?: number
}

// API функции для работы с тендерами
export const tendersAPI = {
  // Получить список всех тендеров
  getList: async (params?: {
    status?: string
    tender_type?: string
    project?: number
    search?: string
  }) => {
    const response = await api.get<Tender[]>('/tenders/', { params })
    return response.data
  },

  // Получить детальную информацию о тендере
  getDetail: async (id: number) => {
    const response = await api.get<Tender>(`/tenders/${id}/`)
    return response.data
  },

  // Создать новый тендер
  create: async (data: TenderCreateData) => {
    const response = await api.post<Tender>('/tenders/', data)
    return response.data
  },

  // Обновить тендер
  update: async (id: number, data: TenderUpdateData) => {
    const response = await api.patch<Tender>(`/tenders/${id}/`, data)
    return response.data
  },

  // Удалить тендер
  delete: async (id: number) => {
    await api.delete(`/tenders/${id}/`)
  },

  // Опубликовать тендер
  publish: async (id: number) => {
    const response = await api.post<Tender>(`/tenders/${id}/publish/`)
    return response.data
  },

  // Закрыть тендер
  close: async (id: number) => {
    const response = await api.post<Tender>(`/tenders/${id}/close/`)
    return response.data
  },

  // Отменить тендер
  cancel: async (id: number) => {
    const response = await api.post<Tender>(`/tenders/${id}/cancel/`)
    return response.data
  },

  // Выбрать победителя
  selectWinner: async (id: number, bidId: number) => {
    const response = await api.post<Tender>(`/tenders/${id}/select_winner/`, {
      bid_id: bidId
    })
    return response.data
  },

  // Получить документы тендера
  getDocuments: async (tenderId: number) => {
    const response = await api.get<TenderDocument[]>('/tender-documents/', {
      params: { tender: tenderId }
    })
    return response.data
  },

  // Загрузить документ
  uploadDocument: async (tenderId: number, file: File, description?: string) => {
    const formData = new FormData()
    formData.append('tender', tenderId.toString())
    formData.append('file', file)
    formData.append('file_name', file.name)
    if (description) {
      formData.append('description', description)
    }
    const response = await api.post<TenderDocument>('/tender-documents/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  // Удалить документ
  deleteDocument: async (id: number) => {
    await api.delete(`/tender-documents/${id}/`)
  },

  // Получить заявки на тендер
  getBids: async (tenderId: number) => {
    const response = await api.get<TenderBid[]>('/tender-bids/', {
      params: { tender: tenderId }
    })
    return response.data
  },

  // Создать заявку
  createBid: async (data: {
    tender: number
    participant: number
    company_name: string
    amount: string
    comment?: string
  }) => {
    const response = await api.post<TenderBid>('/tender-bids/', data)
    return response.data
  },

  // Обновить заявку
  updateBid: async (id: number, data: {
    company_name?: string
    amount?: string
    comment?: string
  }) => {
    const response = await api.patch<TenderBid>(`/tender-bids/${id}/`, data)
    return response.data
  },

  // Удалить заявку
  deleteBid: async (id: number) => {
    await api.delete(`/tender-bids/${id}/`)
  }
}
