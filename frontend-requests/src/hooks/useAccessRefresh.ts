/**
 * Hook для автоматического обновления прав доступа пользователя.
 *
 * Обновляет права доступа в следующих случаях:
 * 1. При возвращении на вкладку (window focus)
 * 2. Периодически каждые 5 минут
 *
 * Использование:
 * ```tsx
 * import { useAccessRefresh } from '../hooks/useAccessRefresh'
 *
 * function App() {
 *   useAccessRefresh()
 *   return <div>...</div>
 * }
 * ```
 */

import { useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'

const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 минут в миллисекундах
const DEBOUNCE_DELAY = 3000 // 3 секунды для debounce

export const useAccessRefresh = () => {
  const { isAuthenticated, loadAllowedPages } = useAuthStore()
  const intervalRef = useRef<number | null>(null)
  const debounceRef = useRef<number | null>(null)
  const lastRefreshRef = useRef<number>(0)
  const wasHiddenRef = useRef<boolean>(false)

  useEffect(() => {
    // Работает только для авторизованных пользователей
    if (!isAuthenticated) {
      return
    }

    // Функция обновления прав доступа
    const refreshAccess = async () => {
      const now = Date.now()

      // Защита от частых обновлений (минимум 3 секунды между обновлениями)
      if (now - lastRefreshRef.current < DEBOUNCE_DELAY) {
        // Пропускаем обновление, если оно было недавно
        return
      }

      try {
        lastRefreshRef.current = now
        await loadAllowedPages()
        // Успешно обновлено (без логов для чистоты консоли)
      } catch (error) {
        console.error('[AccessRefresh] Ошибка при обновлении прав доступа:', error)
      }
    }

    // 1. Обновление при возвращении на вкладку (только если была скрыта)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Вкладка стала невидимой
        wasHiddenRef.current = true
      } else if (wasHiddenRef.current) {
        // Вкладка снова стала видимой после того как была скрыта
        wasHiddenRef.current = false

        // Debounce: если уже есть запланированное обновление, отменяем его
        if (debounceRef.current) {
          clearTimeout(debounceRef.current)
        }

        // Запускаем обновление с задержкой
        debounceRef.current = window.setTimeout(() => {
          refreshAccess()
        }, 500) // Небольшая задержка для предотвращения множественных вызовов
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 2. Периодическое обновление каждые 5 минут
    intervalRef.current = window.setInterval(() => {
      refreshAccess()
    }, REFRESH_INTERVAL)

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [isAuthenticated, loadAllowedPages])
}

export default useAccessRefresh
