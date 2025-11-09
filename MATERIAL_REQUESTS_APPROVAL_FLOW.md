# 📋 СХЕМА СОГЛАСОВАНИЯ ЗАЯВОК НА МАТЕРИАЛЫ

> **Дата создания**: 2025-11-09
> **Версия**: 2.0 (Новая настраиваемая система)
> **Статус**: Production

---

## 🎯 ОБЗОР СИСТЕМЫ

**Check_Site** использует **гибкую настраиваемую систему согласования** заявок на материалы.

### Ключевые особенности:

1. **Индивидуальная цепочка** для каждой компании
2. **Drag-and-drop интерфейс** для настройки через `/dashboard/settings/approval-flow`
3. **Две параллельные системы**:
   - **Уровень заявки** (MaterialRequest) - настраиваемая цепочка через ApprovalRole
   - **Уровень позиций** (MaterialRequestItem) - фиксированная бизнес-логика через ProcessStatus

---

## 📊 АРХИТЕКТУРА СИСТЕМЫ

### Модели данных:

```
ApprovalFlowTemplate (Шаблон цепочки)
    ├── company: Company                   # Компания-владелец
    ├── name: str                          # Название схемы
    ├── is_active: bool                    # Активная схема (только одна на компанию)
    ├── created_by: User                   # Кто создал
    └── steps: [ApprovalStep]              # Этапы согласования

ApprovalStep (Этап согласования)
    ├── flow_template: ApprovalFlowTemplate  # Принадлежит шаблону
    ├── role: ApprovalRole                   # Роль согласующего
    ├── order: int                           # Порядок (1, 2, 3...)
    ├── skip_if_empty: bool                  # Пропускать, если нет пользователя
    └── is_mandatory: bool                   # Обязательный этап

MaterialRequest (Заявка)
    ├── project: Project                     # Объект строительства
    ├── author: User                         # Автор (прораб/начальник участка)
    ├── request_number: str                  # З-{project_id}-{num}/{year}
    ├── status: Status                       # DRAFT | IN_PROGRESS | APPROVED | REJECTED | COMPLETED
    ├── current_step: ApprovalStep           # Текущий этап согласования
    ├── responsible: User                    # Ответственный за текущий этап
    ├── items: [MaterialRequestItem]         # Позиции материалов
    └── approvals: [MaterialRequestApproval] # Записи согласований

MaterialRequestApproval (Запись согласования)
    ├── material_request: MaterialRequest    # Заявка
    ├── step: ApprovalStep                   # Этап цепочки
    ├── approver: User                       # Кто должен согласовать
    ├── status: ApprovalStatus               # PENDING | APPROVED | REJECTED | SKIPPED
    ├── comment: str                         # Комментарий
    └── approved_at: datetime                # Дата согласования

MaterialRequestItem (Позиция материала)
    ├── request: MaterialRequest             # Родительская заявка
    ├── material_name: str                   # Название материала
    ├── quantity: Decimal                    # Количество по заявке
    ├── actual_quantity: Decimal             # Фактически получено
    ├── issued_quantity: Decimal             # Выдано со склада
    ├── unit: str                            # Единица измерения
    ├── item_status: ProcessStatus           # Статус в процессе (см. ниже)
    └── availability_status: AvailabilityStatus  # Наличие на складе
```

---

## 🔄 УРОВЕНЬ 1: СОГЛАСОВАНИЕ ЗАЯВКИ (MaterialRequest)

### Роли в цепочке согласования (ApprovalRole):

```python
DIRECTOR                   = 'DIRECTOR'                # Директор
CHIEF_ENGINEER             = 'CHIEF_ENGINEER'          # Главный инженер
PROJECT_MANAGER            = 'PROJECT_MANAGER'         # Руководитель проекта
CHIEF_POWER_ENGINEER ⭐    = 'CHIEF_POWER_ENGINEER'    # Главный энергетик (новая)
ENGINEER                   = 'ENGINEER'                # Инженер ПТО
SITE_MANAGER               = 'SITE_MANAGER'            # Начальник участка
FOREMAN                    = 'FOREMAN'                 # Прораб
POWER_ENGINEER ⭐          = 'POWER_ENGINEER'          # Энергетик (новая)
SUPPLY_MANAGER             = 'SUPPLY_MANAGER'          # Снабженец
WAREHOUSE_HEAD             = 'WAREHOUSE_HEAD'          # Завсклад центрального склада
SITE_WAREHOUSE_MANAGER     = 'SITE_WAREHOUSE_MANAGER'  # Завсклад объекта
```

**Всего: 11 ролей** (добавлены 2 новые роли энергетиков)

### Дефолтная схема согласования:

```
1. Снабженец          (SUPPLY_MANAGER)
2. Завсклад           (WAREHOUSE_HEAD)
3. Руководитель       (PROJECT_MANAGER)
4. Директор           (DIRECTOR)
```

*Примечание: Каждая компания может настроить свою индивидуальную цепочку через интерфейс.*

### Статусы заявки (MaterialRequest.Status):

| Статус         | Код           | Описание                               | Цвет    |
|----------------|---------------|----------------------------------------|---------|
| Черновик       | `DRAFT`       | Заявка создана, но не отправлена       | Серый   |
| На согласовании| `IN_PROGRESS` | Проходит цепочку согласования          | Синий   |
| Согласовано    | `APPROVED`    | Все этапы пройдены успешно             | Зелёный |
| Отклонено      | `REJECTED`    | Отклонена на каком-то этапе            | Красный |
| Выполнено      | `COMPLETED`   | Материалы получены и отработаны        | Зелёный |

