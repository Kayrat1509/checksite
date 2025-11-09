import { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Switch,
  message,
  Typography,
  Alert,
  Spin,
} from 'antd'
import {
  DragOutlined,
  CheckOutlined,
  CloseOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { approvalFlowsAPI, APPROVAL_ROLES, type ApprovalFlowTemplate, type ApprovalStep } from '../api/approvalFlows'
import { useAuthStore } from '../stores/authStore'

const { Title, Paragraph } = Typography

// Дефолтная схема согласования для всех компаний (обновлено: добавлены роли энергетиков)
const DEFAULT_APPROVAL_STEPS = [
  { role: 'FOREMAN', role_display: 'Прораб', enabled: true },
  { role: 'POWER_ENGINEER', role_display: 'Энергетик', enabled: false },  // Новая роль
  { role: 'SITE_MANAGER', role_display: 'Начальник участка', enabled: true },
  { role: 'SUPPLY_MANAGER', role_display: 'Снабжение', enabled: true },
  { role: 'WAREHOUSE_HEAD', role_display: 'Завсклад центр.склада', enabled: true },
  { role: 'SUPPLY_MANAGER', role_display: 'Снабжение', enabled: true },
  { role: 'ENGINEER', role_display: 'Инженер ПТО', enabled: true },
  { role: 'PROJECT_MANAGER', role_display: 'Руководитель проекта', enabled: true },
  { role: 'CHIEF_POWER_ENGINEER', role_display: 'Главный энергетик', enabled: false },  // Новая роль
  { role: 'CHIEF_ENGINEER', role_display: 'Главный инженер', enabled: true },
  { role: 'DIRECTOR', role_display: 'Директор', enabled: true },
]

// Интерфейс для этапа с поддержкой включения/выключения
interface ApprovalStepWithToggle extends ApprovalStep {
  enabled: boolean
}

// Компонент для сортируемой строки этапа
interface SortableStepRowProps {
  step: ApprovalStepWithToggle
  index: number
  onToggle: (index: number, enabled: boolean) => void
}

const SortableStepRow = ({ step, index, onToggle }: SortableStepRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${step.role}-${index}` // Уникальный ключ: роль + индекс
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: step.enabled ? '#fff' : '#f5f5f5',
  }

  return (
    <tr ref={setNodeRef} style={style} {...attributes}>
      <td style={{ width: 50, textAlign: 'center' }}>
        <DragOutlined {...listeners} style={{ cursor: 'grab', fontSize: 16, color: step.enabled ? '#1890ff' : '#d9d9d9' }} />
      </td>
      <td style={{ width: 80, textAlign: 'center' }}>{index + 1}</td>
      <td>{step.role_display || APPROVAL_ROLES.find(r => r.value === step.role)?.label}</td>
      <td style={{ width: 150, textAlign: 'center' }}>
        <Switch
          checked={step.enabled}
          onChange={(checked) => onToggle(index, checked)}
          checkedChildren={<CheckOutlined />}
          unCheckedChildren={<CloseOutlined />}
        />
      </td>
    </tr>
  )
}

export default function ApprovalFlowSettings() {
  const user = useAuthStore(state => state.user)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [flowTemplate, setFlowTemplate] = useState<ApprovalFlowTemplate | null>(null)
  const [steps, setSteps] = useState<ApprovalStepWithToggle[]>([])

  // Настройка сенсоров для drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Загрузка настроек и активной цепочки
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Пытаемся загрузить активную цепочку
      try {
        const activeFlow = await approvalFlowsAPI.getActiveFlow()
        console.log('[ApprovalFlow] Loaded template:', activeFlow)
        console.log('[ApprovalFlow] Steps:', activeFlow.steps, 'Length:', activeFlow.steps?.length)
        setFlowTemplate(activeFlow)

        // Если есть сохранённые этапы - объединяем с дефолтной схемой
        if (activeFlow.steps && activeFlow.steps.length > 0) {
          console.log('[ApprovalFlow] Merging saved steps with default scheme')

          // Сортируем сохранённые этапы по order для определения порядка
          const sortedSavedSteps = [...activeFlow.steps].sort((a, b) => a.order - b.order)
          console.log('[ApprovalFlow] Sorted saved steps:', sortedSavedSteps)

          // Объединяем: сначала включенные (из БД), потом выключенные (из дефолта, которых нет в БД)
          const enabledSteps: ApprovalStepWithToggle[] = sortedSavedSteps.map((step, index) => ({
            id: step.id,
            role: step.role,
            role_display: step.role_display || APPROVAL_ROLES.find(r => r.value === step.role)?.label || step.role,
            order: index + 1,
            skip_if_empty: step.skip_if_empty,
            is_mandatory: step.is_mandatory,
            description: step.description || '',
            enabled: true, // Включен (есть в БД)
          }))

          // Находим роли из дефолтной схемы, которых нет в сохранённых
          // Учитываем количество вхождений каждой роли
          const savedRoleCounts = new Map<string, number>()
          sortedSavedSteps.forEach(step => {
            savedRoleCounts.set(step.role, (savedRoleCounts.get(step.role) || 0) + 1)
          })

          const defaultRoleCounts = new Map<string, number>()
          DEFAULT_APPROVAL_STEPS.forEach(step => {
            defaultRoleCounts.set(step.role, (defaultRoleCounts.get(step.role) || 0) + 1)
          })

          // Создаём выключенные этапы для ролей, которых не хватает в сохранённых
          const disabledSteps: ApprovalStepWithToggle[] = []
          let disabledIndex = 0
          DEFAULT_APPROVAL_STEPS.forEach(defaultStep => {
            const savedCount = savedRoleCounts.get(defaultStep.role) || 0
            const defaultCount = defaultRoleCounts.get(defaultStep.role) || 0

            // Если в дефолте больше вхождений этой роли, чем в сохранённых
            if (savedCount < defaultCount) {
              // Добавляем недостающие вхождения как выключенные
              const currentDisabledCount = disabledSteps.filter(s => s.role === defaultStep.role).length
              if (currentDisabledCount < (defaultCount - savedCount)) {
                disabledSteps.push({
                  id: -(disabledIndex + 1),
                  role: defaultStep.role,
                  role_display: defaultStep.role_display,
                  order: enabledSteps.length + disabledIndex + 1,
                  skip_if_empty: true,
                  is_mandatory: true,
                  description: '',
                  enabled: false, // Выключен (нет в БД)
                })
                disabledIndex++
              }
            }
          })

          const mergedSteps = [...enabledSteps, ...disabledSteps]
          console.log('[ApprovalFlow] Merged steps:', mergedSteps)
          setSteps(mergedSteps)
        } else {
          // Шаблон существует, но этапов нет - показываем дефолтную схему (все включены)
          console.log('[ApprovalFlow] Template found but no steps. Using default')
          initializeDefaultSteps()
        }
      } catch (error) {
        // Нет активной цепочки - создаём дефолтную схему (все включены)
        console.log('[ApprovalFlow] No active template, using default', error)
        initializeDefaultSteps()
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
      // В случае ошибки всё равно показываем дефолтную схему
      initializeDefaultSteps()
    } finally {
      setLoading(false)
    }
  }

  // Инициализация дефолтной схемы согласования
  const initializeDefaultSteps = () => {
    console.log('[ApprovalFlow] Initializing default steps from:', DEFAULT_APPROVAL_STEPS)
    const defaultSteps: ApprovalStepWithToggle[] = DEFAULT_APPROVAL_STEPS.map((step, index) => ({
      id: -(index + 1), // Временный отрицательный id
      role: step.role,
      role_display: step.role_display,
      order: index + 1,
      skip_if_empty: true,
      is_mandatory: true,
      description: '',
      enabled: step.enabled,
    }))
    console.log('[ApprovalFlow] Created default steps:', defaultSteps)
    setSteps(defaultSteps)
    console.log('[ApprovalFlow] Steps state updated')
  }

  // Переключение включения/выключения этапа
  const handleToggleStep = (index: number, enabled: boolean) => {
    const updatedSteps = [...steps]
    updatedSteps[index] = { ...updatedSteps[index], enabled }
    setSteps(updatedSteps)
  }

  // Обработка перетаскивания
  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setSteps((items) => {
        // Используем новый формат ключа: role-index
        const oldIndex = items.findIndex((item, idx) => `${item.role}-${idx}` === active.id)
        const newIndex = items.findIndex((item, idx) => `${item.role}-${idx}` === over.id)

        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  // Сохранение схемы согласования
  const handleSave = async () => {
    try {
      setSaving(true)

      // Фильтруем только включенные этапы и обновляем порядок
      const enabledSteps = steps
        .filter(step => step.enabled)
        .map((step, index) => ({
          role: step.role,
          // role_display НЕ отправляем - это read-only поле
          order: index + 1,
          skip_if_empty: step.skip_if_empty ?? true,
          is_mandatory: step.is_mandatory ?? true,
          description: step.description || '',
        }))

      console.log('[ApprovalFlow] Enabled steps to save:', enabledSteps)

      if (enabledSteps.length === 0) {
        message.warning('Необходимо включить хотя бы один этап согласования')
        return
      }

      if (flowTemplate?.id) {
        // Обновление существующего шаблона
        const payload = {
          name: flowTemplate.name,
          description: flowTemplate.description,
          is_active: true,
          steps: enabledSteps,
        }
        console.log('[ApprovalFlow] Updating template with payload:', payload)
        await approvalFlowsAPI.updateFlowTemplate(flowTemplate.id, payload)
        message.success('Схема согласования обновлена')
      } else {
        // Создание нового шаблона
        const payload = {
          name: 'Схема согласования',
          description: 'Стандартная схема согласования заявок на материалы',
          company: user?.company!,
          is_active: true,
          steps: enabledSteps,
        }
        console.log('[ApprovalFlow] Creating template with payload:', payload)
        const created = await approvalFlowsAPI.createFlowTemplate(payload)
        setFlowTemplate(created)
        message.success('Схема согласования создана')
      }

      // Перезагружаем данные
      await loadData()
    } catch (error: any) {
      console.error('[ApprovalFlow] Save error:', error)
      console.error('[ApprovalFlow] Error response:', error.response?.data)
      message.error(error.response?.data?.detail || error.response?.data?.error || 'Ошибка сохранения схемы согласования')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Настройка цепочки согласования</Title>

      <Alert
        message="Как это работает?"
        description={
          <div>
            <Paragraph>
              • <strong>Переключатель</strong> - включает/выключает этап в цепочке согласования
            </Paragraph>
            <Paragraph>
              • <strong>Перетаскивание</strong> - меняет порядок этапов (захватите за иконку ≡)
            </Paragraph>
            <Paragraph>
              • После изменений нажмите <strong>"Сохранить"</strong> для применения схемы
            </Paragraph>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card
        title="Этапы согласования"
        extra={
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
          >
            Сохранить
          </Button>
        }
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={steps.map((step, index) => `${step.role}-${index}`)}
            strategy={verticalListSortingStrategy}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}></th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>№</th>
                  <th style={{ padding: '12px 8px' }}>Роль согласующего</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Включен</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step, index) => (
                  <SortableStepRow
                    key={`${step.role}-${index}`}
                    step={step}
                    index={index}
                    onToggle={handleToggleStep}
                  />
                ))}
              </tbody>
            </table>
          </SortableContext>
        </DndContext>

        {steps.filter(s => s.enabled).length === 0 && (
          <Alert
            message="Внимание"
            description="Не выбрано ни одного этапа. Включите хотя бы один этап для создания схемы согласования."
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}

        <div style={{ marginTop: 24, padding: '16px', backgroundColor: '#f5f5f5', borderRadius: 4 }}>
          <Paragraph strong>Активных этапов: {steps.filter(s => s.enabled).length} из {steps.length}</Paragraph>
          {steps.filter(s => s.enabled).length > 0 && (
            <Paragraph style={{ marginBottom: 0 }}>
              Порядок согласования:{' '}
              {steps
                .filter(s => s.enabled)
                .map(s => s.role_display)
                .join(' → ')}
            </Paragraph>
          )}
        </div>
      </Card>
    </div>
  )
}
