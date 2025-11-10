import { Typography, Card, Tabs, Button, Space } from 'antd'
import { DeleteOutlined, FileTextOutlined, ExportOutlined } from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'
import RecycleBin from '../components/RecycleBin'

const { Text, Title, Paragraph } = Typography
const { TabPane } = Tabs

const Settings = () => {
  const { user } = useAuthStore()

  // Проверка доступа к вкладке "Корзина"
  const canAccessRecycleBin = () => {
    if (!user) return false
    const allowedRoles = ['SUPERADMIN', 'DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'CHIEF_POWER_ENGINEER', 'SITE_MANAGER']
    return allowedRoles.includes(user.role)
  }

  return (
    <div>
      <Card>
        <Tabs defaultActiveKey="general">
          {/* Вкладка: Общие настройки */}
          <TabPane
            tab={
              <span>
                Общие
              </span>
            }
            key="general"
          >
            <Text type="secondary">
              Раздел в разработке
            </Text>
          </TabPane>

          {/* Вкладка: Заявки на материалы */}
          <TabPane
            tab={
              <span>
                <FileTextOutlined style={{ marginRight: 8 }} />
                Заявки
              </span>
            }
            key="material-requests"
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={4}>Система согласования заявок на материалы</Title>
                <Paragraph type="secondary">
                  Управление заявками на строительные материалы с поэтапным согласованием
                </Paragraph>
              </div>

              <Button
                type="primary"
                size="large"
                icon={<ExportOutlined />}
                onClick={() => window.open('https://requests.stroyka.asia', '_blank')}
              >
                Открыть систему заявок
              </Button>

              <div style={{ marginTop: '16px' }}>
                <Text type="secondary">
                  Цепочка согласования: Мастер/Прораб → Начальник участка → Инженер ПТО →
                  Руководитель проекта → Главный инженер → Директор → Завсклад → Снабженец →
                  Оплата → Доставка → Отработано
                </Text>
              </div>
            </Space>
          </TabPane>

          {/* Вкладка: Корзина (только для определенных ролей) */}
          {canAccessRecycleBin() && (
            <TabPane
              tab={
                <span>
                  <DeleteOutlined />
                  Корзина
                </span>
              }
              key="recycle-bin"
            >
              <RecycleBin />
            </TabPane>
          )}
        </Tabs>
      </Card>
    </div>
  )
}

export default Settings
