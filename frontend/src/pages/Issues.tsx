import { useState } from 'react'
import {
  Typography,
  Button,
  Card,
  Space,
  Tag,
  Row,
  Col,
  Spin,
  Alert,
  Select,
  Input,
  Divider,
  Modal,
  Form,
  DatePicker,
  message,
  Checkbox
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FileImageOutlined,
  CameraOutlined,
  CloseOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { issuesAPI, Issue } from '../api/issues'
import { projectsAPI } from '../api/projects'
import { usersAPI } from '../api/users'
import { useAuthStore } from '../stores/authStore'
import type { UploadFile } from 'antd/es/upload/interface'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'

dayjs.locale('ru')

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

const Issues = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [photosBefore, setPhotosBefore] = useState<UploadFile[]>([])
  const [photosAfter, setPhotosAfter] = useState<UploadFile[]>([])
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  // Модальное окно для загрузки фото к существующему замечанию
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null)
  const [uploadPhotoType, setUploadPhotoType] = useState<'before' | 'after'>('before')
  const [uploadPhotos, setUploadPhotos] = useState<UploadFile[]>([])

  // Получаем текущего пользователя
  const { user } = useAuthStore()

  // Функция проверки прав на добавление фото "До"
  const canAddPhotoBefore = () => {
    if (!user) return false
    const allowedRoles = ['ENGINEER', 'SITE_MANAGER', 'SUPERVISOR', 'OBSERVER', 'PROJECT_MANAGER', 'CHIEF_ENGINEER']
    return user.is_superuser || allowedRoles.includes(user.role)
  }

  // Функция проверки прав на добавление фото "После" (только подрядчик)
  const canAddPhotoAfter = () => {
    if (!user) return false
    return user.role === 'CONTRACTOR'
  }

  // Загрузка замечаний
  const { data: issuesData, isLoading, error } = useQuery({
    queryKey: ['issues', statusFilter, priorityFilter, searchTerm],
    queryFn: () => issuesAPI.getIssues({
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      search: searchTerm || undefined
    })
  })

  // Загрузка проектов
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsAPI.getProjects
  })

  // Загрузка пользователей (подрядчики)
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: usersAPI.getUsers
  })

  const projects = Array.isArray(projectsData) ? projectsData : (projectsData?.results || [])
  const users = Array.isArray(usersData) ? usersData : (usersData?.results || [])
  const contractors = users.filter((u: any) => u.role === 'CONTRACTOR')

  // Обработка данных (может быть массив или объект с results)
  const issues: Issue[] = Array.isArray(issuesData)
    ? issuesData
    : (issuesData?.results || [])

  // Мутация для создания замечания
  const createIssueMutation = useMutation({
    mutationFn: issuesAPI.createIssue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      message.success('Замечание успешно создано')
      setIsModalOpen(false)
      form.resetFields()
      setPhotosBefore([])
      setPhotosAfter([])
    },
    onError: (error: any) => {
      console.error('Failed to create issue:', error)
      message.error('Ошибка при создании замечания')
    }
  })

  // Мутация для загрузки фото к существующему замечанию
  const uploadPhotoMutation = useMutation({
    mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
      issuesAPI.uploadPhoto(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      message.success('Фото успешно добавлено')
      setIsPhotoModalOpen(false)
      setUploadPhotos([])
      setSelectedIssueId(null)
    },
    onError: (error: any) => {
      console.error('Failed to upload photo:', error)
      message.error('Ошибка при загрузке фото')
    }
  })

  // Обработчики
  const handleAddIssue = () => {
    form.resetFields()
    setPhotosBefore([])
    setPhotosAfter([])
    setIsModalOpen(true)
  }

  const handleModalCancel = () => {
    setIsModalOpen(false)
    form.resetFields()
    setPhotosBefore([])
    setPhotosAfter([])
  }

  // Обработчики для загрузки фото к существующему замечанию
  const handleOpenPhotoModal = (issueId: number, photoType: 'before' | 'after') => {
    setSelectedIssueId(issueId)
    setUploadPhotoType(photoType)
    setUploadPhotos([])
    setIsPhotoModalOpen(true)
  }

  const handlePhotoModalCancel = () => {
    setIsPhotoModalOpen(false)
    setUploadPhotos([])
    setSelectedIssueId(null)
  }

  const handlePhotoUpload = () => {
    if (!selectedIssueId || uploadPhotos.length === 0) {
      message.warning('Выберите хотя бы одно фото')
      return
    }

    // Отправляем каждое фото отдельным запросом
    uploadPhotos.forEach((file: any) => {
      if (file.originFileObj) {
        const formData = new FormData()
        // Используем 'stage' вместо 'photo_type' и преобразуем в верхний регистр
        formData.append('stage', uploadPhotoType === 'before' ? 'BEFORE' : 'AFTER')
        formData.append('photo', file.originFileObj)

        uploadPhotoMutation.mutate({ id: selectedIssueId, formData })
      }
    })
  }

  const handleModalOk = () => {
    form.validateFields().then((values: any) => {
      const formData = new FormData()
      formData.append('title', values.title)
      formData.append('description', values.description)
      formData.append('project', values.project)
      // site будет создан автоматически на backend
      formData.append('priority', values.priority)
      if (values.deadline) formData.append('deadline', values.deadline.toISOString())
      if (values.assigned_to) formData.append('assigned_to', values.assigned_to)
      if (values.accepted) formData.append('accepted', 'true')

      photosBefore.forEach((file: any) => {
        if (file.originFileObj) formData.append('photos_before', file.originFileObj)
      })
      photosAfter.forEach((file: any) => {
        if (file.originFileObj) formData.append('photos_after', file.originFileObj)
      })

      createIssueMutation.mutate(formData as any)
    })
  }

  // Функция для получения цвета статуса
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'NEW': 'blue',
      'IN_PROGRESS': 'orange',
      'PENDING_REVIEW': 'purple',
      'COMPLETED': 'green',
      'OVERDUE': 'red',
      'REJECTED': 'default'
    }
    return colors[status] || 'default'
  }

  // Функция для получения текста статуса
  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      'NEW': 'Новое',
      'IN_PROGRESS': 'В процессе',
      'PENDING_REVIEW': 'На проверке',
      'COMPLETED': 'Исполнено',
      'OVERDUE': 'Просрочено',
      'REJECTED': 'Отклонено'
    }
    return texts[status] || status
  }

  // Функция для получения цвета приоритета
  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'CRITICAL': 'red',
      'HIGH': 'orange',
      'NORMAL': 'default'
    }
    return colors[priority] || 'default'
  }

  // Функция для получения цвета рамки по приоритету
  const getPriorityBorderColor = (priority: string) => {
    const colors: Record<string, string> = {
      'CRITICAL': '#ff4d4f',  // Красный
      'HIGH': '#ff7a45',      // Оранжевый
      'NORMAL': '#1890ff'     // Синий
    }
    return colors[priority] || '#1890ff'
  }

  // Функция для получения текста приоритета
  const getPriorityText = (priority: string) => {
    const texts: Record<string, string> = {
      'CRITICAL': 'Критичное',
      'HIGH': 'Важное',
      'NORMAL': 'Обычное'
    }
    return texts[priority] || priority
  }

  // Функция для форматирования даты
  const formatDate = (date?: string) => {
    if (!date) return 'Не указан'
    return dayjs(date).format('DD.MM.YYYY HH:mm')
  }

  if (error) {
    return (
      <Alert
        message="Ошибка загрузки"
        description="Не удалось загрузить список замечаний"
        type="error"
        showIcon
      />
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Заголовок */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>Замечания</Title>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleAddIssue}>
          Добавить замечание
        </Button>
      </div>

      {/* Фильтры */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Поиск по названию или описанию"
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              placeholder="Фильтр по статусу"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
            >
              <Option value="">Все статусы</Option>
              <Option value="NEW">Новое</Option>
              <Option value="IN_PROGRESS">В процессе</Option>
              <Option value="PENDING_REVIEW">На проверке</Option>
              <Option value="COMPLETED">Исполнено</Option>
              <Option value="OVERDUE">Просрочено</Option>
              <Option value="REJECTED">Отклонено</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              placeholder="Фильтр по приоритету"
              style={{ width: '100%' }}
              value={priorityFilter}
              onChange={setPriorityFilter}
              allowClear
            >
              <Option value="">Все приоритеты</Option>
              <Option value="CRITICAL">Критичное</Option>
              <Option value="HIGH">Важное</Option>
              <Option value="NORMAL">Обычное</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Список замечаний */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      ) : issues.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Text type="secondary">Замечания не найдены</Text>
          </div>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {issues.map((issue) => (
            <Col
              key={issue.id}
              xs={24}  // 1 колонка на очень маленьких экранах
              sm={12}  // 2 колонки на маленьких экранах
              md={12}  // 2 колонки на средних экранах
              lg={8}   // 3 колонки на больших экранах
              xl={6}   // 4 колонки на очень больших экранах
              xxl={6}  // 4 колонки
            >
              <Card
                hoverable
                style={{
                  height: '100%',
                  borderLeft: `5px solid ${getPriorityBorderColor(issue.priority)}`
                }}
                actions={[
                  <Button type="link" icon={<EyeOutlined />} key="view">
                    Просмотр
                  </Button>,
                  // Кнопка "Добавить фото" для ИТР, Технадзор, Авторский надзор, Руководитель проекта, Главный инженер
                  canAddPhotoBefore() && (
                    <Button
                      type="link"
                      icon={<CameraOutlined />}
                      key="add-photo"
                      onClick={() => handleOpenPhotoModal(issue.id, 'before')}
                    >
                      Добавить фото
                    </Button>
                  ),
                  // Кнопка "Добавить фото отчет" для Подрядчика
                  canAddPhotoAfter() && (
                    <Button
                      type="link"
                      icon={<FileImageOutlined />}
                      key="add-photo-report"
                      onClick={() => handleOpenPhotoModal(issue.id, 'after')}
                    >
                      Добавить фото отчет
                    </Button>
                  )
                ].filter(Boolean)}
              >
                {/* Название и статус */}
                <div style={{ marginBottom: '12px' }}>
                  <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
                    {issue.title}
                  </Text>
                  <Space>
                    <Tag color={getStatusColor(issue.status)}>
                      {getStatusText(issue.status)}
                    </Tag>
                    <Tag color={getPriorityColor(issue.priority)}>
                      {getPriorityText(issue.priority)}
                    </Tag>
                  </Space>
                </div>

                <Divider style={{ margin: '12px 0' }} />

                {/* Проект и участок */}
                <div style={{ marginBottom: '8px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Проект:</Text>
                  <br />
                  <Text style={{ fontSize: '14px' }}>{issue.project_name}</Text>
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Участок:</Text>
                  <br />
                  <Text style={{ fontSize: '14px' }}>{issue.site_name}</Text>
                </div>

                {/* Исполнитель */}
                {issue.assigned_to_name && (
                  <div style={{ marginBottom: '8px' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>Исполнитель:</Text>
                    <br />
                    <Text style={{ fontSize: '14px' }}>{issue.assigned_to_name}</Text>
                  </div>
                )}

                <Divider style={{ margin: '12px 0' }} />

                {/* Срок и статус просрочки */}
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {issue.deadline && (
                    <div>
                      <ClockCircleOutlined style={{ marginRight: '8px' }} />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Срок: {formatDate(issue.deadline)}
                      </Text>
                    </div>
                  )}

                  {issue.is_overdue && (
                    <Tag color="red" icon={<ExclamationCircleOutlined />}>
                      Просрочено
                    </Tag>
                  )}

                  {issue.photo_count !== undefined && issue.photo_count > 0 && (
                    <div>
                      <FileImageOutlined style={{ marginRight: '8px' }} />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Фото: {issue.photo_count}
                      </Text>
                    </div>
                  )}

                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Создано: {formatDate(issue.created_at)}
                    </Text>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Модальное окно для добавления замечания */}
      <Modal
        title="Добавить замечание"
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={700}
        okText="Создать"
        cancelText="Отмена"
        confirmLoading={createIssueMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: '24px' }}
        >
          {/* Название */}
          <Form.Item
            name="title"
            label="Название"
            rules={[{ required: true, message: 'Введите название замечания' }]}
          >
            <Input placeholder="Введите название замечания" />
          </Form.Item>

          {/* Описание */}
          <Form.Item
            name="description"
            label="Описание"
            rules={[{ required: true, message: 'Введите описание замечания' }]}
          >
            <TextArea rows={4} placeholder="Введите описание замечания" />
          </Form.Item>

          {/* Проект */}
          <Form.Item
            name="project"
            label="Проект"
            rules={[{ required: true, message: 'Выберите проект' }]}
          >
            <Select placeholder="Выберите проект">
              {projects.map((project: any) => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Приоритет */}
          <Form.Item
            name="priority"
            label="Приоритет"
            rules={[{ required: true, message: 'Выберите приоритет' }]}
          >
            <Select placeholder="Выберите приоритет">
              <Option value="CRITICAL">
                <Tag color="red">Критичное</Tag>
              </Option>
              <Option value="HIGH">
                <Tag color="orange">Важное</Tag>
              </Option>
              <Option value="NORMAL">
                <Tag color="default">Обычное</Tag>
              </Option>
            </Select>
          </Form.Item>

          {/* Срок */}
          <Form.Item
            name="deadline"
            label="Срок исполнения"
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              format="DD.MM.YYYY HH:mm"
              placeholder="Выберите дату и время"
            />
          </Form.Item>

          {/* Подрядчик */}
          <Form.Item
            name="assigned_to"
            label="Подрядчик"
          >
            <Select placeholder="Выберите подрядчика" allowClear>
              {contractors.map((contractor: any) => (
                <Option key={contractor.id} value={contractor.id}>
                  {contractor.last_name} {contractor.first_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Принято (только для ИТР) */}
          {user && ['ENGINEER', 'SITE_MANAGER', 'MASTER'].includes(user.role) && (
            <Form.Item
              name="accepted"
              valuePropName="checked"
            >
              <Checkbox>Принято</Checkbox>
            </Form.Item>
          )}

          {/* Кнопка для добавления фото */}
          {(canAddPhotoBefore() || canAddPhotoAfter()) && (
            <>
              <Form.Item>
                <Button
                  type="dashed"
                  icon={<CameraOutlined />}
                  onClick={() => document.getElementById('photo-upload')?.click()}
                  block
                  size="large"
                >
                  Добавить фото замечания
                </Button>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e: any) => {
                    const files = Array.from(e.target.files || [])
                    const uploadFiles = files.map((file: any) => ({
                      uid: Math.random().toString(36),
                      name: file.name,
                      status: 'done' as const,
                      originFileObj: file,
                      url: URL.createObjectURL(file)
                    }))

                    // Определяем, куда добавить фото в зависимости от роли
                    if (canAddPhotoBefore()) {
                      setPhotosBefore([...photosBefore, ...uploadFiles] as any)
                    } else if (canAddPhotoAfter()) {
                      setPhotosAfter([...photosAfter, ...uploadFiles] as any)
                    }
                  }}
                />
              </Form.Item>

              {/* Отображение загруженных фото "До" */}
              {photosBefore.length > 0 && (
                <Form.Item label="Фото 'До'">
                  <Space wrap>
                    {photosBefore.map((file: any) => (
                      <div key={file.uid} style={{ position: 'relative' }}>
                        <img
                          src={file.url}
                          alt={file.name}
                          style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }}
                        />
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<CloseOutlined />}
                          style={{ position: 'absolute', top: -8, right: -8 }}
                          onClick={() => setPhotosBefore(photosBefore.filter((f: any) => f.uid !== file.uid))}
                        />
                      </div>
                    ))}
                  </Space>
                </Form.Item>
              )}

              {/* Отображение загруженных фото "После" */}
              {photosAfter.length > 0 && (
                <Form.Item label="Фото 'После'">
                  <Space wrap>
                    {photosAfter.map((file: any) => (
                      <div key={file.uid} style={{ position: 'relative' }}>
                        <img
                          src={file.url}
                          alt={file.name}
                          style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }}
                        />
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<CloseOutlined />}
                          style={{ position: 'absolute', top: -8, right: -8 }}
                          onClick={() => setPhotosAfter(photosAfter.filter((f: any) => f.uid !== file.uid))}
                        />
                      </div>
                    ))}
                  </Space>
                </Form.Item>
              )}
            </>
          )}
        </Form>
      </Modal>

      {/* Модальное окно для загрузки фото к существующему замечанию */}
      <Modal
        title={uploadPhotoType === 'before' ? 'Добавить фото' : 'Добавить фото отчет'}
        open={isPhotoModalOpen}
        onOk={handlePhotoUpload}
        onCancel={handlePhotoModalCancel}
        okText="Загрузить"
        cancelText="Отмена"
        confirmLoading={uploadPhotoMutation.isPending}
      >
        <div style={{ marginTop: '24px' }}>
          <Button
            type="dashed"
            icon={<CameraOutlined />}
            onClick={() => document.getElementById('photo-upload-existing')?.click()}
            block
            size="large"
          >
            {uploadPhotoType === 'before' ? 'Выбрать фото замечания' : 'Выбрать фото отчета'}
          </Button>
          <input
            id="photo-upload-existing"
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e: any) => {
              const files = Array.from(e.target.files || [])
              const uploadFiles = files.map((file: any) => ({
                uid: Math.random().toString(36),
                name: file.name,
                status: 'done' as const,
                originFileObj: file,
                url: URL.createObjectURL(file)
              }))
              setUploadPhotos([...uploadPhotos, ...uploadFiles] as any)
            }}
          />

          {/* Отображение выбранных фото */}
          {uploadPhotos.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <Text strong>Выбранные фото ({uploadPhotos.length}):</Text>
              <Space wrap style={{ marginTop: '12px' }}>
                {uploadPhotos.map((file: any) => (
                  <div key={file.uid} style={{ position: 'relative' }}>
                    <img
                      src={file.url}
                      alt={file.name}
                      style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }}
                    />
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<CloseOutlined />}
                      style={{ position: 'absolute', top: -8, right: -8 }}
                      onClick={() => setUploadPhotos(uploadPhotos.filter((f: any) => f.uid !== file.uid))}
                    />
                  </div>
                ))}
              </Space>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default Issues
