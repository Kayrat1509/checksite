// Система поэтапного согласования заявок на строительные материалы
// requests.stroyka.asia (http://localhost:5175)
// ВАЖНО: Таблицы показывают ПОЗИЦИИ материалов, а не заявки целиком

import { useState, useEffect } from 'react'
import {
  Typography,
  Card,
  Tabs,
  Table,
  Space,
  Button,
  Tag,
  Modal,
  Input,
  InputNumber,
  message,
  Row,
  Col,
  Statistic,
  Form,
  Select,
} from 'antd'
import {
  CheckOutlined,
  CloseOutlined,
  DollarOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { materialRequestsAPI, MaterialRequest, MaterialRequestItem } from '../api/materialRequests'
import { buttonAccessAPI } from '../api/buttonAccess'

const { Title, Text } = Typography
const { TextArea } = Input

// Расширенный тип для позиции с информацией о заявке
interface MaterialItemWithRequest extends MaterialRequestItem {
  requestId: number
  requestNumber: string
  projectName: string
  authorName: string
  authorRole: string
  status: string
  statusDisplay: string
  currentApproverRole?: string | null
}

const MaterialRequests = () => {
  // Состояния
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<MaterialRequest[]>([])
  const [activeTab, setActiveTab] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<MaterialItemWithRequest | null>(null)
  const [comment, setComment] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [actualQuantity, setActualQuantity] = useState<number>(0)

  // Модальные окна
  const [approveModalVisible, setApproveModalVisible] = useState(false)
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [paidModalVisible, setPaidModalVisible] = useState(false)
  const [deliveredModalVisible, setDeliveredModalVisible] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)

  // Состояния для создания заявки
  const [canCreate, setCanCreate] = useState(false)
  const [projects, setProjects] = useState<Array<{ id: number; name: string }>>([])
  const [createForm] = Form.useForm()

  // Загрузка данных при монтировании
  useEffect(() => {
    loadData()
    loadButtonAccess()
    loadProjects()
    // Автообновление каждые 30 секунд
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Проверка доступа к кнопке создания
  const loadButtonAccess = async () => {
    try {
      const buttons = await buttonAccessAPI.getByPage('material-requests')
      const hasCreateAccess = buttons.some((btn) => btn.button_key === 'create')
      setCanCreate(hasCreateAccess)
    } catch (error) {
      console.error('Ошибка загрузки прав доступа:', error)
      setCanCreate(false)
    }
  }

  // Загрузка списка проектов
  const loadProjects = async () => {
    try {
      const data = await materialRequestsAPI.getProjects()
      setProjects(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Ошибка загрузки проектов:', error)
      setProjects([])
    }
  }

  // Загрузка заявок
  const loadData = async () => {
    setLoading(true)
    try {
      const data = await materialRequestsAPI.getAll()
      setRequests(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Ошибка загрузки заявок:', error)
      message.error('Не удалось загрузить заявки')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  // Преобразование заявок в плоский список позиций материалов
  const getItemsWithRequestInfo = (): MaterialItemWithRequest[] => {
    const items: MaterialItemWithRequest[] = []

    requests.forEach((request) => {
      request.items?.forEach((item) => {
        items.push({
          ...item,
          requestId: request.id,
          requestNumber: request.number,
          projectName: request.project?.name || 'Без проекта',
          authorName: request.created_by ? `${request.created_by.first_name} ${request.created_by.last_name}` : 'Неизвестно',
          authorRole: request.created_by?.role || '',
          status: request.status,
          statusDisplay: request.status_display,
          currentApproverRole: request.current_approver_role,
        })
      })
    })

    return items
  }

  // Фильтрация позиций по вкладкам
  const getFilteredItems = (): MaterialItemWithRequest[] => {
    const allItems = getItemsWithRequestInfo()

    switch (activeTab) {
      case 'approval':
        return allItems.filter((item) =>
          item.status.includes('APPROVAL') || item.status === 'DRAFT'
        )
      case 'approved':
        return allItems.filter((item) => item.status === 'APPROVED')
      case 'payment':
        return allItems.filter((item) =>
          item.status === 'PAYMENT' || item.status === 'PROCUREMENT'
        )
      case 'delivery':
        return allItems.filter((item) => item.status === 'DELIVERY')
      case 'completed':
        return allItems.filter((item) => item.status === 'COMPLETED')
      default:
        return allItems
    }
  }

  // Получить цвет статуса
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      DRAFT: 'default',
      SITE_MANAGER_APPROVAL: 'processing',
      ENGINEER_APPROVAL: 'processing',
      PM_APPROVAL: 'processing',
      CHIEF_POWER_APPROVAL: 'processing',
      CHIEF_ENGINEER_APPROVAL: 'processing',
      DIRECTOR_APPROVAL: 'processing',
      APPROVED: 'success',
      WAREHOUSE_REVIEW: 'blue',
      PROCUREMENT: 'orange',
      PAYMENT: 'warning',
      DELIVERY: 'cyan',
      COMPLETED: 'success',
      REJECTED: 'error',
    }
    return colors[status] || 'default'
  }

  // Обработчики действий
  const handleApprove = async () => {
    if (!selectedItem) return
    try {
      await materialRequestsAPI.approve(selectedItem.requestId, comment)
      message.success('Позиция согласована')
      setApproveModalVisible(false)
      setComment('')
      loadData()
    } catch (error) {
      message.error('Ошибка при согласовании')
    }
  }

  const handleReject = async () => {
    if (!selectedItem || !rejectionReason) {
      message.warning('Укажите причину возврата на доработку')
      return
    }
    try {
      await materialRequestsAPI.reject(selectedItem.requestId, rejectionReason)
      message.warning('Заявка возвращена на доработку')
      setRejectModalVisible(false)
      setRejectionReason('')
      loadData()
    } catch (error) {
      message.error('Ошибка при возврате на доработку')
    }
  }

  const handleMarkPaid = async () => {
    if (!selectedItem) return
    try {
      await materialRequestsAPI.markPaid(selectedItem.requestId, comment)
      message.success('Позиция отмечена как оплаченная')
      setPaidModalVisible(false)
      setComment('')
      loadData()
    } catch (error) {
      message.error('Ошибка при отметке оплаты')
    }
  }

  const handleMarkDelivered = async () => {
    if (!selectedItem || !selectedItem.id) return
    try {
      await materialRequestsAPI.markDelivered(
        selectedItem.requestId,
        [{ item_id: selectedItem.id, quantity_actual: actualQuantity }],
        comment
      )
      message.success('Материал принят')
      setDeliveredModalVisible(false)
      setActualQuantity(0)
      setComment('')
      loadData()
    } catch (error) {
      message.error('Ошибка при приемке материала')
    }
  }

  // Обработчик создания заявки
  const handleCreateRequest = async (values: any) => {
    try {
      const createData = {
        project_id: values.project_id,
        items_data: values.items.map((item: any, index: number) => ({
          material_name: item.material_name,
          unit: item.unit,
          quantity_requested: item.quantity_requested,
          notes: item.notes || '',
          order: index,
        })),
      }

      await materialRequestsAPI.create(createData)
      message.success('Заявка успешно создана')
      setCreateModalVisible(false)
      createForm.resetFields()
      loadData()
    } catch (error: any) {
      console.error('Ошибка создания заявки:', error)
      message.error(error.response?.data?.detail || 'Ошибка при создании заявки')
    }
  }

  // Колонки для вкладки "Все заявки"
  const allColumns: ColumnsType<MaterialItemWithRequest> = [
    {
      title: '№ (п/п)',
      key: 'index',
      width: 80,
      fixed: 'left',
      render: (_, __, index) => <Text strong>{index + 1}</Text>,
    },
    {
      title: 'Материал',
      dataIndex: 'material_name',
      key: 'material_name',
      width: 250,
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
    },
    {
      title: 'Кол-во по заявке',
      dataIndex: 'quantity_requested',
      key: 'quantity_requested',
      width: 130,
      align: 'right',
    },
    {
      title: 'Кол-во по факту',
      dataIndex: 'quantity_actual',
      key: 'quantity_actual',
      width: 130,
      align: 'right',
      render: (val) => val || '-',
    },
    {
      title: 'Примечания',
      dataIndex: 'notes',
      key: 'notes',
      width: 200,
      render: (val) => val || '-',
    },
    {
      title: 'Автор',
      dataIndex: 'authorName',
      key: 'authorName',
      width: 150,
    },
    {
      title: 'Статус',
      dataIndex: 'statusDisplay',
      key: 'status',
      width: 200,
      render: (text, record) => (
        <Tag color={getStatusColor(record.status)}>{text}</Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: () => <Text type="secondary">-</Text>,
    },
  ]

  // Колонки для вкладки "На согласовании"
  const approvalColumns: ColumnsType<MaterialItemWithRequest> = [
    {
      title: '№ (п/п)',
      key: 'index',
      width: 80,
      fixed: 'left',
      render: (_, __, index) => <Text strong>{index + 1}</Text>,
    },
    {
      title: 'Материал',
      dataIndex: 'material_name',
      key: 'material_name',
      width: 250,
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
    },
    {
      title: 'Кол-во по заявке',
      dataIndex: 'quantity_requested',
      key: 'quantity_requested',
      width: 130,
      align: 'right',
    },
    {
      title: 'Примечания',
      dataIndex: 'notes',
      key: 'notes',
      width: 200,
      render: (val) => val || '-',
    },
    {
      title: 'Автор',
      dataIndex: 'authorName',
      key: 'authorName',
      width: 150,
    },
    {
      title: 'Статус',
      key: 'status',
      width: 250,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Tag color={getStatusColor(record.status)}>{record.statusDisplay}</Tag>
          {record.currentApproverRole && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Ожидает: {record.currentApproverRole}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => {
              setSelectedItem(record)
              setApproveModalVisible(true)
            }}
          >
            Согласовать
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseOutlined />}
            onClick={() => {
              setSelectedItem(record)
              setRejectModalVisible(true)
            }}
          >
            На доработку
          </Button>
        </Space>
      ),
    },
  ]

  // Колонки для вкладки "Согласованные заявки"
  const approvedColumns: ColumnsType<MaterialItemWithRequest> = [
    {
      title: '№ (п/п)',
      key: 'index',
      width: 80,
      fixed: 'left',
      render: (_, __, index) => <Text strong>{index + 1}</Text>,
    },
    {
      title: 'Материал',
      dataIndex: 'material_name',
      key: 'material_name',
      width: 250,
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
    },
    {
      title: 'Кол-во по заявке',
      dataIndex: 'quantity_requested',
      key: 'quantity_requested',
      width: 130,
      align: 'right',
    },
    {
      title: 'Примечания',
      dataIndex: 'notes',
      key: 'notes',
      width: 200,
      render: (val) => val || '-',
    },
    {
      title: 'Автор',
      dataIndex: 'authorName',
      key: 'authorName',
      width: 150,
    },
    {
      title: 'Статус',
      key: 'status',
      width: 200,
      render: () => (
        <Tag color="success">Согласовано Директором</Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Button
          size="small"
          type="primary"
          icon={<DollarOutlined />}
          onClick={() => {
            setSelectedItem(record)
            setPaidModalVisible(true)
          }}
        >
          На оплату
        </Button>
      ),
    },
  ]

  // Колонки для вкладки "На оплате"
  const paymentColumns: ColumnsType<MaterialItemWithRequest> = [
    {
      title: '№ (п/п)',
      key: 'index',
      width: 80,
      fixed: 'left',
      render: (_, __, index) => <Text strong>{index + 1}</Text>,
    },
    {
      title: 'Материал',
      dataIndex: 'material_name',
      key: 'material_name',
      width: 250,
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
    },
    {
      title: 'Кол-во по заявке',
      dataIndex: 'quantity_requested',
      key: 'quantity_requested',
      width: 130,
      align: 'right',
    },
    {
      title: 'Примечания',
      dataIndex: 'notes',
      key: 'notes',
      width: 200,
      render: (val) => val || '-',
    },
    {
      title: 'Автор',
      dataIndex: 'authorName',
      key: 'authorName',
      width: 150,
    },
    {
      title: 'Статус',
      key: 'status',
      width: 150,
      render: () => <Tag color="warning">На оплате</Tag>,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Button
          size="small"
          type="primary"
          icon={<CheckOutlined />}
          onClick={() => {
            setSelectedItem(record)
            setPaidModalVisible(true)
          }}
        >
          Оплачено
        </Button>
      ),
    },
  ]

  // Колонки для вкладки "На доставке"
  const deliveryColumns: ColumnsType<MaterialItemWithRequest> = [
    {
      title: '№ (п/п)',
      key: 'index',
      width: 80,
      fixed: 'left',
      render: (_, __, index) => <Text strong>{index + 1}</Text>,
    },
    {
      title: 'Материал',
      dataIndex: 'material_name',
      key: 'material_name',
      width: 250,
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
    },
    {
      title: 'Кол-во по заявке',
      dataIndex: 'quantity_requested',
      key: 'quantity_requested',
      width: 130,
      align: 'right',
    },
    {
      title: 'Кол-во по факту',
      key: 'quantity_actual',
      width: 150,
      render: (_, record) => (
        <InputNumber
          min={0}
          max={record.quantity_requested * 2}
          defaultValue={record.quantity_actual || record.quantity_requested}
          style={{ width: '100%' }}
          onChange={(value) => setActualQuantity(value || 0)}
        />
      ),
    },
    {
      title: 'Примечания',
      dataIndex: 'notes',
      key: 'notes',
      width: 200,
      render: (val) => val || '-',
    },
    {
      title: 'Автор',
      dataIndex: 'authorName',
      key: 'authorName',
      width: 150,
    },
    {
      title: 'Статус',
      key: 'status',
      width: 150,
      render: () => <Tag color="cyan">На доставке</Tag>,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Button
          size="small"
          type="primary"
          icon={<CheckOutlined />}
          onClick={() => {
            setSelectedItem(record)
            setActualQuantity(record.quantity_actual || record.quantity_requested)
            setDeliveredModalVisible(true)
          }}
        >
          Принято
        </Button>
      ),
    },
  ]

  // Колонки для вкладки "Отработанные заявки"
  const completedColumns: ColumnsType<MaterialItemWithRequest> = [
    {
      title: '№ (п/п)',
      key: 'index',
      width: 80,
      fixed: 'left',
      render: (_, __, index) => <Text strong>{index + 1}</Text>,
    },
    {
      title: 'Материал',
      dataIndex: 'material_name',
      key: 'material_name',
      width: 250,
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
    },
    {
      title: 'Кол-во по заявке',
      dataIndex: 'quantity_requested',
      key: 'quantity_requested',
      width: 130,
      align: 'right',
    },
    {
      title: 'Кол-во по факту',
      dataIndex: 'quantity_actual',
      key: 'quantity_actual',
      width: 130,
      align: 'right',
      render: (val) => val || '-',
    },
    {
      title: 'Примечания',
      dataIndex: 'notes',
      key: 'notes',
      width: 200,
      render: (val) => val || '-',
    },
    {
      title: 'Автор',
      dataIndex: 'authorName',
      key: 'authorName',
      width: 150,
    },
    {
      title: 'Статус',
      key: 'status',
      width: 220,
      render: () => <Tag color="success">Отработано и доставлено на объект</Tag>,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: () => <Text type="secondary">-</Text>,
    },
  ]

  // Выбор колонок в зависимости от активной вкладки
  const getColumns = (): ColumnsType<MaterialItemWithRequest> => {
    switch (activeTab) {
      case 'approval':
        return approvalColumns
      case 'approved':
        return approvedColumns
      case 'payment':
        return paymentColumns
      case 'delivery':
        return deliveryColumns
      case 'completed':
        return completedColumns
      default:
        return allColumns
    }
  }

  // Статистика
  const allItems = getItemsWithRequestInfo()
  const stats = {
    total: allItems.length,
    approval: allItems.filter((item) => item.status.includes('APPROVAL') || item.status === 'DRAFT').length,
    approved: allItems.filter((item) => item.status === 'APPROVED').length,
    payment: allItems.filter((item) => item.status === 'PAYMENT' || item.status === 'PROCUREMENT').length,
    delivery: allItems.filter((item) => item.status === 'DELIVERY').length,
    completed: allItems.filter((item) => item.status === 'COMPLETED').length,
  }

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* Заголовок */}
      <Card style={{ marginBottom: '24px' }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={2} style={{ margin: 0 }}>
              Система согласования заявок на материалы
            </Title>
            <Space>
              {canCreate && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalVisible(true)}
                >
                  Создать заявку
                </Button>
              )}
              <Button
                icon={<ReloadOutlined />}
                onClick={loadData}
                loading={loading}
              >
                Обновить
              </Button>
            </Space>
          </div>
          <Text type="secondary">
            Поэтапное согласование и контроль доставки строительных материалов
          </Text>
        </Space>
      </Card>

      {/* Статистика */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={4}>
          <Card>
            <Statistic title="Всего позиций" value={stats.total} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="На согласовании" value={stats.approval} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="Согласованные" value={stats.approved} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="На оплате" value={stats.payment} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="На доставке" value={stats.delivery} valueStyle={{ color: '#13c2c2' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="Отработанные" value={stats.completed} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>

      {/* Вкладки с таблицами */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'all',
              label: `Все заявки`,
              children: (
                <Table
                  columns={getColumns()}
                  dataSource={getFilteredItems()}
                  loading={loading}
                  rowKey={(record) => `${record.requestId}-${record.id || Math.random()}`}
                  scroll={{ x: 1500 }}
                  pagination={{ pageSize: 20, showSizeChanger: true }}
                />
              ),
            },
            {
              key: 'approval',
              label: `На согласовании`,
              children: (
                <Table
                  columns={getColumns()}
                  dataSource={getFilteredItems()}
                  loading={loading}
                  rowKey={(record) => `${record.requestId}-${record.id || Math.random()}`}
                  scroll={{ x: 1500 }}
                  pagination={{ pageSize: 20, showSizeChanger: true }}
                />
              ),
            },
            {
              key: 'approved',
              label: `Согласованные заявки`,
              children: (
                <Table
                  columns={getColumns()}
                  dataSource={getFilteredItems()}
                  loading={loading}
                  rowKey={(record) => `${record.requestId}-${record.id || Math.random()}`}
                  scroll={{ x: 1500 }}
                  pagination={{ pageSize: 20, showSizeChanger: true }}
                />
              ),
            },
            {
              key: 'payment',
              label: `На оплате`,
              children: (
                <Table
                  columns={getColumns()}
                  dataSource={getFilteredItems()}
                  loading={loading}
                  rowKey={(record) => `${record.requestId}-${record.id || Math.random()}`}
                  scroll={{ x: 1500 }}
                  pagination={{ pageSize: 20, showSizeChanger: true }}
                />
              ),
            },
            {
              key: 'delivery',
              label: `На доставке`,
              children: (
                <Table
                  columns={getColumns()}
                  dataSource={getFilteredItems()}
                  loading={loading}
                  rowKey={(record) => `${record.requestId}-${record.id || Math.random()}`}
                  scroll={{ x: 1500 }}
                  pagination={{ pageSize: 20, showSizeChanger: true }}
                />
              ),
            },
            {
              key: 'completed',
              label: `Отработанные заявки`,
              children: (
                <Table
                  columns={getColumns()}
                  dataSource={getFilteredItems()}
                  loading={loading}
                  rowKey={(record) => `${record.requestId}-${record.id || Math.random()}`}
                  scroll={{ x: 1500 }}
                  pagination={{ pageSize: 20, showSizeChanger: true }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Модальное окно: Согласование */}
      <Modal
        title="Согласование позиции"
        open={approveModalVisible}
        onOk={handleApprove}
        onCancel={() => {
          setApproveModalVisible(false)
          setComment('')
        }}
        okText="Согласовать"
        cancelText="Отмена"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>Материал:</Text> {selectedItem?.material_name}
          </div>
          <div>
            <Text strong>Количество:</Text> {selectedItem?.quantity_requested} {selectedItem?.unit}
          </div>
          <div>
            <Text>Комментарий (необязательно):</Text>
            <TextArea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Добавьте комментарий к согласованию"
            />
          </div>
        </Space>
      </Modal>

      {/* Модальное окно: Возврат на доработку */}
      <Modal
        title="Возврат на доработку"
        open={rejectModalVisible}
        onOk={handleReject}
        onCancel={() => {
          setRejectModalVisible(false)
          setRejectionReason('')
        }}
        okText="Вернуть на доработку"
        okButtonProps={{ danger: true }}
        cancelText="Отмена"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>Материал:</Text> {selectedItem?.material_name}
          </div>
          <div>
            <Text strong type="danger">Причина возврата (обязательно):</Text>
            <TextArea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Укажите причину возврата на доработку"
            />
          </div>
        </Space>
      </Modal>

      {/* Модальное окно: Отметка об оплате */}
      <Modal
        title="Отметка об оплате"
        open={paidModalVisible}
        onOk={handleMarkPaid}
        onCancel={() => {
          setPaidModalVisible(false)
          setComment('')
        }}
        okText="Отметить как оплачено"
        cancelText="Отмена"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>Материал:</Text> {selectedItem?.material_name}
          </div>
          <div>
            <Text strong>Количество:</Text> {selectedItem?.quantity_requested} {selectedItem?.unit}
          </div>
          <div>
            <Text>Комментарий (необязательно):</Text>
            <TextArea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Добавьте комментарий об оплате"
            />
          </div>
        </Space>
      </Modal>

      {/* Модальное окно: Приемка материала */}
      <Modal
        title="Приемка материала"
        open={deliveredModalVisible}
        onOk={handleMarkDelivered}
        onCancel={() => {
          setDeliveredModalVisible(false)
          setActualQuantity(0)
          setComment('')
        }}
        okText="Принять"
        cancelText="Отмена"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>Материал:</Text> {selectedItem?.material_name}
          </div>
          <div>
            <Text strong>Количество по заявке:</Text> {selectedItem?.quantity_requested} {selectedItem?.unit}
          </div>
          <div>
            <Text strong>Фактическое количество:</Text>
            <InputNumber
              min={0}
              max={(selectedItem?.quantity_requested || 0) * 2}
              value={actualQuantity}
              onChange={(value) => setActualQuantity(value || 0)}
              style={{ width: '100%' }}
              addonAfter={selectedItem?.unit}
            />
          </div>
          <div>
            <Text>Комментарий (необязательно):</Text>
            <TextArea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Добавьте комментарий о приемке"
            />
          </div>
        </Space>
      </Modal>

      {/* Модальное окно: Создание заявки */}
      <Modal
        title="Создание новой заявки на материалы"
        open={createModalVisible}
        onOk={() => createForm.submit()}
        onCancel={() => {
          setCreateModalVisible(false)
          createForm.resetFields()
        }}
        okText="Создать заявку"
        cancelText="Отмена"
        width={800}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateRequest}
          initialValues={{
            items: [{ material_name: '', unit: 'шт', quantity_requested: 1, notes: '' }],
          }}
        >
          <Form.Item
            name="project_id"
            label="Проект"
            rules={[{ required: true, message: 'Выберите проект' }]}
          >
            <Select
              placeholder="Выберите проект"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={projects.map((proj) => ({ label: proj.name, value: proj.id }))}
            />
          </Form.Item>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Позиции материалов:</Text>
                </div>
                {fields.map((field) => (
                  <Card
                    key={`material-item-${field.key}-${field.name}`}
                    size="small"
                    title={`Позиция ${field.name + 1}`}
                    extra={
                      fields.length > 1 && (
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => remove(field.name)}
                        >
                          Удалить
                        </Button>
                      )
                    }
                    style={{ marginBottom: '16px' }}
                  >
                    <Form.Item
                      name={[field.name, 'material_name']}
                      fieldKey={[field.fieldKey, 'material_name']}
                      label="Название материала"
                      rules={[{ required: true, message: 'Введите название материала' }]}
                    >
                      <Input placeholder="Например: Цемент М500" />
                    </Form.Item>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name={[field.name, 'quantity_requested']}
                          fieldKey={[field.fieldKey, 'quantity_requested']}
                          label="Количество"
                          rules={[
                            { required: true, message: 'Введите количество' },
                            { type: 'number', min: 0.001, message: 'Количество должно быть больше 0' },
                          ]}
                        >
                          <InputNumber
                            placeholder="0"
                            style={{ width: '100%' }}
                            min={0.001}
                            step={0.1}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name={[field.name, 'unit']}
                          fieldKey={[field.fieldKey, 'unit']}
                          label="Единица измерения"
                          rules={[{ required: true, message: 'Выберите единицу' }]}
                        >
                          <Select placeholder="Выберите единицу">
                            <Select.Option value="шт">шт</Select.Option>
                            <Select.Option value="кг">кг</Select.Option>
                            <Select.Option value="т">т (тонн)</Select.Option>
                            <Select.Option value="м">м (метров)</Select.Option>
                            <Select.Option value="м2">м² (кв. метров)</Select.Option>
                            <Select.Option value="м3">м³ (куб. метров)</Select.Option>
                            <Select.Option value="л">л (литров)</Select.Option>
                            <Select.Option value="упак">упак (упаковок)</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item
                      name={[field.name, 'notes']}
                      fieldKey={[field.fieldKey, 'notes']}
                      label="Примечания (необязательно)"
                    >
                      <TextArea
                        rows={2}
                        placeholder="Дополнительная информация о материале"
                      />
                    </Form.Item>
                  </Card>
                ))}

                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                  style={{ marginBottom: '16px' }}
                >
                  Добавить позицию
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  )
}

export default MaterialRequests
