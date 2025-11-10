import axios from 'axios'

// Используем относительный путь для автоматического использования протокола страницы (http/https)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// FIXED infinite reload: Используем sessionStorage для надежного флага между перезагрузками
const REDIRECT_FLAG_KEY = 'is_redirecting_to_login'

// FIXED infinite loop: Функция для проверки флага редиректа (сохраняется между HMR)
const isRedirecting = () => sessionStorage.getItem(REDIRECT_FLAG_KEY) === 'true'
const setRedirecting = () => sessionStorage.setItem(REDIRECT_FLAG_KEY, 'true')

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // ВАЖНО: для автоматической отправки HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - токен автоматически в HttpOnly cookie, header не нужен
axiosInstance.interceptors.request.use(
  (config) => {
    // FIXED infinite loop: Блокируем все запросы если уже начался редирект
    // НО разрешаем login endpoint (чтобы можно было залогиниться)
    const isLoginRequest = config.url?.includes('/auth/token/') && !config.url?.includes('/refresh/')

    if (isRedirecting() && !isLoginRequest) {
      return Promise.reject(new Error('Redirecting to login...'))
    }

    // Токены передаются автоматически через cookies (withCredentials: true)
    // Authorization header больше не используется для безопасности
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh через cookies
axiosInstance.interceptors.response.use(
  (response) => {
    // FIXED: Очищаем флаг редиректа после успешного логина
    if (response.config.url?.includes('/auth/token/') && !response.config.url?.includes('/refresh/')) {
      sessionStorage.removeItem(REDIRECT_FLAG_KEY)
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // FIXED infinite loop: Если уже начали редирект, блокируем все дальнейшие обработки
    if (isRedirecting()) {
      return Promise.reject(error)
    }

    // Обработка 401 ошибки (неавторизован)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // НЕ пытаемся refresh если это уже был refresh endpoint
      if (originalRequest.url?.includes('/auth/token/refresh/')) {
        setRedirecting()

        // Очищаем localStorage
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')

        setTimeout(() => {
          window.location.href = '/login'
        }, 100)

        return Promise.reject(error)
      }

      originalRequest._retry = true

      try {
        // Попытка обновить токен через cookie-based endpoint
        // refresh_token автоматически передаётся в cookie
        await axios.post(
          `${API_BASE_URL}/auth/token/refresh/`,
          {}, // Пустое тело, токен в cookie
          { withCredentials: true } // Важно для передачи cookies
        )

        // Токен обновлён в cookie, повторяем оригинальный запрос
        return axiosInstance(originalRequest)
      } catch (refreshError: any) {
        // FIXED infinite loop: Если refresh вернул 401/429, блокируем и редиректим
        setRedirecting()

        // Очищаем старые токены из localStorage
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')

        // Немедленный редирект без задержки
        setTimeout(() => {
          window.location.href = '/login'
        }, 100)

        return Promise.reject(refreshError)
      }
    }

    // Обработка 429 Too Many Requests - немедленный редирект
    if (error.response?.status === 429) {
      if (!isRedirecting()) {
        setRedirecting()

        // Очищаем localStorage
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')

        setTimeout(() => {
          window.location.href = '/login'
        }, 100)
      }
      return Promise.reject(error)
    }

    return Promise.reject(error)
  }
)

export default axiosInstance
