import { Typography, Result } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { authAPI } from '../api/auth'

const { Title } = Typography

const Reports = () => {
  // Проверка доступа текущего пользователя
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authAPI.getCurrentUser,
    retry: 1
  })

  // Проверка доступа - подрядчики не имеют доступа к отчетам
  if (!isLoading && currentUser) {
    if (currentUser.role === 'CONTRACTOR' && !currentUser.is_superuser) {
      return (
        <Result
          status="403"
          title="Доступ запрещен"
          subTitle="У вас нет доступа к странице отчетов."
        />
      )
    }
  }

  return (
    <div>
      <Title level={2}>Отчеты</Title>
      <p>Раздел в разработке</p>
    </div>
  )
}

export default Reports
