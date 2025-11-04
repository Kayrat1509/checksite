import { Button, Layout, Typography, Row, Col, Card, Form, Input, message } from 'antd'
import {
  CheckCircleOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  SendOutlined,
  HomeOutlined,
  RocketOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import './ContactPage.css'

const { Header, Content, Footer } = Layout
const { Title, Paragraph, Text } = Typography
const { TextArea } = Input

const ContactPage = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      // Отправляем данные на бэкенд
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'}/api/contact-form/submit/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          phone: values.phone,
          company: values.company || '',
          message: values.message,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        message.success(data.message || 'Спасибо за обращение! Мы свяжемся с вами в ближайшее время.')
        form.resetFields()
      } else {
        message.error(data.error || 'Произошла ошибка. Пожалуйста, попробуйте позже.')
      }
    } catch (error) {
      console.error('Ошибка при отправке формы:', error)
      message.error('Произошла ошибка. Пожалуйста, попробуйте позже.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout className="contact-layout">
      {/* Хедер */}
      <Header className="contact-header">
        <div className="contact-header-content">
          <div className="contact-logo" onClick={() => navigate('/')}>
            <CheckCircleOutlined className="logo-icon" />
            <span className="contact-logo-text">Check Site</span>
          </div>

          <div className="contact-header-buttons">
            <Button
              type="text"
              size="large"
              icon={<HomeOutlined />}
              onClick={() => navigate('/')}
            >
              На главную
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<RocketOutlined />}
              onClick={() => navigate('/register')}
              className="register-btn"
            >
              Начать бесплатно
            </Button>
          </div>
        </div>
      </Header>

      <Content className="contact-content">
        {/* Hero секция */}
        <div className="contact-hero">
          <div className="contact-hero-content">
            <Title level={1} className="contact-hero-title">
              Свяжитесь с нами
            </Title>
            <Paragraph className="contact-hero-description">
              Остались вопросы о системе Check Site? Хотите узнать больше о возможностях
              или обсудить индивидуальные условия? Мы всегда на связи!
            </Paragraph>
          </div>
        </div>

        {/* Основной контент */}
        <div className="contact-main-section">
          <Row gutter={[48, 48]}>
            {/* Форма обратной связи */}
            <Col xs={24} lg={12}>
              <Card className="contact-form-card">
                <Title level={3} style={{ marginBottom: 24 }}>
                  Напишите нам
                </Title>
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSubmit}
                  size="large"
                >
                  <Form.Item
                    label="Ваше имя"
                    name="name"
                    rules={[{ required: true, message: 'Пожалуйста, укажите ваше имя' }]}
                  >
                    <Input placeholder="Иван Иванов" />
                  </Form.Item>

                  <Form.Item
                    label="Email"
                    name="email"
                    rules={[
                      { required: true, message: 'Пожалуйста, укажите email' },
                      { type: 'email', message: 'Пожалуйста, укажите корректный email' }
                    ]}
                  >
                    <Input placeholder="ivan@company.kz" prefix={<MailOutlined />} />
                  </Form.Item>

                  <Form.Item
                    label="Телефон"
                    name="phone"
                    rules={[{ required: true, message: 'Пожалуйста, укажите телефон' }]}
                  >
                    <Input placeholder="+7 (777) 123-45-67" prefix={<PhoneOutlined />} />
                  </Form.Item>

                  <Form.Item
                    label="Компания"
                    name="company"
                  >
                    <Input placeholder="Название вашей компании" />
                  </Form.Item>

                  <Form.Item
                    label="Ваше сообщение"
                    name="message"
                    rules={[{ required: true, message: 'Пожалуйста, напишите ваше сообщение' }]}
                  >
                    <TextArea
                      rows={5}
                      placeholder="Расскажите, чем мы можем помочь..."
                      showCount
                      maxLength={1000}
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      block
                      icon={<SendOutlined />}
                      loading={loading}
                    >
                      Отправить сообщение
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            </Col>

            {/* Контактная информация */}
            <Col xs={24} lg={12}>
              <div className="contact-info-section">
                <Title level={3} style={{ marginBottom: 32 }}>
                  Наши контакты
                </Title>

                <Card className="contact-info-card">
                  <div className="contact-info-item">
                    <div className="contact-info-icon">
                      <MailOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                    </div>
                    <div className="contact-info-text">
                      <Text strong style={{ fontSize: 16 }}>Email</Text>
                      <Paragraph style={{ marginBottom: 0, fontSize: 18, color: '#1890ff' }}>
                        <a href="mailto:stroyka.asia@gmail.com">stroyka.asia@gmail.com</a>
                      </Paragraph>
                    </div>
                  </div>
                </Card>

                <Card className="contact-info-card">
                  <div className="contact-info-item">
                    <div className="contact-info-icon">
                      <PhoneOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                    </div>
                    <div className="contact-info-text">
                      <Text strong style={{ fontSize: 16 }}>Телефон</Text>
                      <Paragraph style={{ marginBottom: 0, fontSize: 18, color: '#52c41a' }}>
                        <a href="tel:+77776323616">+7 (777) 632-36-16</a>
                      </Paragraph>
                      <Text type="secondary">Звоните с 9:00 до 18:00 (GMT+5)</Text>
                    </div>
                  </div>
                </Card>

                <Card className="contact-info-card">
                  <div className="contact-info-item">
                    <div className="contact-info-icon">
                      <EnvironmentOutlined style={{ fontSize: 32, color: '#722ed1' }} />
                    </div>
                    <div className="contact-info-text">
                      <Text strong style={{ fontSize: 16 }}>Адрес</Text>
                      <Paragraph style={{ marginBottom: 0, fontSize: 16 }}>
                        Республика Казахстан<br />
                        г. Астана
                      </Paragraph>
                    </div>
                  </div>
                </Card>

                {/* Дополнительная информация */}
                <Card
                  className="contact-hours-card"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    marginTop: 24
                  }}
                >
                  <div style={{ textAlign: 'center', color: '#fff' }}>
                    <Title level={4} style={{ color: '#fff', marginBottom: 16 }}>
                      Время работы
                    </Title>
                    <Paragraph style={{ color: '#fff', fontSize: 16, marginBottom: 8 }}>
                      Понедельник - Пятница: 9:00 - 18:00
                    </Paragraph>
                    <Paragraph style={{ color: '#fff', fontSize: 16, marginBottom: 8 }}>
                      Суббота: 10:00 - 15:00
                    </Paragraph>
                    <Paragraph style={{ color: '#fff', fontSize: 16, marginBottom: 0 }}>
                      Воскресенье: выходной
                    </Paragraph>
                  </div>
                </Card>
              </div>
            </Col>
          </Row>
        </div>

        {/* FAQ секция */}
        <div className="contact-faq-section">
          <Title level={2} style={{ textAlign: 'center', marginBottom: 16 }}>
            Часто задаваемые вопросы
          </Title>
          <Paragraph style={{ textAlign: 'center', fontSize: 16, marginBottom: 48, color: '#666' }}>
            Возможно, ответ на ваш вопрос уже есть здесь
          </Paragraph>

          <Row gutter={[32, 32]}>
            <Col xs={24} md={12}>
              <Card className="faq-card">
                <Title level={4}>Как быстро вы отвечаете?</Title>
                <Paragraph>
                  Мы стараемся отвечать на все запросы в течение 2-4 часов в рабочее время.
                  В выходные дни ответ может занять до 24 часов.
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card className="faq-card">
                <Title level={4}>Есть ли техническая поддержка?</Title>
                <Paragraph>
                  Да! Для всех пользователей доступна техподдержка по email.
                  Для клиентов на годовом тарифе — приоритетная поддержка и помощь в настройке.
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card className="faq-card">
                <Title level={4}>Можно ли заказать демонстрацию?</Title>
                <Paragraph>
                  Конечно! Свяжитесь с нами, и мы проведём персональную онлайн-демонстрацию
                  всех возможностей системы для вашей компании.
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card className="faq-card">
                <Title level={4}>Помогаете ли с внедрением?</Title>
                <Paragraph>
                  Да, мы предоставляем полную поддержку при внедрении: помощь в настройке,
                  обучение команды, консультации по оптимизации процессов.
                </Paragraph>
              </Card>
            </Col>
          </Row>
        </div>

        {/* CTA секция */}
        <div className="contact-cta-section">
          <div className="contact-cta-content">
            <Title level={2} className="contact-cta-title">
              Готовы начать работу?
            </Title>
            <Paragraph className="contact-cta-description">
              Попробуйте Check Site бесплатно в течение 60 дней.
              Полный доступ ко всем функциям без ввода банковской карты.
            </Paragraph>
            <Button
              type="primary"
              size="large"
              icon={<RocketOutlined />}
              onClick={() => navigate('/register')}
              style={{ marginTop: 16 }}
            >
              Начать бесплатный период
            </Button>
          </div>
        </div>
      </Content>

      {/* Футер */}
      <Footer className="contact-footer">
        <Row justify="space-between" align="middle">
          <Col xs={24} md={12} style={{ textAlign: 'center', marginBottom: 16 }}>
            <div className="footer-logo">
              <CheckCircleOutlined style={{ fontSize: 32, color: '#1890ff' }} />
              <Text strong style={{ fontSize: 20, marginLeft: 12 }}>Check Site</Text>
            </div>
            <Paragraph style={{ margin: '8px 0 0', color: '#666' }}>
              Система контроля качества строительных работ
            </Paragraph>
          </Col>
          <Col xs={24} md={12} style={{ textAlign: 'center' }}>
            <Text style={{ color: '#999' }}>
              © 2025 Check Site. Все права защищены.
            </Text>
          </Col>
        </Row>
      </Footer>
    </Layout>
  )
}

export default ContactPage
