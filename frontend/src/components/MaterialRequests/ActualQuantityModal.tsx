import React from 'react'
import { Modal, Form, InputNumber, Input, Typography, message } from 'antd'

const { Text } = Typography
const { TextArea } = Input

/**
 * Интерфейс пропсов для модального окна обновления фактического количества
 */
interface ActualQuantityModalProps {
  /** Видимость модального окна */
  visible: boolean
  /** Callback при закрытии модального окна */
  onCancel: () => void
  /** Callback при подтверждении с количеством и примечанием */
  onSubmit: (quantity: number, notes?: string) => void
  /** Текущее фактическое количество (уже доставлено) */
  currentQuantity: number | null
  /** Запрошенное количество по заявке */
  quantityRequested: number
  /** Флаг загрузки (при отправке запроса) */
  loading?: boolean
}

/**
 * Модальное окно для обновления фактического количества материала
 *
 * Позволяет пользователю указать общее фактическое количество доставленного материала.
 * Введённое значение заменяет текущее (не суммируется).
 *
 * Отображает:
 * - Запрошенное количество
 * - Остаток для доставки
 * - Поле ввода фактического количества (с текущим значением)
 * - Поле для примечания (опционально)
 */
const ActualQuantityModal: React.FC<ActualQuantityModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  currentQuantity,
  quantityRequested,
  loading = false,
}) => {
  const [form] = Form.useForm()

  // Расчёт остатка для доставки
  const deliveredQuantity = currentQuantity !== null ? Number(currentQuantity) : 0
  const requestedQuantity = Number(quantityRequested) || 0
  const remainingQuantity = requestedQuantity - deliveredQuantity
  const isComplete = deliveredQuantity >= requestedQuantity

  /**
   * Обработчик подтверждения модального окна
   * Валидирует форму и вызывает callback onSubmit
   */
  const handleOk = async () => {
    try {
      // Валидация формы
      const values = await form.validateFields()

      // Проверка на корректность введённого количества
      if (values.quantity_actual < 0) {
        message.error('Количество не может быть отрицательным')
        return
      }

      // Передаём введённое количество как есть (абсолютное значение)
      onSubmit(values.quantity_actual, values.notes)

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
      title="Обновить фактическое количество"
      open={visible}
      onCancel={handleCancel}
      onOk={handleOk}
      okText="Сохранить"
      cancelText="Отмена"
      confirmLoading={loading}
      destroyOnClose // Уничтожает содержимое при закрытии для сброса состояния
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ quantity_actual: deliveredQuantity, notes: '' }}
      >
        {/* Информационный блок с текущим статусом доставки */}
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            background: '#f0f0f0',
            borderRadius: 4
          }}
        >
          <Text strong>Запрошено: {requestedQuantity.toFixed(2)}</Text>
          <br />
          <Text
            strong
            style={{
              color: isComplete ? '#52c41a' : '#fa8c16'
            }}
          >
            Осталось доставить: {remainingQuantity.toFixed(2)}
            {isComplete && ' ✓ (Выполнено)'}
          </Text>
        </div>

        {/* Поле ввода фактического количества */}
        <Form.Item
          name="quantity_actual"
          label="Фактическое количество доставлено"
          rules={[
            { required: true, message: 'Введите количество' },
            { type: 'number', min: 0, message: 'Количество должно быть больше или равно 0' }
          ]}
          tooltip="Введите общее фактическое количество доставленного материала"
        >
          <InputNumber
            min={0}
            step={0.01}
            precision={2}
            style={{ width: '100%' }}
            placeholder="Введите фактическое количество"
            autoFocus // Автофокус на поле при открытии модального окна
          />
        </Form.Item>

        {/* Поле для примечания (опционально) */}
        <Form.Item
          name="notes"
          label="Примечание"
          tooltip="Опциональное примечание о доставке (номер рейса, комментарий и т.д.)"
        >
          <TextArea
            rows={2}
            placeholder="Комментарий (опционально)"
            maxLength={500}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ActualQuantityModal
