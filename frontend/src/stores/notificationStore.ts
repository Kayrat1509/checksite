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
  connectWebSocket: (userId: number) => void
  disconnectWebSocket: () => void
  addNotification: (notification: Notification) => void
  markAsRead: (id: number) => void
  markAllAsRead: () => void
}

// Автоматическое определение протокола WebSocket на основе протокола страницы
const getWebSocketUrl = (token: string) => {
  const envUrl = import.meta.env.VITE_WS_URL
  if (envUrl) {
    // Если страница загружена по HTTPS, используем WSS вместо WS
    if (window.location.protocol === 'https:' && envUrl.startsWith('ws://')) {
      return envUrl.replace('ws://', 'wss://') + `/ws/notifications/?token=${token}`
    }
    return envUrl + `/ws/notifications/?token=${token}`
  }

  const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'

  // локальная разработка → backend:8001
  if (isLocal) {
    return `${protocol}//localhost:8001/ws/notifications/?token=${token}`
  }

  // продакшн → домен, nginx сам проксирует /ws/
  return `${protocol}//${window.location.host}/ws/notifications/?token=${token}`
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  socket: null,

  connectWebSocket: (_userId) => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      console.warn('WebSocket: отсутствует токен авторизации')
      return
    }

    // Формируем полный URL с токеном
    const wsUrl = getWebSocketUrl(token)
    console.log('WebSocket: подключение к', wsUrl)

    // Создаем нативное WebSocket подключение
    const socket = new WebSocket(wsUrl)

    // Обработчик успешного подключения
    socket.onopen = () => {
      console.log('WebSocket: успешное подключение')
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

      // Автоматическое переподключение через 5 секунд
      setTimeout(() => {
        console.log('WebSocket: попытка переподключения...')
        get().connectWebSocket(_userId)
      }, 5000)
    }

    set({ socket })
  },

  disconnectWebSocket: () => {
    const { socket } = get()
    if (socket) {
      console.log('WebSocket: отключение')
      socket.close(1000, 'Пользователь вышел из системы')
      set({ socket: null })
    }
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
