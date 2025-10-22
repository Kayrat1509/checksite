import { Button, Layout, Typography, Row, Col, Card, Space, Badge, List } from 'antd'
import {
  CheckCircleOutlined,
  RocketOutlined,
  CrownOutlined,
  ThunderboltFilled,
  TeamOutlined,
  SafetyOutlined,
  StarFilled,
  BugOutlined,
  ProjectOutlined,
  FileTextOutlined,
  BarChartOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  PhoneOutlined,
  MailOutlined,
  ClockCircleOutlined,
  CloudOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import './PricingPage.css'

const { Header, Content, Footer } = Layout
const { Title, Paragraph, Text } = Typography

const PricingPage = () => {
  const navigate = useNavigate()

  // Список всех функций сервиса
  const allFeatures = [
    {
      icon: <ProjectOutlined />,
      title: 'Управление проектами',
      description: 'Неограниченное количество проектов и объектов'
    },
    {
      icon: <BugOutlined />,
      title: 'Замечания и дефекты',
      description: 'Фиксация с фото До/После, статусы, дедлайны'
    },
    {
      icon: <TeamOutlined />,
      title: 'Команда без ограничений',
      description: 'Добавляйте сколько угодно сотрудников и подрядчиков'
    },
    {
      icon: <ShoppingCartOutlined />,
      title: 'Заявки на материалы',
      description: 'Поэтапная система согласование, от мастера до директора'
    },
    {
      icon: <DollarOutlined />,
      title: 'База тендеров',
      description: 'Публикация тендеров и работа с поставщиками СНГ'
    },
    {
      icon: <FileTextOutlined />,
      title: 'Техусловия и документация',
      description: 'Централизованное хранилище всех документов'
    },
    {
      icon: <BarChartOutlined />,
      title: 'Аналитика и отчеты',
      description: 'Графики, дашборды, экспорт в Excel и PDF'
    },
    {
      icon: <ThunderboltFilled />,
      title: 'Push-уведомления',
      description: 'Мгновенные уведомления о новых задачах'
    },
    {
      icon: <SafetyOutlined />,
      title: 'Безопасность данных',
      description: 'Резервное копирование и защита информации'
    },
    {
      icon: <ClockCircleOutlined />,
      title: 'История изменений',
      description: 'Полная история всех действий в системе'
    },
    {
      icon: <CloudOutlined />,
      title: 'Неограниченное хранилище',
      description: 'Загружайте фото и документы без лимитов'
    },
    {
      icon: <PhoneOutlined />,
      title: 'Техническая поддержка',
      description: 'Помощь в настройке и работе с системой'
    }
  ]

  return (
    <Layout className="pricing-layout">
      {/* Хедер */}
      <Header className="pricing-header">
        <div className="pricing-header-content">
          <div className="pricing-logo" onClick={() => navigate('/')}>
            <CheckCircleOutlined className="logo-icon" />
            <span className="pricing-logo-text">Check Site</span>
            <Badge count="PRO" style={{ backgroundColor: '#52c41a' }} />
          </div>

          <Space size="middle">
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

      <Content className="pricing-content">
        {/* Hero секция */}
        <div className="pricing-hero">
          <div className="pricing-hero-content">
            <Badge.Ribbon text="Прозрачные цены" color="cyan">
              <div className="pricing-badge">
                <CrownOutlined /> Единый тариф для всех
              </div>
            </Badge.Ribbon>

            <Title level={1} className="pricing-hero-title">
              Простая и честная ценовая политика
            </Title>

            <Paragraph className="pricing-hero-description">
              Никаких скрытых платежей, никаких ограничений по функциям.
              Платите только за количество активных пользователей.
            </Paragraph>

            <div className="pricing-highlight">
              <Text className="pricing-highlight-text">
                🎁 Все функции включены в любой тариф
              </Text>
            </div>
          </div>
        </div>

        {/* Карточки тарифов */}
        <div className="pricing-cards-section">
          <Row gutter={[48, 48]} justify="center" align="stretch">
            {/* Месячный тариф */}
            <Col xs={24} lg={10}>
              <Card className="pricing-card monthly-card">
                <div className="pricing-card-header">
                  <Badge count="Гибкость" style={{ backgroundColor: '#1890ff' }} />
                  <Title level={2} className="pricing-card-title">
                    Месячная подписка
                  </Title>
                  <Paragraph className="pricing-card-subtitle">
                    Подходит для небольших проектов и тестирования
                  </Paragraph>
                </div>

                <div className="pricing-card-price">
                  <div className="price-amount">
                    <span className="price-number">500</span>
                    <span className="price-currency">₸</span>
                  </div>
                  <div className="price-period">за пользователя в месяц</div>
                </div>

                <div className="pricing-card-calculation">
                  <Text type="secondary">Пример расчета:</Text>
                  <Space direction="vertical" size="small" style={{ width: '100%', marginTop: 12 }}>
                    <div className="calculation-item">
                      <Text>5 пользователей</Text>
                      <Text strong>2 500 ₸/мес</Text>
                    </div>
                    <div className="calculation-item">
                      <Text>10 пользователей</Text>
                      <Text strong>5 000 ₸/мес</Text>
                    </div>
                    <div className="calculation-item">
                      <Text>20 пользователей</Text>
                      <Text strong>10 000 ₸/мес</Text>
                    </div>
                  </Space>
                </div>

                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<RocketOutlined />}
                  onClick={() => navigate('/register')}
                  className="pricing-card-button"
                >
                  Начать работу
                </Button>

                <div className="pricing-card-features">
                  <Text strong style={{ display: 'block', marginBottom: 16 }}>
                    ✓ Все возможности системы
                  </Text>
                  <List
                    size="small"
                    dataSource={[
                      'Оплата каждый месяц',
                      'Можно отменить в любой момент',
                      'Идеально для краткосрочных проектов',
                      'Без долгосрочных обязательств'
                    ]}
                    renderItem={(item) => (
                      <List.Item style={{ border: 'none', padding: '6px 0' }}>
                        <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                        {item}
                      </List.Item>
                    )}
                  />
                </div>
              </Card>
            </Col>

            {/* Годовой тариф */}
            <Col xs={24} lg={10}>
              <Card className="pricing-card yearly-card popular-card">
                <div className="popular-badge">
                  <StarFilled /> Выгоднее на 17%
                </div>

                <div className="pricing-card-header">
                  <Badge count="Экономия" style={{ backgroundColor: '#52c41a' }} />
                  <Title level={2} className="pricing-card-title">
                    Годовая подписка
                  </Title>
                  <Paragraph className="pricing-card-subtitle">
                    Максимальная выгода для постоянного использования
                  </Paragraph>
                </div>

                <div className="pricing-card-price">
                  <div className="price-amount">
                    <span className="price-number">5 000</span>
                    <span className="price-currency">₸</span>
                  </div>
                  <div className="price-period">за пользователя (одноразовая оплата за год)</div>
                  <div className="price-savings">
                    2 месяца в подарок! Экономия 17%
                  </div>
                </div>

                <div className="pricing-card-calculation">
                  <Text type="secondary">Пример расчета (одноразовый платеж):</Text>
                  <Space direction="vertical" size="small" style={{ width: '100%', marginTop: 12 }}>
                    <div className="calculation-item">
                      <Text>5 пользователей</Text>
                      <Text strong style={{ color: '#52c41a' }}>25 000 ₸</Text>
                    </div>
                    <div className="calculation-item">
                      <Text>10 пользователей</Text>
                      <Text strong style={{ color: '#52c41a' }}>50 000 ₸</Text>
                    </div>
                    <div className="calculation-item">
                      <Text>20 пользователей</Text>
                      <Text strong style={{ color: '#52c41a' }}>100 000 ₸</Text>
                    </div>
                  </Space>
                </div>

                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<CrownOutlined />}
                  onClick={() => navigate('/register')}
                  className="pricing-card-button yearly-button"
                >
                  Выбрать годовой тариф
                </Button>

                <div className="pricing-card-features">
                  <Text strong style={{ display: 'block', marginBottom: 16 }}>
                    ✓ Все возможности системы + бонусы
                  </Text>
                  <List
                    size="small"
                    dataSource={[
                      'Платите за 10 месяцев, работаете 12 — экономия 17%',
                      'Приоритетная техподдержка',
                      'Помощь в настройке системы',
                      'Обучение команды'
                    ]}
                    renderItem={(item) => (
                      <List.Item style={{ border: 'none', padding: '6px 0' }}>
                        <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                        {item}
                      </List.Item>
                    )}
                  />
                </div>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Все функции сервиса */}
        <div className="pricing-features-section">
          <div className="section-header">
            <Title level={2}>Все функции включены в любой тариф</Title>
            <Paragraph className="section-subtitle">
              Получите полный доступ ко всем возможностям Check Site без ограничений
            </Paragraph>
          </div>

          <Row gutter={[24, 24]}>
            {allFeatures.map((feature, index) => (
              <Col xs={24} sm={12} lg={8} key={index}>
                <Card className="feature-card" hoverable>
                  <div className="feature-icon" style={{ fontSize: 40, color: '#1890ff', marginBottom: 16 }}>
                    {feature.icon}
                  </div>
                  <Title level={4} className="feature-title">
                    {feature.title}
                  </Title>
                  <Paragraph className="feature-description">
                    {feature.description}
                  </Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {/* Преимущества единого тарифа */}
        <div className="pricing-benefits-section">
          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={12}>
              <Title level={2}>Почему единый тариф выгоден?</Title>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div className="benefit-item">
                  <div className="benefit-icon">
                    <CloudOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                  </div>
                  <div>
                    <Title level={4} style={{ marginTop: 0 }}>Без ограничений</Title>
                    <Paragraph>
                      Создавайте неограниченное количество проектов, замечаний, документов и заявок.
                      Храните сколько угодно фотографий и файлов.
                    </Paragraph>
                  </div>
                </div>

                <div className="benefit-item">
                  <div className="benefit-icon">
                    <TeamOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                  </div>
                  <div>
                    <Title level={4} style={{ marginTop: 0 }}>Масштабируйтесь легко</Title>
                    <Paragraph>
                      Добавляйте новых пользователей по мере роста команды. Платите только за активных
                      сотрудников. Удаляйте неактивных пользователей без потери данных.
                    </Paragraph>
                  </div>
                </div>

                <div className="benefit-item">
                  <div className="benefit-icon">
                    <CheckCircleOutlined style={{ fontSize: 32, color: '#722ed1' }} />
                  </div>
                  <div>
                    <Title level={4} style={{ marginTop: 0 }}>Простой расчет</Title>
                    <Paragraph>
                      Никаких сложных формул и скрытых комиссий. Количество пользователей × стоимость тарифа =
                      ваш платеж. Всё прозрачно и понятно.
                    </Paragraph>
                  </div>
                </div>
              </Space>
            </Col>

            <Col xs={24} lg={12}>
              <Card className="comparison-card">
                <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
                  Сравнение стоимости
                </Title>

                <div className="comparison-table">
                  <div className="comparison-row header-row">
                    <div className="comparison-cell">Пользователей</div>
                    <div className="comparison-cell">Месячный</div>
                    <div className="comparison-cell highlight">Годовой</div>
                  </div>

                  <div className="comparison-row">
                    <div className="comparison-cell"><strong>5</strong></div>
                    <div className="comparison-cell">2 500 ₸</div>
                    <div className="comparison-cell highlight"><strong>25 000 ₸</strong></div>
                  </div>

                  <div className="comparison-row">
                    <div className="comparison-cell"><strong>10</strong></div>
                    <div className="comparison-cell">5 000 ₸</div>
                    <div className="comparison-cell highlight"><strong>50 000 ₸</strong></div>
                  </div>

                  <div className="comparison-row">
                    <div className="comparison-cell"><strong>20</strong></div>
                    <div className="comparison-cell">10 000 ₸</div>
                    <div className="comparison-cell highlight"><strong>100 000 ₸</strong></div>
                  </div>

                  <div className="comparison-row">
                    <div className="comparison-cell"><strong>50</strong></div>
                    <div className="comparison-cell">25 000 ₸</div>
                    <div className="comparison-cell highlight"><strong>250 000 ₸</strong></div>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <Text strong style={{ fontSize: 18, color: '#52c41a' }}>
                    💰 Одноразовая оплата годового тарифа — экономия 17%!
                  </Text>
                </div>
              </Card>
            </Col>
          </Row>
        </div>

        {/* FAQ секция */}
        <div className="pricing-faq-section">
          <Title level={2} style={{ textAlign: 'center', marginBottom: 48 }}>
            Часто задаваемые вопросы
          </Title>

          <Row gutter={[32, 32]}>
            <Col xs={24} lg={12}>
              <Card className="faq-card">
                <Title level={4}>Что считается активным пользователем?</Title>
                <Paragraph>
                  Активный пользователь — это сотрудник, который имеет доступ к системе и может работать с проектами.
                  Вы можете деактивировать пользователей в любой момент, и они перестанут учитываться в оплате.
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card className="faq-card">
                <Title level={4}>Можно ли сменить тариф?</Title>
                <Paragraph>
                  Да, вы можете перейти с месячного на годовой тариф в любой момент. При переходе с годового на месячный
                  изменения вступят в силу после окончания оплаченного периода.
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card className="faq-card">
                <Title level={4}>Есть ли пробный период?</Title>
                <Paragraph>
                  Да! Мы предоставляем 90 дней бесплатного использования с полным доступом ко всем функциям.
                  Не требуется банковская карта для активации пробного периода. Вы просто проходите регистрацию.
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card className="faq-card">
                <Title level={4}>Какие способы оплаты доступны?</Title>
                <Paragraph>
                  Мы отправляем Вам удаленный счет на оплату на Kaspi приложение.
                  Для юрлиц отправляем счет на оплату по реквизиту.
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card className="faq-card">
                <Title level={4}>Что происходит с данными после отмены подписки?</Title>
                <Paragraph>
                  Ваши данные хранятся 90 дней после окончания подписки в режиме только для чтения.
                  Вы можете экспортировать все данные в любой момент. После 90 дней данные удаляются.
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card className="faq-card">
                <Title level={4}>Предоставляете ли вы скидки для крупных компаний?</Title>
                <Paragraph>
                  Да, для компаний с более чем 100 пользователями мы готовы обсудить индивидуальные условия.
                  Свяжитесь с нами для получения персонального предложения.
                </Paragraph>
              </Card>
            </Col>
          </Row>
        </div>

        {/* CTA секция */}
        <div className="pricing-cta-section">
          <div className="pricing-cta-content">
            <Title level={2} className="pricing-cta-title">
              Готовы начать?
            </Title>
            <Paragraph className="pricing-cta-description">
              Попробуйте Check Site бесплатно в течение 90 дней.
              Полный доступ ко всем функциям без ввода банковской карты.
            </Paragraph>
            <Space size="large">
              <Button
                type="primary"
                size="large"
                icon={<RocketOutlined />}
                onClick={() => navigate('/register')}
                className="cta-btn-primary"
              >
                Начать бесплатный период
              </Button>
              <Button
                size="large"
                icon={<PhoneOutlined />}
                className="cta-btn-secondary"
              >
                Связаться с нами
              </Button>
            </Space>
          </div>
        </div>
      </Content>

      {/* Футер */}
      <Footer className="pricing-footer">
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
            <Space direction="vertical" size="small">
              <Space>
                <MailOutlined />
                <Text>info@checksite.kz</Text>
              </Space>
              <Space>
                <PhoneOutlined />
                <Text>+7 (777) 123-45-67</Text>
              </Space>
            </Space>
          </Col>
        </Row>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text style={{ color: '#999' }}>
            © 2025 Check Site. Все права защищены.
          </Text>
        </div>
      </Footer>
    </Layout>
  )
}

export default PricingPage
