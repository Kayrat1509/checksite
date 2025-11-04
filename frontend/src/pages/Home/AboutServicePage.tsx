import { Button, Layout, Typography, Row, Col, Card, Space, Badge } from 'antd'
import {
  CheckCircleOutlined,
  RocketOutlined,
  TeamOutlined,
  GlobalOutlined,
  TrophyOutlined,
  SafetyOutlined,
  ThunderboltFilled,
  HeartFilled,
  StarFilled,
  BarChartOutlined,
  ClockCircleOutlined,
  HomeOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import './AboutServicePage.css'

const { Header, Content, Footer } = Layout
const { Title, Paragraph, Text } = Typography

const AboutServicePage = () => {
  const navigate = useNavigate()

  return (
    <Layout className="about-service-layout">
      {/* Хедер */}
      <Header className="about-service-header">
        <div className="about-service-header-content">
          <div className="about-service-logo" onClick={() => navigate('/')}>
            <CheckCircleOutlined className="logo-icon" />
            <span className="about-service-logo-text">Check Site</span>
            <Badge count="PRO" style={{ backgroundColor: '#52c41a' }} />
          </div>

          <Space size="middle">
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
          </Space>
        </div>
      </Header>

      <Content className="about-service-content">
        {/* Hero секция */}
        <div className="about-hero">
          <div className="about-hero-content">
            <Badge.Ribbon text="Создано строителями для строителей" color="blue">
              <div className="about-badge">
                <HeartFilled /> Инструмент, рожденный из реальной практики
              </div>
            </Badge.Ribbon>

            <Title level={1} className="about-hero-title">
              Check&nbsp;Site — это не просто цифровая платформа
            </Title>

            <Paragraph className="about-hero-description">
              Это инструмент, созданный строителями для строителей,
              рожденный из реальной практики, ежедневных задач и потребности навести порядок в хаосе стройплощадки.
            </Paragraph>
          </div>
        </div>

        {/* Почему это важно */}
        <div className="importance-section">
          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={14}>
              <Title level={2}>Контроль качества и прозрачность процессов решают всё</Title>
              <Paragraph className="large-text">
                Сегодня каждая строительная компания — от небольшого подрядчика до международного холдинга — понимает:
                <strong> контроль качества и прозрачность процессов решают всё.</strong>
              </Paragraph>
              <Paragraph className="large-text">
                Ошибки на этапе контроля обходятся дорого, а потерянное время — ещё дороже.
              </Paragraph>
              <Paragraph className="large-text highlight-text">
                Check Site помогает сократить расходы, повысить дисциплину и вывести взаимодействие всех участников проекта на новый уровень.
              </Paragraph>
            </Col>

            <Col xs={24} lg={10}>
              <Card className="benefits-quick-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div style={{ textAlign: 'center', color: '#fff' }}>
                    <FileTextOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                    <Title level={3} style={{ color: '#fff', marginTop: 0 }}>
                      Всё под рукой
                    </Title>
                  </div>
                  <Paragraph style={{ color: '#fff', fontSize: 16, lineHeight: 1.8, marginBottom: 0 }}>
                    Каждый акт, фотоотчёт, замечание и документ теперь всегда под рукой —
                    в несколько кликов, без ватсап-групп и бесконечных бумажных отчётов.
                  </Paragraph>
                </Space>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Кто создал */}
        <div className="creators-section">
          <div className="section-header">
            <Title level={2}>Создан профессионалами, проверено практикой</Title>
            <Paragraph className="section-subtitle" style={{ fontSize: 18, maxWidth: 900, margin: '0 auto' }}>
              При разработке Check Site участвовали инженеры и специалисты с опытом более 15 лет в строительстве.
              Это команда практиков из Казахстана, России и Узбекистана — людей, которые знают стройку изнутри.
            </Paragraph>
          </div>

          <Row gutter={[32, 32]} style={{ marginTop: 48 }}>
            <Col xs={24} md={8}>
              <Card className="creator-card" hoverable>
                <div className="creator-icon">
                  <GlobalOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                </div>
                <Title level={3}>Казахстан</Title>
                <Paragraph>
                  Начальники участков, руководители проектов и главные инженеры.
                  Опыт управления крупнейшими объектами страны.
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card className="creator-card" hoverable>
                <div className="creator-icon">
                  <GlobalOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                </div>
                <Title level={3}>Россия</Title>
                <Paragraph>
                  Директора по техническим вопросам федеральных подрядчиков.
                  Эксперты в организации масштабных проектов.
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card className="creator-card" hoverable>
                <div className="creator-icon">
                  <GlobalOutlined style={{ fontSize: 48, color: '#722ed1' }} />
                </div>
                <Title level={3}>Узбекистан</Title>
                <Paragraph>
                  Международные технадзоры с опытом контроля качества
                  на объектах мирового уровня.
                </Paragraph>
              </Card>
            </Col>
          </Row>

          {/* Боль, которая привела к созданию */}
          <Card className="pain-card" style={{ marginTop: 48, background: '#fff7e6', border: '2px solid #faad14' }}>
            <Row gutter={[32, 32]} align="middle">
              <Col xs={24} lg={12}>
                <Title level={3} style={{ color: '#fa8c16' }}>
                  Каждый из них сталкивался с одной и той же болью
                </Title>
              </Col>
              <Col xs={24} lg={12}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Paragraph className="large-text" style={{ marginBottom: 8 }}>
                    ❌ Отчёты теряются
                  </Paragraph>
                  <Paragraph className="large-text" style={{ marginBottom: 8 }}>
                    ❌ Фотографии не находятся
                  </Paragraph>
                  <Paragraph className="large-text" style={{ marginBottom: 8 }}>
                    ❌ Задачи путаются
                  </Paragraph>
                  <Paragraph className="large-text" style={{ marginBottom: 0 }}>
                    ❌ Документы и замечания живут в сотнях чатов и мессенджеров
                  </Paragraph>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Решение */}
          <Card className="solution-card" style={{ marginTop: 32, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', border: 'none' }}>
            <div style={{ textAlign: 'center', color: '#fff' }}>
              <Title level={2} style={{ color: '#fff', marginTop: 0, fontSize: 32 }}>
                Мы устали искать документы в телефоне.<br />
                Мы устали зависеть от случайности.
              </Title>
              <Title level={2} style={{ color: '#fff', marginTop: 24, fontSize: 36 }}>
                Поэтому мы решили — создадим систему для себя.
              </Title>
            </div>
          </Card>
        </div>

        {/* История роста */}
        <div className="growth-section">
          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={12}>
              <ClockCircleOutlined style={{ fontSize: 72, color: '#1890ff', marginBottom: 24 }} />
              <Title level={2}>Из личной потребности — в масштабный проект</Title>
              <Paragraph className="large-text">
                Сначала <strong>Check Site был внутренним инструментом</strong>.
              </Paragraph>
              <Paragraph className="large-text">
                Но когда коллеги из других компаний увидели, как мы решаем свои задачи,
                все захотели внедрить его у себя.
              </Paragraph>
              <Paragraph className="large-text highlight-text">
                Так родилась идея вывести сервис в продакшн и сделать его доступным каждому.
              </Paragraph>
            </Col>

            <Col xs={24} lg={12}>
              <Card className="pricing-philosophy-card" style={{ background: '#f6ffed', border: '2px solid #52c41a' }}>
                <TrophyOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 24 }} />
                <Title level={3} style={{ color: '#52c41a' }}>
                  Честная цена без накрутки
                </Title>
                <Paragraph style={{ fontSize: 18, lineHeight: 1.8 }}>
                  Мы не гонимся за прибылью — <strong>стоимость тарифов покрывает только аренду серверов</strong>.
                </Paragraph>
                <Paragraph style={{ fontSize: 18, lineHeight: 1.8, marginBottom: 0 }}>
                  Главное для нас — чтобы строительные компании любого масштаба
                  могли работать системно, эффективно и современно.
                </Paragraph>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Будущее развитие */}
        <div className="future-section">
          <div className="section-header">
            <Title level={2}>Будущее вместе с профессионалами</Title>
            <Paragraph className="section-subtitle" style={{ fontSize: 18, maxWidth: 900, margin: '0 auto' }}>
              Check Site будет развиваться и совершенствоваться вместе с реальными инженерами,
              работающими на объектах по всему миру.
            </Paragraph>
          </div>

          <Row gutter={[32, 32]} style={{ marginTop: 48 }}>
            <Col xs={24} md={12}>
              <Card className="development-card" hoverable>
                <TeamOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 24 }} />
                <Title level={3}>Слушаем тех, кто строит</Title>
                <Paragraph className="large-text">
                  Мы слушаем тех, кто строит, кто управляет, кто отвечает за качество и сроки.
                </Paragraph>
                <Paragraph className="large-text">
                  <strong>Каждое обновление</strong> — это отражение опыта людей,
                  которые не просто знают стройку, а живут ею каждый день.
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card className="development-card" hoverable>
                <ThunderboltFilled style={{ fontSize: 48, color: '#faad14', marginBottom: 24 }} />
                <Title level={3}>Бесплатная реализация идей</Title>
                <Paragraph className="large-text">
                  Уже реализовано более <strong>30 предложений от пользователей</strong>.
                </Paragraph>
                <Paragraph className="large-text">
                  Хотите новую функцию? Напишите нам. Если она полезна для индустрии —
                  мы её сделаем <strong>БЕСПЛАТНО за короткий срок!</strong>
                </Paragraph>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Финальное заявление */}
        <div className="final-statement-section">
          <Card className="final-statement-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}>
            <Row gutter={[48, 48]} align="middle">
              <Col xs={24} lg={10} style={{ textAlign: 'center' }}>
                <SafetyOutlined style={{ fontSize: 120, color: '#fff' }} />
              </Col>
              <Col xs={24} lg={14}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <div>
                    <StarFilled style={{ fontSize: 32, color: '#ffd700', marginRight: 12 }} />
                    <Text style={{ color: '#fff', fontSize: 24, fontWeight: 600 }}>
                      Check Site — это цифровой порядок на вашей стройке
                    </Text>
                  </div>
                  <div>
                    <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a', marginRight: 12 }} />
                    <Text style={{ color: '#fff', fontSize: 24, fontWeight: 600 }}>
                      Это ваша уверенность, что всё под контролем
                    </Text>
                  </div>
                  <div>
                    <BarChartOutlined style={{ fontSize: 32, color: '#ffd700', marginRight: 12 }} />
                    <Text style={{ color: '#fff', fontSize: 24, fontWeight: 600 }}>
                      Это новый стандарт прозрачности и профессионализма в строительстве
                    </Text>
                  </div>
                </Space>
              </Col>
            </Row>
          </Card>
        </div>

        {/* CTA секция */}
        <div className="about-cta-section">
          <div className="about-cta-content">
            <Title level={2} className="about-cta-title">
              Присоединяйтесь к профессионалам
            </Title>
            <Paragraph className="about-cta-description">
              Попробуйте Check Site бесплатно 60 дней. Без банковских карт.
              Просто зарегистрируйтесь и начните работать системно.
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
                onClick={() => navigate('/pricing')}
                className="cta-btn-secondary"
              >
                Посмотреть тарифы
              </Button>
            </Space>
          </div>
        </div>
      </Content>

      {/* Футер */}
      <Footer className="about-service-footer">
        <Row justify="space-between" align="middle">
          <Col xs={24} md={12} style={{ textAlign: 'center', marginBottom: 16 }}>
            <div className="footer-logo">
              <CheckCircleOutlined style={{ fontSize: 32, color: '#1890ff' }} />
              <Text strong style={{ fontSize: 20, marginLeft: 12 }}>Check Site</Text>
            </div>
            <Paragraph style={{ margin: '8px 0 0', color: '#666' }}>
              Создано строителями для строителей
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

export default AboutServicePage
