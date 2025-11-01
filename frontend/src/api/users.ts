import axios from './axios'

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  middle_name?: string
  full_name: string
  role: string
  position?: string
  phone?: string
  company?: number
  company_name?: string
  is_active: boolean
  approved: boolean
  archived: boolean
  temp_password?: string
  user_projects?: Array<{ id: number; name: string }>
  created_at: string
  updated_at: string
}

export interface CreateUserData {
  email: string
  password: string
  password_confirm: string
  first_name: string
  last_name: string
  middle_name?: string
  role: string
  position?: string
  phone?: string
  company?: number
  project_ids?: number[]
}

export const usersAPI = {
  // Get all users
  getUsers: async () => {
    const response = await axios.get('/auth/users/')
    return response.data
  },

  // Get single user
  getUser: async (id: number) => {
    const response = await axios.get(`/auth/users/${id}/`)
    return response.data
  },

  // Create user
  createUser: async (data: CreateUserData) => {
    const response = await axios.post('/auth/users/', data)
    return response.data
  },

  // Update user
  updateUser: async (id: number, data: Partial<CreateUserData>) => {
    const response = await axios.patch(`/auth/users/${id}/`, data)
    return response.data
  },

  // Delete user
  deleteUser: async (id: number) => {
    await axios.delete(`/auth/users/${id}/`)
  },

  // Activate user
  activateUser: async (id: number) => {
    const response = await axios.post(`/auth/users/${id}/activate/`)
    return response.data
  },

  // Deactivate user
  deactivateUser: async (id: number) => {
    const response = await axios.post(`/auth/users/${id}/deactivate/`)
    return response.data
  },

  // Get user's projects
  getUserProjects: async (id: number) => {
    const response = await axios.get(`/auth/users/${id}/projects/`)
    return response.data
  },

  // Assign projects to user
  assignProjects: async (id: number, project_ids: number[]) => {
    const response = await axios.post(`/auth/users/${id}/assign_projects/`, { project_ids })
    return response.data
  },

  // Archive contractor
  archiveUser: async (id: number) => {
    const response = await axios.post(`/auth/users/${id}/archive/`)
    return response.data
  },

  // Unarchive contractor
  unarchiveUser: async (id: number) => {
    const response = await axios.post(`/auth/users/${id}/unarchive/`)
    return response.data
  },

  // Export users template
  exportTemplate: async () => {
    const response = await axios.get('/auth/users/export-template/', {
      responseType: 'blob'
    })
    return response.data
  },

  // Export all users
  exportUsers: async () => {
    const response = await axios.get('/auth/users/export/', {
      responseType: 'blob'
    })
    return response.data
  },

  // Import users from file
  importUsers: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await axios.post('/auth/users/import/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  // ===== НОВЫЕ МЕТОДЫ ДЛЯ PERSONNEL EXCEL V2 =====

  // Экспорт шаблона v2 для импорта персонала
  exportTemplateV2: async () => {
    const response = await axios.get('/auth/users/export-template-v2/', {
      responseType: 'blob'
    })
    return response.data
  },

  // Экспорт текущих пользователей в формате v2
  exportUsersV2: async () => {
    const response = await axios.get('/auth/users/export-v2/', {
      responseType: 'blob'
    })
    return response.data
  },

  // Экспорт backup с timestamp
  exportBackup: async () => {
    const response = await axios.get('/auth/users/export-backup/', {
      responseType: 'blob'
    })
    return response.data
  },

  // Импорт пользователей v2 с поддержкой режимов
  importUsersV2: async (file: File, mode: 'create' | 'update' = 'create') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mode', mode)

    const response = await axios.post('/auth/users/import-v2/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  // ===== МЕТОДЫ ДЛЯ CONTRACTORS EXCEL V2 =====

  // Экспорт шаблона v2 для импорта подрядчиков
  exportContractorsTemplateV2: async () => {
    const response = await axios.get('/auth/users/contractors/export-template-v2/', {
      responseType: 'blob'
    })
    return response.data
  },

  // Экспорт текущих подрядчиков в формате v2
  exportContractorsV2: async () => {
    const response = await axios.get('/auth/users/contractors/export-v2/', {
      responseType: 'blob'
    })
    return response.data
  },

  // Создание backup подрядчиков
  exportContractorsBackup: async () => {
    const response = await axios.get('/auth/users/contractors/export-backup/', {
      responseType: 'blob'
    })
    return response.data
  },

  // Импорт подрядчиков из Excel v2
  importContractorsV2: async (file: File, mode: 'create' | 'update' = 'create') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mode', mode)

    const response = await axios.post('/auth/users/contractors/import-v2/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  // ===== МЕТОДЫ ДЛЯ SUPERVISIONS (НАДЗОРЫ) EXCEL V2 =====

  // Экспорт шаблона v2 для импорта надзоров
  exportSupervisionsTemplateV2: async () => {
    const response = await axios.get('/auth/users/supervisions/export-template-v2/', {
      responseType: 'blob'
    })
    return response.data
  },

  // Экспорт текущих надзоров в формате v2
  exportSupervisionsV2: async () => {
    const response = await axios.get('/auth/users/supervisions/export-v2/', {
      responseType: 'blob'
    })
    return response.data
  },

  // Создание backup надзоров
  exportSupervisionsBackup: async () => {
    const response = await axios.get('/auth/users/supervisions/export-backup/', {
      responseType: 'blob'
    })
    return response.data
  },

  // Импорт надзоров из Excel v2
  importSupervisionsV2: async (file: File, mode: 'create' | 'update' = 'create') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mode', mode)

    const response = await axios.post('/auth/users/supervisions/import-v2/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  }
}
