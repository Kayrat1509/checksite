import { Button, Layout, Typography, Row, Col, Card, Space, Badge, Divider } from 'antd'
import {
  CheckCircleOutlined,
  RocketOutlined,
  SafetyOutlined,
  ThunderboltFilled,
  BellFilled,
  BarChartOutlined,
  CameraFilled,
  TeamOutlined,
  FileTextOutlined,
  CloudUploadOutlined,
  MobileOutlined,
  LockFilled,
  BugOutlined,
  ProjectOutlined,
  ShoppingCartOutlined,
  DashboardOutlined,
  StarFilled,
  ArrowRightOutlined,
  DollarOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import './LandingPage.css'

const { Header, Content, Footer } = Layout
const { Title, Paragraph, Text } = Typography

const LandingPage = () => {
  const navigate = useNavigate()

  // Ключевые преимущества (краткие)
  const keyFeatures = [
    {
      icon: <ThunderboltFilled style={{ fontSize: 40, color: '#faad14' }} />,
      title: 'Моментальная фиксация',
      description: 'Создание замечания за 60 секунд с фото и назначением'
    },
    {
      icon: <CameraFilled style={{ fontSize: 40, color: '#1890ff' }} />,
      title: 'Фото До и После',
      description: 'Полная история устранения каждого дефекта'
    },
    {
      icon: <BellFilled style={{ fontSize: 40, color: '#52c41a' }} />,
      title: 'Уведомления в Telegram',
      description: 'Подрядчики узнают о задачах мгновенно'
    },
    {
      icon: <BarChartOutlined style={{ fontSize: 40, color: '#722ed1' }} />,
      title: 'Аналитика и отчеты',
      description: 'Вся статистика по объектам в одном месте'
    },
    {
      icon: <MobileOutlined style={{ fontSize: 40, color: '#eb2f96' }} />,
      title: 'Работает на стройке',
      description: 'Адаптивный интерфейс для смартфонов'
    },
    {
      icon: <LockFilled style={{ fontSize: 40, color: '#13c2c2' }} />,
      title: 'Безопасно и надежно',
      description: 'Защита данных и резервное копирование'
    }
  ]

  // Основные модули системы
  const modules = [
    {
      icon: <ProjectOutlined />,
      title: 'Проекты',
      color: '#1890ff',
      description: 'Управление объектами, чертежами и командой'
    },
    {
      icon: <BugOutlined />,
      title: 'Замечания',
      color: '#f5222d',
      description: 'Фиксация дефектов с фото До/После'
    },
    {
      icon: <TeamOutlined />,
      title: 'Сотрудники',
      color: '#52c41a',
      description: 'Управление ИТР, подрядчиками и надзором'
    },
    {
      icon: <ShoppingCartOutlined />,
      title: 'Заявки на материалы',
      color: '#faad14',
      description: 'Комплексное согласование закупок (17 статусов)'
    },
    {
      icon: <FileTextOutlined />,
      title: 'Техусловия',
      color: '#722ed1',
      description: 'База знаний и документация проекта'
    },
    {
      icon: <DashboardOutlined />,
      title: 'Аналитика',
      color: '#13c2c2',
      description: 'Дашборды, графики и экспорт отчетов'
    }
  ]

  // Статистика для впечатления
  const stats = [
    { value: '< 60', label: 'секунд на создание замечания', color: '#52c41a' },
    { value: '13', label: 'ролей с гибкими правами доступа', color: '#1890ff' },
    { value: '17', label: 'статусов согласования материалов', color: '#faad14' },
    { value: '100%', label: 'прозрачность процесса', color: '#722ed1' }
  ]

  return (
    <Layout className="landing-layout">
      {/* Хедер с градиентом */}
      <Header className="landing-header">
        <div className="landing-header-content">
          <div className="landing-logo">
            <CheckCircleOutlined className="logo-icon" />
            <span className="landing-logo-text">Check Site</span>
            <Badge count="PRO" style={{ backgroundColor: '#52c41a' }} />
          </div>

          <Space size="middle" className="header-buttons">
            <Button
              type="default"
              size="large"
              icon={<DollarOutlined />}
              onClick={() => navigate('/public-tenders/login')}
              className="tenders-btn"
              style={{ borderColor: '#faad14', color: '#faad14' }}
            >
              Тендеры
            </Button>
            <Button
              type="text"
              size="large"
              onClick={() => navigate('/login')}
              className="login-btn"
            >
              Войти
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
          </Space>
        </div>
      </Header>

      <Content className="landing-content">
        {/* Hero секция с градиентом */}
        <div className="hero-section">
          <Row justify="center" align="middle">
            <Col xs={24} lg={14} style={{ textAlign: 'center' }}>
              <Badge.Ribbon text="Новинка 2025" color="cyan" className="hero-ribbon">
                <div className="hero-badge">
                  <SafetyOutlined /> Система контроля качества строительства
                </div>
              </Badge.Ribbon>

              <Title level={1} className="hero-title">
                Стройка под контролем <br />
                <span className="gradient-text">с Check Site</span>
              </Title>

              <Paragraph className="hero-description">
                Фиксируйте замечания с фото за 60 секунд, контролируйте устранение дефектов
                и генерируйте отчеты автоматически. Всё в одной системе.
              </Paragraph>

              <Space size="large" className="hero-actions">
                <Button
                  type="primary"
                  size="large"
                  icon={<RocketOutlined />}
                  onClick={() => navigate('/register')}
                  className="hero-btn-primary"
                >
                  Попробовать бесплатно
                </Button>
                <Button
                  size="large"
                  icon={<ArrowRightOutlined />}
                  onClick={() => navigate('/login')}
                  className="hero-btn-secondary"
                >
                  Смотреть демо
                </Button>
              </Space>

              {/* Быстрая статистика */}
              <div className="hero-stats">
                {stats.map((stat, index) => (
                  <div key={index} className="stat-item">
                    <Text className="stat-value" style={{ color: stat.color }}>
                      {stat.value}
                    </Text>
                    <Text className="stat-label">{stat.label}</Text>
                  </div>
                ))}
              </div>
            </Col>
          </Row>
        </div>

        {/* Секция с превью интерфейса */}
        <div className="interface-preview-section">
          <Row justify="center">
            <Col xs={24} lg={20}>
              <div className="preview-card">
                <div className="preview-badge">
                  <StarFilled /> Интерфейс системы
                </div>
                <div className="preview-placeholder">
                  <Row gutter={[16, 16]}>
                    {/* Мини-карточки с иконками модулей как превью */}
                    <Col xs={24} md={8}>
                      <div className="mini-preview" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                        <DashboardOutlined style={{ fontSize: 48, color: '#fff' }} />
                        <Text style={{ color: '#fff', fontWeight: 600 }}>Дашборд</Text>
                      </div>
                    </Col>
                    <Col xs={24} md={8}>
                      <div className="mini-preview" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                        <BugOutlined style={{ fontSize: 48, color: '#fff' }} />
                        <Text style={{ color: '#fff', fontWeight: 600 }}>Замечания</Text>
                      </div>
                    </Col>
                    <Col xs={24} md={8}>
                      <div className="mini-preview" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                        <ProjectOutlined style={{ fontSize: 48, color: '#fff' }} />
                        <Text style={{ color: '#fff', fontWeight: 600 }}>Проекты</Text>
                      </div>
                    </Col>
                  </Row>
                  <Paragraph className="preview-note">
                    💡 Современный интерфейс на React + TypeScript с адаптацией под все устройства
                  </Paragraph>
                </div>
              </div>
            </Col>
          </Row>
        </div>

        {/* Ключевые преимущества */}
        <div className="features-section">
          <div className="section-header">
            <Title level={2}>Почему выбирают Check Site?</Title>
            <Paragraph className="section-subtitle">
              Все инструменты для контроля качества в одной системе
            </Paragraph>
          </div>

          <Row gutter={[24, 24]}>
            {keyFeatures.map((feature, index) => (
              <Col xs={24} sm={12} lg={8} key={index}>
                <Card className="feature-card" hoverable>
                  <div className="feature-icon">{feature.icon}</div>
                  <Title level={4} className="feature-title">{feature.title}</Title>
                  <Paragraph className="feature-description">
                    {feature.description}
                  </Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {/* Модули системы */}
        <div className="modules-section">
          <div className="section-header">
            <Title level={2}>Полный функционал для строительства</Title>
            <Paragraph className="section-subtitle">
              6 основных модулей для управления проектами
            </Paragraph>
          </div>

          <Row gutter={[16, 16]}>
            {modules.map((module, index) => (
              <Col xs={24} sm={12} md={8} key={index}>
                <Card className="module-card" bordered={false}>
                  <div className="module-header">
                    <div className="module-icon" style={{ background: module.color }}>
                      {module.icon}
                    </div>
                    <Title level={4} className="module-title">{module.title}</Title>
                  </div>
                  <Paragraph className="module-description">
                    {module.description}
                  </Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {/* Как это работает (3 шага) */}
        <div className="workflow-section">
          <div className="section-header">
            <Title level={2}>Три шага к идеальному контролю</Title>
            <Paragraph className="section-subtitle">
              Простой процесс от обнаружения дефекта до его устранения
            </Paragraph>
          </div>

          <Row gutter={[32, 32]} align="middle">
            <Col xs={24} lg={8}>
              <div className="workflow-step">
                <div className="step-number" style={{ background: '#1890ff' }}>1</div>
                <div className="step-icon">
                  <CameraFilled style={{ fontSize: 48, color: '#1890ff' }} />
                </div>
                <Title level={3} className="step-title">Фиксация</Title>
                <Paragraph className="step-description">
                  Инженер создает замечание с фото "До", описанием и назначает подрядчика
                </Paragraph>
              </div>
            </Col>

            <Col xs={24} lg={8}>
              <div className="workflow-step">
                <div className="step-number" style={{ background: '#faad14' }}>2</div>
                <div className="step-icon">
                  <CheckCircleOutlined style={{ fontSize: 48, color: '#faad14' }} />
                </div>
                <Title level={3} className="step-title">Устранение</Title>
                <Paragraph className="step-description">
                  Подрядчик выполняет работы и загружает фото "После"
                </Paragraph>
              </div>
            </Col>

            <Col xs={24} lg={8}>
              <div className="workflow-step">
                <div className="step-number" style={{ background: '#52c41a' }}>3</div>
                <div className="step-icon">
                  <SafetyOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                </div>
                <Title level={3} className="step-title">Приемка</Title>
                <Paragraph className="step-description">
                  Инженер проверяет качество и закрывает замечание или возвращает на доработку
                </Paragraph>
              </div>
            </Col>
          </Row>
        </div>

        {/* Статусы и процессы */}
        <div className="status-section">
          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={12}>
              <Title level={3}>Статусы замечаний</Title>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div className="status-item">
                  <Badge status="default" />
                  <Text strong>Новое</Text> — ожидает начала работ
                </div>
                <div className="status-item">
                  <Badge status="processing" />
                  <Text strong>В процессе</Text> — подрядчик работает
                </div>
                <div className="status-item">
                  <Badge status="warning" />
                  <Text strong>На проверке</Text> — ожидает приемки
                </div>
                <div className="status-item">
                  <Badge status="success" />
                  <Text strong>Исполнено</Text> — принято и закрыто
                </div>
                <div className="status-item">
                  <Badge status="error" />
                  <Text strong>Просрочено</Text> — превышен дедлайн
                </div>
              </Space>
            </Col>

            <Col xs={24} lg={12}>
              <Title level={3}>Гибкая система ролей</Title>
              <div className="roles-grid">
                <div className="role-tag">Директор</div>
                <div className="role-tag">Главный инженер</div>
                <div className="role-tag">Руководитель проекта</div>
                <div className="role-tag">Начальник участка</div>
                <div className="role-tag">Инженер ПТО</div>
                <div className="role-tag">Прораб</div>
                <div className="role-tag">Мастер</div>
                <div className="role-tag">Подрядчик</div>
                <div className="role-tag">Технадзор</div>
                <div className="role-tag">Авторский надзор</div>
                <div className="role-tag">Снабженец</div>
                <div className="role-tag">Зав.Центрсклада</div>
                <div className="role-tag">Бухгалтер</div>
              </div>
              <Paragraph style={{ marginTop: 16, color: '#666' }}>
                Каждая роль имеет свои права доступа и функционал
              </Paragraph>
            </Col>
          </Row>
        </div>

        {/* Технологии */}
        <div className="tech-section">
          <div className="section-header">
            <Title level={2}>Современные технологии</Title>
            <Paragraph className="section-subtitle">
              Быстро, надежно и безопасно
            </Paragraph>
          </div>

          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <Card className="tech-card">
                <CloudUploadOutlined className="tech-icon" style={{ color: '#1890ff' }} />
                <Title level={4}>Backend</Title>
                <Text>Django 4.2 + DRF</Text><br />
                <Text>PostgreSQL + Redis</Text><br />
                <Text>Celery + Channels</Text>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="tech-card">
                <MobileOutlined className="tech-icon" style={{ color: '#52c41a' }} />
                <Title level={4}>Frontend</Title>
                <Text>React 18 + TypeScript</Text><br />
                <Text>Ant Design + Zustand</Text><br />
                <Text>PWA (офлайн-режим)</Text>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="tech-card">
                <LockFilled className="tech-icon" style={{ color: '#faad14' }} />
                <Title level={4}>Безопасность</Title>
                <Text>JWT аутентификация</Text><br />
                <Text>HTTPS + CORS</Text><br />
                <Text>Резервное копирование</Text>
              </Card>
            </Col>
          </Row>
        </div>

        <Divider />

        {/* Призыв к действию */}
        <div className="cta-section">
          <div className="cta-content">
            <Title level={2} className="cta-title">
              Готовы навести порядок на стройке?
            </Title>
            <Paragraph className="cta-description">
              Начните использовать Check Site уже сегодня. Регистрация занимает 2 минуты.
            </Paragraph>
            <Space size="large" className="cta-buttons">
              <Button
                type="primary"
                size="large"
                icon={<RocketOutlined />}
                onClick={() => navigate('/register')}
                className="cta-btn-primary"
              >
                Зарегистрироваться бесплатно
              </Button>
              <Button
                size="large"
                icon={<ArrowRightOutlined />}
                onClick={() => navigate('/login')}
                className="cta-btn-secondary"
              >
                Войти в систему
              </Button>
            </Space>
          </div>
        </div>
      </Content>

      {/* Футер */}
      <Footer className="landing-footer">
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

export default LandingPage
