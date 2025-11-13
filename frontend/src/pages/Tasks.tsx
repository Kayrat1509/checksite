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
  DatePicker,
  message,
  Tag,
  Tooltip,
  Popconfirm,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksAPI, Task, CreateTaskData, UpdateTaskData } from '../api/tasks'
import { usersAPI } from '../api/users'
import { projectsAPI } from '../api/projects'
import { useAuthStore } from '../stores/authStore'
import { useButtonAccess } from '../hooks/useButtonAccess'
import dayjs from 'dayjs'

const { Title } = Typography
const { TextArea } = Input

// Статусы задач с цветами
const STATUS_CONFIG = {
  IN_PROGRESS: { label: 'В исполнении', color: 'blue' },
  COMPLETED: { label: 'Исполнено', color: 'green' },
  OVERDUE: { label: 'Просрочено', color: 'orange' },
  REJECTED: { label: 'Отклонено', color: 'red' },
}

const Tasks = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { user } = useAuthStore()
  const { canUseButton } = useButtonAccess('tasks')

  // Функции проверки прав доступа
  const canCreateTask = () => user?.is_superuser || user?.role === 'SUPERADMIN' || canUseButton('create')
  const canEditTask = () => user?.is_superuser || user?.role === 'SUPERADMIN' || canUseButton('edit')
  const canDeleteTask = () => user?.is_superuser || user?.role === 'SUPERADMIN' || canUseButton('delete')
  const canRejectTask = () => user?.is_superuser || user?.role === 'SUPERADMIN' || canUseButton('reject')
  const canCompleteTask = () => user?.is_superuser || user?.role === 'SUPERADMIN' || canUseButton('complete')

  // Получение списка задач с фильтрацией
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', statusFilter],
    queryFn: () => tasksAPI.getTasks({ status: statusFilter as any }),
  })

  // Извлекаем массив задач из ответа API (может быть с пагинацией или без)
  const tasks = Array.isArray(tasksData) ? tasksData : (tasksData?.results || [])

  // Получение списка всех пользователей
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: usersAPI.getUsers,
  })
  const allUsers = Array.isArray(usersData) ? usersData : (usersData?.results || [])

  // Фильтруем сотрудников (не CONTRACTOR и не OBSERVER)
  const employees = allUsers.filter((u: any) => u.role !== 'CONTRACTOR' && u.role !== 'OBSERVER')

  // Фильтруем подрядчиков
  const contractors = allUsers.filter((u: any) => u.role === 'CONTRACTOR')

  // Получение списка проектов
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsAPI.getProjects,
  })
  const projects = Array.isArray(projectsData) ? projectsData : (projectsData?.results || [])

  // Создание задачи
  const createMutation = useMutation({
    mutationFn: tasksAPI.createTask,
    onSuccess: () => {
      message.success('Задача создана! Email уведомление отправлено.')
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      handleCancel()
    },
    onError: (error: any) => {
      message.error(`Ошибка создания задачи: ${error.response?.data?.detail || error.message}`)
    },
  })

  // Обновление задачи
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTaskData }) =>
      tasksAPI.updateTask(id, data),
    onSuccess: () => {
      message.success('Задача обновлена!')
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      handleCancel()
    },
    onError: (error: any) => {
      message.error(`Ошибка обновления: ${error.response?.data?.detail || error.message}`)
    },
  })

  // Удаление задачи
  const deleteMutation = useMutation({
    mutationFn: tasksAPI.deleteTask,
    onSuccess: () => {
      message.success('Задача удалена')
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (error: any) => {
      message.error(`Ошибка удаления: ${error.response?.data?.detail || error.message}`)
    },
  })

  // Завершение задачи
  const completeMutation = useMutation({
    mutationFn: tasksAPI.completeTask,
    onSuccess: () => {
      message.success('Задача завершена! Email уведомление отправлено.')
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (error: any) => {
      message.error(`Ошибка: ${error.response?.data?.detail || error.message}`)
    },
  })

  // Отмена задачи
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      tasksAPI.rejectTask(id, { rejection_reason: reason }),
    onSuccess: () => {
      message.success('Задача отменена! Email уведомление отправлено.')
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (error: any) => {
      message.error(`Ошибка: ${error.response?.data?.detail || error.message}`)
    },
  })

  // Открытие модального окна для создания
  const handleCreate = () => {
    setEditingTask(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  // Открытие модального окна для редактирования
  const handleEdit = (task: Task) => {
    setEditingTask(task)
    form.setFieldsValue({
      title: task.title,
      assigned_to_user: task.assigned_to_user,
      assigned_to_contractor: task.assigned_to_contractor,
      project: task.project,
      deadline: task.deadline ? dayjs(task.deadline) : null,
    })
    setIsModalOpen(true)
  }

  // Закрытие модального окна
  const handleCancel = () => {
    setIsModalOpen(false)
    setEditingTask(null)
    form.resetFields()
  }

  // Отправка формы
  const handleSubmit = async (values: any) => {
    const taskData: CreateTaskData | UpdateTaskData = {
      title: values.title,
      assigned_to_user: values.assigned_to_user || null,
      assigned_to_contractor: values.assigned_to_contractor || null,
      project: values.project || null,
      deadline: values.deadline ? values.deadline.toISOString() : dayjs().add(7, 'day').toISOString(),
    }

    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data: taskData })
    } else {
      createMutation.mutate(taskData as CreateTaskData)
    }
  }

  // Удаление задачи
  const handleDelete = (id: number) => {
    deleteMutation.mutate(id)
  }

  // Завершение задачи
  const handleComplete = (id: number) => {
    completeMutation.mutate(id)
  }

  // Отмена задачи
  const handleReject = (id: number) => {
    Modal.confirm({
      title: 'Отменить задачу',
      content: (
        <Form>
          <Form.Item name="rejection_reason" label="Причина отмены" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="Укажите причину отмены задачи" id="rejection-reason-input" />
          </Form.Item>
        </Form>
      ),
      onOk: () => {
        const reason = (document.getElementById('rejection-reason-input') as HTMLTextAreaElement)?.value
        if (reason) {
          rejectMutation.mutate({ id, reason })
        } else {
          message.error('Укажите причину отмены')
        }
      },
    })
  }

  // Колонки таблицы
  const columns: ColumnsType<Task> = [
    {
      title: 'Дата',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 110,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Номер задачи',
      dataIndex: 'task_number',
      key: 'task_number',
      width: 150,
    },
    {
      title: 'Задача',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Проект',
      dataIndex: 'project_name',
      key: 'project_name',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'От кого',
      dataIndex: 'created_by_name',
      key: 'created_by_name',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Кому',
      key: 'assigned_to',
      width: 180,
      render: (_, record) => {
        const userAssigned = record.assigned_to_user_name
        const contractorAssigned = record.assigned_to_contractor_name

        // Если назначены оба - показываем на разных строках
        if (userAssigned && contractorAssigned) {
          return (
            <div style={{ lineHeight: '1.4' }}>
              <div>{userAssigned}</div>
              <div>{contractorAssigned}</div>
            </div>
          )
        }

        // Иначе показываем того, кто назначен
        return userAssigned || contractorAssigned || '—'
      },
    },
    {
      title: 'Срок исполнения',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 140,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: keyof typeof STATUS_CONFIG) => (
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
          {canCompleteTask() && record.status === 'IN_PROGRESS' && (
            <Tooltip title="Завершить">
              <Button
                type="link"
                icon={<CheckOutlined />}
                onClick={() => handleComplete(record.id)}
                style={{ color: 'green' }}
              />
            </Tooltip>
          )}
          {canEditTask() && record.status !== 'COMPLETED' && record.status !== 'REJECTED' && (
            <Tooltip title="Редактировать">
              <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
            </Tooltip>
          )}
          {canRejectTask() && record.status !== 'COMPLETED' && record.status !== 'REJECTED' && (
            <Tooltip title="Отменить">
              <Button
                type="link"
                icon={<CloseOutlined />}
                onClick={() => handleReject(record.id)}
                style={{ color: 'orange' }}
              />
            </Tooltip>
          )}
          {canDeleteTask() && (
            <Tooltip title="Удалить">
              <Popconfirm
                title="Вы уверены, что хотите удалить задачу?"
                onConfirm={() => handleDelete(record.id)}
                okText="Да"
                cancelText="Нет"
              >
                <Button type="link" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>Задачи</Title>
        {canCreateTask() && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Создать задачу
          </Button>
        )}
      </div>

      {/* Фильтры по статусу */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button
            type={statusFilter === undefined ? 'primary' : 'default'}
            onClick={() => setStatusFilter(undefined)}
          >
            Все
          </Button>
          <Button
            type={statusFilter === 'IN_PROGRESS' ? 'primary' : 'default'}
            onClick={() => setStatusFilter('IN_PROGRESS')}
          >
            В исполнении
          </Button>
          <Button
            type={statusFilter === 'COMPLETED' ? 'primary' : 'default'}
            onClick={() => setStatusFilter('COMPLETED')}
          >
            Исполнено
          </Button>
          <Button
            type={statusFilter === 'OVERDUE' ? 'primary' : 'default'}
            onClick={() => setStatusFilter('OVERDUE')}
          >
            Просрочено
          </Button>
          <Button
            type={statusFilter === 'REJECTED' ? 'primary' : 'default'}
            onClick={() => setStatusFilter('REJECTED')}
          >
            Отклонено
          </Button>
        </Space>
      </div>

      {/* Таблица задач */}
      <Table
        columns={columns}
        dataSource={tasks}
        rowKey="id"
        loading={isLoading}
        scroll={{ x: 1200 }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `Всего задач: ${total}`,
        }}
      />

      {/* Модальное окно создания/редактирования */}
      <Modal
        title={editingTask ? 'Редактировать задачу' : 'Создать задачу'}
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="title"
            label="Название задачи"
            rules={[{ required: true, message: 'Введите название задачи' }]}
          >
            <Input placeholder="Краткое название задачи" />
          </Form.Item>

          <Form.Item name="project" label="Проект (опционально)">
            <Select placeholder="Выберите проект" allowClear>
              {projects.map((project: any) => (
                <Select.Option key={project.id} value={project.id}>
                  {project.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="assigned_to_user"
            label="Назначить сотруднику"
            tooltip="Можно выбрать сотрудника, подрядчика или обоих"
          >
            <Select placeholder="Выберите сотрудника" allowClear>
              {employees.map((emp: any) => (
                <Select.Option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.position || emp.role})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="assigned_to_contractor"
            label="Назначить подрядчику"
            tooltip="Можно выбрать сотрудника, подрядчика или обоих"
          >
            <Select placeholder="Выберите подрядчика" allowClear>
              {contractors.map((contractor: any) => (
                <Select.Option key={contractor.id} value={contractor.id}>
                  {contractor.full_name}{contractor.company_name ? ` - ${contractor.company_name}` : ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="deadline"
            label="Срок исполнения"
            rules={[{ required: true, message: 'Укажите срок исполнения' }]}
          >
            <DatePicker
              showTime
              format="DD.MM.YYYY HH:mm"
              placeholder="Выберите дату и время"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingTask ? 'Обновить' : 'Создать'}
              </Button>
              <Button onClick={handleCancel}>Отмена</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Tasks
