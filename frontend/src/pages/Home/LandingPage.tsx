import { Button, Layout, Typography, Row, Col, Card, Space, Steps, Statistic, Timeline } from 'antd'
import {
  CheckCircleOutlined,
  CameraOutlined,
  ToolOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  BellOutlined,
  BarChartOutlined,
  LockOutlined,
  FileTextOutlined,
  RocketOutlined,
  EyeOutlined,
  MobileOutlined,
  CloudOutlined,
  TeamOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import './LandingPage.css'

const { Header, Content, Footer } = Layout
const { Title, Paragraph, Text } = Typography

const LandingPage = () => {
  const navigate = useNavigate()

  // Основные преимущества
  const advantages = [
    {
      icon: <ThunderboltOutlined />,
      title: 'Быстрая фиксация',
      description: 'Замечания создаются за 1 минуту, с фото и сроком устранения'
    },
    {
      icon: <BellOutlined />,
      title: 'Telegram-уведомления',
      description: 'Подрядчики мгновенно получают уведомления о новых задачах'
    },
    {
      icon: <BarChartOutlined />,
      title: 'Прозрачный контроль',
      description: 'Видно, кто и когда устранил замечание, с фото до/после'
    },
    {
      icon: <LockOutlined />,
      title: 'Безопасность и надёжность',
      description: 'HTTPS, резервные копии, логирование всех действий'
    },
    {
      icon: <FileTextOutlined />,
      title: 'Отчёты в один клик',
      description: 'Генерация актов и аналитики по объектам и подрядчикам'
    },
    {
      icon: <CameraOutlined />,
      title: 'Фотофиксация',
      description: 'Вся история в одном месте: фото, комментарии, статус'
    }
  ]

  // Dashboard виджеты
  const dashboardFeatures = [
    {
      title: 'Для Руководства',
      items: [
        'Общее количество замечаний по всем объектам',
        'График динамики — новые и закрытые замечания',
        'ТОП-5 подрядчиков по просрочкам',
        'Прогресс по объектам в процентах'
      ]
    },
    {
      title: 'Для ИТР и Контроля',
      items: [
        'Мои активные замечания',
        'Требуют проверки (Осмотр)',
        'Просроченные замечания',
        'Быстрое создание нового замечания'
      ]
    },
    {
      title: 'Для Подрядчиков',
      items: [
        'Назначенные замечания',
        'Срочные (истекают сегодня)',
        'На доработке',
        'Выполненные за неделю'
      ]
    }
  ]

  return (
    <Layout className="landing-layout">
      {/* Шапка */}
      <Header className="landing-header">
        <div className="landing-header-content">
          <div className="landing-logo">
            <CheckCircleOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
            <span className="landing-logo-text">Check Site</span>
          </div>

          <Space size="middle">
            <Button
              type="default"
              size="large"
              onClick={() => navigate('/login')}
            >
              Войти
            </Button>
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/register')}
            >
              Регистрация
            </Button>
          </Space>
        </div>
      </Header>

      <Content className="landing-content">
        {/* Героическая секция */}
        <div className="hero-section">
          <Row justify="center" align="middle">
            <Col xs={24} md={20} lg={16} style={{ textAlign: 'center' }}>
              <Title level={1} className="hero-title">
                Check Site — система контроля качества строительных работ
              </Title>
              <Paragraph className="hero-description">
                Простое и эффективное решение для строительных компаний: фиксируйте замечания,
                контролируйте устранение и отслеживайте качество работ в режиме реального времени
              </Paragraph>
            </Col>
          </Row>
        </div>

        {/* Три шага к порядку */}
        <div className="steps-section">
          <Title level={2} style={{ textAlign: 'center', marginBottom: '48px' }}>
            Три шага к порядку на объекте
          </Title>
          <Row justify="center">
            <Col xs={24} md={20} lg={16}>
              <Steps
                direction="vertical"
                current={-1}
                items={[
                  {
                    title: 'Сделайте фото дефекта («До»)',
                    description: 'Зафиксируйте проблему с описанием, назначьте подрядчика и срок',
                    icon: <CameraOutlined />
                  },
                  {
                    title: 'Исправьте и подтвердите выполнение («После»)',
                    description: 'Подрядчик устраняет дефект и загружает фото выполненных работ',
                    icon: <ToolOutlined />
                  },
                  {
                    title: 'Проверьте и закройте замечание («Осмотр»)',
                    description: 'Инженер проверяет качество и принимает или возвращает на доработку',
                    icon: <SafetyCertificateOutlined />
                  }
                ]}
              />
            </Col>
          </Row>
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
              Максимум контроля — минимум времени на обучение
            </Text>
          </div>
        </div>

        {/* Основные преимущества */}
        <div className="advantages-section">
          <Title level={2} style={{ textAlign: 'center', marginBottom: '48px' }}>
            Основные преимущества
          </Title>
          <Row gutter={[24, 24]}>
            {advantages.map((advantage, index) => (
              <Col xs={24} sm={12} lg={8} key={index}>
                <Card className="advantage-card" hoverable>
                  <div className="advantage-icon">
                    {advantage.icon}
                  </div>
                  <Title level={4}>{advantage.title}</Title>
                  <Paragraph style={{ color: '#666', marginBottom: 0 }}>
                    {advantage.description}
                  </Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {/* Dashboard виджеты */}
        <div className="dashboard-section">
          <Title level={2} style={{ textAlign: 'center', marginBottom: '48px' }}>
            Виджеты и статистика (Dashboard)
          </Title>
          <Row gutter={[24, 24]}>
            {dashboardFeatures.map((feature, index) => (
              <Col xs={24} md={8} key={index}>
                <Card
                  title={feature.title}
                  className="dashboard-card"
                  headStyle={{ background: '#1890ff', color: '#fff' }}
                >
                  <ul className="dashboard-list">
                    {feature.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {/* Как это работает */}
        <div className="workflow-section">
          <Title level={2} style={{ textAlign: 'center', marginBottom: '48px' }}>
            Как это работает
          </Title>
          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={12}>
              <Timeline
                items={[
                  {
                    color: 'blue',
                    children: (
                      <>
                        <Title level={4}>1. Создание замечания (этап "До")</Title>
                        <Paragraph>
                          Инженер или технадзор фиксирует дефект, добавляет описание, фото,
                          срок и назначает подрядчика
                        </Paragraph>
                      </>
                    )
                  },
                  {
                    color: 'orange',
                    children: (
                      <>
                        <Title level={4}>2. Устранение (этап "После")</Title>
                        <Paragraph>
                          Подрядчик выполняет работы, загружает фото и отмечает задачу
                          как выполненную
                        </Paragraph>
                      </>
                    )
                  },
                  {
                    color: 'green',
                    children: (
                      <>
                        <Title level={4}>3. Проверка (этап "Осмотр")</Title>
                        <Paragraph>
                          Ответственный инженер проверяет качество, подтверждает или
                          возвращает на доработку
                        </Paragraph>
                      </>
                    )
                  }
                ]}
              />
            </Col>
            <Col xs={24} lg={12}>
              <Card className="status-card">
                <Title level={4}>Статусы замечаний</Title>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <div className="status-item">
                    <span className="status-badge status-new"></span>
                    <Text strong>Новое</Text> — ожидает начала работ
                  </div>
                  <div className="status-item">
                    <span className="status-badge status-process"></span>
                    <Text strong>В процессе</Text> — подрядчик приступил
                  </div>
                  <div className="status-item">
                    <span className="status-badge status-review"></span>
                    <Text strong>На проверке</Text> — ожидает осмотра
                  </div>
                  <div className="status-item">
                    <span className="status-badge status-done"></span>
                    <Text strong>Исполнено</Text> — принято и закрыто
                  </div>
                  <div className="status-item">
                    <span className="status-badge status-overdue"></span>
                    <Text strong>Просрочено</Text> — истек срок
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Мобильная версия */}
        <div className="mobile-section">
          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={12}>
              <Title level={2}>Мобильная версия</Title>
              <Title level={4}>Для работы прямо на стройке</Title>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div className="mobile-feature">
                  <MobileOutlined className="mobile-icon" />
                  <div>
                    <Text strong>Адаптивный интерфейс для смартфонов</Text>
                    <br />
                    <Text type="secondary">Работает на всех устройствах</Text>
                  </div>
                </div>
                <div className="mobile-feature">
                  <CameraOutlined className="mobile-icon" />
                  <div>
                    <Text strong>Мгновенный доступ к камере</Text>
                    <br />
                    <Text type="secondary">Фото прямо из приложения</Text>
                  </div>
                </div>
                <div className="mobile-feature">
                  <TeamOutlined className="mobile-icon" />
                  <div>
                    <Text strong>Крупные кнопки для работы в перчатках</Text>
                    <br />
                    <Text type="secondary">Удобно на стройплощадке</Text>
                  </div>
                </div>
                <div className="mobile-feature">
                  <CloudOutlined className="mobile-icon" />
                  <div>
                    <Text strong>Оффлайн-режим</Text>
                    <br />
                    <Text type="secondary">Сохраняет данные без сети</Text>
                  </div>
                </div>
              </Space>
            </Col>
            <Col xs={24} lg={12} style={{ textAlign: 'center' }}>
              <div className="stats-grid">
                <Statistic
                  title="Время создания замечания"
                  value="< 1"
                  suffix="минуты"
                  valueStyle={{ color: '#3f8600' }}
                />
                <Statistic
                  title="Скорость уведомления"
                  value="мгновенно"
                  valueStyle={{ color: '#1890ff' }}
                />
                <Statistic
                  title="Время обучения"
                  value="< 2"
                  suffix="минут"
                  valueStyle={{ color: '#722ed1' }}
                />
              </div>
            </Col>
          </Row>
        </div>

        {/* Призыв к действию */}
        <div className="cta-section">
          <Row justify="center">
            <Col xs={24} md={16} lg={12} style={{ textAlign: 'center' }}>
              <Title level={2} style={{ color: '#fff' }}>
                Проверьте, как легко контролировать стройку с Check Site
              </Title>
              <Paragraph style={{ fontSize: '18px', marginBottom: '32px', color: 'rgba(255,255,255,0.9)' }}>
                Попробуйте демо или зарегистрируйте компанию прямо сейчас
              </Paragraph>
              <Space size="large">
                <Button
                  type="default"
                  size="large"
                  icon={<EyeOutlined />}
                  onClick={() => navigate('/login')}
                  style={{ background: '#fff', borderColor: '#fff' }}
                >
                  Посмотреть демо
                </Button>
                <Button
                  size="large"
                  icon={<RocketOutlined />}
                  onClick={() => navigate('/register')}
                  style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
                >
                  Начать работу
                </Button>
              </Space>
            </Col>
          </Row>
        </div>
      </Content>

      {/* Футер */}
      <Footer className="landing-footer">
        <div style={{ textAlign: 'center' }}>
          <Title level={3} style={{ marginBottom: '8px' }}>
            Check Site — стройка под контролем
          </Title>
          <Paragraph style={{ fontSize: '16px', color: '#666', marginBottom: '16px' }}>
            Фотофиксация. Контроль. Ответственность.
          </Paragraph>
          <Paragraph style={{ margin: 0, color: '#999', fontSize: '14px' }}>
            Check Site © 2025 | Система контроля качества строительных работ
          </Paragraph>
        </div>
      </Footer>
    </Layout>
  )
}

export default LandingPage
