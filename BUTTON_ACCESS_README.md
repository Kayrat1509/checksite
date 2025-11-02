# Матрица доступа к кнопкам (Button Access Matrix)

## Описание

Система матрицы доступа к кнопкам позволяет гибко управлять правами доступа пользователей к различным действиям (кнопкам) на страницах приложения.

## Архитектура

### Backend

**Модель:** `apps/core/models.py` - `ButtonAccess`
- Хранит информацию о каждой кнопке и правах доступа для каждой роли
- Поля: `page`, `button_key`, `button_name`, `description`, `default_access`, роли...

**API:** `apps/core/views.py` - `ButtonAccessViewSet`
- `GET /api/button-access/` - список всех кнопок (для админов)
- `GET /api/button-access/{id}/` - детали конкретной кнопки
- `GET /api/button-access/by_page/?page=projects` - доступные кнопки для текущего пользователя на странице
- `GET /api/button-access/all_pages/` - все доступные кнопки на всех страницах

**Django Admin:** `/admin/core/buttonaccess/`
- Удобный интерфейс для управления доступом
- Группировка ролей по категориям
- Визуальные индикаторы доступа

### Frontend

**API Client:** `frontend/src/api/buttonAccess.ts`
- TypeScript типы
- Методы для всех endpoint'ов

**Custom Hook:** `frontend/src/hooks/useButtonAccess.ts`
- Упрощенная работа с доступом к кнопкам в компонентах

---

## Использование

### 1. Настройка доступа через Django Admin

1. Перейдите в админ-панель: `http://localhost:8001/admin/`
2. Откройте раздел "Матрица доступа к кнопкам"
3. Создайте или отредактируйте кнопку:
   - **Страница** - название страницы (projects, users, и т.д.)
   - **Ключ кнопки** - уникальный идентификатор (create, edit, delete)
   - **Название кнопки** - отображаемое имя
   - **Доступ по умолчанию** - если включено, кнопка доступна всем ролям
   - **Роли** - отметьте галочками роли, которым доступна кнопка

### 2. Заполнение начальных данных

```bash
docker compose exec backend python manage.py populate_button_access
```

Эта команда создаст 54 записи для всех основных страниц и действий.

### 3. Использование на фронтенде

#### Вариант 1: Hook для конкретной страницы

```typescript
import { useButtonAccess } from '../hooks/useButtonAccess'

const Projects = () => {
  const { canUseButton, loading } = useButtonAccess('projects')

  if (loading) return <Spin />

  return (
    <div>
      {canUseButton('create') && (
        <Button type="primary" onClick={handleCreate}>
          Создать проект
        </Button>
      )}

      {canUseButton('export_excel') && (
        <Button onClick={handleExport}>Экспорт Excel</Button>
      )}

      <Table
        columns={[
          // ... другие колонки
          {
            title: 'Действия',
            render: (_, record) => (
              <Space>
                {canUseButton('edit') && (
                  <Button onClick={() => handleEdit(record)}>
                    Редактировать
                  </Button>
                )}
                {canUseButton('delete') && (
                  <Popconfirm
                    title="Удалить проект?"
                    onConfirm={() => handleDelete(record)}
                  >
                    <Button danger>Удалить</Button>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />
    </div>
  )
}
```

#### Вариант 2: Hook для всех страниц (в App или Layout)

```typescript
import { useButtonAccess } from '../hooks/useButtonAccess'

const App = () => {
  const { canUseButton, loading } = useButtonAccess()

  // Использование с указанием страницы
  const canCreateProject = canUseButton('create', 'projects')
  const canEditUser = canUseButton('edit', 'users')

  return (
    <Layout>
      {canCreateProject && <Link to="/projects/new">Новый проект</Link>}
      {canEditUser && <Link to="/users/edit">Редактировать</Link>}
    </Layout>
  )
}
```

#### Вариант 3: Прямое использование API

