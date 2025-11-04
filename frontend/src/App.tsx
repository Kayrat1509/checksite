import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { App as AntApp } from 'antd'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './stores/authStore'
import { useAccessRefresh } from './hooks/useAccessRefresh'
import MainLayout from './components/Layout/MainLayout'
import LandingPage from './pages/Home/LandingPage'
import PricingPage from './pages/Home/PricingPage'
import AboutServicePage from './pages/Home/AboutServicePage'
import FeaturesPage from './pages/Home/FeaturesPage'
import ContactPage from './pages/Home/ContactPage'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Issues from './pages/Issues'
import Users from './pages/Users'
import Contractors from './pages/Contractors'
import Supervisions from './pages/Supervisions'
// УДАЛЕНО: import TechnicalConditions - компонент удален из проекта
import MaterialRequests from './pages/MaterialRequests'
import ApprovedMaterialRequests from './pages/ApprovedMaterialRequests'
import CompletedMaterialRequests from './pages/CompletedMaterialRequests'
import Tenders from './pages/Tenders'
import Warehouse from './pages/Warehouse'
import Reports from './pages/Reports'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import ApprovalFlowSettings from './pages/ApprovalFlowSettings'
import NotFound from './pages/NotFound'

// Публичные тендеры (для внешних пользователей)
import PublicTendersRegister from './pages/PublicTenders/Register'
import PublicTendersLogin from './pages/PublicTenders/Login'
import PublicTendersStatus from './pages/PublicTenders/Status'
import PublicTendersList from './pages/PublicTenders/TendersList'

// Создаем QueryClient для React Query с настройками автообновления
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000, // Данные свежие 10 секунд
      refetchOnWindowFocus: true, // Обновить при возврате на вкладку
      refetchOnReconnect: true, // Обновить при восстановлении сети
    },
  },
})

// Компонент редиректа для дашборда в зависимости от роли
function DashboardRedirect() {
  const { user } = useAuthStore()

  // Роли снабжения перенаправляются на страницу проектов
  const supplyRoles = ['SUPPLY_MANAGER', 'WAREHOUSE_HEAD']
  if (user && supplyRoles.includes(user.role)) {
    return <Navigate to="/dashboard/projects" replace />
  }

  // Остальные пользователи видят обычный дашборд
  return <Dashboard />
}

function App() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()

  // Автоматическое обновление прав доступа
  useAccessRefresh()

  // Проверка аутентификации только при первом монтировании
  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Показываем загрузку, пока идет проверка авторизации
  if (isLoading) {
    return (
      <AntApp>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div>Загрузка...</div>
        </div>
      </AntApp>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AntApp>
        <Routes>
          {/* Публичные страницы */}
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/about-service" element={<AboutServicePage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} />

          {/* Публичные тендеры (для внешних пользователей) */}
          <Route path="/public-tenders/register" element={<PublicTendersRegister />} />
          <Route path="/public-tenders/login" element={<PublicTendersLogin />} />
          <Route path="/public-tenders/status" element={<PublicTendersStatus />} />
          <Route path="/public-tenders/list" element={<PublicTendersList />} />

          {/* Защищенные страницы */}
          <Route
            path="/dashboard"
            element={isAuthenticated ? <MainLayout /> : <Navigate to="/" />}
          >
            <Route index element={<DashboardRedirect />} />
            <Route path="projects" element={<Projects />} />
            <Route path="issues" element={<Issues />} />
            <Route path="users" element={<Users />} />
            <Route path="contractors" element={<Contractors />} />
            <Route path="supervisions" element={<Supervisions />} />
            {/* УДАЛЕНО: <Route path="technical-conditions" /> - функционал удален из системы */}
            <Route path="material-requests" element={<MaterialRequests />} />
            <Route path="material-requests/approved" element={<ApprovedMaterialRequests />} />
            <Route path="material-requests/completed" element={<CompletedMaterialRequests />} />
            <Route path="tenders" element={<Tenders />} />
            <Route path="warehouse" element={<Warehouse />} />
            <Route path="reports" element={<Reports />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/approval-flow" element={<ApprovalFlowSettings />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AntApp>
    </QueryClientProvider>
  )
}

export default App
