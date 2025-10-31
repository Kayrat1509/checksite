import { Typography, Card, Row, Col, Descriptions, Avatar, Spin } from 'antd'
import { UserOutlined, MailOutlined, PhoneOutlined, TeamOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { authAPI } from '../api/auth'
import ChangePasswordForm from '../components/ChangePasswordForm'

const { Title } = Typography

// Маппинг ролей на русский язык
const roleNames: Record<string, string> = {
  DIRECTOR: 'Директор',
  CHIEF_ENGINEER: 'Главный инженер',
  PROJECT_MANAGER: 'Руководитель проекта',
  SITE_MANAGER: 'Начальник участка',
  FOREMAN: 'Прораб',
  ENGINEER: 'Инженер ПТО',
  CONTRACTOR: 'Подрядчик',
  SUPERVISOR: 'Надзор',
  OBSERVER: 'Наблюдатель',
  MASTER: 'Мастер'
}

const Profile = () => {
  // Получаем данные текущего пользователя
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authAPI.getCurrentUser
  })

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <Title level={2}>Профиль</Title>

      <Row gutter={[24, 24]}>
        {/* Левая колонка - информация о пользователе */}
        <Col xs={24} lg={12}>
          <Card title="Информация о пользователе">
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Avatar
                size={100}
                icon={<UserOutlined />}
                src={user?.avatar}
                style={{ backgroundColor: '#1890ff' }}
              />
              <Title level={4} style={{ marginTop: 16, marginBottom: 4 }}>
                {user?.full_name || 'Пользователь'}
              </Title>
              <div style={{ color: '#8c8c8c' }}>
                {roleNames[user?.role] || user?.role}
              </div>
            </div>

            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label={<><MailOutlined /> Email</>}>
                {user?.email}
              </Descriptions.Item>

              {user?.secondary_email && (
                <Descriptions.Item label={<><MailOutlined /> Дополнительный email</>}>
                  {user?.secondary_email}
                </Descriptions.Item>
              )}

              {user?.phone && (
                <Descriptions.Item label={<><PhoneOutlined /> Телефон</>}>
                  {user?.phone}
                </Descriptions.Item>
              )}

              {user?.position && (
                <Descriptions.Item label="Должность">
                  {user?.position}
                </Descriptions.Item>
              )}

              {user?.company_name && (
                <Descriptions.Item label={<><TeamOutlined /> Компания</>}>
                  {user?.company_name}
                </Descriptions.Item>
              )}

              {user?.external_company_name && (
                <Descriptions.Item label="Подрядная организация">
                  {user?.external_company_name}
                </Descriptions.Item>
              )}

              {user?.supervision_company && (
                <Descriptions.Item label="Надзорная организация">
                  {user?.supervision_company}
                </Descriptions.Item>
              )}

              {user?.user_projects && user.user_projects.length > 0 && (
                <Descriptions.Item label="Проекты">
                  <div>
                    {user.user_projects.map((project: any) => (
                      <div key={project.id}>• {project.name}</div>
                    ))}
                  </div>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        {/* Правая колонка - форма смены пароля */}
        <Col xs={24} lg={12}>
          <ChangePasswordForm />
        </Col>
      </Row>
    </div>
  )
}

export default Profile
