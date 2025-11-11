// Упрощенное приложение для системы согласования заявок
// http://localhost:5175/requests (requests.stroyka.asia)

import { Routes, Route, Navigate } from 'react-router-dom'
import { App as AntApp, ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import MaterialRequests from './pages/MaterialRequests'
import Login from './pages/Auth/Login'
import { useAuthStore } from './stores/authStore'
import { useEffect } from 'react'
import './index.css'

// Компонент для защиты роутов (требует авторизацию)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()

  // Показываем загрузку пока проверяем токен
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Загрузка...</div>
  }

  // Если не авторизован - редирект на логин
  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  const { checkAuth } = useAuthStore()

  // Проверяем авторизацию при загрузке приложения
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <ConfigProvider locale={ruRU}>
      <AntApp>
        <Routes>
          {/* Страница логина */}
          <Route path="/login" element={<Login />} />

          {/* Редирект с корня на /requests */}
          <Route path="/" element={<Navigate to="/requests" replace />} />

          {/* Защищенная страница согласования заявок */}
          <Route
            path="/requests"
            element={
              <ProtectedRoute>
                <MaterialRequests />
              </ProtectedRoute>
            }
          />

          {/* Обработка несуществующих путей */}
          <Route path="*" element={<Navigate to="/requests" replace />} />
        </Routes>
      </AntApp>
    </ConfigProvider>
  )
}

export default App
