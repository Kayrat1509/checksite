import axios from 'axios'

// Базовый URL для публичного API
const PUBLIC_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api'

// Создаем отдельный axios instance для публичного API
const publicApi = axios.create({
  baseURL: PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Интерфейсы для типизации данных публичных тендеров

// Публичный тендер (только для чтения)
export interface PublicTender {
  id: number
  title: string
  description: string
  tender_type: 'MATERIALS' | 'WORKS' | 'EQUIPMENT' | 'SERVICES'
  company_name: string
  city: string
  project_name: string
  status: 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'CLOSED' | 'CANCELLED'
  budget: string | null
  execution_period: string
  start_date: string | null
  end_date: string | null
  project_manager_name: string
  project_manager_phone: string
  project_manager_email: string
  created_at: string
}

// Данные для регистрации
export interface RegistrationData {
  company_name: string
  contact_person: string
  email: string
  phone: string
  city: string
  password: string
  password_confirm: string
  comment?: string
}

// Данные для входа
export interface LoginData {
  email: string
  password: string
}

// Ответ на регистрацию
export interface RegistrationResponse {
  message: string
  access_id: number
}

// Ответ на вход
export interface LoginResponse {
  message: string
  access_id: number
  company_name: string
  email: string
}

// Статус заявки
export interface AccessStatus {
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  company_name: string
  email: string
  created_at: string
  approved_at: string | null
  rejection_reason: string | null
}

// Параметры фильтрации тендеров
export interface TenderFilters {
  tender_type?: string
  city?: string
  budget_min?: number
  budget_max?: number
  search?: string
  ordering?: string
  page?: number
  page_size?: number
}

// API функции для работы с публичными тендерами
export const publicTendersAPI = {
  // Регистрация для доступа к тендерам
  register: async (data: RegistrationData): Promise<RegistrationResponse> => {
    const response = await publicApi.post('/public-tenders/register/', data)
    // Сохраняем access_id в localStorage для проверки статуса
    if (response.data.access_id) {
      localStorage.setItem('public_access_id', response.data.access_id.toString())
    }
    return response.data
  },

  // Вход в систему (для одобренных пользователей)
  login: async (data: LoginData): Promise<LoginResponse> => {
    const response = await publicApi.post('/public-tenders/login/', data)
    // Сохраняем access_id в localStorage
    if (response.data.access_id) {
      localStorage.setItem('public_access_id', response.data.access_id.toString())
      localStorage.setItem('public_user_email', response.data.email)
      localStorage.setItem('public_user_company', response.data.company_name)
    }
    return response.data
  },

  // Выход из системы
  logout: () => {
    localStorage.removeItem('public_access_id')
    localStorage.removeItem('public_user_email')
    localStorage.removeItem('public_user_company')
  },

  // Проверка статуса заявки
  getStatus: async (): Promise<AccessStatus> => {
    const accessId = localStorage.getItem('public_access_id')
    if (!accessId) {
      throw new Error('Access ID not found')
    }
    const response = await publicApi.get(`/public-tenders/status/?access_id=${accessId}`)
    return response.data
  },

  // Получить список опубликованных тендеров (для одобренных пользователей)
  getList: async (filters?: TenderFilters) => {
    const accessId = localStorage.getItem('public_access_id')
    if (!accessId) {
      throw new Error('Access ID not found. Please login first.')
    }

    const params: any = {
      access_id: accessId,
      ...filters
    }

    const response = await publicApi.get<{
      count: number
      next: string | null
      previous: string | null
      results: PublicTender[]
    }>('/public-tenders/list/', { params })

    return response.data
  },

  // Получить детали одного тендера
  getDetail: async (id: number): Promise<PublicTender> => {
    const accessId = localStorage.getItem('public_access_id')
    if (!accessId) {
      throw new Error('Access ID not found. Please login first.')
    }

    const response = await publicApi.get(`/public-tenders/list/${id}/`, {
      params: { access_id: accessId }
    })
    return response.data
  },

  // Проверка, авторизован ли пользователь
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('public_access_id')
  },

  // Получить информацию о текущем пользователе
  getCurrentUser: () => {
    return {
      email: localStorage.getItem('public_user_email'),
      company: localStorage.getItem('public_user_company'),
      accessId: localStorage.getItem('public_access_id')
    }
  }
}
