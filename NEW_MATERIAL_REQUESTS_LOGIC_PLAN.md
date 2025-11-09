# 📋 ПЛАН РЕАЛИЗАЦИИ НОВОЙ ЛОГИКИ ЗАЯВОК НА МАТЕРИАЛЫ

**Дата создания:** 2025-11-09
**Статус:** Планирование
**Приоритет:** Высокий

---

## 🎯 ТРЕБОВАНИЯ ПОЛЬЗОВАТЕЛЯ

### Новая логика работы страницы `/dashboard/material-requests`:

#### 1️⃣ **Этапы согласования заявок**
- Соблюдать порядок согласования по списку "Роль согласующего" со страницы `/dashboard/settings/approval-flow`
- Если этап согласований изменится, все НЕ согласованные заявки должны автоматически перейти на новый этап цепочки согласований
- ✅ **УЖЕ РЕАЛИЗОВАНО** в методе `reconfigure_pending_approvals()` (см. `/DYNAMIC_APPROVAL_CHAIN_RECONFIGURATION.md`)

#### 2️⃣ **Вкладка "На оплате"**
После согласования **последнего этапа** из "Этапы согласования":
- Позиция фильтруется на вкладку **"На оплате"**
- Статус позиций: **"Не оплачено"**
- **Только Снабженец** может нажать кнопку **"Оплачено"**
- После нажатия "Оплачено" → позиция фильтруется на вкладку **"На доставке"**

#### 3️⃣ **Вкладка "На доставке"**
- Позиции ожидают доставку на строительный объект
- Статус позиций: **"Принять"**
- Доступ к кнопке **"Принять"** имеют роли:
  - Начальник участка (SITE_MANAGER)
  - Прораб (FOREMAN)
  - Мастер (MASTER)
  - Завсклад объекта (SITE_WAREHOUSE_MANAGER)
- После нажатия **"Принять"** → проверка количества:
  - Если `actual_quantity >= quantity` → переход на вкладку **"Отработанные заявки"**
  - Если `actual_quantity < quantity` → остается на вкладке **"На доставке"**

#### 4️⃣ **Графа "Кол-во по факту"**
- Право менять имеют роли:
  - Начальник участка (SITE_MANAGER)
  - Прораб (FOREMAN)
  - Мастер (MASTER)
  - Завсклад объекта (SITE_WAREHOUSE_MANAGER)
- Автоматический переход: если `actual_quantity >= quantity` → вкладка **"Отработанные заявки"**

#### 5️⃣ **Структура таблицы**

**Общая структура (все вкладки):**
| Дата | Номер (п/п) | Материал | Ед. изм. | Кол-во по заявке | Примечания | Автор | Статус | Последнее действие | Действия |

**Вкладка "На доставке" (дополнительно):**
| Дата | Номер (п/п) | Материал | Ед. изм. | Кол-во по заявке | **Кол-во по факту** | Примечания | Автор | Статус | Последнее действие | Действия |

---

## 🔍 АНАЛИЗ СУЩЕСТВУЮЩЕЙ СИСТЕМЫ

### Текущая архитектура (2 уровня):

#### **Уровень 1: MaterialRequest (Заявка)**
```python
MaterialRequest:
  - status: DRAFT | IN_PROGRESS | APPROVED | REJECTED | COMPLETED
  - current_step: ApprovalStep  # Текущий этап согласования
  - responsible: User            # Ответственный за текущий этап
  - approvals: [MaterialRequestApproval]  # Записи согласований
```

**Workflow:**
1. Автор создает заявку → статус `DRAFT`
2. Отправка на согласование → статус `IN_PROGRESS`
3. Прохождение цепочки согласования (настраивается в `/dashboard/settings/approval-flow`)
4. Все этапы пройдены → статус `APPROVED`

#### **Уровень 2: MaterialRequestItem (Позиция)**
```python
MaterialRequestItem:
  - item_status: ProcessStatus  # 19 статусов (см. ниже)
  - quantity: Decimal           # Количество по заявке
  - actual_quantity: Decimal    # Фактически получено
  - issued_quantity: Decimal    # Выдано со склада
```

**Текущие ProcessStatus (19 статусов):**
```python
DRAFT                           # Черновик
UNDER_REVIEW                    # Снабжение (проверка)
WAREHOUSE_CHECK                 # Завсклад
BACK_TO_SUPPLY                  # Снабжение (после склада)
ENGINEER_APPROVAL               # Инженер ПТО
BACK_TO_SUPPLY_AFTER_ENGINEER   # Снабжение (после инженера)
PROJECT_MANAGER_APPROVAL        # Руководитель проекта
BACK_TO_SUPPLY_AFTER_PM         # Снабжение (после рук.проекта)
DIRECTOR_APPROVAL               # Директор
BACK_TO_SUPPLY_AFTER_DIRECTOR   # Снабжение (после директора)
RETURNED_FOR_REVISION           # На доработке (у автора)
REWORK                          # На доработке
APPROVED                        # Согласовано
SENT_TO_SITE                    # Отправить на объект
WAREHOUSE_SHIPPING              # Отправлено на объект
PAYMENT                         # На оплате
PAID                            # Оплачено
DELIVERY                        # Доставлено
COMPLETED                       # Отработано
```

