const fs = require('fs');
const path = require('path');

/**
 * Финальный скрипт для исправления импортов
 *
 * Задачи:
 * 1. Добавить импорт Button обратно в antd (для UI элементов в модалках)
 * 2. Убедиться что везде есть импорт AccessControlledButton
 */

const pagesDir = path.join(__dirname, '..', 'src', 'pages');

const pageFiles = [
  'Projects.tsx',
  'Issues.tsx',
  'Users.tsx',
  'Contractors.tsx',
  'Supervisions.tsx',
  'MaterialRequests.tsx',
  'Tenders.tsx',
  'Warehouse.tsx',
  'Reports.tsx'
];

console.log('🔧 Исправление импортов...\n');

pageFiles.forEach(fileName => {
  const filePath = path.join(pagesDir, fileName);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Файл ${fileName} не найден`);
    return;
  }

  console.log(`📄 Обрабатываю ${fileName}...`);

  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  // 1. Проверяем наличие импорта Button в antd
  const antdImportMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]antd['"]/);

  if (antdImportMatch) {
    const imports = antdImportMatch[1];

    // Если Button нет в импортах - добавляем
    if (!imports.includes('Button')) {
      const newImports = imports.trim() + ',\n  Button';
      content = content.replace(
        /import\s*\{([^}]+)\}\s*from\s*['"]antd['"]/,
        `import {\n  ${newImports.split(',').map(i => i.trim()).join(',\n  ')}\n} from 'antd'`
      );
      console.log(`  ✅ Добавлен импорт Button в antd`);
    }
  }

  // 2. Проверяем наличие импорта AccessControlledButton
  if (!content.includes("import { AccessControlledButton }")) {
    // Находим последний импорт из '../components/' или '../hooks/'
    const componentImportRegex = /import .+ from ['"]\.\.\/(?:components|hooks|stores)\/.+['"]/g;
    const imports = content.match(componentImportRegex);

    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertPos = lastImportIndex + lastImport.length;

      content = content.slice(0, insertPos) +
                "\nimport { AccessControlledButton } from '../components/AccessControlledButton'" +
                content.slice(insertPos);

      console.log(`  ✅ Добавлен импорт AccessControlledButton`);
    }
  }

  // Сохраняем файл если были изменения
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  💾 Файл сохранен`);
  } else {
    console.log(`  ℹ️  Изменений не требуется`);
  }
});

console.log('\n✅ Исправление импортов завершено!');
