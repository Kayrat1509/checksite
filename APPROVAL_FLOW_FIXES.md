# ИСПРАВЛЕНИЯ И CODE SNIPPETS

## ИСПРАВЛЕНИЕ 1: Миграция 0005 - Неправильное имя таблицы

### Текущий код (НЕПРАВИЛЬНЫЙ):
```python
# migrations/0005_alter_materialrequest_request_number_and_more.py
def add_constraint_if_not_exists(apps, schema_editor):
    from django.db import connection
    with connection.cursor() as cursor:
        table_name = 'material_requests_materialrequest'  # НЕПРАВИЛЬНО!
        cursor.execute("""
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_name=%s
            AND constraint_name='unique_request_number_per_company'
        """, [table_name])
```

### Исправленный код:
```python
# migrations/0005_alter_materialrequest_request_number_and_more.py
def add_constraint_if_not_exists(apps, schema_editor):
    from django.db import connection
    with connection.cursor() as cursor:
        # ПРАВИЛЬНО: используем имя из Meta.db_table модели
        table_name = 'material_requests'  # Соответствует db_table в models.py
        cursor.execute("""
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_name=%s
            AND constraint_name='unique_request_number_per_company'
        """, [table_name])
        
        if cursor.fetchone() is None:
            # Проверяем, существует ли столбец company_id
            cursor.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name=%s
                AND column_name='company_id'
            """, [table_name])
            
            if cursor.fetchone():
                cursor.execute(
                    f'ALTER TABLE {table_name} '
                    f'ADD CONSTRAINT unique_request_number_per_company '
                    f'UNIQUE (company_id, request_number)'
                )
```

---

## ИСПРАВЛЕНИЕ 2: Унифицировать доступ к company - views.py

### Текущий код (ПРОБЛЕМНЫЙ):
```python
# views.py line 73
queryset = MaterialRequest.objects.filter(
    company=user.company,  # ПРОБЛЕМА: может не существовать
    is_deleted=False
)
```

### Исправленный код:
```python
# views.py - заменить всё использование company на project__company
def get_queryset(self):
    user = self.request.user
    
    # Базовая фильтрация по проекту и компании через project
    queryset = MaterialRequest.objects.filter(
        project__company=user.company,  # ПРАВИЛЬНО!
        is_deleted=False
    )
    
    # ... остальной код ...
```

### Где еще исправить в views.py:

**Строка 558 (в statistics()):**
```python
# ТЕКУЩИЙ КОД:
base_queryset = MaterialRequest.objects.filter(company=company, is_deleted=False)

# ИСПРАВИТЬ НА:
base_queryset = MaterialRequest.objects.filter(project__company=company, is_deleted=False)
```

**Строка 581 (в statistics()):**
```python
# ТЕКУЩИЙ КОД:
'my': MaterialRequest.objects.filter(author=user, company=company, is_deleted=False).count(),

# ИСПРАВИТЬ НА:
'my': MaterialRequest.objects.filter(author=user, project__company=company, is_deleted=False).count(),
```

---

## ИСПРАВЛЕНИЕ 3: Унифицировать доступ к company - serializers.py

### Текущий код (ПРОБЛЕМНЫЙ):
```python
# serializers.py line 132
class MaterialRequestListSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        fields = [
            # ... остальное ...
            'company_name',
            'company',  # ПРОБЛЕМА!
            # ... остальное ...
        ]
```

### Исправленный код:
```python
# serializers.py
class MaterialRequestListSerializer(serializers.ModelSerializer):
    company_name = serializers.SerializerMethodField()  # ИЗМЕНИТЬ!
    
    class Meta:
        model = MaterialRequest
        fields = [
            # ... остальное ...
            'company_name',
            # 'company', - УДАЛИТЬ эту строку
            # ... остальное ...
        ]
    
    def get_company_name(self, obj):
        """Получаем компанию через project"""
        return obj.project.company.name if obj.project and obj.project.company else None
```

### Аналогично в MaterialRequestDetailSerializer:
```python
class MaterialRequestDetailSerializer(serializers.ModelSerializer):
    # Заменить:
    # company_name = serializers.CharField(source='company.name', read_only=True)
    
    # На:
    company_name = serializers.SerializerMethodField()
    
    class Meta:
        fields = [
            # ... остальное ...
            # 'company',  - УДАЛИТЬ!
            # ... остальное ...
        ]
    
    def get_company_name(self, obj):
        return obj.project.company.name if obj.project and obj.project.company else None
```

---

## ИСПРАВЛЕНИЕ 4: Добавить проверку project при approve/reject

### Текущий код (views.py, approve() - УЯЗВИМОСТЬ):
```python
# views.py lines 203-255
@action(detail=True, methods=['post'])
def approve(self, request, pk=None):
    material_request = self.get_object()
    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    user_role = request.user.role
    
    # Проверка ТОЛЬКО роли, но не project доступа!
    if material_request.current_approval_role != user_role:
        return Response({'error': ...}, status=status.HTTP_403_FORBIDDEN)
```

