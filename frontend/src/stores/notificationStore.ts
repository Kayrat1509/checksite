import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'

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
  socket: Socket | null
  connectWebSocket: (userId: number) => void
  disconnectWebSocket: () => void
  addNotification: (notification: Notification) => void
  markAsRead: (id: number) => void
  markAllAsRead: () => void
}

// Автоматическое определение протокола WebSocket на основе протокола страницы
const getWebSocketUrl = () => {
  const envUrl = import.meta.env.VITE_WS_URL
  if (envUrl) {
    // Если страница загружена по HTTPS, используем WSS вместо WS
    if (window.location.protocol === 'https:' && envUrl.startsWith('ws://')) {
      return envUrl.replace('ws://', 'wss://')
    }
    return envUrl
  }

  const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'

  // локальная разработка → backend:8001
  if (isLocal) {
    return `${protocol}//localhost:8001`
  }

  // продакшн → домен, nginx сам проксирует /ws/
  return `${protocol}//${window.location.host}`
}

const WS_URL = getWebSocketUrl()

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  socket: null,

  connectWebSocket: (_userId) => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    const socket = io(WS_URL, {
      path: '/ws/notifications/',
      transports: ['websocket'],
      auth: {
        token,
      },
    })

    socket.on('connect', () => {
      console.log('WebSocket connected')
    })

    socket.on('notification', (data: Notification) => {
      get().addNotification(data)
    })

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
    })

    set({ socket })
  },

  disconnectWebSocket: () => {
    const { socket } = get()
    if (socket) {
      socket.disconnect()
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
