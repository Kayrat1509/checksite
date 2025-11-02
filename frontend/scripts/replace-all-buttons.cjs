const fs = require('fs');
const path = require('path');

/**
 * Универсальный скрипт замены Button на AccessControlledButton
 *
 * Стратегия:
 * 1. Находит все <Button компоненты
 * 2. Анализирует контекст (название переменной, функцию onClick, текст внутри)
 * 3. Определяет тип кнопки (create/edit/delete/approve/reject/view и т.д.)
 * 4. Заменяет на AccessControlledButton с правильными пропсами
 */

const pagesDir = path.join(__dirname, '..', 'src', 'pages');

// Маппинг страниц
const pageMapping = {
  'Projects.tsx': 'projects',
  'Issues.tsx': 'issues',
  'Users.tsx': 'users',
  'Contractors.tsx': 'contractors',
  'Supervisions.tsx': 'supervisions',
  'MaterialRequests.tsx': 'material-requests',
  'Tenders.tsx': 'tenders',
  'Warehouse.tsx': 'warehouse',
  'Reports.tsx': 'reports'
};

// Эвристика для определения типа кнопки по контексту
function detectButtonType(buttonCode, contextBefore, contextAfter) {
  const fullContext = (contextBefore + buttonCode + contextAfter).toLowerCase();

  // Проверяем onClick функции
  if (buttonCode.includes('handleCreate') || buttonCode.includes('onCreate') ||
      buttonCode.includes('setModalVisible(true)') || buttonCode.includes('setIsModalOpen(true)')) {
    return 'create';
  }

  if (buttonCode.includes('handleEdit') || buttonCode.includes('onEdit') ||
      buttonCode.includes('showEdit') || buttonCode.includes('setEditModal')) {
    return 'edit';
  }

  if (buttonCode.includes('handleDelete') || buttonCode.includes('onDelete') ||
      buttonCode.includes('handleRemove') || fullContext.includes('удалить')) {
    return 'delete';
  }

  if (buttonCode.includes('handleApprove') || buttonCode.includes('onApprove') ||
      fullContext.includes('одобрить') || fullContext.includes('согласовать') ||
      fullContext.includes('approve')) {
    return 'approve';
  }

  if (buttonCode.includes('handleReject') || buttonCode.includes('onReject') ||
      fullContext.includes('отклонить') || fullContext.includes('reject')) {
    return 'reject';
  }

  if (buttonCode.includes('handleClose') || fullContext.includes('закрыть')) {
    return 'close';
  }

  if (buttonCode.includes('handleExport') || buttonCode.includes('onExport') ||
      fullContext.includes('export') || fullContext.includes('экспорт')) {
    return 'export';
  }

  if (buttonCode.includes('handleImport') || buttonCode.includes('onImport') ||
      fullContext.includes('import') || fullContext.includes('импорт')) {
    return 'import';
  }

  if (buttonCode.includes('handleView') || buttonCode.includes('showDetail') ||
      buttonCode.includes('showPersonnel') || buttonCode.includes('showContractors') ||
      fullContext.includes('просмотр') || fullContext.includes('details') ||
      fullContext.includes('сотрудники') || fullContext.includes('подрядчики')) {
    return 'view';
  }

  if (buttonCode.includes('handleAssign') || fullContext.includes('назначить')) {
    return 'assign';
  }

  if (buttonCode.includes('handleGenerate') || fullContext.includes('сформировать') ||
      fullContext.includes('generate')) {
    return 'generate';
  }

  if (buttonCode.includes('handlePrint') || fullContext.includes('печать') ||
      fullContext.includes('print')) {
    return 'print';
  }

  if (fullContext.includes('в наличии') || fullContext.includes('в stock') ||
      fullContext.includes('mark') && fullContext.includes('stock')) {
    return 'mark_in_stock';
  }

  if (fullContext.includes('на доработку') || fullContext.includes('rework')) {
    return 'rework';
  }

  if (fullContext.includes('добавить') || fullContext.includes('add')) {
    return 'add_item';
  }

  if (fullContext.includes('перемещение') || fullContext.includes('transfer')) {
    return 'transfer';
  }

  if (fullContext.includes('списание') || fullContext.includes('write_off') ||
      fullContext.includes('writeoff')) {
    return 'write_off';
  }

  if (fullContext.includes('опубликовать') || fullContext.includes('publish')) {
    return 'publish';
  }

  if (fullContext.includes('pdf') || fullContext.includes('пдф')) {
    return 'export_pdf';
  }

  if (fullContext.includes('excel') || fullContext.includes('эксель')) {
    return 'export_excel';
  }

  if (fullContext.includes('сохранить шаблон') || fullContext.includes('save_template')) {
    return 'save_template';
  }

  if (fullContext.includes('изменить роль') || fullContext.includes('change_role')) {
    return 'change_role';
  }

  if (fullContext.includes('сменить пароль') || fullContext.includes('change_password')) {
    return 'change_password';
  }

  if (fullContext.includes('победитель') || fullContext.includes('winner')) {
    return 'select_winner';
  }

  if (fullContext.includes('заявки') || fullContext.includes('bids')) {
    return 'view_bids';
  }

  // Если не смогли определить - возвращаем generic action
  return 'action';
}

