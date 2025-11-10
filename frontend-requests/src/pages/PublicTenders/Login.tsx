import { useState } from 'react'
import { Form, Input, Button, Card, Typography, Row, Col, message } from 'antd'
import { MailOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { publicTendersAPI, LoginData } from '../../api/publicTenders'
import './PublicTenders.css'

const { Title, Paragraph } = Typography

const Login = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Обработка входа
  const handleSubmit = async (values: LoginData) => {
    setLoading(true)
    try {
      const response = await publicTendersAPI.login(values)
      message.success(`Добро пожаловать, ${response.company_name}!`)

      // Переходим на страницу списка тендеров
      navigate('/public-tenders/list')
    } catch (error: any) {
      console.error('Login error:', error)

      if (error.response?.status === 404) {
        message.error('Пользователь с таким email не найден')
      } else if (error.response?.status === 403) {
        const errorMsg = error.response?.data?.error || 'Доступ запрещен'

        if (errorMsg.includes('ожидает модерации')) {
          message.warning('Ваша заявка ожидает модерации. Пожалуйста, подождите.')
          // Переходим на страницу статуса
          navigate('/public-tenders/status')
        } else if (errorMsg.includes('отклонена')) {
          message.error('Ваша заявка была отклонена администратором.')
        } else {
          message.error(errorMsg)
        }
      } else if (error.response?.status === 401) {
        message.error('Неверный пароль')
      } else if (error.response?.data?.error) {
        message.error(error.response.data.error)
      } else {
        message.error('Ошибка при входе. Попробуйте позже.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="public-tenders-page">
      <div className="public-tenders-container">
        <Row justify="center" align="middle" style={{ minHeight: '100vh', padding: '24px' }}>
          <Col xs={24} sm={18} md={14} lg={10} xl={8}>
            <Card className="login-card">
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <Title level={2}>Вход в систему тендеров</Title>
                <Paragraph type="secondary">
                  Войдите, используя свой email и пароль
                </Paragraph>
              </div>

              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                autoComplete="off"
                requiredMark="optional"
              >
                {/* Email */}
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: 'Введите email' },
                    { type: 'email', message: 'Некорректный email' }
                  ]}
                >
                  <Input
                    prefix={<MailOutlined />}
                    placeholder="company@example.com"
                    size="large"
                    autoComplete="email"
                  />
                </Form.Item>

                {/* Пароль */}
                <Form.Item
                  name="password"
                  label="Пароль"
                  rules={[
                    { required: true, message: 'Введите пароль' }
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Введите пароль"
                    size="large"
                    autoComplete="current-password"
                  />
                </Form.Item>

                {/* Кнопка входа */}
                <Form.Item style={{ marginBottom: 16 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={loading}
                    block
                  >
                    Войти
                  </Button>
                </Form.Item>

                {/* Ссылки */}
                <div style={{ textAlign: 'center' }}>
                  <Paragraph type="secondary">
                    Нет доступа? <Link to="/public-tenders/register">Зарегистрироваться</Link>
                  </Paragraph>
                  <Paragraph type="secondary">
                    <Link to="/public-tenders/status">Проверить статус заявки</Link>
                  </Paragraph>
                </div>
              </Form>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default Login
