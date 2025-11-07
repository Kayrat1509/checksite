import { useState, useEffect } from 'react'
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
  FileImageOutlined,
  CameraOutlined,
  CloseOutlined,
  EditOutlined,
  DeleteOutlined,
  CommentOutlined,
  CheckOutlined,
  SendOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { issuesAPI, Issue } from '../api/issues'
import { projectsAPI } from '../api/projects'
import { usersAPI } from '../api/users'
import { useAuthStore } from '../stores/authStore'
import { useButtonAccess } from '../hooks/useButtonAccess'
import type { UploadFile } from 'antd/es/upload/interface'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { tripleConfirm } from '../utils/tripleConfirm'

dayjs.locale('ru')

const { Title, Text } = Typography
const { Option, OptGroup } = Select
const { TextArea } = Input

// Компонент для отображения комментариев
interface CommentsSectionProps {
  issueId: number
  commentText: string
  setCommentText: (text: string) => void
  onCommentAdded: () => void
}

const CommentsSection = ({ issueId, commentText, setCommentText, onCommentAdded }: CommentsSectionProps) => {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { canUseButton } = useButtonAccess('issues')

  // FIXED infinite reload: Загрузка комментариев с разумными настройками кеширования
  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', issueId],
    queryFn: () => issuesAPI.getComments(issueId),
    refetchOnMount: false,           // FIXED: не перезагружать при каждом монтировании
    staleTime: 5 * 60 * 1000,        // FIXED: данные актуальны 5 минут
    refetchOnWindowFocus: false      // FIXED: не перезагружать при фокусе окна
  })

  const comments = Array.isArray(commentsData) ? commentsData : (commentsData?.results || [])

  // Мутация для добавления комментария
  const addCommentMutation = useMutation({
    mutationFn: (data: { text: string }) => issuesAPI.addComment(issueId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', issueId] })
      message.success('Комментарий добавлен')
      setCommentText('')
      onCommentAdded()
    },
    onError: (error: any) => {
      console.error('Failed to add comment:', error)
      message.error('Ошибка при добавлении комментария')
    }
  })

  // Мутация для отметки комментария как прочитанного
  const markAsReadMutation = useMutation({
    mutationFn: (commentId: number) => issuesAPI.markCommentAsRead(commentId),
    onSuccess: () => {
      // Обновляем список замечаний чтобы счетчик обновился
      queryClient.invalidateQueries({ queryKey: ['issues'] })
    }
  })

  // Автоматически отмечаем непрочитанные комментарии как прочитанные при открытии
  // Используем useEffect с пустым массивом зависимостей и проверкой на маунт
  const [hasMarkedAsRead, setHasMarkedAsRead] = useState(false)

  useEffect(() => {
    if (!hasMarkedAsRead && comments && comments.length > 0) {
      const newComments = comments.filter((comment: any) => comment.is_new)
      if (newComments.length > 0) {
        newComments.forEach((comment: any) => {
          markAsReadMutation.mutate(comment.id)
        })
        setHasMarkedAsRead(true)
      }
    }
  }, [comments, hasMarkedAsRead])

  const handleAddComment = () => {
    if (!commentText.trim()) {
      message.warning('Введите текст комментария')
      return
    }
    addCommentMutation.mutate({ text: commentText })
  }

  // Проверка прав на добавление комментариев через матрицу доступа
  const canAddComment = () => {
    // SUPERADMIN всегда имеет доступ
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('add_comment')
  }

  return (
    <div>
      {/* Форма добавления комментария */}
      {canAddComment() && (
        <div style={{ marginBottom: '24px' }}>
          <TextArea
            rows={3}
            placeholder="Введите комментарий..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            style={{ marginBottom: '12px' }}
          />
          <Button
            type="primary"
            onClick={handleAddComment}
            loading={addCommentMutation.isPending}
            icon={<CommentOutlined />}
          >
            Добавить комментарий
          </Button>
        </div>
      )}

      <Divider>Комментарии ({comments.length})</Divider>

      {/* Список комментариев */}
      {commentsLoading ? (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <Spin />
        </div>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <Text type="secondary">Комментариев пока нет</Text>
        </div>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {comments.map((comment: any) => (
            <Card
              key={comment.id}
              size="small"
              style={{
                border: comment.is_new ? '2px solid #1890ff' : undefined,
                background: comment.is_new ? '#e6f7ff' : undefined
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Text strong>{comment.author_details?.full_name || 'Пользователь'}</Text>
                    {comment.is_new && (
                      <span style={{
                        background: '#1890ff',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        НОВОЕ
                      </span>
                    )}
                  </div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {dayjs(comment.created_at).format('DD.MM.YYYY HH:mm')}
                  </Text>
                </div>
                <Text>{comment.text}</Text>
              </Space>
            </Card>
          ))}
        </Space>
      )}
    </div>
  )
}

// Функция для получения полного URL изображения
const getImageUrl = (photoUrl: string | undefined | null) => {
  // Если URL не передан, возвращаем пустую строку
  if (!photoUrl) return ''

  // Базовый URL бекенда для отдачи медиа (попадает из .env: VITE_BACKEND_URL)
  // Локально: http://localhost:8001, на продакшне: https://checksite.example.com
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001'

  // Если бекенд вернул внутренний docker URL (например backend:8000) — убрать домен и взять только путь
  if (photoUrl.includes('backend:8000')) {
    const pathOnly = photoUrl.replace(/https?:\/\/backend:8000\/?/g, '/')
    return `${backendUrl}${pathOnly}`
  }

  // Если приходит относительный путь (например "/media/issues/2025/11/02/xx.webp")
  if (!/^https?:\/\//i.test(photoUrl)) {
    // Убедиться, что между backendUrl и photoUrl ровно один /
    const normalizedPath = photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`
    return `${backendUrl}${normalizedPath}`
  }

  // Если уже внешний полный URL — вернуть как есть
  return photoUrl
}

const Issues = () => {
  // Получаем URL параметры для фильтрации
  const [searchParams, setSearchParams] = useSearchParams()

  // Инициализируем фильтры из URL параметров
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || '')
  const [priorityFilter, setPriorityFilter] = useState<string>(searchParams.get('priority') || '')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null)
  const [photosBefore, setPhotosBefore] = useState<UploadFile[]>([])
  const [photosAfter, setPhotosAfter] = useState<UploadFile[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [form] = Form.useForm()
  const [editForm] = Form.useForm()
  const queryClient = useQueryClient()

  // Обновляем URL параметры при изменении фильтров
  useEffect(() => {
    const params: Record<string, string> = {}
    if (searchTerm) params.search = searchTerm
    if (statusFilter) params.status = statusFilter
    if (priorityFilter) params.priority = priorityFilter
    setSearchParams(params)
  }, [searchTerm, statusFilter, priorityFilter, setSearchParams])

  // Модальное окно для загрузки фото к существующему замечанию
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null)
  const [uploadPhotoType, setUploadPhotoType] = useState<'before' | 'after'>('before')
  const [uploadPhoto, setUploadPhoto] = useState<UploadFile | null>(null)

  // Модальное окно для просмотра фото в полном размере
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState('')

  // Модальное окно для комментариев
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false)
  const [selectedIssueForComments, setSelectedIssueForComments] = useState<Issue | null>(null)
  const [commentText, setCommentText] = useState('')

  // Получаем текущего пользователя
  const { user } = useAuthStore()
  const { canUseButton } = useButtonAccess('issues')

  // Функция проверки прав на добавление фото "До" через матрицу доступа
  const canAddPhotoBefore = () => {
    // SUPERADMIN всегда имеет доступ
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('add_photo_before')
  }

  // Функция проверки прав на добавление фото "После" через матрицу доступа
  const canAddPhotoAfter = () => {
    // SUPERADMIN всегда имеет доступ
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('add_photo_after')
  }

  // Функция проверки прав на редактирование замечания через матрицу доступа
  const canEditIssue = () => {
    // SUPERADMIN всегда имеет доступ
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('edit')
  }

  // Функция проверки прав на удаление замечания через матрицу доступа
  const canDeleteIssue = () => {
    // SUPERADMIN всегда имеет доступ
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('delete')
  }

  // Функция проверки прав на принятие замечания через матрицу доступа
  const canAcceptIssue = () => {
    // SUPERADMIN всегда имеет доступ
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('accept')
  }

  // Функция проверки прав на создание замечания через матрицу доступа
  const canCreateIssue = () => {
    // SUPERADMIN всегда имеет доступ
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('create')
  }

  // Функция проверки прав на отправку замечания на проверку через матрицу доступа
  const canSendToReview = () => {
    // SUPERADMIN всегда имеет доступ
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('send_to_review')
  }

  // Проверка доступа к полю "Принято" (для ИТР)
  const canMarkAccepted = () => {
    // SUPERADMIN всегда имеет доступ
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('mark_accepted')
  }

  // FIXED infinite reload: Загрузка замечаний с оптимизированными настройками
  const { data: issuesData, isLoading, error } = useQuery({
    queryKey: ['issues', statusFilter, priorityFilter, searchTerm],
    queryFn: () => issuesAPI.getIssues({
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      search: searchTerm || undefined
    }),
    // FIXED: не перезагружать при каждом монтировании (было 'always')
    refetchOnMount: false,
    // FIXED: данные актуальны 5 минут (было 0)
    staleTime: 5 * 60 * 1000,
    // FIXED: не перезагружать при фокусе окна (было true)
    refetchOnWindowFocus: false
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

  // Загрузка подрядчиков для выбранного проекта
  const { data: projectContractorsData } = useQuery({
    queryKey: ['projectContractors', selectedProjectId],
    queryFn: () => selectedProjectId ? projectsAPI.getProjectContractors(selectedProjectId) : Promise.resolve([]),
    enabled: !!selectedProjectId
  })

  const projects = Array.isArray(projectsData) ? projectsData : (projectsData?.results || [])
  const users = Array.isArray(usersData) ? usersData : (usersData?.results || [])

  // Роли, которые могут быть исполнителями замечаний
  const EXECUTOR_ROLES = ['CONTRACTOR', 'SITE_MANAGER', 'FOREMAN', 'MASTER']

  // Все пользователи с ролями исполнителей
  const allExecutors = users.filter((u: any) => EXECUTOR_ROLES.includes(u.role))

  // Формируем список исполнителей в зависимости от выбранного проекта
  const contractors = selectedProjectId && projectContractorsData
    ? [
        // Подрядчики из проекта
        ...(Array.isArray(projectContractorsData) ? projectContractorsData : []),
        // Внутренние исполнители (Начальник участка, Прораб, Мастер) из своей компании
        ...allExecutors.filter((u: any) => {
          const isInternalRole = ['SITE_MANAGER', 'FOREMAN', 'MASTER'].includes(u.role)
          // Сравниваем ID компаний (приводим к числу для надежности)
          const userCompanyId = user?.company ? Number(user.company) : null
          const executorCompanyId = u.company ? Number(u.company) : null
          const sameCompany = userCompanyId && executorCompanyId && userCompanyId === executorCompanyId

          return isInternalRole && sameCompany
        })
      ]
    : allExecutors

  // Разделяем исполнителей на группы для отображения
  const contractorsList = contractors.filter((u: any) => u.role === 'CONTRACTOR')
  const internalExecutorsList = contractors.filter((u: any) =>
    ['SITE_MANAGER', 'FOREMAN', 'MASTER'].includes(u.role)
  )

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

  // Мутация для обновления замечания
  const updateIssueMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      issuesAPI.updateIssue(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      message.success('Замечание успешно обновлено')
      setIsEditModalOpen(false)
      editForm.resetFields()
      setEditingIssue(null)
    },
    onError: (error: any) => {
      console.error('Failed to update issue:', error)
      message.error('Ошибка при обновлении замечания')
    }
  })

  // Мутация для удаления замечания
  const deleteIssueMutation = useMutation({
    mutationFn: issuesAPI.deleteIssue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      message.success('Замечание успешно удалено')
    },
    onError: (error: any) => {
      console.error('Failed to delete issue:', error)
      message.error('Ошибка при удалении замечания')
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
      setUploadPhoto(null)
      setSelectedIssueId(null)
    },
    onError: (error: any) => {
      console.error('Failed to upload photo:', error)
      message.error('Ошибка при загрузке фото')
    }
  })

  // Мутация для удаления фото
  const deletePhotoMutation = useMutation({
    mutationFn: issuesAPI.deletePhoto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      message.success('Фото успешно удалено')
    },
    onError: (error: any) => {
      console.error('Failed to delete photo:', error)
      message.error('Ошибка при удалении фото')
    }
  })

  // Мутация для изменения статуса замечания
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, comment }: { id: number; status: string; comment?: string }) =>
      issuesAPI.updateStatus(id, { status, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      message.success('Статус замечания изменен')
    },
    onError: (error: any) => {
      console.error('Failed to update status:', error)
      message.error('Ошибка при изменении статуса')
    }
  })

  // Обработчики
  const handleAddIssue = () => {
    form.resetFields()
    setPhotosBefore([])
    setPhotosAfter([])
    setSelectedProjectId(null)
    setIsModalOpen(true)
  }

  const handleModalCancel = () => {
    setIsModalOpen(false)
    form.resetFields()
    setPhotosBefore([])
    setPhotosAfter([])
    setSelectedProjectId(null)
  }

  // Обработчики для загрузки фото к существующему замечанию
  const handleOpenPhotoModal = (issueId: number, photoType: 'before' | 'after') => {
    setSelectedIssueId(issueId)
    setUploadPhotoType(photoType)
    setUploadPhoto(null)
    setIsPhotoModalOpen(true)
  }

  const handlePhotoModalCancel = () => {
    setIsPhotoModalOpen(false)
    setUploadPhoto(null)
    setSelectedIssueId(null)
  }

  const handlePhotoUpload = () => {
    if (!selectedIssueId || !uploadPhoto) {
      message.warning('Выберите фото')
      return
    }

    // Отправляем одно фото
    const file: any = uploadPhoto
    if (file.originFileObj) {
      const formData = new FormData()
      // Добавляем issue ID (сериализатор требует это поле)
      formData.append('issue', selectedIssueId.toString())
      // Используем 'stage' вместо 'photo_type' и преобразуем в верхний регистр
      formData.append('stage', uploadPhotoType === 'before' ? 'BEFORE' : 'AFTER')
      formData.append('photo', file.originFileObj)

      uploadPhotoMutation.mutate({ id: selectedIssueId, formData })
    }
  }

  // Обработчики для редактирования замечания
  const handleEditIssue = (issue: Issue) => {
    setEditingIssue(issue)
    editForm.setFieldsValue({
      title: issue.title,
      description: issue.description,
      priority: issue.priority,
      deadline: issue.deadline ? dayjs(issue.deadline) : null,
      assigned_to: issue.assigned_to
    })
    setIsEditModalOpen(true)
  }

  const handleEditModalCancel = () => {
    setIsEditModalOpen(false)
    editForm.resetFields()
    setEditingIssue(null)
  }

  const handleEditModalOk = () => {
    if (!editingIssue) return

    editForm.validateFields().then((values: any) => {
      const data: any = {
        title: values.title,
        description: values.description,
        priority: values.priority
      }

      if (values.deadline) {
        data.deadline = values.deadline.toISOString()
      }

      if (values.assigned_to) {
        data.assigned_to = values.assigned_to
      }

      updateIssueMutation.mutate({ id: editingIssue.id, data })
    })
  }

  // Обработчик удаления замечания
  const handleDeleteIssue = (issueId: number) => {
    // Используем тройное подтверждение для защиты от случайного удаления
    tripleConfirm({
      itemName: `Замечание #${issueId}`,
      itemType: 'замечание',
      onConfirm: () => {
        deleteIssueMutation.mutate(issueId)
      }
    })
  }

  // Обработчик для открытия фото в полном размере
  const handleImageClick = (imageUrl: string) => {
    setPreviewImageUrl(imageUrl)
    setIsImagePreviewOpen(true)
  }

  // Обработчик для удаления фото
  const handleDeletePhoto = (photoId: number) => {
    // Используем тройное подтверждение для защиты от случайного удаления
    tripleConfirm({
      itemName: `Фото #${photoId}`,
      itemType: 'фотографию',
      onConfirm: () => deletePhotoMutation.mutate(photoId)
    })
  }

  // Обработчик для открытия окна комментариев
  const handleOpenComments = (issue: Issue) => {
    setSelectedIssueForComments(issue)
    setCommentText('')
    setIsCommentsModalOpen(true)
  }

  // Обработчик для принятия замечания (перевод в статус "Исполнено")
  const handleAcceptIssue = (issueId: number) => {
    Modal.confirm({
      title: 'Принять замечание?',
      content: 'Вы уверены, что хотите отметить это замечание как "Исполнено"?',
      okText: 'Принять',
      okType: 'primary',
      cancelText: 'Отмена',
      onOk: () => {
        updateStatusMutation.mutate({ id: issueId, status: 'COMPLETED' })
      }
    })
  }

  // Обработчик изменения проекта в форме
  const handleProjectChange = (projectId: number) => {
    setSelectedProjectId(projectId)
    // Сбрасываем выбранного подрядчика при смене проекта
    form.setFieldsValue({ assigned_to: undefined })
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
        {/* Кнопка "Добавить замечание" доступна всем, кроме роли "Подрядчик" */}
        {canCreateIssue() && (
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleAddIssue}>
            Добавить замечание
          </Button>
        )}
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

                {/* Описание */}
                {issue.description && (
                  <div style={{ marginBottom: '12px' }}>
                    <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                      Описание:
                    </Text>
                    <Text style={{ fontSize: '14px', color: '#595959' }}>
                      {issue.description}
                    </Text>
                  </div>
                )}

                {/* Кнопка Комментарии под описанием с счетчиком */}
                {(canAddPhotoBefore() || canAddPhotoAfter()) && (
                  <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Button
                      type="default"
                      size="small"
                      icon={<CommentOutlined />}
                      onClick={() => handleOpenComments(issue)}
                    >
                      Комментарии
                    </Button>
                    <Text strong style={{ fontSize: '16px', color: '#ff4d4f' }}>
                      ({issue.comment_count || 0})
                    </Text>
                  </div>
                )}

                <Divider style={{ margin: '12px 0' }} />

                {/* Проект */}
                <div style={{ marginBottom: '8px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Проект:</Text>
                  <br />
                  <Text style={{ fontSize: '14px' }}>{issue.project_name}</Text>
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

                  {/* Отображение фотографий */}
                  {issue.photos && issue.photos.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <Space wrap size="small">
                        {issue.photos.slice(0, 4).map((photo) => (
                          <div
                            key={photo.id}
                            style={{
                              position: 'relative',
                              width: '60px',
                              height: '60px',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              border: '1px solid #d9d9d9'
                            }}
                          >
                            <img
                              key={`img-${photo.id}-${issue.id}`}
                              src={getImageUrl(photo.photo)}
                              alt={`Фото ${photo.stage === 'BEFORE' ? 'до' : photo.stage === 'AFTER' ? 'после' : 'осмотр'}`}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                cursor: 'pointer',
                                display: 'block'
                              }}
                              loading="lazy"
                              onClick={() => handleImageClick(getImageUrl(photo.photo))}
                              onError={(e: any) => {
                                console.error('Ошибка загрузки изображения:', photo.photo)
                                console.error('URL для загрузки:', getImageUrl(photo.photo))
                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5Gb3RvPC90ZXh0Pjwvc3ZnPg=='
                                e.target.style.backgroundColor = '#f5f5f5'
                              }}
                            />
                            {/* Кнопка удаления фото для пользователей с правами редактирования */}
                            {(canEditIssue() || canDeleteIssue()) && (
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<CloseOutlined />}
                                style={{
                                  position: 'absolute',
                                  top: 2,
                                  right: 2,
                                  background: 'rgba(255, 255, 255, 0.9)',
                                  padding: '2px 4px',
                                  height: 'auto',
                                  minWidth: 'auto'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeletePhoto(photo.id)
                                }}
                              />
                            )}
                            {/* Показываем бейдж с типом фото */}
                            <div
                              style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: 'rgba(0, 0, 0, 0.6)',
                                color: 'white',
                                fontSize: '9px',
                                padding: '1px 2px',
                                textAlign: 'center'
                              }}
                            >
                              {photo.stage === 'BEFORE' ? 'До' : photo.stage === 'AFTER' ? 'После' : 'Осмотр'}
                            </div>
                          </div>
                        ))}
                        {issue.photos.length > 4 && (
                          <div
                            style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '4px',
                              border: '1px solid #d9d9d9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: '#fafafa'
                            }}
                          >
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              +{issue.photos.length - 4}
                            </Text>
                          </div>
                        )}
                      </Space>
                    </div>
                  )}

                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Создано: {formatDate(issue.created_at)}
                    </Text>
                  </div>
                </Space>

                <Divider style={{ margin: '12px 0' }} />

                {/* Кнопки действий - вертикальное расположение */}
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {/* Ряд 1: Изменить */}
                  {canEditIssue() && (
                    <Row gutter={8}>
                      <Col span={24}>
                        <Button
                          type="default"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleEditIssue(issue)}
                          block
                        >
                          Изменить
                        </Button>
                      </Col>
                    </Row>
                  )}

                  {/* Ряд 2: Фото До и Фото После */}
                  {(canAddPhotoBefore() || canAddPhotoAfter()) && (
                    <Row gutter={8}>
                      {canAddPhotoBefore() && (
                        <Col span={canAddPhotoAfter() ? 12 : 24}>
                          <Button
                            type="default"
                            size="small"
                            icon={<CameraOutlined />}
                            onClick={() => handleOpenPhotoModal(issue.id, 'before')}
                            block
                          >
                            Фото До
                          </Button>
                        </Col>
                      )}
                      {canAddPhotoAfter() && (
                        <Col span={canAddPhotoBefore() ? 12 : 24}>
                          <Button
                            type="default"
                            size="small"
                            icon={<FileImageOutlined />}
                            onClick={() => handleOpenPhotoModal(issue.id, 'after')}
                            block
                          >
                            Фото После
                          </Button>
                        </Col>
                      )}
                    </Row>
                  )}

                  {/* Ряд 3: На проверку (проверяется через матрицу доступа) */}
                  {canSendToReview() && issue.status !== 'COMPLETED' && issue.status !== 'REJECTED' && (
                    <Row gutter={8}>
                      <Col span={24}>
                        <Button
                          type={issue.status === 'PENDING_REVIEW' ? 'default' : 'default'}
                          size="small"
                          icon={<SendOutlined />}
                          onClick={() => {
                            if (issue.status !== 'PENDING_REVIEW') {
                              updateStatusMutation.mutate({ id: issue.id, status: 'PENDING_REVIEW' })
                            }
                          }}
                          block
                          disabled={issue.status === 'PENDING_REVIEW'}
                          style={issue.status === 'PENDING_REVIEW' ? {
                            background: '#f9f0ff',
                            borderColor: '#d3adf7',
                            color: '#722ed1',
                            cursor: 'not-allowed'
                          } : {
                            borderColor: '#722ed1',
                            color: '#722ed1'
                          }}
                        >
                          {issue.status === 'PENDING_REVIEW' ? 'На проверке' : 'На проверку'}
                        </Button>
                      </Col>
                    </Row>
                  )}

                  {/* Ряд 4: Принять/Принято (доступно: Прораб, Начальник участка, Руководитель проекта, Технадзор, Авторский надзор) */}
                  {canAcceptIssue() && (
                    <Row gutter={8}>
                      <Col span={24}>
                        <Button
                          type={issue.status === 'COMPLETED' ? 'default' : 'primary'}
                          size="small"
                          icon={<CheckOutlined />}
                          onClick={() => handleAcceptIssue(issue.id)}
                          block
                          disabled={issue.status === 'COMPLETED'}
                          style={issue.status === 'COMPLETED' ? {
                            background: '#f0f0f0',
                            borderColor: '#d9d9d9',
                            color: '#00000040',
                            cursor: 'not-allowed'
                          } : {
                            background: '#52c41a',
                            borderColor: '#52c41a'
                          }}
                        >
                          {issue.status === 'COMPLETED' ? 'Принято' : 'Принять'}
                        </Button>
                      </Col>
                    </Row>
                  )}

                  {/* Ряд 4.5: Отметка "Принято" для Подрядчика (только для просмотра) */}
                  {user && user.role === 'CONTRACTOR' && issue.status === 'COMPLETED' && (
                    <Row gutter={8}>
                      <Col span={24}>
                        <Button
                          type="default"
                          size="small"
                          icon={<CheckOutlined />}
                          block
                          disabled
                          style={{
                            background: '#f6ffed',
                            borderColor: '#52c41a',
                            color: '#52c41a',
                            cursor: 'not-allowed',
                            fontWeight: 'bold'
                          }}
                        >
                          Принято
                        </Button>
                      </Col>
                    </Row>
                  )}

                  {/* Ряд 5: Удалить */}
                  {canDeleteIssue() && (
                    <Row gutter={8}>
                      <Col span={24}>
                        <Button
                          type="default"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteIssue(issue.id)}
                          block
                        >
                          Удалить
                        </Button>
                      </Col>
                    </Row>
                  )}
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
            <Select
              placeholder="Выберите проект"
              onChange={handleProjectChange}
            >
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

          {/* Исполнитель */}
          <Form.Item
            name="assigned_to"
            label="Исполнитель"
          >
            <Select placeholder="Выберите исполнителя" allowClear>
              {contractorsList.length > 0 && (
                <OptGroup label="Подрядчики">
                  {contractorsList.map((contractor: any) => (
                    <Option key={contractor.id} value={contractor.id}>
                      {contractor.last_name} {contractor.first_name}
                    </Option>
                  ))}
                </OptGroup>
              )}
              {internalExecutorsList.length > 0 && (
                <OptGroup label="Внутренние исполнители">
                  {internalExecutorsList.map((executor: any) => (
                    <Option key={executor.id} value={executor.id}>
                      {executor.last_name} {executor.first_name}
                    </Option>
                  ))}
                </OptGroup>
              )}
            </Select>
          </Form.Item>

          {/* Принято (только для ИТР) */}
          {canMarkAccepted() && (
            <Form.Item
              name="accepted"
              valuePropName="checked"
            >
              <div>
                <Checkbox>Принято</Checkbox>
                <div style={{ marginTop: '8px', marginLeft: '24px' }}>
                  <Text type="secondary" style={{ fontSize: '12px', color: '#8c8c8c' }}>
                    Установите галочку, если фиксируете уже устраненное замечание, но его нужно зафиксировать. Статус сразу станет 'Исполнено'
                  </Text>
                </div>
              </div>
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
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
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
            accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
            style={{ display: 'none' }}
            onChange={(e: any) => {
              const file = e.target.files?.[0]
              if (file) {
                const uploadFile = {
                  uid: Math.random().toString(36),
                  name: file.name,
                  status: 'done' as const,
                  originFileObj: file,
                  url: URL.createObjectURL(file)
                }
                setUploadPhoto(uploadFile as any)
              }
            }}
          />

          {/* Отображение выбранного фото */}
          {uploadPhoto && (
            <div style={{ marginTop: '16px' }}>
              <Text strong>Выбранное фото:</Text>
              <div style={{ marginTop: '12px', position: 'relative', display: 'inline-block' }}>
                <img
                  src={uploadPhoto.url}
                  alt={uploadPhoto.name}
                  style={{
                    width: '200px',
                    height: '200px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                  onClick={() => uploadPhoto.url && handleImageClick(uploadPhoto.url)}
                />
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<CloseOutlined />}
                  style={{ position: 'absolute', top: -8, right: -8 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setUploadPhoto(null)
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Модальное окно для редактирования замечания */}
      <Modal
        title="Редактировать замечание"
        open={isEditModalOpen}
        onOk={handleEditModalOk}
        onCancel={handleEditModalCancel}
        width={700}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={updateIssueMutation.isPending}
      >
        <Form
          form={editForm}
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

          {/* Исполнитель */}
          <Form.Item
            name="assigned_to"
            label="Исполнитель"
          >
            <Select placeholder="Выберите исполнителя" allowClear>
              {contractorsList.length > 0 && (
                <OptGroup label="Подрядчики">
                  {contractorsList.map((contractor: any) => (
                    <Option key={contractor.id} value={contractor.id}>
                      {contractor.last_name} {contractor.first_name}
                    </Option>
                  ))}
                </OptGroup>
              )}
              {internalExecutorsList.length > 0 && (
                <OptGroup label="Внутренние исполнители">
                  {internalExecutorsList.map((executor: any) => (
                    <Option key={executor.id} value={executor.id}>
                      {executor.last_name} {executor.first_name}
                    </Option>
                  ))}
                </OptGroup>
              )}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно для просмотра фото в полном размере */}
      <Modal
        open={isImagePreviewOpen}
        footer={null}
        onCancel={() => setIsImagePreviewOpen(false)}
        width="80%"
        centered
      >
        <img
          src={previewImageUrl}
          alt="Preview"
          style={{ width: '100%', height: 'auto' }}
        />
      </Modal>

      {/* Модальное окно для комментариев */}
      <Modal
        title={`Комментарии к замечанию: ${selectedIssueForComments?.title || ''}`}
        open={isCommentsModalOpen}
        onCancel={() => setIsCommentsModalOpen(false)}
        footer={null}
        width={700}
      >
        {selectedIssueForComments && (
          <CommentsSection
            issueId={selectedIssueForComments.id}
            commentText={commentText}
            setCommentText={setCommentText}
            onCommentAdded={() => {
              queryClient.invalidateQueries({ queryKey: ['issues'] })
            }}
          />
        )}
      </Modal>
    </div>
  )
}

export default Issues
