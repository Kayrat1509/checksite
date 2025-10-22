import { Button, Layout, Typography, Row, Col, Card, Space, Badge, Timeline, Steps } from 'antd'
import {
  CheckCircleOutlined,
  RocketOutlined,
  DashboardOutlined,
  ProjectOutlined,
  FileTextOutlined,
  UserOutlined,
  TeamOutlined,
  SafetyOutlined,
  FileProtectOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  BarChartOutlined,
  HomeOutlined,
  ArrowRightOutlined,
  LoginOutlined,
  FormOutlined,
  BellOutlined,
  CameraOutlined,
  FilePdfOutlined,
  CloudUploadOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import './FeaturesPage.css'

const { Header, Content, Footer } = Layout
const { Title, Paragraph, Text } = Typography

const FeaturesPage = () => {
  const navigate = useNavigate()

  return (
    <Layout className="features-layout">
      {/* Хедер */}
      <Header className="features-header">
        <div className="features-header-content">
          <div className="features-logo" onClick={() => navigate('/')}>
            <CheckCircleOutlined className="logo-icon" />
            <span className="features-logo-text">Check Site</span>
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

      <Content className="features-content">
        {/* Hero секция */}
        <div className="features-hero">
          <div className="features-hero-content">
            <Badge.Ribbon text="Полное руководство" color="purple">
              <div className="features-badge">
                <FormOutlined /> Все функции системы
              </div>
            </Badge.Ribbon>

            <Title level={1} className="features-hero-title">
              Как работает Check&nbsp;Site
            </Title>

            <Paragraph className="features-hero-description">
              Пошаговое описание всех функций системы — от регистрации до генерации отчетов.
              Узнайте, как каждый модуль помогает вам контролировать качество строительства.
            </Paragraph>
          </div>
        </div>

        {/* Шаг 1: Регистрация и начало работы */}
        <div className="feature-section">
          <div className="section-header">
            <Badge count="1" style={{ backgroundColor: '#1890ff' }} />
            <Title level={2} style={{ marginLeft: 16 }}>Регистрация и начало работы</Title>
          </div>

          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={12}>
              <Card className="feature-card">
                <LoginOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 24 }} />
                <Title level={3}>Быстрая регистрация</Title>
                <Paragraph className="large-text">
                  Регистрация занимает всего <strong>2 минуты</strong>. Укажите email, создайте пароль,
                  выберите роль и название компании.
                </Paragraph>
                <Paragraph className="large-text">
                  После регистрации вы получаете <strong>90 дней бесплатного доступа</strong> ко всем функциям системы.
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card className="workflow-card" style={{ background: '#f0f5ff', border: '2px solid #1890ff' }}>
                <Steps
                  direction="vertical"
                  size="small"
                  current={-1}
                  items={[
                    {
                      title: 'Заполнение формы',
                      description: 'Email, пароль, роль, компания',
                      icon: <FormOutlined />
                    },
                    {
                      title: 'Подтверждение email',
                      description: 'Переход по ссылке из письма',
                      icon: <CheckCircleOutlined />
                    },
                    {
                      title: 'Вход в систему',
                      description: 'Доступ к личному кабинету',
                      icon: <LoginOutlined />
                    }
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </div>

        {/* Шаг 2: Дашборд */}
        <div className="feature-section">
          <div className="section-header">
            <Badge count="2" style={{ backgroundColor: '#52c41a' }} />
            <Title level={2} style={{ marginLeft: 16 }}>Дашборд — Центр управления</Title>
          </div>

          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={12}>
              <Card className="feature-card">
                <DashboardOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 24 }} />
                <Title level={3}>Вся информация в одном месте</Title>
                <Paragraph className="large-text">
                  Главная страница показывает ключевые метрики по всем вашим проектам:
                </Paragraph>
                <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 16 }}>
                  <div className="metric-item">
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                    <Text strong>Общее количество замечаний и их статусы</Text>
                  </div>
                  <div className="metric-item">
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                    <Text strong>Активные проекты и участки</Text>
                  </div>
                  <div className="metric-item">
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                    <Text strong>Просроченные задачи</Text>
                  </div>
                  <div className="metric-item">
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                    <Text strong>Статистика по подрядчикам</Text>
                  </div>
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card className="preview-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}>
                <div style={{ textAlign: 'center', color: '#fff' }}>
                  <BarChartOutlined style={{ fontSize: 80, marginBottom: 24 }} />
                  <Title level={3} style={{ color: '#fff' }}>Визуальная аналитика</Title>
                  <Paragraph style={{ color: '#fff', fontSize: 16, lineHeight: 1.8 }}>
                    Графики, диаграммы и таблицы обновляются в реальном времени,
                    показывая актуальное состояние всех процессов.
                  </Paragraph>
                </div>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Шаг 3: Проекты */}
        <div className="feature-section">
          <div className="section-header">
            <Badge count="3" style={{ backgroundColor: '#722ed1' }} />
            <Title level={2} style={{ marginLeft: 16 }}>Проекты — Управление объектами</Title>
          </div>

          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={12}>
              <Card className="feature-card">
                <ProjectOutlined style={{ fontSize: 48, color: '#722ed1', marginBottom: 24 }} />
                <Title level={3}>Структура проекта</Title>
                <Paragraph className="large-text">
                  Каждый проект содержит:
                </Paragraph>
                <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 16 }}>
                  <div className="metric-item">
                    <ArrowRightOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                    <Text strong>Основная информация (название, адрес, сроки)</Text>
                  </div>
                  <div className="metric-item">
                    <ArrowRightOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                    <Text strong>Участки (разделение на зоны)</Text>
                  </div>
                  <div className="metric-item">
                    <ArrowRightOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                    <Text strong>Категории замечаний (СМР, ОВиК, ВК и т.д.)</Text>
                  </div>
                  <div className="metric-item">
                    <ArrowRightOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                    <Text strong>Команда проекта (назначение ответственных)</Text>
                  </div>
                  <div className="metric-item">
                    <ArrowRightOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                    <Text strong>Документация и чертежи</Text>
                  </div>
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card className="workflow-card" style={{ background: '#f9f0ff', border: '2px solid #722ed1' }}>
                <Title level={4} style={{ color: '#722ed1' }}>Логика работы</Title>
                <Timeline
                  items={[
                    {
                      color: 'purple',
                      children: (
                        <>
                          <Text strong>Создание проекта</Text>
                          <Paragraph style={{ marginTop: 8 }}>Указываете основные данные объекта</Paragraph>
                        </>
                      )
                    },
                    {
                      color: 'purple',
                      children: (
                        <>
                          <Text strong>Добавление участков</Text>
                          <Paragraph style={{ marginTop: 8 }}>Делите объект на логические зоны</Paragraph>
                        </>
                      )
                    },
                    {
                      color: 'purple',
                      children: (
                        <>
                          <Text strong>Настройка категорий</Text>
                          <Paragraph style={{ marginTop: 8 }}>Определяете типы работ для классификации</Paragraph>
                        </>
                      )
                    },
                    {
                      color: 'purple',
                      children: (
                        <>
                          <Text strong>Назначение команды</Text>
                          <Paragraph style={{ marginTop: 8 }}>Добавляете сотрудников и подрядчиков</Paragraph>
                        </>
                      )
                    }
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </div>

        {/* Шаг 4: Замечания */}
        <div className="feature-section">
          <div className="section-header">
            <Badge count="4" style={{ backgroundColor: '#f5222d' }} />
            <Title level={2} style={{ marginLeft: 16 }}>Замечания — Фиксация дефектов</Title>
          </div>

          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={14}>
              <Card className="feature-card">
                <FileTextOutlined style={{ fontSize: 48, color: '#f5222d', marginBottom: 24 }} />
                <Title level={3}>Создание замечания за 60 секунд</Title>
                <Paragraph className="large-text">
                  Система позволяет быстро зафиксировать любой дефект на объекте:
                </Paragraph>
                <Space direction="vertical" size="large" style={{ width: '100%', marginTop: 24 }}>
                  <Card className="step-mini-card" style={{ background: '#fff1f0', border: '1px solid #ffa39e' }}>
                    <CameraOutlined style={{ fontSize: 32, color: '#f5222d', marginBottom: 12 }} />
                    <Title level={5}>1. Фото "До"</Title>
                    <Paragraph>Сфотографируйте дефект прямо в приложении</Paragraph>
                  </Card>

                  <Card className="step-mini-card" style={{ background: '#fff1f0', border: '1px solid #ffa39e' }}>
                    <FormOutlined style={{ fontSize: 32, color: '#f5222d', marginBottom: 12 }} />
                    <Title level={5}>2. Описание</Title>
                    <Paragraph>Укажите проект, участок, категорию и опишите проблему</Paragraph>
                  </Card>

                  <Card className="step-mini-card" style={{ background: '#fff1f0', border: '1px solid #ffa39e' }}>
                    <UserOutlined style={{ fontSize: 32, color: '#f5222d', marginBottom: 12 }} />
                    <Title level={5}>3. Назначение</Title>
                    <Paragraph>Выберите ответственного подрядчика и установите срок</Paragraph>
                  </Card>

                  <Card className="step-mini-card" style={{ background: '#fff1f0', border: '1px solid #ffa39e' }}>
                    <BellOutlined style={{ fontSize: 32, color: '#f5222d', marginBottom: 12 }} />
                    <Title level={5}>4. Уведомление</Title>
                    <Paragraph>Подрядчик мгновенно получает Push-уведомление в мобильное приложение</Paragraph>
                  </Card>
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={10}>
              <Card className="workflow-card" style={{ background: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)', border: 'none' }}>
                <div style={{ textAlign: 'center', color: '#fff' }}>
                  <Title level={3} style={{ color: '#fff' }}>Жизненный цикл замечания</Title>
                  <Steps
                    direction="vertical"
                    current={-1}
                    items={[
                      {
                        title: <Text style={{ color: '#fff' }}>Новое</Text>,
                        description: <Text style={{ color: '#fff', opacity: 0.9 }}>Создано инженером</Text>
                      },
                      {
                        title: <Text style={{ color: '#fff' }}>В процессе</Text>,
                        description: <Text style={{ color: '#fff', opacity: 0.9 }}>Подрядчик работает</Text>
                      },
                      {
                        title: <Text style={{ color: '#fff' }}>На проверке</Text>,
                        description: <Text style={{ color: '#fff', opacity: 0.9 }}>Загружено фото "После"</Text>
                      },
                      {
                        title: <Text style={{ color: '#fff' }}>Исполнено</Text>,
                        description: <Text style={{ color: '#fff', opacity: 0.9 }}>Принято инженером</Text>
                      }
                    ]}
                  />
                </div>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Шаг 5: Сотрудники */}
        <div className="feature-section">
          <div className="section-header">
            <Badge count="5" style={{ backgroundColor: '#13c2c2' }} />
            <Title level={2} style={{ marginLeft: 16 }}>Сотрудники — Управление командой</Title>
          </div>

          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={12}>
              <Card className="feature-card">
                <UserOutlined style={{ fontSize: 48, color: '#13c2c2', marginBottom: 24 }} />
                <Title level={3}>Ролевая система доступа</Title>
                <Paragraph className="large-text">
                  В системе реализовано <strong>13 ролей</strong> с разными уровнями доступа:
                </Paragraph>
                <Paragraph className="large-text" style={{ color: '#52c41a', fontWeight: 600 }}>
                  (По просьбе можем добавить еще роли БЕСПЛАТНО)
                </Paragraph>
                <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                  <Col span={12}>
                    <div className="role-badge">Директор</div>
                    <div className="role-badge">Главный инженер</div>
                    <div className="role-badge">Руководитель проекта</div>
                    <div className="role-badge">Начальник участка</div>
                    <div className="role-badge">Инженер ПТО</div>
                    <div className="role-badge">Прораб</div>
                    <div className="role-badge">Мастер</div>
                  </Col>
                  <Col span={12}>
                    <div className="role-badge">Снабженец</div>
                    <div className="role-badge">Зав. Центрсклада</div>
                    <div className="role-badge">Технадзор</div>
                    <div className="role-badge">Авторский надзор</div>
                    <div className="role-badge">Наблюдатель</div>
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card className="feature-highlight" style={{ background: '#e6fffb', border: '2px solid #13c2c2' }}>
                <Title level={4} style={{ color: '#13c2c2' }}>Права доступа настраиваются автоматически</Title>
                <Paragraph className="large-text">
                  Каждая роль видит только те разделы, которые необходимы для её работы:
                </Paragraph>
                <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 16 }}>
                  <div>
                    <Text strong>Руководство</Text> — полный доступ ко всем данным
                  </div>
                  <div>
                    <Text strong>ИТР</Text> — создание замечаний, заявок, отчетов
                  </div>
                  <div>
                    <Text strong>Снабжение</Text> — работа с заявками на материалы
                  </div>
                  <div>
                    <Text strong>Технадзор</Text> — контроль качества и создание замечаний
                  </div>
                  <div>
                    <Text strong>Авторский надзор</Text> — контроль соответствия проекту
                  </div>
                  <div>
                    <Text strong>Подрядчики</Text> — просмотр своих замечаний
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Шаг 6: Подрядчики */}
        <div className="feature-section">
          <div className="section-header">
            <Badge count="6" style={{ backgroundColor: '#faad14' }} />
            <Title level={2} style={{ marginLeft: 16 }}>Подрядчики — База исполнителей</Title>
          </div>

          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={12}>
              <Card className="feature-card">
                <TeamOutlined style={{ fontSize: 48, color: '#faad14', marginBottom: 24 }} />
                <Title level={3}>Централизованная база</Title>
                <Paragraph className="large-text">
                  Вся информация о подрядчиках в одном месте:
                </Paragraph>
                <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 16 }}>
                  <div className="metric-item">
                    <CheckCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
                    <Text strong>Контактные данные (телефон, email, Telegram)</Text>
                  </div>
                  <div className="metric-item">
                    <CheckCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
                    <Text strong>Специализация (виды работ)</Text>
                  </div>
                  <div className="metric-item">
                    <CheckCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
                    <Text strong>Статистика выполнения замечаний</Text>
                  </div>
                  <div className="metric-item">
                    <CheckCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
                    <Text strong>Привязка к проектам</Text>
                  </div>
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card className="feature-highlight" style={{ background: '#fffbe6', border: '2px solid #faad14' }}>
                <Title level={4} style={{ color: '#fa8c16' }}>KPI подрядчиков</Title>
                <Paragraph className="large-text">
                  Система автоматически считает эффективность каждого подрядчика:
                </Paragraph>
                <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 16 }}>
                  <div>
                    📊 <Text strong>Процент выполненных в срок</Text>
                  </div>
                  <div>
                    ⏱️ <Text strong>Среднее время устранения</Text>
                  </div>
                  <div>
                    ✅ <Text strong>Процент принятых с первого раза</Text>
                  </div>
                  <div>
                    ❌ <Text strong>Количество просрочек</Text>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Шаг 7: Надзоры */}
        <div className="feature-section">
          <div className="section-header">
            <Badge count="7" style={{ backgroundColor: '#eb2f96' }} />
            <Title level={2} style={{ marginLeft: 16 }}>Надзоры — Внешний контроль</Title>
          </div>

          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={12}>
              <Card className="feature-card">
                <SafetyOutlined style={{ fontSize: 48, color: '#eb2f96', marginBottom: 24 }} />
                <Title level={3}>Технический и авторский надзор</Title>
                <Paragraph className="large-text">
                  Специальные аккаунты для представителей заказчика и проектной организации:
                </Paragraph>
                <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 16 }}>
                  <div className="metric-item">
                    <ArrowRightOutlined style={{ color: '#eb2f96', marginRight: 8 }} />
                    <Text strong>Доступ только к своим проектам</Text>
                  </div>
                  <div className="metric-item">
                    <ArrowRightOutlined style={{ color: '#eb2f96', marginRight: 8 }} />
                    <Text strong>Просмотр всех замечаний и отчетов</Text>
                  </div>
                  <div className="metric-item">
                    <ArrowRightOutlined style={{ color: '#eb2f96', marginRight: 8 }} />
                    <Text strong>Возможность создавать замечания</Text>
                  </div>
                  <div className="metric-item">
                    <ArrowRightOutlined style={{ color: '#eb2f96', marginRight: 8 }} />
                    <Text strong>Контроль сроков и качества</Text>
                  </div>
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card className="preview-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', border: 'none' }}>
                <div style={{ textAlign: 'center', color: '#fff' }}>
                  <SafetyOutlined style={{ fontSize: 80, marginBottom: 24 }} />
                  <Title level={3} style={{ color: '#fff' }}>Прозрачность для заказчика</Title>
                  <Paragraph style={{ color: '#fff', fontSize: 16, lineHeight: 1.8 }}>
                    Заказчик в любой момент может зайти в систему и увидеть реальное состояние объекта:
                    какие работы выполнены, какие замечания устранены, что находится в процессе.
                  </Paragraph>
                </div>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Шаг 8: Техусловия */}
        <div className="feature-section">
          <div className="section-header">
            <Badge count="8" style={{ backgroundColor: '#722ed1' }} />
            <Title level={2} style={{ marginLeft: 16 }}>Техусловия — База знаний</Title>
          </div>

          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={12}>
              <Card className="feature-card">
                <FileProtectOutlined style={{ fontSize: 48, color: '#722ed1', marginBottom: 24 }} />
                <Title level={3}>Централизованное хранилище документов</Title>
                <Paragraph className="large-text">
                  Все технические условия, СНиПы, регламенты и инструкции в одном месте:
                </Paragraph>
                <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 16 }}>
                  <div className="metric-item">
                    <CloudUploadOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                    <Text strong>Загрузка документов PDF</Text>
                  </div>
                  <div className="metric-item">
                    <CloudUploadOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                    <Text strong>Категоризация по типам работ</Text>
                  </div>
                  <div className="metric-item">
                    <CloudUploadOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                    <Text strong>Привязка к проектам</Text>
                  </div>
                  <div className="metric-item">
                    <CloudUploadOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                    <Text strong>Быстрый поиск по названию</Text>
                  </div>
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card className="feature-highlight" style={{ background: '#f9f0ff', border: '2px solid #722ed1' }}>
                <Title level={4} style={{ color: '#722ed1' }}>Всегда под рукой</Title>
                <Paragraph className="large-text">
                  Больше не нужно искать техусловия в папках на компьютере или в архивах.
                </Paragraph>
                <Paragraph className="large-text">
                  Вся команда проекта имеет мгновенный доступ к актуальной документации
                  с любого устройства — компьютера, планшета или смартфона.
                </Paragraph>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Шаг 9: Заявки на материалы */}
        <div className="feature-section">
          <div className="section-header">
            <Badge count="9" style={{ backgroundColor: '#fa8c16' }} />
            <Title level={2} style={{ marginLeft: 16 }}>Заявки на материалы — Контроль закупок</Title>
          </div>

          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={14}>
              <Card className="feature-card">
                <ShoppingCartOutlined style={{ fontSize: 48, color: '#fa8c16', marginBottom: 24 }} />
                <Title level={3}>Поэтапное согласование заявок</Title>
                <Paragraph className="large-text">
                  Система контролирует весь процесс от создания заявки прорабом, начальником участка до приема на объекте.
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} lg={10}>
              <Card className="feature-highlight" style={{ background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', border: 'none' }}>
                <div style={{ textAlign: 'center', color: '#fff' }}>
                  <Title level={3} style={{ color: '#fff' }}>Полный контроль</Title>
                  <Paragraph style={{ color: '#fff', fontSize: 16, lineHeight: 1.8 }}>
                    Каждый участник видит статус заявки и может отклонить её на любом этапе с комментарием.
                  </Paragraph>
                  <Paragraph style={{ color: '#fff', fontSize: 16, lineHeight: 1.8 }}>
                    Все действия записываются в историю. Руководство всегда знает,
                    на каком этапе находится каждая заявка.
                  </Paragraph>
                </div>
              </Card>

              <Card className="feature-highlight" style={{ background: '#fff7e6', border: '2px solid #fa8c16', marginTop: 24 }}>
                <Title level={4} style={{ color: '#fa8c16' }}>Уведомления</Title>
                <Paragraph>
                  Каждый участник получает Push-уведомление, когда заявка доходит до него.
                  Никто не пропустит свою очередь согласования.
                </Paragraph>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Шаг 10: Тендеры */}
        <div className="feature-section">
          <div className="section-header">
            <Badge count="10" style={{ backgroundColor: '#faad14' }} />
            <Title level={2} style={{ marginLeft: 16 }}>Тендеры — Поиск поставщиков и подрядчиков</Title>
          </div>

          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={12}>
              <Card className="feature-card">
                <DollarOutlined style={{ fontSize: 48, color: '#faad14', marginBottom: 24 }} />
                <Title level={3}>Публикация тендеров</Title>
                <Paragraph className="large-text">
                  Опубликуйте тендер на материалы, работы, оборудование или услуги.
                  Ваше объявление увидят сотни компаний из Казахстана, России, Узбекистана,
                  Киргизии, Таджикистана и Беларуси.
                </Paragraph>
                <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 16 }}>
                  <div className="metric-item">
                    <CheckCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
                    <Text strong>Создание за 2 минуты</Text>
                  </div>
                  <div className="metric-item">
                    <CheckCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
                    <Text strong>Доступ к базе подрядчиков СНГ</Text>
                  </div>
                  <div className="metric-item">
                    <CheckCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
                    <Text strong>Получение предложений напрямую</Text>
                  </div>
                  <div className="metric-item">
                    <CheckCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
                    <Text strong>Сравнение и выбор лучшего</Text>
                  </div>
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card className="preview-card" style={{ background: 'linear-gradient(135deg, #fa8c16 0%, #faad14 100%)', border: 'none' }}>
                <div style={{ textAlign: 'center', color: '#fff' }}>
                  <DollarOutlined style={{ fontSize: 80, marginBottom: 24 }} />
                  <Title level={3} style={{ color: '#fff' }}>Больше предложений = лучшая цена</Title>
                  <Paragraph style={{ color: '#fff', fontSize: 16, lineHeight: 1.8 }}>
                    Чем больше компаний увидят ваш тендер, тем более конкурентные цены вы получите.
                  </Paragraph>
                  <Paragraph style={{ color: '#fff', fontSize: 16, lineHeight: 1.8 }}>
                    Система автоматически уведомляет подходящих подрядчиков по категории работ.
                  </Paragraph>
                </div>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Шаг 11: Отчеты */}
        <div className="feature-section">
          <div className="section-header">
            <Badge count="11" style={{ backgroundColor: '#1890ff' }} />
            <Title level={2} style={{ marginLeft: 16 }}>Отчеты — Аналитика и экспорт</Title>
          </div>

          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={12}>
              <Card className="feature-card">
                <BarChartOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 24 }} />
                <Title level={3}>Автоматическая генерация отчетов</Title>
                <Paragraph className="large-text">
                  Система формирует различные виды отчетов одним кликом:
                </Paragraph>
                <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 16 }}>
                  <div className="metric-item">
                    <FilePdfOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                    <Text strong>Отчет по замечаниям (PDF с фото)</Text>
                  </div>
                  <div className="metric-item">
                    <FilePdfOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                    <Text strong>Статистика по проектам (Excel)</Text>
                  </div>
                  <div className="metric-item">
                    <FilePdfOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                    <Text strong>KPI подрядчиков (таблицы, графики)</Text>
                  </div>
                  <div className="metric-item">
                    <FilePdfOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                    <Text strong>Отчет по заявкам на материалы</Text>
                  </div>
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card className="feature-highlight" style={{ background: '#f0f5ff', border: '2px solid #1890ff' }}>
                <Title level={4} style={{ color: '#1890ff' }}>Фильтры и настройки</Title>
                <Paragraph className="large-text">
                  Настройте отчет под свои нужды:
                </Paragraph>
                <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 16 }}>
                  <div>
                    📅 <Text strong>Период (день, неделя, месяц, год)</Text>
                  </div>
                  <div>
                    🏗️ <Text strong>Проект или участок</Text>
                  </div>
                  <div>
                    👷 <Text strong>Ответственный или подрядчик</Text>
                  </div>
                  <div>
                    📊 <Text strong>Статус или категория</Text>
                  </div>
                </Space>
                <Paragraph className="large-text" style={{ marginTop: 24 }}>
                  Все отчеты можно скачать в формате <strong>PDF или Excel</strong>.
                </Paragraph>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Итоговая схема */}
        <div className="final-workflow-section">
          <div className="section-header">
            <Title level={2}>Полная схема работы системы</Title>
            <Paragraph className="section-subtitle">
              Все модули работают вместе, обеспечивая полный контроль над строительством
            </Paragraph>
          </div>

          <Card className="final-workflow-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}>
            <Row gutter={[32, 32]}>
              <Col xs={24} md={12} lg={6}>
                <div className="workflow-module">
                  <ProjectOutlined style={{ fontSize: 48, color: '#fff', marginBottom: 16 }} />
                  <Title level={4} style={{ color: '#fff' }}>Проекты</Title>
                  <Text style={{ color: '#fff' }}>Создание структуры</Text>
                </div>
              </Col>
              <Col xs={24} md={12} lg={6}>
                <div className="workflow-module">
                  <FileTextOutlined style={{ fontSize: 48, color: '#fff', marginBottom: 16 }} />
                  <Title level={4} style={{ color: '#fff' }}>Замечания</Title>
                  <Text style={{ color: '#fff' }}>Фиксация дефектов</Text>
                </div>
              </Col>
              <Col xs={24} md={12} lg={6}>
                <div className="workflow-module">
                  <ShoppingCartOutlined style={{ fontSize: 48, color: '#fff', marginBottom: 16 }} />
                  <Title level={4} style={{ color: '#fff' }}>Заявки</Title>
                  <Text style={{ color: '#fff' }}>Контроль закупок</Text>
                </div>
              </Col>
              <Col xs={24} md={12} lg={6}>
                <div className="workflow-module">
                  <BarChartOutlined style={{ fontSize: 48, color: '#fff', marginBottom: 16 }} />
                  <Title level={4} style={{ color: '#fff' }}>Отчеты</Title>
                  <Text style={{ color: '#fff' }}>Анализ и экспорт</Text>
                </div>
              </Col>
            </Row>

            <div style={{ textAlign: 'center', marginTop: 48 }}>
              <Title level={3} style={{ color: '#fff' }}>
                = Полный цифровой контроль вашего строительства
              </Title>
            </div>
          </Card>
        </div>

        {/* CTA секция */}
        <div className="features-cta-section">
          <div className="features-cta-content">
            <Title level={2} className="features-cta-title">
              Готовы попробовать?
            </Title>
            <Paragraph className="features-cta-description">
              Зарегистрируйтесь сейчас и получите 90 дней бесплатного доступа ко всем функциям.
              Без банковских карт. Просто email и пароль.
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
      <Footer className="features-footer">
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

export default FeaturesPage
