import { create } from 'zustand'

interface Notification {
  id: number
  type: string
  title: string
  message: string
  link?: string
  is_read: boolean
  created_at: string
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  socket: WebSocket | null
  userId: number | null
  reconnectAttempts: number
  maxReconnectAttempts: number
  isReconnecting: boolean
  connectWebSocket: (userId: number) => void
  disconnectWebSocket: () => void
  addNotification: (notification: Notification) => void
  markAsRead: (id: number) => void
  markAllAsRead: () => void
  resetReconnectAttempts: () => void
}

// Определяем режим разработки
const isDevelopment = import.meta.env.DEV

// Функция для условного логирования (только в режиме разработки)
const wsLog = (message: string, ...args: any[]) => {
  if (isDevelopment) {
    console.log(`WebSocket: ${message}`, ...args)
  }
}

const wsWarn = (message: string, ...args: any[]) => {
  if (isDevelopment) {
    console.warn(`WebSocket: ${message}`, ...args)
  }
}

const wsError = (message: string, ...args: any[]) => {
  // Ошибки логируем всегда (даже в продакшене)
  console.error(`WebSocket: ${message}`, ...args)
}

// Автоматическое определение протокола WebSocket на основе протокола страницы
const getWebSocketUrl = (token: string) => {
  // Проверяем, запущен ли frontend на localhost
  const isLocalDevelopment =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.port === '5174' // Vite dev server

  // В режиме локальной разработки всегда используем localhost:8001
  if (isLocalDevelopment) {
    wsLog('режим локальной разработки')
    return `ws://localhost:8001/ws/notifications/?token=${token}`
  }

  // На продакшене используем текущий домен с автоматическим определением протокола
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  wsLog('режим продакшена')
  return `${protocol}//${window.location.host}/ws/notifications/?token=${token}`
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  socket: null,
  userId: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  isReconnecting: false,

  connectWebSocket: (userId) => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      wsWarn('отсутствует токен авторизации')
      return
    }

    const state = get()

    // Проверяем, не превышен ли лимит попыток переподключения
    if (state.reconnectAttempts >= state.maxReconnectAttempts) {
      wsWarn('превышен лимит попыток переподключения. Остановка.')
      return
    }

    // Если уже есть активное соединение И оно подключено, не создаем новое
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
      wsLog('уже подключен, пропускаем переподключение')
      return
    }

    // Закрываем старое соединение если оно есть (независимо от статуса)
    if (state.socket) {
      try {
        state.socket.close()
      } catch (e) {
        wsWarn('ошибка при закрытии старого соединения', e)
      }
      set({ socket: null })
    }

    // Сохраняем userId для использования при переподключении
    set({ userId })

    // Формируем полный URL с токеном
    const wsUrl = getWebSocketUrl(token)
    wsLog('подключение к', wsUrl)

    // Создаем нативное WebSocket подключение
    const socket = new WebSocket(wsUrl)

    // Обработчик успешного подключения
    socket.onopen = () => {
      wsLog('успешное подключение')
      // Сбрасываем счетчик попыток при успешном подключении
      set({ reconnectAttempts: 0, isReconnecting: false })
    }

    // Обработчик входящих сообщений
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        wsLog('получено сообщение', data)

        // Обрабатываем разные типы сообщений
        if (data.type === 'connection') {
          // Подтверждение подключения
          wsLog(data.message)
        } else if (data.type === 'notification' && data.data) {
          // Новое уведомление (backend отправляет в поле 'data', а не 'payload')
          get().addNotification(data.data)
        } else if (data.type === 'pong') {
          // Ответ на ping
          wsLog('pong получен')
        }
      } catch (error) {
        wsError('ошибка парсинга сообщения', error)
      }
    }

    // Обработчик ошибок
    socket.onerror = (error) => {
      wsError('ошибка подключения', error)
    }

    // Обработчик закрытия соединения
    socket.onclose = (event) => {
      wsLog('соединение закрыто', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      })

      const currentState = get()

      // Не переподключаемся если:
      // 1. Превышен лимит попыток
      // 2. Соединение закрыто нормально (код 1000)
      // 3. Нет токена авторизации
      if (
        currentState.reconnectAttempts >= currentState.maxReconnectAttempts ||
        event.code === 1000 ||
        !localStorage.getItem('access_token')
      ) {
        wsLog('переподключение не требуется')
        set({ isReconnecting: false })
        return
      }

      // Увеличиваем счетчик попыток
      set({
        reconnectAttempts: currentState.reconnectAttempts + 1,
        isReconnecting: true,
      })

      // Автоматическое переподключение с экспоненциальной задержкой
      const delay = Math.min(1000 * Math.pow(2, currentState.reconnectAttempts), 30000)
      wsLog(
        `попытка переподключения #${currentState.reconnectAttempts + 1} через ${delay}ms`
      )

      setTimeout(() => {
        const storedUserId = get().userId
        if (storedUserId) {
          get().connectWebSocket(storedUserId)
        } else {
          wsWarn('нет сохраненного userId для переподключения')
        }
      }, delay)
    }

    set({ socket })
  },

  disconnectWebSocket: () => {
    const { socket } = get()
    if (socket) {
      wsLog('отключение')
      socket.close(1000, 'Пользователь вышел из системы')
      set({
        socket: null,
        userId: null,
        reconnectAttempts: 0,
        isReconnecting: false,
      })
    }
  },

  resetReconnectAttempts: () => {
    set({ reconnectAttempts: 0, isReconnecting: false })
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }))
  },

  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }))
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }))
  },
}))
