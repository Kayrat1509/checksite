/**
 * Скрипт для автоматической миграции кнопок на использование AccessControlledButton.
 *
 * Заменяет обычные <Button> на <AccessControlledButton> с правильными page и buttonKey.
 *
 * Использование:
 * node scripts/migrate-buttons.js
 */

const fs = require('fs');
const path = require('path');

// Mapping страниц и их кнопок
const BUTTON_MAPPINGS = {
  'Projects.tsx': {
    page: 'projects',
    buttons: [
      { pattern: /Создать проект|PlusOutlined.*onClick.*setIsModalVisible/, key: 'create' },
      { pattern: /Редактировать|EditOutlined.*onClick.*handleEdit/, key: 'edit' },
      { pattern: /Удалить|DeleteOutlined.*onConfirm.*handleDelete/, key: 'delete' },
      { pattern: /Экспорт Excel|DownloadOutlined.*onClick.*exportToExcel/, key: 'export_excel' },
      { pattern: /Импорт Excel|UploadOutlined.*onClick.*importExcel/, key: 'import_excel' },
      { pattern: /Просмотр|EyeOutlined.*onClick.*showDetails/, key: 'view_details' },
    ]
  },
  'Issues.tsx': {
    page: 'issues',
    buttons: [
      { pattern: /Создать замечание|PlusOutlined/, key: 'create' },
      { pattern: /Редактировать|EditOutlined/, key: 'edit' },
      { pattern: /Удалить|DeleteOutlined/, key: 'delete' },
      { pattern: /Изменить статус|CheckOutlined/, key: 'change_status' },
      { pattern: /Назначить|UserOutlined/, key: 'assign' },
      { pattern: /Загрузить фото|CameraOutlined/, key: 'upload_photo' },
      { pattern: /Комментарий|CommentOutlined/, key: 'add_comment' },
      { pattern: /Просмотр|EyeOutlined/, key: 'view_details' },
    ]
  },
  'Users.tsx': {
    page: 'users',
    buttons: [
      { pattern: /Добавить сотрудника|PlusOutlined/, key: 'create' },
      { pattern: /Редактировать|EditOutlined/, key: 'edit' },
      { pattern: /Удалить|DeleteOutlined/, key: 'delete' },
      { pattern: /Сбросить пароль|KeyOutlined/, key: 'reset_password' },
      { pattern: /Экспорт Excel|DownloadOutlined/, key: 'export_excel' },
      { pattern: /Импорт Excel|UploadOutlined/, key: 'import_excel' },
      { pattern: /Просмотр|EyeOutlined/, key: 'view_details' },
    ]
  },
  'Contractors.tsx': {
    page: 'contractors',
    buttons: [
      { pattern: /Добавить подрядчика|PlusOutlined/, key: 'create' },
      { pattern: /Редактировать|EditOutlined/, key: 'edit' },
      { pattern: /Удалить|DeleteOutlined/, key: 'delete' },
      { pattern: /Экспорт Excel|DownloadOutlined/, key: 'export_excel' },
      { pattern: /Импорт Excel|UploadOutlined/, key: 'import_excel' },
      { pattern: /Просмотр|EyeOutlined/, key: 'view_details' },
    ]
  },
  'Supervisions.tsx': {
    page: 'supervisions',
    buttons: [
      { pattern: /Добавить надзор|PlusOutlined/, key: 'create' },
      { pattern: /Редактировать|EditOutlined/, key: 'edit' },
      { pattern: /Удалить|DeleteOutlined/, key: 'delete' },
      { pattern: /Экспорт Excel|DownloadOutlined/, key: 'export_excel' },
      { pattern: /Импорт Excel|UploadOutlined/, key: 'import_excel' },
      { pattern: /Просмотр|EyeOutlined/, key: 'view_details' },
    ]
  },
  'MaterialRequests.tsx': {
    page: 'material-requests',
    buttons: [
      { pattern: /Создать заявку|PlusOutlined/, key: 'create' },
      { pattern: /Редактировать|EditOutlined/, key: 'edit' },
      { pattern: /Удалить|DeleteOutlined/, key: 'delete' },
      { pattern: /Согласовать|CheckOutlined/, key: 'approve' },
      { pattern: /Отклонить|CloseOutlined/, key: 'reject' },
      { pattern: /Просмотр|EyeOutlined/, key: 'view_details' },
    ]
  },
  'Tenders.tsx': {
    page: 'tenders',
    buttons: [
      { pattern: /Создать тендер|PlusOutlined/, key: 'create' },
      { pattern: /Редактировать|EditOutlined/, key: 'edit' },
      { pattern: /Удалить|DeleteOutlined/, key: 'delete' },
      { pattern: /Подать заявку|SendOutlined/, key: 'submit_bid' },
      { pattern: /Просмотр|EyeOutlined/, key: 'view_details' },
    ]
  },
  'Warehouse.tsx': {
    page: 'warehouse',
    buttons: [
      { pattern: /Добавить товар|PlusOutlined/, key: 'create_item' },
      { pattern: /Редактировать|EditOutlined/, key: 'edit_item' },
      { pattern: /Удалить|DeleteOutlined/, key: 'delete_item' },
      { pattern: /Перемещение|SwapOutlined/, key: 'move_items' },
      { pattern: /Списание|MinusCircleOutlined/, key: 'write_off' },
      { pattern: /Просмотр|EyeOutlined/, key: 'view_details' },
    ]
  },
  'Reports.tsx': {
    page: 'reports',
    buttons: [
      { pattern: /Сгенерировать|FileAddOutlined/, key: 'generate' },
      { pattern: /Экспорт PDF|FilePdfOutlined/, key: 'export_pdf' },
      { pattern: /Экспорт Excel|FileExcelOutlined/, key: 'export_excel' },
      { pattern: /Просмотр|EyeOutlined/, key: 'view_details' },
    ]
  },
};