### Жизненный цикл заявки:

```
┌──────────────────────────────────────────────────────────────┐
│ 1. СОЗДАНИЕ ЗАЯВКИ                                           │
├──────────────────────────────────────────────────────────────┤
│ Автор: Прораб/Мастер/Начальник участка                       │
│ Действия:                                                    │
│   • Создает заявку (status=DRAFT)                            │
│   • Генерируется номер: З-{project_id}-{num}/{year}          │
│   • Например: З-10-001/25 (проект 10, заявка 1, 2025 год)    │
│   • Добавляет позиции материалов                             │
│   • Заполняет доп.поля: чертёж, вид работ, примечание        │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. ИНИЦИАЛИЗАЦИЯ ЦЕПОЧКИ                                     │
├──────────────────────────────────────────────────────────────┤
│ Метод: material_request.initialize_approval_flow()           │
│ Действия:                                                    │
│   • Получает активную ApprovalFlowTemplate компании          │
│   • Если нет - создает default цепочку                       │
│   • Создает MaterialRequestApproval для каждого этапа        │
│   • Все записи со статусом PENDING                           │
│   • Вызывает move_to_next_step()                             │
│   • Отправляет email первому согласующему                    │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. ПЕРЕХОД НА ПЕРВЫЙ ЭТАП                                    │
├──────────────────────────────────────────────────────────────┤
│ Метод: material_request.move_to_next_step()                  │
│ Действия:                                                    │
│   • Находит первый ApprovalStep (order=1)                    │
│   • Ищет пользователя с нужной ролью (_find_approver)       │
│   • Сначала в project.team_members                           │
│   • Потом в company.users                                    │
│   • Если пользователь найден:                                │
│       - Устанавливает current_step                           │
│       - Устанавливает responsible = найденный пользователь   │
│       - status = IN_PROGRESS                                 │
│   • Если пользователь НЕ найден и skip_if_empty=True:        │
│       - Помечает этап как SKIPPED                            │
│       - Логирует в MaterialRequestHistory                    │
│       - Рекурсивно вызывает move_to_next_step()              │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 4. СОГЛАСОВАНИЕ ЭТАПА                                        │
├──────────────────────────────────────────────────────────────┤
│ API: POST /api/material-requests/{id}/approve/               │
│ Метод: material_request.approve_current_step(user, comment)  │
│                                                              │
│ Проверки:                                                    │
│   • Заявка находится на этапе согласования                   │
│   • Пользователь == approval.approver                        │
│                                                              │
│ Действия при успехе:                                         │
│   • approval.status = APPROVED                               │
│   • approval.approved_at = now()                             │
│   • approval.comment = comment                               │
│   • Логирует в MaterialRequestHistory                        │
│   • Вызывает move_to_next_step()                             │
│   • Отправляет email следующему согласующему                 │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 5. ПЕРЕХОД НА СЛЕДУЮЩИЙ ЭТАП                                 │
├──────────────────────────────────────────────────────────────┤
│ Действия в move_to_next_step():                              │
│   • Ищет следующий этап со статусом PENDING (по order)       │
│   • Если найден:                                             │
│       - Повторяет логику из шага 3                           │
│       - Отправляет email новому согласующему                 │
│   • Если НЕ найден (все этапы пройдены):                     │
│       - status = APPROVED                                    │
│       - current_step = NULL                                  │
│       - responsible = NULL                                   │
│       - Отправляет email автору о полном согласовании        │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 6. ОТКЛОНЕНИЕ ЗАЯВКИ (альтернативный путь)                   │
├──────────────────────────────────────────────────────────────┤
│ API: POST /api/material-requests/{id}/reject/                │
│ Метод: material_request.reject_request(user, comment)        │
│                                                              │
│ Проверки:                                                    │
│   • Заявка находится на этапе согласования                   │
│   • Пользователь == approval.approver                        │
│   • Комментарий обязателен                                   │
│                                                              │
│ Действия при отклонении:                                     │
│   • approval.status = REJECTED                               │
│   • approval.approved_at = now()                             │
│   • approval.comment = comment                               │
│   • material_request.status = REJECTED                       │
│   • current_step = NULL                                      │
│   • responsible = NULL                                       │
│   • Логирует в MaterialRequestHistory                        │
│   • Отправляет email автору об отклонении                    │
│                                                              │
│ ⚠️ ВАЖНО: Отклонение ПРЕРЫВАЕТ всю цепочку согласования!     │
└──────────────────────────────────────────────────────────────┘
```

### Email уведомления:

Система отправляет email на следующих этапах:

1. **При создании заявки** (`notification_type='created'`)
   - Кому: Первый согласующий
   - Когда: После `initialize_approval_flow()`

2. **При переходе на новый этап** (`notification_type='step_approved'`)
   - Кому: Следующий согласующий
   - Когда: После `approve_current_step()` → `move_to_next_step()`
   - Условие: Есть уже согласованные этапы (`has_approved_steps=True`)

3. **При полном согласовании** (`notification_type='fully_approved'`)
   - Кому: Автор заявки
   - Когда: Все этапы пройдены, `status=APPROVED`

4. **При отклонении** (`notification_type='rejected'`)
   - Кому: Автор заявки
   - Когда: `reject_request()`
   - Дополнительно: `rejection_reason`, `rejected_by_name`

