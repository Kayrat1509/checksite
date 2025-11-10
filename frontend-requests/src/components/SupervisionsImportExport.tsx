/**
 * Компонент для импорта/экспорта надзоров (Технадзор и Авторский надзор) через Excel.
 *
 * Функционал:
 * - 3 варианта работы:
 *   1. Массовое добавление: Template → Fill → Import (create mode)
 *   2. Обновление данных: Export → Edit → Import (update mode)
 *   3. Backup: Export с timestamp для архивных целей
 *
 * Особенности:
 * - Генерация постоянных паролей (не временных)
 * - Dropdown для ролей (SUPERVISOR, OBSERVER) и проектов в Excel
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

// Интерфейс статистики импорта
interface ImportStatsV2 {
  total_rows: number
  new_records: number
  updated_records: number
  skipped_records: number
  errors: number
  projects_assigned: number
  emails_sent: number
}

const SupervisionsImportExport: React.FC = () => {
  const queryClient = useQueryClient()

  // State
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [importStats, setImportStats] = useState<ImportStatsV2 | null>(null)
  const [isStatsModalVisible, setIsStatsModalVisible] = useState(false)
  const [importMode, setImportMode] = useState<'create' | 'update'>('create')

  // ===== МУТАЦИИ =====

  // Скачать шаблон
  const downloadTemplateMutation = useMutation({
    mutationFn: usersAPI.exportSupervisionsTemplateV2,
    onSuccess: (data) => {
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'supervisions_import_template_v2.xlsx')
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

  // Экспорт надзоров
  const exportSupervisionsMutation = useMutation({
    mutationFn: usersAPI.exportSupervisionsV2,
    onSuccess: (data) => {
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url

      const currentDate = new Date().toISOString().split('T')[0]
      link.setAttribute('download', `supervisions_export_v2_${currentDate}.xlsx`)

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

  // Backup
  const exportBackupMutation = useMutation({
    mutationFn: usersAPI.exportSupervisionsBackup,
    onSuccess: (data) => {
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')
      const dateStr = timestamp[0]
      const timeStr = timestamp[1].split('-').slice(0, 3).join('')
      link.setAttribute('download', `supervisions_backup_${dateStr}_${timeStr}.xlsx`)

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

  // Импорт надзоров
  const importMutation = useMutation({
    mutationFn: ({ file, mode }: { file: File; mode: 'create' | 'update' }) =>
      usersAPI.importSupervisionsV2(file, mode),
    onSuccess: (data) => {
      setImportStats(data.stats)
      setIsStatsModalVisible(true)
      setFileList([])
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: any) => {
      const errorDetails = error?.response?.data?.details

      if (errorDetails && errorDetails.errors) {
        Modal.error({
          title: 'Ошибки импорта',
          width: 600,
          content: (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {errorDetails.errors.map((err: any, index: number) => (
                <div key={index} style={{ marginBottom: '10px' }}>
                  <strong>Строка {err.row}:</strong>
                  <ul>
                    {err.errors.map((msg: string, idx: number) => (
                      <li key={idx}>{msg}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )
        })
      } else {
        message.error(
          error?.response?.data?.error || 'Ошибка при импорте данных'
        )
      }
    }
  })

  // ===== ОБРАБОТЧИКИ =====

  const handleDownloadTemplate = () => {
    downloadTemplateMutation.mutate()
  }

  const handleExportSupervisions = () => {
    exportSupervisionsMutation.mutate()
  }

  const handleExportBackup = () => {
    exportBackupMutation.mutate()
  }

  const handleImport = (mode: 'create' | 'update') => {
    if (fileList.length === 0) {
      message.warning('Пожалуйста, выберите файл для импорта')
      return
    }

    const file = fileList[0].originFileObj as File
    setImportMode(mode)
    importMutation.mutate({ file, mode })
  }

  const handleFileChange = (info: any) => {
    let newFileList = [...info.fileList]
    newFileList = newFileList.slice(-1)
    setFileList(newFileList)
  }

  const handleCloseStatsModal = () => {
    setIsStatsModalVisible(false)
    setImportStats(null)
  }

  const showHelpModal = () => {
    Modal.info({
      title: 'Справка по импорту/экспорту надзоров',
      width: 700,
      content: (
        <div>
          <h3>📋 Варианты работы:</h3>

          <h4>1️⃣ Массовое добавление новых надзоров</h4>
          <ol>
            <li>Нажмите "Скачать шаблон"</li>
            <li>Заполните данные в Excel (Email, ФИО, Роль обязательны)</li>
            <li>Выберите файл и нажмите "Импорт → Массовое добавление"</li>
            <li>
              Система создаст надзоры с постоянными паролями и отправит
              учётные данные на электронную почту
            </li>
          </ol>

          <h4>2️⃣ Обновление данных существующих надзоров</h4>
          <ol>
            <li>Нажмите "Экспорт → Экспорт текущих данных"</li>
            <li>Отредактируйте данные в скачанном файле</li>
            <li>Выберите файл и нажмите "Импорт → Обновление данных"</li>
            <li>
              Система обновит информацию по существующим надзорам (пароли
              не изменяются)
            </li>
          </ol>

          <h4>3️⃣ Создание резервной копии</h4>
          <ol>
            <li>Нажмите "Экспорт → Резервная копия (с временной меткой)"</li>
            <li>
              Скачается полный архив со всеми данными и временной меткой в имени файла
            </li>
          </ol>

          <h3>📝 Роли надзоров:</h3>
          <ul>
            <li><strong>Технадзор (SUPERVISOR)</strong> — технический надзор</li>
            <li><strong>Авторский надзор (OBSERVER)</strong> — авторский надзор</li>
          </ul>

          <h3>⚠️ Важно:</h3>
          <ul>
            <li>
              <strong>Email должен быть уникальным</strong> в системе
            </li>
            <li>
              <strong>Пароли генерируются автоматически</strong> (12 символов,
              безопасные)
            </li>
            <li>
              <strong>Учётные данные отправляются на email</strong> асинхронно
            </li>
            <li>
              <strong>Проекты можно указать через запятую</strong> из выпадающего
              списка
            </li>
            <li>
              <strong>При обновлении email не меняется</strong> (используется
              как ключ)
            </li>
          </ul>
        </div>
      )
    })
  }

  // Меню для кнопки "Экспорт"
  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'export',
      label: 'Экспорт текущих данных',
      icon: <ExportOutlined />,
      onClick: handleExportSupervisions
    },
    {
      key: 'backup',
      label: 'Резервная копия (с временной меткой)',
      icon: <SaveOutlined />,
      onClick: handleExportBackup
    }
  ]

  // Меню для кнопки "Импорт"
  const importMenuItems: MenuProps['items'] = [
    {
      key: 'create',
      label: 'Массовое добавление',
      onClick: () => handleImport('create')
    },
    {
      key: 'update',
      label: 'Обновление данных',
      onClick: () => handleImport('update')
    }
  ]

  return (
    <Space size="middle">
      {/* Справка */}
      <Button
        icon={<InfoCircleOutlined />}
        onClick={showHelpModal}
        title="Справка по работе с импортом/экспортом"
      >
        Справка
      </Button>

      {/* Скачать шаблон */}
      <Button
        icon={<DownloadOutlined />}
        onClick={handleDownloadTemplate}
        loading={downloadTemplateMutation.isPending}
      >
        Скачать шаблон
      </Button>

      {/* Экспорт (с dropdown) */}
      <Dropdown menu={{ items: exportMenuItems }} placement="bottomLeft">
        <Button
          icon={<ExportOutlined />}
          loading={
            exportSupervisionsMutation.isPending || exportBackupMutation.isPending
          }
        >
          Экспорт
        </Button>
      </Dropdown>

      {/* Upload файла */}
      <Upload
        fileList={fileList}
        onChange={handleFileChange}
        beforeUpload={() => false}
        accept=".xlsx,.xls"
        maxCount={1}
      >
        <Button icon={<UploadOutlined />}>Выбрать файл</Button>
      </Upload>

      {/* Импорт (с dropdown) */}
      <Dropdown menu={{ items: importMenuItems }} placement="bottomLeft">
        <Button
          type="primary"
          icon={<UploadOutlined />}
          loading={importMutation.isPending}
          disabled={fileList.length === 0}
        >
          Импорт
        </Button>
      </Dropdown>

      {/* Модалка с статистикой импорта */}
      <Modal
        title={`Результаты импорта (режим: ${importMode === 'create' ? 'Массовое добавление' : 'Обновление данных'})`}
        open={isStatsModalVisible}
        onOk={handleCloseStatsModal}
        onCancel={handleCloseStatsModal}
        cancelText="Закрыть"
        okText="ОК"
        width={600}
      >
        {importStats && (
          <div>
            <h3>📊 Статистика:</h3>
            <ul style={{ fontSize: '16px', lineHeight: '2' }}>
              <li>
                <strong>Всего строк обработано:</strong> {importStats.total_rows}
              </li>
              <li style={{ color: '#52c41a' }}>
                <strong>Новых записей создано:</strong>{' '}
                {importStats.new_records}
              </li>
              <li style={{ color: '#1890ff' }}>
                <strong>Записей обновлено:</strong>{' '}
                {importStats.updated_records}
              </li>
              <li style={{ color: '#faad14' }}>
                <strong>Записей пропущено:</strong>{' '}
                {importStats.skipped_records}
              </li>
              <li style={{ color: '#f5222d' }}>
                <strong>Ошибок:</strong> {importStats.errors}
              </li>
              <li style={{ color: '#722ed1' }}>
                <strong>Проектов привязано:</strong>{' '}
                {importStats.projects_assigned}
              </li>
              <li style={{ color: '#13c2c2' }}>
                <strong>Email отправлено:</strong> {importStats.emails_sent}
              </li>
            </ul>

            {importStats.emails_sent > 0 && (
              <div
                style={{
                  marginTop: '20px',
                  padding: '10px',
                  backgroundColor: '#e6f7ff',
                  borderLeft: '4px solid #1890ff',
                  borderRadius: '4px'
                }}
              >
                <strong>ℹ️ Информация:</strong>
                <p style={{ margin: '5px 0 0 0' }}>
                  Данные для входа (логин + постоянный пароль) отправлены на
                  email новым надзорам. Рекомендуется изменить пароль в
                  профиле после первого входа.
                </p>
              </div>
            )}

            {importStats.errors > 0 && (
              <div
                style={{
                  marginTop: '20px',
                  padding: '10px',
                  backgroundColor: '#fff2e8',
                  borderLeft: '4px solid #faad14',
                  borderRadius: '4px'
                }}
              >
                <strong>⚠️ Внимание:</strong>
                <p style={{ margin: '5px 0 0 0' }}>
                  Некоторые записи не были обработаны из-за ошибок. Проверьте
                  логи для получения детальной информации.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Space>
  )
}

export default SupervisionsImportExport
