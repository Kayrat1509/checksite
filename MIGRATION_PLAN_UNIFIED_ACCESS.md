# 📋 План миграции: Объединение PageAccess и ButtonAccess

## 🎯 Цель

Объединить две системы управления доступом (PageAccess и ButtonAccess) в одну единую систему под `/admin/core/buttonaccess/`.

**Дата:** 2025-11-02

---

## 📊 Текущее состояние

### PageAccess (settings.models.py)
- **Назначение:** Управление доступом к страницам
- **Привязка:** К компании (company)
- **Структура:** company + page + role → has_access (boolean)
- **Админка:** `/admin/settings/pageaccess/`

### ButtonAccess (core.models.py)
- **Назначение:** Управление доступом к кнопкам
- **Привязка:** Глобальная (без компании)
- **Структура:** page + button_key → поля для каждой роли + default_access
- **Админка:** `/admin/core/buttonaccess/`

---

## 🎯 Целевое состояние

### Единая система AccessControl (в core.models.py)

**Новая структура:**
- Управляет доступом к **страницам И кнопкам**
- Поддерживает **глобальные** настройки (для кнопок)
- Поддерживает **привязку к компании** (для страниц)
- Админка: `/admin/core/buttonaccess/` (переименовать в AccessControl)

**Преимущества:**
- ✅ Единая точка управления правами
- ✅ Меньше дублирования кода
- ✅ Проще поддерживать и расширять
- ✅ Одна админка вместо двух

---

## 📝 Пошаговый план миграции

### Этап 1: Анализ и подготовка (DONE ✅)

- [x] Проанализировать структуру PageAccess
- [x] Проанализировать структуру ButtonAccess
- [x] Определить целевую структуру
- [x] Создать план миграции

---

### Этап 2: Расширение модели ButtonAccess

#### 2.1. Добавить новые поля в ButtonAccess

**Файл:** `backend/apps/core/models.py`

**Добавить поля:**
```python
class ButtonAccess(models.Model):
    # ... существующие поля ...

    # НОВЫЕ ПОЛЯ для поддержки страниц
    company = models.ForeignKey(
        'users.Company',
        on_delete=models.CASCADE,
        related_name='access_controls',
        verbose_name='Компания',
        null=True,  # NULL = глобальная настройка (для кнопок)
        blank=True,
        help_text='Если не указано - настройка глобальная (для кнопок). Если указано - для конкретной компании (для страниц)'
    )

    access_type = models.CharField(
        max_length=20,
        choices=[
            ('button', 'Кнопка'),
            ('page', 'Страница'),
        ],
        default='button',
        verbose_name='Тип доступа',
        help_text='Кнопка - глобальная настройка. Страница - по компаниям'
    )

    # Для страниц будем использовать existing button_key как page_slug
    # page = button_key для access_type='page'
```

**Обновить Meta:**
```python
class Meta:
    verbose_name = 'Управление доступом'
    verbose_name_plural = 'Матрица доступа (страницы и кнопки)'
    unique_together = [
        # Для кнопок (без компании)
        # ('page', 'button_key', 'access_type') где access_type='button' и company=NULL
        # Для страниц (с компанией)
        # ('company', 'page', 'access_type') где access_type='page' и button_key можно использовать для подстраниц
    ]
    ordering = ['access_type', 'page', 'button_key']
```

#### 2.2. Создать миграцию для добавления полей

```bash
python manage.py makemigrations core --name add_page_support_to_buttonaccess
```

---

### Этап 3: Миграция данных из PageAccess в ButtonAccess

#### 3.1. Создать data migration

**Файл:** `backend/apps/core/migrations/00XX_migrate_pageaccess_data.py`

