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
      console.log(`[useButtonAccess] Загрузка данных для страницы: ${page || 'все страницы'}`)

      if (isSinglePage && page) {
        // Загружаем кнопки для одной страницы
        const result = await buttonAccessAPI.getByPage(page)
        console.log(`[useButtonAccess] Получено ${result.length} кнопок для страницы ${page}:`, result)
        return result
      } else {
        // Загружаем кнопки для всех страниц
        const result = await buttonAccessAPI.getAllPages()
        console.log('[useButtonAccess] Получены кнопки для всех страниц:', result)
        return result
      }
    },
    // Настройки автообновления унаследованы из queryClient в main.tsx:
    // - staleTime: 5 * 60 * 1000 (данные свежие 5 минут)
    // - refetchOnWindowFocus: false (НЕ обновлять при возврате на вкладку)
    // - retry: 1 (1 попытка повтора при ошибке)
  })

  /**
   * Проверяет наличие доступа к кнопке
   */
  const canUseButton = useCallback(
    (buttonKey: string, pageName?: string): boolean => {
      console.log(`[canUseButton] Проверка доступа к кнопке "${buttonKey}" на странице "${pageName || page || 'не указана'}"`)
      console.log(`[canUseButton] data:`, data)
      console.log(`[canUseButton] isLoading:`, isLoading)

      if (!data) {
        console.warn(`[canUseButton] Данные не загружены, возвращаем false`)
        return false
      }

      if (isSinglePage) {
        // Режим одной страницы - data это ButtonAccess[]
        const buttons = data as ButtonAccess[]
        const hasAccess = buttons.some((btn) => btn.button_key === buttonKey)
        console.log(`[canUseButton] Режим одной страницы (${page}). Найдено кнопок: ${buttons.length}. Доступ: ${hasAccess}`)
        return hasAccess
      } else {
        // Режим всех страниц - data это AllPagesButtons
        if (!pageName) {
          console.warn(
            '[canUseButton] page parameter is required when hook is initialized without specific page'
          )
          return false
        }

        const allPages = data as AllPagesButtons
        const pageButtons = allPages[pageName] || []
        const hasAccess = pageButtons.some((btn) => btn.button_key === buttonKey)
        console.log(`[canUseButton] Режим всех страниц. Страница ${pageName}. Найдено кнопок: ${pageButtons.length}. Доступ: ${hasAccess}`)
        return hasAccess
      }
    },
    [data, isSinglePage, isLoading, page]
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