Обработка: Celery task `send_material_request_notification.delay()`

---

## 🔄 УРОВЕНЬ 2: ДВИЖЕНИЕ ПОЗИЦИЙ (MaterialRequestItem)

### Статусы позиций (ProcessStatus):

Независимая система статусов для каждой позиции материала внутри заявки.

| № | Статус                            | Код                                | Кто работает           | Цвет       |
|---|-----------------------------------|------------------------------------|------------------------|------------|
| 1 | Черновик                          | `DRAFT`                            | Автор                  | Серый      |
| 2 | Снабжение (проверка)              | `UNDER_REVIEW`                     | Снабженец              | Синий      |
| 3 | Завсклад                          | `WAREHOUSE_CHECK`                  | Завсклад центр.склада  | Голубой    |
| 4 | Снабжение (после склада)          | `BACK_TO_SUPPLY`                   | Снабженец              | Синий      |
| 5 | Инженер ПТО                       | `ENGINEER_APPROVAL`                | Инженер ПТО            | Оранжевый  |
| 6 | Снабжение (после инженера)        | `BACK_TO_SUPPLY_AFTER_ENGINEER`    | Снабженец              | Синий      |
| 7 | Руководитель проекта              | `PROJECT_MANAGER_APPROVAL`         | Рук. проекта           | Темно-синий|
| 8 | Снабжение (после рук.проекта)     | `BACK_TO_SUPPLY_AFTER_PM`          | Снабженец              | Синий      |
| 9 | Директор                          | `DIRECTOR_APPROVAL`                | Директор/Гл.инженер    | Фиолетовый |
| 10| Снабжение (после директора)       | `BACK_TO_SUPPLY_AFTER_DIRECTOR`    | Снабженец              | Синий      |
| 11| На доработке (у автора)           | `RETURNED_FOR_REVISION`            | Автор                  | Красный    |
| 12| На доработке                      | `REWORK`                           | Автор                  | Оранжевый  |
| 13| Согласовано                       | `APPROVED`                         | Система                | Зелёный    |
| 14| Отправить на объект (у зав.склада)| `SENT_TO_SITE`                     | Завсклад объекта       | Голубой    |
| 15| Отправлено на объект (у автора)   | `WAREHOUSE_SHIPPING`               | Автор                  | Темно-синий|
| 16| На оплате                         | `PAYMENT`                          | Снабженец              | Золотой    |
| 17| Оплачено                          | `PAID`                             | Снабженец              | Салатовый  |
| 18| Доставлено                        | `DELIVERY`                         | Снабженец              | Пурпурный  |
| 19| Отработано                        | `COMPLETED`                        | Автор/Завсклад         | Зелёный    |

### Разрешенные переходы (ITEM_STATUS_TRANSITIONS):

```python
ITEM_STATUS_TRANSITIONS = {
    # Прораб/Мастер/Начальник участка
    'FOREMAN': [
        ('DRAFT', 'UNDER_REVIEW'),                    # Отправить на проверку
        ('REWORK', 'UNDER_REVIEW'),                   # Переотправить после доработки
        ('RETURNED_FOR_REVISION', 'UNDER_REVIEW'),    # Переотправить после замечаний
        ('DELIVERY', 'COMPLETED'),                    # Отработать доставленное
        ('WAREHOUSE_SHIPPING', 'COMPLETED'),          # Отработать отправленное
    ],

    'MASTER': [/* то же что FOREMAN */],
    'SITE_MANAGER': [/* то же что FOREMAN */],

    # Снабженец (основной координатор процесса)
    'SUPPLY_MANAGER': [
        ('UNDER_REVIEW', 'WAREHOUSE_CHECK'),              # На проверку склада
        ('BACK_TO_SUPPLY', 'ENGINEER_APPROVAL'),          # К инженеру
        ('BACK_TO_SUPPLY_AFTER_ENGINEER', 'PROJECT_MANAGER_APPROVAL'),  # К рук.проекта
        ('BACK_TO_SUPPLY_AFTER_PM', 'DIRECTOR_APPROVAL'), # К директору
        ('BACK_TO_SUPPLY_AFTER_DIRECTOR', 'APPROVED'),    # Согласовано
        ('APPROVED', 'PAYMENT'),                          # На оплату
        ('APPROVED', 'SENT_TO_SITE'),                     # Отправить на объект
        ('PAYMENT', 'PAID'),                              # Оплачено
        ('PAID', 'DELIVERY'),                             # Доставлено
    ],

    # Завсклад центрального склада
    'WAREHOUSE_HEAD': [
        ('WAREHOUSE_CHECK', 'BACK_TO_SUPPLY'),     # Проверил, возврат снабженцу
        ('SENT_TO_SITE', 'WAREHOUSE_SHIPPING'),    # Отправил на объект
        ('DELIVERY', 'COMPLETED'),                 # Отработано
        ('WAREHOUSE_SHIPPING', 'COMPLETED'),       # Отработано
    ],

    # Инженер ПТО
    'ENGINEER': [
        ('ENGINEER_APPROVAL', 'BACK_TO_SUPPLY_AFTER_ENGINEER'),  # Согласовал
        ('ENGINEER_APPROVAL', 'RETURNED_FOR_REVISION'),          # На доработку
    ],

    # Руководитель проекта
    'PROJECT_MANAGER': [
        ('PROJECT_MANAGER_APPROVAL', 'BACK_TO_SUPPLY_AFTER_PM'),  # Согласовал
        ('PROJECT_MANAGER_APPROVAL', 'RETURNED_FOR_REVISION'),    # На доработку
    ],

    # Директор / Главный инженер
    'DIRECTOR': [
        # Как автор
        ('DRAFT', 'UNDER_REVIEW'),
        ('REWORK', 'UNDER_REVIEW'),
        ('RETURNED_FOR_REVISION', 'UNDER_REVIEW'),
        ('DELIVERY', 'COMPLETED'),
        ('WAREHOUSE_SHIPPING', 'COMPLETED'),
        # Как согласующий
        ('DIRECTOR_APPROVAL', 'BACK_TO_SUPPLY_AFTER_DIRECTOR'),  # Согласовал
        ('DIRECTOR_APPROVAL', 'RETURNED_FOR_REVISION'),          # На доработку
    ],

    'CHIEF_ENGINEER': [
        ('DIRECTOR_APPROVAL', 'BACK_TO_SUPPLY_AFTER_DIRECTOR'),  # Согласовал
        ('DIRECTOR_APPROVAL', 'RETURNED_FOR_REVISION'),          # На доработку
    ],
}
```