### Исправленный код:
```python
@action(detail=True, methods=['post'])
def approve(self, request, pk=None):
    material_request = self.get_object()
    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    user_role = request.user.role
    
    # ДОБАВИТЬ: Проверка доступа к проекту
    management_roles = [
        'SUPERADMIN', 'DIRECTOR', 'CHIEF_ENGINEER',
        'PROJECT_MANAGER', 'CHIEF_POWER_ENGINEER'
    ]
    
    if user_role not in management_roles:
        # Проверяем, что пользователь закреплен за этим проектом
        user_projects = request.user.projects.all() | request.user.managed_projects.all()
        if material_request.project not in user_projects:
            return Response(
                {'error': 'Вы не закреплены за этим проектом'},
                status=status.HTTP_403_FORBIDDEN
            )
    
    # Проверка роли (оригинальная)
    if material_request.current_approval_role != user_role:
        return Response(
            {'error': f'Сейчас заявка ожидает согласования роли: {material_request.current_approval_role}'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # ... остальной код ...
```

### Аналогично для reject():
```python
@action(detail=True, methods=['post'])
def reject(self, request, pk=None):
    material_request = self.get_object()
    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    reason = serializer.validated_data['reason']
    
    # ДОБАВИТЬ: Проверка доступа к проекту (аналогично approve)
    management_roles = [
        'SUPERADMIN', 'DIRECTOR', 'CHIEF_ENGINEER',
        'PROJECT_MANAGER', 'CHIEF_POWER_ENGINEER'
    ]
    
    if request.user.role not in management_roles:
        user_projects = request.user.projects.all() | request.user.managed_projects.all()
        if material_request.project not in user_projects:
            return Response(
                {'error': 'Вы не закреплены за этим проектом'},
                status=status.HTTP_403_FORBIDDEN
            )
    
    # ... остальной код ...
```

---

## ИСПРАВЛЕНИЕ 5: Проверка first_role в submit_for_approval()

### Текущий код (models.py lines 252-278 - ПРОБЛЕМНЫЙ):
```python
def submit_for_approval(self):
    if self.status != self.STATUS_DRAFT:
        raise ValidationError('Только черновики можно отправить на согласование')
    
    # ПРОБЛЕМА: first_role может быть несуществующей в компании!
    first_role = self.get_first_approval_role()
    
    with transaction.atomic():
        self.status = self.STATUS_IN_APPROVAL
        self.current_approval_role = first_role
        self.submitted_at = timezone.now()
        self.save()
        
        ApprovalStep.objects.create(
            material_request=self,
            role=first_role,
            status=ApprovalStep.STATUS_PENDING
        )
```

### Исправленный код:
```python
def submit_for_approval(self):
    if self.status != self.STATUS_DRAFT:
        raise ValidationError('Только черновики можно отправить на согласование')
    
    # Определяем первую роль
    first_role = self.get_first_approval_role()
    
    # ДОБАВИТЬ: Проверка, что первая роль существует в компании
    # Если нет - находим следующую доступную
    available_roles = self.get_company_available_roles()
    
    if first_role not in available_roles:
        # Пытаемся найти следующую доступную роль
        approval_chain = [
            'SITE_MANAGER',
            'ENGINEER',
            'PROJECT_MANAGER',
            'CHIEF_ENGINEER',
            'DIRECTOR',
        ]
        
        first_role = None
        for role in approval_chain:
            if role in available_roles:
                first_role = role
                break
        
        if first_role is None:
            raise ValidationError(
                'В компании нет сотрудников для согласования этой заявки'
            )
    
    with transaction.atomic():
        self.status = self.STATUS_IN_APPROVAL
        self.current_approval_role = first_role
        self.submitted_at = timezone.now()
        self.save()
        
        ApprovalStep.objects.create(
            material_request=self,
            role=first_role,
            status=ApprovalStep.STATUS_PENDING
        )
```

---

## ИСПРАВЛЕНИЕ 6: Добавить проверку author!=NULL

### Текущий код (models.py lines 280-294 - ПРОБЛЕМНЫЙ):
```python
def get_first_approval_role(self):
    # ПРОБЛЕМА: нет проверки на self.author=NULL
    if self.author.role in ['MASTER', 'FOREMAN']:  # AttributeError если author=NULL
        return 'SITE_MANAGER'
    elif self.author.role == 'SITE_MANAGER':
        return 'ENGINEER'
    else:
        return 'SITE_MANAGER'
```

### Исправленный код:
```python
def get_first_approval_role(self):
    # ДОБАВИТЬ: Проверка на NULL
    if not self.author:
        raise ValidationError('Автор заявки не определен')
    
    if self.author.role in ['MASTER', 'FOREMAN']:
        return 'SITE_MANAGER'
    elif self.author.role == 'SITE_MANAGER':
        return 'ENGINEER'
    else:
        return 'SITE_MANAGER'
```

---

## ИСПРАВЛЕНИЕ 7: Сократить timeout кэша

