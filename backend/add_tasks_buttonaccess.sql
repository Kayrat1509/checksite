-- ========================================================================
-- SQL скрипт для добавления записей ButtonAccess для модуля TASKS
-- ========================================================================
-- Использование:
--   psql -U checksite_user -d checksite_db -f add_tasks_buttonaccess.sql
-- ========================================================================

-- Добавляем страницу tasks
INSERT INTO core_button_access (
    access_type, page, button_key, button_name, description, company_id,
    "SUPERADMIN", "DIRECTOR", "CHIEF_ENGINEER", "PROJECT_MANAGER",
    "ENGINEER", "SITE_MANAGER", "FOREMAN", "MASTER", "SUPERVISOR",
    "CONTRACTOR", "OBSERVER", "SUPPLY_MANAGER", "WAREHOUSE_HEAD",
    "SITE_WAREHOUSE_MANAGER", default_access
) VALUES (
    'page',
    'tasks',
    NULL,
    'Задачи',
    'Доступ к странице Задачи',
    NULL,
    true,  -- SUPERADMIN
    true,  -- DIRECTOR
    true,  -- CHIEF_ENGINEER
    true,  -- PROJECT_MANAGER
    true,  -- ENGINEER
    true,  -- SITE_MANAGER
    true,  -- FOREMAN
    true,  -- MASTER
    true,  -- SUPERVISOR
    false, -- CONTRACTOR
    false, -- OBSERVER
    false, -- SUPPLY_MANAGER
    false, -- WAREHOUSE_HEAD
    false, -- SITE_WAREHOUSE_MANAGER
    false  -- default_access
)
ON CONFLICT DO NOTHING;

-- Добавляем кнопку create (Создать задачу)
INSERT INTO core_button_access (
    access_type, page, button_key, button_name, description, company_id,
    "SUPERADMIN", "DIRECTOR", "CHIEF_ENGINEER", "PROJECT_MANAGER",
    "ENGINEER", "SITE_MANAGER", "FOREMAN", "MASTER", "SUPERVISOR",
    "CONTRACTOR", "OBSERVER", "SUPPLY_MANAGER", "WAREHOUSE_HEAD",
    "SITE_WAREHOUSE_MANAGER", default_access
) VALUES (
    'button',
    'tasks',
    'create',
    'Создать задачу',
    'Право на создание новой задачи',
    NULL,
    true,  -- SUPERADMIN
    true,  -- DIRECTOR
    true,  -- CHIEF_ENGINEER
    true,  -- PROJECT_MANAGER
    true,  -- ENGINEER
    true,  -- SITE_MANAGER
    true,  -- FOREMAN
    false, -- MASTER
    true,  -- SUPERVISOR
    false, -- CONTRACTOR
    false, -- OBSERVER
    false, -- SUPPLY_MANAGER
    false, -- WAREHOUSE_HEAD
    false, -- SITE_WAREHOUSE_MANAGER
    false  -- default_access
)
ON CONFLICT DO NOTHING;

-- Добавляем кнопку edit (Редактировать задачу)
INSERT INTO core_button_access (
    access_type, page, button_key, button_name, description, company_id,
    "SUPERADMIN", "DIRECTOR", "CHIEF_ENGINEER", "PROJECT_MANAGER",
    "ENGINEER", "SITE_MANAGER", "FOREMAN", "MASTER", "SUPERVISOR",
    "CONTRACTOR", "OBSERVER", "SUPPLY_MANAGER", "WAREHOUSE_HEAD",
    "SITE_WAREHOUSE_MANAGER", default_access
) VALUES (
    'button',
    'tasks',
    'edit',
    'Редактировать задачу',
    'Право на редактирование задачи',
    NULL,
    true,  -- SUPERADMIN
    true,  -- DIRECTOR
    true,  -- CHIEF_ENGINEER
    true,  -- PROJECT_MANAGER
    true,  -- ENGINEER
    true,  -- SITE_MANAGER
    true,  -- FOREMAN
    false, -- MASTER
    true,  -- SUPERVISOR
    false, -- CONTRACTOR
    false, -- OBSERVER
    false, -- SUPPLY_MANAGER
    false, -- WAREHOUSE_HEAD
    false, -- SITE_WAREHOUSE_MANAGER
    false  -- default_access
)
ON CONFLICT DO NOTHING;

