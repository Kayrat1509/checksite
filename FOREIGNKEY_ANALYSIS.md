# Анализ ForeignKey связей в проекте Check_Site

## Заключение
**СТАТУС: ТРЕБУЮТ ВНИМАНИЯ**

Найдены проблемные места где используется `on_delete=models.CASCADE` для связей с пользователями, подрядчиками и надзорами.

---

## КРИТИЧЕСКИЕ ПРОБЛЕМЫ

### 1. Task модель (apps/tasks/models.py) - КРИТИЧНО

**created_by** (строка 55-61)
```python
created_by = models.ForeignKey(
    User,
    on_delete=models.CASCADE,  # ❌ ПРОБЛЕМА: удалит все задачи если удален пользователь
    related_name='created_tasks',
    verbose_name='От кого',
)
```
**Проблема:** При удалении пользователя удалятся ВСЕ его созданные задачи.
**Решение:** Изменить на `on_delete=models.SET_NULL, null=True`

**assigned_to_user** (строка 63-71)
```python
assigned_to_user = models.ForeignKey(
    User,
    on_delete=models.CASCADE,  # ❌ ПРОБЛЕМА: удалит задачу если удален назначенный сотрудник
    related_name='assigned_user_tasks',
    null=True,
    blank=True,
)
```
**Проблема:** При удалении сотрудника удалятся его назначенные задачи.
**Решение:** Изменить на `on_delete=models.SET_NULL`

**assigned_to_contractor** (строка 73-82)
```python
assigned_to_contractor = models.ForeignKey(
    'users.User',
    on_delete=models.CASCADE,  # ❌ ПРОБЛЕМА: удалит задачу если удален подрядчик
    related_name='assigned_contractor_tasks',
    null=True,
    blank=True,
    limit_choices_to={'role': 'CONTRACTOR'},
)
```
**Проблема:** При удалении подрядчика удалятся его назначенные задачи.
**Решение:** Изменить на `on_delete=models.SET_NULL`

---

### 2. TenderBid модель (apps/tenders/models.py) - КРИТИЧНО

**participant** (строка 142-147)
```python
participant = models.ForeignKey(
    User,
    on_delete=models.CASCADE,  # ❌ ПРОБЛЕМА: удалит заявку на тендер если удален участник
    related_name='tender_bids',
    verbose_name='Участник'
)
```
**Проблема:** При удалении участника/подрядчика удалятся все его заявки на тендеры.
**Решение:** Изменить на `on_delete=models.SET_NULL, null=True`

---

## ХОРОШИЕ ПРАКТИКИ (используется SET_NULL)

### ✅ Issue модель (apps/issues/models.py) - ПРАВИЛЬНО

**created_by** (строка 64-70)
```python
created_by = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    related_name='created_issues',
)
```

**assigned_to** (строка 71-78)
```python
assigned_to = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    blank=True,
    related_name='assigned_issues',
)
```

**verified_by** (строка 79-86)
```python
verified_by = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    blank=True,
    related_name='verified_issues',
)
```

---

### ✅ MaterialRequest модель (apps/material_requests/models.py) - ПРАВИЛЬНО

**author** (строка 47-53)
```python
author = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    related_name='created_material_requests',
)
```

**responsible** (строка 75-82)
```python
responsible = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    blank=True,
    related_name='responsible_material_requests',
)
```

---

### ✅ Project модель (apps/projects/models.py) - ПРАВИЛЬНО

**project_manager** (строка 38-45)
```python
project_manager = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    blank=True,
    related_name='managed_projects',
)
```

---

### ✅ Site модель (apps/projects/models.py) - ПРАВИЛЬНО

**site_manager** (строка 121-128)
```python
site_manager = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    blank=True,
    related_name='managed_sites',
)
```

---

### ✅ Tender модель (apps/tenders/models.py) - ПРАВИЛЬНО

**created_by** (строка 60-66)
```python
created_by = models.ForeignKey(
    User,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    related_name='created_tenders',
)
```

**responsible** (строка 67-74)
```python
responsible = models.ForeignKey(
    User,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    blank=True,
    related_name='responsible_tenders',
)
```

**winner** (строка 77-84)
```python
winner = models.ForeignKey(
    User,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    blank=True,
    related_name='won_tenders',
)
```

---

### ✅ TenderDocument модель (apps/tenders/models.py) - ПРАВИЛЬНО

**uploaded_by** (строка 116-121)
```python
uploaded_by = models.ForeignKey(
    User,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    verbose_name='Загрузил'
)
```

---

### ✅ WarehouseReceipt модель (apps/warehouse/models.py) - ПРАВИЛЬНО

**received_by** (строка 77-84)
```python
received_by = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    related_name='warehouse_receipts',
)
```

---

### ✅ MaterialRequestItem модель (apps/material_requests/models.py) - ПРАВИЛЬНО

**issued_by** (строка 546-554)
```python
issued_by = models.ForeignKey(
    'users.User',
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    blank=True,
    related_name='issued_materials',
)
```

**cancelled_by** (строка 629-636)
```python
cancelled_by = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    blank=True,
    related_name='cancelled_material_items',
)
```

---

### ✅ MaterialRequestDocument модель (apps/material_requests/models.py) - ПРАВИЛЬНО

