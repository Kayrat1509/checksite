-- ============================================================================
-- SQL СКРИПТ ДЛЯ СИНХРОНИЗАЦИИ ПРОДАКШН БД
-- ============================================================================
--
-- ВНИМАНИЕ: Этот скрипт добавляет 13 отсутствующих записей ButtonAccess
-- в продакшн базу данных.
--
-- Отсутствующие записи:
-- • 1 страница:  settings/approval-flow (ID=148)
-- • 12 кнопок:   IDs 140-143, 151-158
--
-- ПЕРЕД ВЫПОЛНЕНИЕМ:
-- 1. Сделайте backup продакшн базы данных
-- 2. Убедитесь, что вы подключены к продакшн БД
-- 3. Проверьте, что записи с этими ID действительно отсутствуют
--
-- Выполнение:
--   psql -h <host> -U <user> -d <database> -f sync_buttonaccess.sql
--
-- ============================================================================

BEGIN;

-- КНОПКА: settings/approval-flow / create - "Создать цепочку"
INSERT INTO core_buttonaccess (
    id, access_type, company_id, page, button_key, button_name, description,
    default_access, created_at, updated_at,
    "DIRECTOR", "CHIEF_ENGINEER", "PROJECT_MANAGER", "ENGINEER", "SITE_MANAGER",
    "FOREMAN", "MASTER", "SUPERVISOR", "CONTRACTOR", "OBSERVER",
    "SUPPLY_MANAGER", "WAREHOUSE_HEAD", "SITE_WAREHOUSE_MANAGER"
) VALUES (
    140, 'button', NULL, 'settings/approval-flow', 'create', 'Создать цепочку', 'Создание новой цепочки согласования',
    FALSE, NOW(), NOW(),
    TRUE, TRUE, TRUE,
    TRUE, TRUE, FALSE,
    FALSE, FALSE, FALSE,
    FALSE, TRUE, FALSE,
    FALSE
);

-- КНОПКА: settings/approval-flow / edit - "Редактировать"
INSERT INTO core_buttonaccess (
    id, access_type, company_id, page, button_key, button_name, description,
    default_access, created_at, updated_at,
    "DIRECTOR", "CHIEF_ENGINEER", "PROJECT_MANAGER", "ENGINEER", "SITE_MANAGER",
    "FOREMAN", "MASTER", "SUPERVISOR", "CONTRACTOR", "OBSERVER",
    "SUPPLY_MANAGER", "WAREHOUSE_HEAD", "SITE_WAREHOUSE_MANAGER"
) VALUES (
    141, 'button', NULL, 'settings/approval-flow', 'edit', 'Редактировать', 'Редактирование существующей цепочки',
    FALSE, NOW(), NOW(),
    TRUE, TRUE, TRUE,
    TRUE, TRUE, FALSE,
    FALSE, FALSE, FALSE,
    FALSE, TRUE, FALSE,
    FALSE
);

-- КНОПКА: settings/approval-flow / delete - "Удалить"
INSERT INTO core_buttonaccess (
    id, access_type, company_id, page, button_key, button_name, description,
    default_access, created_at, updated_at,
    "DIRECTOR", "CHIEF_ENGINEER", "PROJECT_MANAGER", "ENGINEER", "SITE_MANAGER",
    "FOREMAN", "MASTER", "SUPERVISOR", "CONTRACTOR", "OBSERVER",
    "SUPPLY_MANAGER", "WAREHOUSE_HEAD", "SITE_WAREHOUSE_MANAGER"
) VALUES (
    142, 'button', NULL, 'settings/approval-flow', 'delete', 'Удалить', 'Удаление этапа цепочки',
    FALSE, NOW(), NOW(),
    TRUE, TRUE, TRUE,
    TRUE, TRUE, FALSE,
    FALSE, FALSE, FALSE,
    FALSE, TRUE, FALSE,
    FALSE
);

-- КНОПКА: settings/approval-flow / approve - "Сохранить изменения"
INSERT INTO core_buttonaccess (
    id, access_type, company_id, page, button_key, button_name, description,
    default_access, created_at, updated_at,
    "DIRECTOR", "CHIEF_ENGINEER", "PROJECT_MANAGER", "ENGINEER", "SITE_MANAGER",
    "FOREMAN", "MASTER", "SUPERVISOR", "CONTRACTOR", "OBSERVER",
    "SUPPLY_MANAGER", "WAREHOUSE_HEAD", "SITE_WAREHOUSE_MANAGER"
) VALUES (
    143, 'button', NULL, 'settings/approval-flow', 'approve', 'Сохранить изменения', 'Активация и сохранение изменений в цепочке',
    FALSE, NOW(), NOW(),
    TRUE, TRUE, TRUE,
    TRUE, TRUE, FALSE,
    FALSE, FALSE, FALSE,
    FALSE, TRUE, FALSE,
    FALSE
);