```typescript
import { buttonAccessAPI } from '../api/buttonAccess'

// Получить доступные кнопки для страницы
const buttons = await buttonAccessAPI.getByPage('projects')
// buttons = [
//   { button_key: 'create', button_name: 'Создать проект', description: '...' },
//   { button_key: 'edit', button_name: 'Редактировать', description: '...' }
// ]

// Проверить доступ
const canCreate = buttons.some(b => b.button_key === 'create')

// Получить все кнопки сразу для всех страниц
const allButtons = await buttonAccessAPI.getAllPages()
// allButtons = {
//   projects: [{ button_key: 'create', ... }],
//   users: [{ button_key: 'edit', ... }],
//   ...
// }
```

---

## Список доступных кнопок по страницам

### Проекты (projects)
- `create` - Создать проект
- `edit` - Редактировать
- `delete` - Удалить
- `view_details` - Просмотр деталей
- `export_excel` - Экспорт Excel
- `import_excel` - Импорт Excel

### Сотрудники (users)
- `create` - Добавить сотрудника
- `edit` - Редактировать
- `delete` - Удалить
- `export_excel` - Экспорт Excel
- `import_excel` - Импорт Excel
- `reset_password` - Сбросить пароль
- `view_details` - Просмотр профиля

### Подрядчики (contractors)
- `create` - Добавить подрядчика
- `edit` - Редактировать
- `delete` - Удалить
- `export_excel` - Экспорт Excel
- `import_excel` - Импорт Excel
- `view_details` - Просмотр деталей

### Замечания (issues)
- `create` - Создать замечание
- `edit` - Редактировать
- `delete` - Удалить
- `change_status` - Изменить статус
- `assign` - Назначить исполнителя
- `add_comment` - Добавить комментарий
- `upload_photo` - Загрузить фото
- `view_details` - Просмотр деталей

### Склад (warehouse)
- `create_item` - Добавить товар
- `edit_item` - Редактировать
- `delete_item` - Удалить
- `move_items` - Перемещение
- `write_off` - Списание
- `view_details` - Просмотр деталей

### Заявки (material-requests)
- `create` - Создать заявку
- `edit` - Редактировать
- `delete` - Удалить
- `approve` - Согласовать
- `reject` - Отклонить
- `view_details` - Просмотр деталей

### Тендеры (tenders)
- `create` - Создать тендер
- `edit` - Редактировать
- `delete` - Удалить
- `view_details` - Просмотр деталей
- `submit_bid` - Подать заявку (только для подрядчиков)

### Надзоры (supervisions)
- `create` - Добавить надзор
- `edit` - Редактировать
- `delete` - Удалить
- `export_excel` - Экспорт Excel
- `import_excel` - Импорт Excel
- `view_details` - Просмотр деталей

### Отчеты (reports)
- `generate` - Сгенерировать отчет
- `export_pdf` - Экспорт PDF
- `export_excel` - Экспорт Excel
- `view_details` - Просмотр отчета

---

## Добавление новых кнопок

### 1. Через Django Admin (рекомендуется)

1. Перейдите в `/admin/core/buttonaccess/`
2. Нажмите "Добавить доступ к кнопке"
3. Заполните поля:
   - Страница: `projects`
   - Ключ кнопки: `archive`
   - Название: `Архивировать`
   - Описание: `Перемещение проекта в архив`
   - Отметьте роли с доступом
4. Сохраните

### 2. Через management command

Отредактируйте файл `apps/core/management/commands/populate_button_access.py`:

```python
def get_buttons_data(self):
    return [
        # ... существующие кнопки ...
        {
            'page': 'projects',
            'button_key': 'archive',
            'button_name': 'Архивировать',
            'description': 'Перемещение проекта в архив',
            'default_access': False,
            'DIRECTOR': True,
            'CHIEF_ENGINEER': True,
        },
    ]
```

Затем выполните:
```bash
docker compose exec backend python manage.py populate_button_access
```

### 3. Использование на фронтенде

