import { create } from 'zustand'
import { authAPI } from '../api/auth'
import { settingsAPI } from '../api/settings'

interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: string
  avatar?: string
  is_superuser?: boolean
  approved?: boolean
  company?: number  // ID компании пользователя
  company_name?: string  // Название компании заказчика (для сотрудников ИТР и Руководства)
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  allowedPages: string[]  // Список страниц, доступных пользователю
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  updateUser: (user: User) => void
  loadAllowedPages: () => Promise<void>  // Загрузка разрешенных страниц
  hasPageAccess: (page: string) => boolean  // Проверка доступа к странице
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  allowedPages: [],

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      // Токены автоматически устанавливаются в HttpOnly cookies сервером
      const response = await authAPI.login({ email, password })

      // Получаем данные пользователя из ответа (токены в cookie, user в response.data)
      set({ user: response.user, isAuthenticated: true, isLoading: false })

      // Загружаем разрешенные страницы после логина
      await get().loadAllowedPages()
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: async () => {
    try {
      // Вызываем logout endpoint для удаления cookies на сервере
      await authAPI.logout()
    } catch (error) {
      console.error('Ошибка при logout:', error)
    } finally {
      // В любом случае очищаем локальное состояние
      set({ user: null, isAuthenticated: false, allowedPages: [] })
    }
  },

  checkAuth: async () => {
    try {
      // Токен автоматически передаётся через HttpOnly cookie
      const user = await authAPI.getCurrentUser()
      set({ user, isAuthenticated: true, isLoading: false })

      // Загружаем разрешенные страницы после проверки auth
      await get().loadAllowedPages()
    } catch (error) {
      // Если токен невалиден или отсутствует, пользователь не авторизован
      set({ user: null, isAuthenticated: false, isLoading: false, allowedPages: [] })
    }
  },

  loadAllowedPages: async () => {
    try {
      // Используем новый унифицированный ButtonAccess API
      const { buttonAccessAPI } = await import('../api/buttonAccess')
      const response = await buttonAccessAPI.getPageAccess()
      set({ allowedPages: response.accessible_pages })
    } catch (error) {
      console.error('Ошибка при загрузке разрешенных страниц:', error)
      set({ allowedPages: [] })

      // Fallback на старый endpoint для обратной совместимости
      try {
        const response = await settingsAPI.getMyPages()
        set({ allowedPages: response.pages })
      } catch (fallbackError) {
        console.error('Ошибка fallback загрузки страниц:', fallbackError)
      }
    }
  },

  hasPageAccess: (page: string) => {
    const state = get()

    // SUPERADMIN имеет доступ ко всему
    if (state.user?.is_superuser || state.user?.role === 'SUPERADMIN') {
      return true
    }

    // Проверяем наличие страницы в списке разрешенных
    return state.allowedPages.includes(page)
  },

  updateUser: (user) => {
    set({ user })
  },
}))