-- СТРАНИЦА: settings/approval-flow / view - "Настройки цепочки согласования"
INSERT INTO core_buttonaccess (
    id, access_type, company_id, page, button_key, button_name, description,
    default_access, created_at, updated_at,
    "DIRECTOR", "CHIEF_ENGINEER", "PROJECT_MANAGER", "ENGINEER", "SITE_MANAGER",
    "FOREMAN", "MASTER", "SUPERVISOR", "CONTRACTOR", "OBSERVER",
    "SUPPLY_MANAGER", "WAREHOUSE_HEAD", "SITE_WAREHOUSE_MANAGER"
) VALUES (
    148, 'page', NULL, 'settings/approval-flow', 'view', 'Настройки цепочки согласования', 'Страница настройки индивидуальной цепочки согласования заявок на материалы',
    FALSE, NOW(), NOW(),
    TRUE, TRUE, TRUE,
    TRUE, TRUE, FALSE,
    FALSE, FALSE, FALSE,
    FALSE, TRUE, FALSE,
    FALSE
);

-- КНОПКА: material-requests / submit - "Отправить на согласование"
INSERT INTO core_buttonaccess (
    id, access_type, company_id, page, button_key, button_name, description,
    default_access, created_at, updated_at,
    "DIRECTOR", "CHIEF_ENGINEER", "PROJECT_MANAGER", "ENGINEER", "SITE_MANAGER",
    "FOREMAN", "MASTER", "SUPERVISOR", "CONTRACTOR", "OBSERVER",
    "SUPPLY_MANAGER", "WAREHOUSE_HEAD", "SITE_WAREHOUSE_MANAGER"
) VALUES (
    151, 'button', NULL, 'material-requests', 'submit', 'Отправить на согласование', 'Отправка заявки/позиции на согласование',
    FALSE, NOW(), NOW(),
    TRUE, FALSE, TRUE,
    TRUE, TRUE, TRUE,
    TRUE, FALSE, FALSE,
    FALSE, TRUE, TRUE,
    FALSE
);

-- КНОПКА: material-requests / warehouse_workflow - "Действия завсклада в workflow"
INSERT INTO core_buttonaccess (
    id, access_type, company_id, page, button_key, button_name, description,
    default_access, created_at, updated_at,
    "DIRECTOR", "CHIEF_ENGINEER", "PROJECT_MANAGER", "ENGINEER", "SITE_MANAGER",
    "FOREMAN", "MASTER", "SUPERVISOR", "CONTRACTOR", "OBSERVER",
    "SUPPLY_MANAGER", "WAREHOUSE_HEAD", "SITE_WAREHOUSE_MANAGER"
) VALUES (
    152, 'button', NULL, 'material-requests', 'warehouse_workflow', 'Действия завсклада в workflow', 'Возврат снабженцу, подтверждение отправки',
    FALSE, NOW(), NOW(),
    FALSE, FALSE, FALSE,
    FALSE, FALSE, FALSE,
    FALSE, FALSE, FALSE,
    FALSE, FALSE, TRUE,
    FALSE
);

-- КНОПКА: material-requests / supply_workflow - "Действия снабженца в workflow"
INSERT INTO core_buttonaccess (
    id, access_type, company_id, page, button_key, button_name, description,
    default_access, created_at, updated_at,
    "DIRECTOR", "CHIEF_ENGINEER", "PROJECT_MANAGER", "ENGINEER", "SITE_MANAGER",
    "FOREMAN", "MASTER", "SUPERVISOR", "CONTRACTOR", "OBSERVER",
    "SUPPLY_MANAGER", "WAREHOUSE_HEAD", "SITE_WAREHOUSE_MANAGER"
) VALUES (
    153, 'button', NULL, 'material-requests', 'supply_workflow', 'Действия снабженца в workflow', 'Отправка на этапы согласования, оплата, доставка',
    FALSE, NOW(), NOW(),
    FALSE, FALSE, FALSE,
    FALSE, FALSE, FALSE,
    FALSE, FALSE, FALSE,
    FALSE, TRUE, FALSE,
    FALSE
);

-- КНОПКА: material-requests / director_workflow - "Действия директора/главного инженера в workflow"
INSERT INTO core_buttonaccess (
    id, access_type, company_id, page, button_key, button_name, description,
    default_access, created_at, updated_at,
    "DIRECTOR", "CHIEF_ENGINEER", "PROJECT_MANAGER", "ENGINEER", "SITE_MANAGER",
    "FOREMAN", "MASTER", "SUPERVISOR", "CONTRACTOR", "OBSERVER",
    "SUPPLY_MANAGER", "WAREHOUSE_HEAD", "SITE_WAREHOUSE_MANAGER"
) VALUES (
    154, 'button', NULL, 'material-requests', 'director_workflow', 'Действия директора/главного инженера в workflow', 'Согласование, возврат снабженцу, отправка на доработку',
    FALSE, NOW(), NOW(),
    TRUE, TRUE, FALSE,
    FALSE, FALSE, FALSE,
    FALSE, FALSE, FALSE,
    FALSE, FALSE, FALSE,
    FALSE
);