---

## ⚠️ ПРОБЛЕМА: Два параллельных workflow

### Текущая ситуация:
1. **MaterialRequest.status** использует ApprovalFlowTemplate (настраиваемая цепочка)
2. **MaterialRequestItem.item_status** использует жестко закодированные статусы (ProcessStatus)

### Конфликт:
- Пользователь настраивает цепочку согласования через `/dashboard/settings/approval-flow`
- Но позиции материалов проходят через ФИКСИРОВАННУЮ цепочку в ProcessStatus
- Это приводит к рассинхронизации:
  - Заявка может быть `APPROVED` на уровне MaterialRequest
  - Но позиции все еще в статусе `ENGINEER_APPROVAL` или `DIRECTOR_APPROVAL`

---

## 🎯 РЕШЕНИЕ: Унификация workflow

### Концепция:

**Отказаться от жестко закодированных статусов ProcessStatus для согласования.**

Вместо этого:
1. **Этапы согласования** - управляются через ApprovalFlowTemplate (уже реализовано)
2. **После согласования** - упрощенная цепочка для оплаты/доставки/приемки

### Новая схема ProcessStatus (упрощенная, 7 статусов):

```python
class ProcessStatus(models.TextChoices):
    # 1. Подготовка и согласование (связано с MaterialRequest.status)
    DRAFT = 'DRAFT', _('Черновик')
    IN_APPROVAL = 'IN_APPROVAL', _('На согласовании')
    RETURNED_FOR_REVISION = 'RETURNED_FOR_REVISION', _('На доработке')

    # 2. После полного согласования (упрощенная цепочка)
    PAYMENT = 'PAYMENT', _('На оплате')
    DELIVERY = 'DELIVERY', _('На доставке')

    # 3. Завершение
    COMPLETED = 'COMPLETED', _('Отработано')
    CANCELLED = 'CANCELLED', _('Отменено')
```

### Логика работы:

#### **Этап 1: Согласование (связь с MaterialRequest)**
```
Автор создает заявку
         ↓
MaterialRequest.status = IN_PROGRESS
MaterialRequestItem.item_status = IN_APPROVAL
         ↓
Прохождение цепочки согласования из ApprovalFlowTemplate:
  - Роли настраиваются администратором
  - Порядок согласования гибкий
  - При изменении цепочки - автоматическая перенастройка (уже реализовано)
         ↓
Все этапы согласования пройдены
MaterialRequest.status = APPROVED
         ↓
Автоматический переход всех позиций:
MaterialRequestItem.item_status = PAYMENT
```

#### **Этап 2: Оплата (только Снабженец)**
```
Вкладка "На оплате"
Статус позиций: PAYMENT
Кнопка: "Оплачено" (доступ: SUPPLY_MANAGER)
         ↓
Снабженец нажимает "Оплачено"
         ↓
MaterialRequestItem.item_status = DELIVERY
```

#### **Этап 3: Доставка и приемка (ИТР на объекте)**
```
Вкладка "На доставке"
Статус позиций: DELIVERY
Кнопка: "Принять" (доступ: SITE_MANAGER, FOREMAN, MASTER, SITE_WAREHOUSE_MANAGER)
Поле: actual_quantity (редактируется теми же ролями)
         ↓
ИТР указывает actual_quantity
ИТР нажимает "Принять"
         ↓
Проверка: actual_quantity >= quantity?
  ✅ ДА → item_status = COMPLETED (вкладка "Отработанные заявки")
  ❌ НЕТ → остается в DELIVERY (вкладка "На доставке")
```

---

## 📋 ДЕТАЛЬНЫЙ ПЛАН РЕАЛИЗАЦИИ

### **ШАГ 1: Изменения в Backend**

#### 1.1. Упростить ProcessStatus в models.py

**Файл:** `/backend/apps/material_requests/models.py`

