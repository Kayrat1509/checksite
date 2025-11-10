import { useEffect, useState } from 'react'
import { Card, Typography, Row, Col, Spin, Result, Button, Tag } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { publicTendersAPI, AccessStatus } from '../../api/publicTenders'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import './PublicTenders.css'

const { Title, Paragraph, Text } = Typography

dayjs.locale('ru')

const Status = () => {
  const [status, setStatus] = useState<AccessStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  // FIXED infinite reload: Функция для обновления статуса
  const refreshStatus = async () => {
    setLoading(true)
    try {
      const data = await publicTendersAPI.getStatus()
      setStatus(data)
      setError(null)
    } catch (err: any) {
      console.error('Status fetch error:', err)
      if (err.message.includes('Access ID not found')) {
        setError('ID доступа не найден. Пожалуйста, зарегистрируйтесь или войдите.')
      } else {
        setError('Ошибка при загрузке статуса заявки')
      }
    } finally {
      setLoading(false)
    }
  }

  // Загрузка статуса заявки при монтировании
  useEffect(() => {
    refreshStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Отображение статуса
  const renderStatus = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <Paragraph style={{ marginTop: 16 }}>Загрузка статуса...</Paragraph>
        </div>
      )
    }

    if (error || !status) {
      return (
        <Result
          status="warning"
          title="Статус не найден"
          subTitle={error || 'Не удалось загрузить информацию о заявке'}
          extra={[
            <Button type="primary" key="register" onClick={() => navigate('/public-tenders/register')}>
              Зарегистрироваться
            </Button>,
            <Button key="login" onClick={() => navigate('/public-tenders/login')}>
              Войти
            </Button>
          ]}
        />
      )
    }

    // Статус: PENDING (Ожидает модерации)
    if (status.status === 'PENDING') {
      return (
        <Result
          icon={<ClockCircleOutlined style={{ color: '#faad14' }} />}
          title="Заявка на модерации"
          subTitle={
            <div>
              <Paragraph>
                Ваша заявка отправлена и ожидает проверки администратором.
              </Paragraph>
              <Paragraph type="secondary">
                Дата подачи: {dayjs(status.created_at).format('DD MMMM YYYY, HH:mm')}
              </Paragraph>
            </div>
          }
          extra={[
            <Button key="refresh" onClick={refreshStatus} loading={loading}>
              Обновить статус
            </Button>
          ]}
        >
          <div style={{ textAlign: 'left', maxWidth: 500, margin: '0 auto' }}>
            <Paragraph>
              <Text strong>Компания:</Text> {status.company_name}
            </Paragraph>
            <Paragraph>
              <Text strong>Email:</Text> {status.email}
            </Paragraph>
          </div>
        </Result>
      )
    }

    // Статус: APPROVED (Одобрен)
    if (status.status === 'APPROVED') {
      return (
        <Result
          status="success"
          icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          title="Заявка одобрена!"
          subTitle={
            <div>
              <Paragraph>
                Поздравляем! Ваша заявка одобрена. Теперь вы можете просматривать базу тендеров.
              </Paragraph>
              {status.approved_at && (
                <Paragraph type="secondary">
                  Дата одобрения: {dayjs(status.approved_at).format('DD MMMM YYYY, HH:mm')}
                </Paragraph>
              )}
            </div>
          }
          extra={[
            <Button type="primary" key="tenders" onClick={() => navigate('/public-tenders/list')}>
              Перейти к тендерам
            </Button>
          ]}
        >
          <div style={{ textAlign: 'left', maxWidth: 500, margin: '0 auto' }}>
            <Paragraph>
              <Text strong>Компания:</Text> {status.company_name}
            </Paragraph>
            <Paragraph>
              <Text strong>Email:</Text> {status.email}
            </Paragraph>
          </div>
        </Result>
      )
    }

    // Статус: REJECTED (Отклонен)
    if (status.status === 'REJECTED') {
      return (
        <Result
          status="error"
          icon={<CloseCircleOutlined style={{ color: '#f5222d' }} />}
          title="Заявка отклонена"
          subTitle={
            <div>
              <Paragraph>
                К сожалению, ваша заявка была отклонена администратором.
              </Paragraph>
              {status.rejection_reason && (
                <div style={{ textAlign: 'left', maxWidth: 500, margin: '16px auto' }}>
                  <Text strong>Причина отклонения:</Text>
                  <Paragraph style={{ marginTop: 8, padding: 12, background: '#fff2f0', borderRadius: 4 }}>
                    {status.rejection_reason}
                  </Paragraph>
                </div>
              )}
            </div>
          }
          extra={[
            <Button type="primary" key="register" onClick={() => navigate('/public-tenders/register')}>
              Подать новую заявку
            </Button>
          ]}
        >
          <div style={{ textAlign: 'left', maxWidth: 500, margin: '0 auto' }}>
            <Paragraph>
              <Text strong>Компания:</Text> {status.company_name}
            </Paragraph>
            <Paragraph>
              <Text strong>Email:</Text> {status.email}
            </Paragraph>
          </div>
        </Result>
      )
    }

    return null
  }

  return (
    <div className="public-tenders-page">
      <div className="public-tenders-container">
        <Row justify="center" align="middle" style={{ minHeight: '100vh', padding: '24px' }}>
          <Col xs={24} sm={22} md={18} lg={16} xl={14}>
            <Card className="status-card">
              {renderStatus()}
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default Status
