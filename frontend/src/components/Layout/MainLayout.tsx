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
  ShoppingCartOutlined,
  DollarOutlined,
  InboxOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../stores/authStore'
import { useNotificationStore } from '../../stores/notificationStore'
import './MainLayout.css'

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

  // Проверка, является ли пользователь ролью снабжения/склада/бухгалтерии
  const isSupplyRole = () => {
    if (!user) return false
    const supplyRoles = ['SUPPLY_MANAGER', 'WAREHOUSE_HEAD', 'SITE_WAREHOUSE_MANAGER', 'ACCOUNTANT']
    return supplyRoles.includes(user.role)
  }

  // Проверка доступа к странице тендеров (ИТР и Руководство)
  const canAccessTenders = () => {
    if (!user) return false
    // Суперадмин всегда имеет доступ
    if (user.is_superuser) return true

    // Разрешенные роли: ИТР и Руководство
    const allowedRoles = [
      'ENGINEER',          // Инженер ПТО (ИТР)
      'SITE_MANAGER',      // Начальник участка (ИТР)
      'FOREMAN',           // Прораб (ИТР)
      'MASTER',            // Мастер (ИТР)
      'PROJECT_MANAGER',   // Руководитель проекта (Руководство)
      'CHIEF_ENGINEER',    // Главный инженер (Руководство)
      'DIRECTOR'           // Директор (Руководство)
    ]

    return allowedRoles.includes(user.role)
  }

  // Фильтруем меню в зависимости от прав доступа пользователя
  const allMenuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">Дашборд</Link>,
      // Роли снабжения не имеют доступа к дашборду
      visible: !isSupplyRole(),
    },
    {
      key: '/dashboard/projects',
      icon: <ProjectOutlined />,
      label: <Link to="/dashboard/projects">Проекты</Link>,
      // Роли снабжения имеют доступ к проектам
    },
    {
      key: '/dashboard/issues',
      icon: <FileTextOutlined />,
      label: <Link to="/dashboard/issues">Замечания</Link>,
      // Роли снабжения не имеют доступа к замечаниям
      visible: !isSupplyRole(),
    },
    {
      key: '/dashboard/users',
      icon: <UserOutlined />,
      label: <Link to="/dashboard/users">Сотрудники</Link>,
      // Показываем пункт меню только для разрешенных ролей
      visible: canAccessUsers() && !isSupplyRole(),
    },
    {
      key: '/dashboard/contractors',
      icon: <TeamOutlined />,
      label: <Link to="/dashboard/contractors">Подрядчики</Link>,
      // Показываем пункт меню только для разрешенных ролей
      visible: canAccessContractors() && !isSupplyRole(),
    },
    {
      key: '/dashboard/supervisions',
      icon: <SafetyOutlined />,
      label: <Link to="/dashboard/supervisions">Надзоры</Link>,
      // Показываем пункт меню только для разрешенных ролей
      visible: canAccessSupervisions() && !isSupplyRole(),
    },
    {
      key: '/dashboard/technical-conditions',
      icon: <FileProtectOutlined />,
      label: <Link to="/dashboard/technical-conditions">Техусловия</Link>,
      // Роли снабжения не имеют доступа к техусловиям
      visible: !isSupplyRole(),
    },
    {
      key: '/dashboard/material-requests',
      icon: <ShoppingCartOutlined />,
      label: <Link to="/dashboard/material-requests">Заявки</Link>,
      // Роли снабжения имеют доступ к заявкам
    },
    {
      key: '/dashboard/warehouse',
      icon: <InboxOutlined />,
      label: <Link to="/dashboard/warehouse">Склад</Link>,
      // Все пользователи имеют доступ к складу
    },
    {
      key: '/dashboard/tenders',
      icon: <DollarOutlined />,
      label: <Link to="/dashboard/tenders">Тендеры</Link>,
      // Показываем пункт меню только для ИТР и Руководства
      visible: canAccessTenders(),
    },
    {
      key: '/dashboard/reports',
      icon: <BarChartOutlined />,
      label: <Link to="/dashboard/reports">Отчеты</Link>,
      // Подрядчики и роли снабжения не имеют доступа к отчетам
      visible: canAccessReports() && !isSupplyRole(),
    },
    {
      key: '/dashboard/settings',
      icon: <SettingOutlined />,
      label: <Link to="/dashboard/settings">Настройки</Link>,
      // Все пользователи имеют доступ к настройкам
    },
  ]

  // Фильтруем меню по полю visible и удаляем поле visible из результата
  const menuItems = allMenuItems
    .filter(item => item.visible !== false)
    .map(({ visible, ...item }) => item)

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

      <Layout style={{ background: '#f0f2f5' }}>
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

        <Content style={{ margin: '24px 16px', padding: 0, background: '#f0f2f5', minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
