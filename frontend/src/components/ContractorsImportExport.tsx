/**
 * Компонент для импорта/экспорта подрядчиков через Excel (версия 2).
 *
 * Функционал:
 * - 3 варианта работы:
 *   1. Массовое добавление: Template → Fill → Import (create mode)
 *   2. Обновление данных: Export → Edit → Import (update mode)
 *   3. Backup: Export с timestamp для архивных целей
 *
 * Особенности:
 * - Генерация постоянных паролей (не временных)
 * - Dropdown для проектов в Excel
 * - Расширенная статистика импорта
 * - Асинхронная отправка credentials на email
 */

import React, { useState } from 'react'
import { Button, Upload, message, Modal, Space, Dropdown } from 'antd'
import {
  DownloadOutlined,
  UploadOutlined,
  ExportOutlined,
  SaveOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import type { MenuProps, UploadFile } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI } from '../api/users'

// Интерфейс статистики импорта v2
interface ImportStatsV2 {
  total_rows: number
  new_records: number
  updated_records: number
  skipped_records: number
  errors: number
  projects_assigned: number
  emails_sent: number
}

const ContractorsImportExport: React.FC = () => {
  const queryClient = useQueryClient()

  // State для управления компонентом
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [importStats, setImportStats] = useState<ImportStatsV2 | null>(null)
  const [isStatsModalVisible, setIsStatsModalVisible] = useState(false)
  const [importMode, setImportMode] = useState<'create' | 'update'>('create')

  // ===== МУТАЦИИ ДЛЯ РАБОТЫ С EXCEL =====

  // Скачать шаблон v2 для подрядчиков
  const downloadTemplateMutation = useMutation({
    mutationFn: usersAPI.exportContractorsTemplateV2,
    onSuccess: (data) => {
      // Создаем blob и скачиваем файл
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'contractors_import_template_v2.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      message.success('Шаблон успешно скачан')
    },
    onError: () => {
      message.error('Ошибка при скачивании шаблона')
    }
  })

  // Экспорт подрядчиков v2
  const exportContractorsMutation = useMutation({
    mutationFn: usersAPI.exportContractorsV2,
    onSuccess: (data) => {
      // Создаем blob и скачиваем файл
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url

      // Генерируем имя файла с датой
      const currentDate = new Date().toISOString().split('T')[0]
      link.setAttribute('download', `contractors_export_v2_${currentDate}.xlsx`)

      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      message.success('Данные успешно экспортированы')
    },
    onError: () => {
      message.error('Ошибка при экспорте данных')
    }
  })

  // Создание Backup подрядчиков
  const exportBackupMutation = useMutation({
    mutationFn: usersAPI.exportContractorsBackup,
    onSuccess: (data) => {
      // Создаем blob и скачиваем файл
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url

      // Генерируем имя файла с timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      link.setAttribute('download', `contractors_backup_${timestamp}.xlsx`)

      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      message.success('Backup успешно создан')
    },
    onError: () => {
      message.error('Ошибка при создании backup')
    }
  })

  // Импорт подрядчиков v2
  const importContractorsMutation = useMutation({
    mutationFn: ({ file, mode }: { file: File; mode: 'create' | 'update' }) =>
      usersAPI.importContractorsV2(file, mode),
    onSuccess: (data) => {
      // Сохраняем статистику для отображения в модальном окне
      setImportStats(data.stats)
      setIsStatsModalVisible(true)

      // Очищаем список файлов
      setFileList([])

      // Обновляем кеш пользователей (подрядчиков)
      queryClient.invalidateQueries({ queryKey: ['users'] })

      message.success(data.message || 'Импорт завершен успешно')
    },
    onError: (error: any) => {
      console.error('Import error:', error)

      // Показываем детализированные ошибки валидации
      if (error.response?.data?.details?.errors) {
        const errors = error.response.data.details.errors
        Modal.error({
          title: 'Ошибки валидации',
          content: (
            <div>
              <p>Обнаружены ошибки в файле:</p>
              <ul style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {errors.slice(0, 10).map((err: any, idx: number) => (
                  <li key={idx}>
                    <strong>Строка {err.row}:</strong>{' '}
                    {Array.isArray(err.errors) ? err.errors.join(', ') : err.errors}
                  </li>
                ))}
                {errors.length > 10 && <li>... и еще {errors.length - 10} ошибок</li>}
              </ul>
            </div>
          ),
          width: 600
        })
      } else {
        message.error(
          error.response?.data?.error || 'Ошибка при импорте подрядчиков'
        )
      }
    }
  })

  // ===== ОБРАБОТЧИКИ СОБЫТИЙ =====

  // Обработчик выбора файла для импорта
  const handleFileChange = (info: any) => {
    let newFileList = [...info.fileList]

    // Ограничиваем количество файлов до 1
    newFileList = newFileList.slice(-1)

    setFileList(newFileList)
  }

  // Обработчик загрузки файла (кастомный, без автоматической отправки)
  const customRequest = ({ file, onSuccess }: any) => {
    // Сразу помечаем файл как успешно загруженный
    setTimeout(() => {
      onSuccess('ok')
    }, 0)
  }

  // Запуск импорта с выбранным режимом
  const handleImport = (mode: 'create' | 'update') => {
    if (fileList.length === 0) {
      message.warning('Выберите файл для импорта')
      return
    }

    const file = fileList[0].originFileObj as File
    setImportMode(mode)
    importContractorsMutation.mutate({ file, mode })
  }

  // Закрытие модального окна со статистикой
  const handleStatsModalClose = () => {
    setIsStatsModalVisible(false)
    setImportStats(null)
  }

  // ===== МЕНЮ DROPDOWN ДЛЯ ЭКСПОРТА =====
  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'template',
      label: 'Скачать шаблон',
      icon: <DownloadOutlined />,
      onClick: () => downloadTemplateMutation.mutate()
    },
    {
      key: 'export',
      label: 'Экспортировать',
      icon: <ExportOutlined />,
      onClick: () => exportContractorsMutation.mutate()
    },
    {
      key: 'backup',
      label: 'Создать backup',
      icon: <SaveOutlined />,
      onClick: () => exportBackupMutation.mutate()
    },
    {
      type: 'divider'
    },
    {
      key: 'info',
      label: 'Справка',
      icon: <InfoCircleOutlined />,
      onClick: () => {
        Modal.info({
          title: 'Импорт/Экспорт подрядчиков',
          content: (
            <div>
              <h4>Варианты работы:</h4>
              <ol>
                <li>
                  <strong>Массовое добавление:</strong> Скачать шаблон → Заполнить → Импорт
                  (Создать новых)
                </li>
                <li>
                  <strong>Обновление данных:</strong> Экспортировать → Редактировать → Импорт
                  (Обновить существующих)
                </li>
                <li>
                  <strong>Backup:</strong> Создать backup для архивного хранения
                </li>
              </ol>
              <h4>Поля в шаблоне:</h4>
              <ul>
                <li>Email * (обязательное)</li>
                <li>Фамилия * (обязательное)</li>
                <li>Имя * (обязательное)</li>
                <li>Отчество (опциональное)</li>
                <li>Компания подрядчика * (обязательное)</li>
                <li>Телефон (опциональное)</li>
                <li>Объекты (выбор из списка)</li>
              </ul>
              <p>
                <strong>Примечание:</strong> При импорте для новых подрядчиков автоматически
                генерируются постоянные пароли и отправляются на указанный email.
              </p>
            </div>
          ),
          width: 600
        })
      }
    }
  ]

  return (
    <Space size="middle">
      {/* Dropdown меню для экспорта */}
      <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
        <Button
          icon={<DownloadOutlined />}
          loading={
            downloadTemplateMutation.isPending ||
            exportContractorsMutation.isPending ||
            exportBackupMutation.isPending
          }
        >
          Excel
        </Button>
      </Dropdown>

      {/* Кнопка выбора файла */}
      <Upload
        fileList={fileList}
        onChange={handleFileChange}
        customRequest={customRequest}
        accept=".xlsx,.xls"
        maxCount={1}
        showUploadList={false}
      >
        <Button icon={<UploadOutlined />}>Выбрать файл</Button>
      </Upload>

      {/* Кнопка импорта с dropdown (показывается только после выбора файла) */}
      {fileList.length > 0 && (
        <>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'create',
                  label: 'Создать новых',
                  onClick: () => handleImport('create')
                },
                {
                  key: 'update',
                  label: 'Обновить существующих',
                  onClick: () => handleImport('update')
                }
              ]
            }}
            placement="bottomRight"
          >
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={importContractorsMutation.isPending}
            >
              Импорт ({fileList[0].name})
            </Button>
          </Dropdown>

          {/* Кнопка удаления выбранного файла */}
          <Button
            danger
            onClick={() => setFileList([])}
            disabled={importContractorsMutation.isPending}
            title="Удалить выбранный файл"
          >
            Отменить
          </Button>
        </>
      )}

      {/* Модальное окно со статистикой импорта */}
      <Modal
        title="Результаты импорта подрядчиков"
        open={isStatsModalVisible}
        onCancel={handleStatsModalClose}
        footer={[
          <Button key="close" type="primary" onClick={handleStatsModalClose}>
            Закрыть
          </Button>
        ]}
        width={600}
      >
        {importStats && (
          <div>
            <h3>Статистика:</h3>
            <ul style={{ fontSize: '14px', lineHeight: '1.8' }}>
              <li>
                <strong>Всего строк:</strong> {importStats.total_rows}
              </li>
              {importMode === 'create' && (
                <li>
                  <strong>Создано новых:</strong> {importStats.new_records}
                </li>
              )}
              {importMode === 'update' && (
                <li>
                  <strong>Обновлено:</strong> {importStats.updated_records}
                </li>
              )}
              <li>
                <strong>Пропущено:</strong> {importStats.skipped_records}
              </li>
              <li>
                <strong>Ошибок:</strong> {importStats.errors}
              </li>
              <li>
                <strong>Проектов назначено:</strong> {importStats.projects_assigned}
              </li>
              {importMode === 'create' && (
                <li>
                  <strong>Email отправлено:</strong> {importStats.emails_sent}
                </li>
              )}
            </ul>

            {importStats.new_records > 0 && importMode === 'create' && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: '#f0f9ff',
                  borderLeft: '4px solid #1890ff',
                  borderRadius: '4px'
                }}
              >
                <strong>Важно:</strong> Для новых подрядчиков сгенерированы постоянные пароли
                и отправлены на указанные email адреса.
              </div>
            )}

            {importStats.errors > 0 && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: '#fff2e8',
                  borderLeft: '4px solid #fa8c16',
                  borderRadius: '4px'
                }}
              >
                <strong>Внимание:</strong> Некоторые записи не были импортированы из-за ошибок
                валидации. Проверьте данные и повторите импорт.
              </div>
            )}
          </div>
        )}
      </Modal>
    </Space>
  )
}

export default ContractorsImportExport
