import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { App as AntApp } from 'antd'
import { useAuthStore } from './stores/authStore'
import MainLayout from './components/Layout/MainLayout'
import LandingPage from './pages/Home/LandingPage'
import PricingPage from './pages/Home/PricingPage'
import AboutServicePage from './pages/Home/AboutServicePage'
import FeaturesPage from './pages/Home/FeaturesPage'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Issues from './pages/Issues'
import Users from './pages/Users'
import Contractors from './pages/Contractors'
import Supervisions from './pages/Supervisions'
import TechnicalConditions from './pages/TechnicalConditions'
import MaterialRequests from './pages/MaterialRequests'
import Tenders from './pages/Tenders'
import Warehouse from './pages/Warehouse'
import Reports from './pages/Reports'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

// Публичные тендеры (для внешних пользователей)
import PublicTendersRegister from './pages/PublicTenders/Register'
import PublicTendersLogin from './pages/PublicTenders/Login'
import PublicTendersStatus from './pages/PublicTenders/Status'
import PublicTendersList from './pages/PublicTenders/TendersList'

// Компонент редиректа для дашборда в зависимости от роли
function DashboardRedirect() {
  const { user } = useAuthStore()

  // Роли снабжения перенаправляются на страницу проектов
  const supplyRoles = ['SUPPLY_MANAGER', 'WAREHOUSE_HEAD', 'ACCOUNTANT']
  if (user && supplyRoles.includes(user.role)) {
    return <Navigate to="/dashboard/projects" replace />
  }

  // Остальные пользователи видят обычный дашборд
  return <Dashboard />
}

function App() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()

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
    <AntApp>
      <Routes>
        {/* Публичные страницы */}
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/about-service" element={<AboutServicePage />} />
        <Route path="/features" element={<FeaturesPage />} />
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
          <Route path="technical-conditions" element={<TechnicalConditions />} />
          <Route path="material-requests" element={<MaterialRequests />} />
          <Route path="tenders" element={<Tenders />} />
          <Route path="warehouse" element={<Warehouse />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AntApp>
  )
}

export default App
