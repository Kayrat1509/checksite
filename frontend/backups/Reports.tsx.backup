import { useState } from 'react'
import {
  Typography,
  Result,
  Card,
  Row,
  Col,
  DatePicker,
  Select,
  Button,
  Space,
  message,
  Divider,
  Tag,
  Statistic
} from 'antd'
import {
  FilePdfOutlined,
  FileExcelOutlined,
  BarChartOutlined,
  FileTextOutlined,
  TeamOutlined,
  ShoppingCartOutlined,
  DownloadOutlined,
  CalendarOutlined,
  ProjectOutlined,
  FilterOutlined,
  CameraOutlined
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { authAPI } from '../api/auth'
import { reportsAPI, ReportFilters } from '../api/reports'
import { projectsAPI } from '../api/projects'
import { usersAPI } from '../api/users'
import { useAuthStore } from '../stores/authStore'
import dayjs, { Dayjs } from 'dayjs'

const { Title, Paragraph, Text } = Typography
const { RangePicker } = DatePicker

const Reports = () => {
  const { hasPageAccess } = useAuthStore()

  // Состояние фильтров
  const [filters, setFilters] = useState<ReportFilters>({})
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null])
  const [loading, setLoading] = useState<string | null>(null)

  // Проверка доступа текущего пользователя
  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authAPI.getCurrentUser,
    retry: 1
  })

  // Загрузка списка проектов для фильтра
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.getProjects(),
    enabled: !!currentUser
  })

  // Загрузка списка подрядчиков для фильтра
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersAPI.getUsers(),
    enabled: !!currentUser
  })

  // Фильтруем только подрядчиков из списка пользователей
  const contractors = usersData?.results?.filter((user: any) => user.role === 'CONTRACTOR') || []

  // ===== НОВАЯ ЛОГИКА: Проверка доступа через матрицу доступа из БД =====
  // Проверяем доступ к странице через hasPageAccess('reports')
  if (!isUserLoading && currentUser && !hasPageAccess('reports')) {
    return (
      <Result
        status="403"
        title="Доступ запрещен"
        subTitle="У вас нет доступа к странице отчетов. Обратитесь к администратору."
      />
    )
  }

  // Обработчики изменения фильтров
  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates) {
      setDateRange(dates)
      setFilters({
        ...filters,
        dateFrom: dates[0] ? dates[0].format('YYYY-MM-DD') : undefined,
        dateTo: dates[1] ? dates[1].format('YYYY-MM-DD') : undefined
      })
    } else {
      setDateRange([null, null])
      setFilters({
        ...filters,
        dateFrom: undefined,
        dateTo: undefined
      })
    }
  }

  const handleProjectChange = (value: number | undefined) => {
    setFilters({ ...filters, projectId: value })
  }

  const handleStatusChange = (value: string | undefined) => {
    setFilters({ ...filters, status: value })
  }

  const handleContractorChange = (value: number | undefined) => {
    setFilters({ ...filters, contractorId: value })
  }

  // Функция скачивания файла
  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  // Генерация отчетов
  const generateReport = async (
    type: 'issues' | 'projects' | 'contractors_kpi' | 'material_requests',
    format: 'pdf' | 'excel'
  ) => {
    // Проверка обязательных параметров
    if ((type === 'issues' || type === 'projects' || type === 'material_requests') && !filters.projectId) {
      message.warning('Пожалуйста, выберите проект для генерации отчета')
      return
    }

    if (type === 'contractors_kpi' && !filters.contractorId) {
      message.warning('Пожалуйста, выберите подрядчика для генерации отчета KPI')
      return
    }

    setLoading(`${type}-${format}`)
    try {
      let blob: Blob
      let filename: string

      switch (type) {
        case 'issues':
          blob = await reportsAPI.generateIssuesReport(filters, format)
          filename = `Отчет_по_замечаниям_${dayjs().format('YYYY-MM-DD')}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
          break
        case 'projects':
          blob = await reportsAPI.generateProjectsReport(filters, format)
          filename = `Статистика_по_проектам_${dayjs().format('YYYY-MM-DD')}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
          break
        case 'contractors_kpi':
          blob = await reportsAPI.generateContractorsKPIReport(filters, format)
          filename = `KPI_подрядчиков_${dayjs().format('YYYY-MM-DD')}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
          break
        case 'material_requests':
          blob = await reportsAPI.generateMaterialRequestsReport(filters, format)
          filename = `Отчет_по_просроченным_${dayjs().format('YYYY-MM-DD')}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
          break
      }

      downloadFile(blob, filename)
      message.success('Отчет успешно сформирован и загружен!')
    } catch (error: any) {
      console.error('Ошибка генерации отчета:', error)

      // Более детальная обработка ошибок
      if (error.response?.status === 400) {
        message.error(error.response?.data?.error || 'Неверные параметры запроса')
      } else if (error.response?.status === 404) {
        message.error('Данные для отчета не найдены')
      } else if (error.response?.status === 403) {
        message.error('У вас нет доступа к этому отчету')
      } else {
        message.error('Ошибка при генерации отчета. Пожалуйста, попробуйте позже.')
      }
    } finally {
      setLoading(null)
    }
  }

  // Быстрые периоды
  const quickPeriods = [
    {
      label: 'Сегодня',
      value: () => {
        const today = dayjs()
        setDateRange([today, today])
        setFilters({
          ...filters,
          dateFrom: today.format('YYYY-MM-DD'),
          dateTo: today.format('YYYY-MM-DD')
        })
      }
    },
    {
      label: 'Эта неделя',
      value: () => {
        const start = dayjs().startOf('week')
        const end = dayjs().endOf('week')
        setDateRange([start, end])
        setFilters({
          ...filters,
          dateFrom: start.format('YYYY-MM-DD'),
          dateTo: end.format('YYYY-MM-DD')
        })
      }
    },
    {
      label: 'Этот месяц',
      value: () => {
        const start = dayjs().startOf('month')
        const end = dayjs().endOf('month')
        setDateRange([start, end])
        setFilters({
          ...filters,
          dateFrom: start.format('YYYY-MM-DD'),
          dateTo: end.format('YYYY-MM-DD')
        })
      }
    },
    {
      label: 'Этот год',
      value: () => {
        const start = dayjs().startOf('year')
        const end = dayjs().endOf('year')
        setDateRange([start, end])
        setFilters({
          ...filters,
          dateFrom: start.format('YYYY-MM-DD'),
          dateTo: end.format('YYYY-MM-DD')
        })
      }
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      {/* Заголовок */}
      <div style={{ marginBottom: 32 }}>
        <Title level={2}>
          <BarChartOutlined /> Отчеты и аналитика
        </Title>
        <Paragraph style={{ fontSize: 16, color: '#595959' }}>
          Автоматическая генерация отчетов в форматах PDF и Excel
        </Paragraph>
      </div>

      {/* Фильтры */}
      <Card
        title={
          <Space>
            <FilterOutlined />
            <Text strong>Фильтры и настройки</Text>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Row gutter={[16, 16]}>
          {/* Период */}
          <Col xs={24} md={12} lg={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>
                <CalendarOutlined /> Период
              </Text>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={handleDateRangeChange}
                format="DD.MM.YYYY"
                placeholder={['Дата от', 'Дата до']}
              />
            </Space>
          </Col>

          {/* Проект */}
          <Col xs={24} md={12} lg={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>
                <ProjectOutlined /> Проект
              </Text>
              <Select
                style={{ width: '100%' }}
                placeholder="Выберите проект"
                allowClear
                onChange={handleProjectChange}
                options={projectsData?.results.map((project) => ({
                  label: project.name,
                  value: project.id
                }))}
              />
            </Space>
          </Col>

          {/* Статус */}
          <Col xs={24} md={12} lg={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>📊 Статус</Text>
              <Select
                style={{ width: '100%' }}
                placeholder="Выберите статус"
                allowClear
                onChange={handleStatusChange}
                options={[
                  { label: 'Новое', value: 'NEW' },
                  { label: 'В процессе', value: 'IN_PROGRESS' },
                  { label: 'На проверке', value: 'UNDER_REVIEW' },
                  { label: 'Исполнено', value: 'COMPLETED' },
                  { label: 'Просрочено', value: 'OVERDUE' }
                ]}
              />
            </Space>
          </Col>

          {/* Подрядчик */}
          <Col xs={24} md={12} lg={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>
                <TeamOutlined /> Подрядчик
              </Text>
              <Select
                style={{ width: '100%' }}
                placeholder="Выберите подрядчика"
                allowClear
                onChange={handleContractorChange}
                options={contractors.map((contractor: any) => ({
                  label: contractor.full_name || contractor.email,
                  value: contractor.id
                }))}
              />
            </Space>
          </Col>
        </Row>

        {/* Быстрые периоды */}
        <Divider style={{ margin: '16px 0' }} />
        <Space wrap>
          <Text type="secondary">Быстрый выбор:</Text>
          {quickPeriods.map((period, index) => (
            <Button key={index} size="small" onClick={period.value}>
              {period.label}
            </Button>
          ))}
          <Button
            size="small"
            danger
            onClick={() => {
              setDateRange([null, null])
              setFilters({})
            }}
          >
            Сбросить все
          </Button>
        </Space>
      </Card>

      {/* Карточки отчетов */}
      <Row gutter={[24, 24]}>
        {/* Отчет по замечаниям */}
        <Col xs={24} lg={12}>
          <Card
            hoverable
            style={{
              borderLeft: '4px solid #f5222d',
              height: '100%'
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space>
                  <FileTextOutlined style={{ fontSize: 32, color: '#f5222d' }} />
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      Отчет по замечаниям
                    </Title>
                    <Text type="secondary">PDF с фото До и После</Text>
                  </div>
                </Space>
                <Tag color="red">PDF</Tag>
              </div>

              <Paragraph>
                Полный отчет по всем замечаниям с фотографиями, описанием, статусами и ответственными.
                Идеально для предоставления заказчику или технадзору.
              </Paragraph>

              <Divider style={{ margin: '8px 0' }} />

              <Row gutter={16}>
                <Col span={12}>
                  <Statistic title="Включает" value="Фото" prefix={<CameraOutlined />} valueStyle={{ fontSize: 18 }} />
                </Col>
                <Col span={12}>
                  <Statistic title="Формат" value="PDF" prefix={<FilePdfOutlined />} valueStyle={{ fontSize: 18 }} />
                </Col>
              </Row>

              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button
                  type="primary"
                  icon={<FilePdfOutlined />}
                  loading={loading === 'issues-pdf'}
                  onClick={() => generateReport('issues', 'pdf')}
                >
                  Скачать PDF
                </Button>
                <Button
                  icon={<FileExcelOutlined />}
                  loading={loading === 'issues-excel'}
                  onClick={() => generateReport('issues', 'excel')}
                >
                  Скачать Excel
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>

        {/* Статистика по проектам */}
        <Col xs={24} lg={12}>
          <Card
            hoverable
            style={{
              borderLeft: '4px solid #1890ff',
              height: '100%'
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space>
                  <ProjectOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      Статистика по проектам
                    </Title>
                    <Text type="secondary">Таблицы и графики Excel</Text>
                  </div>
                </Space>
                <Tag color="blue">Excel</Tag>
              </div>

              <Paragraph>
                Детальная статистика по всем проектам: количество замечаний, процент выполнения,
                просроченные задачи, работа подрядчиков.
              </Paragraph>

              <Divider style={{ margin: '8px 0' }} />

              <Row gutter={16}>
                <Col span={12}>
                  <Statistic title="Включает" value="Графики" prefix={<BarChartOutlined />} valueStyle={{ fontSize: 18 }} />
                </Col>
                <Col span={12}>
                  <Statistic title="Формат" value="Excel" prefix={<FileExcelOutlined />} valueStyle={{ fontSize: 18 }} />
                </Col>
              </Row>

              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button
                  type="primary"
                  icon={<FileExcelOutlined />}
                  loading={loading === 'projects-excel'}
                  onClick={() => generateReport('projects', 'excel')}
                >
                  Скачать Excel
                </Button>
                <Button
                  icon={<FilePdfOutlined />}
                  loading={loading === 'projects-pdf'}
                  onClick={() => generateReport('projects', 'pdf')}
                >
                  Скачать PDF
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>

        {/* KPI подрядчиков */}
        <Col xs={24} lg={12}>
          <Card
            hoverable
            style={{
              borderLeft: '4px solid #52c41a',
              height: '100%'
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space>
                  <TeamOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      KPI подрядчиков
                    </Title>
                    <Text type="secondary">Эффективность работы</Text>
                  </div>
                </Space>
                <Tag color="green">PDF/Excel</Tag>
              </div>

              <Paragraph>
                Анализ эффективности работы подрядчиков: процент выполненных в срок,
                среднее время устранения, качество работ, количество возвратов.
              </Paragraph>

              <Divider style={{ margin: '8px 0' }} />

              <Row gutter={16}>
                <Col span={12}>
                  <Statistic title="Метрики" value="KPI" prefix={<BarChartOutlined />} valueStyle={{ fontSize: 18 }} />
                </Col>
                <Col span={12}>
                  <Statistic title="Формат" value="Любой" prefix={<DownloadOutlined />} valueStyle={{ fontSize: 18 }} />
                </Col>
              </Row>

              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button
                  type="primary"
                  icon={<FilePdfOutlined />}
                  loading={loading === 'contractors_kpi-pdf'}
                  onClick={() => generateReport('contractors_kpi', 'pdf')}
                >
                  Скачать PDF
                </Button>
                <Button
                  icon={<FileExcelOutlined />}
                  loading={loading === 'contractors_kpi-excel'}
                  onClick={() => generateReport('contractors_kpi', 'excel')}
                >
                  Скачать Excel
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>

        {/* Отчет по заявкам на материалы */}
        <Col xs={24} lg={12}>
          <Card
            hoverable
            style={{
              borderLeft: '4px solid #fa8c16',
              height: '100%'
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space>
                  <ShoppingCartOutlined style={{ fontSize: 32, color: '#fa8c16' }} />
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      Отчет по заявкам
                    </Title>
                    <Text type="secondary">Контроль закупок</Text>
                  </div>
                </Space>
                <Tag color="orange">Excel</Tag>
              </div>

              <Paragraph>
                Полный отчет по заявкам на материалы: статусы согласования, суммы,
                сроки выполнения, ответственные на каждом этапе.
              </Paragraph>

              <Divider style={{ margin: '8px 0' }} />

              <Row gutter={16}>
                <Col span={12}>
                  <Statistic title="Этапы" value="Все" prefix={<ShoppingCartOutlined />} valueStyle={{ fontSize: 18 }} />
                </Col>
                <Col span={12}>
                  <Statistic title="Формат" value="Excel" prefix={<FileExcelOutlined />} valueStyle={{ fontSize: 18 }} />
                </Col>
              </Row>

              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button
                  type="primary"
                  icon={<FileExcelOutlined />}
                  loading={loading === 'material_requests-excel'}
                  onClick={() => generateReport('material_requests', 'excel')}
                >
                  Скачать Excel
                </Button>
                <Button
                  icon={<FilePdfOutlined />}
                  loading={loading === 'material_requests-pdf'}
                  onClick={() => generateReport('material_requests', 'pdf')}
                >
                  Скачать PDF
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Reports
