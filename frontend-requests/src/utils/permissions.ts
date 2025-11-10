/**
 * Унифицированная система проверки прав доступа.
 *
 * Объединяет проверку доступа к страницам и кнопкам в единый интерфейс.
 * Автоматически учитывает:
 * - SUPERADMIN имеет доступ ко всему
 * - Пользователи с has_full_access (категория MANAGEMENT) имеют доступ ко всему
 * - Остальные проверяются через матрицу доступа ButtonAccess
 *
 * @example
 * import { can } from '@/utils/permissions'
 *
 * // Проверка доступа к странице
 * if (can('page', 'users')) { ... }
 *
 * // Проверка доступа к кнопке на странице
 * if (can('button', 'create', 'users')) { ... }
 */

import { useAuthStore } from '../stores/authStore'
import { useButtonAccess } from '../hooks/useButtonAccess'

/**
 * Тип прав доступа
 */
export type PermissionType = 'page' | 'button'

/**
 * Интерфейс для пользователя (минимальный набор для проверки прав)
 */
export interface UserPermissions {
  is_superuser?: boolean
  role?: string
  has_full_access?: boolean
  role_category?: 'MANAGEMENT' | 'ITR_SUPPLY'
}

/**
 * Проверяет, является ли пользователь суперадмином или имеет полный доступ
 */
export function hasFullAccess(user: UserPermissions | null | undefined): boolean {
  if (!user) return false

  // SUPERADMIN имеет полный доступ
  if (user.is_superuser || user.role === 'SUPERADMIN') {
    return true
  }

  // Пользователи с флагом has_full_access имеют полный доступ
  if (user.has_full_access) {
    return true
  }

  return false
}

/**
 * Хук для проверки прав доступа (использует useAuthStore и useButtonAccess)
 *
 * ВАЖНО: Этот хук может использоваться только внутри React-компонентов!
 * Для использования вне компонентов используйте canAccess().
 *
 * @param page - название страницы (опционально, для оптимизации запросов к API)
 *
 * @example
 * const { can } = usePermissions('users')
 *
 * if (can('page', 'users')) { ... }
 * if (can('button', 'create')) { ... }
 */
export function usePermissions(page?: string) {
  const { user, hasPageAccess } = useAuthStore()
  const { canUseButton } = useButtonAccess(page)

  /**
   * Универсальная функция проверки прав
   *
   * @param type - тип проверки ('page' или 'button')
   * @param permission - название страницы или кнопки
   * @param pageName - название страницы (требуется для проверки кнопок, если hook не инициализирован с конкретной страницей)
   */
  const can = (type: PermissionType, permission: string, pageName?: string): boolean => {
    console.log(`[usePermissions.can] Проверка: type=${type}, permission=${permission}, page=${pageName || page}`)

    // Если пользователь не авторизован
    if (!user) {
      console.log('[usePermissions.can] Пользователь не авторизован, доступ запрещен')
      return false
    }

    // Проверка полного доступа (SUPERADMIN или has_full_access)
    if (hasFullAccess(user)) {
      console.log('[usePermissions.can] Пользователь имеет полный доступ')
      return true
    }

    // Проверка доступа к странице
    if (type === 'page') {
      const access = hasPageAccess(permission)
      console.log(`[usePermissions.can] Доступ к странице ${permission}: ${access}`)
      return access
    }

    // Проверка доступа к кнопке
    if (type === 'button') {
      const access = canUseButton(permission, pageName)
      console.log(`[usePermissions.can] Доступ к кнопке ${permission} на странице ${pageName || page}: ${access}`)
      return access
    }

    return false
  }

  return {
    can,
    user,
    hasFullAccess: hasFullAccess(user),
  }
}

/**
 * Функция для проверки прав вне React-компонентов
 *
 * ВАЖНО: Эта функция НЕ имеет доступа к хукам React Query,
 * поэтому может возвращать неточные результаты для кнопок.
 * Используйте usePermissions() внутри компонентов.
 *
 * @param user - объект пользователя
 * @param type - тип проверки ('page' или 'button')
 * @param permission - название страницы или кнопки
 * @param allowedPages - список разрешенных страниц (из authStore)
 */
export function canAccess(
  user: UserPermissions | null | undefined,
  type: PermissionType,
  permission: string,
  allowedPages: string[] = []
): boolean {
  // Если пользователь не авторизован
  if (!user) {
    return false
  }

  // Проверка полного доступа
  if (hasFullAccess(user)) {
    return true
  }

  // Проверка доступа к странице
  if (type === 'page') {
    return allowedPages.includes(permission)
  }

  // Для кнопок без React Query невозможно точно проверить права
  // Возвращаем false по умолчанию
  console.warn('[canAccess] Проверка доступа к кнопкам вне компонентов может быть неточной. Используйте usePermissions() внутри компонентов.')
  return false
}

export default usePermissions
