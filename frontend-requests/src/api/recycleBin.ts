/**
 * API методы для работы с корзиной (Recycle Bin).
 */

import apiClient from './axios'

export interface RecycleBinItem {
  id: number
  model_name: 'Project' | 'User' | 'MaterialRequest' | 'Tender'
  model_verbose_name: string
  title: string
  deleted_at: string
  deleted_by: string
  deleted_by_id: number
  days_left: number
  expires_soon: boolean
  can_restore: boolean
  can_delete: boolean
}

export interface RecycleBinStats {
  total_items: number
  projects_count: number
  users_count: number
  material_requests_count: number
  tenders_count: number
  expires_soon_count: number
}

export interface RestoreRequest {
  model: 'Project' | 'User' | 'MaterialRequest' | 'Tender'
  id: number
}

export interface DeleteRequest {
  model: 'Project' | 'User' | 'MaterialRequest' | 'Tender'
  id: number
}

export interface CleanExpiredResponse {
  detail: string
  deleted_count: number
  details: Record<string, number>
}

/**
 * API для работы с корзиной
 */
export const recycleBinAPI = {
  /**
   * Получить список всех удаленных объектов
   * @param model - фильтр по типу модели (опционально)
   * @param expires_soon - фильтр по срочности (опционально)
   */
  getAll: async (params?: {
    model?: 'Project' | 'User' | 'MaterialRequest' | 'Tender'
    expires_soon?: boolean
  }): Promise<RecycleBinItem[]> => {
    const response = await apiClient.get<RecycleBinItem[]>('/recycle-bin/', { params })
    return response.data
  },

  /**
   * Получить статистику корзины
   */
  getStats: async (): Promise<RecycleBinStats> => {
    const response = await apiClient.get<RecycleBinStats>('/recycle-bin/stats/')
    return response.data
  },

  /**
   * Восстановить объект из корзины
   * @param data - объект с моделью и ID
   */
  restore: async (data: RestoreRequest): Promise<{ detail: string; object: any }> => {
    const response = await apiClient.post('/recycle-bin/restore/', data)
    return response.data
  },

  /**
   * Окончательно удалить объект из БД (доступно только SUPERADMIN и DIRECTOR)
   * @param data - объект с моделью и ID
   */
  permanentDelete: async (data: DeleteRequest): Promise<{ detail: string; object: any }> => {
    const response = await apiClient.delete('/recycle-bin/permanent-delete/', { data })
    return response.data
  },

  /**
   * Удалить все просроченные объекты (31+ дней) из корзины
   * Доступно только SUPERADMIN и DIRECTOR
   */
  cleanExpired: async (): Promise<CleanExpiredResponse> => {
    const response = await apiClient.post<CleanExpiredResponse>('/recycle-bin/clean-expired/')
    return response.data
  },
}

export default recycleBinAPI
