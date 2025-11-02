/**
 * API методы для работы с матрицей доступа к кнопкам.
 */

import apiClient from './axios'

/**
 * Интерфейс для кнопки (минимальный набор данных)
 */
export interface ButtonAccess {
  button_key: string
  button_name: string
  description: string
}

/**
 * Интерфейс для полной информации о кнопке
 */
export interface ButtonAccessFull {
  id: number
  page: string
  button_key: string
  button_name: string
  description: string
  default_access: boolean
  accessible_roles: string[]
  created_at: string
  updated_at: string
}

/**
 * Тип для объекта со всеми страницами и их кнопками
 */
export type AllPagesButtons = {
  [page: string]: ButtonAccess[]
}

/**
 * API для работы с матрицей доступа к кнопкам
 */
export const buttonAccessAPI = {
  /**
   * Получить список всех кнопок (для администраторов)
   * @param page - опциональный фильтр по странице
   */
  getAll: async (page?: string): Promise<ButtonAccessFull[]> => {
    const params = page ? { page } : {}
    const response = await apiClient.get<ButtonAccessFull[]>('/button-access/', { params })
    return response.data
  },

  /**
   * Получить информацию о конкретной кнопке по ID
   * @param id - ID кнопки
   */
  getById: async (id: number): Promise<ButtonAccessFull> => {
    const response = await apiClient.get<ButtonAccessFull>(`/button-access/${id}/`)
    return response.data
  },

  /**
   * Получить доступные кнопки для текущего пользователя на конкретной странице
   * @param page - название страницы (projects, users, contractors и т.д.)
   * @returns Массив кнопок, доступных текущему пользователю
   *
   * @example
   * const buttons = await buttonAccessAPI.getByPage('projects')
   * // buttons = [
   * //   { button_key: 'create', button_name: 'Создать проект', description: '...' },
   * //   { button_key: 'edit', button_name: 'Редактировать', description: '...' }
   * // ]
   */
  getByPage: async (page: string): Promise<ButtonAccess[]> => {
    const response = await apiClient.get<ButtonAccess[]>(
      '/button-access/by_page/',
      { params: { page } }
    )
    return response.data
  },

  /**
   * Получить все доступные кнопки для текущего пользователя на всех страницах
   * @returns Объект с ключами-страницами и значениями-массивами кнопок
   *
   * @example
   * const allButtons = await buttonAccessAPI.getAllPages()
   * // allButtons = {
   * //   projects: [{ button_key: 'create', ... }, { button_key: 'edit', ... }],
   * //   users: [{ button_key: 'create', ... }],
   * //   ...
   * }
   */
  getAllPages: async (): Promise<AllPagesButtons> => {
    const response = await apiClient.get<AllPagesButtons>('/button-access/all_pages/')
    return response.data
  },
}

export default buttonAccessAPI
