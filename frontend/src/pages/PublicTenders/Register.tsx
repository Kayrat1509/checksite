import { useState } from 'react'
import { Form, Input, Button, Card, Typography, Row, Col, message } from 'antd'
import { UserOutlined, MailOutlined, PhoneOutlined, EnvironmentOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { publicTendersAPI, RegistrationData } from '../../api/publicTenders'
import './PublicTenders.css'

const { Title, Paragraph } = Typography

const Register = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Обработка отправки формы регистрации
  const handleSubmit = async (values: RegistrationData) => {
    setLoading(true)
    try {
      const response = await publicTendersAPI.register(values)
      message.success('Заявка успешно отправлена! Ожидайте одобрения администратором.')

      // Переходим на страницу статуса заявки
      navigate('/public-tenders/status')
    } catch (error: any) {
      console.error('Registration error:', error)

      if (error.response?.data) {
        // Показываем ошибки валидации с бэкенда
        const errors = error.response.data
        Object.keys(errors).forEach(field => {
          const errorMsg = Array.isArray(errors[field])
            ? errors[field].join(', ')
            : errors[field]
          message.error(`${field}: ${errorMsg}`)
        })
      } else {
        message.error('Ошибка при отправке заявки. Попробуйте позже.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="public-tenders-page">
      <div className="public-tenders-container">
        <Row justify="center" align="middle" style={{ minHeight: '100vh', padding: '24px' }}>
          <Col xs={24} sm={20} md={16} lg={12} xl={10}>
            <Card className="register-card">
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <Title level={2}>Регистрация для доступа к тендерам</Title>
                <Paragraph type="secondary">
                  Заполните форму для получения доступа к базе тендеров.
                  После модерации администратором вы получите возможность просматривать актуальные тендеры.
                </Paragraph>
              </div>

              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                autoComplete="off"
                requiredMark="optional"
              >
                {/* Название компании */}
                <Form.Item
                  name="company_name"
                  label="Название компании"
                  rules={[
                    { required: true, message: 'Введите название компании' },
                    { max: 300, message: 'Максимум 300 символов' }
                  ]}
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder="ТОО «Ваша компания»"
                    size="large"
                  />
                </Form.Item>

                {/* Контактное лицо */}
                <Form.Item
                  name="contact_person"
                  label="Контактное лицо (ФИО)"
                  rules={[
                    { required: true, message: 'Введите ФИО контактного лица' },
                    { max: 200, message: 'Максимум 200 символов' }
                  ]}
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder="Иванов Иван Иванович"
                    size="large"
                  />
                </Form.Item>

                {/* Email и Телефон */}
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
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
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="phone"
                      label="Телефон"
                      rules={[
                        { required: true, message: 'Введите телефон' },
                        { max: 50, message: 'Максимум 50 символов' }
                      ]}
                    >
                      <Input
                        prefix={<PhoneOutlined />}
                        placeholder="+7 (700) 123-45-67"
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Город */}
                <Form.Item
                  name="city"
                  label="Город"
                  rules={[
                    { required: true, message: 'Введите город' },
                    { max: 100, message: 'Максимум 100 символов' }
                  ]}
                >
                  <Input
                    prefix={<EnvironmentOutlined />}
                    placeholder="Алматы"
                    size="large"
                  />
                </Form.Item>

                {/* Пароль и подтверждение */}
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="password"
                      label="Пароль"
                      rules={[
                        { required: true, message: 'Введите пароль' },
                        { min: 6, message: 'Минимум 6 символов' }
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="Минимум 6 символов"
                        size="large"
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="password_confirm"
                      label="Подтвердите пароль"
                      dependencies={['password']}
                      rules={[
                        { required: true, message: 'Подтвердите пароль' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('password') === value) {
                              return Promise.resolve()
                            }
                            return Promise.reject(new Error('Пароли не совпадают'))
                          },
                        }),
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="Повторите пароль"
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Комментарий (необязательно) */}
                <Form.Item
                  name="comment"
                  label="Комментарий (необязательно)"
                >
                  <Input.TextArea
                    placeholder="Дополнительная информация о компании или причина запроса доступа"
                    rows={3}
                  />
                </Form.Item>

                {/* Кнопка отправки */}
                <Form.Item style={{ marginBottom: 16 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={loading}
                    block
                  >
                    Отправить заявку
                  </Button>
                </Form.Item>

                {/* Ссылка на вход */}
                <div style={{ textAlign: 'center' }}>
                  <Paragraph type="secondary">
                    Уже есть доступ? <Link to="/public-tenders/login">Войти</Link>
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

export default Register
