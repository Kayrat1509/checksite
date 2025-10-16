import { Typography, Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

const { Title } = Typography

const TechnicalConditions = () => {
  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>Техусловия - ТЕСТОВАЯ ВЕРСИЯ</Title>
        <Button type="primary" icon={<PlusOutlined />}>
          Добавить техусловие
        </Button>
      </div>
      <p style={{ fontSize: '18px', color: 'green' }}>✅ Страница загружена успешно!</p>
      <p>Если вы видите это сообщение, значит роутинг работает корректно.</p>
      <p>Сейчас загружается упрощенная версия для проверки.</p>
    </div>
  )
}

export default TechnicalConditions