-- КНОПКА: material-requests / engineer_workflow - "Действия инженера ПТО в workflow"
INSERT INTO core_buttonaccess (
    id, access_type, company_id, page, button_key, button_name, description,
    default_access, created_at, updated_at,
    "DIRECTOR", "CHIEF_ENGINEER", "PROJECT_MANAGER", "ENGINEER", "SITE_MANAGER",
    "FOREMAN", "MASTER", "SUPERVISOR", "CONTRACTOR", "OBSERVER",
    "SUPPLY_MANAGER", "WAREHOUSE_HEAD", "SITE_WAREHOUSE_MANAGER"
) VALUES (
    155, 'button', NULL, 'material-requests', 'engineer_workflow', 'Действия инженера ПТО в workflow', 'Согласование, возврат снабженцу, отправка на доработку',
    FALSE, NOW(), NOW(),
    FALSE, FALSE, FALSE,
    TRUE, FALSE, FALSE,
    FALSE, FALSE, FALSE,
    FALSE, FALSE, FALSE,
    FALSE
);

-- КНОПКА: material-requests / pm_workflow - "Действия руководителя проекта в workflow"
INSERT INTO core_buttonaccess (
    id, access_type, company_id, page, button_key, button_name, description,
    default_access, created_at, updated_at,
    "DIRECTOR", "CHIEF_ENGINEER", "PROJECT_MANAGER", "ENGINEER", "SITE_MANAGER",
    "FOREMAN", "MASTER", "SUPERVISOR", "CONTRACTOR", "OBSERVER",
    "SUPPLY_MANAGER", "WAREHOUSE_HEAD", "SITE_WAREHOUSE_MANAGER"
) VALUES (
    156, 'button', NULL, 'material-requests', 'pm_workflow', 'Действия руководителя проекта в workflow', 'Согласование, возврат снабженцу, отправка на доработку',
    FALSE, NOW(), NOW(),
    FALSE, FALSE, TRUE,
    FALSE, FALSE, FALSE,
    FALSE, FALSE, FALSE,
    FALSE, FALSE, FALSE,
    FALSE
);

-- КНОПКА: issues / mark_accepted - "Отметить принято"
INSERT INTO core_buttonaccess (
    id, access_type, company_id, page, button_key, button_name, description,
    default_access, created_at, updated_at,
    "DIRECTOR", "CHIEF_ENGINEER", "PROJECT_MANAGER", "ENGINEER", "SITE_MANAGER",
    "FOREMAN", "MASTER", "SUPERVISOR", "CONTRACTOR", "OBSERVER",
    "SUPPLY_MANAGER", "WAREHOUSE_HEAD", "SITE_WAREHOUSE_MANAGER"
) VALUES (
    157, 'button', NULL, 'issues', 'mark_accepted', 'Отметить принято', 'Поле "Принято" для отметки выполнения замечания ИТР',
    FALSE, NOW(), NOW(),
    FALSE, FALSE, FALSE,
    TRUE, TRUE, FALSE,
    TRUE, FALSE, FALSE,
    FALSE, FALSE, FALSE,
    FALSE
);

-- КНОПКА: recycle-bin / clean_expired - "Очистить просроченные"
INSERT INTO core_buttonaccess (
    id, access_type, company_id, page, button_key, button_name, description,
    default_access, created_at, updated_at,
    "DIRECTOR", "CHIEF_ENGINEER", "PROJECT_MANAGER", "ENGINEER", "SITE_MANAGER",
    "FOREMAN", "MASTER", "SUPERVISOR", "CONTRACTOR", "OBSERVER",
    "SUPPLY_MANAGER", "WAREHOUSE_HEAD", "SITE_WAREHOUSE_MANAGER"
) VALUES (
    158, 'button', NULL, 'recycle-bin', 'clean_expired', 'Очистить просроченные', 'Удаление просроченных элементов из корзины',
    FALSE, NOW(), NOW(),
    TRUE, FALSE, FALSE,
    FALSE, FALSE, FALSE,
    FALSE, FALSE, FALSE,
    FALSE, FALSE, FALSE,
    FALSE
);


COMMIT;

-- ============================================================================
-- ПРОВЕРКА ПОСЛЕ ВЫПОЛНЕНИЯ:
-- ============================================================================

-- Проверьте, что все 13 записей добавлены:
SELECT COUNT(*) FROM core_buttonaccess WHERE company_id IS NULL;
-- Должно быть: 102 записи

SELECT COUNT(*) FROM core_buttonaccess WHERE company_id IS NULL AND access_type = 'button';
-- Должно быть: 89 кнопок

SELECT COUNT(*) FROM core_buttonaccess WHERE company_id IS NULL AND access_type = 'page';
-- Должно быть: 13 страниц

-- Проверьте наличие страницы settings/approval-flow:
SELECT * FROM core_buttonaccess WHERE page = 'settings/approval-flow';
-- Должно быть: 5 записей (1 страница + 4 кнопки)

-- ============================================================================
-- КОНЕЦ СКРИПТА
-- ============================================================================