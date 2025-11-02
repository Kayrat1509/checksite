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

export const useAccessRefresh = () => {
  const { isAuthenticated, loadAllowedPages } = useAuthStore()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Работает только для авторизованных пользователей
    if (!isAuthenticated) {
      return
    }

    // Функция обновления прав доступа
    const refreshAccess = async () => {
      try {
        console.log('[AccessRefresh] Обновление прав доступа...')
        await loadAllowedPages()
        console.log('[AccessRefresh] Права доступа обновлены')
      } catch (error) {
        console.error('[AccessRefresh] Ошибка при обновлении прав доступа:', error)
      }
    }

    // 1. Обновление при возвращении на вкладку
    const handleFocus = () => {
      console.log('[AccessRefresh] Вкладка активирована, обновляем права доступа')
      refreshAccess()
    }

    window.addEventListener('focus', handleFocus)

    // 2. Периодическое обновление каждые 5 минут
    intervalRef.current = setInterval(() => {
      console.log('[AccessRefresh] Периодическое обновление прав доступа')
      refreshAccess()
    }, REFRESH_INTERVAL)

    // Cleanup
    return () => {
      window.removeEventListener('focus', handleFocus)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isAuthenticated, loadAllowedPages])
}

export default useAccessRefresh