```typescript
const Projects = () => {
  const { canUseButton } = useButtonAccess('projects')

  return (
    <>
      {canUseButton('archive') && (
        <Button onClick={handleArchive}>Архивировать</Button>
      )}
    </>
  )
}
```

---

## API Endpoints

### GET /api/button-access/
Получить все кнопки (для администраторов)

**Query params:**
- `page` (опционально) - фильтр по странице

**Response:**
```json
[
  {
    "id": 1,
    "page": "projects",
    "button_key": "create",
    "button_name": "Создать проект",
    "description": "Создание нового проекта",
    "default_access": false,
    "accessible_roles": ["DIRECTOR", "CHIEF_ENGINEER", "PROJECT_MANAGER"],
    "created_at": "2025-11-02T01:00:00Z",
    "updated_at": "2025-11-02T01:00:00Z"
  }
]
```

### GET /api/button-access/by_page/?page=projects
Получить доступные кнопки для текущего пользователя на странице

**Query params:**
- `page` (обязательно) - название страницы

**Response:**
```json
[
  {
    "button_key": "create",
    "button_name": "Создать проект",
    "description": "Создание нового проекта"
  },
  {
    "button_key": "edit",
    "button_name": "Редактировать",
    "description": "Редактирование проекта"
  }
]
```

### GET /api/button-access/all_pages/
Получить все доступные кнопки на всех страницах

**Response:**
```json
{
  "projects": [
    {
      "button_key": "create",
      "button_name": "Создать проект",
      "description": "Создание нового проекта"
    }
  ],
  "users": [
    {
      "button_key": "create",
      "button_name": "Добавить сотрудника",
      "description": "Создание нового пользователя"
    }
  ]
}
```

---

## Логика доступа

1. **SUPERADMIN** всегда имеет доступ ко всем кнопкам
2. Если `default_access = True`, кнопка доступна всем ролям
3. Если `default_access = False`, проверяется доступ по конкретной роли
4. Фронтенд только скрывает кнопки, backend должен дополнительно проверять permissions в ViewSet

---

## Best Practices

1. **Всегда используйте hook** вместо прямого вызова API
2. **Проверяйте доступ и на backend** - фронтенд легко обойти
3. **Используйте понятные button_key** - `create`, `edit`, `delete`, а не `btn1`, `btn2`
4. **Заполняйте description** - это поможет другим разработчикам
5. **Группируйте кнопки логически** - все CRUD операции должны быть на одной странице
6. **Не дублируйте логику** - если есть `canUseButton('create')`, не создавайте отдельную проверку роли

---

## Troubleshooting

### Кнопка не отображается, хотя должна

1. Проверьте, что запись существует в Django Admin
2. Проверьте роль текущего пользователя
3. Проверьте, что `page` указан правильно (регистр важен)
4. Проверьте консоль браузера на ошибки API

### Изменения в Admin не применяются

1. Очистите кэш браузера
2. Перезагрузите страницу с Ctrl+F5
3. Проверьте, что изменения сохранены в БД

### Hook возвращает loading=true бесконечно

1. Проверьте network в DevTools - успешен ли запрос к API
2. Проверьте, что пользователь авторизован
3. Проверьте логи backend на ошибки

---

## Миграция существующего кода

### До:
```typescript
const Projects = () => {
  const { user } = useAuthStore()
  const canCreate = ['DIRECTOR', 'CHIEF_ENGINEER'].includes(user.role)

  return (
    <>
      {canCreate && <Button>Создать</Button>}
    </>
  )
}
```

### После:
```typescript
const Projects = () => {
  const { canUseButton } = useButtonAccess('projects')

  return (
    <>
      {canUseButton('create') && <Button>Создать</Button>}
    </>
  )
}
```

**Преимущества:**
- Централизованное управление через Admin
- Не нужно менять код при изменении прав доступа
- Единый источник истины для всех проверок
- Легко добавлять новые кнопки и роли
