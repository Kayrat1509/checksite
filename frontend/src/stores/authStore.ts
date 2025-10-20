import { create } from 'zustand'
import { authAPI } from '../api/auth'

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
  company_name?: string  // Название компании заказчика (для сотрудников ИТР и Руководства)
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  updateUser: (user: User) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const { access, refresh } = await authAPI.login({ email, password })
      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)

      const user = await authAPI.getCurrentUser()
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null, isAuthenticated: false })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      set({ isAuthenticated: false, user: null, isLoading: false })
      return
    }

    try {
      const user = await authAPI.getCurrentUser()
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (error) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  updateUser: (user) => {
    set({ user })
  },
}))
