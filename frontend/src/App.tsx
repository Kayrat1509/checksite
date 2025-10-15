import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { App as AntApp } from 'antd'
import { useAuthStore } from './stores/authStore'
import MainLayout from './components/Layout/MainLayout'
import LandingPage from './pages/Home/LandingPage'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Issues from './pages/Issues'
import Users from './pages/Users'
import Contractors from './pages/Contractors'
import Supervisions from './pages/Supervisions'
import Reports from './pages/Reports'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'

function App() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

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
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} />

        {/* Защищенные страницы */}
        <Route
          path="/dashboard"
          element={isAuthenticated ? <MainLayout /> : <Navigate to="/" />}
        >
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="issues" element={<Issues />} />
          <Route path="users" element={<Users />} />
          <Route path="contractors" element={<Contractors />} />
          <Route path="supervisions" element={<Supervisions />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AntApp>
  )
}

export default App
