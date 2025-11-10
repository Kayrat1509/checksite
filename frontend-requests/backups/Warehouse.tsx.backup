import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Card, Typography, Select, InputNumber, message } from 'antd'
import { materialRequestsAPI, MaterialRequestItem } from '../api/materialRequests'
import { projectsAPI } from '../api/projects'
import { useAuthStore } from '../stores/authStore'
import dayjs from 'dayjs'

const { Option } = Select
const { Title } = Typography

const Warehouse = () => {
  const [selectedProject, setSelectedProject] = useState<number | null>(null)
  const { user } = useAuthStore()

  // Получаем список проектов
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.getProjects(),
  })

  // Получаем материалы с заполненным actual_quantity для выбранного проекта
  const { data: materialsData, isLoading, refetch } = useQuery({
    queryKey: ['warehouse-materials', selectedProject],
    queryFn: () =>
      materialRequestsAPI.getMaterialItemsWithActualQuantity({
        request__project: selectedProject || undefined,
        has_actual_quantity: true,
      }),
    enabled: !!selectedProject,
  })

  // Проверка прав на редактирование (только Завсклад объекта и Начальник участка)
  const canEdit = () => {
    if (!user) {
      console.log('canEdit: user not found')
      return false
    }
    const allowedRoles = ['SITE_WAREHOUSE_MANAGER', 'FOREMAN']
    const hasPermission = allowedRoles.includes(user.role)
    console.log(`canEdit: user.role = ${user.role}, hasPermission = ${hasPermission}`)
    return hasPermission
  }

  // Обновление выданного количества
  const handleUpdateIssuedQuantity = async (itemId: number, value: number | null) => {
    if (value === null) return

    try {
      console.log('Обновление issued_quantity для itemId:', itemId, 'значение:', value)
      const response = await materialRequestsAPI.updateItem(itemId, {
        issued_quantity: value
      })
      console.log('Ответ от сервера:', response)
      message.success('Количество выдано обновлено')
      refetch() // Обновляем данные
    } catch (error: any) {
      console.error('Ошибка при обновлении issued_quantity:', error)
      const errorMsg = error.response?.data?.detail || error.message || 'Неизвестная ошибка'
      message.error(`Ошибка при обновлении: ${errorMsg}`)
    }
  }

  // Колонки таблицы
  const columns = [
    {
      title: '№ заявки',
      dataIndex: 'request_number',
      key: 'request_number',
      width: 120,
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: 'Наименование материала',
      dataIndex: 'material_name',
      key: 'material_name',
      width: 300,
    },
    {
      title: 'Дата прибытия',
      dataIndex: 'warehouse_receipt_date',
      key: 'warehouse_receipt_date',
      width: 120,
      render: (date: string) => (date ? dayjs(date).format('DD.MM.YYYY') : '-'),
    },
    {
      title: 'Количество',
      dataIndex: 'actual_quantity',
      key: 'actual_quantity',
      width: 120,
      render: (value: number, record: MaterialRequestItem) => (
        <span style={{ fontWeight: 500 }}>
          {value || 0} {record.unit}
        </span>
      ),
    },
    {
      title: 'Выдано',
      dataIndex: 'issued_quantity',
      key: 'issued_quantity',
      width: 150,
      render: (value: number | null, record: MaterialRequestItem) => {
        const editable = canEdit()

        if (editable) {
          return (
            <InputNumber
              min={0}
              max={record.actual_quantity || 0}
              step={0.01}
              precision={2}
              placeholder="0"
              value={value || 0}
              onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                const newValue = parseFloat(e.target.value)
                if (!isNaN(newValue) && newValue !== (value || 0)) {
                  handleUpdateIssuedQuantity(record.id!, newValue)
                }
              }}
              onPressEnter={(e: React.KeyboardEvent<HTMLInputElement>) => {
                const newValue = parseFloat((e.target as HTMLInputElement).value)
                if (!isNaN(newValue) && newValue !== (value || 0)) {
                  handleUpdateIssuedQuantity(record.id!, newValue);
                  (e.target as HTMLInputElement).blur() // Убираем фокус после сохранения
                }
              }}
              style={{ width: '100%' }}
              size="small"
            />
          )
        }

        return <span>{value || 0} {record.unit}</span>
      },
    },
    {
      title: 'Остаток',
      key: 'remaining',
      width: 120,
      render: (record: MaterialRequestItem) => {
        const actual = record.actual_quantity || 0
        const issued = record.issued_quantity || 0
        const remaining = actual - issued

        return (
          <span style={{
            fontWeight: 500,
            color: remaining <= 0 ? '#ff4d4f' : remaining < actual * 0.2 ? '#faad14' : '#52c41a'
          }}>
            {remaining.toFixed(2)} {record.unit}
          </span>
        )
      },
    },
    {
      title: 'Изменил',
      dataIndex: 'issued_by_data',
      key: 'issued_by',
      width: 180,
      render: (issued_by_data: { id: number; full_name: string; role: string } | null | undefined) => {
        if (!issued_by_data) return '-'

        // Извлекаем фамилию и первую букву имени
        const nameParts = issued_by_data.full_name.split(' ')
        const lastName = nameParts[0] || ''
        const firstNameInitial = nameParts[1] ? nameParts[1].charAt(0) + '.' : ''
        const displayName = `${lastName} ${firstNameInitial}`

        return <span>{displayName}</span>
      },
    },
    {
      title: 'Ед. изм.',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
    },
    {
      title: 'Примечания',
      dataIndex: 'specifications',
      key: 'specifications',
      width: 250,
      render: (text: string) => text || '-',
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>
            Склад
          </Title>
          <Select
            style={{ width: 300 }}
            placeholder="Выберите проект"
            value={selectedProject}
            onChange={setSelectedProject}
            allowClear
          >
            {projectsData?.results?.map((project: any) => (
              <Option key={project.id} value={project.id}>
                {project.name}
              </Option>
            ))}
          </Select>
        </div>

        {selectedProject && (
          <div style={{ marginBottom: 16 }}>
            <Typography.Text type="secondary">
              Отображаются только материалы, у которых заполнено поле "Кол-во по факту" (фактически поступившие на склад)
            </Typography.Text>
          </div>
        )}

        <Table
          columns={columns}
          dataSource={materialsData?.results || []}
          loading={isLoading}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Всего материалов: ${total}`,
          }}
          locale={{
            emptyText: selectedProject
              ? 'Нет материалов с заполненным фактическим количеством'
              : 'Выберите проект для просмотра материалов на складе',
          }}
        />
      </Card>
    </div>
  )
}

export default Warehouse
