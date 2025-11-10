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
  Popconfirm,
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
import { useButtonAccess } from '../hooks/useButtonAccess'
import { tripleConfirm } from '../utils/tripleConfirm'
import ContractorsImportExport from '../components/ContractorsImportExport'

const { Title, Text } = Typography

const Contractors = () => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const { canUseButton } = useButtonAccess('contractors')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')

  // Проверка доступа текущего пользователя
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authAPI.getCurrentUser,
    retry: 1
  })

  // Функция проверки прав на ДОБАВЛЕНИЕ подрядчика через матрицу доступа
  const canAddContractor = () => {
    // SUPERADMIN всегда имеет доступ
    if (currentUser?.is_superuser || currentUser?.role === 'SUPERADMIN') {
      return true
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('create')
  }

  // Функция проверки прав на РЕДАКТИРОВАНИЕ подрядчика через матрицу доступа
  const canEditContractor = () => {
    // SUPERADMIN всегда имеет доступ
    if (currentUser?.is_superuser || currentUser?.role === 'SUPERADMIN') {
      return true
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('edit')
  }

  // Функция проверки прав на ДЕАКТИВАЦИЮ/АКТИВАЦИЮ подрядчика через матрицу доступа
  const canToggleContractorStatus = () => {
    // SUPERADMIN всегда имеет доступ
    if (currentUser?.is_superuser || currentUser?.role === 'SUPERADMIN') {
      return true
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('toggle_status')
  }

  // Функция проверки прав на АРХИВАЦИЮ подрядчика через матрицу доступа
  const canArchiveContractor = () => {
    // SUPERADMIN всегда имеет доступ
    if (currentUser?.is_superuser || currentUser?.role === 'SUPERADMIN') {
      return true
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('archive')
  }

  // Функция проверки прав на ВОССТАНОВЛЕНИЕ подрядчика из архива через матрицу доступа
  const canRestoreContractor = () => {
    // SUPERADMIN всегда имеет доступ
    if (currentUser?.is_superuser || currentUser?.role === 'SUPERADMIN') {
      return true
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('restore')
  }

  // Функция проверки прав на УДАЛЕНИЕ подрядчика окончательно через матрицу доступа
  const canDeleteContractor = () => {
    // Проверяем через матрицу доступа из админ-панели (без хардкода ролей)
    return canUseButton('delete')
  }

  // Fetch users and filter only contractors
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

  // Фильтруем только подрядчиков (CONTRACTOR)
  const allUsers: User[] = Array.isArray(data) ? data : (data?.results || [])
  const allContractors: User[] = allUsers.filter(user => user.role === 'CONTRACTOR')

  // Разделяем на активных и архивных
  const activeContractors: User[] = allContractors.filter(user => !user.archived)
  const archivedContractors: User[] = allContractors.filter(user => user.archived)

  // Выбираем список в зависимости от активной вкладки
  const contractors: User[] = activeTab === 'active' ? activeContractors : archivedContractors

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

  // Create contractor mutation
  const createContractorMutation = useMutation({
    mutationFn: usersAPI.createUser,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success(`Подрядчик "${data.email}" успешно добавлен`)
      form.resetFields()
      setIsModalOpen(false)
    },
    onError: (error: any) => {
      console.error('Failed to create contractor:', error)
      const errorData = error.response?.data
      if (errorData) {
        const errorMessages: string[] = []
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
        if (errorMessages.length > 0) {
          errorMessages.forEach(msg => message.error(msg))
        } else {
          message.error('Ошибка при создании подрядчика')
        }
      } else {
        message.error('Ошибка при создании подрядчика')
      }
    }
  })

  // Update contractor mutation
  const updateContractorMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<CreateUserData> }) =>
      usersAPI.updateUser(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success(`Подрядчик "${data.email}" успешно обновлен`)
      form.resetFields()
      setIsModalOpen(false)
      setEditingUser(null)
    },
    onError: (error: any) => {
      console.error('Failed to update contractor:', error)
      message.error(error.response?.data?.detail || 'Ошибка при обновлении подрядчика')
    }
  })

  // Delete contractor mutation
  const deleteContractorMutation = useMutation({
    mutationFn: usersAPI.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success('Подрядчик успешно удален')
    },
    onError: (error: any) => {
      console.error('Failed to delete contractor:', error)
      message.error('Ошибка при удалении подрядчика')
    }
  })

  // Deactivate contractor mutation
  const deactivateContractorMutation = useMutation({
    mutationFn: (id: number) => usersAPI.deactivateUser(id),
    onSuccess: (updatedUser: any) => {
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
      message.success('Подрядчик деактивирован')
    },
    onError: (error: any) => {
      console.error('Failed to deactivate contractor:', error)
      message.error('Ошибка при деактивации подрядчика')
    }
  })

  // Activate contractor mutation
  const activateContractorMutation = useMutation({
    mutationFn: (id: number) => usersAPI.activateUser(id),
    onSuccess: (updatedUser: any) => {
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
      message.success('Подрядчик активирован')
    },
    onError: (error: any) => {
      console.error('Failed to activate contractor:', error)
      message.error('Ошибка при активации подрядчика')
    }
  })

  // Archive contractor mutation
  const archiveContractorMutation = useMutation({
    mutationFn: (id: number) => usersAPI.archiveUser(id),
    onSuccess: (updatedUser: any) => {
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
      message.success('Подрядчик перемещен в архив')
    },
    onError: (error: any) => {
      console.error('Failed to archive contractor:', error)
      message.error('Ошибка при архивации подрядчика')
    }
  })

  // Unarchive contractor mutation
  const unarchiveContractorMutation = useMutation({
    mutationFn: (id: number) => usersAPI.unarchiveUser(id),
    onSuccess: (updatedUser: any) => {
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
      message.success('Подрядчик восстановлен из архива')
    },
    onError: (error: any) => {
      console.error('Failed to unarchive contractor:', error)
      message.error('Ошибка при восстановлении подрядчика')
    }
  })

  const handleCreateContractor = () => {
    setEditingUser(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleEditContractor = (contractor: User) => {
    setEditingUser(contractor)
    form.setFieldsValue({
      email: contractor.email,
      first_name: contractor.first_name,
      last_name: contractor.last_name,
      contractor_company: (contractor as any).external_company_name || contractor.position,
      position: contractor.position,
      phone: contractor.phone,
      company: contractor.company,
      project_ids: contractor.user_projects?.map((p: any) => p.id) || []
    })
    setIsModalOpen(true)
  }

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      if (editingUser) {
        // Обновление подрядчика
        const updateData: any = {
          email: values.email,
          first_name: values.first_name,
          last_name: values.last_name,
          middle_name: '',
          role: 'CONTRACTOR',
          external_company_name: values.contractor_company,
          position: values.position || '',
          phone: values.phone,
          project_ids: values.project_ids || []
        }

        if (currentUser?.is_superuser && values.company) {
          updateData.company = values.company
        }

        updateContractorMutation.mutate({
          id: editingUser.id,
          data: updateData
        })
      } else {
        // Создание нового подрядчика
        const userData: any = {
          email: values.email,
          first_name: values.first_name,
          last_name: values.last_name,
          middle_name: '',
          role: 'CONTRACTOR',
          external_company_name: values.contractor_company,
          position: values.position || '',
          phone: values.phone,
          project_ids: values.project_ids || []
        }

        if (currentUser?.is_superuser && values.company) {
          userData.company = values.company
        }

        console.log('Creating contractor with data:', userData)
        createContractorMutation.mutate(userData)
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
  }

  // Обработчик удаления подрядчика с тройным подтверждением
  // Принимает объект подрядчика для отображения его имени в диалогах подтверждения
  const handleDeleteContractor = (contractor: User) => {
    // Формируем имя подрядчика для отображения в диалогах подтверждения
    const contractorName = `${contractor.last_name} ${contractor.first_name}`.trim() || contractor.email

    // Используем тройное подтверждение для защиты от случайного удаления
    tripleConfirm({
      itemName: contractorName,
      itemType: 'подрядчика',
      onConfirm: () => {
        deleteContractorMutation.mutate(contractor.id)
      }
    })
  }

  const handleArchiveContractor = (id: number) => {
    archiveContractorMutation.mutate(id)
  }

  const handleUnarchiveContractor = (id: number) => {
    unarchiveContractorMutation.mutate(id)
  }

  const handleToggleActive = (contractor: User) => {
    if (contractor.is_active) {
      deactivateContractorMutation.mutate(contractor.id)
    } else {
      activateContractorMutation.mutate(contractor.id)
    }
  }


  const getInitials = (contractor: User) => {
    const firstNameInitial = contractor.first_name ? contractor.first_name.charAt(0) + '.' : ''
    return `${contractor.last_name} ${firstNameInitial}`
  }

  const formatPhone = (phone?: string) => {
    if (!phone) return '-'
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
        <Spin size="large" tip="Загрузка подрядчиков...">
          <div style={{ minHeight: '200px' }} />
        </Spin>
      </div>
    )
  }

  // Show error state
  if (isError) {
    return (
      <Alert
        message="Ошибка загрузки"
        description={error?.message || 'Не удалось загрузить список подрядчиков'}
        type="error"
        showIcon
      />
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Заголовок страницы */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>Подрядчики</Title>

        {/* Кнопки управления подрядчиками */}
        <Space size="middle">
          {/* Кнопки импорта/экспорта v2 с расширенным функционалом */}
          {canAddContractor() && <ContractorsImportExport />}

          {/* Кнопка "Добавить подрядчика" */}
          {canAddContractor() && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateContractor}
              size="large"
            >
              Добавить подрядчика
            </Button>
          )}
        </Space>
      </div>

      {/* Вкладки: Активные / Архив */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'active' | 'archived')}
        style={{ marginBottom: '24px' }}
        items={[
          {
            key: 'active',
            label: `Активные (${activeContractors.length})`,
          },
          {
            key: 'archived',
            label: `Архив (${archivedContractors.length})`,
          },
        ]}
      />

      {/* Сетка карточек подрядчиков */}
      <Row gutter={[16, 16]}>
        {contractors.map((contractor) => (
          <Col
            key={contractor.id}
            xs={24}
            sm={12}
            md={8}
            lg={8}
            xl={4}
            xxl={4}
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
                  {getInitials(contractor)}
                </Text>
              </div>

              <Divider style={{ margin: '12px 0' }} />

              {/* Email */}
              <div style={{ marginBottom: '8px' }}>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Email:</Text>
                <Text style={{ fontSize: '14px' }}>{contractor.email}</Text>
              </div>

              {/* Компания подрядчика */}
              <div style={{ marginBottom: '8px' }}>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Компания подрядчика:</Text>
                <Text style={{ fontSize: '14px' }}>{(contractor as any).external_company_name || contractor.position || '-'}</Text>
              </div>

              {/* Должность - показываем только если есть external_company_name (новые данные) И должность отличается от названия компании */}
              {(contractor as any).external_company_name && contractor.position && contractor.position !== (contractor as any).external_company_name && (
                <div style={{ marginBottom: '8px' }}>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Должность:</Text>
                  <Text style={{ fontSize: '14px' }}>{contractor.position}</Text>
                </div>
              )}

              {/* Телефон */}
              <div style={{ marginBottom: '8px' }}>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Телефон:</Text>
                <Text style={{ fontSize: '14px' }}>{formatPhone(contractor.phone)}</Text>
              </div>

              {/* Объекты */}
              <div style={{ marginBottom: '12px' }}>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Объекты:</Text>
                {contractor.user_projects && contractor.user_projects.length > 0 ? (
                  <div>
                    {contractor.user_projects.map((project) => (
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
                {canEditContractor() && (
                  <Button
                    type="default"
                    icon={<EditOutlined />}
                    onClick={() => handleEditContractor(contractor)}
                    size="small"
                    block
                  >
                    Редактировать
                  </Button>
                )}

                {/* Деактивировать/Активировать */}
                {canToggleContractorStatus() && (
                  <Button
                    type="default"
                    icon={contractor.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                    onClick={() => handleToggleActive(contractor)}
                    size="small"
                    block
                  >
                    {contractor.is_active ? 'Деактивировать' : 'Активировать'}
                  </Button>
                )}

                {/* В архив / Восстановить из архива */}
                {canArchiveContractor() && !contractor.archived && (
                  <Popconfirm
                    title="Переместить в архив"
                    description="Подрядчик будет перемещен в архив. Данные сохранятся."
                    onConfirm={() => handleArchiveContractor(contractor.id)}
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
                {canRestoreContractor() && contractor.archived && (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleUnarchiveContractor(contractor.id)}
                    size="small"
                    block
                  >
                    Восстановить
                  </Button>
                )}

                {/* Удалить окончательно (только для суперадмина в архиве) */}
                {/* Убрали Popconfirm, так как теперь используется тройное подтверждение через tripleConfirm */}
                {canDeleteContractor() && contractor.archived && (
                  <Button
                    type="default"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    block
                    onClick={() => handleDeleteContractor(contractor)}
                  >
                    Удалить окончательно
                  </Button>
                )}
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Modal для создания/редактирования подрядчика */}
      <Modal
        title={editingUser ? 'Редактировать подрядчика' : 'Добавить подрядчика'}
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
          name="contractorForm"
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
            <Input placeholder="contractor@example.com" />
          </Form.Item>

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

          {/* Компания подрядчика */}
          <Form.Item
            name="contractor_company"
            label="Компания подрядчика"
            rules={[{ required: true, message: 'Введите название компании подрядчика' }]}
          >
            <Input placeholder="ТОО Строитель" />
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
                disabled={!!editingUser}
                options={companies.map((company: any) => ({
                  label: company.name,
                  value: company.id
                }))}
              />
            </Form.Item>
          )}

          {/* Объекты */}
          <Form.Item
            name="project_ids"
            label="Выберите объекты"
            help="Подрядчик будет привязан к выбранным объектам"
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

export default Contractors
