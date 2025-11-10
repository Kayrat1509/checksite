import { useState } from 'react'
import { Form, Input, Button, message, Card } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { authAPI } from '../api/auth'

interface ChangePasswordFormData {
  old_password: string
  new_password: string
  new_password_confirm: string
}

const ChangePasswordForm = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  // Обработчик отправки формы
  const handleSubmit = async (values: ChangePasswordFormData) => {
    setLoading(true)

    try {
      // Отправляем запрос на изменение пароля
      const response = await authAPI.changePassword(values)

      // Показываем сообщение об успехе
      message.success(response.message || 'Пароль успешно изменен')

      // Очищаем форму после успешной смены пароля
      form.resetFields()
    } catch (error: any) {
      // Обработка ошибок
      if (error.response?.data) {
        const errorData = error.response.data

        // Показываем ошибки валидации для конкретных полей
        if (errorData.old_password) {
          message.error(errorData.old_password[0] || 'Неверный текущий пароль')
        } else if (errorData.new_password) {
          message.error(errorData.new_password[0] || 'Новый пароль не соответствует требованиям безопасности')
        } else if (errorData.new_password_confirm) {
          message.error(errorData.new_password_confirm[0] || 'Пароли не совпадают')
        } else {
          message.error(errorData.detail || 'Ошибка при изменении пароля')
        }
      } else {
        message.error('Произошла ошибка. Попробуйте позже.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title="🔐 Изменение пароля" style={{ maxWidth: 600 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        {/* Текущий пароль */}
        <Form.Item
          label="Текущий пароль"
          name="old_password"
          rules={[
            { required: true, message: 'Введите текущий пароль' }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Введите текущий пароль"
            size="large"
          />
        </Form.Item>

        {/* Новый пароль */}
        <Form.Item
          label="Новый пароль"
          name="new_password"
          rules={[
            { required: true, message: 'Введите новый пароль' },
            { min: 8, message: 'Пароль должен содержать минимум 8 символов' },
            {
              pattern: /^(?=.*[a-zA-Z])(?=.*\d)/,
              message: 'Пароль должен содержать буквы и цифры'
            }
          ]}
          hasFeedback
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Введите новый пароль"
            size="large"
          />
        </Form.Item>

        {/* Подтверждение нового пароля */}
        <Form.Item
          label="Подтвердите новый пароль"
          name="new_password_confirm"
          dependencies={['new_password']}
          hasFeedback
          rules={[
            { required: true, message: 'Подтвердите новый пароль' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('new_password') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('Пароли не совпадают'))
              }
            })
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Повторите новый пароль"
            size="large"
          />
        </Form.Item>

        {/* Требования к паролю */}
        <div style={{ marginBottom: 16, fontSize: 12, color: '#8c8c8c' }}>
          <div>Требования к паролю:</div>
          <ul style={{ paddingLeft: 20, marginTop: 4 }}>
            <li>Минимум 8 символов</li>
            <li>Должен содержать буквы и цифры</li>
            <li>Рекомендуется использовать специальные символы</li>
          </ul>
        </div>

        {/* Кнопка отправки */}
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            size="large"
            block
          >
            Изменить пароль
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default ChangePasswordForm