**uploaded_by** (строка 710-715)
```python
uploaded_by = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    verbose_name='Загрузил'
)
```

---

### ✅ MaterialRequestHistory модель (apps/material_requests/models.py) - ПРАВИЛЬНО

**user** (строка 773-778)
```python
user = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    verbose_name='Пользователь'
)
```

---

### ✅ MaterialRequestComment модель (apps/material_requests/models.py) - ПРАВИЛЬНО

**author** (строка 824-829)
```python
author = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    verbose_name='Автор'
)
```

---

### ✅ IssuePhoto модель (apps/issues/models.py) - ПРАВИЛЬНО

**uploaded_by** (строка 209-214)
```python
uploaded_by = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    verbose_name='Загрузил'
)
```

---

### ✅ IssueComment модель (apps/issues/models.py) - ПРАВИЛЬНО

**author** (строка 291-296)
```python
author = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    verbose_name='Автор'
)
```

---

### ✅ Drawing модель (apps/projects/models.py) - ПРАВИЛЬНО

**uploaded_by** (строка 181-187)
```python
uploaded_by = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    related_name='uploaded_drawings',
)
```

---

### ✅ Notification модель (apps/notifications/models.py) - ПРАВИЛЬНО

**user** (строка 15-20)
```python
user = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.CASCADE,  # ⚠️ CASCADE здесь - ПРАВИЛЬНО (уведомления привязаны к жизни пользователя)
    related_name='notifications',
)
```
Примечание: CASCADE здесь логичен, так как уведомления - это сугубо пользовательские данные, их удаление вместе с пользователем правильно.

---

### ✅ ApprovalFlowTemplate модель (apps/material_requests/approval_models.py) - ПРАВИЛЬНО

**created_by** (строка 58-64)
```python
created_by = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    related_name='created_approval_flows',
)
```

---

### ✅ MaterialRequestApproval модель (apps/material_requests/approval_models.py) - ПРАВИЛЬНО

**approver** (строка 188-196)
```python
approver = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    blank=True,
    related_name='material_request_approvals',
)
```

---

### ✅ PublicTenderAccess модель (apps/tenders/models.py) - ПРАВИЛЬНО

**approved_by** (строка 197-204)
```python
approved_by = models.ForeignKey(
    User,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    blank=True,
    related_name='approved_public_accesses',
)
```

---

### ✅ TechnicalCondition модель (apps/technical_conditions/models.py) - ПРАВИЛЬНО

**created_by** (строка 38-44)
```python
created_by = models.ForeignKey(
    User,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    related_name='created_technical_conditions',
)
```

---

### ✅ SoftDeleteMixin модель (apps/core/mixins.py) - ПРАВИЛЬНО

**deleted_by** (строка 23-30)
```python
deleted_by = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.SET_NULL,  # ✅ ПРАВИЛЬНО
    null=True,
    blank=True,
    related_name='%(class)s_deleted',
)
```

---

## ИТОГОВАЯ ТАБЛИЦА

| Модель | Поле | Текущее | Рекомендация | Статус |
|--------|------|---------|--------------|--------|
| Task | created_by | CASCADE | SET_NULL | ❌ КРИТИЧНО |
| Task | assigned_to_user | CASCADE | SET_NULL | ❌ КРИТИЧНО |
| Task | assigned_to_contractor | CASCADE | SET_NULL | ❌ КРИТИЧНО |
| TenderBid | participant | CASCADE | SET_NULL | ❌ КРИТИЧНО |
| Issue | created_by | SET_NULL | - | ✅ OK |
| Issue | assigned_to | SET_NULL | - | ✅ OK |
| Issue | verified_by | SET_NULL | - | ✅ OK |
| MaterialRequest | author | SET_NULL | - | ✅ OK |
| MaterialRequest | responsible | SET_NULL | - | ✅ OK |
| Project | project_manager | SET_NULL | - | ✅ OK |
| Site | site_manager | SET_NULL | - | ✅ OK |
| Tender | created_by | SET_NULL | - | ✅ OK |
| Tender | responsible | SET_NULL | - | ✅ OK |
| Tender | winner | SET_NULL | - | ✅ OK |

---

## РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ

### Файл: /Users/kairatkhidirboev/Projects/checksite/backend/apps/tasks/models.py

Необходимо изменить 3 ForeignKey:

1. Строка 55-61: Изменить `on_delete=models.CASCADE` на `on_delete=models.SET_NULL, null=True`
2. Строка 63-71: Изменить `on_delete=models.CASCADE` на `on_delete=models.SET_NULL` (null=True уже есть)
3. Строка 73-82: Изменить `on_delete=models.CASCADE` на `on_delete=models.SET_NULL` (null=True уже есть)

### Файл: /Users/kairatkhidirboev/Projects/checksite/backend/apps/tenders/models.py

Необходимо изменить 1 ForeignKey:

1. Строка 142-147: Изменить `on_delete=models.CASCADE` на `on_delete=models.SET_NULL, null=True`

---

## МИГРАЦИИ

После изменения моделей потребуется создать миграции:

```bash
python manage.py makemigrations tasks
python manage.py makemigrations tenders
python manage.py migrate
```

Примечание: Может потребоваться создать миграцию с обработкой существующих данных (data migration).
