import axios from './axios'

/**
 * API клиент для работы с задачами
 */

// Интерфейсы для задач
export interface Task {
  id: number
  task_number: string
  title: string
  description: string
  created_by: number
  created_by_name?: string
  assigned_to_user?: number | null
  assigned_to_user_name?: string | null // Имя назначенного сотрудника
  assigned_to_contractor?: number | null
  assigned_to_contractor_name?: string | null // Имя назначенного подрядчика
  assigned_to_name?: string // Объединённое имя (для обратной совместимости)
  deadline: string
  status: 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'REJECTED'
  rejection_reason?: string
  completed_at?: string | null
  rejected_at?: string | null
  company: number
  company_name?: string
  project?: number | null
  project_name?: string
  created_at: string
  updated_at: string
  is_deleted: boolean
}

export interface CreateTaskData {
  title: string
  description: string
  assigned_to_user?: number | null
  assigned_to_contractor?: number | null
  deadline: string
  project?: number | null
}

export interface UpdateTaskData {
  title?: string
  description?: string
  assigned_to_user?: number | null
  assigned_to_contractor?: number | null
  deadline?: string
  project?: number | null
}

export interface RejectTaskData {
  rejection_reason: string
}

export interface TaskStats {
  total: number
  in_progress: number
  completed: number
  overdue: number
  rejected: number
}

export interface TaskFilters {
  status?: 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'REJECTED'
  created_by?: number
  assigned_to_user?: number
  assigned_to_contractor?: number
  project?: number
  search?: string
  ordering?: string
}

export const tasksAPI = {
  /**
   * Получить список задач с фильтрацией
   */
  getTasks: async (params?: TaskFilters) => {
    const response = await axios.get('/tasks/', { params })
    return response.data
  },

  /**
   * Получить детали задачи
   */
  getTask: async (id: number) => {
    const response = await axios.get(`/tasks/${id}/`)
    return response.data
  },

  /**
   * Создать новую задачу
   * Отправляет email уведомление моментально
   */
  createTask: async (data: CreateTaskData) => {
    const response = await axios.post('/tasks/', data)
    return response.data
  },

  /**
   * Обновить задачу
   * Отправляет email при значительных изменениях
   */
  updateTask: async (id: number, data: UpdateTaskData) => {
    const response = await axios.patch(`/tasks/${id}/`, data)
    return response.data
  },

  /**
   * Удалить задачу (soft delete)
   */
  deleteTask: async (id: number) => {
    await axios.delete(`/tasks/${id}/`)
  },

  /**
   * Отметить задачу как выполненную
   */
  completeTask: async (id: number) => {
    const response = await axios.post(`/tasks/${id}/complete/`)
    return response.data
  },

  /**
   * Отменить задачу с указанием причины
   */
  rejectTask: async (id: number, data: RejectTaskData) => {
    const response = await axios.post(`/tasks/${id}/reject/`, data)
    return response.data
  },

  /**
   * Получить мои задачи (где я исполнитель)
   */
  getMyTasks: async () => {
    const response = await axios.get('/tasks/my/')
    return response.data
  },

  /**
   * Получить задачи, созданные мной
   */
  getCreatedTasks: async () => {
    const response = await axios.get('/tasks/created/')
    return response.data
  },

  /**
   * Получить статистику по задачам
   */
  getTaskStats: async () => {
    const response = await axios.get<TaskStats>('/tasks/stats/')
    return response.data
  },
}
