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
  ShoppingCartOutlined,
  DollarOutlined,
  InboxOutlined,
  SettingOutlined,
  SecurityScanOutlined,
  UsergroupAddOutlined, // НОВАЯ ИКОНКА: для меню "Персонал"
} from '@ant-design/icons'
// УДАЛЕНО: FileProtectOutlined - использовалась для техусловий, больше не нужна
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

  // ===== ОБНОВЛЕННАЯ СТРУКТУРА МЕНЮ =====
  // Новая последовательность: Дашборд, Проекты, Персонал, Замечания, Заявки, Склад, Тендеры, Отчеты, Настройки
  // "Персонал" объединяет: Сотрудники, Подрядчики, Надзоры
  // "Настройки" объединяет: Управление доступом, Настройки системы
  // УДАЛЕНО: Техусловия (technical-conditions)
  const allMenuItems = [
    // 1. Дашборд
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">Дашборд</Link>,
      page: 'dashboard',
      visible: hasPageAccess('dashboard'),
    },

    // 2. Проекты
    {
      key: '/dashboard/projects',
      icon: <ProjectOutlined />,
      label: <Link to="/dashboard/projects">Проекты</Link>,
      page: 'projects',
      visible: hasPageAccess('projects'),
    },

    // 3. Персонал (НОВОЕ МЕНЮ с подпунктами)
    {
      key: 'personnel',
      icon: <UsergroupAddOutlined />,
      label: 'Персонал',
      // Показываем меню, если есть доступ хотя бы к одной странице
      visible: hasPageAccess('users') || hasPageAccess('contractors') || hasPageAccess('supervisions'),
      children: [
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
      ],
    },

    // 4. Замечания
    {
      key: '/dashboard/issues',
      icon: <FileTextOutlined />,
      label: <Link to="/dashboard/issues">Замечания</Link>,
      page: 'issues',
      visible: hasPageAccess('issues'),
    },

    // 5. Заявки
    {
      key: '/dashboard/material-requests',
      icon: <ShoppingCartOutlined />,
      label: <Link to="/dashboard/material-requests">Заявки</Link>,
      page: 'material-requests',
      visible: hasPageAccess('material-requests'),
    },

    // 6. Склад
    {
      key: '/dashboard/warehouse',
      icon: <InboxOutlined />,
      label: <Link to="/dashboard/warehouse">Склад</Link>,
      page: 'warehouse',
      visible: hasPageAccess('warehouse'),
    },

    // 7. Тендеры
    {
      key: '/dashboard/tenders',
      icon: <DollarOutlined />,
      label: <Link to="/dashboard/tenders">Тендеры</Link>,
      page: 'tenders',
      visible: hasPageAccess('tenders'),
    },

    // 8. Отчеты
    {
      key: '/dashboard/reports',
      icon: <BarChartOutlined />,
      label: <Link to="/dashboard/reports">Отчеты</Link>,
      page: 'reports',
      visible: hasPageAccess('reports'),
    },

    // 9. Настройки (с подпунктами)
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Настройки',
      page: 'settings',
      visible: hasPageAccess('settings'),
      children: [
        {
          key: '/dashboard/access-management',
          icon: <SecurityScanOutlined />,
          label: <Link to="/dashboard/access-management">Управление доступом</Link>,
          page: 'settings',
          visible: hasPageAccess('settings'),
        },
        {
          key: '/dashboard/settings',
          icon: <SettingOutlined />,
          label: <Link to="/dashboard/settings">Настройки системы</Link>,
          page: 'settings',
          visible: hasPageAccess('settings'),
        },
      ],
    },
  ]

  // ===== РЕКУРСИВНАЯ ФИЛЬТРАЦИЯ МЕНЮ =====
  // Фильтруем меню с учетом подменю (children)
  // Если у родительского элемента нет доступных подпунктов, скрываем весь раздел
  const filterMenuItems = (items: any[]): any[] => {
    return items
      .filter(item => item.visible !== false) // Фильтруем по visible
      .map(({ visible, ...item }) => {
        // Если есть подменю (children), фильтруем их рекурсивно
        if (item.children) {
          const filteredChildren = filterMenuItems(item.children)
          // Если нет доступных подпунктов, возвращаем null (скрываем родителя)
          if (filteredChildren.length === 0) {
            return null
          }
          return { ...item, children: filteredChildren }
        }
        return item
      })
      .filter(Boolean) // Удаляем null значения
  }

  const menuItems = filterMenuItems(allMenuItems)

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