### Визуальная схема движения позиции:

```
┌─────────────────────────────────────────────────────────────────┐
│ АВТОР (Прораб/Мастер/Начальник участка)                         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                      [DRAFT] Черновик
                            ↓
                   FOREMAN.send_to_review()
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ СНАБЖЕНЕЦ (Координатор процесса)                                │
├─────────────────────────────────────────────────────────────────┤
│ [UNDER_REVIEW] Снабжение (проверка)                             │
│   ↓ SUPPLY_MANAGER.send_to_warehouse()                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ ЗАВСКЛАД ЦЕНТРАЛЬНОГО СКЛАДА                                    │
├─────────────────────────────────────────────────────────────────┤
│ [WAREHOUSE_CHECK] Завсклад                                      │
│   • Проверяет наличие материала                                 │
│   • availability_status:                                        │
│      - IN_STOCK (в наличии)                                     │
│      - PARTIALLY_IN_STOCK (частично)                            │
│      - OUT_OF_STOCK (нет на складе)                             │
│   ↓ WAREHOUSE_HEAD.send_back_to_supply()                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ СНАБЖЕНЕЦ                                                       │
├─────────────────────────────────────────────────────────────────┤
│ [BACK_TO_SUPPLY] Снабжение (после склада)                       │
│   ↓ SUPPLY_MANAGER.send_to_engineer()                           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ ИНЖЕНЕР ПТО                                                     │
├─────────────────────────────────────────────────────────────────┤
│ [ENGINEER_APPROVAL] Инженер ПТО                                 │
│   ↓ Два варианта:                                               │
│   1) ENGINEER.approve() → BACK_TO_SUPPLY_AFTER_ENGINEER         │
│   2) ENGINEER.return_for_revision() → RETURNED_FOR_REVISION     │
└─────────────────────────────────────────────────────────────────┘
        ↓ (если согласовано)             ↓ (если на доработку)
┌──────────────────────────┐     ┌──────────────────────────────┐
│ СНАБЖЕНЕЦ                │     │ АВТОР                        │
│ BACK_TO_SUPPLY_AFTER_    │     │ RETURNED_FOR_REVISION        │
│ ENGINEER                 │     │ → автор исправляет           │
│ ↓ send_to_pm()           │     │ → FOREMAN.send_to_review()   │
└──────────────────────────┘     └──────────────────────────────┘
        ↓                                   ↓ (цикл повторяется)
┌─────────────────────────────────────────────────────────────────┐
│ РУКОВОДИТЕЛЬ ПРОЕКТА                                            │
├─────────────────────────────────────────────────────────────────┤
│ [PROJECT_MANAGER_APPROVAL] Руководитель проекта                 │
│   ↓ Два варианта:                                               │
│   1) PM.approve() → BACK_TO_SUPPLY_AFTER_PM                     │
│   2) PM.return_for_revision() → RETURNED_FOR_REVISION           │
└─────────────────────────────────────────────────────────────────┘
        ↓ (если согласовано)
┌─────────────────────────────────────────────────────────────────┐
│ СНАБЖЕНЕЦ                                                       │
├─────────────────────────────────────────────────────────────────┤
│ [BACK_TO_SUPPLY_AFTER_PM] Снабжение (после рук.проекта)         │
│   ↓ SUPPLY_MANAGER.send_to_director()                           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ ДИРЕКТОР / ГЛАВНЫЙ ИНЖЕНЕР                                      │
├─────────────────────────────────────────────────────────────────┤
│ [DIRECTOR_APPROVAL] Директор                                    │
│   ↓ Два варианта:                                               │
│   1) DIRECTOR.approve() → BACK_TO_SUPPLY_AFTER_DIRECTOR         │
│   2) DIRECTOR.return_for_revision() → RETURNED_FOR_REVISION     │
└─────────────────────────────────────────────────────────────────┘
        ↓ (если согласовано)
┌─────────────────────────────────────────────────────────────────┐
│ СНАБЖЕНЕЦ (финальный этап)                                      │
├─────────────────────────────────────────────────────────────────┤
│ [BACK_TO_SUPPLY_AFTER_DIRECTOR] Снабжение (после директора)     │
│   ↓ SUPPLY_MANAGER.approve_final()                              │
│                                                                 │
│ [APPROVED] Согласовано                                          │
│   ↓ Два пути:                                                   │
│   1) SUPPLY_MANAGER.send_to_payment() → PAYMENT                 │
│   2) SUPPLY_MANAGER.send_to_site() → SENT_TO_SITE               │
└─────────────────────────────────────────────────────────────────┘
        ↓                                   ↓
┌──────────────────────────┐     ┌──────────────────────────────┐
│ ПУТЬ 1: ЗАКУПКА          │     │ ПУТЬ 2: СО СКЛАДА            │
├──────────────────────────┤     ├──────────────────────────────┤
│ [PAYMENT] На оплате      │     │ [SENT_TO_SITE]               │
│ ↓ SUPPLY.pay()           │     │ Отправить на объект          │
│                          │     │ ↓ WAREHOUSE_HEAD.ship()      │
│ [PAID] Оплачено          │     │                              │
│ ↓ SUPPLY.deliver()       │     │ [WAREHOUSE_SHIPPING]         │
│                          │     │ Отправлено на объект         │
│ [DELIVERY] Доставлено    │     │ ↓ FOREMAN.complete()         │
│ ↓ FOREMAN.complete()     │     └──────────────────────────────┘
└──────────────────────────┘                 ↓
        ↓                                    ↓
┌─────────────────────────────────────────────────────────────────┐
│ ФИНАЛ: АВТОР / ЗАВСКЛАД                                         │
├─────────────────────────────────────────────────────────────────┤
│ [COMPLETED] Отработано                                          │
│   • Автор заполняет actual_quantity (фактически получено)       │
│   • Позиция завершена                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 ПРАВА ДОСТУПА И РАЗРЕШЕНИЯ

### ButtonAccess (Матрица доступа):

Все права на страницы и кнопки управляются через `/admin/core/buttonaccess/`

**Страницы material-requests:**
- `material-requests` - основная страница заявок

**Кнопки (примеры):**
- `create` - создать заявку
- `edit` - редактировать заявку
- `delete` - удалить заявку
- `approve` - согласовать
- `reject` - отклонить
- `export_excel` - экспорт Excel
- `change_status` - изменить статус позиции

### Бизнес-логика фильтрации данных:

```python
# В MaterialRequestViewSet.get_queryset()

