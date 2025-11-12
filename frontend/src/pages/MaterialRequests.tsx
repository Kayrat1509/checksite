import { useState } from 'react'
import {
  Typography,
  Button,
  Table,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tag,
  Tooltip,
  Popconfirm,
  Tabs,
  InputNumber,
  Divider,
  Row,
  Col,
  Card,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  CheckOutlined,
  SendOutlined,
  RollbackOutlined,
  DollarOutlined,
  EditOutlined,
  FileExcelOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  materialRequestsAPI,
  MaterialRequest,
  CreateMaterialRequestData,
  MaterialRequestStatus,
} from '../api/materialRequests'
import { projectsAPI } from '../api/projects'
import { useAuthStore } from '../stores/authStore'
import { useButtonAccess } from '../hooks/useButtonAccess'

const { Title, Text } = Typography
const { TextArea } = Input

// Интерфейс для позиции с данными заявки
interface MaterialRequestItemRow {
  id: number
  requestId: number
  requestNumber: string
  materialName: string
  unit: string
  quantityRequested: number
  quantityActual: number | null
  notes: string
  author: string
  status: MaterialRequestStatus
  currentApprover: string | null
  positionNumber: number
}

// Конфигурация статусов
const STATUS_CONFIG: Record<MaterialRequestStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Черновик', color: 'default' },
  IN_APPROVAL: { label: 'На согласовании', color: 'blue' },
  APPROVED: { label: 'Согласовано', color: 'green' },
  IN_PAYMENT: { label: 'На оплате', color: 'orange' },
  IN_DELIVERY: { label: 'На доставке', color: 'cyan' },
  COMPLETED: { label: 'Отработано и доставлено на объект', color: 'success' },
  REJECTED: { label: 'На доработке', color: 'red' },
}

