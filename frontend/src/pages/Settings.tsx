import { useState, useEffect } from 'react'
import { Typography, Card, Tabs, Table, Checkbox, Button, Space, message } from 'antd'
import { SaveOutlined, SecurityScanOutlined, DeleteOutlined } from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'
import { settingsAPI } from '../api/settings'
import RecycleBin from '../components/RecycleBin'

const { Title, Text } = Typography
const { TabPane } = Tabs

// Типы для матрицы доступа
interface AccessMatrix {
  [page: string]: {
    [role: string]: boolean
  }
}

const Settings = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(false)

  // Проверка доступа к вкладке "Настройка доступа"
  const canAccessPermissions = () => {
    if (!user) return false
    const allowedRoles = ['SUPERADMIN', 'DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER']
    return allowedRoles.includes(user.role)
  }

  // Начальное состояние матрицы доступа (значения по умолчанию)
  const [accessMatrix, setAccessMatrix] = useState<AccessMatrix>({
    'dashboard': {
      'DIRECTOR': true,
      'CHIEF_ENGINEER': true,
      'PROJECT_MANAGER': true,
      'ENGINEER': true,
      'SITE_MANAGER': true,
      'FOREMAN': true,
      'MASTER': true,
      'SUPERVISOR': true,
      'CONTRACTOR': true,
      'OBSERVER': true,
      'SUPPLY_MANAGER': false,
      'WAREHOUSE_HEAD': false,
      'SITE_WAREHOUSE_MANAGER': false,
    },
    'projects': {
      'DIRECTOR': true,
      'CHIEF_ENGINEER': true,
      'PROJECT_MANAGER': true,
      'ENGINEER': true,
      'SITE_MANAGER': true,
      'FOREMAN': true,
      'MASTER': true,
      'SUPERVISOR': true,
      'CONTRACTOR': true,
      'OBSERVER': true,
      'SUPPLY_MANAGER': true,
      'WAREHOUSE_HEAD': true,
      'SITE_WAREHOUSE_MANAGER': true,
    },
    'issues': {
      'DIRECTOR': true,
      'CHIEF_ENGINEER': true,
      'PROJECT_MANAGER': true,
      'ENGINEER': true,
      'SITE_MANAGER': true,
      'FOREMAN': true,
      'MASTER': true,
      'SUPERVISOR': true,
      'CONTRACTOR': true,
      'OBSERVER': true,
      'SUPPLY_MANAGER': false,
      'WAREHOUSE_HEAD': false,
      'SITE_WAREHOUSE_MANAGER': false,
    },
    'users': {
      'DIRECTOR': true,
      'CHIEF_ENGINEER': true,
      'PROJECT_MANAGER': true,
      'ENGINEER': true,
      'SITE_MANAGER': true,
      'FOREMAN': true,
      'MASTER': false,
      'SUPERVISOR': false,
      'CONTRACTOR': false,
      'OBSERVER': false,
      'SUPPLY_MANAGER': false,
      'WAREHOUSE_HEAD': false,
      'SITE_WAREHOUSE_MANAGER': false,
    },
    'contractors': {
      'DIRECTOR': true,
      'CHIEF_ENGINEER': true,
      'PROJECT_MANAGER': true,
      'ENGINEER': true,
      'SITE_MANAGER': true,
      'FOREMAN': false,
      'MASTER': false,
      'SUPERVISOR': false,
      'CONTRACTOR': false,
      'OBSERVER': false,
      'SUPPLY_MANAGER': false,
      'WAREHOUSE_HEAD': false,
      'SITE_WAREHOUSE_MANAGER': false,
    },
    'supervisions': {
      'DIRECTOR': true,
      'CHIEF_ENGINEER': true,
      'PROJECT_MANAGER': true,
      'ENGINEER': true,
      'SITE_MANAGER': true,
      'FOREMAN': true,
      'MASTER': false,
      'SUPERVISOR': false,
      'CONTRACTOR': false,
      'OBSERVER': false,
      'SUPPLY_MANAGER': false,
      'WAREHOUSE_HEAD': false,
      'SITE_WAREHOUSE_MANAGER': false,
    },
    'technical-conditions': {
      'DIRECTOR': true,
      'CHIEF_ENGINEER': true,
      'PROJECT_MANAGER': true,
      'ENGINEER': true,
      'SITE_MANAGER': true,
      'FOREMAN': true,
      'MASTER': true,
      'SUPERVISOR': true,
      'CONTRACTOR': true,
      'OBSERVER': true,
      'SUPPLY_MANAGER': false,
      'WAREHOUSE_HEAD': false,
      'SITE_WAREHOUSE_MANAGER': false,
    },
    'material-requests': {
      'DIRECTOR': true,
      'CHIEF_ENGINEER': true,
      'PROJECT_MANAGER': true,
      'ENGINEER': true,
      'SITE_MANAGER': true,
      'FOREMAN': true,
      'MASTER': true,
      'SUPERVISOR': true,
      'CONTRACTOR': true,
      'OBSERVER': true,
      'SUPPLY_MANAGER': true,
      'WAREHOUSE_HEAD': true,
      'SITE_WAREHOUSE_MANAGER': true,
    },
    'warehouse': {
      'DIRECTOR': true,
      'CHIEF_ENGINEER': true,
      'PROJECT_MANAGER': true,
      'ENGINEER': true,
      'SITE_MANAGER': true,
      'FOREMAN': true,
      'MASTER': true,
      'SUPERVISOR': true,
      'CONTRACTOR': true,
      'OBSERVER': true,
      'SUPPLY_MANAGER': true,
      'WAREHOUSE_HEAD': true,
      'SITE_WAREHOUSE_MANAGER': true,
    },
    'tenders': {
      'DIRECTOR': true,
      'CHIEF_ENGINEER': true,
      'PROJECT_MANAGER': true,
      'ENGINEER': true,
      'SITE_MANAGER': true,
      'FOREMAN': true,
      'MASTER': true,
      'SUPERVISOR': false,
      'CONTRACTOR': false,
      'OBSERVER': false,
      'SUPPLY_MANAGER': false,
      'WAREHOUSE_HEAD': false,
      'SITE_WAREHOUSE_MANAGER': false,
    },
    'reports': {
      'DIRECTOR': true,
      'CHIEF_ENGINEER': true,
      'PROJECT_MANAGER': true,
      'ENGINEER': true,
      'SITE_MANAGER': true,
      'FOREMAN': true,
      'MASTER': true,
      'SUPERVISOR': true,
      'CONTRACTOR': false,
      'OBSERVER': true,
      'SUPPLY_MANAGER': false,
      'WAREHOUSE_HEAD': false,
      'SITE_WAREHOUSE_MANAGER': false,
    },
    'profile': {
      'DIRECTOR': true,
      'CHIEF_ENGINEER': true,
      'PROJECT_MANAGER': true,
      'ENGINEER': true,
      'SITE_MANAGER': true,
      'FOREMAN': true,
      'MASTER': true,
      'SUPERVISOR': true,
      'CONTRACTOR': true,
      'OBSERVER': true,
      'SUPPLY_MANAGER': true,
      'WAREHOUSE_HEAD': true,
      'SITE_WAREHOUSE_MANAGER': true,
    },
    'settings': {
      'DIRECTOR': true,
      'CHIEF_ENGINEER': true,
      'PROJECT_MANAGER': true,
      'ENGINEER': true,
      'SITE_MANAGER': true,
      'FOREMAN': true,
      'MASTER': true,
      'SUPERVISOR': true,
      'CONTRACTOR': true,
      'OBSERVER': true,
      'SUPPLY_MANAGER': true,
      'WAREHOUSE_HEAD': true,
      'SITE_WAREHOUSE_MANAGER': true,
    },
  })

  // Названия страниц и ролей
  const pageNames: { [key: string]: string } = {
    'dashboard': 'Дашборд',
    'projects': 'Проекты',
    'issues': 'Замечания',
    'users': 'Сотрудники',
    'contractors': 'Подрядчики',
    'supervisions': 'Надзоры',
    'technical-conditions': 'Техусловия',
    'material-requests': 'Заявки',
    'warehouse': 'Склад',
    'tenders': 'Тендеры',
    'reports': 'Отчеты',
    'profile': 'Профиль',
    'settings': 'Настройки',
  }

  const roleNames: { [key: string]: string } = {
    'DIRECTOR': 'Директор',
    'CHIEF_ENGINEER': 'Гл.инженер',
    'PROJECT_MANAGER': 'Рук.проекта',
    'ENGINEER': 'Инженер ПТО',
    'SITE_MANAGER': 'Нач.участка',
    'FOREMAN': 'Прораб',
    'MASTER': 'Мастер',
    'SUPERVISOR': 'Технадзор',
    'CONTRACTOR': 'Подрядчик',
    'OBSERVER': 'Наблюдатель',
    'SUPPLY_MANAGER': 'Снабженец',
    'WAREHOUSE_HEAD': 'Зав.склада',
    'SITE_WAREHOUSE_MANAGER': 'Завсклад объекта',
  }

  // Загрузка матрицы доступа при монтировании компонента
  useEffect(() => {
    const fetchAccessMatrix = async () => {
      if (!canAccessPermissions()) return

      setFetchLoading(true)
      try {
        const response = await settingsAPI.getAccessMatrix()
        if (response.matrix) {
          setAccessMatrix(response.matrix)
        }
      } catch (error) {
        console.error('Ошибка при загрузке матрицы доступа:', error)
        // Используем значения по умолчанию, если не удалось загрузить
      } finally {
        setFetchLoading(false)
      }
    }

    fetchAccessMatrix()
  }, [])

  // Обработчик изменения доступа
  const handleAccessChange = (page: string, role: string, checked: boolean) => {
    setAccessMatrix(prev => ({
      ...prev,
      [page]: {
        ...prev[page],
        [role]: checked
      }
    }))
  }

  // Обработчик сохранения матрицы доступа
  const handleSaveAccessMatrix = async () => {
    setLoading(true)
    try {
      await settingsAPI.updateAccessMatrix({
        matrix: accessMatrix
      })
      message.success('Матрица доступа успешно сохранена')
    } catch (error) {
      console.error('Ошибка при сохранении матрицы доступа:', error)
      message.error('Ошибка при сохранении матрицы доступа')
    } finally {
      setLoading(false)
    }
  }

  // Колонки таблицы
  const columns = [
    {
      title: 'Страница',
      dataIndex: 'page',
      key: 'page',
      fixed: 'left' as const,
      width: 200,
      render: (page: string) => <Text strong>{pageNames[page]}</Text>
    },
    ...Object.keys(roleNames).map(role => ({
      title: roleNames[role],
      dataIndex: role,
      key: role,
      width: 120,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Checkbox
          checked={accessMatrix[record.page]?.[role] || false}
          onChange={(e) => handleAccessChange(record.page, role, e.target.checked)}
        />
      )
    }))
  ]

  // Данные таблицы
  const dataSource = Object.keys(pageNames).map((page, index) => ({
    key: index,
    page: page,
  }))

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Настройки</Title>

      <Card>
        <Tabs defaultActiveKey="general">
          {/* Вкладка: Общие настройки */}
          <TabPane
            tab={
              <span>
                Общие
              </span>
            }
            key="general"
          >
            <Text type="secondary">
              Раздел в разработке
            </Text>
          </TabPane>

          {/* Вкладка: Настройка доступа (только для определенных ролей) */}
          {canAccessPermissions() && (
            <TabPane
              tab={
                <span>
                  <SecurityScanOutlined />
                  Настройка доступа
                </span>
              }
              key="permissions"
            >
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                  <Title level={4}>Матрица доступа к страницам</Title>
                  <Text type="secondary">
                    Управляйте правами доступа пользователей к различным разделам системы.
                    Отметьте галочками страницы, к которым должны иметь доступ пользователи с определенной ролью.
                  </Text>
                </div>

                <Table
                  columns={columns}
                  dataSource={dataSource}
                  pagination={false}
                  scroll={{ x: 1800 }}
                  bordered
                  size="middle"
                />

                <div style={{ marginTop: '16px' }}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSaveAccessMatrix}
                    loading={loading}
                    size="large"
                  >
                    Сохранить изменения
                  </Button>
                </div>

                <div style={{ marginTop: '16px', padding: '12px', background: '#f0f5ff', borderRadius: '4px' }}>
                  <Text type="secondary">
                    <strong>Примечание:</strong> Роль "Суперадмин" имеет полный доступ ко всем страницам и не отображается в матрице.
                    Изменения вступят в силу после сохранения и обновления страницы пользователями.
                  </Text>
                </div>
              </Space>
            </TabPane>
          )}

          {/* Вкладка: Корзина (только для определенных ролей) */}
          {canAccessPermissions() && (
            <TabPane
              tab={
                <span>
                  <DeleteOutlined />
                  Корзина
                </span>
              }
              key="recycle-bin"
            >
              <RecycleBin />
            </TabPane>
          )}
        </Tabs>
      </Card>
    </div>
  )
}

export default Settings
