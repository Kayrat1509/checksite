/**
 * Компонент "Корзина" для управления удаленными объектами.
 * Позволяет просматривать, восстанавливать и окончательно удалять объекты.
 */

import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Space,
  message,
  Tag,
  Popconfirm,
  Select,
  Statistic,
  Row,
  Col,
  Card,
  Typography,
  Empty,
  Spin,
} from 'antd'
import {
  DeleteOutlined,
  RollbackOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  ClearOutlined,
} from '@ant-design/icons'
import { recycleBinAPI, RecycleBinItem, RecycleBinStats } from '../api/recycleBin'
import { useAuthStore } from '../stores/authStore'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ru'

dayjs.extend(relativeTime)
dayjs.locale('ru')

const { Title, Text } = Typography
const { Option } = Select

const RecycleBin = () => {
  const { user } = useAuthStore()
  const [items, setItems] = useState<RecycleBinItem[]>([])
  const [stats, setStats] = useState<RecycleBinStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [filterModel, setFilterModel] = useState<string | undefined>(undefined)
  const [filterExpiresSoon, setFilterExpiresSoon] = useState(false)

  // Загрузка данных
  const fetchData = async () => {
    setLoading(true)
    try {
      const [itemsData, statsData] = await Promise.all([
        recycleBinAPI.getAll({
          model: filterModel as any,
          expires_soon: filterExpiresSoon || undefined,
        }),
        recycleBinAPI.getStats(),
      ])
      setItems(itemsData)
      setStats(statsData)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка при загрузке данных')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [filterModel, filterExpiresSoon])

  // Восстановление объекта
  const handleRestore = async (item: RecycleBinItem) => {
    try {
      const result = await recycleBinAPI.restore({
        model: item.model_name,
        id: item.id,
      })
      message.success(result.detail || 'Объект успешно восстановлен')
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка при восстановлении')
    }
  }

  // Окончательное удаление
  const handlePermanentDelete = async (item: RecycleBinItem) => {
    try {
      const result = await recycleBinAPI.permanentDelete({
        model: item.model_name,
        id: item.id,
      })
      message.success(result.detail || 'Объект окончательно удален')
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка при удалении')
    }
  }

  // Очистка просроченных
  const handleCleanExpired = async () => {
    try {
      const result = await recycleBinAPI.cleanExpired()
      message.success(result.detail || `Удалено ${result.deleted_count} просроченных объектов`)
      fetchData()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка при очистке')
    }
  }

  // Определение цвета тега модели
  const getModelColor = (modelName: string) => {
    switch (modelName) {
      case 'Project':
        return 'blue'
      case 'User':
        return 'green'
      case 'MaterialRequest':
        return 'orange'
      case 'Tender':
        return 'purple'
      default:
        return 'default'
    }
  }

  // Колонки таблицы
  const columns = [
    {
      title: 'Тип',
      dataIndex: 'model_verbose_name',
      key: 'model_verbose_name',
      width: 180,
      render: (text: string, record: RecycleBinItem) => (
        <Tag color={getModelColor(record.model_name)}>{text}</Tag>
      ),
    },
    {
      title: 'Название',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Удалено',
      dataIndex: 'deleted_at',
      key: 'deleted_at',
      width: 180,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
      sorter: (a: RecycleBinItem, b: RecycleBinItem) =>
        dayjs(a.deleted_at).unix() - dayjs(b.deleted_at).unix(),
    },
    {
      title: 'Удалил',
      dataIndex: 'deleted_by',
      key: 'deleted_by',
      width: 200,
    },
    {
      title: 'Дней до удаления',
      dataIndex: 'days_left',
      key: 'days_left',
      width: 150,
      align: 'center' as const,
      render: (days: number, record: RecycleBinItem) => {
        if (record.expires_soon) {
          return (
            <Tag color="red" icon={<ExclamationCircleOutlined />}>
              {days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}
            </Tag>
          )
        }
        return (
          <Tag color="green" icon={<ClockCircleOutlined />}>
            {days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}
          </Tag>
        )
      },
      sorter: (a: RecycleBinItem, b: RecycleBinItem) => a.days_left - b.days_left,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: RecycleBinItem) => (
        <Space size="small">
          {record.can_restore && (
            <Popconfirm
              title="Восстановить объект?"
              description="Объект будет восстановлен и снова станет доступен."
              onConfirm={() => handleRestore(record)}
              okText="Восстановить"
              cancelText="Отмена"
            >
              <Button
                type="primary"
                size="small"
                icon={<RollbackOutlined />}
                title="Восстановить"
              />
            </Popconfirm>
          )}
          {record.can_delete && (
            <Popconfirm
              title="Удалить навсегда?"
              description="Это действие необратимо. Объект будет удален из базы данных."
              onConfirm={() => handlePermanentDelete(record)}
              okText="Удалить"
              cancelText="Отмена"
              okButtonProps={{ danger: true }}
            >
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                title="Удалить навсегда"
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  // Проверка прав на очистку просроченных
  const canCleanExpired = user?.role === 'SUPERADMIN' || user?.role === 'DIRECTOR'

  return (
    <div>
      {/* Статистика */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={4}>
            <Card>
              <Statistic title="Всего" value={stats.total_items} />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic title="Проекты" value={stats.projects_count} />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic title="Пользователи" value={stats.users_count} />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic title="Заявки" value={stats.material_requests_count} />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic title="Тендеры" value={stats.tenders_count} />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="Срочные"
                value={stats.expires_soon_count}
                valueStyle={{ color: stats.expires_soon_count > 0 ? '#cf1322' : undefined }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Фильтры и действия */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="Тип объекта"
          style={{ width: 200 }}
          allowClear
          value={filterModel}
          onChange={(value) => setFilterModel(value)}
        >
          <Option value="Project">Проекты</Option>
          <Option value="User">Пользователи</Option>
          <Option value="MaterialRequest">Заявки</Option>
          <Option value="Tender">Тендеры</Option>
        </Select>

        <Button
          type={filterExpiresSoon ? 'primary' : 'default'}
          danger={filterExpiresSoon}
          icon={<ExclamationCircleOutlined />}
          onClick={() => setFilterExpiresSoon(!filterExpiresSoon)}
        >
          {filterExpiresSoon ? 'Все объекты' : 'Только срочные'}
        </Button>

        {canCleanExpired && stats && stats.total_items > 0 && (
          <Popconfirm
            title="Очистить просроченные объекты?"
            description="Будут удалены все объекты, находящиеся в корзине более 31 дня."
            onConfirm={handleCleanExpired}
            okText="Очистить"
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<ClearOutlined />}>
              Очистить просроченные
            </Button>
          </Popconfirm>
        )}
      </Space>

      {/* Таблица */}
      <Table
        columns={columns}
        dataSource={items}
        loading={loading}
        rowKey={(record) => `${record.model_name}-${record.id}`}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
        locale={{
          emptyText: (
            <Empty
              description="Корзина пуста"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
        scroll={{ x: 1200 }}
      />

      {/* Информация */}
      <div style={{ marginTop: 16, padding: 12, background: '#f0f5ff', borderRadius: 4 }}>
        <Text type="secondary">
          <strong>Примечание:</strong> Удаленные объекты хранятся в корзине 31 день.
          По истечении этого срока они автоматически удаляются навсегда.
          Восстановленные объекты вернутся в активное состояние со всеми связями и данными.
        </Text>
      </div>
    </div>
  )
}

export default RecycleBin