### Текущий код (models.py line 368 - СЛИШКОМ ДОЛГИЙ):
```python
def get_company_available_roles(self):
    # ... код ...
    cache.set(cache_key, available_roles, timeout=300)  # 5 минут - СЛИШКОМ ДОЛГО!
    return available_roles
```

### Исправленный код:
```python
def get_company_available_roles(self):
    # ... код ...
    cache.set(cache_key, available_roles, timeout=60)  # 1 минута - ЛУЧШЕ
    return available_roles
```

---

## ИСПРАВЛЕНИЕ 8: Унифицировать фильтрацию в statistics()

### Текущий код (views.py lines 572-582 - ПРОТИВОРЕЧИВЫЙ):
```python
stats = {
    'all': base_queryset.count(),
    'draft': base_queryset.filter(status=MaterialRequest.STATUS_DRAFT).count(),
    'in_approval': base_queryset.filter(status=MaterialRequest.STATUS_IN_APPROVAL).count(),
    'approved': base_queryset.filter(status=MaterialRequest.STATUS_APPROVED).count(),
    'in_payment': base_queryset.filter(status=MaterialRequest.STATUS_IN_PAYMENT).count(),
    'in_delivery': base_queryset.filter(status=MaterialRequest.STATUS_IN_DELIVERY).count(),
    'completed': base_queryset.filter(status=MaterialRequest.STATUS_COMPLETED).count(),  # НЕПРАВИЛЬНО!
    'my': MaterialRequest.objects.filter(author=user, company=company, is_deleted=False).count(),
}
```

### Исправленный код:
```python
from django.db.models import Exists, OuterRef

stats = {
    'all': base_queryset.count(),
    'draft': base_queryset.filter(status=MaterialRequest.STATUS_DRAFT).count(),
    'in_approval': base_queryset.filter(status=MaterialRequest.STATUS_IN_APPROVAL).count(),
    'approved': base_queryset.filter(status=MaterialRequest.STATUS_APPROVED).count(),
    'in_payment': base_queryset.filter(status=MaterialRequest.STATUS_IN_PAYMENT).count(),
    'in_delivery': base_queryset.filter(status=MaterialRequest.STATUS_IN_DELIVERY).count(),
    # ИСПРАВИТЬ: используем ту же логику как в get_queryset()
    'completed': base_queryset.filter(
        models.Exists(
            MaterialRequestItem.objects.filter(
                material_request=models.OuterRef('pk'),
                status=MaterialRequestItem.STATUS_RECEIVED
            )
        )
    ).count(),
    'my': MaterialRequest.objects.filter(
        author=user,
        project__company=company,  # ИСПРАВИТЬ: project__company вместо company
        is_deleted=False
    ).count(),
}
```

---

## ДОПОЛНИТЕЛЬНО: Race condition fix для request_number

### Текущий код (models.py lines 232-236 - МОЖЕТ БЫТЬ УЯЗВИМ):
```python
last_request = MaterialRequest.objects.filter(
    project__company=self.project.company
).select_for_update().aggregate(Max('request_number'))
```

### Проблема:
Если filter() ничего не вернул, select_for_update() не заблокирует ничего!

### Исправленный код:
```python
def generate_request_number(self):
    today = timezone.now().strftime('%d%m%Y')
    
    # ИСПРАВИТЬ: используем select_for_update() на всех записях
    with transaction.atomic():
        # Лучший подход: блокируем ВСЕ записи в таблице (через первую)
        # или используем database-level approach
        
        try:
            # Получаем последнюю заявку с блокировкой
            last_request = MaterialRequest.objects.filter(
                project__company=self.project.company
            ).select_for_update().order_by('-request_number').first()
            
            if last_request and last_request.request_number:
                match = re.search(r'-(\d+)$', last_request.request_number)
                next_number = int(match.group(1)) + 1 if match else 1
            else:
                next_number = 1
        except:
            next_number = 1
        
        return f'{today}-{next_number}'
```

---

## СВОДКА ФАЙЛОВ ДЛЯ ИСПРАВЛЕНИЯ

1. `/backend/apps/material_requests/migrations/0005_alter_materialrequest_request_number_and_more.py`
   - Исправить имя таблицы с `material_requests_materialrequest` на `material_requests`

2. `/backend/apps/material_requests/views.py`
   - Заменить все `company=` на `project__company=`
   - Добавить проверку project доступа в `approve()` и `reject()`
   - Унифицировать фильтрацию в `statistics()`
   - Сократить cache timeout с 300 на 60 сек

3. `/backend/apps/material_requests/serializers.py`
   - Заменить `source='company.name'` на `SerializerMethodField()`
   - Удалить `'company'` из fields

4. `/backend/apps/material_requests/models.py`
   - Добавить проверку author!=NULL в `get_first_approval_role()`
   - Добавить fallback для несуществующей первой роли в `submit_for_approval()`
   - Улучшить race condition protection в `generate_request_number()`

5. `/backend/apps/material_requests/admin.py`
   - Убедиться, что везде используется `project__company` вместо `company`