```python
from django.db import migrations

def migrate_pageaccess_to_buttonaccess(apps, schema_editor):
    """
    Переносит данные из PageAccess в ButtonAccess
    """
    PageAccess = apps.get_model('settings', 'PageAccess')
    ButtonAccess = apps.get_model('core', 'ButtonAccess')

    # Получаем все записи PageAccess
    page_accesses = PageAccess.objects.all()

    for pa in page_accesses:
        # Для каждой комбинации company + page + role создаём записи в ButtonAccess
        # Проверяем, существует ли уже запись
        ba, created = ButtonAccess.objects.get_or_create(
            company=pa.company,
            page=pa.page,
            access_type='page',
            button_key='view',  # Используем 'view' как ключ для страницы
            defaults={
                'button_name': f'Доступ к странице {pa.get_page_display()}',
                'description': f'Доступ к странице {pa.get_page_display()} для компании {pa.company.name}',
                'default_access': False,
            }
        )

        # Устанавливаем доступ для роли
        setattr(ba, pa.role, pa.has_access)
        ba.save()

def reverse_migration(apps, schema_editor):
    """
    Обратная миграция - удаляет записи page из ButtonAccess
    """
    ButtonAccess = apps.get_model('core', 'ButtonAccess')
    ButtonAccess.objects.filter(access_type='page').delete()

class Migration(migrations.Migration):
    dependencies = [
        ('core', '00XX_add_page_support_to_buttonaccess'),
        ('settings', '0001_initial'),  # Зависимость от PageAccess
    ]

    operations = [
        migrations.RunPython(migrate_pageaccess_to_buttonaccess, reverse_migration),
    ]
```

#### 3.2. Запустить миграцию

```bash
python manage.py migrate core
```

---

### Этап 4: Обновление Admin

#### 4.1. Обновить admin.py для ButtonAccess

**Файл:** `backend/apps/core/admin.py`

```python
from django.contrib import admin
from .models import ButtonAccess

@admin.register(ButtonAccess)
class ButtonAccessAdmin(admin.ModelAdmin):
    list_display = [
        'access_type', 'page', 'button_key', 'button_name',
        'company', 'default_access', 'get_accessible_roles_display'
    ]
    list_filter = ['access_type', 'page', 'company', 'default_access']
    search_fields = ['button_name', 'description', 'page', 'button_key']
    ordering = ['access_type', 'page', 'button_key']

    fieldsets = (
        ('Основная информация', {
            'fields': ('access_type', 'company', 'page', 'button_key', 'button_name', 'description')
        }),
        ('Доступ', {
            'fields': ('default_access',),
            'description': 'Если "Доступ по умолчанию" включён, кнопка/страница доступна всем ролям'
        }),
        ('Роли с доступом', {
            'fields': (
                'SUPERADMIN', 'DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER',
                'ENGINEER', 'SITE_MANAGER', 'FOREMAN', 'MASTER',
                'SUPERVISOR', 'CONTRACTOR', 'OBSERVER', 'SUPPLY_MANAGER',
                'WAREHOUSE_HEAD', 'SITE_WAREHOUSE_MANAGER'
            ),
            'classes': ('collapse',),
            'description': 'Выберите роли, которые имеют доступ (используется только если "Доступ по умолчанию" выключен)'
        }),
    )

    def get_accessible_roles_display(self, obj):
        roles = obj.get_accessible_roles()
        if roles == ['ALL']:
            return '✅ Все роли'
        return ', '.join(roles[:3]) + ('...' if len(roles) > 3 else '')
    get_accessible_roles_display.short_description = 'Доступные роли'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Показываем глобальные настройки (кнопки) всем
        # И настройки страниц только для своей компании (если не суперадмин)
        if request.user.is_superuser:
            return qs
        if request.user.company:
            return qs.filter(
                models.Q(company__isnull=True) |  # Глобальные (кнопки)
                models.Q(company=request.user.company)  # Для своей компании (страницы)
            )
        return qs.filter(company__isnull=True)  # Только глобальные
```

#### 4.2. Скрыть PageAccess из админки

**Файл:** `backend/apps/settings/admin.py`

```python
# Закомментировать или удалить регистрацию PageAccess
# admin.site.unregister(PageAccess)  # Если была зарегистрирована

# Или просто не регистрировать
```

---

### Этап 5: Обновление API

#### 5.1. Обновить ViewSet для ButtonAccess

**Файл:** `backend/apps/core/views.py`

