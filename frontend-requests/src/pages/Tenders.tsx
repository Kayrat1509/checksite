import { useState } from 'react'
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  message,
  Typography,
  Row,
  Col,
  Card,
  Descriptions,
  Tooltip
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  SendOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tendersAPI, Tender, TenderCreateData, TenderUpdateData } from '../api/tenders'
import { projectsAPI } from '../api/projects'
import { useAuthStore } from '../stores/authStore'
import { useButtonAccess } from '../hooks/useButtonAccess'
import { tripleConfirm } from '../utils/tripleConfirm'
import dayjs from 'dayjs'
import './Tenders.css'

const { Title } = Typography
const { TextArea } = Input
const { RangePicker } = DatePicker

const Tenders = () => {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { canUseButton } = useButtonAccess('tenders') // Проверка доступа к кнопкам
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null)
  const [form] = Form.useForm()

  // Запрос списка тендеров
  const { data: tendersResponse, isLoading } = useQuery({
    queryKey: ['tenders'],
    queryFn: () => tendersAPI.getList()
  })

  // Получаем массив тендеров (API может возвращать массив или объект с results)
  const tenders = Array.isArray(tendersResponse)
    ? tendersResponse
    : tendersResponse?.results || []

  // Запрос списка проектов для селекта (только те, где пользователь является участником)
  const { data: projectsResponse } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.getList()
  })

  // Получаем массив проектов (API может возвращать массив или объект с results)
  const allProjects = Array.isArray(projectsResponse)
    ? projectsResponse
    : projectsResponse?.results || []

  // Фильтруем проекты: показываем только те, где текущий пользователь является участником
  const projects = allProjects.filter((project: any) => {
    // Суперадмин и руководство видят все проекты
    if (user?.is_superuser || ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER'].includes(user?.role || '')) {
      return true
    }
    // Остальные видят только свои проекты (где они в списке team_members)
    // team_members - это массив ID пользователей
    return project.team_members?.includes(user?.id)
  })

  // Мутация создания тендера
  const createMutation = useMutation({
    mutationFn: (data: TenderCreateData) => tendersAPI.create(data),
    onSuccess: () => {
      message.success('Тендер успешно создан')
      queryClient.invalidateQueries({ queryKey: ['tenders'] })
      setIsModalOpen(false)
      form.resetFields()
    },
    onError: () => {
      message.error('Ошибка при создании тендера')
    }
  })

  // Мутация обновления тендера
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TenderUpdateData }) =>
      tendersAPI.update(id, data),
    onSuccess: () => {
      message.success('Тендер успешно обновлен')
      queryClient.invalidateQueries({ queryKey: ['tenders'] })
      setIsModalOpen(false)
      form.resetFields()
      setSelectedTender(null)
    },
    onError: () => {
      message.error('Ошибка при обновлении тендера')
    }
  })

  // Мутация удаления тендера
  const deleteMutation = useMutation({
    mutationFn: (id: number) => tendersAPI.delete(id),
    onSuccess: () => {
      message.success('Тендер успешно удален')
      queryClient.invalidateQueries({ queryKey: ['tenders'] })
    },
    onError: () => {
      message.error('Ошибка при удалении тендера')
    }
  })

  // Мутация публикации тендера
  const publishMutation = useMutation({
    mutationFn: (id: number) => tendersAPI.publish(id),
    onSuccess: () => {
      message.success('Тендер опубликован')
      queryClient.invalidateQueries({ queryKey: ['tenders'] })
    },
    onError: () => {
      message.error('Ошибка при публикации тендера')
    }
  })

  // Мутация закрытия тендера
  const closeMutation = useMutation({
    mutationFn: (id: number) => tendersAPI.close(id),
    onSuccess: () => {
      message.success('Тендер закрыт')
      queryClient.invalidateQueries({ queryKey: ['tenders'] })
    },
    onError: () => {
      message.error('Ошибка при закрытии тендера')
    }
  })

  // Обработчик удаления тендера с тройным подтверждением
  // Принимает объект тендера для отображения его названия в диалогах подтверждения
  const handleDeleteTender = (tender: Tender) => {
    // Используем тройное подтверждение для защиты от случайного удаления
    tripleConfirm({
      itemName: tender.title,
      itemType: 'тендер',
      onConfirm: () => {
        deleteMutation.mutate(tender.id)
      }
    })
  }

  // Открыть модальное окно создания/редактирования
  const handleOpenModal = (tender?: Tender) => {
    if (tender) {
      // Режим редактирования - заполняем данные тендера
      setSelectedTender(tender)
      form.setFieldsValue({
        title: tender.title,
        description: tender.description,
        tender_type: tender.tender_type,
        company_name: tender.company_name,
        city: tender.city,
        project: tender.project,
        budget: tender.budget,
        execution_period: tender.execution_period,
        dates: tender.start_date && tender.end_date
          ? [dayjs(tender.start_date), dayjs(tender.end_date)]
          : null
      })
    } else {
      // Режим создания - автоматически заполняем компанию из данных пользователя
      // Только для пользователей ИТР и Руководства (у них есть company_name)
      if (user?.company_name) {
        form.setFieldsValue({
          company_name: user.company_name
        })
      }
    }
    setIsModalOpen(true)
  }

  // Закрыть модальное окно
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedTender(null)
    form.resetFields()
  }

  // Открыть детальный просмотр
  const handleViewDetail = (tender: Tender) => {
    setSelectedTender(tender)
    setIsDetailModalOpen(true)
  }

  // Сохранить тендер (создание или обновление)
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const data: TenderCreateData = {
        title: values.title,
        description: values.description,
        tender_type: values.tender_type,
        company_name: values.company_name,
        city: values.city,
        project: values.project,
        budget: values.budget?.toString(),
        execution_period: values.execution_period,
        start_date: values.dates?.[0]?.toISOString(),
        end_date: values.dates?.[1]?.toISOString()
      }

      if (selectedTender) {
        updateMutation.mutate({ id: selectedTender.id, data })
      } else {
        createMutation.mutate(data)
      }
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  // Форматирование бюджета
  const formatBudget = (budget: string) => {
    const num = Number(budget)
    return num.toLocaleString('ru-RU')
  }

  // Проверка доступа к созданию тендера
  const canCreateTender = () => {
    // SUPERADMIN всегда имеет доступ
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('create')
  }

  // Проверка доступа к редактированию тендера
  const canEditTender = () => {
    // SUPERADMIN всегда имеет доступ
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('edit')
  }

  // Проверка доступа к удалению тендера
  const canDeleteTender = () => {
    // SUPERADMIN всегда имеет доступ
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('delete')
  }

  // Проверка доступа к просмотру деталей тендера
  const canViewDetails = () => {
    // SUPERADMIN всегда имеет доступ
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('view_details')
  }

  // Колонки таблицы
  const columns = [
    {
      title: 'Название',
      dataIndex: 'title',
      key: 'title',
      width: 300
    },
    {
      title: 'Тип',
      dataIndex: 'tender_type',
      key: 'tender_type',
      width: 150,
      render: (type: string) => {
        const typeMap: Record<string, { text: string; color: string }> = {
          MATERIALS: { text: 'Материалы', color: 'blue' },
          WORKS: { text: 'Работы', color: 'green' },
          EQUIPMENT: { text: 'Оборудование', color: 'orange' },
          SERVICES: { text: 'Услуги', color: 'purple' }
        }
        const config = typeMap[type] || { text: type, color: 'default' }
        return <Tag color={config.color}>{config.text}</Tag>
      }
    },
    {
      title: 'Проект',
      dataIndex: 'project_name',
      key: 'project_name',
      width: 200
    },
    {
      title: 'Город',
      dataIndex: 'city',
      key: 'city',
      width: 120,
      render: (city: string) => city || '—'
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          DRAFT: { text: 'Черновик', color: 'default' },
          PUBLISHED: { text: 'Опубликован', color: 'blue' },
          IN_PROGRESS: { text: 'В процессе', color: 'orange' },
          CLOSED: { text: 'Закрыт', color: 'green' },
          CANCELLED: { text: 'Отменен', color: 'red' }
        }
        const config = statusMap[status] || { text: status, color: 'default' }
        return <Tag color={config.color}>{config.text}</Tag>
      }
    },
    {
      title: 'Бюджет',
      dataIndex: 'budget',
      key: 'budget',
      width: 150,
      render: (budget: string) => budget ? `${formatBudget(budget)} ₸` : <span style={{ color: '#999' }}>Принимаем предложения</span>
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_: any, record: Tender) => (
        <Space size="small" className="tenders-actions">
          {/* Просмотр - проверяется через матрицу доступа */}
          {canViewDetails() && (
            <Tooltip title="Просмотр">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => handleViewDetail(record)}
              />
            </Tooltip>
          )}

          {/* Опубликовать (только для черновиков) - проверяется через матрицу доступа (edit) */}
          {canEditTender() && record.status === 'DRAFT' && (
            <Tooltip title="Опубликовать">
              <Button
                type="text"
                icon={<SendOutlined />}
                onClick={() => publishMutation.mutate(record.id)}
                style={{ color: '#52c41a' }}
              />
            </Tooltip>
          )}

          {/* Редактировать (для незакрытых тендеров) - проверяется через матрицу доступа */}
          {canEditTender() && record.status !== 'CLOSED' && record.status !== 'CANCELLED' && (
            <>
              <Tooltip title="Изменить">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => handleOpenModal(record)}
                  style={{ color: '#1890ff' }}
                />
              </Tooltip>

              {/* Закрыть - проверяется через матрицу доступа (edit) */}
              <Tooltip title="Закрыть">
                <Button
                  type="text"
                  icon={<CloseCircleOutlined />}
                  onClick={() => closeMutation.mutate(record.id)}
                  style={{ color: '#faad14' }}
                />
              </Tooltip>
            </>
          )}

          {/* Удалить - проверяется через матрицу доступа */}
          {canDeleteTender() && (
            <Tooltip title="Удалить">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteTender(record)}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ]

  return (
    <div className="tenders-container">
      <div className="tenders-header">
        <Title level={2} className="tenders-title">Тендеры</Title>
        {/* Кнопка "Создать тендер" проверяется через матрицу доступа */}
        {canCreateTender() && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
            className="tenders-create-btn"
          >
            Создать тендер
          </Button>
        )}
      </div>

      <Table
        dataSource={tenders}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1200 }}
        className="tenders-table"
      />

      {/* Модальное окно создания/редактирования */}
      <Modal
        title={selectedTender ? 'Редактировать тендер' : 'Создать тендер'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        okText={selectedTender ? 'Сохранить' : 'Создать'}
        cancelText="Отмена"
        width={600}
        className="tenders-modal"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Название"
            rules={[{ required: true, message: 'Введите название тендера' }]}
          >
            <Input placeholder="Введите название тендера" />
          </Form.Item>

          <Form.Item name="description" label="Описание">
            <TextArea rows={4} placeholder="Введите описание тендера" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="company_name" label="Компания">
                <Input placeholder="Название компании-заказчика" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="city" label="Город">
                <Input placeholder="Город реализации проекта" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="tender_type"
                label="Тип тендера"
                rules={[{ required: true, message: 'Выберите тип тендера' }]}
              >
                <Select placeholder="Выберите тип">
                  <Select.Option value="MATERIALS">Материалы</Select.Option>
                  <Select.Option value="WORKS">Работы</Select.Option>
                  <Select.Option value="EQUIPMENT">Оборудование</Select.Option>
                  <Select.Option value="SERVICES">Услуги</Select.Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="project"
                label="Проект"
                rules={[{ required: true, message: 'Выберите проект' }]}
              >
                <Select placeholder="Выберите проект" showSearch optionFilterProp="children">
                  {projects?.map((project) => (
                    <Select.Option key={project.id} value={project.id}>
                      {project.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="budget" label="Бюджет (₸)">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="Принимаем предложения"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="execution_period" label="Срок исполнения">
                <Input placeholder="Например: 30 дней, 2 месяца" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="dates" label="Даты проведения">
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно детального просмотра */}
      <Modal
        title="Детали тендера"
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Закрыть
          </Button>
        ]}
        width={800}
        className="tenders-detail-modal"
      >
        {selectedTender && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Название">{selectedTender.title}</Descriptions.Item>
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
              {selectedTender.tender_type === 'MATERIALS' && 'Материалы'}
              {selectedTender.tender_type === 'WORKS' && 'Работы'}
              {selectedTender.tender_type === 'EQUIPMENT' && 'Оборудование'}
              {selectedTender.tender_type === 'SERVICES' && 'Услуги'}
            </Descriptions.Item>
            <Descriptions.Item label="Компания">
              {selectedTender.company_name || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Город">
              {selectedTender.city || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Проект">
              {selectedTender.project_name || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Статус">
              {selectedTender.status === 'DRAFT' && <Tag color="default">Черновик</Tag>}
              {selectedTender.status === 'PUBLISHED' && <Tag color="blue">Опубликован</Tag>}
              {selectedTender.status === 'IN_PROGRESS' && <Tag color="orange">В процессе</Tag>}
              {selectedTender.status === 'CLOSED' && <Tag color="green">Закрыт</Tag>}
              {selectedTender.status === 'CANCELLED' && <Tag color="red">Отменен</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Бюджет">
              {selectedTender.budget
                ? `${formatBudget(selectedTender.budget)} ₸`
                : 'Принимаем предложения'}
            </Descriptions.Item>
            <Descriptions.Item label="Срок исполнения">
              {selectedTender.execution_period || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Дата начала">
              {selectedTender.start_date
                ? dayjs(selectedTender.start_date).format('DD.MM.YYYY')
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Дата окончания">
              {selectedTender.end_date
                ? dayjs(selectedTender.end_date).format('DD.MM.YYYY')
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Создан">
              {dayjs(selectedTender.created_at).format('DD.MM.YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Обновлен">
              {dayjs(selectedTender.updated_at).format('DD.MM.YYYY HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default Tenders
