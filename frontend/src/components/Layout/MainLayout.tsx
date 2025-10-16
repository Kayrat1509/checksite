import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Badge, Button } from 'antd'
import {
  DashboardOutlined,
  ProjectOutlined,
  FileTextOutlined,
  UserOutlined,
  BarChartOutlined,
  BellOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
  SafetyOutlined,
  FileProtectOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../stores/authStore'
import { useNotificationStore } from '../../stores/notificationStore'

const { Header, Sider, Content } = Layout

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()

  // Запрещенные роли для доступа к странице пользователей
  const FORBIDDEN_ROLES = ['CONTRACTOR', 'MASTER', 'SUPERVISOR', 'OBSERVER']

  // Проверка доступа к странице пользователей
  const canAccessUsers = () => {
    if (!user) return false
    // Суперадмин всегда имеет доступ
    if (user.is_superuser) return true
    // Запрещенные роли не имеют доступа
    if (FORBIDDEN_ROLES.includes(user.role)) return false
    // Остальные пользователи должны иметь approved=true
    return user.approved === true
  }

  // Проверка доступа к странице подрядчиков
  const canAccessContractors = () => {
    if (!user) return false
    // Суперадмин всегда имеет доступ
    if (user.is_superuser) return true

    // Разрешенные роли для доступа к подрядчикам
    const allowedRoles = [
      'DIRECTOR',           // Директор
      'CHIEF_ENGINEER',     // Главный инженер
      'PROJECT_MANAGER',    // Руководитель проекта
      'SITE_MANAGER',       // Начальник участка
      'ENGINEER'            // Инженер ПТО
    ]

    return allowedRoles.includes(user.role)
  }

  // Проверка доступа к странице надзоров
  const canAccessSupervisions = () => {
    if (!user) return false
    // Суперадмин всегда имеет доступ
    if (user.is_superuser) return true

    // Разрешенные роли для доступа к надзорам
    const allowedRoles = [
      'DIRECTOR',           // Директор
      'CHIEF_ENGINEER',     // Главный инженер
      'PROJECT_MANAGER',    // Руководитель проекта
      'SITE_MANAGER',       // Начальник участка
      'ENGINEER',           // Инженер ПТО
      'FOREMAN'             // Прораб
    ]

    return allowedRoles.includes(user.role)
  }

  // Проверка доступа к странице отчетов (подрядчики не имеют доступа)
  const canAccessReports = () => {
    if (!user) return false
    // Суперадмин всегда имеет доступ
    if (user.is_superuser) return true
    // Подрядчики не имеют доступа к отчетам
    if (user.role === 'CONTRACTOR') return false
    return true
  }

  // Фильтруем меню в зависимости от прав доступа пользователя
  const allMenuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">Дашборд</Link>,
    },
    {
      key: '/dashboard/projects',
      icon: <ProjectOutlined />,
      label: <Link to="/dashboard/projects">Проекты</Link>,
    },
    {
      key: '/dashboard/issues',
      icon: <FileTextOutlined />,
      label: <Link to="/dashboard/issues">Замечания</Link>,
    },
    {
      key: '/dashboard/users',
      icon: <UserOutlined />,
      label: <Link to="/dashboard/users">Сотрудники</Link>,
      // Показываем пункт меню только для разрешенных ролей
      visible: canAccessUsers(),
    },
    {
      key: '/dashboard/contractors',
      icon: <TeamOutlined />,
      label: <Link to="/dashboard/contractors">Подрядчики</Link>,
      // Показываем пункт меню только для разрешенных ролей
      visible: canAccessContractors(),
    },
    {
      key: '/dashboard/supervisions',
      icon: <SafetyOutlined />,
      label: <Link to="/dashboard/supervisions">Надзоры</Link>,
      // Показываем пункт меню только для разрешенных ролей
      visible: canAccessSupervisions(),
    },
    {
      key: '/dashboard/technical-conditions',
      icon: <FileProtectOutlined />,
      label: <Link to="/dashboard/technical-conditions">Техусловия</Link>,
    },
    {
      key: '/dashboard/reports',
      icon: <BarChartOutlined />,
      label: <Link to="/dashboard/reports">Отчеты</Link>,
      // Подрядчики не имеют доступа к отчетам
      visible: canAccessReports(),
    },
  ]

  // Фильтруем меню по полю visible
  const menuItems = allMenuItems.filter(item => item.visible !== false)

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <Link to="/dashboard/profile">Профиль</Link>,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Выйти',
      onClick: logout,
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        onBreakpoint={(broken) => {
          setCollapsed(broken)
        }}
      >
        <div style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '20px',
          fontWeight: 'bold'
        }}>
          {collapsed ? 'CS' : 'Check Site'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>

      <Layout>
        <Header style={{
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Badge count={unreadCount}>
              <Button type="text" icon={<BellOutlined style={{ fontSize: '20px' }} />} />
            </Badge>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <Avatar src={user?.avatar} icon={<UserOutlined />} />
                <span>{user?.full_name}</span>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
