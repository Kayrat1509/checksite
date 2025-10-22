import { Button, Layout, Typography, Row, Col, Card, Space, Badge, Divider, Menu } from 'antd'
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

          {/* Навигационное меню */}
          <Menu
            mode="horizontal"
            className="landing-nav-menu"
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              marginLeft: 50,
              fontSize: 16,
              fontWeight: 500
            }}
            items={[
              { key: 'service', label: 'Наша история', onClick: () => navigate('/about-service') },
              { key: 'pricing', label: 'Тариф', onClick: () => navigate('/pricing') },
              { key: 'features', label: 'Функции', onClick: () => navigate('/features') },
              { key: 'contacts', label: 'Контакты' }
            ]}
          />

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
                <span className="hero-title-line1">Стройка под контролем</span>
                <span className="gradient-text">с Check Site</span>
              </Title>

              <Paragraph className="hero-description">
                Управляйте проектами, фиксируйте замечания с фото за 60 секунд, координируйте работу подрядчиков через Push-уведомления,
                контролируйте заявки на материалы со статусами согласования, ведите базу тендеров для поставщиков из стран СНГ,
                храните техусловия и документацию, получайте аналитику в реальном времени и генерируйте отчеты автоматически.
                Всё в одной системе.
              </Paragraph>
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
                    {/* Первый ряд - Основные модули */}
                    <Col xs={12} md={8}>
                      <div className="mini-preview" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                        <DashboardOutlined style={{ fontSize: 48, color: '#fff' }} />
                        <Text style={{ color: '#fff', fontWeight: 600 }}>Дашборд</Text>
                      </div>
                    </Col>
                    <Col xs={12} md={8}>
                      <div className="mini-preview" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                        <BugOutlined style={{ fontSize: 48, color: '#fff' }} />
                        <Text style={{ color: '#fff', fontWeight: 600 }}>Замечания</Text>
                      </div>
                    </Col>
                    <Col xs={12} md={8}>
                      <div className="mini-preview" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                        <ProjectOutlined style={{ fontSize: 48, color: '#fff' }} />
                        <Text style={{ color: '#fff', fontWeight: 600 }}>Проекты</Text>
                      </div>
                    </Col>

                    {/* Второй ряд - Дополнительные модули */}
                    <Col xs={12} md={8}>
                      <div className="mini-preview" style={{ background: 'linear-gradient(135deg, #fa8c16 0%, #faad14 100%)' }}>
                        <ShoppingCartOutlined style={{ fontSize: 48, color: '#fff' }} />
                        <Text style={{ color: '#fff', fontWeight: 600 }}>Заявки</Text>
                      </div>
                    </Col>
                    <Col xs={12} md={8}>
                      <div className="mini-preview" style={{ background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)' }}>
                        <TeamOutlined style={{ fontSize: 48, color: '#fff' }} />
                        <Text style={{ color: '#fff', fontWeight: 600 }}>Команда</Text>
                      </div>
                    </Col>
                    <Col xs={12} md={8}>
                      <div className="mini-preview" style={{ background: 'linear-gradient(135deg, #13c2c2 0%, #08979c 100%)' }}>
                        <BarChartOutlined style={{ fontSize: 48, color: '#fff' }} />
                        <Text style={{ color: '#fff', fontWeight: 600 }}>Аналитика</Text>
                      </div>
                    </Col>
                  </Row>
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

        {/* Преимущества для бизнеса */}
        <div className="benefits-section">
          <div className="section-header">
            <Title level={2}>Реальная экономия для вашего бизнеса</Title>
            <Paragraph className="section-subtitle">
              Check Site окупается в первый месяц использования
            </Paragraph>
          </div>

          <Row gutter={[32, 32]} align="middle">
            <Col xs={24} lg={12}>
              <Card className="benefit-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', color: '#fff' }}>
                <Title level={3} style={{ color: '#fff', marginTop: 0 }}>💰 Сокращение затрат</Title>
                <div style={{ fontSize: 16, lineHeight: 1.8 }}>
                  <Paragraph style={{ color: '#fff', marginBottom: 12 }}>
                    ✓ <strong>Минус 40% времени</strong> на оформление замечаний
                  </Paragraph>
                  <Paragraph style={{ color: '#fff', marginBottom: 12 }}>
                    ✓ <strong>В 3 раза быстрее</strong> устранение дефектов благодаря уведомлениям
                  </Paragraph>
                  <Paragraph style={{ color: '#fff', marginBottom: 12 }}>
                    ✓ <strong>Нет бумажной волокиты</strong> — всё в одной системе
                  </Paragraph>
                  <Paragraph style={{ color: '#fff', marginBottom: 0 }}>
                    ✓ <strong>Автоматические отчеты</strong> для заказчика и руководства
                  </Paragraph>
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card className="benefit-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', border: 'none', color: '#fff' }}>
                <Title level={3} style={{ color: '#fff', marginTop: 0 }}>📊 Прозрачность и контроль</Title>
                <div style={{ fontSize: 16, lineHeight: 1.8 }}>
                  <Paragraph style={{ color: '#fff', marginBottom: 12 }}>
                    ✓ <strong>Онлайн-мониторинг</strong> всех объектов в реальном времени
                  </Paragraph>
                  <Paragraph style={{ color: '#fff', marginBottom: 12 }}>
                    ✓ <strong>История изменений</strong> каждого замечания с фото
                  </Paragraph>
                  <Paragraph style={{ color: '#fff', marginBottom: 12 }}>
                    ✓ <strong>Статистика по подрядчикам</strong> — кто работает эффективно
                  </Paragraph>
                  <Paragraph style={{ color: '#fff', marginBottom: 0 }}>
                    ✓ <strong>Доказательная база</strong> для претензий и актов
                  </Paragraph>
                </div>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Кейсы использования */}
        <div className="use-cases-section">
          <div className="section-header">
            <Title level={2}>Кто использует Check Site?</Title>
            <Paragraph className="section-subtitle">
              От небольших ремонтных бригад до крупных застройщиков
            </Paragraph>
          </div>

          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <Card className="use-case-card" hoverable>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <ProjectOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                </div>
                <Title level={4} style={{ textAlign: 'center' }}>Генподрядчики</Title>
                <Paragraph style={{ color: '#666' }}>
                  Управление всеми субподрядчиками на объекте. Контроль сроков, качества и бюджета в одном окне.
                </Paragraph>
                <div style={{ marginTop: 16, padding: 12, background: '#f0f5ff', borderRadius: 8 }}>
                  <Text strong style={{ color: '#1890ff' }}>5-20 объектов одновременно</Text>
                </div>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card className="use-case-card" hoverable>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <TeamOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                </div>
                <Title level={4} style={{ textAlign: 'center' }}>Технический надзор</Title>
                <Paragraph style={{ color: '#666' }}>
                  Фиксация всех нарушений с фотодоказательствами. Формирование актов и предписаний в один клик.
                </Paragraph>
                <div style={{ marginTop: 16, padding: 12, background: '#f6ffed', borderRadius: 8 }}>
                  <Text strong style={{ color: '#52c41a' }}>Документы всегда под рукой</Text>
                </div>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card className="use-case-card" hoverable>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <SafetyOutlined style={{ fontSize: 48, color: '#faad14' }} />
                </div>
                <Title level={4} style={{ textAlign: 'center' }}>Заказчики</Title>
                <Paragraph style={{ color: '#666' }}>
                  Полный контроль над ходом строительства. Понятные отчеты и фотоотчеты в любой момент времени.
                </Paragraph>
                <div style={{ marginTop: 16, padding: 12, background: '#fffbe6', borderRadius: 8 }}>
                  <Text strong style={{ color: '#faad14' }}>Прозрачность на 100%</Text>
                </div>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Дополнительные возможности */}
        <div className="extra-features-section">
          <div className="section-header">
            <Title level={2}>Больше, чем просто учет замечаний</Title>
            <Paragraph className="section-subtitle">
              Комплексная система управления строительством
            </Paragraph>
          </div>

          <Row gutter={[32, 32]}>
            <Col xs={24} md={12}>
              <div className="extra-feature-item">
                <ShoppingCartOutlined style={{ fontSize: 40, color: '#1890ff', marginRight: 16 }} />
                <div>
                  <Title level={4} style={{ marginBottom: 8 }}>Заявки на материалы</Title>
                  <Paragraph style={{ color: '#666', marginBottom: 0 }}>
                    Полный цикл согласования: от заявки мастера до утверждения директором для максимального контроля.
                  </Paragraph>
                </div>
              </div>
            </Col>

            <Col xs={24} md={12}>
              <div className="extra-feature-item">
                <DollarOutlined style={{ fontSize: 40, color: '#52c41a', marginRight: 16 }} />
                <div>
                  <Title level={4} style={{ marginBottom: 8 }}>База тендеров</Title>
                  <Paragraph style={{ color: '#666', marginBottom: 0 }}>
                    Публикуйте тендеры для подрядчиков и поставщиков. Получайте предложения от компаний по всему СНГ от дилеров до производителей. Собирайте больше предложений для сравнения.
                  </Paragraph>
                </div>
              </div>
            </Col>

            <Col xs={24} md={12}>
              <div className="extra-feature-item">
                <FileTextOutlined style={{ fontSize: 40, color: '#722ed1', marginRight: 16 }} />
                <div>
                  <Title level={4} style={{ marginBottom: 8 }}>Техусловия и документация</Title>
                  <Paragraph style={{ color: '#666', marginBottom: 0 }}>
                    Централизованное хранилище всех технических условий, СНиПов и регламентов проекта.
                  </Paragraph>
                </div>
              </div>
            </Col>

            <Col xs={24} md={12}>
              <div className="extra-feature-item">
                <BarChartOutlined style={{ fontSize: 40, color: '#fa8c16', marginRight: 16 }} />
                <div>
                  <Title level={4} style={{ marginBottom: 8 }}>Аналитика и отчеты</Title>
                  <Paragraph style={{ color: '#666', marginBottom: 0 }}>
                    Графики, диаграммы, экспорт в Excel и PDF. Вся статистика по объектам для принятия решений.
                  </Paragraph>
                </div>
              </div>
            </Col>
          </Row>
        </div>

        {/* Секция про тендеры */}
        <div className="tenders-section">
          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={12}>
              <div className="tenders-content">
                <Badge count="НОВОЕ" style={{ backgroundColor: '#faad14', marginBottom: 24 }} />
                <Title level={2} style={{ marginTop: 0, fontSize: 48 }}>
                  База тендеров для строителей
                </Title>
                <Paragraph style={{ fontSize: 18, color: '#595959', lineHeight: 1.8, marginBottom: 32 }}>
                  Публикуйте тендеры на материалы, работы, оборудование и услуги. Получайте коммерческие предложения от подрядчиков и поставщиков из Казахстана, России, Узбекистана, Киргизии, Таджикистана и Беларуси.
                </Paragraph>

                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <div className="tender-feature">
                    <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a', marginRight: 16 }} />
                    <div>
                      <Text strong style={{ fontSize: 16, display: 'block' }}>Публикация за 2 минуты</Text>
                      <Text style={{ color: '#8c8c8c' }}>Создайте тендер с описанием, бюджетом и сроками</Text>
                    </div>
                  </div>

                  <div className="tender-feature">
                    <CheckCircleOutlined style={{ fontSize: 24, color: '#1890ff', marginRight: 16 }} />
                    <div>
                      <Text strong style={{ fontSize: 16, display: 'block' }}>Доступ к базе подрядчиков</Text>
                      <Text style={{ color: '#8c8c8c' }}>Ваш тендер увидят сотни компаний по всей стране и не только</Text>
                    </div>
                  </div>

                  <div className="tender-feature">
                    <CheckCircleOutlined style={{ fontSize: 24, color: '#722ed1', marginRight: 16 }} />
                    <div>
                      <Text strong style={{ fontSize: 16, display: 'block' }}>Прямые контакты</Text>
                      <Text style={{ color: '#8c8c8c' }}>Получайте предложения напрямую от исполнителей</Text>
                    </div>
                  </div>

                  <div className="tender-feature">
                    <CheckCircleOutlined style={{ fontSize: 24, color: '#fa8c16', marginRight: 16 }} />
                    <div>
                      <Text strong style={{ fontSize: 16, display: 'block' }}>Управление заявками</Text>
                      <Text style={{ color: '#8c8c8c' }}>Отслеживайте статус и сравнивайте предложения. Вы никогда не потеряете заявку где-то у кого-то в отделе или на столе.</Text>
                    </div>
                  </div>
                </Space>

                <Space size="middle" style={{ marginTop: 40 }}>
                  <Button
                    type="primary"
                    size="large"
                    icon={<DollarOutlined />}
                    onClick={() => navigate('/public-tenders/login')}
                    style={{
                      height: 54,
                      padding: '0 40px',
                      fontSize: 17,
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #faad14 0%, #fa8c16 100%)',
                      border: 'none',
                      boxShadow: '0 8px 20px rgba(250, 173, 20, 0.3)'
                    }}
                  >
                    Перейти к тендерам
                  </Button>
                  <Button
                    size="large"
                    icon={<RocketOutlined />}
                    onClick={() => navigate('/register')}
                    style={{
                      height: 54,
                      padding: '0 40px',
                      fontSize: 17,
                      fontWeight: 600
                    }}
                  >
                    Зарегистрироваться
                  </Button>
                </Space>
              </div>
            </Col>

            <Col xs={24} lg={12}>
              <div className="tenders-preview">
                <Card
                  className="tender-card-demo"
                  style={{
                    border: '2px solid #f0f0f0',
                    borderRadius: 16,
                    overflow: 'hidden',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)'
                  }}
                >
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Badge status="processing" text={<Text strong>Активный тендер</Text>} />
                      <Text type="secondary" style={{ fontSize: 13 }}>Опубликовано 2 дня назад</Text>
                    </div>

                    <Title level={4} style={{ marginBottom: 0 }}>
                      Поставка строительных материалов
                    </Title>

                    <Paragraph style={{ color: '#595959', marginBottom: 16 }}>
                      Требуется поставка цемента М500, кирпича облицовочного и утеплителя для жилого комплекса в Астане.
                    </Paragraph>

                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <div style={{ padding: 16, background: '#f0f5ff', borderRadius: 8 }}>
                          <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>Бюджет</Text>
                          <Text strong style={{ fontSize: 18, color: '#1890ff' }}>15 000 000 ₸</Text>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ padding: 16, background: '#fff7e6', borderRadius: 8 }}>
                          <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>Срок</Text>
                          <Text strong style={{ fontSize: 18, color: '#fa8c16' }}>30 дней</Text>
                        </div>
                      </Col>
                    </Row>

                    <div style={{ padding: 16, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
                      <Space>
                        <TeamOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                        <Text style={{ color: '#52c41a', fontWeight: 600 }}>
                          12 компаний уже подали предложения
                        </Text>
                      </Space>
                    </div>

                    <Button
                      type="primary"
                      block
                      size="large"
                      style={{
                        marginTop: 8,
                        height: 48,
                        fontSize: 16,
                        fontWeight: 600
                      }}
                    >
                      Подать предложение
                    </Button>
                  </Space>
                </Card>
              </div>
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
