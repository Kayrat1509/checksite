// Система поэтапного согласования заявок на строительные материалы
// requests.stroyka.asia (http://localhost:5175)

import { useState, useEffect } from 'react'
import {
  Typography,
  Card,
  Tabs,
  Table,
  Space,
  Button,
  Tag,
  Empty,
  Modal,
  Input,
  InputNumber,
  Select,
  message,
  Descriptions,
  Badge,
  Row,
  Col,
  Statistic,
} from 'antd'
import {
  FileTextOutlined,
  CheckOutlined,
  CloseOutlined,
  DollarOutlined,
  InboxOutlined,
  CarOutlined,
  EyeOutlined,
  FilterOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { materialRequestsAPI, MaterialRequest } from '../api/materialRequests'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const MaterialRequests = () => {
  // Состояния
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<MaterialRequest[]>([])
  const [activeTab, setActiveTab] = useState<string>('all')
  const [selectedRequest, setSelectedRequest] = useState<MaterialRequest | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [approveModalVisible, setApproveModalVisible] = useState(false)
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [paidModalVisible, setPaidModalVisible] = useState(false)
  const [deliveredModalVisible, setDeliveredModalVisible] = useState(false)
  const [comment, setComment] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [actualQuantities, setActualQuantities] = useState<Record<number, number>>({})

  // Фильтры
  const [filterProject, setFilterProject] = useState<number | undefined>()
  const [filterAuthor, setFilterAuthor] = useState<number | undefined>()
  const [projects, setProjects] = useState<Array<{ id: number; name: string }>>([])
  const [users, setUsers] = useState<Array<{ id: number; full_name: string }>>([])

  // Загрузка данных при монтировании
  useEffect(() => {
    loadData()
    loadFilters()
    // Автообновление каждые 30 секунд
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Загрузка заявок
  const loadData = async () => {
    setLoading(true)
    try {
      const data = await materialRequestsAPI.getAll()
      // Обрабатываем случай, когда API возвращает объект с results
      setRequests(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Ошибка загрузки заявок:', error)
      message.error('Не удалось загрузить заявки')
      setRequests([]) // Устанавливаем пустой массив при ошибке
    } finally {
      setLoading(false)
    }
  }

  // Загрузка данных для фильтров
  const loadFilters = async () => {
    try {
      const [projectsData, usersData] = await Promise.all([
        materialRequestsAPI.getProjects(),
        materialRequestsAPI.getUsers(),
      ])
      setProjects(Array.isArray(projectsData) ? projectsData : [])
      setUsers(Array.isArray(usersData) ? usersData : [])
    } catch (error) {
      console.error('Ошибка загрузки фильтров:', error)
      // Не показываем ошибку пользователю, просто оставляем фильтры пустыми
      setProjects([])
      setUsers([])
    }
  }

  // Фильтрация данных по вкладкам
  const getFilteredData = (): MaterialRequest[] => {
    let filtered = requests

    // Фильтр по проекту
    if (filterProject) {
      filtered = filtered.filter((req) => req.project.id === filterProject)
    }

    // Фильтр по автору
    if (filterAuthor) {
      filtered = filtered.filter((req) => req.author.id === filterAuthor)
    }

    // Фильтр по вкладке
    switch (activeTab) {
      case 'approval':
        return filtered.filter((req) =>
          req.status.includes('approval') || req.status === 'draft'
        )
      case 'approved':
        return filtered.filter((req) => req.status === 'approved')
      case 'payment':
        return filtered.filter((req) => req.status === 'payment')
      case 'delivery':
        return filtered.filter((req) => req.status === 'delivery')
      case 'completed':
        return filtered.filter((req) => req.status === 'completed')
      default:
        return filtered
    }
  }

  // Получить цвет статуса
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      draft: 'default',
      pto_approval: 'processing',
      pm_approval: 'processing',
      chief_engineer_approval: 'processing',
      director_approval: 'processing',
      warehouse_approval: 'processing',
      procurement_approval: 'processing',
      approved: 'success',
      payment: 'warning',
      delivery: 'cyan',
      completed: 'success',
      rejected: 'error',
    }
    return colors[status] || 'default'
  }

  // Обработчики действий
  const handleViewDetail = (record: MaterialRequest) => {
    setSelectedRequest(record)
    setDetailModalVisible(true)
  }

  const handleApprove = async () => {
    if (!selectedRequest) return
    try {
      await materialRequestsAPI.approve(selectedRequest.id, comment)
      message.success('Заявка успешно согласована')
      setApproveModalVisible(false)
      setComment('')
      loadData()
    } catch (error) {
      message.error('Ошибка при согласовании заявки')
    }
  }

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason) {
      message.warning('Укажите причину отклонения')
      return
    }
    try {
      await materialRequestsAPI.reject(selectedRequest.id, rejectionReason)
      message.warning('Заявка отправлена на доработку')
      setRejectModalVisible(false)
      setRejectionReason('')
      loadData()
    } catch (error) {
      message.error('Ошибка при отклонении заявки')
    }
  }

  const handleMarkPaid = async () => {
    if (!selectedRequest) return
    try {
      await materialRequestsAPI.markPaid(selectedRequest.id, comment)
      message.success('Заявка отмечена как оплаченная')
      setPaidModalVisible(false)
      setComment('')
      loadData()
    } catch (error) {
      message.error('Ошибка при отметке оплаты')
    }
  }

  const handleMarkDelivered = async () => {
    if (!selectedRequest) return
    const items = Object.entries(actualQuantities).map(([itemId, quantity]) => ({
      item_id: Number(itemId),
      quantity_actual: quantity,
    }))
    try {
      await materialRequestsAPI.markDelivered(selectedRequest.id, items, comment)
      message.success('Материал принят')
      setDeliveredModalVisible(false)
      setActualQuantities({})
      setComment('')
      loadData()
    } catch (error) {
      message.error('Ошибка при приемке материала')
    }
  }

  // Колонки таблицы
  const columns: ColumnsType<MaterialRequest> = [
    {
      title: '№ заявки',
      dataIndex: 'number',
      key: 'number',
      width: 120,
      fixed: 'left',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Проект',
      dataIndex: ['project', 'name'],
      key: 'project',
      width: 200,
    },
    {
      title: 'Автор',
      dataIndex: ['author', 'full_name'],
      key: 'author',
      width: 150,
    },
    {
      title: 'Позиций',
      key: 'items_count',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Badge count={record.items?.length || 0} showZero color="blue" />
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status_display',
      key: 'status',
      width: 250,
      render: (text, record) => (
        <Tag color={getStatusColor(record.status)}>{text}</Tag>
      ),
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date) => new Date(date).toLocaleDateString('ru-RU'),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 250,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            Просмотр
          </Button>
          {activeTab === 'approval' && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => {
                  setSelectedRequest(record)
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
                  setSelectedRequest(record)
                  setRejectModalVisible(true)
                }}
              >
                Вернуть
              </Button>
            </>
          )}
          {activeTab === 'payment' && (
            <Button
              size="small"
              type="primary"
              icon={<DollarOutlined />}
              onClick={() => {
                setSelectedRequest(record)
                setPaidModalVisible(true)
              }}
            >
              Оплачено
            </Button>
          )}
          {activeTab === 'delivery' && (
            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => {
                setSelectedRequest(record)
                const quantities: Record<number, number> = {}
                record.items?.forEach((item) => {
                  if (item.id) quantities[item.id] = item.quantity_requested
                })
                setActualQuantities(quantities)
                setDeliveredModalVisible(true)
              }}
            >
              Принято
            </Button>
          )}
        </Space>
      ),
    },
  ]

  // Статистика
  const stats = {
    total: requests.length,
    approval: requests.filter((r) => r.status.includes('approval')).length,
    approved: requests.filter((r) => r.status === 'approved').length,
    payment: requests.filter((r) => r.status === 'payment').length,
    delivery: requests.filter((r) => r.status === 'delivery').length,
    completed: requests.filter((r) => r.status === 'completed').length,
  }

  // Вкладки
  const tabItems = [
    {
      key: 'all',
      label: `Все заявки (${stats.total})`,
      children: null,
    },
    {
      key: 'approval',
      label: `На согласовании (${stats.approval})`,
      children: null,
    },
    {
      key: 'approved',
      label: `Согласованные (${stats.approved})`,
      children: null,
    },
    {
      key: 'payment',
      label: `На оплате (${stats.payment})`,
      children: null,
    },
    {
      key: 'delivery',
      label: `На доставке (${stats.delivery})`,
      children: null,
    },
    {
      key: 'completed',
      label: `Отработанные (${stats.completed})`,
      children: null,
    },
  ]

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* Заголовок и статистика */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Title level={2} style={{ margin: 0 }}>
              Система согласования заявок на материалы
            </Title>
            <Paragraph style={{ margin: '8px 0 0 0', color: '#666' }}>
              Поэтапное согласование: Мастер/Прораб → Начальник участка → Инженер ПТО →
              Руководитель проекта → Главный инженер → Директор → Завсклад → Снабженец
            </Paragraph>
          </Col>
          <Col>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadData}
              loading={loading}
            >
              Обновить
            </Button>
          </Col>
        </Row>

        {/* Статистика */}
        <Row gutter={16} style={{ marginTop: '24px' }}>
          <Col span={4}>
            <Statistic
              title="Всего заявок"
              value={stats.total}
              prefix={<FileTextOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="На согласовании"
              value={stats.approval}
              valueStyle={{ color: '#1890ff' }}
              prefix={<CloseOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="Согласованные"
              value={stats.approved}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="На оплате"
              value={stats.payment}
              valueStyle={{ color: '#faad14' }}
              prefix={<DollarOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="На доставке"
              value={stats.delivery}
              valueStyle={{ color: '#13c2c2' }}
              prefix={<CarOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="Отработанные"
              value={stats.completed}
              valueStyle={{ color: '#52c41a' }}
              prefix={<InboxOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* Фильтры */}
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col>
            <FilterOutlined style={{ fontSize: '16px', marginRight: '8px' }} />
            <Text strong>Фильтры:</Text>
          </Col>
          <Col span={6}>
            <Select
              placeholder="Выберите проект"
              style={{ width: '100%' }}
              allowClear
              value={filterProject}
              onChange={setFilterProject}
              options={projects.map((p) => ({ label: p.name, value: p.id }))}
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="Выберите автора"
              style={{ width: '100%' }}
              allowClear
              value={filterAuthor}
              onChange={setFilterAuthor}
              options={users.map((u) => ({ label: u.full_name, value: u.id }))}
            />
          </Col>
        </Row>
      </Card>

      {/* Таблица с вкладками */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />

        <Table
          columns={columns}
          dataSource={getFilteredData()}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Всего: ${total} заявок`,
          }}
          scroll={{ x: 1400 }}
          locale={{
            emptyText: <Empty description="Нет заявок" />,
          }}
        />
      </Card>

      {/* Модальное окно просмотра */}
      <Modal
        title={`Заявка ${selectedRequest?.number}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Закрыть
          </Button>,
        ]}
        width={800}
      >
        {selectedRequest && (
          <>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Проект" span={2}>
                {selectedRequest.project.name}
              </Descriptions.Item>
              <Descriptions.Item label="Автор">
                {selectedRequest.author.full_name}
              </Descriptions.Item>
              <Descriptions.Item label="Роль автора">
                {selectedRequest.author.role}
              </Descriptions.Item>
              <Descriptions.Item label="Статус" span={2}>
                <Tag color={getStatusColor(selectedRequest.status)}>
                  {selectedRequest.status_display}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Дата создания">
                {new Date(selectedRequest.created_at).toLocaleString('ru-RU')}
              </Descriptions.Item>
              <Descriptions.Item label="Последнее обновление">
                {new Date(selectedRequest.updated_at).toLocaleString('ru-RU')}
              </Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ marginTop: '24px' }}>
              Позиции заявки:
            </Title>
            <Table
              dataSource={selectedRequest.items || []}
              columns={[
                { title: '№', key: 'index', render: (_, __, index) => index + 1, width: 50 },
                { title: 'Материал', dataIndex: 'material_name', key: 'material' },
                { title: 'Ед. изм.', dataIndex: 'unit', key: 'unit', width: 80 },
                {
                  title: 'Кол-во по заявке',
                  dataIndex: 'quantity_requested',
                  key: 'requested',
                  width: 130,
                },
                {
                  title: 'Кол-во по факту',
                  dataIndex: 'quantity_actual',
                  key: 'actual',
                  width: 130,
                  render: (val) => val || '-',
                },
                { title: 'Примечания', dataIndex: 'notes', key: 'notes', render: (val) => val || '-' },
              ]}
              pagination={false}
              size="small"
            />
          </>
        )}
      </Modal>

      {/* Модальное окно согласования */}
      <Modal
        title="Согласовать заявку"
        open={approveModalVisible}
        onOk={handleApprove}
        onCancel={() => {
          setApproveModalVisible(false)
          setComment('')
        }}
        okText="Согласовать"
        cancelText="Отмена"
      >
        <Paragraph>
          Вы уверены, что хотите согласовать заявку <Text strong>{selectedRequest?.number}</Text>?
        </Paragraph>
        <TextArea
          rows={3}
          placeholder="Комментарий (необязательно)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </Modal>

      {/* Модальное окно отклонения */}
      <Modal
        title="Вернуть на доработку"
        open={rejectModalVisible}
        onOk={handleReject}
        onCancel={() => {
          setRejectModalVisible(false)
          setRejectionReason('')
        }}
        okText="Вернуть"
        cancelText="Отмена"
        okButtonProps={{ danger: true }}
      >
        <Paragraph>
          Укажите причину возврата заявки <Text strong>{selectedRequest?.number}</Text> на доработку:
        </Paragraph>
        <TextArea
          rows={4}
          placeholder="Причина отклонения (обязательно)"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          required
        />
      </Modal>

      {/* Модальное окно оплаты */}
      <Modal
        title="Отметить как оплачено"
        open={paidModalVisible}
        onOk={handleMarkPaid}
        onCancel={() => {
          setPaidModalVisible(false)
          setComment('')
        }}
        okText="Оплачено"
        cancelText="Отмена"
      >
        <Paragraph>
          Отметить заявку <Text strong>{selectedRequest?.number}</Text> как оплаченную?
        </Paragraph>
        <TextArea
          rows={3}
          placeholder="Комментарий (необязательно)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </Modal>

      {/* Модальное окно приемки */}
      <Modal
        title="Принять материал"
        open={deliveredModalVisible}
        onOk={handleMarkDelivered}
        onCancel={() => {
          setDeliveredModalVisible(false)
          setActualQuantities({})
          setComment('')
        }}
        okText="Принять"
        cancelText="Отмена"
        width={800}
      >
        <Paragraph>
          Укажите фактическое количество полученного материала по заявке{' '}
          <Text strong>{selectedRequest?.number}</Text>:
        </Paragraph>
        <Table
          dataSource={selectedRequest?.items || []}
          columns={[
            { title: 'Материал', dataIndex: 'material_name', key: 'material' },
            { title: 'Ед. изм.', dataIndex: 'unit', key: 'unit', width: 80 },
            {
              title: 'По заявке',
              dataIndex: 'quantity_requested',
              key: 'requested',
              width: 100,
            },
            {
              title: 'Фактически',
              key: 'actual',
              width: 150,
              render: (_, record) => (
                <InputNumber
                  min={0}
                  value={actualQuantities[record.id!]}
                  onChange={(val) =>
                    setActualQuantities({ ...actualQuantities, [record.id!]: val || 0 })
                  }
                  style={{ width: '100%' }}
                />
              ),
            },
          ]}
          pagination={false}
          size="small"
        />
        <TextArea
          rows={3}
          placeholder="Комментарий (необязательно)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={{ marginTop: '16px' }}
        />
      </Modal>
    </div>
  )
}

export default MaterialRequests
