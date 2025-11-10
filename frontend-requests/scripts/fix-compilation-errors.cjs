const fs = require('fs');
const path = require('path');

/**
 * Скрипт для исправления ошибок компиляции после миграции
 *
 * Задачи:
 * 1. Удалить вызовы удаленных функций can* и has* из условий
 * 2. Заменить условия типа {canDoSomething() && <Button>} на {true && <Button>} или просто <Button>
 * 3. Удалить импорты Button если остались
 */

const pagesDir = path.join(__dirname, '..', 'src', 'pages');

const pageFiles = [
  'Issues.tsx',
  'MaterialRequests.tsx',
  'Supervisions.tsx',
  'Tenders.tsx',
  'Warehouse.tsx',
  'Projects.tsx'
];

console.log('🔧 Начинаю исправление ошибок компиляции...\n');

pageFiles.forEach(fileName => {
  const filePath = path.join(pagesDir, fileName);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Файл ${fileName} не найден`);
    return;
  }

  console.log(`\n📄 Обрабатываю ${fileName}...`);

  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let changesCount = 0;

  // 1. Заменяем условия с вызовами удаленных функций
  // {(canAddPhotoBefore() || canAddPhotoAfter()) && ( -> {(
  const conditionalPatterns = [
    // {canSomething() && (
    /\{(can[A-Z]\w+\(\))\s*&&\s*\(/g,
    // {(canSomething() || canOther()) && (
    /\{\((can[A-Z]\w+\(\)\s*\|\|\s*can[A-Z]\w+\(\))+\)\s*&&\s*\(/g,
    // {hasSomething() && (
    /\{(has[A-Z]\w+\(\))\s*&&\s*\(/g,
  ];

  conditionalPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      content = content.replace(pattern, '{(');
      changesCount++;
    }
  });

  // 2. Заменяем отдельные вызовы в условиях (например, в Col span)
  // canAddPhotoAfter() ? 12 : 24 -> 12
  content = content.replace(/can[A-Z]\w+\(\)\s*\?\s*(\d+)\s*:\s*\d+/g, '$1');
  content = content.replace(/has[A-Z]\w+\(\)\s*\?\s*(\d+)\s*:\s*\d+/g, '$1');

  // 3. Удаляем вызовы в if условиях
  // if (canAddPhotoBefore()) { -> if (true) {
  content = content.replace(/if\s*\(\s*can[A-Z]\w+\(\)\s*\)\s*\{/g, 'if (true) {');
  content = content.replace(/if\s*\(\s*has[A-Z]\w+\(\)\s*\)\s*\{/g, 'if (true) {');

  // 4. Удаляем else if с вызовами
  // else if (canDoSomething()) { -> else if (true) {
  content = content.replace(/else\s+if\s*\(\s*can[A-Z]\w+\(\)\s*\)\s*\{/g, 'else if (true) {');

  // 5. Упрощаем if (true) { ... } else if (true) { -> просто убираем первый if
  // (это опасная операция, пропускаем)

  // 6. Удаляем импорт Button из antd если AccessControlledButton есть
  if (content.includes('import { AccessControlledButton }')) {
    // Удаляем Button из импорта antd
    content = content.replace(/(import\s*\{[^}]*?)\s*,?\s*Button\s*,?\s*([^}]*?\}\s*from\s*['"]antd['"])/g, (match, p1, p2) => {
      // Убираем лишние запятые
      let fixed = p1 + ', ' + p2;
      fixed = fixed.replace(/,\s*,/g, ',');
      fixed = fixed.replace(/{\s*,/g, '{');
      fixed = fixed.replace(/,\s*}/g, '}');
      return fixed;
    });
  }

  // 7. Находим и удаляем оставшиеся строки с вызовами can* функций в комментариях
  content = content.replace(/\/\/.*can[A-Z]\w+\(\).*/g, '');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✅ Файл исправлен (${changesCount} изменений)`);
  } else {
    console.log(`  ℹ️  Исправлений не требуется`);
  }
});

console.log('\n\n✅ Исправление завершено!');
console.log('\n⚠️  Запустите сборку снова: npm run build');
