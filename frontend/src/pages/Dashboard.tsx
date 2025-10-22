import { useState } from 'react'
import { Row, Col, Card, Statistic, Typography, Divider, Select, Space } from 'antd'
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ProjectOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { issuesAPI } from '../api/issues'
import { projectsAPI } from '../api/projects'
import './Dashboard.css'

const { Title } = Typography

const Dashboard = () => {
  const navigate = useNavigate()
  const [selectedProject, setSelectedProject] = useState<number | undefined>(undefined)

  // Загрузка списка проектов
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.getProjects(),
  })

  // Загрузка статистики (будет фильтроваться на клиенте по выбранному проекту)
  const { data: allIssues, isLoading } = useQuery({
    queryKey: ['issues'],
    queryFn: () => issuesAPI.getIssues(),
  })

  // Фильтрация замечаний по выбранному проекту
  const filteredIssues = selectedProject
    ? (allIssues?.results || []).filter((issue: any) => issue.project === selectedProject)
    : (allIssues?.results || [])


  // Вычисление статистики на основе отфильтрованных данных
  const calculateStats = () => {
    const total = filteredIssues.length
    let new_count = 0
    let in_progress_count = 0
    let pending_review_count = 0
    let completed_count = 0
    let overdue_count = 0
    let critical_count = 0
    let high_count = 0

    filteredIssues.forEach((issue: any) => {
      // Подсчет по статусам
      if (issue.status === 'NEW') new_count++
      else if (issue.status === 'IN_PROGRESS') in_progress_count++
      else if (issue.status === 'PENDING_REVIEW') pending_review_count++
      else if (issue.status === 'COMPLETED') completed_count++
      else if (issue.status === 'OVERDUE') overdue_count++

      // Подсчет по приоритетам
      if (issue.priority === 'CRITICAL') critical_count++
      else if (issue.priority === 'HIGH') high_count++
    })

    return {
      total,
      new: new_count,
      in_progress: in_progress_count,
      pending_review: pending_review_count,
      completed: completed_count,
      overdue: overdue_count,
      by_priority: {
        critical: critical_count,
        high: high_count,
      }
    }
  }

  const stats = calculateStats()

  // Функция для навигации на страницу замечаний с фильтрами
  const navigateToIssues = (status?: string, priority?: string) => {
    const params = new URLSearchParams()
    if (selectedProject) params.set('project', selectedProject.toString())
    if (status) params.set('status', status)
    if (priority) params.set('priority', priority)
    const queryString = params.toString()
    navigate(`/dashboard/issues${queryString ? `?${queryString}` : ''}`)
  }

  // Получение названия выбранного проекта
  const selectedProjectName = selectedProject
    ? projectsData?.results?.find((p: any) => p.id === selectedProject)?.name
    : null

  return (
    <div className="dashboard-container">
      <div style={{ marginBottom: 24 }}>
        <Title level={2} className="dashboard-title">Дашборд</Title>

        {/* Фильтр по проектам */}
        <div className="dashboard-filter-container">
          <Space className="dashboard-filter-space" wrap>
            <ProjectOutlined style={{ fontSize: 18, color: '#1890ff' }} />
            <Select
              className="dashboard-project-select"
              placeholder="Все объекты"
              allowClear
              value={selectedProject}
              onChange={(value: number | undefined) => setSelectedProject(value)}
              options={projectsData?.results?.map((project: any) => ({
                label: project.name,
                value: project.id
              })) || []}
            />
          </Space>
          {selectedProjectName && (
            <div className="dashboard-selected-project">
              Объект: <span style={{ color: '#1890ff', fontWeight: 600 }}>{selectedProjectName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Всего замечаний */}
      <Row gutter={[16, 16]} className="dashboard-row">
        <Col span={24}>
          <Card
            loading={isLoading}
            hoverable
            onClick={() => navigateToIssues()}
            className="dashboard-stat-card"
          >
            <Statistic
              title="Всего замечаний"
              value={stats?.total || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Divider orientation="left" className="dashboard-divider">
        Статус
      </Divider>

      {/* Статусы */}
      <Row gutter={[16, 16]} className="dashboard-row">
        <Col xs={24} sm={12} lg={6}>
          <Card
            loading={isLoading}
            hoverable
            onClick={() => navigateToIssues('NEW')}
            className="dashboard-stat-card"
          >
            <Statistic
              title="Новые"
              value={stats?.new || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            loading={isLoading}
            hoverable
            onClick={() => navigateToIssues('IN_PROGRESS')}
            className="dashboard-stat-card"
          >
            <Statistic
              title="В процессе"
              value={stats?.in_progress || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            loading={isLoading}
            hoverable
            onClick={() => navigateToIssues('COMPLETED')}
            className="dashboard-stat-card"
          >
            <Statistic
              title="Выполнено"
              value={stats?.completed || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            loading={isLoading}
            hoverable
            onClick={() => navigateToIssues('OVERDUE')}
            className="dashboard-stat-card"
          >
            <Statistic
              title="Просрочено"
              value={stats?.overdue || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Divider orientation="left" className="dashboard-divider">
        На проверке
      </Divider>

      {/* На проверке */}
      <Row gutter={[16, 16]} className="dashboard-row">
        <Col xs={24} sm={12} lg={8}>
          <Card
            loading={isLoading}
            hoverable
            onClick={() => navigateToIssues('PENDING_REVIEW')}
            className="dashboard-stat-card"
          >
            <Statistic
              title="На проверке"
              value={stats?.pending_review || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Divider orientation="left" className="dashboard-divider">
        Приоритет
      </Divider>

      {/* Приоритеты */}
      <Row gutter={[16, 16]} className="dashboard-row">
        <Col xs={24} sm={12} lg={8}>
          <Card
            loading={isLoading}
            hoverable
            onClick={() => navigateToIssues(undefined, 'CRITICAL')}
            className="dashboard-stat-card"
          >
            <Statistic
              title="Критичные"
              value={stats?.by_priority?.critical || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card
            loading={isLoading}
            hoverable
            onClick={() => navigateToIssues(undefined, 'HIGH')}
            className="dashboard-stat-card"
          >
            <Statistic
              title="Важные"
              value={stats?.by_priority?.high || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