console.log('📦 Скрипт миграции кнопок на AccessControlledButton');
console.log('='.repeat(60));
console.log('\nЭтот скрипт НЕ выполняет автоматическую замену.');
console.log('Он создает резервные копии и план миграции.\n');

const pagesDir = path.join(__dirname, '../src/pages');

// Создаем директорию для бэкапов
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

console.log('📋 План миграции:\n');

Object.keys(BUTTON_MAPPINGS).forEach((fileName) => {
  const filePath = path.join(pagesDir, fileName);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${fileName} - файл не найден`);
    return;
  }

  const mapping = BUTTON_MAPPINGS[fileName];
  console.log(`📄 ${fileName} (page: "${mapping.page}")`);
  console.log(`   Кнопок для замены: ${mapping.buttons.length}`);

  mapping.buttons.forEach((btn, index) => {
    console.log(`   ${index + 1}. ${btn.key}`);
  });

  // Создаем бэкап
  const backupPath = path.join(backupDir, `${fileName}.backup`);
  fs.copyFileSync(filePath, backupPath);
  console.log(`   ✅ Бэкап создан: ${backupPath}\n`);
});

console.log('='.repeat(60));
console.log('\n✅ Анализ завершен!');
console.log('\n📝 Следующие шаги:');
console.log('1. Проверьте созданные бэкапы в директории: frontend/backups/');
console.log('2. Вручную замените <Button> на <AccessControlledButton> используя mapping выше');
console.log('3. Добавьте импорт: import { AccessControlledButton } from \'../components/AccessControlledButton\'');
console.log('4. Добавьте props page и buttonKey к каждой кнопке');
console.log('\n💡 Пример замены:');
console.log('   ДО:  <Button type="primary" icon={<PlusOutlined />} onClick={...}>Создать</Button>');
console.log('   ПОСЛЕ: <AccessControlledButton page="projects" buttonKey="create" type="primary" icon={<PlusOutlined />} onClick={...}>Создать</AccessControlledButton>');
console.log('');
