import { Row, Col, Card, Statistic, Typography, Divider } from 'antd'
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { issuesAPI } from '../api/issues'
import './Dashboard.css'

const { Title } = Typography

const Dashboard = () => {
  const navigate = useNavigate()
  const { data: stats, isLoading } = useQuery({
    queryKey: ['issueStats'],
    queryFn: () => issuesAPI.getStatistics(),
  })

  // Функция для навигации на страницу замечаний с фильтрами
  const navigateToIssues = (status?: string, priority?: string) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (priority) params.set('priority', priority)
    const queryString = params.toString()
    navigate(`/dashboard/issues${queryString ? `?${queryString}` : ''}`)
  }

  return (
    <div className="dashboard-container">
      <Title level={2} className="dashboard-title">Дашборд</Title>

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