# Суперадмин, Директор, Главный инженер видят ВСЕ заявки
if user.is_superuser or user.role in ['SUPERADMIN', 'DIRECTOR', 'CHIEF_ENGINEER']:
    return MaterialRequest.objects.all()

# Остальные видят заявки своих проектов
user_projects = user.projects.all()
return MaterialRequest.objects.filter(
    Q(project__in=user_projects) |
    Q(author=user) |
    Q(responsible=user)
)
```

### Права редактирования позиций:

| Поле              | Кто может редактировать                       | Когда                          |
|-------------------|-----------------------------------------------|--------------------------------|
| `material_name`   | Автор                                         | DRAFT или RETURNED_FOR_REVISION|
| `quantity`        | Автор                                         | DRAFT или RETURNED_FOR_REVISION|
| `unit`            | Автор                                         | DRAFT или RETURNED_FOR_REVISION|
| `specifications`  | Автор                                         | DRAFT или RETURNED_FOR_REVISION|
| `actual_quantity` | Автор                                         | В любом статусе                |
| `issued_quantity` | Завсклад объекта, Начальник участка           | В любом статусе                |

---

## 📍 API ENDPOINTS

### Заявки (MaterialRequestViewSet):

```
GET    /api/material-requests/                # Список заявок
POST   /api/material-requests/                # Создать заявку
GET    /api/material-requests/{id}/           # Детали заявки
PUT    /api/material-requests/{id}/           # Обновить заявку
PATCH  /api/material-requests/{id}/           # Частично обновить
DELETE /api/material-requests/{id}/           # Удалить (soft delete)

# Цепочка согласования
GET    /api/material-requests/{id}/approvals/ # Получить цепочку
POST   /api/material-requests/{id}/approve/   # Согласовать текущий этап
POST   /api/material-requests/{id}/reject/    # Отклонить заявку

# Дополнительные действия
POST   /api/material-requests/{id}/upload/    # Загрузить документ
POST   /api/material-requests/{id}/add_comment/   # Добавить комментарий
POST   /api/material-requests/{id}/add_item/  # Добавить позицию
GET    /api/material-requests/{id}/export_excel/  # Экспорт Excel
```

### Цепочки согласования (ApprovalFlowTemplateViewSet):

```
GET    /api/approval-flows/                   # Список шаблонов
POST   /api/approval-flows/                   # Создать шаблон
GET    /api/approval-flows/{id}/              # Детали шаблона
PUT    /api/approval-flows/{id}/              # Обновить шаблон
DELETE /api/approval-flows/{id}/              # Удалить шаблон
POST   /api/approval-flows/{id}/activate/     # Активировать шаблон
GET    /api/approval-flows/active/            # Получить активный шаблон
```

### Согласования (MaterialRequestApprovalViewSet):

```
GET    /api/material-request-approvals/                # Список
GET    /api/material-request-approvals/{id}/           # Детали
GET    /api/material-request-approvals/my-pending/     # Мои ожидающие
POST   /api/material-request-approvals/{id}/approve/   # Согласовать
POST   /api/material-request-approvals/{id}/reject/    # Отклонить
```

### Позиции материалов (MaterialRequestItemViewSet):

```
GET    /api/material-request-items/            # Список позиций
GET    /api/material-request-items/{id}/       # Детали позиции
PUT    /api/material-request-items/{id}/       # Обновить позицию
PATCH  /api/material-request-items/{id}/       # Частично обновить
DELETE /api/material-request-items/{id}/       # Удалить позицию

