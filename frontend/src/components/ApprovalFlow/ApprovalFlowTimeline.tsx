import { Timeline, Tag, Card, Typography, Space, Button, Modal, Form, Input, message } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { useState } from 'react'
import type { MaterialRequestApproval } from '../../api/approvalFlows'
import { approvalFlowsAPI } from '../../api/approvalFlows'
import { useAuthStore } from '../../stores/authStore'

const { Text, Paragraph } = Typography
const { TextArea } = Input

interface ApprovalFlowTimelineProps {
  approvals: MaterialRequestApproval[]
  currentStep?: number
  materialRequestId: number
  onApprovalAction?: () => void
}

export default function ApprovalFlowTimeline({
  approvals,
  currentStep,
  materialRequestId,
  onApprovalAction,
}: ApprovalFlowTimelineProps) {
  const user = useAuthStore(state => state.user)
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  // Получить иконку статуса
  const getStatusIcon = (approval: MaterialRequestApproval) => {
    switch (approval.status) {
      case 'APPROVED':
        return <CheckCircleOutlined style={{ fontSize: 16, color: '#52c41a' }} />
      case 'REJECTED':
        return <CloseCircleOutlined style={{ fontSize: 16, color: '#ff4d4f' }} />
      case 'SKIPPED':
        return <MinusCircleOutlined style={{ fontSize: 16, color: '#8c8c8c' }} />
      case 'PENDING':
        return <ClockCircleOutlined style={{ fontSize: 16, color: '#faad14' }} />
      default:
        return <ClockCircleOutlined style={{ fontSize: 16, color: '#d9d9d9' }} />
    }
  }

  // Получить цвет для тэга статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'success'
      case 'REJECTED':
        return 'error'
      case 'SKIPPED':
        return 'default'
      case 'PENDING':
        return 'warning'
      default:
        return 'default'
    }
  }

  // Проверка, является ли пользователь согласующим на текущем этапе
  const isCurrentApprover = (approval: MaterialRequestApproval) => {
    return (
      approval.status === 'PENDING' &&
      approval.approver === user?.id &&
      approval.step_data?.order === currentStep
    )
  }

  // Согласовать этап
  const handleApprove = async (values: { comment?: string }) => {
    try {
      setLoading(true)
      await approvalFlowsAPI.approveMaterialRequest(materialRequestId, {
        comment: values.comment || '',
      })
      message.success('Заявка успешно согласована')
      setIsApproveModalOpen(false)
      form.resetFields()
      onApprovalAction?.()
    } catch (error: any) {
      console.error('Ошибка согласования:', error)
      message.error(error.response?.data?.detail || 'Ошибка согласования')
    } finally {
      setLoading(false)
    }
  }

  // Отклонить заявку
  const handleReject = async (values: { comment: string }) => {
    if (!values.comment) {
      message.error('Укажите причину отклонения')
      return
    }

    try {
      setLoading(true)
      await approvalFlowsAPI.rejectMaterialRequest(materialRequestId, {
        comment: values.comment,
      })
      message.success('Заявка отклонена и возвращена автору')
      setIsRejectModalOpen(false)
      form.resetFields()
      onApprovalAction?.()
    } catch (error: any) {
      console.error('Ошибка отклонения:', error)
      message.error(error.response?.data?.detail || 'Ошибка отклонения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title="Цепочка согласования" style={{ marginTop: 16 }}>
      <Timeline>
        {approvals.map((approval, index) => {
          const isCurrent = approval.step_data?.order === currentStep
          const isApprover = isCurrentApprover(approval)

          return (
            <Timeline.Item
              key={approval.id}
              dot={getStatusIcon(approval)}
              color={isCurrent ? 'blue' : undefined}
            >
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Space>
                  <Text strong>
                    Этап {approval.step_data?.order}: {approval.step_data?.role_display}
                  </Text>
                  <Tag color={getStatusColor(approval.status)}>{approval.status_display}</Tag>
                  {isCurrent && <Tag color="blue">Текущий этап</Tag>}
                </Space>

                {approval.approver_data && (
                  <Text type="secondary">
                    Согласующий: {approval.approver_data.full_name} ({approval.approver_data.role})
                  </Text>
                )}

                {approval.status === 'SKIPPED' && !approval.approver_data && (
                  <Text type="secondary" italic>
                    Этап пропущен автоматически (нет пользователя с этой ролью)
                  </Text>
                )}

                {approval.comment && (
                  <Paragraph
                    type="secondary"
                    style={{
                      marginBottom: 0,
                      padding: 8,
                      background: '#fafafa',
                      borderRadius: 4,
                    }}
                  >
                    <Text strong>Комментарий:</Text> {approval.comment}
                  </Paragraph>
                )}

                {approval.approved_at && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(approval.approved_at).toLocaleString('ru-RU')}
                  </Text>
                )}

                {/* Кнопки действий для текущего согласующего */}
                {isApprover && (
                  <Space style={{ marginTop: 8 }}>
                    <Button
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      onClick={() => setIsApproveModalOpen(true)}
                    >
                      Согласовать
                    </Button>
                    <Button
                      danger
                      icon={<CloseCircleOutlined />}
                      onClick={() => setIsRejectModalOpen(true)}
                    >
                      Отклонить
                    </Button>
                  </Space>
                )}
              </Space>
            </Timeline.Item>
          )
        })}
      </Timeline>

      {/* Модальное окно согласования */}
      <Modal
        title="Согласовать заявку"
        open={isApproveModalOpen}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsApproveModalOpen(false)
          form.resetFields()
        }}
        okText="Согласовать"
        cancelText="Отмена"
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" onFinish={handleApprove}>
          <Form.Item name="comment" label="Комментарий (необязательно)">
            <TextArea rows={3} placeholder="Введите комментарий при необходимости" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно отклонения */}
      <Modal
        title="Отклонить заявку"
        open={isRejectModalOpen}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsRejectModalOpen(false)
          form.resetFields()
        }}
        okText="Отклонить"
        okButtonProps={{ danger: true }}
        cancelText="Отмена"
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" onFinish={handleReject}>
          <Form.Item
            name="comment"
            label="Причина отклонения"
            rules={[{ required: true, message: 'Укажите причину отклонения' }]}
          >
            <TextArea
              rows={4}
              placeholder="Обязательно укажите причину отклонения. Заявка будет возвращена автору для доработки."
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
