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
  const { user, logout, hasPageAccess } = useAuthStore()
  const { unreadCount } = useNotificationStore()

  // ===== НОВАЯ ЛОГИКА: Проверка доступа через матрицу в БД =====
  // Все проверки доступа теперь идут через hasPageAccess(page)
  // Этот метод проверяет наличие страницы в authStore.allowedPages
  // Список allowedPages загружается из БД при логине через API /settings/page-access/my-pages/

  // ===== НОВАЯ ЛОГИКА: Фильтруем меню через матрицу доступа из БД =====
  const allMenuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">Дашборд</Link>,
      page: 'dashboard',  // slug страницы в БД
      visible: hasPageAccess('dashboard'),
    },
    {
      key: '/dashboard/projects',
      icon: <ProjectOutlined />,
      label: <Link to="/dashboard/projects">Проекты</Link>,
      page: 'projects',
      visible: hasPageAccess('projects'),
    },
    {
      key: '/dashboard/issues',
      icon: <FileTextOutlined />,
      label: <Link to="/dashboard/issues">Замечания</Link>,
      page: 'issues',
      visible: hasPageAccess('issues'),
    },
    {
      key: '/dashboard/users',
      icon: <UserOutlined />,
      label: <Link to="/dashboard/users">Сотрудники</Link>,
      page: 'users',
      visible: hasPageAccess('users'),
    },
    {
      key: '/dashboard/contractors',
      icon: <TeamOutlined />,
      label: <Link to="/dashboard/contractors">Подрядчики</Link>,
      page: 'contractors',
      visible: hasPageAccess('contractors'),
    },
    {
      key: '/dashboard/supervisions',
      icon: <SafetyOutlined />,
      label: <Link to="/dashboard/supervisions">Надзоры</Link>,
      page: 'supervisions',
      visible: hasPageAccess('supervisions'),
    },
    {
      key: '/dashboard/technical-conditions',
      icon: <FileProtectOutlined />,
      label: <Link to="/dashboard/technical-conditions">Техусловия</Link>,
      page: 'technical-conditions',
      visible: hasPageAccess('technical-conditions'),
    },
    {
      key: '/dashboard/material-requests',
      icon: <ShoppingCartOutlined />,
      label: <Link to="/dashboard/material-requests">Заявки</Link>,
      page: 'material-requests',
      visible: hasPageAccess('material-requests'),
    },
    {
      key: '/dashboard/warehouse',
      icon: <InboxOutlined />,
      label: <Link to="/dashboard/warehouse">Склад</Link>,
      page: 'warehouse',
      visible: hasPageAccess('warehouse'),
    },
    {
      key: '/dashboard/tenders',
      icon: <DollarOutlined />,
      label: <Link to="/dashboard/tenders">Тендеры</Link>,
      page: 'tenders',
      visible: hasPageAccess('tenders'),
    },
    {
      key: '/dashboard/reports',
      icon: <BarChartOutlined />,
      label: <Link to="/dashboard/reports">Отчеты</Link>,
      page: 'reports',
      visible: hasPageAccess('reports'),
    },
    {
      key: '/dashboard/settings',
      icon: <SettingOutlined />,
      label: <Link to="/dashboard/settings">Настройки</Link>,
      page: 'settings',
      visible: hasPageAccess('settings'),
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