# Фильтры:
?request={request_id}              # Позиции конкретной заявки
?request__project={project_id}     # Позиции проекта
?has_actual_quantity=true          # Только с actual_quantity (для страницы Склад)
```

---

## 🎨 FRONTEND КОМПОНЕНТЫ

### Страницы:

1. **MaterialRequests.tsx** (`/dashboard/material-requests`)
   - Основная страница работы с заявками
   - Фильтрация по проектам
   - Таблица с заявками и позициями
   - Модальные окна создания/редактирования
   - Управление статусами позиций

2. **ApprovedMaterialRequests.tsx** (`/dashboard/material-requests/approved`)
   - Согласованные заявки
   - Только просмотр

3. **CompletedMaterialRequests.tsx** (`/dashboard/material-requests/completed`)
   - Завершенные заявки
   - Архив

4. **ApprovalFlowSettings.tsx** (`/dashboard/settings/approval-flow`)
   - Настройка индивидуальной цепочки согласования
   - Drag-and-drop интерфейс
   - Включение/выключение этапов
   - Сохранение схемы

### Компоненты:

**ApprovalFlowTimeline.tsx**
- Визуализация цепочки согласования
- Показывает все этапы
- Отмечает текущий этап
- Статусы: Pending | Approved | Rejected | Skipped

**Интеграция:**
```tsx
import ApprovalFlowTimeline from '../components/ApprovalFlow/ApprovalFlowTimeline'

<ApprovalFlowTimeline
  requestId={request.id}
  approvals={approvalsData}
  currentStep={request.current_step_order}
/>
```

---

## 🔔 УВЕДОМЛЕНИЯ И ЛОГИРОВАНИЕ

### MaterialRequestHistory (История):

Автоматическое логирование всех действий:

```python
MaterialRequestHistory.objects.create(
    request=material_request,
    user=user,                    # Кто выполнил действие
    old_status='Этап 1',          # Старый статус
    new_status='Утверждено',      # Новый статус
    comment='Комментарий'         # Комментарий
)
```

**Когда логируется:**
- Создание заявки
- Каждое согласование этапа
- Отклонение заявки
- Автоматический пропуск этапа (SKIPPED)

### Email уведомления (Celery tasks):

**Задача:** `send_material_request_notification.delay()`

**Типы уведомлений:**
1. `created` - заявка создана
2. `step_approved` - этап согласован, переход к следующему
3. `fully_approved` - все этапы пройдены
4. `rejected` - заявка отклонена

**Параметры:**
```python
send_material_request_notification.delay(
    request_id=material_request.id,
    notification_type='rejected',
    rejection_reason=comment,
    rejected_by_name=user.get_full_name()
)
```

---

## 📐 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### Пример 1: Создание заявки и автоматическая инициализация

```python
from apps.material_requests.models import MaterialRequest, MaterialRequestItem
from apps.projects.models import Project

# 1. Создаем заявку
project = Project.objects.get(id=10)
request = MaterialRequest.objects.create(
    project=project,
    author=current_user,
    notes='Материалы для фундамента'
)
# Номер генерируется автоматически: З-10-001/25

# 2. Добавляем позиции
MaterialRequestItem.objects.create(
    request=request,
    material_name='Арматура Ø12',
    quantity=1500,
    unit='кг',
    order=1
)

# 3. Инициализируем цепочку согласования
request.initialize_approval_flow()

# Результат:
# - request.status = 'IN_PROGRESS'
# - request.current_step = первый этап (order=1)
# - request.responsible = найденный пользователь с ролью первого этапа
# - Созданы MaterialRequestApproval для каждого этапа
# - Отправлен email первому согласующему
```

### Пример 2: Согласование этапа

```python
from apps.material_requests.models import MaterialRequest

request = MaterialRequest.objects.get(id=123)

# Проверяем текущий этап
print(f"Текущий этап: {request.current_step.order}")  # 1
print(f"Роль согласующего: {request.current_step.role}")  # SUPPLY_MANAGER
print(f"Ответственный: {request.responsible.get_full_name()}")

# Согласуем этап
try:
    request.approve_current_step(
        user=current_user,  # Должен быть == request.responsible
        comment='Проверено, все в порядке'
    )

    # Результат:
    # - Текущий approval.status = 'APPROVED'
    # - request.current_step переключился на следующий этап
    # - request.responsible = следующий пользователь
    # - Логирование в MaterialRequestHistory
    # - Email следующему согласующему

except PermissionError as e:
    print(f"Ошибка прав доступа: {e}")
```

### Пример 3: Создание индивидуальной цепочки

```python
from apps.material_requests.approval_models import ApprovalFlowTemplate, ApprovalStep

# 1. Создаем шаблон для компании
flow = ApprovalFlowTemplate.objects.create(
    company=user.company,
    name='Упрощенная схема',
    description='Для срочных заявок',
    is_active=True,  # Автоматически деактивирует другие схемы компании
    created_by=user
)

# 2. Добавляем этапы
steps = [
    {'role': 'FOREMAN', 'order': 1},
    {'role': 'SUPPLY_MANAGER', 'order': 2},
    {'role': 'DIRECTOR', 'order': 3},
]

