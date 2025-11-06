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

// Автоматическое определение протокола WebSocket на основе протокола страницы
const getWebSocketUrl = (token: string) => {
  // Проверяем, запущен ли frontend на localhost
  const isLocalDevelopment =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.port === '5174' // Vite dev server

  // В режиме локальной разработки всегда используем localhost:8001
  if (isLocalDevelopment) {
    console.log('WebSocket: режим локальной разработки')
    return `ws://localhost:8001/ws/notifications/?token=${token}`
  }

  // На продакшене используем текущий домен с автоматическим определением протокола
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  console.log('WebSocket: режим продакшена')
  return `${protocol}//${window.location.host}/ws/notifications/?token=${token}`
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  socket: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  isReconnecting: false,

  connectWebSocket: (_userId) => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      console.warn('WebSocket: отсутствует токен авторизации')
      return
    }

    const state = get()

    // Проверяем, не превышен ли лимит попыток переподключения
    if (state.reconnectAttempts >= state.maxReconnectAttempts) {
      console.warn('WebSocket: превышен лимит попыток переподключения. Остановка.')
      return
    }

    // Если уже есть активное соединение, не создаем новое
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket: уже подключен')
      return
    }

    // Закрываем старое соединение если оно есть
    if (state.socket) {
      state.socket.close()
    }

    // Формируем полный URL с токеном
    const wsUrl = getWebSocketUrl(token)
    console.log('WebSocket: подключение к', wsUrl)

    // Создаем нативное WebSocket подключение
    const socket = new WebSocket(wsUrl)

    // Обработчик успешного подключения
    socket.onopen = () => {
      console.log('WebSocket: успешное подключение')
      // Сбрасываем счетчик попыток при успешном подключении
      set({ reconnectAttempts: 0, isReconnecting: false })
    }

    // Обработчик входящих сообщений
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('WebSocket: получено сообщение', data)

        // Обрабатываем разные типы сообщений
        if (data.type === 'connection') {
          // Подтверждение подключения
          console.log('WebSocket:', data.message)
        } else if (data.type === 'notification' && data.data) {
          // Новое уведомление (backend отправляет в поле 'data', а не 'payload')
          get().addNotification(data.data)
        } else if (data.type === 'pong') {
          // Ответ на ping
          console.log('WebSocket: pong получен')
        }
      } catch (error) {
        console.error('WebSocket: ошибка парсинга сообщения', error)
      }
    }

    // Обработчик ошибок
    socket.onerror = (error) => {
      console.error('WebSocket: ошибка подключения', error)
    }

    // Обработчик закрытия соединения
    socket.onclose = (event) => {
      console.log('WebSocket: соединение закрыто', {
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
        console.log('WebSocket: переподключение не требуется')
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
      console.log(
        `WebSocket: попытка переподключения #${currentState.reconnectAttempts + 1} через ${delay}ms`
      )

      setTimeout(() => {
        get().connectWebSocket(_userId)
      }, delay)
    }

    set({ socket })
  },

  disconnectWebSocket: () => {
    const { socket } = get()
    if (socket) {
      console.log('WebSocket: отключение')
      socket.close(1000, 'Пользователь вышел из системы')
      set({
        socket: null,
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