**Было (19 статусов):**
```python
class ProcessStatus(models.TextChoices):
    DRAFT = 'DRAFT', _('Черновик')
    UNDER_REVIEW = 'UNDER_REVIEW', _('Снабжение (проверка)')
    WAREHOUSE_CHECK = 'WAREHOUSE_CHECK', _('Завсклад')
    BACK_TO_SUPPLY = 'BACK_TO_SUPPLY', _('Снабжение (после склада)')
    ENGINEER_APPROVAL = 'ENGINEER_APPROVAL', _('Инженер ПТО')
    BACK_TO_SUPPLY_AFTER_ENGINEER = 'BACK_TO_SUPPLY_AFTER_ENGINEER', _('Снабжение (после инженера)')
    PROJECT_MANAGER_APPROVAL = 'PROJECT_MANAGER_APPROVAL', _('Руководитель проекта')
    BACK_TO_SUPPLY_AFTER_PM = 'BACK_TO_SUPPLY_AFTER_PM', _('Снабжение (после рук.проекта)')
    DIRECTOR_APPROVAL = 'DIRECTOR_APPROVAL', _('Директор')
    BACK_TO_SUPPLY_AFTER_DIRECTOR = 'BACK_TO_SUPPLY_AFTER_DIRECTOR', _('Снабжение (после директора)')
    RETURNED_FOR_REVISION = 'RETURNED_FOR_REVISION', _('На доработке (у автора)')
    REWORK = 'REWORK', _('На доработке')
    APPROVED = 'APPROVED', _('Согласовано')
    SENT_TO_SITE = 'SENT_TO_SITE', _('Отправить на объект')
    WAREHOUSE_SHIPPING = 'WAREHOUSE_SHIPPING', _('Отправлено на объект')
    PAYMENT = 'PAYMENT', _('На оплате')
    PAID = 'PAID', _('Оплачено')
    DELIVERY = 'DELIVERY', _('Доставлено')
    COMPLETED = 'COMPLETED', _('Отработано')
```

**Стало (7 статусов):**
```python
class ProcessStatus(models.TextChoices):
    DRAFT = 'DRAFT', _('Черновик')
    IN_APPROVAL = 'IN_APPROVAL', _('На согласовании')
    RETURNED_FOR_REVISION = 'RETURNED_FOR_REVISION', _('На доработке')
    PAYMENT = 'PAYMENT', _('На оплате')
    DELIVERY = 'DELIVERY', _('На доставке')
    COMPLETED = 'COMPLETED', _('Отработано')
    CANCELLED = 'CANCELLED', _('Отменено')
```

#### 1.2. Создать миграцию для конвертации старых статусов

**Файл:** `/backend/apps/material_requests/migrations/0XXX_simplify_process_status.py`

**Логика миграции:**
```python
# Маппинг старых статусов на новые
STATUS_MAPPING = {
    'DRAFT': 'DRAFT',
    'UNDER_REVIEW': 'IN_APPROVAL',
    'WAREHOUSE_CHECK': 'IN_APPROVAL',
    'BACK_TO_SUPPLY': 'IN_APPROVAL',
    'ENGINEER_APPROVAL': 'IN_APPROVAL',
    'BACK_TO_SUPPLY_AFTER_ENGINEER': 'IN_APPROVAL',
    'PROJECT_MANAGER_APPROVAL': 'IN_APPROVAL',
    'BACK_TO_SUPPLY_AFTER_PM': 'IN_APPROVAL',
    'DIRECTOR_APPROVAL': 'IN_APPROVAL',
    'BACK_TO_SUPPLY_AFTER_DIRECTOR': 'IN_APPROVAL',
    'RETURNED_FOR_REVISION': 'RETURNED_FOR_REVISION',
    'REWORK': 'RETURNED_FOR_REVISION',
    'APPROVED': 'PAYMENT',  # После согласования → на оплату
    'SENT_TO_SITE': 'DELIVERY',
    'WAREHOUSE_SHIPPING': 'DELIVERY',
    'PAYMENT': 'PAYMENT',
    'PAID': 'DELIVERY',  # Оплачено → на доставке
    'DELIVERY': 'DELIVERY',
    'COMPLETED': 'COMPLETED',
}

def migrate_item_statuses(apps, schema_editor):
    MaterialRequestItem = apps.get_model('material_requests', 'MaterialRequestItem')

    for old_status, new_status in STATUS_MAPPING.items():
        MaterialRequestItem.objects.filter(
            item_status=old_status
        ).update(item_status=new_status)
```

#### 1.3. Упростить ITEM_STATUS_TRANSITIONS

**Файл:** `/backend/apps/material_requests/views.py`

**Было (сложная логика с 19 статусами):**
```python
ITEM_STATUS_TRANSITIONS = {
    'SUPPLY_MANAGER': [
        ('UNDER_REVIEW', 'WAREHOUSE_CHECK'),
        ('BACK_TO_SUPPLY', 'ENGINEER_APPROVAL'),
        # ... 10+ переходов
    ],
    # ... 7 ролей с множеством переходов
}
```

