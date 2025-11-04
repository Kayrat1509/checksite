import { Form, Input, Button, Card, message, Divider, Modal } from 'antd'
import { UserOutlined, MailOutlined, LockOutlined, BankOutlined, PhoneOutlined, HomeOutlined, GlobalOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../../api/auth'

const Register = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const onFinish = async (values: any) => {
    try {
      await authAPI.register(values)

      // Показываем информативное модальное окно
      Modal.success({
        title: 'Регистрация успешна',
        icon: <ClockCircleOutlined style={{ color: '#1890ff' }} />,
        content: (
          <div style={{ marginTop: 16, fontSize: 15, lineHeight: 1.8 }}>
            <p style={{ marginBottom: 12, fontWeight: 500 }}>
              Ваш запрос в обработке.
            </p>
            <p style={{ marginBottom: 0, color: '#595959' }}>
              Время обработки заявки: <strong>3 часа</strong> в рабочее время с <strong>09:00 до 23:00</strong>
            </p>
          </div>
        ),
        okText: 'ОК',
        centered: true,
        onOk: () => {
          // После нажатия ОК переходим на главную страницу
          navigate('/')
        }
      })
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка регистрации')
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f0f2f5',
      padding: '20px'
    }}>
      <Card
        title="Регистрация в Check Site"
        style={{ width: 600, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <Form
          form={form}
          name="register"
          onFinish={onFinish}
          layout="vertical"
          scrollToFirstError
        >
          <Divider orientation="left">Данные компании</Divider>

          <Form.Item
            name="company_name"
            label="Название компании"
            rules={[{ required: true, message: 'Введите название компании' }]}
            tooltip="Укажите полное название компании с организационно-правовой формой (например: ТОО 'СтройАльянс', LLC 'BuildCorp', ООО 'СтройРесурс')"
          >
            <Input
              prefix={<BankOutlined />}
              placeholder='ТОО "СтройАльянс"'
            />
          </Form.Item>

          <Form.Item
            name="company_country"
            label="Страна"
          >
            <Input prefix={<GlobalOutlined />} placeholder="Казахстан" />
          </Form.Item>

          <Form.Item
            name="company_address"
            label="Адрес компании"
          >
            <Input prefix={<HomeOutlined />} placeholder="г. Алматы, ул. Абая 150" />
          </Form.Item>

          <Form.Item
            name="company_phone"
            label="Телефон компании"
          >
            <Input prefix={<PhoneOutlined />} placeholder="+7 (777) 632-36-16" />
          </Form.Item>

          <Form.Item
            name="company_email"
            label="Email компании"
            rules={[
              { type: 'email', message: 'Некорректный email' }
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="info@company.kz" />
          </Form.Item>

          <Divider orientation="left">Данные пользователя</Divider>

          <Form.Item
            name="last_name"
            label="Фамилия"
            rules={[{ required: true, message: 'Введите фамилию' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Иванов" />
          </Form.Item>

          <Form.Item
            name="first_name"
            label="Имя"
            rules={[{ required: true, message: 'Введите имя' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Иван" />
          </Form.Item>

          <Form.Item
            name="middle_name"
            label="Отчество"
          >
            <Input prefix={<UserOutlined />} placeholder="Иванович" />
          </Form.Item>

          <Form.Item
            name="position"
            label="Должность"
            rules={[{ required: true, message: 'Введите должность' }]}
          >
            <Input placeholder="Директор" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Некорректный email' }
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="email@example.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Пароль"
            rules={[
              { required: true, message: 'Введите пароль' },
              { min: 8, message: 'Минимум 8 символов' }
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Пароль" />
          </Form.Item>

          <Form.Item
            name="password_confirm"
            label="Подтверждение пароля"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Подтвердите пароль' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('Пароли не совпадают'))
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Подтверждение пароля" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              Зарегистрироваться
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default Register
