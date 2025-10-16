import axios from './axios'

export interface TechnicalCondition {
  id: number
  file: string
  file_url: string
  received_from: string
  description: string
  created_by: number
  created_by_name: string
  created_by_data: {
    id: number
    email: string
    full_name: string
    role: string
  }
  created_at: string
  updated_at: string
}

export interface CreateTechnicalConditionData {
  file: File
  received_from: string
  description?: string
}

export interface UpdateTechnicalConditionData {
  file?: File
  received_from?: string
  description?: string
}

export const technicalConditionsAPI = {
  // Получить список всех техусловий
  getTechnicalConditions: async (): Promise<TechnicalCondition[]> => {
    const response = await axios.get('/technical-conditions/')
    return response.data
  },

  // Получить одно техусловие по ID
  getTechnicalCondition: async (id: number): Promise<TechnicalCondition> => {
    const response = await axios.get(`/technical-conditions/${id}/`)
    return response.data
  },

  // Создать новое техусловие
  createTechnicalCondition: async (data: CreateTechnicalConditionData): Promise<TechnicalCondition> => {
    const formData = new FormData()
    formData.append('file', data.file)
    formData.append('received_from', data.received_from)
    if (data.description) {
      formData.append('description', data.description)
    }

    const response = await axios.post('/technical-conditions/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Обновить техусловие
  updateTechnicalCondition: async (id: number, data: UpdateTechnicalConditionData): Promise<TechnicalCondition> => {
    const formData = new FormData()

    if (data.file) {
      formData.append('file', data.file)
    }
    if (data.received_from) {
      formData.append('received_from', data.received_from)
    }
    if (data.description !== undefined) {
      formData.append('description', data.description)
    }

    const response = await axios.patch(`/technical-conditions/${id}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Удалить техусловие
  deleteTechnicalCondition: async (id: number): Promise<void> => {
    await axios.delete(`/technical-conditions/${id}/`)
  },
}
