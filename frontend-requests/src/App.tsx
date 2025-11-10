// Упрощенное приложение для системы согласования заявок
// http://localhost:5175/requests (requests.stroyka.asia)
// Без авторизации и сложной логики - только таблица с заявками

import { Routes, Route, Navigate } from 'react-router-dom'
import { App as AntApp, ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import MaterialRequests from './pages/MaterialRequests'
import './index.css'

function App() {
  return (
    <ConfigProvider locale={ruRU}>
      <AntApp>
        <Routes>
          {/* Редирект с корня на /requests */}
          <Route path="/" element={<Navigate to="/requests" replace />} />

          {/* Страница согласования заявок */}
          <Route path="/requests" element={<MaterialRequests />} />

          {/* Обработка несуществующих путей */}
          <Route path="*" element={<Navigate to="/requests" replace />} />
        </Routes>
      </AntApp>
    </ConfigProvider>
  )
}

export default App