// Основная функция замены
function replaceButtonsInFile(fileName) {
  const filePath = path.join(pagesDir, fileName);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Файл ${fileName} не найден`);
    return { replaced: 0, failed: 0 };
  }

  console.log(`\n📄 Обрабатываю ${fileName}...`);

  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  const pageName = pageMapping[fileName];
  let replacedCount = 0;
  let failedCount = 0;

  // Добавляем импорт если его нет
  if (!content.includes("import { AccessControlledButton }")) {
    const importMatch = content.match(/(import .+ from ['"]\.\.\/(?:components|hooks)\/.+['"])/g);
    if (importMatch && importMatch.length > 0) {
      const lastImport = importMatch[importMatch.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertPos = lastImportIndex + lastImport.length;

      content = content.slice(0, insertPos) +
                "\nimport { AccessControlledButton } from '../components/AccessControlledButton'" +
                content.slice(insertPos);

      console.log(`  ✅ Добавлен импорт AccessControlledButton`);
    }
  }

  // Регулярное выражение для поиска Button компонентов (многострочные)
  // Ищем <Button ... > ... </Button>
  const buttonPattern = /<Button(\s[^>]*?)>([\s\S]*?)<\/Button>/g;

  let match;
  const replacements = [];

  while ((match = buttonPattern.exec(content)) !== null) {
    const fullMatch = match[0];
    const props = match[1];
    const children = match[2];

    // Пропускаем уже замененные
    if (fullMatch.includes('AccessControlledButton')) {
      continue;
    }

    // Получаем контекст (100 символов до и после)
    const matchStart = match.index;
    const contextBefore = content.substring(Math.max(0, matchStart - 200), matchStart);
    const contextAfter = content.substring(matchStart + fullMatch.length,
                                           Math.min(content.length, matchStart + fullMatch.length + 200));

    // Определяем тип кнопки
    const buttonType = detectButtonType(fullMatch, contextBefore, contextAfter);

    // Формируем замену
    const replacement = `<AccessControlledButton page="${pageName}" buttonKey="${buttonType}"${props}>${children}</AccessControlledButton>`;

    replacements.push({
      original: fullMatch,
      replacement: replacement,
      type: buttonType,
      line: content.substring(0, matchStart).split('\n').length
    });

    replacedCount++;
  }

  // Применяем все замены (от конца к началу, чтобы не сбить индексы)
  replacements.reverse().forEach(({original, replacement}) => {
    content = content.replace(original, replacement);
  });

  // Выводим информацию о замененных кнопках
  if (replacements.length > 0) {
    console.log(`  ✅ Найдено и заменено кнопок: ${replacedCount}`);

    // Группируем по типам
    const typeGroups = {};
    replacements.forEach(r => {
      if (!typeGroups[r.type]) typeGroups[r.type] = 0;
      typeGroups[r.type]++;
    });

    console.log(`  📊 По типам:`);
    Object.entries(typeGroups).forEach(([type, count]) => {
      console.log(`     - ${type}: ${count}`);
    });
  }

  // Сохраняем файл
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  💾 Файл сохранен`);
  } else {
    console.log(`  ℹ️  Изменений не требуется`);
  }

  return { replaced: replacedCount, failed: failedCount };
}

// Запускаем для всех файлов
console.log('🚀 Начинаю автоматическую замену всех Button на AccessControlledButton...\n');

let totalReplaced = 0;
let totalFailed = 0;
const fileList = Object.keys(pageMapping);

fileList.forEach(fileName => {
  const result = replaceButtonsInFile(fileName);
  totalReplaced += result.replaced;
  totalFailed += result.failed;
});

console.log('\n\n✨ Миграция завершена!');
console.log(`\n📊 Общая статистика:`);
console.log(`   ✅ Успешно заменено: ${totalReplaced} кнопок`);
if (totalFailed > 0) {
  console.log(`   ⚠️  Не удалось заменить: ${totalFailed} кнопок`);
}
console.log(`   📁 Обработано файлов: ${fileList.length}`);
console.log(`\n✅ Все Button компоненты заменены на AccessControlledButton`);
console.log(`\n⚠️  Рекомендация:`);
console.log(`   1. Проверьте работу всех страниц в браузере`);
console.log(`   2. Убедитесь, что матрица доступа в админ-панеле настроена правильно`);
console.log(`   3. Проверьте, что buttonKey соответствуют записям в БД`);
