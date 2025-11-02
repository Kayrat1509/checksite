# 🔍 Анализ проблемы с кнопками "Добавить фото" в продакшне

## 📋 Описание проблемы

**Симптомы:**
- В локальной версии кнопки "Фото До" и "Фото После" отображаются
- В продакшн версии эти кнопки отсутствуют

**Дата анализа:** 2025-11-02

---

## 🔎 Проведённый анализ

### 1. Анализ кода фронтенда

#### Расположение кнопок в UI
**Файл:** [frontend/src/pages/Issues.tsx:1033-1058](frontend/src/pages/Issues.tsx#L1033-L1058)

```typescript
{/* Ряд 2: Фото До и Фото После */}
{(canAddPhotoBefore() || canAddPhotoAfter()) && (
  <Row gutter={8}>
    {canAddPhotoBefore() && (
      <Col span={canAddPhotoAfter() ? 12 : 24}>
        <Button
          type="default"
          size="small"
          icon={<CameraOutlined />}
          onClick={() => handleOpenPhotoModal(issue.id, 'before')}
          block
        >
          Фото До
        </Button>
      </Col>
    )}
    {canAddPhotoAfter() && (
      <Col span={canAddPhotoBefore() ? 12 : 24}>
        <Button
          type="default"
          size="small"
          icon={<CameraOutlined />}
          onClick={() => handleOpenPhotoModal(issue.id, 'after')}
          block
        >
          Фото После
        </Button>
      </Col>
    )}
  </Row>
)}
```

**Логика отображения:**
- Кнопки отображаются только если `canAddPhotoBefore()` или `canAddPhotoAfter()` возвращают `true`
- Это функции проверки прав доступа через матрицу доступа

#### Функции проверки прав доступа
**Файл:** [frontend/src/pages/Issues.tsx:284-302](frontend/src/pages/Issues.tsx#L284-L302)

```typescript
// Функция проверки прав на добавление фото "До" через матрицу доступа
const canAddPhotoBefore = () => {
  // SUPERADMIN всегда имеет доступ
  if (user?.is_superuser || user?.role === 'SUPERADMIN') {
    return true
  }
  // Для остальных ролей проверяем через матрицу доступа из админ-панели
  return canUseButton('add_photo_before')
}

// Функция проверки прав на добавление фото "После" через матрицу доступа
const canAddPhotoAfter = () => {
  // SUPERADMIN всегда имеет доступ
  if (user?.is_superuser || user?.role === 'SUPERADMIN') {
    return true
  }
  // Для остальных ролей проверяем через матрицу доступа из админ-панели
  return canUseButton('add_photo_after')
}
```

**Логика:**
1. Если пользователь SUPERADMIN → всегда `true`
2. Иначе → проверка через `canUseButton()` с ключами `add_photo_before` и `add_photo_after`

#### Hook useButtonAccess
**Файл:** [frontend/src/hooks/useButtonAccess.ts:98-146](frontend/src/hooks/useButtonAccess.ts#L98-L146)

```typescript
export const useButtonAccess = (page?: string): UseButtonAccessReturn => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['button-access', page],
    queryFn: async () => {
      if (isSinglePage && page) {
        return await buttonAccessAPI.getByPage(page)
      } else {
        return await buttonAccessAPI.getAllPages()
      }
    },
  })

  const canUseButton = useCallback(
    (buttonKey: string, pageName?: string): boolean => {
      if (!data) return false

      if (isSinglePage) {
        const buttons = data as ButtonAccess[]
        return buttons.some((btn) => btn.button_key === buttonKey)
      } else {
        // ...
      }
    },
    [data, isSinglePage]
  )
}
```

**Логика:**
1. Загружает доступные кнопки с backend через API `/button-access/by_page/?page=issues`
2. `canUseButton('add_photo_before')` проверяет, есть ли в массиве `data` кнопка с `button_key === 'add_photo_before'`
3. Если кнопка есть в массиве → `true`, если нет → `false`

---

### 2. Анализ кода бэкенда

#### API Endpoint для получения доступных кнопок
**Файл:** [backend/apps/core/views.py:413-455](backend/apps/core/views.py#L413-L455)

```python
@action(detail=False, methods=['get'])
def by_page(self, request):
    """
    Получить все доступные кнопки для текущего пользователя на конкретной странице.

    Query params:
    - page (required): название страницы (projects, users, contractors и т.д.)
    """
    page = request.query_params.get('page')

    if not page:
        return Response(
            {'error': 'Параметр "page" обязателен'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user_role = request.user.role

    # Получаем все кнопки для данной страницы
    buttons = ButtonAccess.objects.filter(page=page)

    # Фильтруем кнопки по доступу пользователя
    available_buttons = []
    for button in buttons:
        if button.has_access(user_role):
            available_buttons.append(button)

    # Используем минимальный сериализатор
    serializer = ButtonAccessMinimalSerializer(available_buttons, many=True)
    return Response(serializer.data)
```

**Логика:**
1. Получает роль текущего пользователя: `user_role = request.user.role`
2. Загружает все кнопки для страницы: `ButtonAccess.objects.filter(page=page)`
3. Для каждой кнопки проверяет `button.has_access(user_role)`
4. Возвращает только те кнопки, к которым у пользователя есть доступ

#### Метод has_access в модели ButtonAccess
**Файл:** [backend/apps/core/models.py:137-156](backend/apps/core/models.py#L137-L156)

```python
def has_access(self, role: str) -> bool:
    """
    Проверяет, имеет ли роль доступ к этой кнопке.

    Args:
        role: Название роли пользователя

    Returns:
        True если доступ есть, False если нет
    """
    # SUPERADMIN всегда имеет доступ
    if role == 'SUPERADMIN':
        return True

    # Если доступ по умолчанию включен, кнопка доступна всем
    if self.default_access:
        return True

    # Проверяем доступ для конкретной роли
    return getattr(self, role, False)
```

**Логика:**
1. Если роль = `SUPERADMIN` → всегда `True`
2. Если `button.default_access = True` → `True` для всех ролей
3. Иначе → проверяет поле с названием роли (например, `button.DIRECTOR`, `button.ENGINEER`, и т.д.)

---

### 3. Анализ базы данных (локальная версия)

**Команда для проверки:**
```bash
docker compose exec backend python manage.py shell -c "
from apps.core.models import ButtonAccess
buttons = ButtonAccess.objects.filter(page='issues', button_key__in=['add_photo_before', 'add_photo_after'])
for btn in buttons:
    print(f'{btn.button_key} | default_access={btn.default_access} | roles={btn.get_accessible_roles()}')
"
```

**Результат в локальной БД:**
```
add_photo_before  | default_access=False | roles=['SUPERADMIN', 'DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'ENGINEER', 'SITE_MANAGER', 'FOREMAN', 'MASTER', 'SUPERVISOR', 'CONTRACTOR', 'OBSERVER']

add_photo_after   | default_access=False | roles=['SUPERADMIN', 'DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER', 'ENGINEER', 'SITE_MANAGER', 'FOREMAN', 'MASTER', 'SUPERVISOR', 'CONTRACTOR', 'OBSERVER']
```

**Важно:** В локальной БД кнопки `add_photo_before` и `add_photo_after` **существуют** и имеют доступ для 11 ролей.

---

## 🎯 Возможные причины проблемы в продакшне

### Причина 1: Кнопки отсутствуют в БД продакшна ⚠️ **НАИБОЛЕЕ ВЕРОЯТНО**

**Описание:**
В продакшн базе данных нет записей для кнопок `add_photo_before` и `add_photo_after` на странице `issues`.

**Почему это происходит:**
- Команда `populate_button_access` не была запущена на продакшне после добавления этих кнопок
- Миграции применены, но команда populate не выполнялась

**Как проверить:**
```bash
# На продакшн сервере
docker compose exec backend python manage.py shell -c "
from apps.core.models import ButtonAccess
count = ButtonAccess.objects.filter(page='issues', button_key__in=['add_photo_before', 'add_photo_after']).count()
print(f'Количество кнопок для фото: {count}')
if count == 0:
    print('❌ ПРОБЛЕМА: Кнопки отсутствуют в БД!')
else:
    buttons = ButtonAccess.objects.filter(page='issues', button_key__in=['add_photo_before', 'add_photo_after'])
    for btn in buttons:
        print(f'{btn.button_key} | roles={btn.get_accessible_roles()}')
"
```

**Ожидаемый результат:**
- Если выводится `Количество кнопок для фото: 0` → это проблема
- Если выводится `Количество кнопок для фото: 2` → кнопки есть, проблема в другом

**Решение:**
```bash
# На продакшн сервере
docker compose exec backend python manage.py populate_button_access
```

---

### Причина 2: У пользователя нет доступа к кнопкам

**Описание:**
Кнопки существуют в БД, но роль пользователя не включена в список доступных ролей.

**Пример:**
```python
# В БД продакшна
add_photo_before.CONTRACTOR = False  # Подрядчик НЕ имеет доступа
```

Если пользователь заходит с ролью `CONTRACTOR`, кнопка не отобразится.

**Как проверить:**
```bash
# На продакшн сервере - проверить роли пользователя
docker compose exec backend python manage.py shell -c "
from apps.users.models import User
user = User.objects.get(email='user@example.com')  # Замените на email пользователя
print(f'Роль: {user.role}')
print(f'is_superuser: {user.is_superuser}')
"

# Проверить доступ к кнопкам для этой роли
docker compose exec backend python manage.py shell -c "
from apps.core.models import ButtonAccess
role = 'CONTRACTOR'  # Замените на роль пользователя
buttons = ButtonAccess.objects.filter(page='issues', button_key__in=['add_photo_before', 'add_photo_after'])
for btn in buttons:
    has_access = btn.has_access(role)
    print(f'{btn.button_key} | {role} has_access: {has_access}')
"
```

**Решение:**
Если роль не имеет доступа, нужно обновить настройки в админ-панели:
1. Зайти в админку: `https://stroyka.asia/admin/core/buttonaccess/`
2. Найти кнопки `add_photo_before` и `add_photo_after`
3. Поставить галочку напротив нужной роли
4. Сохранить

---

### Причина 3: Разные роли пользователей в локальной и продакшн версии

**Описание:**
В локальной версии пользователь заходит с ролью `DIRECTOR`, а в продакшне - с ролью `OBSERVER` (у которого может не быть доступа).

**Как проверить:**
```bash
# Локально
docker compose exec backend python manage.py shell -c "
from apps.users.models import User
user = User.objects.get(email='your@email.com')
print(f'Локальная роль: {user.role}')
"

# На продакшне
ssh user@production-server
docker compose exec backend python manage.py shell -c "
from apps.users.models import User
user = User.objects.get(email='your@email.com')
print(f'Продакшн роль: {user.role}')
"
```

**Решение:**
Если роли разные, либо изменить роль пользователя, либо добавить доступ для продакшн роли в настройках кнопок.

---

### Причина 4: Кэш фронтенда не обновился

**Описание:**
React Query кэширует результат API запроса `/button-access/by_page/?page=issues` на 10 секунд. Если кнопки были добавлены в БД, но фронтенд показывает старые данные.

**Как проверить:**
1. Откройте DevTools (F12)
2. Network → фильтр "button-access"
3. Обновите страницу
4. Посмотрите ответ от API `/button-access/by_page/?page=issues`

**Ожидаемый ответ (правильный):**
```json
[
  {
    "button_key": "add_photo_before",
    "button_name": "Добавить фото ДО",
    "description": "..."
  },
  {
    "button_key": "add_photo_after",
    "button_name": "Добавить фото ПОСЛЕ",
    "description": "..."
  },
  ...
]
```

**Решение:**
- Обновить страницу с очисткой кэша: `Ctrl+Shift+R` (Windows/Linux) или `Cmd+Shift+R` (Mac)
- Очистить кэш браузера
- Подождать 10 секунд (время автоматического обновления React Query)

---

### Причина 5: Старая версия кода на продакшне

**Описание:**
На продакшн сервере не обновлён код фронтенда или бэкенда после добавления функционала кнопок фото.

**Как проверить:**
```bash
# На продакшн сервере
cd /opt/checksite  # Или ваш путь к проекту

# Проверить текущий коммит
git log --oneline -1

# Проверить, есть ли функции canAddPhotoBefore и canAddPhotoAfter
grep -n "canAddPhotoBefore" frontend/src/pages/Issues.tsx

# Проверить, есть ли кнопки в populate_button_access.py
grep -n "add_photo_before" backend/apps/core/management/commands/populate_button_access.py
```

**Решение:**
```bash
# Обновить код
git pull origin main

# Пересобрать контейнеры
docker compose down
docker compose build --no-cache
docker compose up -d

# Запустить populate_button_access
docker compose exec backend python manage.py populate_button_access
```

---

## 📊 Сравнительная таблица: Локальная vs Продакшн версия

| Параметр | Локальная версия | Продакшн версия | Проверка |
|----------|------------------|-----------------|----------|
| **Кнопки в БД** | ✅ `add_photo_before` и `add_photo_after` существуют | ❓ Неизвестно (нужна проверка) | `docker compose exec backend python manage.py shell -c "from apps.core.models import ButtonAccess; print(ButtonAccess.objects.filter(page='issues', button_key__in=['add_photo_before', 'add_photo_after']).count())"` |
| **Количество ролей с доступом** | ✅ 11 ролей (SUPERADMIN до OBSERVER) | ❓ Неизвестно | См. команду выше с `get_accessible_roles()` |
| **default_access** | ✅ `False` (контролируется через роли) | ❓ Неизвестно | См. команду выше |
| **Код фронтенда** | ✅ Функции `canAddPhotoBefore()` и `canAddPhotoAfter()` есть | ❓ Нужна проверка файла Issues.tsx | `grep -n "canAddPhotoBefore" frontend/src/pages/Issues.tsx` |
| **Код populate_button_access** | ✅ Кнопки добавлены в команду | ❓ Нужна проверка файла | `grep -n "add_photo_before" backend/apps/core/management/commands/populate_button_access.py` |
| **Запуск populate_button_access** | ✅ Команда выполнялась | ❓ Возможно НЕ выполнялась | Нужна проверка логов или ручной запуск |
| **API endpoint** | ✅ `/api/button-access/by_page/?page=issues` работает | ❓ Нужна проверка ответа | DevTools → Network → проверить ответ API |
| **React Query кэш** | ✅ Обновляется каждые 10 сек | ❓ Может быть устаревший кэш | Обновить страницу с `Ctrl+Shift+R` |
| **Роль пользователя** | ✅ Например: DIRECTOR | ❓ Может отличаться | `docker compose exec backend python manage.py shell -c "from apps.users.models import User; u=User.objects.get(email='user@example.com'); print(u.role)"` |
| **Версия кода** | ✅ Последний commit | ❓ Может быть устаревшая | `git log --oneline -1` на сервере |

---

## ✅ Пошаговый план диагностики для продакшна

### Шаг 1: Проверить наличие кнопок в БД

```bash
ssh user@production-server
cd /opt/checksite  # Или ваш путь к проекту

docker compose exec backend python manage.py shell -c "
from apps.core.models import ButtonAccess
buttons = ButtonAccess.objects.filter(page='issues').order_by('button_key')
print('=== Все кнопки на странице issues ===')
for btn in buttons:
    print(f'{btn.button_key:25} | {btn.button_name}')

print('\n=== Кнопки для фото ===')
photo_buttons = ButtonAccess.objects.filter(page='issues', button_key__in=['add_photo_before', 'add_photo_after'])
print(f'Количество: {photo_buttons.count()}')
for btn in photo_buttons:
    print(f'{btn.button_key} | default_access={btn.default_access} | roles={btn.get_accessible_roles()}')
"
```

**Если кнопок нет (count = 0):**
```bash
# Запустить populate_button_access
docker compose exec backend python manage.py populate_button_access

# Проверить снова
docker compose exec backend python manage.py shell -c "
from apps.core.models import ButtonAccess
print(ButtonAccess.objects.filter(page='issues', button_key__in=['add_photo_before', 'add_photo_after']).count())
"
```

### Шаг 2: Проверить роль пользователя

```bash
docker compose exec backend python manage.py shell -c "
from apps.users.models import User

# Замените на email пользователя, у которого проблема
email = 'user@example.com'

try:
    user = User.objects.get(email=email)
    print(f'Email: {user.email}')
    print(f'ФИО: {user.get_full_name()}')
    print(f'Роль: {user.role}')
    print(f'is_superuser: {user.is_superuser}')
except User.DoesNotExist:
    print(f'Пользователь {email} не найден')
"
```

### Шаг 3: Проверить доступ к кнопкам для роли пользователя

```bash
docker compose exec backend python manage.py shell -c "
from apps.core.models import ButtonAccess

# Замените на роль из предыдущего шага
role = 'CONTRACTOR'

buttons = ButtonAccess.objects.filter(page='issues', button_key__in=['add_photo_before', 'add_photo_after'])
print(f'=== Проверка доступа для роли: {role} ===')
for btn in buttons:
    has_access = btn.has_access(role)
    status = '✅ Есть доступ' if has_access else '❌ Нет доступа'
    print(f'{btn.button_key:20} | {status}')
    if not has_access:
        print(f'  Доступные роли: {btn.get_accessible_roles()}')
"
```

### Шаг 4: Проверить API ответ

```bash
# Вариант 1: Через curl (нужен токен авторизации)
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     "https://stroyka.asia/api/button-access/by_page/?page=issues"

# Вариант 2: Через браузер DevTools
# 1. Открыть https://stroyka.asia/dashboard/issues
# 2. F12 → Network → фильтр "button-access"
# 3. Обновить страницу
# 4. Найти запрос GET /api/button-access/by_page/?page=issues
# 5. Посмотреть Response
```

**Ожидаемый ответ должен содержать:**
```json
[
  {
    "button_key": "add_photo_before",
    "button_name": "Добавить фото ДО",
    "description": "Загрузка фотографий \"До\" к замечанию"
  },
  {
    "button_key": "add_photo_after",
    "button_name": "Добавить фото ПОСЛЕ",
    "description": "Загрузка фотографий \"После\" к замечанию"
  },
  ...
]
```

### Шаг 5: Проверить версию кода

```bash
# Текущий коммит
git log --oneline -1

# Проверить наличие кода для кнопок фото
grep -n "canAddPhotoBefore" frontend/src/pages/Issues.tsx
grep -n "add_photo_before" backend/apps/core/management/commands/populate_button_access.py

# Если grep ничего не нашёл - код устарел, нужно обновить
```

---

## 🛠️ Решения в зависимости от найденной проблемы

### Решение 1: Кнопки отсутствуют в БД

```bash
# Запустить populate_button_access
docker compose exec backend python manage.py populate_button_access

# Проверить результат
docker compose exec backend python manage.py shell -c "
from apps.core.models import ButtonAccess
count = ButtonAccess.objects.filter(page='issues', button_key__in=['add_photo_before', 'add_photo_after']).count()
print(f'Кнопок добавлено: {count}')
"
```

### Решение 2: У роли нет доступа

**Вариант A: Через Django Admin (рекомендуется)**

1. Зайти в админку: `https://stroyka.asia/admin/core/buttonaccess/`
2. Найти кнопку `add_photo_before`
3. Поставить галочку напротив нужной роли (например, CONTRACTOR)
4. Сохранить
5. Повторить для `add_photo_after`

**Вариант B: Через команду shell**

```bash
docker compose exec backend python manage.py shell -c "
from apps.core.models import ButtonAccess

# Замените на нужную роль
role_to_add = 'CONTRACTOR'

buttons = ButtonAccess.objects.filter(page='issues', button_key__in=['add_photo_before', 'add_photo_after'])
for btn in buttons:
    setattr(btn, role_to_add, True)
    btn.save()
    print(f'✅ Добавлен доступ для {role_to_add} к кнопке {btn.button_key}')
"
```

### Решение 3: Устаревший код

```bash
# 1. Обновить код
git pull origin main

# 2. Пересобрать контейнеры
docker compose down
docker compose build --no-cache frontend backend
docker compose up -d

# 3. Запустить populate_button_access
docker compose exec backend python manage.py populate_button_access

# 4. Проверить статус
docker compose ps
docker compose logs frontend --tail=50
docker compose logs backend --tail=50
```

### Решение 4: Очистить кэш

```bash
# Вариант 1: Через браузер
# Ctrl+Shift+R (Windows/Linux) или Cmd+Shift+R (Mac)

# Вариант 2: Очистить кэш браузера
# Settings → Privacy → Clear browsing data → Cached images and files

# Вариант 3: Перезапустить фронтенд контейнер
docker compose restart frontend
```

---

## 📝 Контрольный чек-лист для продакшна

- [ ] **Шаг 1:** Подключиться к продакшн серверу по SSH
- [ ] **Шаг 2:** Проверить наличие кнопок `add_photo_before` и `add_photo_after` в БД
- [ ] **Шаг 3:** Если кнопок нет → запустить `populate_button_access`
- [ ] **Шаг 4:** Если кнопки есть → проверить роль пользователя
- [ ] **Шаг 5:** Проверить, имеет ли роль пользователя доступ к кнопкам
- [ ] **Шаг 6:** Если доступа нет → добавить роль через админку или shell
- [ ] **Шаг 7:** Проверить API ответ `/api/button-access/by_page/?page=issues`
- [ ] **Шаг 8:** Если в API кнопок нет → проблема на backend (см. шаги 2-6)
- [ ] **Шаг 9:** Если в API кнопки есть, но на UI нет → очистить кэш браузера
- [ ] **Шаг 10:** Если проблема осталась → проверить версию кода и обновить
- [ ] **Шаг 11:** Проверить результат в браузере

---

## 🎯 Наиболее вероятная причина

**На основе анализа, наиболее вероятная причина:**

> ⚠️ **Кнопки `add_photo_before` и `add_photo_after` отсутствуют в базе данных продакшн сервера.**

**Почему:**
- Команда `populate_button_access` создаёт кнопки в БД
- Эти кнопки были добавлены в файл `populate_button_access.py` недавно
- На продакшне команда не была выполнена после обновления кода

**Быстрое решение (1 минута):**
```bash
ssh user@production-server
cd /opt/checksite
docker compose exec backend python manage.py populate_button_access
```

После этого обновить страницу в браузере (Ctrl+Shift+R) и проверить наличие кнопок.

---

## 📞 Куда обратиться за помощью

Если после выполнения всех шагов проблема не решена, предоставьте следующую информацию:

1. **Результат проверки БД:**
   ```bash
   docker compose exec backend python manage.py shell -c "
   from apps.core.models import ButtonAccess
   print(ButtonAccess.objects.filter(page='issues', button_key__in=['add_photo_before', 'add_photo_after']).count())
   "
   ```

2. **Роль пользователя:**
   ```bash
   docker compose exec backend python manage.py shell -c "
   from apps.users.models import User
   u = User.objects.get(email='user@example.com')
   print(u.role)
   "
   ```

3. **API ответ:** (скриншот из DevTools → Network → Response)

4. **Логи backend:** `docker compose logs backend --tail=100`

5. **Версия кода:** `git log --oneline -1`

---

**Дата создания документа:** 2025-11-02
**Автор:** Claude Code
**Версия:** 1.0
