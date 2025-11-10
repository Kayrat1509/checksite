const fs = require('fs');
const path = require('path');

/**
 * Скрипт для удаления устаревших функций проверки доступа
 *
 * Удаляет функции типа:
 * - const canEditProject = () => { ... }
 * - const hasEditRights = canEditProject()
 * - function canDoSomething() { ... }
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

// Паттерны функций для удаления
const functionPatterns = [
  // Стрелочные функции типа: const canEditProject = () => { ... }
  /const\s+(can[A-Z]\w+|has[A-Z]\w+)\s*=\s*\([^)]*\)\s*=>\s*\{[^}]*\}\s*/g,

  // Многострочные стрелочные функции
  /const\s+(can[A-Z]\w+|has[A-Z]\w+)\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\n\s*\}\s*/g,

  // Обычные функции: function canDoSomething() { ... }
  /function\s+(can[A-Z]\w+|has[A-Z]\w+)\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}\s*/g,

  // Однострочные стрелочные функции
  /const\s+(can[A-Z]\w+|has[A-Z]\w+)\s*=\s*\([^)]*\)\s*=>\s*[^;\n]+[;\n]/g,
];

// Паттерны использования для удаления
const usagePatterns = [
  // const hasEditRights = canEditProject()
  /const\s+(has[A-Z]\w*Rights?|can[A-Z]\w*)\s*=\s*(can[A-Z]\w+|has[A-Z]\w+)\([^)]*\)\s*[;\n]/g,

  // let hasEditRights = canEditProject()
  /let\s+(has[A-Z]\w*Rights?|can[A-Z]\w*)\s*=\s*(can[A-Z]\w+|has[A-Z]\w+)\([^)]*\)\s*[;\n]/g,
];

console.log('🧹 Начинаю удаление устаревших функций проверки доступа...\n');

let totalFunctionsRemoved = 0;
let totalUsagesRemoved = 0;
let filesModified = 0;

pageFiles.forEach(fileName => {
  const filePath = path.join(pagesDir, fileName);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Файл ${fileName} не найден`);
    return;
  }

  console.log(`\n📄 Обрабатываю ${fileName}...`);

  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  let functionsRemoved = 0;
  let usagesRemoved = 0;

  // Удаляем определения функций
  functionPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Извлекаем имя функции для логирования
        const nameMatch = match.match(/(?:const|function)\s+(\w+)/);
        if (nameMatch) {
          console.log(`  ❌ Удаляю функцию: ${nameMatch[1]}()`);
          functionsRemoved++;
          totalFunctionsRemoved++;
        }
      });
      content = content.replace(pattern, '');
    }
  });

  // Удаляем использования функций
  usagePatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const nameMatch = match.match(/const|let\s+(\w+)/);
        if (nameMatch) {
          console.log(`  ❌ Удаляю использование: ${nameMatch[1]}`);
          usagesRemoved++;
          totalUsagesRemoved++;
        }
      });
      content = content.replace(pattern, '');
    }
  });

  // Удаляем пустые строки (больше 2 подряд)
  content = content.replace(/\n{3,}/g, '\n\n');

  // Сохраняем файл, если были изменения
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    filesModified++;

    if (functionsRemoved > 0 || usagesRemoved > 0) {
      console.log(`  ✅ Удалено: ${functionsRemoved} функций, ${usagesRemoved} использований`);
      console.log(`  💾 Файл сохранен`);
    }
  } else {
    console.log(`  ℹ️  Устаревших функций не найдено`);
  }
});

console.log('\n\n✨ Очистка завершена!');
console.log(`\n📊 Общая статистика:`);
console.log(`   ❌ Удалено функций: ${totalFunctionsRemoved}`);
console.log(`   ❌ Удалено использований: ${totalUsagesRemoved}`);
console.log(`   📁 Изменено файлов: ${filesModified}`);
console.log(`\n✅ Все устаревшие функции проверки доступа удалены`);
console.log(`\n⚠️  Рекомендация: проверьте, что приложение компилируется без ошибок`);
