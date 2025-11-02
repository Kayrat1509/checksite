/**
 * Custom hook для работы с матрицей доступа к кнопкам.
 *
 * ОБНОВЛЕНО: Теперь использует React Query для автоматического обновления данных.
 * Данные автоматически обновляются:
 * - Каждые 10 секунд (staleTime)
 * - При возврате на вкладку браузера (refetchOnWindowFocus)
 * - При восстановлении интернет-соединения (refetchOnReconnect)
 *
 * Использование:
 * 1. Для одной страницы:
 *    const { canUseButton, loading } = useButtonAccess('projects')
 *    if (canUseButton('create')) { ... }
 *
 * 2. Для всех страниц:
 *    const { canUseButton, loading } = useButtonAccess()
 *    if (canUseButton('create', 'projects')) { ... }
 */

import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { buttonAccessAPI, ButtonAccess, AllPagesButtons } from '../api/buttonAccess'

interface UseButtonAccessReturn {
  /**
   * Проверяет, имеет ли пользователь доступ к кнопке
   * @param buttonKey - ключ кнопки (например, 'create', 'edit')
   * @param page - название страницы (опционально, если hook был инициализирован с конкретной страницей)
   */
  canUseButton: (buttonKey: string, page?: string) => boolean

  /**
   * Возвращает информацию о кнопке
   * @param buttonKey - ключ кнопки
   * @param page - название страницы (опционально)
   */
  getButton: (buttonKey: string, page?: string) => ButtonAccess | undefined

  /**
   * Возвращает все доступные кнопки для страницы
   * @param page - название страницы (опционально)
   */
  getButtons: (page?: string) => ButtonAccess[]

  /**
   * Флаг загрузки данных
   */
  loading: boolean

  /**
   * Ошибка при загрузке
   */
  error: Error | null

  /**
   * Перезагрузка данных
   */
  refetch: () => Promise<void>
}

/**
 * Hook для работы с доступом к кнопкам на странице
 *
 * ОБНОВЛЕНО: Использует React Query для автоматического обновления данных.
 *
 * @param page - опциональное название страницы. Если указано, загружаются только кнопки этой страницы.
 *               Если не указано, загружаются кнопки всех страниц.
 *
 * @example
 * // Для конкретной страницы
 * const Projects = () => {
 *   const { canUseButton, loading } = useButtonAccess('projects')
 *
 *   if (loading) return <Spin />
 *
 *   return (
 *     <>
 *       {canUseButton('create') && (
 *         <Button onClick={handleCreate}>Создать проект</Button>
 *       )}
 *       {canUseButton('export_excel') && (
 *         <Button onClick={handleExport}>Экспорт Excel</Button>
 *       )}
 *     </>
 *   )
 * }
 *
 * @example
 * // Для всех страниц (в layout или App)
 * const App = () => {
 *   const { canUseButton, loading } = useButtonAccess()
 *
 *   // Использование с указанием страницы
 *   const canCreateProject = canUseButton('create', 'projects')
 *   const canEditUser = canUseButton('edit', 'users')
 * }
 */
export const useButtonAccess = (page?: string): UseButtonAccessReturn => {
  // Флаг для определения режима (одна страница или все)
  const isSinglePage = page !== undefined

  // Используем React Query для автоматического обновления данных
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['button-access', page], // Уникальный ключ кеша для каждой страницы
    queryFn: async () => {
      if (isSinglePage && page) {
        // Загружаем кнопки для одной страницы
        return await buttonAccessAPI.getByPage(page)
      } else {
        // Загружаем кнопки для всех страниц
        return await buttonAccessAPI.getAllPages()
      }
    },
    // Настройки автообновления унаследованы из queryClient в App.tsx:
    // - staleTime: 10000 (данные свежие 10 секунд)
    // - refetchOnWindowFocus: true (обновить при возврате на вкладку)
    // - refetchOnReconnect: true (обновить при восстановлении сети)
  })

  /**
   * Проверяет наличие доступа к кнопке
   */
  const canUseButton = useCallback(
    (buttonKey: string, pageName?: string): boolean => {
      if (!data) return false

      if (isSinglePage) {
        // Режим одной страницы - data это ButtonAccess[]
        const buttons = data as ButtonAccess[]
        return buttons.some((btn) => btn.button_key === buttonKey)
      } else {
        // Режим всех страниц - data это AllPagesButtons
        if (!pageName) {
          console.warn(
            'useButtonAccess: page parameter is required when hook is initialized without specific page'
          )
          return false
        }

        const allPages = data as AllPagesButtons
        const pageButtons = allPages[pageName] || []
        return pageButtons.some((btn) => btn.button_key === buttonKey)
      }
    },
    [data, isSinglePage]
  )

  /**
   * Возвращает информацию о кнопке
   */
  const getButton = useCallback(
    (buttonKey: string, pageName?: string): ButtonAccess | undefined => {
      if (!data) return undefined

      if (isSinglePage) {
        // Режим одной страницы
        const buttons = data as ButtonAccess[]
        return buttons.find((btn) => btn.button_key === buttonKey)
      } else {
        if (!pageName) {
          console.warn(
            'useButtonAccess: page parameter is required when hook is initialized without specific page'
          )
          return undefined
        }

        const allPages = data as AllPagesButtons
        const pageButtons = allPages[pageName] || []
        return pageButtons.find((btn) => btn.button_key === buttonKey)
      }
    },
    [data, isSinglePage]
  )

  /**
   * Возвращает все доступные кнопки для страницы
   */
  const getButtons = useCallback(
    (pageName?: string): ButtonAccess[] => {
      if (!data) return []

      if (isSinglePage) {
        return data as ButtonAccess[]
      } else {
        if (!pageName) {
          console.warn(
            'useButtonAccess: page parameter is required when hook is initialized without specific page'
          )
          return []
        }

        const allPages = data as AllPagesButtons
        return allPages[pageName] || []
      }
    },
    [data, isSinglePage]
  )

  return {
    canUseButton,
    getButton,
    getButtons,
    loading: isLoading,
    error: error as Error | null,
    refetch: async () => {
      await refetch()
    },
  }
}

export default useButtonAccess
