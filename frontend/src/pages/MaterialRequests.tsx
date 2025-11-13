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
  MaterialRequestItemStatus,
} from '../api/materialRequests'
import { projectsAPI } from '../api/projects'
import { useAuthStore } from '../stores/authStore'
import { useButtonAccess } from '../hooks/useButtonAccess'
import ActualQuantityModal from '../components/MaterialRequests/ActualQuantityModal'
import RejectionReasonModal from '../components/MaterialRequests/RejectionReasonModal'

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
  itemStatus: MaterialRequestItemStatus
  itemStatusDisplay: string
  receivedAt: string | null // Дата принятия позиции на объекте
}

// Конфигурация статусов позиций
const ITEM_STATUS_CONFIG: Record<MaterialRequestItemStatus, { label: string; color: string }> = {
  PENDING: { label: 'Ожидает доставки', color: 'default' },
  PARTIAL: { label: 'Частично доставлено', color: 'orange' },
  DELIVERED: { label: 'Полностью доставлено', color: 'blue' },
  RECEIVED: { label: 'Принято на объекте', color: 'green' },
}

const MaterialRequests = () => {
  const [activeTab, setActiveTab] = useState<string>('draft')
  const [selectedProject, setSelectedProject] = useState<number | undefined>(undefined)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRequest, setEditingRequest] = useState<MaterialRequest | null>(null)
  const [form] = Form.useForm()
  const [itemsForm] = Form.useForm()
  const queryClient = useQueryClient()

  // State для модального окна обновления фактического количества
  const [actualQuantityModalState, setActualQuantityModalState] = useState<{
    visible: boolean
    data: {
      requestId: number
      itemId: number
      currentQuantity: number | null
      quantityRequested: number
    } | null
  }>({ visible: false, data: null })

  // State для модального окна указания причины возврата
  const [rejectionModalState, setRejectionModalState] = useState<{
    visible: boolean
    requestId: number | null
  }>({ visible: false, requestId: null })

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
      itemStatus: (item.status as MaterialRequestItemStatus) || 'PENDING',
      itemStatusDisplay: item.status_display || 'Ожидает доставки',
      receivedAt: item.received_at || null, // Дата принятия позиции на объекте
    }))
  )

  /**
   * Фильтрация позиций в зависимости от активной вкладки:
   *
   * 1. "На доставке" (in_delivery):
   *    - Скрываем принятые позиции (статус RECEIVED), чтобы отображались только
   *      те, которые ещё ожидают доставки или частично доставлены
   *
   * 2. "Отработанные заявки" (completed):
   *    - Показываем ТОЛЬКО принятые позиции (статус RECEIVED)
   *    - Backend возвращает заявки, у которых есть хотя бы одна принятая позиция
   *    - Frontend фильтрует и показывает только принятые позиции из этих заявок
   */
  const filteredItemsRows = activeTab === 'in_delivery'
    ? itemsRows.filter((item) => item.itemStatus !== 'RECEIVED')
    : activeTab === 'completed'
    ? itemsRows.filter((item) => item.itemStatus === 'RECEIVED')
    : itemsRows

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

  // Приёмка конкретной позиции
  const receiveItemMutation = useMutation({
    mutationFn: ({ requestId, itemId }: { requestId: number; itemId: number }) =>
      materialRequestsAPI.receiveItem(requestId, itemId),
    onSuccess: (data) => {
      if (data.all_items_received) {
        message.success('Позиция принята! Все позиции этой заявки приняты.')
      } else {
        message.success('Позиция успешно принята на объекте!')
      }
      queryClient.invalidateQueries({ queryKey: ['material-requests'] })
    },
    onError: (error: any) => {
      message.error(`Ошибка приёмки: ${error.response?.data?.error || error.message}`)
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

  // Открытие модального окна для указания причины возврата
  const handleReject = (requestId: number) => {
    setRejectionModalState({ visible: true, requestId })
  }

  // Подтверждение возврата заявки на доработку
  const handleRejectionSubmit = (reason: string) => {
    if (!rejectionModalState.requestId) return

    rejectMutation.mutate(
      { id: rejectionModalState.requestId, reason },
      {
        onSuccess: () => {
          // Закрываем модальное окно после успешного возврата
          setRejectionModalState({ visible: false, requestId: null })
        }
      }
    )
  }

  // Закрытие модального окна возврата
  const handleRejectionCancel = () => {
    setRejectionModalState({ visible: false, requestId: null })
  }

  // Экспорт всех данных таблицы в Excel
  const handleExportToExcel = () => {
    try {
      // Подготавливаем данные для экспорта (используем отфильтрованные данные)
      const exportData = filteredItemsRows.map((row) => {
        const baseData: Record<string, string | number> = {
          'Номер заявки': row.requestNumber,
          'Материал': row.materialName,
          'Ед. изм.': row.unit,
          'Кол-во по заявке': Number(row.quantityRequested).toFixed(2),
          'Кол-во по факту': row.quantityActual !== null && row.quantityActual !== undefined ? Number(row.quantityActual).toFixed(2) : '—',
          'Примечания': row.notes || '—',
          'Автор': row.author,
          'Статус позиции': row.itemStatusDisplay,
        }

        // Для вкладки "Отработанные заявки" добавляем колонку "Дата принятия"
        if (activeTab === 'completed') {
          baseData['Дата принятия'] = row.receivedAt
            ? new Date(row.receivedAt).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })
            : '—'
        }

        return baseData
      })

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

  // Открытие модального окна обновления фактического количества
  const handleUpdateActualQuantity = (requestId: number, itemId: number, currentQuantity: number | null, quantityRequested: number) => {
    setActualQuantityModalState({
      visible: true,
      data: { requestId, itemId, currentQuantity, quantityRequested }
    })
  }

  // Подтверждение обновления фактического количества
  const handleActualQuantitySubmit = (newQuantity: number, notes?: string) => {
    if (!actualQuantityModalState.data) return

    const { requestId, itemId } = actualQuantityModalState.data
    updateActualQuantityMutation.mutate(
      { requestId, itemId, quantity: newQuantity, notes },
      {
        onSuccess: () => {
          // Закрываем модальное окно после успешного обновления
          setActualQuantityModalState({ visible: false, data: null })
        }
      }
    )
  }

  // Закрытие модального окна обновления фактического количества
  const handleActualQuantityCancel = () => {
    setActualQuantityModalState({ visible: false, data: null })
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
            <Tooltip title="Нажмите для обновления фактического количества">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleUpdateActualQuantity(record.requestId, record.id, record.quantityActual, record.quantityRequested)}
                style={{
                  color: isComplete ? '#52c41a' : '#1890ff',
                  fontWeight: 'bold'
                }}
              >
                {actualQty} {isComplete && '✓'}
              </Button>
            </Tooltip>
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
      title: 'Статус позиции',
      key: 'itemStatus',
      width: 200,
      render: (_, record) => {
        const statusConfig = ITEM_STATUS_CONFIG[record.itemStatus]
        return <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
      },
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
      title: 'Текущий согласующий',
      key: 'currentApprover',
      width: 180,
      render: (_, record) => {
        if (record.currentApprover) {
          return <Tag color="blue">Ожидает: {record.currentApprover}</Tag>
        }
        return <Tag color="default">—</Tag>
      },
    },
    {
      title: 'Статус позиции',
      key: 'itemStatus',
      width: 180,
      render: (_, record) => {
        const statusConfig = ITEM_STATUS_CONFIG[record.itemStatus]
        return <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
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
      title: 'Статус позиции',
      key: 'itemStatus',
      width: 180,
      render: (_, record) => {
        const statusConfig = ITEM_STATUS_CONFIG[record.itemStatus]
        return <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {isSupplyManager() && (
            <Button
              type="primary"
              size="small"
              icon={<DollarOutlined />}
              onClick={() => moveToPaymentMutation.mutate(record.requestId)}
            >
              На оплату
            </Button>
          )}
        </Space>
      ),
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
      title: 'Статус позиции',
      key: 'itemStatus',
      width: 180,
      render: (_, record) => {
        const statusConfig = ITEM_STATUS_CONFIG[record.itemStatus]
        return <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {isSupplyManager() && (
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => moveToDeliveryMutation.mutate(record.requestId)}
            >
              Оплачено
            </Button>
          )}
        </Space>
      ),
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
            <Tooltip title="Нажмите для обновления фактического количества">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleUpdateActualQuantity(record.requestId, record.id, record.quantityActual, record.quantityRequested)}
                style={{
                  color: isComplete ? '#52c41a' : '#1890ff',
                  fontWeight: 'bold'
                }}
              >
                {actualQty} {isComplete && '✓'}
              </Button>
            </Tooltip>
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
      title: 'Статус позиции',
      key: 'itemStatus',
      width: 200,
      render: (_, record) => {
        const statusConfig = ITEM_STATUS_CONFIG[record.itemStatus]
        return <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {canReceiveMaterials() && record.itemStatus !== 'RECEIVED' && (
            <Popconfirm
              title="Принять позицию на объекте?"
              description={`Вы уверены, что хотите принять "${record.materialName}" (${record.quantityRequested} ${record.unit})?`}
              onConfirm={() =>
                receiveItemMutation.mutate({
                  requestId: record.requestId,
                  itemId: record.id,
                })
              }
              okText="Да, принять"
              cancelText="Отмена"
            >
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
              >
                Принять
              </Button>
            </Popconfirm>
          )}
          {record.itemStatus === 'RECEIVED' && (
            <Tag color="green" icon={<CheckOutlined />}>
              Принято
            </Tag>
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
      title: 'Статус позиции',
      key: 'itemStatus',
      width: 200,
      render: (_, record) => {
        const statusConfig = ITEM_STATUS_CONFIG[record.itemStatus]
        return <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
      },
    },
    {
      title: 'Дата принятия',
      dataIndex: 'receivedAt',
      key: 'receivedAt',
      width: 150,
      render: (val: string | null) => {
        if (!val) return '—'
        // Форматируем дату в формате "ДД.ММ.ГГГГ"
        const date = new Date(val)
        return date.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      },
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
      title: 'Статус позиции',
      key: 'itemStatus',
      width: 200,
      render: (_, record) => {
        const statusConfig = ITEM_STATUS_CONFIG[record.itemStatus]
        return <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
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
            disabled={filteredItemsRows.length === 0}
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
        dataSource={filteredItemsRows}
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

      {/* Модальное окно обновления фактического количества */}
      <ActualQuantityModal
        visible={actualQuantityModalState.visible}
        onCancel={handleActualQuantityCancel}
        onSubmit={handleActualQuantitySubmit}
        currentQuantity={actualQuantityModalState.data?.currentQuantity ?? null}
        quantityRequested={actualQuantityModalState.data?.quantityRequested ?? 0}
        loading={updateActualQuantityMutation.isPending}
      />

      {/* Модальное окно указания причины возврата */}
      <RejectionReasonModal
        visible={rejectionModalState.visible}
        onCancel={handleRejectionCancel}
        onSubmit={handleRejectionSubmit}
        loading={rejectMutation.isPending}
      />
    </div>
  )
}

export default MaterialRequests
