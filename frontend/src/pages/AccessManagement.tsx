import React, { useState } from 'react'
import {
  Table,
  Checkbox,
  Button,
  message,
  Card,
  Typography,
  Space,
  Tag,
  Spin,
  Tooltip,
} from 'antd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accessManagementAPI, UserAccess, PageInfo } from '../api/accessManagement'
import { SaveOutlined, ReloadOutlined, UserOutlined, CrownOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

/**
 * Страница управления доступом пользователей к разделам системы
 */
const AccessManagement: React.FC = () => {
  const queryClient = useQueryClient()
  const [changedUsers, setChangedUsers] = useState<Map<number, string[]>>(new Map())

  // Загрузка списка пользователей с их доступами
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users-access'],
    queryFn: accessManagementAPI.getUsersAccess,
  })

  // Загрузка списка всех доступных страниц
  const { data: pages, isLoading: pagesLoading } = useQuery({
    queryKey: ['available-pages'],
    queryFn: accessManagementAPI.getAvailablePages,
  })

  // Мутация для обновления доступа пользователя
  const updateAccessMutation = useMutation({
    mutationFn: ({ userId, allowedPages }: { userId: number; allowedPages: string[] }) =>
      accessManagementAPI.updateUserAccess(userId, allowedPages),
    onSuccess: () => {
      message.success('Доступ успешно обновлен')
      queryClient.invalidateQueries({ queryKey: ['users-access'] })
      setChangedUsers(new Map())
    },
    onError: (error: any) => {
      message.error(error.response?.data?.error || 'Ошибка при обновлении доступа')
    },
  })

  /**
   * Обработчик изменения чекбокса доступа к странице
   */
  const handlePageToggle = (userId: number, pageSlug: string, checked: boolean) => {
    const user = users?.find((u) => u.id === userId)
    if (!user) return

    const currentPages = changedUsers.get(userId) || user.allowed_pages
    const newPages = checked
      ? [...currentPages, pageSlug]
      : currentPages.filter((p) => p !== pageSlug)

    setChangedUsers(new Map(changedUsers.set(userId, newPages)))
  }

  /**
   * Сохранить изменения для конкретного пользователя
   */
  const handleSaveUser = (userId: number) => {
    const pages = changedUsers.get(userId)
    if (pages) {
      updateAccessMutation.mutate({ userId, allowedPages: pages })
    }
  }

  /**
   * Отменить несохраненные изменения для пользователя
   */
  const handleCancelChanges = (userId: number) => {
    const newMap = new Map(changedUsers)
    newMap.delete(userId)
    setChangedUsers(newMap)
  }

  /**
   * Получить текущий список страниц пользователя (с учетом несохраненных изменений)
   */
  const getUserPages = (user: UserAccess): string[] => {
    return changedUsers.get(user.id) || user.allowed_pages
  }

  /**
   * Проверить, есть ли несохраненные изменения для пользователя
   */
  const hasChanges = (userId: number): boolean => {
    return changedUsers.has(userId)
  }

  /**
   * Колонки таблицы
   */
  const columns = [
    {
      title: 'Сотрудник',
      key: 'employee',
      fixed: 'left' as const,
      width: 280,
      render: (_: any, user: UserAccess) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            <UserOutlined style={{ marginRight: 6 }} />
            {user.full_name}
          </div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            {user.email}
          </Text>
          <Space size={4} wrap>
            <Tag color={user.role_category === 'MANAGEMENT' ? 'blue' : 'default'}>
              {user.role_display}
            </Tag>
            {user.is_company_owner && (
              <Tag color="gold" icon={<CrownOutlined />}>
                Владелец
              </Tag>
            )}
            {user.has_full_access && <Tag color="green">Полный доступ</Tag>}
            {!user.is_active && <Tag color="red">Неактивен</Tag>}
          </Space>
        </div>
      ),
    },
    // Колонки для каждой страницы
    ...(pages || []).map((page: PageInfo) => ({
      title: page.name,
      dataIndex: page.slug,
      key: page.slug,
      width: 130,
      align: 'center' as const,
      render: (_: any, user: UserAccess) => {
        // Пользователи с полным доступом не могут изменять права
        if (user.has_full_access) {
          return (
            <Tooltip title="Полный доступ для категории Руководство">
              <Checkbox checked disabled />
            </Tooltip>
          )
        }

        const currentPages = getUserPages(user)
        const isChecked = currentPages.includes(page.slug)

        return (
          <Checkbox
            checked={isChecked}
            onChange={(e) => handlePageToggle(user.id, page.slug, e.target.checked)}
          />
        )
      },
    })),
    {
      title: 'Действия',
      key: 'actions',
      fixed: 'right' as const,
      width: 180,
      render: (_: any, user: UserAccess) => {
        if (user.has_full_access) {
          return (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Полный доступ
            </Text>
          )
        }

        return (
          <Space>
            <Button
              type={hasChanges(user.id) ? 'primary' : 'default'}
              size="small"
              icon={<SaveOutlined />}
              disabled={!hasChanges(user.id)}
              loading={updateAccessMutation.isPending}
              onClick={() => handleSaveUser(user.id)}
            >
              Сохранить
            </Button>
            {hasChanges(user.id) && (
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => handleCancelChanges(user.id)}
              >
                Отмена
              </Button>
            )}
          </Space>
        )
      },
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Title level={3}>Управление доступом к страницам</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
          Настройте доступ сотрудников к разделам системы. Категория "Руководство" имеет полный
          доступ автоматически и не может быть изменена.
        </Text>

        {usersLoading || pagesLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" tip="Загрузка данных..." />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={users}
            rowKey="id"
            scroll={{ x: 1800 }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Всего сотрудников: ${total}`,
            }}
            bordered
            rowClassName={(record) => (record.has_full_access ? 'full-access-row' : '')}
          />
        )}
      </Card>

      <style>{`
        .full-access-row {
          background-color: #f0f9ff;
        }
        .full-access-row:hover {
          background-color: #e0f2fe !important;
        }
      `}</style>
    </div>
  )
}

export default AccessManagement
