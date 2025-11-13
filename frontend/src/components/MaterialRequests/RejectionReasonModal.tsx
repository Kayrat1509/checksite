import React from 'react'
import { Modal, Form, Input, message } from 'antd'

const { TextArea } = Input

/**
 * Интерфейс пропсов для модального окна указания причины возврата
 */
interface RejectionReasonModalProps {
  /** Видимость модального окна */
  visible: boolean
  /** Callback при закрытии модального окна */
  onCancel: () => void
  /** Callback при подтверждении с причиной возврата */
  onSubmit: (reason: string) => void
  /** Флаг загрузки (при отправке запроса) */
  loading?: boolean
}

/**
 * Модальное окно для указания причины возврата заявки на доработку
 *
 * Используется при отклонении заявки на согласовании.
 * Требует обязательного указания причины возврата.
 */
const RejectionReasonModal: React.FC<RejectionReasonModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm()

  /**
   * Обработчик подтверждения модального окна
   * Валидирует форму и вызывает callback onSubmit
   */
  const handleOk = async () => {
    try {
      // Валидация формы
      const values = await form.validateFields()

      // Проверка на пустую причину
      if (!values.rejection_reason || values.rejection_reason.trim().length === 0) {
        message.error('Укажите причину возврата')
        return
      }

      // Вызов callback с причиной возврата
      onSubmit(values.rejection_reason.trim())

      // Сброс формы после успешной отправки
      form.resetFields()
    } catch (error) {
      console.error('Ошибка валидации формы:', error)
    }
  }

  /**
   * Обработчик отмены модального окна
   * Сбрасывает форму и вызывает callback onCancel
   */
  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  return (
    <Modal
      title="Вернуть на доработку"
      open={visible}
      onCancel={handleCancel}
      onOk={handleOk}
      okText="Отправить"
      okButtonProps={{ danger: true }} // Красная кнопка для визуального выделения критического действия
      cancelText="Отмена"
      confirmLoading={loading}
      destroyOnClose // Уничтожает содержимое при закрытии для сброса состояния
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ rejection_reason: '' }}
      >
        {/* Поле для указания причины возврата */}
        <Form.Item
          name="rejection_reason"
          label="Причина возврата"
          rules={[
            { required: true, message: 'Укажите причину возврата' },
            { min: 10, message: 'Причина должна содержать минимум 10 символов' },
            { max: 1000, message: 'Причина не может превышать 1000 символов' }
          ]}
          tooltip="Укажите подробную причину возврата заявки на доработку"
        >
          <TextArea
            rows={4}
            placeholder="Укажите причину возврата (минимум 10 символов)"
            maxLength={1000}
            showCount
            autoFocus // Автофокус на поле при открытии модального окна
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default RejectionReasonModal
