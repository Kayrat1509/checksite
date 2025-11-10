/**
 * Компонент кнопки с контролем доступа через ButtonAccess.
 *
 * Автоматически скрывает кнопку, если у пользователя нет прав доступа.
 *
 * Использование:
 * ```tsx
 * import { AccessControlledButton } from '../components/AccessControlledButton'
 *
 * <AccessControlledButton
 *   page="projects"
 *   buttonKey="create"
 *   type="primary"
 *   icon={<PlusOutlined />}
 *   onClick={() => setModalVisible(true)}
 * >
 *   Создать проект
 * </AccessControlledButton>
 * ```
 */

import { Button, ButtonProps } from 'antd'
import { useButtonAccess } from '../hooks/useButtonAccess'
import { useAuthStore } from '../stores/authStore'

interface AccessControlledButtonProps extends ButtonProps {
  page: string
  buttonKey: string
  children: React.ReactNode
}

export const AccessControlledButton: React.FC<AccessControlledButtonProps> = ({
  page,
  buttonKey,
  children,
  ...buttonProps
}) => {
  const { user } = useAuthStore()
  const { canUseButton, loading } = useButtonAccess(page)

  // SUPERADMIN имеет доступ ко всем кнопкам
  if (user?.is_superuser || user?.role === 'SUPERADMIN') {
    return <Button {...buttonProps}>{children}</Button>
  }

  // Показываем загрузку
  if (loading) {
    return <Button {...buttonProps} loading>{children}</Button>
  }

  // Проверяем доступ к кнопке
  const hasAccess = canUseButton(buttonKey)

  // Если нет доступа - не показываем кнопку вообще
  if (!hasAccess) {
    return null
  }

  return <Button {...buttonProps}>{children}</Button>
}

export default AccessControlledButton