-- Добавляем кнопку delete (Удалить задачу)
INSERT INTO core_button_access (
    access_type, page, button_key, button_name, description, company_id,
    "SUPERADMIN", "DIRECTOR", "CHIEF_ENGINEER", "PROJECT_MANAGER",
    "ENGINEER", "SITE_MANAGER", "FOREMAN", "MASTER", "SUPERVISOR",
    "CONTRACTOR", "OBSERVER", "SUPPLY_MANAGER", "WAREHOUSE_HEAD",
    "SITE_WAREHOUSE_MANAGER", default_access
) VALUES (
    'button',
    'tasks',
    'delete',
    'Удалить задачу',
    'Право на удаление задачи',
    NULL,
    true,  -- SUPERADMIN
    true,  -- DIRECTOR
    true,  -- CHIEF_ENGINEER
    true,  -- PROJECT_MANAGER
    false, -- ENGINEER
    false, -- SITE_MANAGER
    false, -- FOREMAN
    false, -- MASTER
    false, -- SUPERVISOR
    false, -- CONTRACTOR
    false, -- OBSERVER
    false, -- SUPPLY_MANAGER
    false, -- WAREHOUSE_HEAD
    false, -- SITE_WAREHOUSE_MANAGER
    false  -- default_access
)
ON CONFLICT DO NOTHING;

-- Добавляем кнопку complete (Завершить задачу)
INSERT INTO core_button_access (
    access_type, page, button_key, button_name, description, company_id,
    "SUPERADMIN", "DIRECTOR", "CHIEF_ENGINEER", "PROJECT_MANAGER",
    "ENGINEER", "SITE_MANAGER", "FOREMAN", "MASTER", "SUPERVISOR",
    "CONTRACTOR", "OBSERVER", "SUPPLY_MANAGER", "WAREHOUSE_HEAD",
    "SITE_WAREHOUSE_MANAGER", default_access
) VALUES (
    'button',
    'tasks',
    'complete',
    'Завершить задачу',
    'Право на завершение задачи',
    NULL,
    true,  -- SUPERADMIN
    true,  -- DIRECTOR
    true,  -- CHIEF_ENGINEER
    true,  -- PROJECT_MANAGER
    true,  -- ENGINEER
    true,  -- SITE_MANAGER
    true,  -- FOREMAN
    false, -- MASTER
    true,  -- SUPERVISOR
    false, -- CONTRACTOR
    false, -- OBSERVER
    false, -- SUPPLY_MANAGER
    false, -- WAREHOUSE_HEAD
    false, -- SITE_WAREHOUSE_MANAGER
    false  -- default_access
)
ON CONFLICT DO NOTHING;

-- Добавляем кнопку reject (Отменить задачу)
INSERT INTO core_button_access (
    access_type, page, button_key, button_name, description, company_id,
    "SUPERADMIN", "DIRECTOR", "CHIEF_ENGINEER", "PROJECT_MANAGER",
    "ENGINEER", "SITE_MANAGER", "FOREMAN", "MASTER", "SUPERVISOR",
    "CONTRACTOR", "OBSERVER", "SUPPLY_MANAGER", "WAREHOUSE_HEAD",
    "SITE_WAREHOUSE_MANAGER", default_access
) VALUES (
    'button',
    'tasks',
    'reject',
    'Отменить задачу',
    'Право на отмену задачи',
    NULL,
    true,  -- SUPERADMIN
    true,  -- DIRECTOR
    true,  -- CHIEF_ENGINEER
    true,  -- PROJECT_MANAGER
    true,  -- ENGINEER
    true,  -- SITE_MANAGER
    true,  -- FOREMAN
    false, -- MASTER
    true,  -- SUPERVISOR
    false, -- CONTRACTOR
    false, -- OBSERVER
    false, -- SUPPLY_MANAGER
    false, -- WAREHOUSE_HEAD
    false, -- SITE_WAREHOUSE_MANAGER
    false  -- default_access
)
ON CONFLICT DO NOTHING;

-- ========================================================================
-- Проверка результатов
-- ========================================================================
SELECT
    '✅ Добавлено записей для tasks' as status,
    COUNT(*) as count
FROM core_button_access
WHERE page = 'tasks' OR (page IS NULL AND button_name = 'Задачи' AND access_type = 'page');

-- Показываем все добавленные записи
SELECT
    access_type,
    page,
    button_key,
    button_name,
    "DIRECTOR",
    "CHIEF_ENGINEER",
    "PROJECT_MANAGER",
    "ENGINEER",
    "SITE_MANAGER",
    "FOREMAN",
    "SUPERVISOR"
FROM core_button_access
WHERE page = 'tasks'
   OR (button_name = 'Задачи' AND access_type = 'page')
ORDER BY
    CASE WHEN access_type = 'page' THEN 0 ELSE 1 END,
    button_key;

-- Общая статистика
SELECT
    '📊 Общая статистика' as info,
    COUNT(*) as total_records,
    SUM(CASE WHEN access_type = 'page' THEN 1 ELSE 0 END) as pages,
    SUM(CASE WHEN access_type = 'button' THEN 1 ELSE 0 END) as buttons
FROM core_button_access
WHERE company_id IS NULL;

-- ========================================================================
-- ГОТОВО! Записи добавлены.
-- Теперь нужно очистить кэш:
--   python manage.py shell -c "from django.core.cache import cache; cache.clear()"
-- ========================================================================
