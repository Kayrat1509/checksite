import axiosInstance from './axios'

/**
 * Типы для API управления доступом
 */

// Информация о пользователе с доступами
export interface UserAccess {
  id: number
  full_name: string
  email: string
  role: string
  role_display: string
  role_category: string
  has_full_access: boolean
  is_company_owner: boolean
  is_active: boolean
  allowed_pages: string[]
}

// Шаблон роли
export interface RoleTemplate {
  id: number
  company: number
  company_name: string
  name: string
  role: string
  role_display: string
  description: string
  allowed_pages: string[]
  is_default: boolean
  pages_count: number
  created_at: string
  updated_at: string
}

// Информация о странице
export interface PageInfo {
  slug: string
  name: string
}

// Информация о роли
export interface RoleInfo {
  slug: string
  name: string
}

/**
 * API для управления доступом пользователей к страницам
 */
export const accessManagementAPI = {
  /**
   * Получить список пользователей компании с их доступами
   * GET /api/settings/access-management/users-access/
   */
  getUsersAccess: async (): Promise<UserAccess[]> => {
    const response = await axiosInstance.get('/settings/access-management/users-access/')
    return response.data
  },

  /**
   * Обновить доступ пользователя к страницам
   * POST /api/settings/access-management/update-user-access/
   */
  updateUserAccess: async (userId: number, allowedPages: string[]): Promise<any> => {
    const response = await axiosInstance.post('/settings/access-management/update-user-access/', {
      user_id: userId,
      allowed_pages: allowedPages,
    })
    return response.data
  },

  /**
   * Получить список всех доступных страниц системы
   * GET /api/settings/access-management/available-pages/
   */
  getAvailablePages: async (): Promise<PageInfo[]> => {
    const response = await axiosInstance.get('/settings/access-management/available-pages/')
    return response.data.pages
  },

  /**
   * Получить список всех доступных ролей
   * GET /api/settings/access-management/available-roles/
   */
  getAvailableRoles: async (): Promise<RoleInfo[]> => {
    const response = await axiosInstance.get('/settings/access-management/available-roles/')
    return response.data.roles
  },
}

/**
 * API для работы с шаблонами ролей
 */
export const roleTemplatesAPI = {
  /**
   * Получить список шаблонов ролей компании
   * GET /api/settings/role-templates/
   */
  getRoleTemplates: async (): Promise<RoleTemplate[]> => {
    const response = await axiosInstance.get('/settings/role-templates/')
    return response.data
  },

  /**
   * Создать новый шаблон роли
   * POST /api/settings/role-templates/
   */
  createRoleTemplate: async (data: Partial<RoleTemplate>): Promise<RoleTemplate> => {
    const response = await axiosInstance.post('/settings/role-templates/', data)
    return response.data
  },

  /**
   * Обновить шаблон роли
   * PUT /api/settings/role-templates/{id}/
   */
  updateRoleTemplate: async (id: number, data: Partial<RoleTemplate>): Promise<RoleTemplate> => {
    const response = await axiosInstance.put(`/settings/role-templates/${id}/`, data)
    return response.data
  },

  /**
   * Удалить шаблон роли
   * DELETE /api/settings/role-templates/{id}/
   */
  deleteRoleTemplate: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/settings/role-templates/${id}/`)
  },

  /**
   * Применить шаблон к пользователю
   * POST /api/settings/role-templates/{id}/apply-to-user/
   */
  applyTemplateToUser: async (templateId: number, userId: number): Promise<any> => {
    const response = await axiosInstance.post(
      `/settings/role-templates/${templateId}/apply-to-user/`,
      { user_id: userId }
    )
    return response.data
  },

  /**
   * Получить шаблоны для конкретной роли
   * GET /api/settings/role-templates/for-role/{role}/
   */
  getTemplatesForRole: async (role: string): Promise<RoleTemplate[]> => {
    const response = await axiosInstance.get(`/settings/role-templates/for-role/${role}/`)
    return response.data
  },
}
