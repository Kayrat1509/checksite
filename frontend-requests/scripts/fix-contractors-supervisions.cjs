const fs = require('fs');
const path = require('path');

/**
 * Скрипт для автоматической замены хардкодных функций доступа
 * в файлах Contractors.tsx и Supervisions.tsx
 */

const pagesDir = path.join(__dirname, '..', 'src', 'pages');

const files = [
  {
    name: 'Contractors.tsx',
    pageName: 'contractors',
    functions: [
      { old: 'canAddContractor', new: 'create' },
      { old: 'canEditContractor', new: 'edit' },
      { old: 'canToggleContractorStatus', new: 'toggle_status' },
      { old: 'canArchiveContractor', new: 'archive' },
      { old: 'canRestoreContractor', new: 'restore' },
      { old: 'canDeleteContractor', new: 'delete' }
    ]
  },
  {
    name: 'Supervisions.tsx',
    pageName: 'supervisions',
    functions: [
      { old: 'canAddSupervision', new: 'create' },
      { old: 'canEditSupervision', new: 'edit' },
      { old: 'canToggleSupervisionStatus', new: 'toggle_status' },
      { old: 'canArchiveSupervision', new: 'archive' },
      { old: 'canRestoreSupervision', new: 'restore' },
      { old: 'canDeleteSupervision', new: 'delete' }
    ]
  }
];

console.log('🔧 Начинаю автоматическую замену хардкодных функций...\n');

files.forEach(fileConfig => {
  const filePath = path.join(pagesDir, fileConfig.name);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Файл ${fileConfig.name} не найден`);
    return;
  }

  console.log(`📄 Обрабатываю ${fileConfig.name}...`);

  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  // 1. Добавляем импорт useButtonAccess если его нет
  if (!content.includes("import { useButtonAccess }")) {
    const authStoreImport = content.match(/import .+ from '\.\.\/stores\/authStore'/);
    if (authStoreImport) {
      const insertPos = content.indexOf(authStoreImport[0]) + authStoreImport[0].length;
      content = content.slice(0, insertPos) +
                "\nimport { useButtonAccess } from '../hooks/useButtonAccess'" +
                content.slice(insertPos);
      console.log(`  ✅ Добавлен импорт useButtonAccess`);
    }
  }

  // 2. Добавляем хук в компонент
  const componentMatch = content.match(/const (Contractors|Supervisions) = \(\) => \{[\s\S]*?const \{ user \} = useAuthStore\(\)/);
  if (componentMatch && !content.includes(`const { canUseButton } = useButtonAccess('${fileConfig.pageName}')`)) {
    const userLine = componentMatch[0];
    const insertPos = content.indexOf(userLine) + userLine.length;
    content = content.slice(0, insertPos) +
              `\n  const { canUseButton } = useButtonAccess('${fileConfig.pageName}')` +
              content.slice(insertPos);
    console.log(`  ✅ Добавлен хук useButtonAccess('${fileConfig.pageName}')`);
  }

  // 3. Заменяем каждую функцию
  fileConfig.functions.forEach(func => {
    // Паттерн для поиска хардкодной функции
    const functionPattern = new RegExp(
      `const ${func.old} = \\(\\) => \\{[\\s\\S]*?const allowedRoles = \\[[\\s\\S]*?\\][\\s\\S]*?return allowedRoles\\.includes\\(user\\.role\\)[\\s\\S]*?\\}`,
      'g'
    );

    if (functionPattern.test(content)) {
      content = content.replace(functionPattern,
        `const ${func.old} = () => {
    // SUPERADMIN всегда имеет доступ
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('${func.new}')
  }`
      );
      console.log(`  ✅ Заменена функция ${func.old} -> canUseButton('${func.new}')`);
    }
  });

  // Сохраняем файл если были изменения
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  💾 Файл сохранен\n`);
  } else {
    console.log(`  ℹ️  Изменений не требуется\n`);
  }
});

console.log('✅ Автоматическая замена завершена!');