**Стало (простая логика с 7 статусами):**
```python
ITEM_STATUS_TRANSITIONS = {
    # Автор (Прораб, Мастер, Начальник участка) - создание и доработка
    'FOREMAN': [
        ('DRAFT', 'IN_APPROVAL'),                      # Создание заявки
        ('RETURNED_FOR_REVISION', 'IN_APPROVAL'),      # Отправка после доработки
    ],
    'MASTER': [
        ('DRAFT', 'IN_APPROVAL'),
        ('RETURNED_FOR_REVISION', 'IN_APPROVAL'),
    ],
    'SITE_MANAGER': [
        ('DRAFT', 'IN_APPROVAL'),
        ('RETURNED_FOR_REVISION', 'IN_APPROVAL'),
    ],

    # Снабженец - оплата
    'SUPPLY_MANAGER': [
        ('PAYMENT', 'DELIVERY'),  # Нажатие "Оплачено"
    ],

    # ИТР на объекте - приемка
    'SITE_MANAGER': [
        ('DELIVERY', 'COMPLETED'),  # Нажатие "Принять" (с проверкой actual_quantity)
    ],
    'FOREMAN': [
        ('DELIVERY', 'COMPLETED'),
    ],
    'MASTER': [
        ('DELIVERY', 'COMPLETED'),
    ],
    'SITE_WAREHOUSE_MANAGER': [
        ('DELIVERY', 'COMPLETED'),
    ],

    # Суперадмин - все переходы
    'SUPERADMIN': [
        ('DRAFT', 'IN_APPROVAL'),
        ('IN_APPROVAL', 'PAYMENT'),
        ('IN_APPROVAL', 'RETURNED_FOR_REVISION'),
        ('RETURNED_FOR_REVISION', 'IN_APPROVAL'),
        ('PAYMENT', 'DELIVERY'),
        ('DELIVERY', 'COMPLETED'),
        ('DELIVERY', 'RETURNED_FOR_REVISION'),
    ],
}
```

#### 1.4. Автоматический переход позиций после согласования заявки

**Файл:** `/backend/apps/material_requests/models.py`

**Метод:** `MaterialRequest.move_to_next_step()`

**Добавить логику:**
```python
def move_to_next_step(self):
    """..."""
    # ... существующая логика ...

    # Получаем следующий этап с статусом PENDING
    next_approval = self.approvals.filter(
        status='PENDING'
    ).order_by('step__order').first()

    if not next_approval:
        # Все этапы пройдены - заявка согласована
        self.status = self.Status.APPROVED
        self.current_step = None
        self.responsible = None
        self.save(update_fields=['status', 'current_step', 'responsible'])

        # НОВОЕ: Автоматический переход всех позиций на оплату
        self.items.filter(
            item_status='IN_APPROVAL'
        ).update(item_status='PAYMENT')

        # Логирование
        self._log_history(
            user=None,
            old_status='На согласовании',
            new_status='На оплате',
            comment='Все этапы согласования пройдены. Позиции переведены на оплату.'
        )

        # ... отправка email ...
        return

    # ... остальная логика ...
```

#### 1.5. Обновить проверку actual_quantity при переходе в COMPLETED

**Файл:** `/backend/apps/material_requests/views.py`

**Метод:** `change_item_status()`

**Существующая логика (уже реализована):**
```python
# ЛОГИКА: Проверка фактического количества при переходе в COMPLETED
if new_status == 'COMPLETED':
    actual = item.actual_quantity or 0
    requested = item.quantity

    if actual < requested:
        missing = requested - actual
        return Response({
            'detail': (
                f'Невозможно завершить позицию: по факту получено {actual} {item.unit}, '
                f'а запрошено {requested} {item.unit}. '
                f'Необходимо получить еще {missing} {item.unit}.'
            ),
            'actual_quantity': float(actual),
            'requested_quantity': float(requested),
            'missing_quantity': float(missing)
        }, status=status.HTTP_400_BAD_REQUEST)
```

✅ **Эта логика уже работает корректно!**

#### 1.6. Добавить endpoint для обновления actual_quantity

**Файл:** `/backend/apps/material_requests/views.py`

**Новый метод:**
```python
@action(detail=True, methods=['patch'], url_path='update-actual-quantity')
def update_actual_quantity(self, request, pk=None):
    """
    Обновление фактического количества позиции.
    Доступ: SITE_MANAGER, FOREMAN, MASTER, SITE_WAREHOUSE_MANAGER

    Если actual_quantity >= quantity, автоматически переводит в COMPLETED
    """
    item = self.get_object()
    user = request.user

    # Проверка прав доступа
    allowed_roles = ['SITE_MANAGER', 'FOREMAN', 'MASTER', 'SITE_WAREHOUSE_MANAGER', 'SUPERADMIN']
    if user.role not in allowed_roles and not user.is_superuser:
        return Response(
            {'detail': 'У вас нет прав для изменения фактического количества'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Получаем новое значение
    actual_quantity = request.data.get('actual_quantity')
    if actual_quantity is None:
        return Response(
            {'detail': 'Необходимо указать actual_quantity'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Обновляем количество
    old_actual = item.actual_quantity or 0
    item.actual_quantity = actual_quantity
    item.save(update_fields=['actual_quantity'])

    # Логирование
    MaterialRequestHistory.objects.create(
        request=item.request,
        user=user,
        old_status=f'Кол-во по факту: {old_actual}',
        new_status=f'Кол-во по факту: {actual_quantity}',
        comment=f'Обновлено фактическое количество для "{item.material_name}"'
    )

    # Проверка автоматического перехода в COMPLETED
    if item.item_status == 'DELIVERY' and actual_quantity >= item.quantity:
        item.item_status = 'COMPLETED'
        item.save(update_fields=['item_status'])

        MaterialRequestHistory.objects.create(
            request=item.request,
            user=None,
            old_status='На доставке',
            new_status='Отработано',
            comment=f'Позиция "{item.material_name}" автоматически завершена (получено полное количество)'
        )

    serializer = self.get_serializer(item)
    return Response(serializer.data)
```

