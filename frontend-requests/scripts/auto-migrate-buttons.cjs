const fs = require('fs');
const path = require('path');

// Маппинг всех кнопок по страницам (из предыдущего анализа)
const buttonMapping = {
  'Projects.tsx': {
    page: 'projects',
    buttons: [
      { key: 'create', text: 'Создать проект', icon: 'PlusOutlined' },
      { key: 'edit', text: 'Редактировать', icon: 'EditOutlined' },
      { key: 'delete', text: 'Удалить', icon: 'DeleteOutlined' },
      { key: 'import', text: 'Импорт', icon: 'ImportOutlined' },
      { key: 'export', text: 'Экспорт', icon: 'ExportOutlined' },
      { key: 'view', text: 'Просмотр', icon: 'EyeOutlined' }
    ]
  },
  'Issues.tsx': {
    page: 'issues',
    buttons: [
      { key: 'create', text: 'Создать замечание', icon: 'PlusOutlined' },
      { key: 'edit', text: 'Редактировать', icon: 'EditOutlined' },
      { key: 'delete', text: 'Удалить', icon: 'DeleteOutlined' },
      { key: 'close', text: 'Закрыть', icon: 'CheckOutlined' },
      { key: 'reopen', text: 'Переоткрыть', icon: 'ReloadOutlined' },
      { key: 'assign', text: 'Назначить', icon: 'UserOutlined' },
      { key: 'comment', text: 'Комментировать', icon: 'CommentOutlined' },
      { key: 'export', text: 'Экспорт', icon: 'ExportOutlined' }
    ]
  },
  'Users.tsx': {
    page: 'users',
    buttons: [
      { key: 'create', text: 'Создать пользователя', icon: 'PlusOutlined' },
      { key: 'edit', text: 'Редактировать', icon: 'EditOutlined' },
      { key: 'delete', text: 'Удалить', icon: 'DeleteOutlined' },
      { key: 'change_role', text: 'Изменить роль', icon: 'UserSwitchOutlined' },
      { key: 'change_password', text: 'Сменить пароль', icon: 'LockOutlined' },
      { key: 'import', text: 'Импорт', icon: 'ImportOutlined' },
      { key: 'export', text: 'Экспорт', icon: 'ExportOutlined' }
    ]
  },
  'Contractors.tsx': {
    page: 'contractors',
    buttons: [
      { key: 'create', text: 'Создать подрядчика', icon: 'PlusOutlined' },
      { key: 'edit', text: 'Редактировать', icon: 'EditOutlined' },
      { key: 'delete', text: 'Удалить', icon: 'DeleteOutlined' },
      { key: 'import', text: 'Импорт', icon: 'ImportOutlined' },
      { key: 'export', text: 'Экспорт', icon: 'ExportOutlined' },
      { key: 'view_projects', text: 'Проекты', icon: 'ProjectOutlined' }
    ]
  },
  'Supervisions.tsx': {
    page: 'supervisions',
    buttons: [
      { key: 'create', text: 'Создать надзор', icon: 'PlusOutlined' },
      { key: 'edit', text: 'Редактировать', icon: 'EditOutlined' },
      { key: 'delete', text: 'Удалить', icon: 'DeleteOutlined' },
      { key: 'assign', text: 'Назначить', icon: 'UserOutlined' },
      { key: 'export', text: 'Экспорт', icon: 'ExportOutlined' }
    ]
  },
  'MaterialRequests.tsx': {
    page: 'material-requests',
    buttons: [
      { key: 'create', text: 'Создать заявку', icon: 'PlusOutlined' },
      { key: 'edit', text: 'Редактировать', icon: 'EditOutlined' },
      { key: 'delete', text: 'Удалить', icon: 'DeleteOutlined' },
      { key: 'approve', text: 'Одобрить', icon: 'CheckOutlined' },
      { key: 'reject', text: 'Отклонить', icon: 'CloseOutlined' },
      { key: 'view_details', text: 'Детали', icon: 'EyeOutlined' },
      { key: 'export', text: 'Экспорт', icon: 'ExportOutlined' }
    ]
  },
  'Tenders.tsx': {
    page: 'tenders',
    buttons: [
      { key: 'create', text: 'Создать тендер', icon: 'PlusOutlined' },
      { key: 'edit', text: 'Редактировать', icon: 'EditOutlined' },
      { key: 'delete', text: 'Удалить', icon: 'DeleteOutlined' },
      { key: 'publish', text: 'Опубликовать', icon: 'SendOutlined' },
      { key: 'close', text: 'Закрыть', icon: 'CloseCircleOutlined' },
      { key: 'view_bids', text: 'Заявки', icon: 'FileTextOutlined' },
      { key: 'select_winner', text: 'Выбрать победителя', icon: 'TrophyOutlined' },
      { key: 'export', text: 'Экспорт', icon: 'ExportOutlined' }
    ]
  },
  'Warehouse.tsx': {
    page: 'warehouse',
    buttons: [
      { key: 'add_item', text: 'Добавить товар', icon: 'PlusOutlined' },
      { key: 'edit', text: 'Редактировать', icon: 'EditOutlined' },
      { key: 'delete', text: 'Удалить', icon: 'DeleteOutlined' },
      { key: 'transfer', text: 'Перемещение', icon: 'SwapOutlined' },
      { key: 'write_off', text: 'Списание', icon: 'MinusCircleOutlined' },
      { key: 'import', text: 'Импорт', icon: 'ImportOutlined' },
      { key: 'export', text: 'Экспорт', icon: 'ExportOutlined' }
    ]
  },
  'Reports.tsx': {
    page: 'reports',
    buttons: [
      { key: 'generate', text: 'Сформировать отчет', icon: 'FileTextOutlined' },
      { key: 'export_pdf', text: 'Экспорт PDF', icon: 'FilePdfOutlined' },
      { key: 'export_excel', text: 'Экспорт Excel', icon: 'FileExcelOutlined' },
      { key: 'print', text: 'Печать', icon: 'PrinterOutlined' },
      { key: 'save_template', text: 'Сохранить шаблон', icon: 'SaveOutlined' }
    ]
  }
};

