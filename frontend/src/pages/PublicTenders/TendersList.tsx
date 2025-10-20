import { useState, useEffect } from 'react'
import {
  Table,
  Card,
  Typography,
  Space,
  Button,
  Input,
  Select,
  InputNumber,
  Row,
  Col,
  Tag,
  Modal,
  Descriptions,
  message,
  Divider
} from 'antd'
import {
  SearchOutlined,
  FilterOutlined,
  LogoutOutlined,
  EyeOutlined,
  MailOutlined,
  PhoneOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { publicTendersAPI, PublicTender, TenderFilters } from '../../api/publicTenders'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import './PublicTenders.css'

const { Title, Text, Paragraph } = Typography
const { Option } = Select

dayjs.locale('ru')

const TendersList = () => {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<TenderFilters>({
    page: 1,
    page_size: 20
  })
  const [selectedTender, setSelectedTender] = useState<PublicTender | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)

  // Получить информацию о текущем пользователе
  const currentUser = publicTendersAPI.getCurrentUser()

  // Проверка авторизации при загрузке компонента
  useEffect(() => {
    if (!publicTendersAPI.isAuthenticated()) {
      message.warning('Необходимо войти в систему')
      navigate('/public-tenders/login')
    }
  }, [navigate])

  // Загрузка списка тендеров
  const { data: tendersData, isLoading, refetch } = useQuery({
    queryKey: ['publicTenders', filters],
    queryFn: () => publicTendersAPI.getList(filters),
    enabled: publicTendersAPI.isAuthenticated()
  })

  // Обработка выхода
  const handleLogout = () => {
    publicTendersAPI.logout()
    message.success('Вы вышли из системы')
    navigate('/public-tenders/login')
  }

  // Открыть детали тендера
  const handleViewDetails = (tender: PublicTender) => {
    setSelectedTender(tender)
    setDetailModalVisible(true)
  }

  // Применить фильтры
  const handleFilterChange = (key: keyof TenderFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Сброс на первую страницу при изменении фильтров
    }))
  }

  // Сброс всех фильтров
  const handleResetFilters = () => {
    setFilters({
      page: 1,
      page_size: 20
    })
  }

  // Форматирование бюджета
  const formatBudget = (budget: string | null) => {
    if (!budget) return 'Принимаем предложения'
    const num = parseFloat(budget)
    return num.toLocaleString('ru-RU')
  }

  // Цвет статуса тендера
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'default',
      PUBLISHED: 'blue',
      IN_PROGRESS: 'processing',
      CLOSED: 'success',
      CANCELLED: 'error'
    }
    return colors[status] || 'default'
  }

  // Текст статуса на русском
  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      DRAFT: 'Черновик',
      PUBLISHED: 'Опубликован',
      IN_PROGRESS: 'В работе',
      CLOSED: 'Закрыт',
      CANCELLED: 'Отменен'
    }
    return texts[status] || status
  }

  // Тип тендера на русском
  const getTenderTypeText = (type: string) => {
    const types: Record<string, string> = {
      MATERIALS: 'Материалы',
      WORKS: 'Работы',
      EQUIPMENT: 'Оборудование',
      SERVICES: 'Услуги'
    }
    return types[type] || type
  }

  // Колонки таблицы
  const columns = [
    {
      title: 'Название',
      dataIndex: 'title',
      key: 'title',
      width: 250,
      fixed: 'left' as const,
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Тип',
      dataIndex: 'tender_type',
      key: 'tender_type',
      width: 120,
      render: (type: string) => (
        <Tag color="blue">{getTenderTypeText(type)}</Tag>
      )
    },
    {
      title: 'Проект',
      dataIndex: 'project_name',
      key: 'project_name',
      width: 200
    },
    {
      title: 'Компания',
      dataIndex: 'company_name',
      key: 'company_name',
      width: 200,
      render: (text: string) => text || '—'
    },
    {
      title: 'Город',
      dataIndex: 'city',
      key: 'city',
      width: 120,
      render: (text: string) => text || '—'
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      )
    },
    {
      title: 'Бюджет (₸)',
      dataIndex: 'budget',
      key: 'budget',
      width: 150,
      render: (budget: string | null) => (
        budget ? (
          <Text strong>{formatBudget(budget)} ₸</Text>
        ) : (
          <Text type="secondary">Принимаем предложения</Text>
        )
      )
    },
    {
      title: 'Контакты РП',
      key: 'contacts',
      width: 200,
      render: (record: PublicTender) => (
        <div>
          <div>
            <Text strong>{record.project_manager_name}</Text>
          </div>
          {record.project_manager_phone && (
            <div style={{ fontSize: 12 }}>
              <PhoneOutlined /> {record.project_manager_phone}
            </div>
          )}
          {record.project_manager_email && (
            <div style={{ fontSize: 12 }}>
              <MailOutlined /> {record.project_manager_email}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      render: (record: PublicTender) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
        >
          Просмотр
        </Button>
      )
    }
  ]

  return (
    <div className="public-tenders-list-page">
      <div className="public-tenders-list-container">
        {/* Заголовок и информация о пользователе */}
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={2} style={{ margin: 0 }}>База тендеров</Title>
              {currentUser.company && (
                <Text type="secondary">
                  Компания: {currentUser.company}
                </Text>
              )}
            </Col>
            <Col>
              <Button
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                danger
              >
                Выйти
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Фильтры */}
        <Card
          title={
            <Space>
              <FilterOutlined />
              <span>Фильтры</span>
            </Space>
          }
          extra={
            <Button onClick={handleResetFilters}>
              Сбросить
            </Button>
          }
          style={{ marginBottom: 16 }}
        >
          <Row gutter={[16, 16]}>
            {/* Поиск */}
            <Col xs={24} sm={12} lg={8}>
              <Input
                placeholder="Поиск по названию, описанию, компании"
                prefix={<SearchOutlined />}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                allowClear
              />
            </Col>

            {/* Тип тендера */}
            <Col xs={24} sm={12} lg={6}>
              <Select
                placeholder="Тип тендера"
                value={filters.tender_type}
                onChange={(value) => handleFilterChange('tender_type', value)}
                allowClear
                style={{ width: '100%' }}
              >
                <Option value="MATERIALS">Материалы</Option>
                <Option value="WORKS">Работы</Option>
                <Option value="EQUIPMENT">Оборудование</Option>
                <Option value="SERVICES">Услуги</Option>
              </Select>
            </Col>

            {/* Город */}
            <Col xs={24} sm={12} lg={6}>
              <Input
                placeholder="Город"
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                allowClear
              />
            </Col>

            {/* Бюджет от */}
            <Col xs={12} sm={6} lg={4}>
              <InputNumber
                placeholder="Бюджет от"
                value={filters.budget_min}
                onChange={(value) => handleFilterChange('budget_min', value)}
                style={{ width: '100%' }}
                min={0}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              />
            </Col>

            {/* Бюджет до */}
            <Col xs={12} sm={6} lg={4}>
              <InputNumber
                placeholder="Бюджет до"
                value={filters.budget_max}
                onChange={(value) => handleFilterChange('budget_max', value)}
                style={{ width: '100%' }}
                min={0}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              />
            </Col>

            {/* Сортировка */}
            <Col xs={24} sm={12} lg={6}>
              <Select
                placeholder="Сортировка"
                value={filters.ordering}
                onChange={(value) => handleFilterChange('ordering', value)}
                allowClear
                style={{ width: '100%' }}
              >
                <Option value="-created_at">Новые первые</Option>
                <Option value="created_at">Старые первые</Option>
                <Option value="budget">Бюджет: по возрастанию</Option>
                <Option value="-budget">Бюджет: по убыванию</Option>
              </Select>
            </Col>
          </Row>
        </Card>

        {/* Таблица тендеров */}
        <Card>
          <Table
            columns={columns}
            dataSource={tendersData?.results || []}
            rowKey="id"
            loading={isLoading}
            scroll={{ x: 1400 }}
            pagination={{
              current: filters.page,
              pageSize: filters.page_size,
              total: tendersData?.count || 0,
              showTotal: (total) => `Всего: ${total} тендеров`,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              onChange: (page, pageSize) => {
                setFilters(prev => ({
                  ...prev,
                  page,
                  page_size: pageSize
                }))
              }
            }}
          />
        </Card>

        {/* Модальное окно с деталями тендера */}
        <Modal
          title="Детали тендера"
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setDetailModalVisible(false)}>
              Закрыть
            </Button>
          ]}
          width={800}
        >
          {selectedTender && (
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Название">
                <Text strong>{selectedTender.title}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Описание">
                {selectedTender.description ? (
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedTender.description}
                  </div>
                ) : (
                  '—'
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Тип">
                <Tag color="blue">{getTenderTypeText(selectedTender.tender_type)}</Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Проект">
                {selectedTender.project_name}
              </Descriptions.Item>

              <Descriptions.Item label="Компания">
                {selectedTender.company_name || '—'}
              </Descriptions.Item>

              <Descriptions.Item label="Город">
                {selectedTender.city || '—'}
              </Descriptions.Item>

              <Descriptions.Item label="Статус">
                <Tag color={getStatusColor(selectedTender.status)}>
                  {getStatusText(selectedTender.status)}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Бюджет">
                {selectedTender.budget ? (
                  <Text strong>{formatBudget(selectedTender.budget)} ₸</Text>
                ) : (
                  <Text type="secondary">Принимаем предложения</Text>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Срок исполнения">
                {selectedTender.execution_period || '—'}
              </Descriptions.Item>

              {selectedTender.start_date && (
                <Descriptions.Item label="Дата начала">
                  {dayjs(selectedTender.start_date).format('DD MMMM YYYY')}
                </Descriptions.Item>
              )}

              {selectedTender.end_date && (
                <Descriptions.Item label="Дата окончания">
                  {dayjs(selectedTender.end_date).format('DD MMMM YYYY')}
                </Descriptions.Item>
              )}

              <Descriptions.Item label="Дата публикации">
                {dayjs(selectedTender.created_at).format('DD MMMM YYYY, HH:mm')}
              </Descriptions.Item>

              <Descriptions.Item label="Контактное лицо">
                <div>
                  <div><Text strong>{selectedTender.project_manager_name}</Text></div>
                  <Divider style={{ margin: '8px 0' }} />
                  {selectedTender.project_manager_phone && (
                    <div style={{ marginTop: 4 }}>
                      <PhoneOutlined /> <a href={`tel:${selectedTender.project_manager_phone}`}>{selectedTender.project_manager_phone}</a>
                    </div>
                  )}
                  {selectedTender.project_manager_email && (
                    <div style={{ marginTop: 4 }}>
                      <MailOutlined /> <a href={`mailto:${selectedTender.project_manager_email}`}>{selectedTender.project_manager_email}</a>
                    </div>
                  )}
                </div>
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
      </div>
    </div>
  )
}

export default TendersList