---

### **ШАГ 2: Изменения в Frontend**

#### 2.1. Обновить константы статусов

**Файл:** `/frontend/src/pages/MaterialRequests.tsx`

**Удалить старые константы:**
```typescript
const IN_PROGRESS_STATUSES = [
  'UNDER_REVIEW', 'WAREHOUSE_CHECK', 'BACK_TO_SUPPLY',
  'ENGINEER_APPROVAL', 'BACK_TO_SUPPLY_AFTER_ENGINEER',
  'PROJECT_MANAGER_APPROVAL', 'BACK_TO_SUPPLY_AFTER_PM',
  'DIRECTOR_APPROVAL', 'RETURNED_FOR_REVISION'
];

const APPROVED_STATUSES = [
  'BACK_TO_SUPPLY_AFTER_DIRECTOR', 'APPROVED',
  'PAYMENT', 'PAID', 'DELIVERY',
  'SENT_TO_SITE', 'WAREHOUSE_SHIPPING'
];
```

**Добавить новые константы:**
```typescript
const APPROVAL_STATUSES = ['IN_APPROVAL'];  // На согласовании
const PAYMENT_STATUSES = ['PAYMENT'];       // На оплате
const DELIVERY_STATUSES = ['DELIVERY'];     // На доставке
const COMPLETED_STATUSES = ['COMPLETED'];   // Отработанные
```

#### 2.2. Обновить вкладки

**Файл:** `/frontend/src/pages/MaterialRequests.tsx`

**Было:**
```typescript
<Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
  <TabPane tab="Все заявки" key="all" />
  <TabPane tab="На согласовании" key="in_progress" />
  <TabPane tab="Согласованные заявки" key="approved" />
  <TabPane tab="Отработанные заявки" key="completed" />
</Tabs>
```

**Стало:**
```typescript
<Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
  <TabPane tab="Все заявки" key="all" />
  <TabPane tab="На согласовании" key="approval" />
  <TabPane tab="На оплате" key="payment" />
  <TabPane tab="На доставке" key="delivery" />
  <TabPane tab="Отработанные заявки" key="completed" />
</Tabs>
```

#### 2.3. Обновить функцию фильтрации

**Файл:** `/frontend/src/pages/MaterialRequests.tsx`

**Было:**
```typescript
const getFilteredData = (data: FlatMaterialRow[]) => {
  return data.filter(row => {
    if (!row.material) return false;
    const status = row.material.item_status;

    if (activeTab === 'in_progress') {
      return IN_PROGRESS_STATUSES.includes(status);
    }
    if (activeTab === 'approved') {
      return APPROVED_STATUSES.includes(status);
    }
    if (activeTab === 'completed') {
      return status === 'COMPLETED';
    }
    return true;
  });
};
```

**Стало:**
```typescript
const getFilteredData = (data: FlatMaterialRow[]) => {
  return data.filter(row => {
    if (!row.material) return false;
    const status = row.material.item_status;

    if (activeTab === 'approval') {
      return status === 'IN_APPROVAL';
    }
    if (activeTab === 'payment') {
      return status === 'PAYMENT';
    }
    if (activeTab === 'delivery') {
      return status === 'DELIVERY';
    }
    if (activeTab === 'completed') {
      return status === 'COMPLETED';
    }
    return true; // Вкладка "Все заявки"
  });
};
```

#### 2.4. Обновить колонки таблицы

**Файл:** `/frontend/src/pages/MaterialRequests.tsx`

