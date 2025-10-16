import { useState } from 'react'
import {
  Typography,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Upload,
  message,
  Popconfirm,
  Space,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import type { UploadFile } from 'antd'
import { technicalConditionsAPI, type TechnicalCondition } from '../api/technicalConditions'

const { Title, Text } = Typography
const { TextArea } = Input

const TechnicalConditions = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<TechnicalCondition | null>(null)
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const queryClient = useQueryClient()
  const currentUser = useAuthStore(state => state.user)

  // Проверка прав
  const canManage = () => {
    if (!currentUser) return false
    if (currentUser.is_superuser) return true
    const allowedRoles = ['ENGINEER', 'CHIEF_ENGINEER', 'SITE_MANAGER', 'FOREMAN', 'PROJECT_MANAGER', 'DIRECTOR']
    return allowedRoles.includes(currentUser.role)
  }

  // Получение данных
  const { data, isLoading, error } = useQuery({
    queryKey: ['technical-conditions'],
    queryFn: technicalConditionsAPI.getTechnicalConditions,
  })

  // Преобразуем данные в массив (API может вернуть массив или объект с results)
  const technicalConditions = Array.isArray(data) ? data : (data?.results || [])

  // Мутации
  const createMutation = useMutation({
    mutationFn: technicalConditionsAPI.createTechnicalCondition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-conditions'] })
      message.success('Техусловие успешно добавлено')
      handleCloseModal()
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || 'Ошибка при добавлении техусловия')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      technicalConditionsAPI.updateTechnicalCondition(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-conditions'] })
      message.success('Техусловие успешно обновлено')
      handleCloseModal()
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || 'Ошибка при обновлении техусловия')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: technicalConditionsAPI.deleteTechnicalCondition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-conditions'] })
      message.success('Техусловие успешно удалено')
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || 'Ошибка при удалении техусловия')
    },
  })

  // Handlers
  const handleOpenCreateModal = () => {
    setEditingRecord(null)
    setFileList([])
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (record: TechnicalCondition) => {
    setEditingRecord(record)
    form.setFieldsValue({
      received_from: record.received_from,
      description: record.description,
    })
    setFileList([])
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingRecord(null)
    form.resetFields()
    setFileList([])
  }

  const handleSubmit = async (values: any) => {
    // Логирование для отладки
    console.log('=== handleSubmit DEBUG ===')
    console.log('fileList:', fileList)
    console.log('fileList.length:', fileList.length)
    if (fileList.length > 0) {
      console.log('fileList[0]:', fileList[0])
      console.log('fileList[0].originFileObj:', fileList[0].originFileObj)
    }
    console.log('values:', values)
    console.log('editingRecord:', editingRecord)

    // Проверка наличия файла при создании нового техусловия
    if (!editingRecord && fileList.length === 0) {
      message.error('Пожалуйста, выберите PDF файл')
      return
    }

    // Проверка, что файл действительно есть в fileList
    if (!editingRecord && (!fileList[0] || !fileList[0].originFileObj)) {
      console.error('Файл не найден в fileList[0].originFileObj')
      message.error('Ошибка: файл не выбран корректно. Попробуйте выбрать файл заново.')
      return
    }

    if (editingRecord) {
      // Обновление существующего техусловия
      const updateData: any = {
        received_from: values.received_from,
        description: values.description || '',
      }

      // Добавляем файл только если был выбран новый
      if (fileList.length > 0 && fileList[0].originFileObj) {
        updateData.file = fileList[0].originFileObj
      }

      updateMutation.mutate({ id: editingRecord.id, data: updateData })
    } else {
      // Создание нового техусловия
      const createData = {
        file: fileList[0].originFileObj as File,
        received_from: values.received_from,
        description: values.description || '',
      }

      console.log('Sending createData:', createData)
      createMutation.mutate(createData)
    }
  }

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id)
  }

  const handleDownload = (record: TechnicalCondition) => {
    window.open(record.file_url, '_blank')
  }

  // Columns
  const columns = [
    {
      title: '№',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'PDF файл',
      dataIndex: 'file',
      key: 'file',
      render: (_: string, record: TechnicalCondition) => (
        <Button type="link" icon={<FilePdfOutlined />} onClick={() => handleDownload(record)}>
          Открыть PDF
        </Button>
      ),
    },
    {
      title: 'От кого получено',
      dataIndex: 'received_from',
      key: 'received_from',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Добавил',
      dataIndex: 'created_by_name',
      key: 'created_by_name',
    },
    {
      title: 'Дата добавления',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => {
        if (!date) return '-'
        try {
          const d = new Date(date)
          return d.toLocaleString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })
        } catch (e) {
          return date
        }
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      render: (_: any, record: TechnicalCondition) => (
        <Space>
          <Button type="link" icon={<DownloadOutlined />} onClick={() => handleDownload(record)}>
            Скачать
          </Button>
          {canManage() && (
            <>
              <Button type="link" icon={<EditOutlined />} onClick={() => handleOpenEditModal(record)} />
              <Popconfirm
                title="Удалить техусловие?"
                description="Это действие нельзя отменить"
                onConfirm={() => handleDelete(record.id)}
                okText="Да"
                cancelText="Нет"
              >
                <Button type="link" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ]

  if (error) {
    return (
      <div>
        <Title level={2}>Техусловия</Title>
        <p style={{ color: 'red' }}>Ошибка загрузки данных: {(error as Error).message}</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>Техусловия</Title>
        {canManage() && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
            Добавить техусловие
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={technicalConditions}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
        locale={{
          emptyText: 'Нет данных'
        }}
      />

      <Modal
        title={editingRecord ? 'Редактировать техусловие' : 'Добавить техусловие'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        okText={editingRecord ? 'Сохранить' : 'Добавить'}
        cancelText="Отмена"
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="file"
            label="PDF файл"
            rules={!editingRecord ? [{ required: true, message: 'Пожалуйста, выберите PDF файл' }] : []}
          >
            <Upload
              accept=".pdf"
              maxCount={1}
              fileList={fileList}
              beforeUpload={(file) => {
                console.log('beforeUpload - file:', file)
                console.log('beforeUpload - file.type:', file.type)
                console.log('beforeUpload - file.size:', file.size)

                if (file.type !== 'application/pdf') {
                  message.error('Можно загружать только PDF файлы')
                  return false
                }
                if (file.size > 10 * 1024 * 1024) {
                  message.error('Размер файла не должен превышать 10 МБ')
                  return false
                }

                // Создаем правильную структуру UploadFile с originFileObj
                const uploadFile: UploadFile = {
                  uid: file.uid || `${Date.now()}`,
                  name: file.name,
                  status: 'done',
                  size: file.size,
                  type: file.type,
                  originFileObj: file as any,
                }

                console.log('beforeUpload - creating uploadFile:', uploadFile)
                setFileList([uploadFile])

                // Возвращаем false чтобы предотвратить автоматическую загрузку
                return false
              }}
              onRemove={() => {
                console.log('onRemove - clearing fileList')
                setFileList([])
              }}
            >
              <Button icon={<UploadOutlined />}>Выбрать PDF файл</Button>
            </Upload>
            {editingRecord && !fileList.length && (
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '8px' }}>
                Если не выбран новый файл, текущий файл останется без изменений
              </Text>
            )}
          </Form.Item>

          <Form.Item
            name="received_from"
            label="От кого получено"
            rules={[{ required: true, message: 'Пожалуйста, укажите организацию' }]}
          >
            <Input placeholder="Например: Водоканал, Телеком, Электросеть" />
          </Form.Item>

          <Form.Item name="description" label="Описание (опционально)">
            <TextArea rows={4} placeholder="Дополнительное описание технического условия" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default TechnicalConditions