for step_data in steps:
    ApprovalStep.objects.create(
        flow_template=flow,
        **step_data,
        skip_if_empty=True,
        is_mandatory=True
    )

# Теперь все новые заявки этой компании будут использовать эту цепочку
```

### Пример 4: Отклонение заявки

```python
request = MaterialRequest.objects.get(id=123)

try:
    request.reject_request(
        user=current_user,
        comment='Неверные спецификации материалов. Уточните марку бетона.'
    )

    # Результат:
    # - request.status = 'REJECTED'
    # - request.current_step = None
    # - request.responsible = None
    # - approval.status = 'REJECTED'
    # - Email автору об отклонении
    # - Логирование в MaterialRequestHistory

except ValueError as e:
    print(f"Ошибка: {e}")  # Например, если comment пустой
```

---

## ⚙️ НАСТРОЙКИ И КОНФИГУРАЦИЯ

### Django Settings:

```python
# backend/config/settings.py

# Email для уведомлений
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')

# Celery для асинхронных задач
CELERY_BROKER_URL = 'redis://redis:6379/0'
CELERY_RESULT_BACKEND = 'redis://redis:6379/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
```

### Frontend Environment:

```env
# frontend/.env

VITE_API_URL=http://localhost:8001
VITE_WS_URL=ws://localhost:8001
```

---

## 🔍 ОТЛАДКА И МОНИТОРИНГ

### Логи согласования:

```python
import logging
logger = logging.getLogger(__name__)

# В методе move_to_next_step()
logger.info(
    f'Заявка {self.request_number}: переход на этап {step.order} '
    f'({step.get_role_display()}), ответственный: {approver}'
)

# При пропуске этапа
logger.warning(
    f'Заявка {self.request_number}: этап {step.order} '
    f'({step.get_role_display()}) пропущен - нет пользователя'
)
```

### Django Admin:

```
/admin/material_requests/materialrequest/     # Все заявки
/admin/material_requests/approvalflowtemplate/  # Шаблоны цепочек
/admin/material_requests/approvalstep/        # Этапы
/admin/material_requests/materialrequestapproval/  # Согласования
/admin/material_requests/materialrequesthistory/   # История
```

### Flower (Celery мониторинг):

```
http://localhost:5555
```

Отслеживание выполнения задач отправки email.

---

## ✅ ИТОГОВАЯ СХЕМА "ОТ АВТОРА ДО ПРИЕМА НА ОБЪЕКТЕ"

### Полный цикл заявки:

```
📋 ШАГ 1: СОЗДАНИЕ ЗАЯВКИ
────────────────────────────────────────────────────────────
Автор: Прораб/Мастер/Начальник участка
Действие: Создает заявку с позициями материалов

MaterialRequest:
  ├─ status: DRAFT
  ├─ request_number: З-10-001/25
  ├─ author: Иванов И.И. (Прораб)
  ├─ project: Жилой комплекс "Восток"
  └─ items: [
      {material_name: "Арматура Ø12", quantity: 1500, unit: "кг"}
      {material_name: "Бетон М300", quantity: 50, unit: "м³"}
    ]

🔄 ШАГ 2: ИНИЦИАЛИЗАЦИЯ СОГЛАСОВАНИЯ
────────────────────────────────────────────────────────────
Система автоматически:
  1. Загружает активную ApprovalFlowTemplate компании
  2. Создает MaterialRequestApproval для каждого этапа (status=PENDING)
  3. Находит первого согласующего (Снабженец)
  4. Переводит заявку: status=IN_PROGRESS, current_step=1
  5. Отправляет email Снабженцу

✉️ Email → Петров П.П. (Снабженец):
  "Новая заявка З-10-001/25 ожидает вашего согласования"

📊 ШАГ 3: СОГЛАСОВАНИЕ ЭТАП 1 (Снабженец)
────────────────────────────────────────────────────────────
Снабженец заходит в систему:
  ├─ Видит заявку на вкладке "Мои согласования"
  ├─ Проверяет позиции
  └─ Нажимает "Согласовать"

POST /api/material-requests/123/approve/
{
  "comment": "Проверено, отправляю на склад"
}

Система:
  ├─ approval[step=1].status = APPROVED
  ├─ approval[step=1].approved_at = 2025-11-09 10:30
  ├─ Логирует в MaterialRequestHistory
  ├─ Переходит на этап 2: current_step=2 (Завсклад)
  └─ Отправляет email Завскладу

✉️ Email → Сидоров С.С. (Завсклад):
  "Заявка З-10-001/25 передана вам на согласование (этап 2/4)"

📦 ШАГ 4: СОГЛАСОВАНИЕ ЭТАП 2 (Завсклад)
────────────────────────────────────────────────────────────
Завсклад проверяет наличие:
  ├─ Арматура Ø12: availability_status=IN_STOCK (1500 кг есть)
  ├─ Бетон М300: availability_status=OUT_OF_STOCK (нет на складе)
  └─ Нажимает "Согласовать"

Система переходит на этап 3 (Руководитель проекта)

✉️ Email → Козлов К.К. (Руководитель проекта):
  "Заявка З-10-001/25 передана вам (этап 3/4)"

👔 ШАГ 5: СОГЛАСОВАНИЕ ЭТАП 3 (Руководитель проекта)
────────────────────────────────────────────────────────────
Руководитель проекта:
  ├─ Анализирует необходимость
  ├─ Проверяет бюджет
  └─ Нажимает "Согласовать"