**Добавить условную колонку "Кол-во по факту" для вкладки "На доставке":**
```typescript
const columns = [
  {
    title: 'Дата',
    dataIndex: 'created_at',
    key: 'created_at',
    render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
  },
  {
    title: 'Номер (п/п)',
    dataIndex: 'order',
    key: 'order',
  },
  {
    title: 'Материал',
    dataIndex: 'material_name',
    key: 'material_name',
  },
  {
    title: 'Ед. изм.',
    dataIndex: 'unit',
    key: 'unit',
  },
  {
    title: 'Кол-во по заявке',
    dataIndex: 'quantity',
    key: 'quantity',
  },

  // НОВОЕ: Условная колонка "Кол-во по факту" (только для вкладки "На доставке")
  ...(activeTab === 'delivery' ? [{
    title: 'Кол-во по факту',
    dataIndex: 'actual_quantity',
    key: 'actual_quantity',
    render: (value: number, record: any) => {
      const canEdit = canEditActualQuantity();

      if (canEdit) {
        return (
          <InputNumber
            min={0}
            value={value || 0}
            onChange={(newValue) => handleActualQuantityChange(record.material, newValue)}
            style={{ width: '100%' }}
          />
        );
      }
      return value || 0;
    },
  }] : []),

  {
    title: 'Примечания',
    dataIndex: 'specifications',
    key: 'specifications',
  },
  {
    title: 'Автор',
    dataIndex: 'author_name',
    key: 'author_name',
  },
  {
    title: 'Статус',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => (
      <Tag color={getStatusColor(status)}>
        {getStatusLabel(status)}
      </Tag>
    ),
  },
  {
    title: 'Последнее действие',
    dataIndex: 'updated_at',
    key: 'updated_at',
    render: (date: string) => new Date(date).toLocaleString('ru-RU'),
  },
  {
    title: 'Действия',
    key: 'actions',
    render: (_, record) => renderActions(record),
  },
];
```

#### 2.5. Добавить функции для работы с actual_quantity

**Файл:** `/frontend/src/pages/MaterialRequests.tsx`

**Новые функции:**
```typescript
// Проверка прав на редактирование actual_quantity
const canEditActualQuantity = () => {
  if (user?.is_superuser || user?.role === 'SUPERADMIN') {
    return true;
  }
  const allowedRoles = ['SITE_MANAGER', 'FOREMAN', 'MASTER', 'SITE_WAREHOUSE_MANAGER'];
  return allowedRoles.includes(user?.role || '');
};

// Обработчик изменения actual_quantity
const handleActualQuantityChange = async (item: any, newValue: number | null) => {
  if (newValue === null || newValue < 0) return;

  try {
    await materialRequestsAPI.updateActualQuantity(item.id, newValue);
    message.success('Фактическое количество обновлено');

    // Автоматическая проверка перехода в COMPLETED
    if (newValue >= item.quantity) {
      message.info('Позиция получила полное количество и перемещена в "Отработанные заявки"');
    }

    fetchRequests(); // Перезагрузить данные
  } catch (error: any) {
    message.error(error.response?.data?.detail || 'Ошибка при обновлении количества');
  }
};
```

#### 2.6. Обновить кнопки действий

**Файл:** `/frontend/src/pages/MaterialRequests.tsx`

**Новые кнопки:**
```typescript
const renderActions = (record: any) => {
  const itemStatus = record.material?.item_status;
  const isCancelled = record.material?.status === 'CANCELLED';

  if (isCancelled) {
    return <Tag color="red">Отменена</Tag>;
  }

  // Вкладка "На оплате" - кнопка "Оплачено" (только Снабженец)
  if (itemStatus === 'PAYMENT' && canPayItem()) {
    return (
      <Button
        type="primary"
        size="small"
        onClick={() => handleChangeItemStatus(record.material, 'DELIVERY', 'Оплачено')}
        block
      >
        Оплачено
      </Button>
    );
  }

  // Вкладка "На доставке" - кнопка "Принять" (ИТР на объекте)
  if (itemStatus === 'DELIVERY' && canAcceptDelivery()) {
    return (
      <Button
        type="primary"
        icon={<CheckOutlined />}
        size="small"
        onClick={() => handleAcceptDelivery(record.material)}
        block
      >
        Принять
      </Button>
    );
  }

  return null;
};

// Проверка прав на оплату
const canPayItem = () => {
  if (user?.is_superuser || user?.role === 'SUPERADMIN') {
    return true;
  }
  return user?.role === 'SUPPLY_MANAGER';
};

// Проверка прав на приемку
const canAcceptDelivery = () => {
  if (user?.is_superuser || user?.role === 'SUPERADMIN') {
    return true;
  }
  const allowedRoles = ['SITE_MANAGER', 'FOREMAN', 'MASTER', 'SITE_WAREHOUSE_MANAGER'];
  return allowedRoles.includes(user?.role || '');
};

// Обработчик приемки (с проверкой actual_quantity)
const handleAcceptDelivery = async (item: any) => {
  const actual = item.actual_quantity || 0;
  const requested = item.quantity;

  if (actual < requested) {
    Modal.confirm({
      title: 'Недостаточное количество',
      content: `По факту получено ${actual} ${item.unit}, а запрошено ${requested} ${item.unit}. Недостает ${requested - actual} ${item.unit}. Позиция останется на вкладке "На доставке". Продолжить?`,
      onOk: async () => {
        try {
          await materialRequestsAPI.changeItemStatus(item.id, 'COMPLETED');
          message.info('Попытка приемки выполнена, но позиция осталась на доставке из-за недостачи');
          fetchRequests();
        } catch (error: any) {
          message.error(error.response?.data?.detail || 'Ошибка при приемке');
        }
      },
    });
  } else {
    // Полное количество получено
    try {
      await materialRequestsAPI.changeItemStatus(item.id, 'COMPLETED');
      message.success('Материал принят и перемещен в "Отработанные заявки"');
      fetchRequests();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Ошибка при приемке');
    }
  }
};
```

