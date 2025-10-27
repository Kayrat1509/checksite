/**
 * Компонент для импорта и экспорта пользователей через Excel
 */
import { useState } from 'react'
import { Button, Upload, message, Modal, Progress, Space, Typography } from 'antd'
import {
  DownloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI } from '../api/users'
import type { UploadFile } from 'antd/es/upload/interface'

const { Text } = Typography

interface ImportStats {
  total_rows: number
  new_records: number
  updated_records: number
  skipped_records: number
  errors: number
}

export const UserImportExport = () => {
  const queryClient = useQueryClient()
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [importStats, setImportStats] = useState<ImportStats | null>(null)
  const [fileList, setFileList] = useState<UploadFile[]>([])

  // Мутация для импорта
  const importMutation = useMutation({
    mutationFn: (file: File) => usersAPI.importUsers(file),
    onSuccess: (data) => {
      message.success('Импорт завершен успешно!')
      setImportStats(data.stats)
      setUploadProgress(100)

      // Обновляем список пользователей
      queryClient.invalidateQueries({ queryKey: ['users'] })

      // Показываем результаты на 5 секунд, затем закрываем модалку
      setTimeout(() => {
        setIsImportModalOpen(false)
        setImportStats(null)
        setUploadProgress(0)
        setFileList([])
      }, 5000)
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Ошибка при импорте файла'
      const details = error?.response?.data?.details

      if (details && Array.isArray(details)) {
        // Показываем детали ошибок валидации
        Modal.error({
          title: 'Ошибки импорта',
          content: (
            <div>
              <p>{errorMessage}</p>
              <div style={{ maxHeight: '300px', overflow: 'auto', marginTop: '16px' }}>
                {details.map((err: any, idx: number) => (
                  <div key={idx} style={{ marginBottom: '8px' }}>
                    <Text strong>Строка {err.row}:</Text>
                    <ul style={{ margin: 0 }}>
                      {err.errors.map((e: string, i: number) => (
                        <li key={i}><Text type="danger">{e}</Text></li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ),
          width: 600
        })
      } else {
        message.error(errorMessage)
      }

      setUploadProgress(0)
      setFileList([])
    }
  })

  // Скачать шаблон для импорта
  const handleDownloadTemplate = async () => {
    try {
      const blob = await usersAPI.exportTemplate()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'users_import_template.xlsx'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      message.success('Шаблон скачан!')
    } catch (error) {
      message.error('Ошибка при скачивании шаблона')
      console.error(error)
    }
  }

  // Экспортировать всех пользователей
  const handleExportUsers = async () => {
    try {
      const blob = await usersAPI.exportUsers()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `users_export_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      message.success('Данные экспортированы!')
    } catch (error) {
      message.error('Ошибка при экспорте данных')
      console.error(error)
    }
  }

  // Обработка загрузки файла
  const handleUploadFile = async (file: File) => {
    setFileList([{
      uid: '-1',
      name: file.name,
      status: 'uploading',
    }])

    setUploadProgress(30)
    importMutation.mutate(file)
    return false // Предотвращаем автоматическую загрузку
  }

  const handleImportModalClose = () => {
    if (!importMutation.isPending) {
      setIsImportModalOpen(false)
      setImportStats(null)
      setUploadProgress(0)
      setFileList([])
    }
  }

  return (
    <>
      <Space>
        <Button
          icon={<FileExcelOutlined />}
          onClick={handleDownloadTemplate}
        >
          Скачать шаблон
        </Button>

        <Button
          icon={<DownloadOutlined />}
          onClick={handleExportUsers}
        >
          Экспорт
        </Button>

        <Button
          type="primary"
          icon={<UploadOutlined />}
          onClick={() => setIsImportModalOpen(true)}
        >
          Импорт
        </Button>
      </Space>

      <Modal
        title="Импорт пользователей из Excel"
        open={isImportModalOpen}
        onCancel={handleImportModalClose}
        footer={null}
        width={600}
      >
        {!importStats ? (
          <div>
            <p>Загрузите файл Excel с данными пользователей:</p>

            <Upload.Dragger
              name="file"
              multiple={false}
              accept=".xlsx,.xls"
              fileList={fileList}
              beforeUpload={handleUploadFile}
              onRemove={() => setFileList([])}
              disabled={importMutation.isPending}
            >
              <p className="ant-upload-drag-icon">
                <FileExcelOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
              </p>
              <p className="ant-upload-text">
                Нажмите или перетащите файл в эту область
              </p>
              <p className="ant-upload-hint">
                Поддерживаются форматы: .xlsx, .xls
              </p>
            </Upload.Dragger>

            {importMutation.isPending && (
              <div style={{ marginTop: '24px' }}>
                <Progress percent={uploadProgress} status="active" />
                <p style={{ textAlign: 'center', marginTop: '8px' }}>
                  Обработка файла...
                </p>
              </div>
            )}

            <div style={{ marginTop: '24px', padding: '12px', backgroundColor: '#f0f7ff', borderRadius: '4px' }}>
              <Text strong>Инструкция:</Text>
              <ul style={{ marginTop: '8px', marginBottom: 0 }}>
                <li>Скачайте шаблон Excel с примерами</li>
                <li>Заполните данные пользователей</li>
                <li>Загрузите файл для импорта</li>
                <li>Новым пользователям будут отправлены временные пароли на email</li>
              </ul>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <CheckCircleOutlined style={{ fontSize: '64px', color: '#52c41a' }} />
            <h3 style={{ marginTop: '16px' }}>Импорт завершен!</h3>

            <div style={{ marginTop: '24px', textAlign: 'left' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Всего строк:</Text>
                  <Text strong>{importStats.total_rows}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Новых пользователей:</Text>
                  <Text strong style={{ color: '#52c41a' }}>
                    {importStats.new_records}
                  </Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Обновлено:</Text>
                  <Text strong style={{ color: '#1890ff' }}>
                    {importStats.updated_records}
                  </Text>
                </div>
                {importStats.skipped_records > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Пропущено:</Text>
                    <Text strong style={{ color: '#faad14' }}>
                      {importStats.skipped_records}
                    </Text>
                  </div>
                )}
                {importStats.errors > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Ошибок:</Text>
                    <Text strong style={{ color: '#ff4d4f' }}>
                      {importStats.errors}
                    </Text>
                  </div>
                )}
              </Space>
            </div>

            {importStats.new_records > 0 && (
              <div style={{ marginTop: '24px', padding: '12px', backgroundColor: '#f6ffed', borderRadius: '4px' }}>
                <Text type="success">
                  Временные пароли отправлены на email новых пользователей
                </Text>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
