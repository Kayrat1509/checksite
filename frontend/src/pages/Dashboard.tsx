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
    <div style={{ padding: '24px' }}>
      <Title level={2}>Дашборд</Title>

      {/* Всего замечаний */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            loading={isLoading}
            hoverable
            onClick={() => navigateToIssues()}
            style={{ cursor: 'pointer', border: '2px solid #d9d9d9' }}
          >
            <Statistic
              title="Всего замечаний"
              value={stats?.total || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff', fontSize: '32px' }}
            />
          </Card>
        </Col>
      </Row>

      <Divider orientation="left" style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '32px', marginBottom: '24px' }}>
        Статус
      </Divider>

      {/* Статусы */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            loading={isLoading}
            hoverable
            onClick={() => navigateToIssues('NEW')}
            style={{ cursor: 'pointer', border: '2px solid #d9d9d9' }}
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
            style={{ cursor: 'pointer', border: '2px solid #d9d9d9' }}
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
            style={{ cursor: 'pointer', border: '2px solid #d9d9d9' }}
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
            style={{ cursor: 'pointer', border: '2px solid #d9d9d9' }}
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

      <Divider orientation="left" style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '32px', marginBottom: '24px' }}>
        На проверке
      </Divider>

      {/* На проверке */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card
            loading={isLoading}
            hoverable
            onClick={() => navigateToIssues('PENDING_REVIEW')}
            style={{ cursor: 'pointer', border: '2px solid #d9d9d9' }}
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

      <Divider orientation="left" style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '32px', marginBottom: '24px' }}>
        Приоритет
      </Divider>

      {/* Приоритеты */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card
            loading={isLoading}
            hoverable
            onClick={() => navigateToIssues(undefined, 'CRITICAL')}
            style={{ cursor: 'pointer', border: '2px solid #d9d9d9' }}
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
            style={{ cursor: 'pointer', border: '2px solid #d9d9d9' }}
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