#### 2.7. Обновить API методы

**Файл:** `/frontend/src/api/materialRequests.ts`

**Добавить новый метод:**
```typescript
export const materialRequestsAPI = {
  // ... существующие методы ...

  // Обновление фактического количества
  updateActualQuantity: async (itemId: number, actualQuantity: number) => {
    const response = await api.patch(
      `/material-requests/items/${itemId}/update-actual-quantity/`,
      { actual_quantity: actualQuantity }
    );
    return response.data;
  },
};
```

#### 2.8. Обновить маппинг статусов на цвета

**Файл:** `/frontend/src/pages/MaterialRequests.tsx`

**Упростить:**
```typescript
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    DRAFT: 'default',           // Черновик
    IN_APPROVAL: 'blue',        // На согласовании
    RETURNED_FOR_REVISION: 'orange',  // На доработке
    PAYMENT: 'gold',            // На оплате
    DELIVERY: 'cyan',           // На доставке
    COMPLETED: 'green',         // Отработано
    CANCELLED: 'red',           // Отменено
  };
  return colors[status] || 'default';
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    DRAFT: 'Черновик',
    IN_APPROVAL: 'На согласовании',
    RETURNED_FOR_REVISION: 'На доработке',
    PAYMENT: 'Не оплачено',
    DELIVERY: 'Принять',
    COMPLETED: 'Отработано',
    CANCELLED: 'Отменено',
  };
  return labels[status] || status;
};
```

---

### **ШАГ 3: Документация**

#### 3.1. Обновить MATERIAL_REQUESTS_APPROVAL_FLOW.md
- Описать новую упрощенную схему ProcessStatus
- Добавить схему взаимодействия уровней MaterialRequest и MaterialRequestItem
- Документировать новые статусы и переходы

#### 3.2. Создать документ миграции
- Создать `/MIGRATION_TO_SIMPLIFIED_WORKFLOW.md`
- Описать процесс миграции старых данных
- Предоставить примеры до/после

---

## 📊 СРАВНЕНИЕ: ДО и ПОСЛЕ

### ДО (текущая система):

**Проблемы:**
1. ❌ Два параллельных workflow (MaterialRequest + ProcessStatus)
2. ❌ 19 статусов позиций (сложно поддерживать)
3. ❌ Жестко закодированная цепочка согласования в ProcessStatus
4. ❌ Рассинхронизация между уровнями
5. ❌ Невозможность гибко настроить согласование
6. ❌ При изменении цепочки - конфликты в ProcessStatus

**Workflow:**
```
DRAFT → UNDER_REVIEW → WAREHOUSE_CHECK → BACK_TO_SUPPLY →
ENGINEER_APPROVAL → BACK_TO_SUPPLY_AFTER_ENGINEER →
PROJECT_MANAGER_APPROVAL → BACK_TO_SUPPLY_AFTER_PM →
DIRECTOR_APPROVAL → BACK_TO_SUPPLY_AFTER_DIRECTOR →
APPROVED → PAYMENT → PAID → DELIVERY → COMPLETED
```

### ПОСЛЕ (новая система):

**Преимущества:**
1. ✅ Унифицированный workflow через ApprovalFlowTemplate
2. ✅ 7 простых статусов позиций
3. ✅ Гибкая настройка согласования через drag-and-drop
4. ✅ Синхронизация уровней MaterialRequest и MaterialRequestItem
5. ✅ Автоматическая перенастройка при изменении цепочки
6. ✅ Простая и понятная логика для пользователей

**Workflow:**
```
DRAFT → IN_APPROVAL (проходит цепочку из ApprovalFlowTemplate) →
PAYMENT (Снабженец) → DELIVERY (ИТР на объекте) → COMPLETED
```

---

## ⚠️ РИСКИ И МЕРЫ ПРЕДОСТОРОЖНОСТИ

### Риск 1: Потеря данных при миграции
**Меры:**
- Создать резервную копию БД перед миграцией
- Протестировать миграцию на тестовой БД
- Создать обратную миграцию на случай отката

### Риск 2: Ломание существующих заявок
**Меры:**
- Миграция должна корректно конвертировать все старые статусы
- Для заявок в процессе - сохранить прогресс
- Логировать все изменения