// Путь к папке с страницами
const pagesDir = path.join(__dirname, '..', 'src', 'pages');

console.log('🚀 Начинаю автоматическую миграцию кнопок...\n');

let totalFilesProcessed = 0;
let totalButtonsReplaced = 0;

// Обработка каждого файла
Object.keys(buttonMapping).forEach(fileName => {
  const filePath = path.join(pagesDir, fileName);

  // Проверяем существование файла
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Файл ${fileName} не найден, пропускаю...`);
    return;
  }

  console.log(`📄 Обрабатываю ${fileName}...`);

  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  const config = buttonMapping[fileName];
  let buttonsReplacedInFile = 0;

  // Проверяем наличие импорта AccessControlledButton
  const hasImport = content.includes("import { AccessControlledButton } from '../components/AccessControlledButton'") ||
                     content.includes('import { AccessControlledButton }');

  if (!hasImport) {
    // Добавляем импорт после последнего импорта из '../components/' или '../hooks/'
    const importRegex = /(import .+ from ['"]\.\.\/(?:components|hooks)\/.+['"])/g;
    const imports = content.match(importRegex);

    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertPosition = lastImportIndex + lastImport.length;

      content = content.slice(0, insertPosition) +
                "\nimport { AccessControlledButton } from '../components/AccessControlledButton'" +
                content.slice(insertPosition);

      console.log(`  ✅ Добавлен импорт AccessControlledButton`);
    }
  }

  // Замена каждой кнопки
  config.buttons.forEach(button => {
    // Паттерны для поиска Button компонентов
    // 1. <Button с пропсами и текстом внутри
    const pattern1 = new RegExp(
      `<Button([^>]*?)>\\s*${escapeRegex(button.text)}\\s*</Button>`,
      'gs'
    );

    // 2. <Button с icon пропом
    const pattern2 = new RegExp(
      `<Button([^>]*icon={<${button.icon}[^}]*/>}[^>]*)>\\s*${escapeRegex(button.text)}\\s*</Button>`,
      'gs'
    );

    // 3. Простой Button без иконки
    const pattern3 = new RegExp(
      `<Button([^>]*?)>\\s*${escapeRegex(button.text)}\\s*</Button>`,
      'gs'
    );

    // Проверяем все три паттерна
    [pattern1, pattern2, pattern3].forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, (match, props) => {
          // Не заменяем, если уже AccessControlledButton
          if (match.includes('AccessControlledButton')) {
            return match;
          }

          buttonsReplacedInFile++;

          // Извлекаем существующие пропсы (убираем лишние пробелы)
          const cleanProps = props.trim();

          // Формируем новый компонент
          const newButton = cleanProps
            ? `<AccessControlledButton page="${config.page}" buttonKey="${button.key}"${cleanProps}>\n      ${button.text}\n    </AccessControlledButton>`
            : `<AccessControlledButton page="${config.page}" buttonKey="${button.key}">\n      ${button.text}\n    </AccessControlledButton>`;

          return newButton;
        });
      }
    });
  });

  // Удаляем устаревшие функции проверки доступа (если есть)
  const functionsToRemove = [
    'canCreateRequest',
    'canEditProject',
    'canDeleteIssue',
    'hasEditPermission',
    'hasDeletePermission',
    'canApprove',
    'canReject'
  ];

  functionsToRemove.forEach(funcName => {
    // Удаляем определение функции
    const funcPattern = new RegExp(
      `const ${funcName} = \\([^)]*\\) => \\{[^}]+\\}\\s*`,
      'gs'
    );
    content = content.replace(funcPattern, '');

    // Удаляем стрелочные функции однострочные
    const arrowPattern = new RegExp(
      `const ${funcName} = \\([^)]*\\) => [^\\n]+\\n`,
      'g'
    );
    content = content.replace(arrowPattern, '');
  });

  // Сохраняем файл, только если были изменения
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✅ Заменено кнопок: ${buttonsReplacedInFile}`);
    totalFilesProcessed++;
    totalButtonsReplaced += buttonsReplacedInFile;
  } else {
    console.log(`  ℹ️  Изменений не требуется`);
  }

  console.log('');
});

console.log('✨ Миграция завершена!');
console.log(`📊 Статистика:`);
console.log(`   - Обработано файлов: ${totalFilesProcessed}`);
console.log(`   - Заменено кнопок: ${totalButtonsReplaced}`);
console.log(`\n✅ Все кнопки теперь контролируются через AccessControlledButton`);
console.log(`\n⚠️  Рекомендация: проверьте работу страниц в браузере`);

// Вспомогательная функция для экранирования спецсимволов в regex
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