```python
class ButtonAccessViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для получения информации о доступе к кнопкам И страницам.
    """
    queryset = ButtonAccess.objects.all()
    serializer_class = ButtonAccessSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # Фильтр по типу доступа (опционально)
        access_type = self.request.query_params.get('access_type')
        if access_type:
            queryset = queryset.filter(access_type=access_type)

        # Фильтр по странице
        page = self.request.query_params.get('page')
        if page:
            queryset = queryset.filter(page=page)

        # Для страниц (access_type='page') фильтруем по компании
        # Для кнопок (access_type='button') показываем глобальные
        if not user.is_superuser and user.company:
            queryset = queryset.filter(
                models.Q(access_type='button', company__isnull=True) |
                models.Q(access_type='page', company=user.company)
            )

        return queryset.order_by('access_type', 'page', 'button_key')

    @action(detail=False, methods=['get'])
    def by_page(self, request):
        """
        Получить все доступные кнопки для текущего пользователя на конкретной странице.

        Query params:
        - page (required): название страницы
        - access_type (optional): 'button' или 'page'
        """
        page = request.query_params.get('page')
        access_type = request.query_params.get('access_type', 'button')

        if not page:
            return Response(
                {'error': 'Параметр "page" обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user_role = request.user.role

        # Получаем записи для данной страницы
        filters = {'page': page, 'access_type': access_type}

        if access_type == 'page' and request.user.company:
            filters['company'] = request.user.company
        elif access_type == 'button':
            filters['company__isnull'] = True

        buttons = ButtonAccess.objects.filter(**filters)

        # Фильтруем по доступу пользователя
        available_buttons = []
        for button in buttons:
            if button.has_access(user_role):
                available_buttons.append(button)

        serializer = ButtonAccessMinimalSerializer(available_buttons, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pages(self, request):
        """
        Получить список доступных страниц для текущего пользователя.

        Response: ['dashboard', 'projects', 'issues', ...]
        """
        user_role = request.user.role
        user_company = request.user.company

        # Получаем все страницы для компании пользователя
        filters = {'access_type': 'page'}
        if user_company:
            filters['company'] = user_company

        page_accesses = ButtonAccess.objects.filter(**filters)

        # Фильтруем по доступу
        available_pages = []
        for pa in page_accesses:
            if pa.has_access(user_role):
                available_pages.append(pa.page)

        # Убираем дубликаты
        available_pages = list(set(available_pages))

        return Response(available_pages)
```

---

### Этап 6: Обновление Frontend

#### 6.1. Обновить usePageAccess hook

**Файл:** `frontend/src/hooks/usePageAccess.ts`

**Вместо запроса к `/api/settings/page-access/` использовать `/api/button-access/pages/`:**

```typescript
export const usePageAccess = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['page-access'],
    queryFn: async () => {
      // ИЗМЕНЕНО: Используем новый endpoint
      const response = await apiClient.get<string[]>('/button-access/pages/')
      return response.data
    },
  })

  const canAccessPage = useCallback(
    (page: string): boolean => {
      if (!data) return false
      return data.includes(page)
    },
    [data]
  )

  return {
    canAccessPage,
    availablePages: data || [],
    loading: isLoading,
    error: error as Error | null,
  }
}
```

#### 6.2. Обновить useButtonAccess hook

**Файл:** `frontend/src/hooks/useButtonAccess.ts`

**Добавить параметр access_type в запросах:**

```typescript
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['button-access', page],
  queryFn: async () => {
    if (isSinglePage && page) {
      // ИЗМЕНЕНО: Добавлен параметр access_type=button
      return await buttonAccessAPI.getByPage(page, 'button')
    } else {
      return await buttonAccessAPI.getAllPages('button')
    }
  },
})
```

#### 6.3. Обновить API client

**Файл:** `frontend/src/api/buttonAccess.ts`

```typescript
export const buttonAccessAPI = {
  getByPage: async (page: string, accessType: 'button' | 'page' = 'button'): Promise<ButtonAccess[]> => {
    const response = await apiClient.get<ButtonAccess[]>(
      '/button-access/by_page/',
      { params: { page, access_type: accessType } }
    )
    return response.data
  },

  getAllPages: async (accessType: 'button' | 'page' = 'button'): Promise<AllPagesButtons> => {
    const response = await apiClient.get<AllPagesButtons>(
      '/button-access/all_pages/',
      { params: { access_type: accessType } }
    )
    return response.data
  },

  // НОВЫЙ endpoint для получения доступных страниц
  getAvailablePages: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/button-access/pages/')
    return response.data
  },
}
```

---

### Этап 7: Удаление PageAccess

#### 7.1. Создать миграцию для удаления модели

**ВАЖНО:** Выполнять только после того, как убедились что всё работает!

```bash
# Создать миграцию для удаления модели PageAccess
python manage.py makemigrations settings --name remove_pageaccess_model
```

#### 7.2. Удалить код модели

**Файл:** `backend/apps/settings/models.py`

```python
# Удалить класс PageAccess полностью
# Оставить только RoleTemplate (если используется)
```