### Риск 3: Изменение API может сломать фронтенд
**Меры:**
- Сохранить обратную совместимость API (старые статусы поддерживаются для чтения)
- Постепенный переход: сначала backend, потом frontend
- Версионирование API

---

## 📋 ЧЕКЛИСТ РЕАЛИЗАЦИИ

### Backend:
- [ ] Упростить ProcessStatus (7 статусов вместо 19)
- [ ] Создать миграцию для конвертации старых статусов
- [ ] Упростить ITEM_STATUS_TRANSITIONS
- [ ] Добавить автоматический переход позиций в PAYMENT после согласования
- [ ] Создать endpoint для обновления actual_quantity
- [ ] Обновить проверку actual_quantity при переходе в COMPLETED (уже реализовано)
- [ ] Протестировать все переходы статусов

### Frontend:
- [ ] Обновить константы статусов
- [ ] Изменить вкладки (4 вкладки: Согласование, На оплате, На доставке, Отработанные)
- [ ] Обновить функцию фильтрации
- [ ] Добавить условную колонку "Кол-во по факту"
- [ ] Реализовать редактирование actual_quantity
- [ ] Обновить кнопки действий
- [ ] Обновить маппинг статусов на цвета
- [ ] Добавить API метод updateActualQuantity

### Документация:
- [ ] Обновить MATERIAL_REQUESTS_APPROVAL_FLOW.md
- [ ] Создать MIGRATION_TO_SIMPLIFIED_WORKFLOW.md
- [ ] Обновить CLAUDE.md с новой логикой
- [ ] Создать руководство пользователя

### Тестирование:
- [ ] Тест: Создание заявки и прохождение согласования
- [ ] Тест: Изменение цепочки согласования (автоматическая перенастройка)
- [ ] Тест: Оплата позиции (только Снабженец)
- [ ] Тест: Приемка с полным количеством (переход в COMPLETED)
- [ ] Тест: Приемка с недостачей (остается в DELIVERY)
- [ ] Тест: Обновление actual_quantity (автоматический переход)
- [ ] Тест: Миграция старых заявок

---

## 🎯 ИТОГОВАЯ СХЕМА НОВОЙ ЛОГИКИ

```
┌─────────────────────────────────────────────────────────────────┐
│                    СОЗДАНИЕ ЗАЯВКИ                               │
│  Автор (Прораб/Мастер/Начальник участка)                        │
│  MaterialRequest.status = IN_PROGRESS                            │
│  MaterialRequestItem.item_status = IN_APPROVAL                   │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│              СОГЛАСОВАНИЕ (MaterialRequest level)                │
│  Проходит цепочку из /dashboard/settings/approval-flow          │
│  Роли настраиваются администратором (drag-and-drop)              │
│  При изменении цепочки - автоматическая перенастройка           │
│                                                                  │
│  Пример цепочки:                                                 │
│  1. Снабженец                                                    │
│  2. Завсклад                                                     │
│  3. Инженер ПТО                                                  │
│  4. Руководитель проекта                                         │
│  5. Директор                                                     │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
              ВСЕ ЭТАПЫ ПРОЙДЕНЫ
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│  MaterialRequest.status = APPROVED                               │
│  MaterialRequestItem.item_status = PAYMENT (автоматически)       │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                  ВКЛАДКА "НА ОПЛАТЕ"                             │
│  Статус позиций: PAYMENT ("Не оплачено")                        │
│  Кнопка: "Оплачено" (доступ: SUPPLY_MANAGER)                    │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
              СНАБЖЕНЕЦ НАЖИМАЕТ "ОПЛАЧЕНО"
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│  MaterialRequestItem.item_status = DELIVERY                      │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                 ВКЛАДКА "НА ДОСТАВКЕ"                            │
│  Статус позиций: DELIVERY ("Принять")                           │
│  Поле: actual_quantity (редактируется ИТР)                      │
│  Кнопка: "Принять" (доступ: SITE_MANAGER, FOREMAN, MASTER,      │
│                             SITE_WAREHOUSE_MANAGER)              │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
              ИТР УКАЗЫВАЕТ actual_quantity
              ИТР НАЖИМАЕТ "ПРИНЯТЬ"
                     ↓
              actual_quantity >= quantity?
                     ↓
        ┌────────────┴────────────┐
        ↓                         ↓
       ДА                        НЕТ
        ↓                         ↓
┌────────────────┐      ┌──────────────────────┐
│  COMPLETED     │      │  Остается DELIVERY   │
│  (Отработано)  │      │  (На доставке)       │
└────────────────┘      └──────────────────────┘
```

---

**Документ создан:** 2025-11-09
**Автор:** Claude Code
**Статус:** План готов к реализации
**Ожидаемое время реализации:** 4-6 часов
