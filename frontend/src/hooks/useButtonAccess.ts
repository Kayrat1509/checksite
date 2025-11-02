/**
 * Custom hook для работы с матрицей доступа к кнопкам.
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

import { useState, useEffect, useCallback } from 'react'
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
  const [buttons, setButtons] = useState<ButtonAccess[]>([])
  const [allPageButtons, setAllPageButtons] = useState<AllPagesButtons>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  // Флаг для определения режима (одна страница или все)
  const isSinglePage = page !== undefined

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (isSinglePage && page) {
        // Загружаем кнопки для одной страницы
        const data = await buttonAccessAPI.getByPage(page)
        setButtons(data)
      } else {
        // Загружаем кнопки для всех страниц
        const data = await buttonAccessAPI.getAllPages()
        setAllPageButtons(data)
      }
    } catch (err) {
      console.error('Ошибка при загрузке доступа к кнопкам:', err)
      setError(err instanceof Error ? err : new Error('Неизвестная ошибка'))
    } finally {
      setLoading(false)
    }
  }, [page, isSinglePage])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /**
   * Проверяет наличие доступа к кнопке
   */
  const canUseButton = useCallback(
    (buttonKey: string, pageName?: string): boolean => {
      if (isSinglePage) {
        // Режим одной страницы
        return buttons.some((btn) => btn.button_key === buttonKey)
      } else {
        // Режим всех страниц - требуется указать страницу
        if (!pageName) {
          console.warn(
            'useButtonAccess: page parameter is required when hook is initialized without specific page'
          )
          return false
        }

        const pageButtons = allPageButtons[pageName] || []
        return pageButtons.some((btn) => btn.button_key === buttonKey)
      }
    },
    [isSinglePage, buttons, allPageButtons]
  )

  /**
   * Возвращает информацию о кнопке
   */
  const getButton = useCallback(
    (buttonKey: string, pageName?: string): ButtonAccess | undefined => {
      if (isSinglePage) {
        return buttons.find((btn) => btn.button_key === buttonKey)
      } else {
        if (!pageName) {
          console.warn(
            'useButtonAccess: page parameter is required when hook is initialized without specific page'
          )
          return undefined
        }

        const pageButtons = allPageButtons[pageName] || []
        return pageButtons.find((btn) => btn.button_key === buttonKey)
      }
    },
    [isSinglePage, buttons, allPageButtons]
  )

  /**
   * Возвращает все доступные кнопки для страницы
   */
  const getButtons = useCallback(
    (pageName?: string): ButtonAccess[] => {
      if (isSinglePage) {
        return buttons
      } else {
        if (!pageName) {
          console.warn(
            'useButtonAccess: page parameter is required when hook is initialized without specific page'
          )
          return []
        }

        return allPageButtons[pageName] || []
      }
    },
    [isSinglePage, buttons, allPageButtons]
  )

  return {
    canUseButton,
    getButton,
    getButtons,
    loading,
    error,
    refetch: fetchData,
  }
}

export default useButtonAccess
