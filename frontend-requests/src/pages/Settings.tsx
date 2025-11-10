import { Typography, Card, Tabs } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'
import RecycleBin from '../components/RecycleBin'

const { Text } = Typography
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
