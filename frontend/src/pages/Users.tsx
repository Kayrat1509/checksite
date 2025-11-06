import { useState } from 'react'
import {
  Typography,
  Button,
  Card,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Spin,
  Alert,
  Row,
  Col,
  Result,
  Divider,
  Tabs
} from 'antd'
import {
  PlusOutlined,
  UserOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckCircleOutlined,
  StopOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI, User, CreateUserData } from '../api/users'
import { authAPI } from '../api/auth'
import { projectsAPI } from '../api/projects'
import { companiesAPI } from '../api/companies'
import { useAuthStore } from '../stores/authStore'
import { useButtonAccess } from '../hooks/useButtonAccess'
import PersonnelImportExport from '../components/PersonnelImportExport'
import { tripleConfirm } from '../utils/tripleConfirm'

const { Title, Text } = Typography
const { Option } = Select

const Users = () => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { hasPageAccess } = useAuthStore()
  const { canUseButton } = useButtonAccess('users')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'active' | 'deactivated'>('active')

  // Проверка доступа текущего пользователя
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authAPI.getCurrentUser,
    retry: 1
  })

  // Функция проверки прав на ДОБАВЛЕНИЕ пользователей через матрицу доступа
  const canAddUser = () => {
    // SUPERADMIN всегда имеет доступ
    if (currentUser?.is_superuser || currentUser?.role === 'SUPERADMIN') {
      return true
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('create')
  }

  // Функция проверки прав на РЕДАКТИРОВАНИЕ пользователей через матрицу доступа
  const canEditUser = () => {
    // SUPERADMIN всегда имеет доступ
    if (currentUser?.is_superuser || currentUser?.role === 'SUPERADMIN') {
      return true
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('edit')
  }

  // Функция проверки прав на ДЕАКТИВАЦИЮ пользователей через матрицу доступа
  const canDeactivateUser = () => {
    // SUPERADMIN всегда имеет доступ
    if (currentUser?.is_superuser || currentUser?.role === 'SUPERADMIN') {
      return true
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('deactivate')
  }

  // Функция проверки прав на УДАЛЕНИЕ пользователей через матрицу доступа
  const canDeleteUserAction = () => {
    // Проверяем через матрицу доступа из админ-панели (без хардкода ролей)
    return canUseButton('delete')
  }

  // Роли пользователей (SUPERVISOR и OBSERVER перенесены на страницу Supervisions)
  const ROLES = {
    ITR: [
      { value: 'ENGINEER', label: 'Инженер ПТО' },
      { value: 'SITE_MANAGER', label: 'Начальник участка' },
      { value: 'FOREMAN', label: 'Прораб' },
      { value: 'MASTER', label: 'Мастер' }
    ],
    MANAGEMENT: [
      { value: 'PROJECT_MANAGER', label: 'Руководитель проекта' },
      { value: 'CHIEF_ENGINEER', label: 'Главный инженер' },
      { value: 'DIRECTOR', label: 'Директор' }
    ],
    CONTRACTOR: [
      { value: 'CONTRACTOR', label: 'Подрядчик' }
    ],
    // Роли для работы с заявками на материалы
    MATERIAL_REQUESTS: [
      { value: 'SUPPLY_MANAGER', label: 'Снабженец' },
      { value: 'WAREHOUSE_HEAD', label: 'Зав.Центрсклада' },
      { value: 'SITE_WAREHOUSE_MANAGER', label: 'Завсклад объекта' }
    ]
  }

  // Fetch users
  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const result = await usersAPI.getUsers()
        console.log('Users loaded:', result)
        return result
      } catch (err) {
        console.error('Failed to load users:', err)
        throw err
      }
    },
    retry: 1,
    staleTime: 30000
  })

  // Safely extract users from data and filter out contractors, supervisors and observers
  // Подрядчики (CONTRACTOR), Технадзор (SUPERVISOR) и Авторский надзор (OBSERVER) исключаются из списка обычных пользователей
  // SUPERVISOR и OBSERVER теперь управляются на странице Supervisions
  const allUsers: User[] = Array.isArray(data) ? data : (data?.results || [])
  const filteredUsers: User[] = allUsers.filter(user =>
    user.role !== 'CONTRACTOR' &&
    user.role !== 'SUPERVISOR' &&
    user.role !== 'OBSERVER'
  )

  // Разделяем пользователей на активных и деактивированных
  const activeUsers = filteredUsers.filter(user => user.is_active)
  const deactivatedUsers = filteredUsers.filter(user => !user.is_active)

  // Выбираем какой список показывать в зависимости от активной вкладки
  const users = activeTab === 'active' ? activeUsers : deactivatedUsers

  // Fetch projects for assignment
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsAPI.getProjects,
    retry: 1
  })

  const projects = Array.isArray(projectsData) ? projectsData : (projectsData?.results || [])

  // Fetch companies for selection
  const { data: companiesData, isLoading: companiesLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: companiesAPI.getCompanies,
    retry: 1
  })

  const companies = Array.isArray(companiesData) ? companiesData : (companiesData?.results || [])

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: usersAPI.createUser,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success(`Пользователь "${data.email}" успешно добавлен`)
      form.resetFields()
      setIsModalOpen(false)
      setEditingUser(null)
    },
    onError: (error: any) => {
      console.error('Failed to create user:', error)

      // Обработка ошибок валидации
      const errorData = error.response?.data
      if (errorData) {
        // Собираем все ошибки валидации
        const errorMessages: string[] = []

        // Проверяем каждое поле на наличие ошибок
        Object.keys(errorData).forEach((field) => {
          const fieldErrors = errorData[field]
          if (Array.isArray(fieldErrors)) {
            fieldErrors.forEach((err: string) => {
              errorMessages.push(`${field === 'password' ? 'Пароль' : field === 'email' ? 'Email' : field}: ${err}`)
            })
          } else if (typeof fieldErrors === 'string') {
            errorMessages.push(`${field === 'password' ? 'Пароль' : field === 'email' ? 'Email' : field}: ${fieldErrors}`)
          }
        })

        // Показываем все ошибки
        if (errorMessages.length > 0) {
          errorMessages.forEach(msg => message.error(msg))
        } else {
          message.error('Ошибка при создании пользователя')
        }
      } else {
        message.error('Ошибка при создании пользователя')
      }
    }
  })

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<CreateUserData> }) =>
      usersAPI.updateUser(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success(`Пользователь "${data.email}" успешно обновлен`)
      form.resetFields()
      setIsModalOpen(false)
      setEditingUser(null)
    },
    onError: (error: any) => {
      console.error('Failed to update user:', error)
      message.error(error.response?.data?.detail || 'Ошибка при обновлении пользователя')
    }
  })

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: usersAPI.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success('Пользователь успешно удален')
    },
    onError: (error: any) => {
      console.error('Failed to delete user:', error)
      message.error('Ошибка при удалении пользователя')
    }
  })

  // Deactivate user mutation
  const deactivateUserMutation = useMutation({
    mutationFn: (id: number) => usersAPI.deactivateUser(id),
    onSuccess: (updatedUser: any) => {
      // Обновляем кеш немедленно с данными от сервера
      queryClient.setQueryData(['users'], (oldData: any) => {
        if (!oldData) return oldData
        if (Array.isArray(oldData)) {
          return oldData.map((user: User) =>
            user.id === updatedUser.id ? { ...user, ...updatedUser } : user
          )
        }
        if (oldData.results) {
          return {
            ...oldData,
            results: oldData.results.map((user: User) =>
              user.id === updatedUser.id ? { ...user, ...updatedUser } : user
            )
          }
        }
        return oldData
      })
      message.success('Пользователь деактивирован')
    },
    onError: (error: any) => {
      console.error('Failed to deactivate user:', error)
      message.error('Ошибка при деактивации пользователя')
    }
  })

  // Activate user mutation
  const activateUserMutation = useMutation({
    mutationFn: (id: number) => usersAPI.activateUser(id),
    onSuccess: (updatedUser: any) => {
      // Обновляем кеш немедленно с данными от сервера
      queryClient.setQueryData(['users'], (oldData: any) => {
        if (!oldData) return oldData
        if (Array.isArray(oldData)) {
          return oldData.map((user: User) =>
            user.id === updatedUser.id ? { ...user, ...updatedUser } : user
          )
        }
        if (oldData.results) {
          return {
            ...oldData,
            results: oldData.results.map((user: User) =>
              user.id === updatedUser.id ? { ...user, ...updatedUser } : user
            )
          }
        }
        return oldData
      })
      message.success('Пользователь активирован')
    },
    onError: (error: any) => {
      console.error('Failed to activate user:', error)
      message.error('Ошибка при активации пользователя')
    }
  })

  const handleCreateUser = () => {
    setEditingUser(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    form.setFieldsValue({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      middle_name: user.middle_name,
      role: user.role,
      position: user.position,
      phone: user.phone,
      company: user.company,
      project_ids: user.user_projects?.map((p: any) => p.id) || []
    })
    setIsModalOpen(true)
  }

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      if (editingUser) {
        // Update existing user - пароль не отправляем (генерируется автоматически на backend)
        const updateData: any = {
          email: values.email,
          first_name: values.first_name,
          last_name: values.last_name,
          middle_name: values.middle_name,
          role: values.role,
          position: values.position,
          phone: values.phone,
          project_ids: values.project_ids || []
        }

        // Добавляем компанию если это суперадмин
        if (currentUser?.is_superuser && values.company) {
          updateData.company = values.company
        }

        updateUserMutation.mutate({
          id: editingUser.id,
          data: updateData
        })
      } else {
        // Create new user - пароль не передаем, генерируется автоматически на backend
        const userData: any = {
          email: values.email,
          first_name: values.first_name,
          last_name: values.last_name,
          middle_name: values.middle_name,
          role: values.role,
          position: values.position,
          phone: values.phone,
          project_ids: values.project_ids || []
        }

        // Компания передается только для суперадмина, для остальных backend подставит автоматически
        if (currentUser?.is_superuser && values.company) {
          userData.company = values.company
        }

        console.log('Creating user with data:', userData)
        createUserMutation.mutate(userData)
      }
    }).catch((err) => {
      console.error('Form validation failed:', err)
      message.error('Пожалуйста, заполните все обязательные поля')
    })
  }

  const handleModalCancel = () => {
    form.resetFields()
    setIsModalOpen(false)
    setEditingUser(null)
    setSelectedRole(null)
  }

  // Обработчик удаления пользователя с тройным подтверждением
  // Принимает объект пользователя для отображения его имени в диалогах подтверждения
  const handleDeleteUser = (user: User) => {
    // Формируем имя пользователя для отображения в диалогах подтверждения
    const userName = `${user.last_name} ${user.first_name}`.trim() || user.email

    // Используем тройное подтверждение для защиты от случайного удаления
    tripleConfirm({
      itemName: userName,
      itemType: 'пользователя',
      onConfirm: () => {
        deleteUserMutation.mutate(user.id)
      }
    })
  }

  const handleToggleActive = (user: User) => {
    if (user.is_active) {
      deactivateUserMutation.mutate(user.id)
    } else {
      activateUserMutation.mutate(user.id)
    }
  }

  const getRoleLabel = (role: string) => {
    const allRoles = [...ROLES.ITR, ...ROLES.MANAGEMENT, ...ROLES.CONTRACTOR, ...ROLES.MATERIAL_REQUESTS]
    const roleObj = allRoles.find(r => r.value === role)
    return roleObj?.label || role
  }

  const getRoleOptions = () => {
    if (selectedRole === 'ITR') return ROLES.ITR
    if (selectedRole === 'MANAGEMENT') return ROLES.MANAGEMENT
    if (selectedRole === 'MATERIAL_REQUESTS') return ROLES.MATERIAL_REQUESTS
    return [...ROLES.ITR, ...ROLES.MANAGEMENT, ...ROLES.MATERIAL_REQUESTS]
  }

  const getInitials = (user: User) => {
    const firstNameInitial = user.first_name ? user.first_name.charAt(0) + '.' : ''
    const middleNameInitial = user.middle_name ? user.middle_name.charAt(0) + '.' : ''
    return `${user.last_name} ${firstNameInitial}${middleNameInitial}`
  }

  const formatPhone = (phone?: string) => {
    if (!phone) return '-'
    // Форматирование телефона +7 (777) 777-77-77
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11 && cleaned.startsWith('7')) {
      return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`
    }
    return phone
  }

  // Show loading state
  if (isLoading || isLoadingCurrentUser) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="Загрузка пользователей...">
          <div style={{ minHeight: '200px' }} />
        </Spin>
      </div>
    )
  }

  // ===== НОВАЯ ЛОГИКА: Проверка доступа через матрицу доступа из БД =====
  // Проверяем доступ к странице через hasPageAccess('users')
  if (currentUser && !hasPageAccess('users')) {
    return (
      <Result
        status="403"
        title="Доступ запрещен"
        subTitle="У вас нет доступа к странице управления пользователями. Обратитесь к администратору."
      />
    )
  }

  // Show error state
  if (isError) {
    return (
      <Alert
        message="Ошибка загрузки"
        description={error?.message || 'Не удалось загрузить список пользователей'}
        type="error"
        showIcon
      />
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Заголовок страницы */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>Сотрудники</Title>

        <Space size="middle">
          {/* Кнопки импорта/экспорта v2 с расширенным функционалом */}
          {canAddUser() && <PersonnelImportExport />}

          {/* Кнопка "Добавить сотрудника" */}
          {canAddUser() && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateUser}
              size="large"
            >
              Добавить сотрудника
            </Button>
          )}
        </Space>
      </div>

      {/* Вкладки для переключения между активными и деактивированными сотрудниками */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'active' | 'deactivated')}
        items={[
          {
            key: 'active',
            label: `Активные (${activeUsers.length})`,
            children: (
              <Row gutter={[16, 16]}>
                {users.map((user) => (
                  <Col
                    key={user.id}
                    xs={24}  // 1 колонка на очень маленьких экранах
                    sm={12}  // 2 колонки на маленьких экранах
                    md={8}   // 3 колонки на средних экранах
                    lg={8}   // 3 колонки на больших экранах
                    xl={4}   // 5 колонок на очень больших экранах (24/5 ≈ 4.8, используем 4)
                    xxl={4}  // 5 колонок
                  >
                    <Card
                      hoverable
                      style={{ height: '100%' }}
                      styles={{ body: { padding: '16px' } }}
                    >
                      {/* ФИО с инициалами */}
                      <div style={{ marginBottom: '12px' }}>
                        <Text strong style={{ fontSize: '16px', display: 'block' }}>
                          <UserOutlined style={{ marginRight: '8px' }} />
                          {getInitials(user)}
                        </Text>
                      </div>

                      <Divider style={{ margin: '12px 0' }} />

                      {/* Email */}
                      <div style={{ marginBottom: '8px' }}>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Email:</Text>
                        <Text style={{ fontSize: '14px' }}>{user.email}</Text>
                      </div>

                      {/* Роль */}
                      <div style={{ marginBottom: '8px' }}>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Роль:</Text>
                        <Tag color="blue">{getRoleLabel(user.role)}</Tag>
                      </div>

                      {/* Компания */}
                      <div style={{ marginBottom: '8px' }}>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Компания:</Text>
                        <Text style={{ fontSize: '14px' }}>{user.company_name || '-'}</Text>
                      </div>

                      {/* Должность */}
                      <div style={{ marginBottom: '8px' }}>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Должность:</Text>
                        <Text style={{ fontSize: '14px' }}>{user.position || '-'}</Text>
                      </div>

                      {/* Телефон */}
                      <div style={{ marginBottom: '8px' }}>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Телефон:</Text>
                        <Text style={{ fontSize: '14px' }}>{formatPhone(user.phone)}</Text>
                      </div>

                      {/* Объекты */}
                      <div style={{ marginBottom: '12px' }}>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Объекты:</Text>
                        {user.user_projects && user.user_projects.length > 0 ? (
                          <div>
                            {user.user_projects.map((project) => (
                              <Tag key={project.id} style={{ marginTop: '4px' }}>
                                {project.name}
                              </Tag>
                            ))}
                          </div>
                        ) : (
                          <Text type="secondary" style={{ fontSize: '14px' }}>Не назначены</Text>
                        )}
                      </div>

                      <Divider style={{ margin: '12px 0' }} />

                      {/* Действия */}
                      <Space direction="vertical" style={{ width: '100%' }} size="small">
                        {/* Редактировать */}
                        {canEditUser() && (
                          <Button
                            type="default"
                            icon={<EditOutlined />}
                            onClick={() => handleEditUser(user)}
                            size="small"
                            block
                          >
                            Редактировать
                          </Button>
                        )}

                        {/* Деактивировать/Активировать */}
                        {canDeactivateUser() && (
                          <Button
                            type="default"
                            icon={user.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                            onClick={() => handleToggleActive(user)}
                            size="small"
                            block
                          >
                            {user.is_active ? 'Деактивировать' : 'Активировать'}
                          </Button>
                        )}

                        {/* Удалить */}
                        {/* Убрали Popconfirm, так как теперь используется тройное подтверждение через tripleConfirm */}
                        {canDeleteUserAction() && (
                          <Button
                            type="default"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                            block
                            onClick={() => handleDeleteUser(user)}
                          >
                            Удалить
                          </Button>
                        )}
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            )
          },
          {
            key: 'deactivated',
            label: `Деактивированные (${deactivatedUsers.length})`,
            children: (
              <Row gutter={[16, 16]}>
                {users.map((user) => (
          <Col
            key={user.id}
            xs={24}  // 1 колонка на очень маленьких экранах
            sm={12}  // 2 колонки на маленьких экранах
            md={8}   // 3 колонки на средних экранах
            lg={8}   // 3 колонки на больших экранах
            xl={4}   // 5 колонок на очень больших экранах (24/5 ≈ 4.8, используем 4)
            xxl={4}  // 5 колонок
          >
            <Card
              hoverable
              style={{ height: '100%' }}
              styles={{ body: { padding: '16px' } }}
            >
              {/* ФИО с инициалами */}
              <div style={{ marginBottom: '12px' }}>
                <Text strong style={{ fontSize: '16px', display: 'block' }}>
                  <UserOutlined style={{ marginRight: '8px' }} />
                  {getInitials(user)}
                </Text>
              </div>

              <Divider style={{ margin: '12px 0' }} />

              {/* Email */}
              <div style={{ marginBottom: '8px' }}>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Email:</Text>
                <Text style={{ fontSize: '14px' }}>{user.email}</Text>
              </div>

              {/* Роль */}
              <div style={{ marginBottom: '8px' }}>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Роль:</Text>
                <Tag color="blue">{getRoleLabel(user.role)}</Tag>
              </div>

              {/* Компания */}
              <div style={{ marginBottom: '8px' }}>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Компания:</Text>
                <Text style={{ fontSize: '14px' }}>{user.company_name || '-'}</Text>
              </div>

              {/* Должность */}
              <div style={{ marginBottom: '8px' }}>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Должность:</Text>
                <Text style={{ fontSize: '14px' }}>{user.position || '-'}</Text>
              </div>

              {/* Телефон */}
              <div style={{ marginBottom: '8px' }}>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Телефон:</Text>
                <Text style={{ fontSize: '14px' }}>{formatPhone(user.phone)}</Text>
              </div>

              {/* Объекты */}
              <div style={{ marginBottom: '12px' }}>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Объекты:</Text>
                {user.user_projects && user.user_projects.length > 0 ? (
                  <div>
                    {user.user_projects.map((project) => (
                      <Tag key={project.id} style={{ marginTop: '4px' }}>
                        {project.name}
                      </Tag>
                    ))}
                  </div>
                ) : (
                  <Text type="secondary" style={{ fontSize: '14px' }}>Не назначены</Text>
                )}
              </div>

              <Divider style={{ margin: '12px 0' }} />

              {/* Действия */}
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {/* Редактировать */}
                {canEditUser() && (
                  <Button
                    type="default"
                    icon={<EditOutlined />}
                    onClick={() => handleEditUser(user)}
                    size="small"
                    block
                  >
                    Редактировать
                  </Button>
                )}

                {/* Деактивировать/Активировать */}
                {canDeactivateUser() && (
                  <Button
                    type="default"
                    icon={user.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                    onClick={() => handleToggleActive(user)}
                    size="small"
                    block
                  >
                    {user.is_active ? 'Деактивировать' : 'Активировать'}
                  </Button>
                )}

                {/* Удалить */}
                {/* Убрали Popconfirm, так как теперь используется тройное подтверждение через tripleConfirm */}
                {canDeleteUserAction() && (
                  <Button
                    type="default"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    block
                    onClick={() => handleDeleteUser(user)}
                  >
                    Удалить
                  </Button>
                )}
              </Space>
            </Card>
          </Col>
        ))}
              </Row>
            )
          }
        ]}
      />

      {/* Modal для создания/редактирования пользователя */}
      <Modal
        title={editingUser ? 'Редактировать сотрудника' : 'Добавить сотрудника'}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText={editingUser ? 'Сохранить' : 'Создать'}
        cancelText="Отмена"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          name="userForm"
        >
          {/* Email */}
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Введите корректный email' }
            ]}
          >
            <Input placeholder="user@example.com" />
          </Form.Item>

          {/* Пароль скрыт - генерируется автоматически на backend */}
          {/* Логин и пароль отправляются на Email указанный в логине и на Telegram номер указанный в поле Телефон */}

          {/* Фамилия */}
          <Form.Item
            name="last_name"
            label="Фамилия"
            rules={[{ required: true, message: 'Введите фамилию' }]}
          >
            <Input placeholder="Иванов" />
          </Form.Item>

          {/* Имя */}
          <Form.Item
            name="first_name"
            label="Имя"
            rules={[{ required: true, message: 'Введите имя' }]}
          >
            <Input placeholder="Иван" />
          </Form.Item>

          {/* Отчество */}
          <Form.Item
            name="middle_name"
            label="Отчество"
          >
            <Input placeholder="Иванович" />
          </Form.Item>

          {/* Выбор категории роли (Технадзор и Авторский надзор управляются на странице Supervisions) */}
          {!editingUser && (
            <Form.Item label="Категория">
              <Select
                placeholder="Выберите категорию"
                onChange={(value) => {
                  setSelectedRole(value)
                  form.setFieldsValue({ role: undefined })
                }}
                allowClear
              >
                <Option value="ITR">ИТР</Option>
                <Option value="MANAGEMENT">Руководство</Option>
                <Option value="MATERIAL_REQUESTS">Заявки на материалы</Option>
              </Select>
            </Form.Item>
          )}

          {/* Роль */}
          <Form.Item
            name="role"
            label="Роль"
            rules={[{ required: true, message: 'Выберите роль' }]}
          >
            <Select placeholder="Выберите роль">
              {getRoleOptions().map(role => (
                <Option key={role.value} value={role.value}>
                  {role.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Должность */}
          <Form.Item
            name="position"
            label="Должность"
          >
            <Input placeholder="Главный специалист" />
          </Form.Item>

          {/* Телефон */}
          <Form.Item
            name="phone"
            label="Телефон"
          >
            <Input placeholder="+7 (777) 777-77-77" />
          </Form.Item>

          {/* Компания (только для суперадмина) */}
          {currentUser?.is_superuser && (
            <Form.Item
              name="company"
              label="Компания"
              rules={[{ required: !editingUser, message: 'Выберите компанию' }]}
            >
              <Select
                placeholder="Выберите компанию"
                loading={companiesLoading}
                disabled={!!editingUser} // При редактировании компанию нельзя менять
                options={companies.map((company: any) => ({
                  label: company.name,
                  value: company.id
                }))}
              />
            </Form.Item>
          )}

          {/* Объекты - доступны и при создании, и при редактировании */}
          <Form.Item
            name="project_ids"
            label="Выберите объекты"
            help="Пользователь будет привязан к выбранным объектам"
          >
            <Select
              mode="multiple"
              placeholder="Выберите один или несколько объектов"
              loading={projectsLoading}
              options={projects.map((project: any) => ({
                label: project.name,
                value: project.id
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Users
