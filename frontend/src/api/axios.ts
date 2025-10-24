import axios from 'axios'

// Используем относительный путь для автоматического использования протокола страницы (http/https)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// FIXED infinite reload: Используем sessionStorage для надежного флага между перезагрузками
const REDIRECT_FLAG_KEY = 'is_redirecting_to_login'

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Обработка 401 ошибки (неавторизован)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken) {
          // Попытка обновить токен
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          })

          const { access } = response.data
          localStorage.setItem('access_token', access)

          // Повторяем оригинальный запрос с новым токеном
          originalRequest.headers.Authorization = `Bearer ${access}`
          return axiosInstance(originalRequest)
        }
      } catch (refreshError) {
        // FIXED infinite reload: Refresh токен невалиден - разлогиниваем пользователя
        // Защита от множественных редиректов с использованием sessionStorage
        const isAlreadyRedirecting = sessionStorage.getItem(REDIRECT_FLAG_KEY)

        if (!isAlreadyRedirecting) {
          sessionStorage.setItem(REDIRECT_FLAG_KEY, 'true')
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')

          // FIXED infinite reload: Используем отложенный редирект через таймаут
          // для завершения всех pending запросов
          setTimeout(() => {
            sessionStorage.removeItem(REDIRECT_FLAG_KEY)
            window.location.href = '/login'
          }, 200)
        }
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default axiosInstance