const MaterialRequests = () => {
  const [activeTab, setActiveTab] = useState<string>('draft')
  const [selectedProject, setSelectedProject] = useState<number | undefined>(undefined)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRequest, setEditingRequest] = useState<MaterialRequest | null>(null)
  const [form] = Form.useForm()
  const [itemsForm] = Form.useForm()
  const queryClient = useQueryClient()

  const { user } = useAuthStore()
  const { canUseButton } = useButtonAccess('material-requests')

  // Функции проверки прав доступа
  const canCreateRequest = () => user?.is_superuser || user?.role === 'SUPERADMIN' || canUseButton('create')
  const canDeleteRequest = () => user?.is_superuser || user?.role === 'SUPERADMIN' || canUseButton('delete')
  const canApprove = () => user?.is_superuser || user?.role === 'SUPERADMIN' || canUseButton('approve')

  // Проверка ролей для специфичных действий
  const isSupplyManager = () => user?.role === 'SUPPLY_MANAGER'
  const canReceiveMaterials = () => ['MASTER', 'FOREMAN', 'SITE_MANAGER', 'SITE_WAREHOUSE_MANAGER'].includes(user?.role || '')

  // Получение списка заявок
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['material-requests', activeTab, selectedProject],
    queryFn: () => materialRequestsAPI.getMaterialRequests({
      tab: activeTab as any,
      project: selectedProject,
    }),
  })

  const requests = Array.isArray(requestsData) ? requestsData : requestsData?.results || []

  // Преобразуем заявки в строки таблицы (позиции)
  // Добавляем проверку на undefined для requests и items
  const itemsRows: MaterialRequestItemRow[] = (requests || []).flatMap((request: MaterialRequest) =>
    (request.items || []).map((item, index) => ({
      id: item.id || 0,
      requestId: request.id,
      requestNumber: request.request_number,
      materialName: item.material_name,
      unit: item.unit,
      quantityRequested: item.quantity_requested,
      quantityActual: item.quantity_actual || null,
      notes: item.notes || '',
      author: request.author_name || '',
      status: request.status,
      currentApprover: request.current_approver_name || null,
      positionNumber: index + 1,
    }))
  )

  // Получение списка проектов
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsAPI.getProjects,
  })
  const projects = Array.isArray(projectsData) ? projectsData : projectsData?.results || []

  // Создание заявки
  const createMutation = useMutation({
    mutationFn: materialRequestsAPI.createMaterialRequest,
    onSuccess: () => {
      message.success('Заявка создана!')
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
      handleCancel()
    },
    onError: (error: any) => {
      console.error('Ошибка создания заявки:', error.response?.data)
      const errorMsg = error.response?.data?.detail || JSON.stringify(error.response?.data) || error.message
      message.error(`Ошибка создания: ${errorMsg}`)
    },
  })

  // Обновление заявки
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      materialRequestsAPI.updateMaterialRequest(id, data),
    onSuccess: () => {
      message.success('Заявка обновлена!')
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
      handleCancel()
    },
    onError: (error: any) => {
      console.error('Ошибка обновления заявки:', error.response?.data)
      const errorMsg = error.response?.data?.detail || JSON.stringify(error.response?.data) || error.message
      message.error(`Ошибка обновления: ${errorMsg}`)
    },
  })

  // Отправка на согласование
  const submitMutation = useMutation({
    mutationFn: materialRequestsAPI.submitForApproval,
    onSuccess: () => {
      message.success('Заявка отправлена на согласование!')
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
    },
    onError: (error: any) => {
      message.error(`Ошибка: ${error.response?.data?.detail || error.message}`)
    },
  })

  // Согласование
  const approveMutation = useMutation({
    mutationFn: materialRequestsAPI.approve,
    onSuccess: () => {
      message.success('Позиция согласована!')
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
    },
    onError: (error: any) => {
      message.error(`Ошибка: ${error.response?.data?.detail || error.message}`)
    },
  })

  // Возврат на доработку
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      materialRequestsAPI.reject(id, { rejection_reason: reason }),
    onSuccess: () => {
      message.success('Заявка возвращена на доработку!')
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
    },
    onError: (error: any) => {
      message.error(`Ошибка: ${error.response?.data?.detail || error.message}`)
    },
  })

  // Перевод на оплату
  const moveToPaymentMutation = useMutation({
    mutationFn: materialRequestsAPI.moveToPayment,
    onSuccess: () => {
      message.success('Позиция переведена на оплату!')
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
    },
    onError: (error: any) => {
      message.error(`Ошибка: ${error.response?.data?.detail || error.message}`)
    },
  })

  // Оплачено
  const moveToDeliveryMutation = useMutation({
    mutationFn: materialRequestsAPI.moveToDelivery,
    onSuccess: () => {
      message.success('Позиция оплачена и переведена на доставку!')
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
    },
    onError: (error: any) => {
      message.error(`Ошибка: ${error.response?.data?.detail || error.message}`)
    },
  })

  // Обновление фактического количества
  const updateActualQuantityMutation = useMutation({
    mutationFn: ({
      requestId,
      itemId,
      quantity,
      notes,
    }: {
      requestId: number
      itemId: number
      quantity: number
      notes?: string
    }) => materialRequestsAPI.updateActualQuantity(requestId, { item_id: itemId, quantity_actual: quantity, notes }),
    onSuccess: () => {
      message.success('Количество обновлено!')
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
    },
    onError: (error: any) => {
      message.error(`Ошибка: ${error.response?.data?.detail || error.message}`)
    },
  })

  // Принято (завершение)
  const completeMutation = useMutation({
    mutationFn: materialRequestsAPI.complete,
    onSuccess: () => {
      message.success('Позиция принята!')
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
    },
    onError: (error: any) => {
      message.error(`Ошибка: ${error.response?.data?.detail || error.message}`)
    },
  })

  // Удаление заявки
  const deleteMutation = useMutation({
    mutationFn: materialRequestsAPI.deleteMaterialRequest,
    onSuccess: () => {
      message.success('Заявка удалена')
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
    },
    onError: (error: any) => {
      message.error(`Ошибка удаления: ${error.response?.data?.detail || error.message}`)
    },
  })

  // Обработчики
  const handleCreate = () => {
    form.resetFields()
    itemsForm.resetFields()
    setIsModalOpen(true)
  }

  const handleCancel = () => {
    setIsModalOpen(false)
    setEditingRequest(null)
    form.resetFields()
    itemsForm.resetFields()
  }

  const handleEdit = async (requestId: number) => {
    try {
      // Загружаем полные данные заявки
      const request = await materialRequestsAPI.getMaterialRequest(requestId)
      setEditingRequest(request)

      // Заполняем основную форму
      form.setFieldsValue({
        title: request.title,
        description: request.description,
        project: request.project,
      })

      // Заполняем форму позиций
      itemsForm.setFieldsValue({
        items: request.items?.map((item: any) => ({
          material_name: item.material_name,
          unit: item.unit,
          quantity_requested: item.quantity_requested,
          notes: item.notes,
        })),
      })

      setIsModalOpen(true)
    } catch (error: any) {
      message.error(`Ошибка загрузки заявки: ${error.message}`)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const itemsValues = await itemsForm.validateFields()

      const requestData: CreateMaterialRequestData = {
        title: values.title,
        description: values.description,
        project: values.project,
        items: itemsValues.items.map((item: any) => ({
          material_name: item.material_name,
          unit: item.unit,
          quantity_requested: item.quantity_requested,
          notes: item.notes,
        })),
      }

      if (editingRequest) {
        // Обновление существующей заявки
        updateMutation.mutate({
          id: editingRequest.id,
          data: requestData,
        })
      } else {
        // Создание новой заявки
        createMutation.mutate(requestData)
      }
    } catch (error) {
      console.error('Validation error:', error)
    }
  }

  const handleApprove = (requestId: number) => {
    approveMutation.mutate(requestId)
  }

  const handleReject = (requestId: number) => {
    Modal.confirm({
      title: 'Вернуть на доработку',
      content: (
        <Form>
          <Form.Item name="rejection_reason" label="Причина" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="Укажите причину возврата" id="rejection-reason-input" />
          </Form.Item>
        </Form>
      ),
      onOk: () => {
        const reason = (document.getElementById('rejection-reason-input') as HTMLTextAreaElement)?.value
        if (reason) {
          rejectMutation.mutate({ id: requestId, reason })
        } else {
          message.error('Укажите причину возврата')
        }
      },
    })
  }

  // Экспорт всех данных таблицы в Excel
  const handleExportToExcel = () => {
    try {
      // Подготавливаем данные для экспорта
      const exportData = itemsRows.map((row) => ({
        'Номер заявки': row.requestNumber,
        'Материал': row.materialName,
        'Ед. изм.': row.unit,
        'Кол-во по заявке': Number(row.quantityRequested).toFixed(2),
        'Кол-во по факту': row.quantityActual !== null && row.quantityActual !== undefined ? Number(row.quantityActual).toFixed(2) : '—',
        'Примечания': row.notes || '—',
        'Автор': row.author,
        'Статус': STATUS_CONFIG[row.status].label,
      }))

      // Создаем CSV контент
      const headers = Object.keys(exportData[0] || {})
      const csvContent = [
        headers.join(','),
        ...exportData.map((row) =>
          headers.map((header) => {
            const value = row[header as keyof typeof row]
            // Экранируем значения, содержащие запятые или кавычки
            return typeof value === 'string' && (value.includes(',') || value.includes('"'))
              ? `"${value.replace(/"/g, '""')}"`
              : value
          }).join(',')
        ),
      ].join('\n')

      // Создаем Blob с BOM для корректной кодировки UTF-8 в Excel
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `material-requests-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      message.success('Данные экспортированы в Excel!')
    } catch (error: any) {
      message.error(`Ошибка экспорта: ${error.message}`)
    }
  }

  const handleUpdateActualQuantity = (requestId: number, itemId: number, currentQuantity: number | null, quantityRequested: number) => {
    Modal.confirm({
      title: 'Обновить фактическое количество',
      content: (
        <Form layout="vertical" initialValues={{ quantity_to_add: 0 }}>
          <div style={{ marginBottom: 16, padding: 12, background: '#f0f0f0', borderRadius: 4 }}>
            <Text strong>Запрошено: {quantityRequested.toFixed(2)}</Text>
            <br />
            <Text strong>Уже доставлено: {currentQuantity !== null ? currentQuantity.toFixed(2) : '0.00'}</Text>
            <br />
            <Text strong style={{ color: currentQuantity !== null && currentQuantity >= quantityRequested ? '#52c41a' : '#fa8c16' }}>
              Осталось: {currentQuantity !== null ? (quantityRequested - currentQuantity).toFixed(2) : quantityRequested.toFixed(2)}
            </Text>
          </div>
          <Form.Item name="quantity_to_add" label="Добавить к фактическому количеству (текущий рейс)" rules={[{ required: true }]}>
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} id="quantity-to-add-input" placeholder="Введите количество из текущего рейса" />
          </Form.Item>
          <Form.Item name="notes" label="Примечание">
            <TextArea rows={2} placeholder="Комментарий (опционально)" id="quantity-notes-input" />
          </Form.Item>
        </Form>
      ),
      onOk: () => {
        const quantityToAdd = parseFloat((document.getElementById('quantity-to-add-input') as HTMLInputElement)?.value)
        const notes = (document.getElementById('quantity-notes-input') as HTMLTextAreaElement)?.value
        if (quantityToAdd >= 0) {
          // Добавляем количество к текущему (накопительно)
          const newQuantity = (currentQuantity || 0) + quantityToAdd
          updateActualQuantityMutation.mutate({ requestId, itemId, quantity: newQuantity, notes })
        } else {
          message.error('Введите корректное количество')
        }
      },
    })
  }

  // Колонки для "Все заявки"
  const allColumns: ColumnsType<MaterialRequestItemRow> = [
    {
      title: 'Номер (п/п)',
      dataIndex: 'requestNumber',
      key: 'requestNumber',
      width: 150,
    },
    {
      title: 'Материал',
      dataIndex: 'materialName',
      key: 'materialName',
      ellipsis: true,
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
    },
    {
      title: 'Кол-во по заявке',
      dataIndex: 'quantityRequested',
      key: 'quantityRequested',
      width: 150,
      render: (val: number) => Number(val).toFixed(2),
    },
    {
      title: 'Кол-во по факту',
      key: 'quantityActual',
      width: 180,
      render: (_, record) => {
        // Редактирование доступно только для заявок в статусе IN_DELIVERY
        if (record.status === 'IN_DELIVERY' && canReceiveMaterials()) {
          const actualQty = record.quantityActual !== null && record.quantityActual !== undefined ? Number(record.quantityActual).toFixed(2) : '0.00'
          const isComplete = record.quantityActual !== null && record.quantityActual >= record.quantityRequested
          return (
            <Button
              type="link"
              size="small"
              onClick={() => handleUpdateActualQuantity(record.requestId, record.id, record.quantityActual, record.quantityRequested)}
              style={{ color: isComplete ? '#52c41a' : undefined }}
            >
              {actualQty} {isComplete && '✓'}
            </Button>
          )
        }
        return record.quantityActual !== null && record.quantityActual !== undefined ? Number(record.quantityActual).toFixed(2) : '—'
      },
    },
    {
      title: 'Примечания',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (val: string) => val || '—',
    },
    {
      title: 'Автор',
      dataIndex: 'author',
      key: 'author',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      render: (status: MaterialRequestStatus) => (
        <Tag color={STATUS_CONFIG[status].color}>{STATUS_CONFIG[status].label}</Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'DRAFT' && canCreateRequest() && (
            <Tooltip title="Отправить на согласование">
              <Button
                type="link"
                size="small"
                icon={<SendOutlined />}
                onClick={() => submitMutation.mutate(record.requestId)}
                style={{ color: 'green' }}
              />
            </Tooltip>
          )}
          {record.status === 'DRAFT' && canDeleteRequest() && (
            <Tooltip title="Удалить заявку">
              <Popconfirm
                title="Удалить заявку?"
                onConfirm={() => deleteMutation.mutate(record.requestId)}
                okText="Да"
                cancelText="Нет"
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  // Колонки для "На согласовании"
  const approvalColumns: ColumnsType<MaterialRequestItemRow> = [
    {
      title: 'Номер (п/п)',
      dataIndex: 'requestNumber',
      key: 'requestNumber',
      width: 150,
    },
    {
      title: 'Материал',
      dataIndex: 'materialName',
      key: 'materialName',
      ellipsis: true,
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
    },
    {
      title: 'Кол-во по заявке',
      dataIndex: 'quantityRequested',
      key: 'quantityRequested',
      width: 150,
      render: (val: number) => Number(val).toFixed(2),
    },
    {
      title: 'Примечания',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (val: string) => val || '—',
    },
    {
      title: 'Автор',
      dataIndex: 'author',
      key: 'author',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Статус',
      key: 'status',
      width: 180,
      render: (_, record) => {
        if (record.currentApprover) {
          return <Tag color="blue">Ожидает: {record.currentApprover}</Tag>
        }
        return <Tag color={STATUS_CONFIG[record.status].color}>{STATUS_CONFIG[record.status].label}</Tag>
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {canApprove() && (
            <>
              <Tooltip title="Согласовать">
                <Button
                  type="link"
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={() => handleApprove(record.requestId)}
                  style={{ color: 'green' }}
                />
              </Tooltip>
              <Tooltip title="На доработку">
                <Button
                  type="link"
                  size="small"
                  icon={<RollbackOutlined />}
                  onClick={() => handleReject(record.requestId)}
                  style={{ color: 'orange' }}
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ]

  // Колонки для "Согласованные заявки"
  const approvedColumns: ColumnsType<MaterialRequestItemRow> = [
    {
      title: 'Номер (п/п)',
      dataIndex: 'requestNumber',
      key: 'requestNumber',
      width: 150,
    },
    {
      title: 'Материал',
      dataIndex: 'materialName',
      key: 'materialName',
      ellipsis: true,
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
    },
    {
      title: 'Кол-во по заявке',
      dataIndex: 'quantityRequested',
      key: 'quantityRequested',
      width: 150,
      render: (val: number) => Number(val).toFixed(2),
    },
    {
      title: 'Примечания',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (val: string) => val || '—',
    },
    {
      title: 'Автор',
      dataIndex: 'author',
      key: 'author',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Статус',
      key: 'status',
      width: 180,
      render: (_, record) => {
        if (isSupplyManager()) {
          return (
            <Button
              type="primary"
              size="small"
              icon={<DollarOutlined />}
              onClick={() => moveToPaymentMutation.mutate(record.requestId)}
            >
              На оплату
            </Button>
          )
        }
        return <Tag color={STATUS_CONFIG[record.status].color}>{STATUS_CONFIG[record.status].label}</Tag>
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: () => <Space size="small">—</Space>,
    },
  ]

  // Колонки для "На оплате"
  const paymentColumns: ColumnsType<MaterialRequestItemRow> = [
    {
      title: 'Номер (п/п)',
      dataIndex: 'requestNumber',
      key: 'requestNumber',
      width: 150,
    },
    {
      title: 'Материал',
      dataIndex: 'materialName',
      key: 'materialName',
      ellipsis: true,
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
    },
    {
      title: 'Кол-во по заявке',
      dataIndex: 'quantityRequested',
      key: 'quantityRequested',
      width: 150,
      render: (val: number) => Number(val).toFixed(2),
    },
    {
      title: 'Примечания',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (val: string) => val || '—',
    },
    {
      title: 'Автор',
      dataIndex: 'author',
      key: 'author',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Статус',
      key: 'status',
      width: 180,
      render: (_, record) => {
        if (isSupplyManager()) {
          return (
            <Space direction="vertical" size="small">
              <Tag color="orange">На оплате</Tag>
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => moveToDeliveryMutation.mutate(record.requestId)}
              >
                Оплачено
              </Button>
            </Space>
          )
        }
        return <Tag color="orange">На оплате</Tag>
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: () => <Space size="small">—</Space>,
    },
  ]

  // Колонки для "На доставке"
  const deliveryColumns: ColumnsType<MaterialRequestItemRow> = [
    {
      title: 'Номер (п/п)',
      dataIndex: 'requestNumber',
      key: 'requestNumber',
      width: 150,
    },
    {
      title: 'Материал',
      dataIndex: 'materialName',
      key: 'materialName',
      ellipsis: true,
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
    },
    {
      title: 'Кол-во по заявке',
      dataIndex: 'quantityRequested',
      key: 'quantityRequested',
      width: 150,
      render: (val: number) => Number(val).toFixed(2),
    },
    {
      title: 'Кол-во по факту',
      key: 'quantityActual',
      width: 180,
      render: (_, record) => {
        if (canReceiveMaterials()) {
          const actualQty = record.quantityActual !== null && record.quantityActual !== undefined ? Number(record.quantityActual).toFixed(2) : '0.00'
          const isComplete = record.quantityActual !== null && record.quantityActual >= record.quantityRequested
          return (
            <Button
              type="link"
              size="small"
              onClick={() => handleUpdateActualQuantity(record.requestId, record.id, record.quantityActual, record.quantityRequested)}
              style={{ color: isComplete ? '#52c41a' : undefined }}
            >
              {actualQty} {isComplete && '✓'}
            </Button>
          )
        }
        return record.quantityActual !== null && record.quantityActual !== undefined ? Number(record.quantityActual).toFixed(2) : '—'
      },
    },
    {
      title: 'Примечания',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (val: string) => val || '—',
    },
    {
      title: 'Автор',
      dataIndex: 'author',
      key: 'author',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Статус',
      key: 'status',
      width: 180,
      render: () => <Tag color="cyan">На доставке</Tag>,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {canReceiveMaterials() && (
            <Tooltip title="Принято">
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => completeMutation.mutate(record.requestId)}
              >
                Принято
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  // Колонки для "Отработанные заявки"
  const completedColumns: ColumnsType<MaterialRequestItemRow> = [
    {
      title: 'Номер (п/п)',
      dataIndex: 'requestNumber',
      key: 'requestNumber',
      width: 150,
    },
    {
      title: 'Материал',
      dataIndex: 'materialName',
      key: 'materialName',
      ellipsis: true,
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
    },
    {
      title: 'Кол-во по заявке',
      dataIndex: 'quantityRequested',
      key: 'quantityRequested',
      width: 150,
      render: (val: number) => Number(val).toFixed(2),
    },
    {
      title: 'Кол-во по факту',
      key: 'quantityActual',
      width: 180,
      render: (_, record) => {
        // Для завершенных заявок показываем фактическое количество (только чтение)
        const actualQty = record.quantityActual !== null && record.quantityActual !== undefined ? Number(record.quantityActual).toFixed(2) : '—'
        const isComplete = record.quantityActual !== null && record.quantityActual >= record.quantityRequested

        if (record.quantityActual !== null && record.quantityActual !== undefined) {
          return (
            <span style={{ color: isComplete ? '#52c41a' : '#fa8c16', fontWeight: 'bold' }}>
              {actualQty} {isComplete && '✓'}
            </span>
          )
        }
        return actualQty
      },
    },
    {
      title: 'Примечания',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (val: string) => val || '—',
    },
    {
      title: 'Автор',
      dataIndex: 'author',
      key: 'author',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Статус',
      key: 'status',
      width: 200,
      render: () => <Tag color="success">Отработано и доставлено на объект</Tag>,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: () => <Space size="small">—</Space>,
    },
  ]

  // Колонки для "Черновики" (DRAFT статус)
  const draftColumns: ColumnsType<MaterialRequestItemRow> = [
    {
      title: 'Номер (п/п)',
      dataIndex: 'requestNumber',
      key: 'requestNumber',
      width: 150,
    },
    {
      title: 'Материал',
      dataIndex: 'materialName',
      key: 'materialName',
      ellipsis: true,
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
    },
    {
      title: 'Кол-во по заявке',
      dataIndex: 'quantityRequested',
      key: 'quantityRequested',
      width: 150,
      render: (val: number) => Number(val).toFixed(2),
    },
    {
      title: 'Примечания',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (val: string) => val || '—',
    },
    {
      title: 'Автор',
      dataIndex: 'author',
      key: 'author',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: MaterialRequestStatus) => (
        <Tag color={STATUS_CONFIG[status].color}>{STATUS_CONFIG[status].label}</Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {canCreateRequest() && (
            <Tooltip title="Редактировать">
              <Button
                type="default"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record.requestId)}
              />
            </Tooltip>
          )}
          {canCreateRequest() && (
            <Tooltip title="Отправить на согласование">
              <Button
                type="primary"
                size="small"
                icon={<SendOutlined />}
                onClick={() => submitMutation.mutate(record.requestId)}
              />
            </Tooltip>
          )}
          {canDeleteRequest() && (
            <Tooltip title="Удалить">
              <Popconfirm
                title="Удалить заявку?"
                onConfirm={() => deleteMutation.mutate(record.requestId)}
                okText="Да"
                cancelText="Нет"
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  // Выбор колонок в зависимости от активной вкладки
  const getColumns = () => {
    switch (activeTab) {
      case 'draft':
        return draftColumns
      case 'all':
        return allColumns
      case 'in_approval':
        return approvalColumns
      case 'approved':
        return approvedColumns
      case 'in_payment':
        return paymentColumns
      case 'in_delivery':
        return deliveryColumns
      case 'completed':
        return completedColumns
      default:
        return allColumns
    }
  }

  // Табы
  const tabItems = [
    { key: 'draft', label: 'Черновики' },
    { key: 'all', label: 'Все заявки' },
    { key: 'in_approval', label: 'На согласовании' },
    { key: 'approved', label: 'Согласованные заявки' },
    { key: 'in_payment', label: 'На оплате' },
    { key: 'in_delivery', label: 'На доставке' },
    { key: 'completed', label: 'Отработанные заявки' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>Заявки на материалы</Title>
        <Space>
          <Button
            icon={<FileExcelOutlined />}
            onClick={handleExportToExcel}
            disabled={itemsRows.length === 0}
          >
            Скачать в Excel
          </Button>
          {canCreateRequest() && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Создать заявку
            </Button>
          )}
        </Space>
      </div>

      {/* Табы */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} style={{ marginBottom: 16 }} />

      {/* Фильтр по проектам */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Text>Объект:</Text>
          <Select
            style={{ width: 300 }}
            placeholder="Все объекты"
            allowClear
            value={selectedProject}
            onChange={setSelectedProject}
            options={[
              { value: undefined, label: 'Все объекты' },
              ...projects.map((project: any) => ({
                value: project.id,
                label: project.name,
              })),
            ]}
          />
        </Space>
      </div>

      {/* Таблица позиций */}
      <Table
        columns={getColumns()}
        dataSource={itemsRows}
        rowKey={(record) => `${record.requestId}-${record.id}`}
        loading={isLoading}
        scroll={{ x: 1400 }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `Всего позиций: ${total}`,
        }}
      />

      {/* Модальное окно создания/редактирования заявки */}
      <Modal
        title={editingRequest ? 'Редактировать заявку' : 'Создать заявку'}
        open={isModalOpen}
        onCancel={handleCancel}
        onOk={handleSubmit}
        width={900}
        okText={editingRequest ? 'Сохранить' : 'Создать'}
        cancelText="Отмена"
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Название заявки" rules={[{ required: true, message: 'Введите название' }]}>
            <Input placeholder="Краткое название заявки" />
          </Form.Item>

          <Form.Item name="project" label="Проект" rules={[{ required: true, message: 'Выберите проект' }]}>
            <Select placeholder="Выберите проект">
              {projects.map((project: any) => (
                <Select.Option key={project.id} value={project.id}>
                  {project.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="description" label="Описание (опционально)">
            <TextArea rows={3} placeholder="Дополнительные детали заявки" />
          </Form.Item>
        </Form>

        <Divider>Позиции заявки</Divider>

        <Form form={itemsForm} layout="vertical">
          <Form.List name="items" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, index) => (
                  <Card
                    key={field.key}
                    size="small"
                    title={`Позиция ${index + 1}`}
                    extra={
                      fields.length > 1 && (
                        <Button type="link" danger onClick={() => remove(field.name)}>
                          Удалить
                        </Button>
                      )
                    }
                    style={{ marginBottom: 16 }}
                  >
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name={[field.name, 'material_name']}
                          label="Наименование материала"
                          rules={[{ required: true, message: 'Введите наименование' }]}
                        >
                          <Input placeholder="Например: Цемент М500" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name={[field.name, 'unit']}
                          label="Единица измерения"
                          rules={[{ required: true, message: 'Введите ед. изм.' }]}
                        >
                          <Input placeholder="т, м³, шт" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          name={[field.name, 'quantity_requested']}
                          label="Количество"
                          rules={[{ required: true, message: 'Введите количество' }]}
                        >
                          <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={24}>
                        <Form.Item name={[field.name, 'notes']} label="Примечание">
                          <TextArea rows={2} placeholder="Дополнительная информация" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
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