Система переходит на этап 4 (Директор)

✉️ Email → Николаев Н.Н. (Директор):
  "Заявка З-10-001/25 ожидает вашего финального согласования (этап 4/4)"

👨‍💼 ШАГ 6: ФИНАЛЬНОЕ СОГЛАСОВАНИЕ (Директор)
────────────────────────────────────────────────────────────
Директор:
  ├─ Проверяет всю цепочку согласований
  ├─ Видит, что Бетон М300 нужно закупить
  └─ Нажимает "Согласовать"

Система:
  ├─ approval[step=4].status = APPROVED
  ├─ Все этапы пройдены!
  ├─ status = APPROVED
  ├─ current_step = NULL
  ├─ responsible = NULL
  └─ Отправляет email автору

✉️ Email → Иванов И.И. (Прораб - автор):
  "Ваша заявка З-10-001/25 полностью согласована!"

🚚 ШАГ 7: ОБРАБОТКА ПОЗИЦИЙ (Снабженец)
────────────────────────────────────────────────────────────
Теперь Снабженец обрабатывает каждую позицию отдельно:

ПОЗИЦИЯ 1: Арматура Ø12 (есть на складе)
  ├─ Снабженец: item_status → SENT_TO_SITE
  ├─ Завсклад объекта: issued_quantity = 1500 кг
  ├─ Завсклад объекта: item_status → WAREHOUSE_SHIPPING
  └─ Прораб: actual_quantity = 1500 кг → COMPLETED ✅

ПОЗИЦИЯ 2: Бетон М300 (нет на складе, закупка)
  ├─ Снабженец: item_status → PAYMENT (на оплате)
  ├─ Снабженец: item_status → PAID (оплачено)
  ├─ Снабженец: item_status → DELIVERY (доставлено)
  └─ Прораб: actual_quantity = 50 м³ → COMPLETED ✅

🎉 ШАГ 8: ЗАВЕРШЕНИЕ
────────────────────────────────────────────────────────────
Прораб проверяет:
  ├─ Все позиции item_status = COMPLETED
  ├─ Все actual_quantity заполнены
  └─ Заявка готова к закрытию: status → COMPLETED

MaterialRequest:
  ├─ status: COMPLETED ✅
  ├─ Все этапы согласованы
  ├─ Все позиции отработаны
  └─ Материалы получены на объекте

📊 ИТОГОВАЯ ИСТОРИЯ (MaterialRequestHistory):
────────────────────────────────────────────────────────────
2025-11-09 09:00 | Иванов И.И.    | "" → "DRAFT" | Заявка создана
2025-11-09 09:01 | Система        | "DRAFT" → "IN_PROGRESS" | Инициализация согласования
2025-11-09 10:30 | Петров П.П.    | "Этап 1" → "Утверждено" | Согласовано Снабженцем
2025-11-09 11:15 | Сидоров С.С.   | "Этап 2" → "Утверждено" | Согласовано Завскладом
2025-11-09 14:20 | Козлов К.К.    | "Этап 3" → "Утверждено" | Согласовано Рук.проекта
2025-11-09 16:45 | Николаев Н.Н.  | "Этап 4" → "Утверждено" | Финальное согласование
2025-11-09 16:45 | Система        | "IN_PROGRESS" → "APPROVED" | Заявка согласована
2025-11-12 10:00 | Иванов И.И.    | "APPROVED" → "COMPLETED" | Материалы получены
```

---

## 🔔 ВАЖНЫЕ ЗАМЕЧАНИЯ

### ⚠️ Две независимые системы:

1. **MaterialRequest согласование** - настраиваемая цепочка для ЗАЯВКИ
2. **MaterialRequestItem статусы** - фиксированная логика для ПОЗИЦИЙ

Они работают параллельно и независимо!

### ⚠️ Отклонение прерывает цепочку:

Если заявка отклонена на любом этапе:
- `status = REJECTED`
- `current_step = NULL`
- Цепочка останавливается
- Email автору об отклонении
- Заявку нужно исправлять и создавать заново

### ⚠️ Пропуск этапов:

Если в проекте/компании нет пользователя с нужной ролью:
- Этап автоматически пропускается (`status=SKIPPED`)
- Переход к следующему этапу
- Логируется в историю
- Не отправляется email

### ⚠️ Только одна активная схема:

Компания может иметь несколько шаблонов цепочек, но только ОДИН активный:
- `is_active=True` только у одного шаблона
- При активации нового - остальные деактивируются
- Новые заявки используют активный шаблон

### ⚠️ Soft delete:

Заявки удаляются мягко (SoftDeleteMixin):
- Помечаются как `deleted=True`, `deleted_at=now()`
- Хранятся в корзине 31 день
- Можно восстановить
- После 31 дня удаляются автоматически (Celery task)

---

## 📚 СВЯЗАННЫЕ ДОКУМЕНТЫ

- [CLAUDE.md](CLAUDE.md) - Главная документация проекта
- [ROLES_REFERENCE.md](ROLES_REFERENCE.md) - Справочник ролей (11 ролей в ApprovalRole)
- [BUTTON_ACCESS_README.md](BUTTON_ACCESS_README.md) - Система контроля доступа

---

**Документ создан:** 2025-11-09
**Автор:** Claude Code
**Версия системы:** 2.0 (Настраиваемая цепочка согласования)
