import { useState } from 'react'
import {
  Typography,
  Button,
  Table,
  Space,
  Modal,
  Form,
  Input,
  Alert,
  Card,
  Descriptions,
  Upload,
  message,
  Spin
} from 'antd'
import {
  PlusOutlined,
  FileOutlined,
  UploadOutlined,
  FilePdfOutlined,
  DownloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  FileExcelOutlined,
  ImportOutlined,
  ExportOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload/interface'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsAPI } from '../api/projects'
import { usersAPI, User } from '../api/users'
import { useAuthStore } from '../stores/authStore'
import { tripleConfirm } from '../utils/tripleConfirm'

const { Title, Text } = Typography
const { TextArea } = Input

interface Drawing {
  id: number
  file: string | null
  file_name: string
  file_size: string | null
  uploaded_by_full_name: string
  uploaded_by_role: string
  created_at: string
}

interface Contractor {
  id: number
  full_name: string
  phone: string
  email: string
  position: string
}

interface Project {
  id: number
  name: string
  address: string
  is_active: boolean
  drawings?: Drawing[]
  contractors?: Contractor[]
  team_members_details?: User[]  // Детальная информация об участниках проекта
}

const Projects = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false)
  const [isContractorsModalOpen, setIsContractorsModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  // Получаем текущего пользователя из authStore
  const { user } = useAuthStore()

  // Функция проверки прав на ДОБАВЛЕНИЕ объекта
  // Доступно: Директор, Главный инженер, Руководитель проекта, Начальник участка, Инженер, Прораб
  const canAddProject = () => {
    if (!user) return false
    if (user.is_superuser) return true
    const allowedRoles = ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 'ENGINEER', 'FOREMAN']
    return allowedRoles.includes(user.role)
  }

  // Функция проверки прав на РЕДАКТИРОВАНИЕ объекта
  // Доступно: Директор, Главный инженер, Руководитель проекта, Начальник участка, Инженер, Прораб
  const canEditProject = () => {
    if (!user) return false
    if (user.is_superuser) return true
    const allowedRoles = ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 'ENGINEER', 'FOREMAN']
    return allowedRoles.includes(user.role)
  }

  // Функция проверки прав на УДАЛЕНИЕ объекта
  // Доступно: Директор, Главный инженер, Руководитель проекта, Начальник участка, Инженер (БЕЗ Прораба)
  const canDeleteProject = () => {
    if (!user) return false
    if (user.is_superuser) return true
    const allowedRoles = ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 'ENGINEER']
    return allowedRoles.includes(user.role)
  }

  // Функция проверки прав на ДОБАВЛЕНИЕ чертежа
  // Доступно: Директор, Главный инженер, Руководитель проекта, Начальник участка, Инженер, Прораб
  const canAddDrawing = () => {
    if (!user) return false
    if (user.is_superuser) return true
    const allowedRoles = ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 'ENGINEER', 'FOREMAN']
    return allowedRoles.includes(user.role)
  }

  // Функция проверки прав на УДАЛЕНИЕ чертежа
  // Доступно: Директор, Главный инженер, Руководитель проекта, Начальник участка, Инженер (БЕЗ Прораба)
  const canDeleteDrawing = () => {
    if (!user) return false
    if (user.is_superuser) return true
    const allowedRoles = ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'SITE_MANAGER', 'ENGINEER']
    return allowedRoles.includes(user.role)
  }

  // Fetch projects with better error handling
  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      try {
        const result = await projectsAPI.getProjects()
        console.log('Projects loaded:', result)
        return result
      } catch (err) {
        console.error('Failed to load projects:', err)
        throw err
      }
    },
    retry: 1,
    staleTime: 30000
  })

  // Safely extract projects from data
  const projects: Project[] = Array.isArray(data) ? data : (data?.results || [])

  // Fetch users for personnel column
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: usersAPI.getUsers,
    retry: 1,
    staleTime: 30000
  })

  // Safely extract users from data
  const users: User[] = Array.isArray(usersData) ? usersData : (usersData?.results || [])

  // FIXED infinite reload: Удален debug useEffect, который мог вызывать лишние рендеры

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: projectsAPI.createProject,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      message.success(`Объект "${data.name}" успешно добавлен`)
      form.resetFields()
      setIsModalOpen(false)
    },
    onError: (error: any) => {
      console.error('Failed to create project:', error)
      message.error('Ошибка при создании объекта')
    }
  })

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => projectsAPI.updateProject(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      message.success(`Объект "${data.name}" успешно обновлён`)
      form.resetFields()
      setIsModalOpen(false)
      setEditingProject(null)
    },
    onError: (error: any) => {
      console.error('Failed to update project:', error)
      message.error('Ошибка при обновлении объекта')
    }
  })

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: projectsAPI.deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      message.success('Объект успешно удалён')
    },
    onError: (error: any) => {
      console.error('Failed to delete project:', error)
      message.error('Ошибка при удалении объекта')
    }
  })

  // Delete drawing mutation
  const deleteDrawingMutation = useMutation({
    mutationFn: projectsAPI.deleteDrawing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      message.success('Чертёж успешно удалён')
    },
    onError: (error: any) => {
      console.error('Failed to delete drawing:', error)
      message.error('Ошибка при удалении чертежа')
    }
  })

  // Upload drawing mutation
  const uploadDrawingMutation = useMutation({
    mutationFn: ({ projectId, file, fileName }: { projectId: number, file: File, fileName: string }) =>
      projectsAPI.uploadDrawing(projectId, file, fileName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error: any) => {
      console.error('Failed to upload drawing:', error)
    }
  })

  // Excel import mutation
  const importExcelMutation = useMutation({
    mutationFn: projectsAPI.importExcel,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      const { created, errors } = data

      if (errors && errors.length > 0) {
        Modal.warning({
          title: 'Импорт завершен с предупреждениями',
          content: (
            <div>
              <p>Импортировано проектов: {created}</p>
              <p>Обнаружены ошибки:</p>
              <ul>
                {errors.map((err: string, idx: number) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          ),
          width: 600
        })
      } else {
        message.success(`Успешно импортировано проектов: ${created}`)
      }
    },
    onError: (error: any) => {
      console.error('Failed to import Excel:', error)
      const errorMessage = error.response?.data?.errors?.join('\n') || 'Ошибка при импорте Excel файла'
      message.error(errorMessage)
    }
  })

  const showDrawings = (project: Project) => {
    console.log('Opening drawings for project:', project)
    setSelectedProject(project)
    setIsDrawingModalOpen(true)
  }

  const showPersonnel = (project: Project) => {
    console.log('Opening personnel for project:', project)
    setSelectedProject(project)
    setIsPersonnelModalOpen(true)
  }

  const handlePersonnelModalCancel = () => {
    setIsPersonnelModalOpen(false)
    setSelectedProject(null)
  }

  const showContractors = (project: Project) => {
    console.log('Opening contractors for project:', project)
    setSelectedProject(project)
    setIsContractorsModalOpen(true)
  }

  const handleContractorsModalCancel = () => {
    setIsContractorsModalOpen(false)
    setSelectedProject(null)
  }

  const handleAddProject = () => {
    setEditingProject(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleEditProject = (project: Project) => {
    setEditingProject(project)
    form.setFieldsValue({
      name: project.name,
      address: project.address,
      description: (project as any).description || ''
    })
    setIsModalOpen(true)
  }

  const handleDeleteProject = (project: Project) => {
    // Используем тройное подтверждение для защиты от случайного удаления
    tripleConfirm({
      itemName: project.name,
      itemType: 'объект',
      onConfirm: () => {
        deleteProjectMutation.mutate(project.id)
      }
    })
  }

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      if (editingProject) {
        // Обновление существующего объекта
        updateProjectMutation.mutate({
          id: editingProject.id,
          data: {
            name: values.name,
            address: values.address,
            description: values.description
          }
        })
      } else {
        // Создание нового объекта
        createProjectMutation.mutate({
          name: values.name,
          address: values.address,
          description: values.description,
          is_active: true
        })
      }
    }).catch((err) => {
      console.error('Form validation failed:', err)
      message.error('Пожалуйста, заполните все обязательные поля')
    })
  }

  const handleModalCancel = () => {
    form.resetFields()
    setIsModalOpen(false)
    setEditingProject(null)
  }

  const handleDrawingModalCancel = () => {
    setIsDrawingModalOpen(false)
    setSelectedProject(null)
  }

  const handleAddDrawing = () => {
    setIsUploadModalOpen(true)
  }

  const handleUploadModalOk = async () => {
    if (fileList.length === 0) {
      message.error('Пожалуйста, выберите PDF файл')
      return
    }

    if (!selectedProject) {
      message.error('Проект не выбран')
      return
    }

    try {
      // Upload all files
      const uploads = fileList.map(file => {
        const originalFile = file.originFileObj as File
        return uploadDrawingMutation.mutateAsync({
          projectId: selectedProject.id,
          file: originalFile,
          fileName: file.name
        })
      })

      await Promise.all(uploads)

      message.success(`Добавлено чертежей: ${fileList.length}`)
      setFileList([])
      setIsUploadModalOpen(false)

      // Refresh selected project to show new drawings
      const updatedProjects: any = await queryClient.fetchQuery({
        queryKey: ['projects']
      })
      const projectsList = Array.isArray(updatedProjects) ? updatedProjects : (updatedProjects?.results || [])
      const updatedProject = projectsList.find((p: Project) => p.id === selectedProject.id)
      if (updatedProject) {
        setSelectedProject(updatedProject)
      }
    } catch (error) {
      console.error('Upload failed:', error)
      message.error('Ошибка при загрузке чертежей')
    }
  }

  const handleUploadModalCancel = () => {
    setFileList([])
    setIsUploadModalOpen(false)
  }

  const handleViewDrawing = (fileUrl: string | null) => {
    // Проверка на null/undefined
    if (!fileUrl) {
      message.error('Файл чертежа не найден')
      return
    }

    // Открыть PDF в новой вкладке
    // На production файлы находятся на admin.stroyka.asia, а фронтенд на stroyka.asia
    // Поэтому для относительных URL подставляем полный путь к admin.stroyka.asia
    let fullUrl = fileUrl

    if (!fileUrl.startsWith('http')) {
      // URL относительный (/media/...)
      const isProduction = window.location.hostname === 'stroyka.asia'
      if (isProduction) {
        // На production используем домен admin.stroyka.asia для медиа файлов
        fullUrl = `https://admin.stroyka.asia${fileUrl}`
      } else {
        // На localhost используем относительный URL
        fullUrl = fileUrl
      }
    }

    window.open(fullUrl, '_blank')
  }

  const handleDownloadDrawing = async (fileUrl: string | null, fileName: string) => {
    try {
      // Проверка на null/undefined
      if (!fileUrl) {
        message.error('Файл чертежа не найден')
        return
      }

      // На production файлы находятся на admin.stroyka.asia, а фронтенд на stroyka.asia
      // Поэтому для относительных URL подставляем полный путь к admin.stroyka.asia
      let fullUrl = fileUrl

      if (!fileUrl.startsWith('http')) {
        // URL относительный (/media/...)
        const isProduction = window.location.hostname === 'stroyka.asia'
        if (isProduction) {
          // На production используем домен admin.stroyka.asia для медиа файлов
          fullUrl = `https://admin.stroyka.asia${fileUrl}`
        } else {
          // На localhost используем относительный URL
          fullUrl = fileUrl
        }
      }
      
      // Скачать файл
      const response = await fetch(fullUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      message.success('Файл успешно скачан')
    } catch (error) {
      console.error('Download failed:', error)
      message.error('Ошибка при скачивании файла')
    }
  }

  const handleDeleteDrawing = (drawing: Drawing) => {
    // Используем тройное подтверждение для защиты от случайного удаления
    tripleConfirm({
      itemName: drawing.file_name,
      itemType: 'чертёж',
      onConfirm: async () => {
        await deleteDrawingMutation.mutateAsync(drawing.id)
        // Обновляем выбранный проект после удаления чертежа
        if (selectedProject) {
          const updatedProjects: any = await queryClient.fetchQuery({
            queryKey: ['projects']
          })
          const projectsList = Array.isArray(updatedProjects) ? updatedProjects : (updatedProjects?.results || [])
          const updatedProject = projectsList.find((p: Project) => p.id === selectedProject.id)
          if (updatedProject) {
            setSelectedProject(updatedProject)
          }
        }
      }
    })
  }

  const uploadProps = {
    fileList,
    beforeUpload: (file: File) => {
      // Проверяем, что файл имеет формат PDF
      const isPDF = file.type === 'application/pdf'
      if (!isPDF) {
        message.error('Можно загружать только PDF файлы!')
        return false
      }

      // Создаём объект файла для добавления в список
      const uploadFile: UploadFile = {
        uid: `${Date.now()}-${Math.random()}`,
        name: file.name,
        status: 'done' as const,
        originFileObj: file as any
      }

      // Используем функциональное обновление состояния для корректной работы
      // при множественном выборе файлов (избегаем race condition)
      setFileList(prevList => [...prevList, uploadFile])
      return false
    },
    onRemove: (file: UploadFile) => {
      // Используем функциональное обновление состояния для удаления файла
      // из списка выбранных файлов
      setFileList(prevList => prevList.filter(f => f.uid !== file.uid))
    },
    accept: '.pdf'
  }

  // Обработчик скачивания шаблона Excel
  const handleDownloadTemplate = async () => {
    try {
      message.loading({ content: 'Скачивание шаблона...', key: 'download-template' })
      const blob = await projectsAPI.downloadTemplate()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'projects_template.xlsx'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      message.success({ content: 'Шаблон успешно скачан', key: 'download-template' })
    } catch (error) {
      console.error('Failed to download template:', error)
      message.error({ content: 'Ошибка при скачивании шаблона', key: 'download-template' })
    }
  }

  // Обработчик импорта Excel
  const handleImportExcel = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx'
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (!file.name.endsWith('.xlsx')) {
        message.error('Пожалуйста, выберите файл Excel (.xlsx)')
        return
      }

      try {
        message.loading({ content: 'Импорт данных из Excel...', key: 'import-excel' })
        await importExcelMutation.mutateAsync(file)
        message.destroy('import-excel')
      } catch (error) {
        message.destroy('import-excel')
      }
    }
    input.click()
  }

  // Обработчик экспорта Excel
  const handleExportExcel = async () => {
    try {
      message.loading({ content: 'Экспорт данных в Excel...', key: 'export-excel' })
      const blob = await projectsAPI.exportExcel()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `projects_export_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      message.success({ content: 'Данные успешно экспортированы', key: 'export-excel' })
    } catch (error) {
      console.error('Failed to export Excel:', error)
      message.error({ content: 'Ошибка при экспорте данных', key: 'export-excel' })
    }
  }

  const columns: ColumnsType<Project> = [
    {
      title: 'Название объекта',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Адрес',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => {
        if (!date) return '-'
        const d = new Date(date)
        return d.toLocaleDateString('ru-RU', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      },
    },
    {
      title: 'Сотрудники',
      key: 'personnel',
      render: (_: any, record: Project) => {
        // Используем team_members_details из API проекта вместо фильтрации общего списка users
        // Фильтруем только роли: ИТР и Руководство
        const ITR_ROLES = ['ENGINEER', 'SITE_MANAGER', 'FOREMAN', 'MASTER']
        const MANAGEMENT_ROLES = ['PROJECT_MANAGER', 'CHIEF_ENGINEER', 'DIRECTOR']
        const allowedRoles = [...ITR_ROLES, ...MANAGEMENT_ROLES]

        const projectUsers = (record.team_members_details || []).filter((user: any) =>
          allowedRoles.includes(user.role)
        )

        const count = projectUsers.length

        return (
          <Space>
            <Button
              icon={<UserOutlined />}
              onClick={() => showPersonnel(record)}
            >
              Сотрудники ({count})
            </Button>
          </Space>
        )
      },
    },
    {
      title: 'Подрядчики',
      key: 'contractors',
      render: (_: any, record: Project) => {
        // Получаем количество подрядчиков для проекта
        const count = record.contractors?.length || 0

        return (
          <Space>
            <Button
              icon={<UserOutlined />}
              onClick={() => showContractors(record)}
            >
              Подрядчики ({count})
            </Button>
          </Space>
        )
      },
    },
    {
      title: 'Чертежи',
      key: 'drawings',
      render: (_, record) => {
        const count = record.drawings?.length || 0
        return (
          <Space>
            <Button
              icon={<FileOutlined />}
              onClick={() => showDrawings(record)}
            >
              Чертежи ({count})
            </Button>
          </Space>
        )
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => {
        // Кнопки "Редактировать" и "Удалить" используют разные права доступа
        const hasEditRights = canEditProject()
        const hasDeleteRights = canDeleteProject()

        // Если нет ни одного права, не показываем колонку
        if (!hasEditRights && !hasDeleteRights) {
          return null
        }

        return (
          <Space>
            {/* Редактировать: Директор, Главный инженер, Руководитель проекта, Начальник участка, Инженер, Прораб */}
            {hasEditRights && (
              <Button
                icon={<EditOutlined />}
                onClick={() => handleEditProject(record)}
                size="small"
              >
                Редактировать
              </Button>
            )}
            {/* Удалить: Директор, Главный инженер, Руководитель проекта, Начальник участка, Инженер (БЕЗ Прораба) */}
            {hasDeleteRights && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteProject(record)}
                size="small"
              >
                Удалить
              </Button>
            )}
          </Space>
        )
      },
    },
  ]

  // Show loading state
  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '20px' }}>Загрузка объектов...</div>
      </div>
    )
  }

  // Show error state
  if (isError) {
    return (
      <div>
        <Title level={2}>Проекты</Title>
        <Alert
          message="Ошибка загрузки данных"
          description={`Не удалось загрузить список объектов. ${error?.message || 'Проверьте подключение к серверу.'}`}
          type="error"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['projects'] })}>
          Повторить попытку
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <Title level={2}>Проекты</Title>
          <Space>
            {/* Кнопки Excel доступны всем */}
            <Button
              icon={<FileExcelOutlined />}
              onClick={handleDownloadTemplate}
            >
              Скачать шаблон
            </Button>
            <Button
              icon={<ImportOutlined />}
              onClick={handleImportExcel}
            >
              Импорт Excel
            </Button>
            <Button
              icon={<ExportOutlined />}
              onClick={handleExportExcel}
            >
              Экспорт Excel
            </Button>
            {/* Кнопка "Добавить объект": Директор, Главный инженер, Руководитель проекта, Начальник участка, Инженер, Прораб */}
            {canAddProject() && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddProject}
              >
                Добавить объект
              </Button>
            )}
          </Space>
        </div>
        <Alert
          message="Чертежи в формате PDF"
          description="В этом разделе можно добавлять чертежи в формате PDF. К каждому чертежу будет автоматически добавлена информация о том, кто его добавил (ФИО, Должность, Отдел) и дата добавления."
          type="info"
          icon={<FilePdfOutlined />}
          showIcon
        />
      </div>

      <Table
        columns={columns}
        dataSource={projects}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
        locale={{
          emptyText: 'Нет объектов. Нажмите "Добавить объект" чтобы создать новый.'
        }}
      />

      {/* Модальное окно добавления/редактирования объекта */}
      <Modal
        title={editingProject ? "Редактировать объект" : "Добавить новый объект"}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText={editingProject ? "Сохранить" : "Добавить"}
        cancelText="Отмена"
        confirmLoading={createProjectMutation.isPending || updateProjectMutation.isPending}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          name="add_project"
        >
          <Form.Item
            name="name"
            label="Название объекта"
            rules={[{ required: true, message: 'Введите название объекта' }]}
          >
            <Input placeholder="Например: ЖК Восход" />
          </Form.Item>

          <Form.Item
            name="address"
            label="Адрес"
            rules={[{ required: true, message: 'Введите адрес объекта' }]}
          >
            <Input placeholder="Например: ул. Ленина, 123" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <TextArea rows={4} placeholder="Краткое описание объекта" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно просмотра чертежей */}
      <Modal
        title={`Чертежи объекта: ${selectedProject?.name || ''}`}
        open={isDrawingModalOpen}
        onCancel={handleDrawingModalCancel}
        footer={[
          <Button key="close" onClick={handleDrawingModalCancel}>
            Закрыть
          </Button>,
          // Кнопка "Добавить чертёж": Директор, Главный инженер, Руководитель проекта, Начальник участка, Инженер, Прораб
          ...(canAddDrawing() ? [
            <Button
              key="add"
              type="primary"
              icon={<UploadOutlined />}
              onClick={handleAddDrawing}
            >
              Добавить чертёж
            </Button>
          ] : [])
        ]}
        width={800}
      >
        {!selectedProject || !selectedProject.drawings || selectedProject.drawings.length === 0 ? (
          <Alert
            message="Нет чертежей"
            description="Для этого объекта пока не добавлено ни одного чертежа. Нажмите кнопку 'Добавить чертёж', чтобы загрузить PDF-файл."
            type="warning"
            showIcon
          />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {selectedProject.drawings.map((drawing) => (
              <Card
                key={drawing.id}
                size="small"
                title={
                  <Space>
                    <FilePdfOutlined style={{ color: '#ff4d4f' }} />
                    <Text strong>{drawing.file_name}</Text>
                  </Space>
                }
                extra={
                  <Space>
                    <Button
                      type="primary"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewDrawing(drawing.file)}
                      size="small"
                    >
                      Открыть
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownloadDrawing(drawing.file, drawing.file_name)}
                      size="small"
                    >
                      Скачать
                    </Button>
                    {/* Кнопка "Удалить чертёж": Директор, Главный инженер, Руководитель проекта, Начальник участка, Инженер (БЕЗ Прораба) */}
                    {canDeleteDrawing() && (
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteDrawing(drawing)}
                        size="small"
                      >
                        Удалить
                      </Button>
                    )}
                  </Space>
                }
              >
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Кто добавил">
                    {drawing.uploaded_by_full_name} · {drawing.uploaded_by_role}
                  </Descriptions.Item>
                  <Descriptions.Item label="Дата добавления">
                    {new Date(drawing.created_at).toLocaleDateString('ru-RU')}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            ))}
          </Space>
        )}
      </Modal>

      {/* Модальное окно загрузки чертежей */}
      <Modal
        title="Загрузить чертежи (PDF)"
        open={isUploadModalOpen}
        onOk={handleUploadModalOk}
        onCancel={handleUploadModalCancel}
        okText="Загрузить"
        cancelText="Отмена"
        confirmLoading={uploadDrawingMutation.isPending}
      >
        <Alert
          message="Требования к файлам"
          description="Загружайте только файлы в формате PDF. Размер файла не ограничен."
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        <Upload.Dragger {...uploadProps} multiple>
          <p className="ant-upload-drag-icon">
            <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: '48px' }} />
          </p>
          <p className="ant-upload-text">Нажмите или перетащите PDF файлы</p>
          <p className="ant-upload-hint">
            Поддерживается загрузка одного или нескольких файлов одновременно
          </p>
        </Upload.Dragger>
      </Modal>

      {/* Модальное окно списка сотрудников */}
      <Modal
        title={`Сотрудники объекта: ${selectedProject?.name || ''}`}
        open={isPersonnelModalOpen}
        onCancel={handlePersonnelModalCancel}
        footer={[
          <Button key="close" onClick={handlePersonnelModalCancel}>
            Закрыть
          </Button>
        ]}
        width={700}
      >
        {(() => {
          if (!selectedProject) return null

          // Используем team_members_details из API проекта вместо фильтрации общего списка users
          // Фильтруем только роли: ИТР и Руководство
          const ITR_ROLES = ['ENGINEER', 'SITE_MANAGER', 'FOREMAN', 'MASTER']
          const MANAGEMENT_ROLES = ['PROJECT_MANAGER', 'CHIEF_ENGINEER', 'DIRECTOR']
          const allowedRoles = [...ITR_ROLES, ...MANAGEMENT_ROLES]

          const projectUsers = (selectedProject.team_members_details || []).filter((user: User) =>
            allowedRoles.includes(user.role)
          )

          if (projectUsers.length === 0) {
            return (
              <Alert
                message="Нет персонала"
                description="Для этого объекта пока не назначен ни один сотрудник из категорий ИТР и Руководство."
                type="warning"
                showIcon
              />
            )
          }

          // Получаем названия ролей
          const getRoleLabel = (role: string) => {
            const roleLabels: { [key: string]: string } = {
              'ENGINEER': 'Инженер ПТО',
              'SITE_MANAGER': 'Начальник участка',
              'FOREMAN': 'Прораб',
              'MASTER': 'Мастер',
              'PROJECT_MANAGER': 'Руководитель проекта',
              'CHIEF_ENGINEER': 'Главный инженер',
              'DIRECTOR': 'Директор'
            }
            return roleLabels[role] || role
          }

          return (
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {projectUsers.map((user: User) => (
                <Card
                  key={user.id}
                  size="small"
                  bodyStyle={{ padding: '12px' }}
                >
                  <div style={{ marginBottom: '4px' }}>
                    <Text strong>
                      {user.last_name} {user.first_name} - {user.position || getRoleLabel(user.role)}
                    </Text>
                  </div>
                  <div style={{ color: '#666' }}>
                    {user.phone || 'Телефон не указан'} - {user.email}
                  </div>
                </Card>
              ))}
            </Space>
          )
        })()}
      </Modal>

      {/* Модальное окно списка подрядчиков */}
      <Modal
        title={`Подрядчики объекта: ${selectedProject?.name || ''}`}
        open={isContractorsModalOpen}
        onCancel={handleContractorsModalCancel}
        footer={[
          <Button key="close" onClick={handleContractorsModalCancel}>
            Закрыть
          </Button>
        ]}
        width={700}
      >
        {(() => {
          if (!selectedProject) return null

          const contractors = selectedProject.contractors || []

          if (contractors.length === 0) {
            return (
              <Alert
                message="Нет подрядчиков"
                description="Для этого объекта пока не назначен ни один подрядчик."
                type="warning"
                showIcon
              />
            )
          }

          return (
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {contractors.map((contractor) => (
                <Card
                  key={contractor.id}
                  size="small"
                  bodyStyle={{ padding: '12px' }}
                >
                  <div style={{ marginBottom: '4px' }}>
                    <Text strong>
                      {contractor.full_name} - {contractor.position || 'Подрядчик'}
                    </Text>
                  </div>
                  <div style={{ color: '#666' }}>
                    {contractor.phone || 'Телефон не указан'} - {contractor.email}
                  </div>
                </Card>
              ))}
            </Space>
          )
        })()}
      </Modal>
    </div>
  )
}

export default Projects
