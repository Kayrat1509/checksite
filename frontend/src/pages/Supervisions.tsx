import { useState } from 'react'
import {
  Typography,
  Button,
  Card,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tabs,
  Row,
  Col,
  Divider,
  Popconfirm,
  Tag,
  Alert
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  StopOutlined,
  CheckCircleOutlined,
  UserOutlined,
  SafetyOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI, User, CreateUserData } from '../api/users'
import { useAuthStore } from '../stores/authStore'

const { Title, Text } = Typography

const Supervisions = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupervision, setEditingSupervision] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  // Получаем текущего пользователя из authStore
  const currentUser = useAuthStore(state => state.user)

  // Функция проверки прав на ДОБАВЛЕНИЕ надзора
  // Доступно: Директор, Главный инженер, Руководитель проекта, Начальник участка, Инженер, Прораб
  const canAddSupervision = () => {
    if (!currentUser) return false
    if (currentUser.is_superuser) return true
    const allowedRoles = ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 'ENGINEER', 'FOREMAN']
    return allowedRoles.includes(currentUser.role)
  }

  // Функция проверки прав на РЕДАКТИРОВАНИЕ надзора
  // Доступно: Директор, Главный инженер, Руководитель проекта, Начальник участка, Инженер, Прораб
  const canEditSupervision = () => {
    if (!currentUser) return false
    if (currentUser.is_superuser) return true
    const allowedRoles = ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 'ENGINEER', 'FOREMAN']
    return allowedRoles.includes(currentUser.role)
  }

  // Функция проверки прав на ДЕАКТИВАЦИЮ/АКТИВАЦИЮ надзора
  // Доступно: Директор, Главный инженер, Руководитель проекта, Начальник участка, Инженер, Прораб
  const canToggleSupervisionStatus = () => {
    if (!currentUser) return false
    if (currentUser.is_superuser) return true
    const allowedRoles = ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 'ENGINEER', 'FOREMAN']
    return allowedRoles.includes(currentUser.role)
  }

  // Функция проверки прав на АРХИВАЦИЮ надзора
  // Доступно: Директор, Главный инженер, Руководитель проекта, Начальник участка, Инженер, Прораб
  const canArchiveSupervision = () => {
    if (!currentUser) return false
    if (currentUser.is_superuser) return true
    const allowedRoles = ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 'ENGINEER', 'FOREMAN']
    return allowedRoles.includes(currentUser.role)
  }

  // Функция проверки прав на ВОССТАНОВЛЕНИЕ надзора из архива
  // Доступно: Директор, Главный инженер, Руководитель проекта, Начальник участка, Инженер (БЕЗ Прораба)
  const canRestoreSupervision = () => {
    if (!currentUser) return false
    if (currentUser.is_superuser) return true
    const allowedRoles = ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 'ENGINEER']
    return allowedRoles.includes(currentUser.role)
  }

  // Функция проверки прав на УДАЛЕНИЕ надзора окончательно
  // Доступно: только Суперадмин
  const canDeleteSupervision = () => {
    if (!currentUser) return false
    return currentUser.is_superuser
  }

  // Fetch users and filter only supervisions (SUPERVISOR и OBSERVER)
  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const result = await usersAPI.getUsers()
        console.log('Supervisions loaded:', result)
        return result
      } catch (err: any) {
        console.error('Ошибка загрузки надзоров:', err)
        throw err
      }
    },
    retry: 1,
    staleTime: 30000
  })

  // Фильтруем только Технадзор (SUPERVISOR) и Авторский надзор (OBSERVER)
  const allUsers: User[] = Array.isArray(data) ? data : (data?.results || [])
  const supervisions: User[] = allUsers.filter(user =>
    user.role === 'SUPERVISOR' || user.role === 'OBSERVER'
  )

  // Разделяем на активные и архивные
  const activeSupervisions = supervisions.filter(s => !s.archived)
  const archivedSupervisions = supervisions.filter(s => s.archived)

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (newSupervision: CreateUserData) => usersAPI.createUser(newSupervision),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success('Надзор успешно добавлен')
      setIsModalOpen(false)
      form.resetFields()
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || 'Ошибка при добавлении надзора')
    }
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateUserData> }) =>
      usersAPI.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success('Надзор успешно обновлен')
      setIsModalOpen(false)
      setEditingSupervision(null)
      form.resetFields()
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || 'Ошибка при обновлении надзора')
    }
  })

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      isActive ? usersAPI.deactivateUser(id) : usersAPI.activateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success('Статус надзора изменен')
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || 'Ошибка при изменении статуса')
    }
  })

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: (id: number) => usersAPI.archiveUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success('Надзор перемещен в архив')
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || 'Ошибка при архивации')
    }
  })

  // Unarchive mutation
  const unarchiveMutation = useMutation({
    mutationFn: (id: number) => usersAPI.unarchiveUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success('Надзор восстановлен из архива')
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || 'Ошибка при восстановлении')
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersAPI.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success('Надзор удален окончательно')
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || 'Ошибка при удалении')
    }
  })

  // Handlers
  const handleCreateSupervision = () => {
    setEditingSupervision(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleEditSupervision = (supervision: User) => {
    setEditingSupervision(supervision)
    form.setFieldsValue({
      first_name: supervision.first_name,
      last_name: supervision.last_name,
      middle_name: supervision.middle_name,
      email: supervision.email,
      phone: supervision.phone,
      position: supervision.position,
      role: supervision.role
    })
    setIsModalOpen(true)
  }

  const handleToggleActive = (supervision: User) => {
    toggleActiveMutation.mutate({ id: supervision.id, isActive: supervision.is_active })
  }

  const handleArchiveSupervision = (id: number) => {
    archiveMutation.mutate(id)
  }

  const handleUnarchiveSupervision = (id: number) => {
    unarchiveMutation.mutate(id)
  }

  const handleDeleteSupervision = (id: number) => {
    deleteMutation.mutate(id)
  }

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      if (editingSupervision) {
        // Обновление существующего надзора
        updateMutation.mutate({
          id: editingSupervision.id,
          data: values
        })
      } else {
        // Создание нового надзора
        const newSupervision: CreateUserData = {
          ...values,
          password: Math.random().toString(36).slice(-8), // Временный пароль
          password_confirm: Math.random().toString(36).slice(-8)
        }
        createMutation.mutate(newSupervision)
      }
    })
  }

  const handleModalCancel = () => {
    setIsModalOpen(false)
    setEditingSupervision(null)
    form.resetFields()
  }

  // Функция для получения названия роли на русском
  const getRoleName = (role: string) => {
    const roleNames: { [key: string]: string } = {
      SUPERVISOR: 'Технадзор',
      OBSERVER: 'Авторский надзор'
    }
    return roleNames[role] || role
  }

  // Функция для получения цвета статуса
  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'green' : 'red'
  }

  // Loading state
  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Text>Загрузка надзоров...</Text>
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Ошибка загрузки"
          description={error?.message || 'Не удалось загрузить список надзоров'}
          type="error"
          showIcon
        />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Заголовок страницы */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>Надзоры</Title>
        {/* Кнопка "Добавить надзор" */}
        {canAddSupervision() && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateSupervision}
            size="large"
          >
            Добавить надзор
          </Button>
        )}
      </div>

      {/* Вкладки: Активные / Архив */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'active' | 'archived')}
        style={{ marginBottom: '24px' }}
        items={[
          {
            key: 'active',
            label: `Активные (${activeSupervisions.length})`,
          },
          {
            key: 'archived',
            label: `Архив (${archivedSupervisions.length})`,
          },
        ]}
      />

      {/* Список надзоров */}
      <Row gutter={[16, 16]}>
        {(activeTab === 'active' ? activeSupervisions : archivedSupervisions).map((supervision) => (
          <Col xs={24} sm={12} md={8} lg={6} key={supervision.id}>
            <Card
              hoverable
              style={{
                borderLeft: `4px solid ${supervision.role === 'SUPERVISOR' ? '#1890ff' : '#52c41a'}`
              }}
            >
              {/* Заголовок карточки */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  {supervision.role === 'SUPERVISOR' ? (
                    <SafetyOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
                  ) : (
                    <UserOutlined style={{ fontSize: '20px', color: '#52c41a' }} />
                  )}
                  <Text strong style={{ fontSize: '16px' }}>
                    {supervision.full_name}
                  </Text>
                </div>
                <Tag color={supervision.role === 'SUPERVISOR' ? 'blue' : 'green'}>
                  {getRoleName(supervision.role)}
                </Tag>
                <Tag color={getStatusColor(supervision.is_active)}>
                  {supervision.is_active ? 'Активен' : 'Неактивен'}
                </Tag>
              </div>

              <Divider style={{ margin: '12px 0' }} />

              {/* Информация о надзоре */}
              <div style={{ marginBottom: '12px' }}>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                  Email: {supervision.email || 'Не указан'}
                </Text>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                  Телефон: {supervision.phone || 'Не указан'}
                </Text>
                {supervision.position && (
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                    Должность: {supervision.position}
                  </Text>
                )}
              </div>

              <Divider style={{ margin: '12px 0' }} />

              {/* Действия */}
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {/* Редактировать */}
                {canEditSupervision() && (
                  <Button
                    type="default"
                    icon={<EditOutlined />}
                    onClick={() => handleEditSupervision(supervision)}
                    size="small"
                    block
                  >
                    Редактировать
                  </Button>
                )}

                {/* Деактивировать/Активировать */}
                {canToggleSupervisionStatus() && (
                  <Button
                    type="default"
                    icon={supervision.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                    onClick={() => handleToggleActive(supervision)}
                    size="small"
                    block
                  >
                    {supervision.is_active ? 'Деактивировать' : 'Активировать'}
                  </Button>
                )}

                {/* В архив / Восстановить из архива */}
                {canArchiveSupervision() && !supervision.archived && (
                  <Popconfirm
                    title="Переместить в архив"
                    description="Надзор будет перемещен в архив. Данные сохранятся."
                    onConfirm={() => handleArchiveSupervision(supervision.id)}
                    okText="Да"
                    cancelText="Нет"
                  >
                    <Button
                      type="default"
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                      block
                    >
                      В архив
                    </Button>
                  </Popconfirm>
                )}

                {/* Восстановить из архива */}
                {canRestoreSupervision() && supervision.archived && (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleUnarchiveSupervision(supervision.id)}
                    size="small"
                    block
                  >
                    Восстановить
                  </Button>
                )}

                {/* Удалить окончательно (только для суперадмина в архиве) */}
                {canDeleteSupervision() && supervision.archived && (
                  <Popconfirm
                    title="Удалить окончательно"
                    description="Это действие необратимо! Все данные надзора будут удалены."
                    onConfirm={() => handleDeleteSupervision(supervision.id)}
                    okText="Да, удалить"
                    cancelText="Отмена"
                  >
                    <Button
                      type="default"
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                      block
                    >
                      Удалить окончательно
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Пустое состояние */}
      {(activeTab === 'active' ? activeSupervisions : archivedSupervisions).length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Text type="secondary">
            {activeTab === 'active'
              ? 'Нет активных надзоров. Нажмите "Добавить надзор" чтобы создать новый.'
              : 'Архив пуст'}
          </Text>
        </div>
      )}

      {/* Модальное окно создания/редактирования надзора */}
      <Modal
        title={editingSupervision ? 'Редактировать надзор' : 'Добавить надзор'}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText={editingSupervision ? 'Сохранить' : 'Добавить'}
        cancelText="Отмена"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: '24px' }}
        >
          <Form.Item
            name="role"
            label="Тип надзора"
            rules={[{ required: true, message: 'Выберите тип надзора' }]}
          >
            <Select placeholder="Выберите тип надзора">
              <Select.Option value="SUPERVISOR">Технадзор</Select.Option>
              <Select.Option value="OBSERVER">Авторский надзор</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="last_name"
            label="Фамилия"
            rules={[{ required: true, message: 'Введите фамилию' }]}
          >
            <Input placeholder="Фамилия" />
          </Form.Item>

          <Form.Item
            name="first_name"
            label="Имя"
            rules={[{ required: true, message: 'Введите имя' }]}
          >
            <Input placeholder="Имя" />
          </Form.Item>

          <Form.Item
            name="middle_name"
            label="Отчество"
          >
            <Input placeholder="Отчество" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Неверный формат email' }
            ]}
          >
            <Input placeholder="email@example.com" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Телефон"
            rules={[{ required: true, message: 'Введите телефон' }]}
          >
            <Input placeholder="+7 (___) ___-__-__" />
          </Form.Item>

          <Form.Item
            name="position"
            label="Должность"
          >
            <Input placeholder="Должность" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Supervisions