#### 7.3. Удалить связанные файлы

- Удалить views для PageAccess (если есть)
- Удалить serializers для PageAccess (если есть)
- Удалить URL patterns для PageAccess (если есть)

---

## 🧪 Тестирование

### Тест 1: Проверка миграции данных

```bash
# После миграции проверить, что данные перенеслись
docker compose exec backend python manage.py shell -c "
from apps.core.models import ButtonAccess
from apps.settings.models import PageAccess

# Проверяем количество записей
page_count = PageAccess.objects.count()
button_page_count = ButtonAccess.objects.filter(access_type='page').count()

print(f'PageAccess записей: {page_count}')
print(f'ButtonAccess (page) записей: {button_page_count}')

if page_count > 0 and button_page_count == 0:
    print('❌ ОШИБКА: Данные не перенесены!')
elif page_count > 0 and button_page_count > 0:
    print('✅ Данные перенесены, но PageAccess ещё не удалён')
elif page_count == 0 and button_page_count > 0:
    print('✅ Миграция завершена успешно')
"
```

### Тест 2: Проверка API

```bash
# Получить доступные страницы
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8001/api/button-access/pages/

# Получить кнопки для страницы
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8001/api/button-access/by_page/?page=issues&access_type=button"
```

### Тест 3: Проверка Frontend

1. Открыть приложение
2. Проверить навигацию по страницам
3. Проверить отображение кнопок на каждой странице
4. DevTools → Network → проверить запросы к `/button-access/`

---

## ⚠️ Риски и митигация

### Риск 1: Потеря данных при миграции

**Митигация:**
- Создать резервную копию БД перед миграцией
- Тестировать миграцию на копии БД
- Иметь план отката (reverse migration)

```bash
# Бекап БД
docker compose exec db pg_dump -U postgres checksite_db > backup_before_migration.sql
```

### Риск 2: Downtime во время миграции

**Митигация:**
- Выполнять миграцию в нерабочее время
- Использовать blue-green deployment
- Подготовить скрипт отката

### Риск 3: Frontend перестанет работать

**Митигация:**
- Тестировать на dev окружении
- Обновлять frontend и backend синхронно
- Иметь fallback на старый API

---

## 📋 Чек-лист выполнения

### Подготовка
- [ ] Создать резервную копию БД
- [ ] Создать ветку в git для миграции
- [ ] Протестировать на dev окружении

### Этап 2: Расширение модели
- [ ] Добавить поля в ButtonAccess
- [ ] Создать миграцию
- [ ] Применить миграцию на dev
- [ ] Проверить работу админки

### Этап 3: Миграция данных
- [ ] Создать data migration
- [ ] Применить на dev
- [ ] Проверить данные в админке
- [ ] Проверить количество записей

### Этап 4: Обновление Admin
- [ ] Обновить ButtonAccessAdmin
- [ ] Скрыть PageAccessAdmin
- [ ] Проверить отображение в админке

### Этап 5: Обновление API
- [ ] Обновить ViewSet
- [ ] Добавить endpoint /pages/
- [ ] Обновить endpoint /by_page/
- [ ] Протестировать API через curl

### Этап 6: Обновление Frontend
- [ ] Обновить usePageAccess
- [ ] Обновить useButtonAccess
- [ ] Обновить API client
- [ ] Протестировать в браузере

### Этап 7: Удаление PageAccess
- [ ] Убедиться что всё работает
- [ ] Создать миграцию удаления
- [ ] Применить миграцию
- [ ] Удалить код модели

### Финализация
- [ ] Протестировать на production
- [ ] Обновить документацию
- [ ] Создать pull request
- [ ] Code review
- [ ] Деплой на production

---

## 🎯 Ожидаемый результат

После завершения миграции:

1. ✅ **Единая админка** `/admin/core/buttonaccess/` для управления доступом к страницам И кнопкам
2. ✅ **Единый API** `/api/button-access/` для получения прав доступа
3. ✅ **Упрощённая архитектура** - одна модель вместо двух
4. ✅ **Сохранены все данные** - настройки доступа к страницам перенесены из PageAccess
5. ✅ **Обратная совместимость** - frontend продолжает работать через обновлённые hooks
6. ✅ **Модель PageAccess удалена** - нет дублирования функционала

---

**Автор:** Claude Code
**Дата:** 2025-11-02
**Версия:** 1.0
**Статус:** План готов к реализации
