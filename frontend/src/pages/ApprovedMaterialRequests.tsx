import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, message, Card, Typography, Tooltip } from 'antd';
import { ArrowLeftOutlined, CheckOutlined, SendOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { materialRequestsAPI, MaterialRequest } from '../api/materialRequests';
import { projectsAPI } from '../api/projects';
import { useAuthStore } from '../stores/authStore';
import { useButtonAccess } from '../hooks/useButtonAccess';
import { useQueryClient } from '@tanstack/react-query';

const { Title } = Typography;

// Интерфейс для проекта (обновлено)
interface Project {
  id: number;
  name: string;
}

// Маппинг статусов на цвета
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    APPROVED: 'green',                           // Зелёный - Согласовано
    SENT_TO_SITE: 'cyan',                        // Голубой - Отправить на объект
    WAREHOUSE_SHIPPING: 'geekblue',              // Темно-синий - Отправлено на объект
    PAYMENT: 'gold',                             // Золотой - На оплате
    PAID: 'lime',                                // Салатовый - Оплачено
    DELIVERY: 'magenta',                         // Пурпурный - Доставлено
  };
  return colors[status] || 'default';
};

const ApprovedMaterialRequests = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canUseButton } = useButtonAccess('material-requests');

  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Загрузка данных
  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchRequests();
    }
  }, [selectedProjectId]);

  const fetchRequests = async () => {
    if (!selectedProjectId) return;

    setLoading(true);
    try {
      const data = await materialRequestsAPI.getMaterialRequests({ project: selectedProjectId });
      if (Array.isArray(data)) {
        setRequests(data);
      } else if (data && typeof data === 'object' && Array.isArray(data.results)) {
        setRequests(data.results);
      } else {
        setRequests([]);
      }
    } catch (error) {
      message.error('Ошибка загрузки заявок');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await projectsAPI.getProjects();
      // ✅ БЕЗОПАСНО: Логируем только тип и количество (только в dev режиме)
      if (import.meta.env.DEV) {
        console.log('[ApprovedMaterialRequests] Projects loaded:', {
          type: Array.isArray(data) ? 'array' : 'paginated',
          count: Array.isArray(data) ? data.length : data?.results?.length || 0
        });
      }

      // Убеждаемся, что data - это массив для проектов
      let projectsList: Project[] = [];
      if (Array.isArray(data)) {
        projectsList = data;
      } else if (data && typeof data === 'object' && Array.isArray(data.results)) {
        projectsList = data.results;
      } else {
        projectsList = [];
        // ✅ БЕЗОПАСНО: Логируем только тип данных без содержимого
        if (import.meta.env.DEV) {
          console.warn('[ApprovedMaterialRequests] Unexpected data format:', typeof data);
        }
      }

      setProjects(projectsList);

      // Автоматически выбираем первый проект
      if (projectsList.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectsList[0].id);
      }
    } catch (error) {
      message.error('Ошибка загрузки объектов');
      // ✅ БЕЗОПАСНО: Логируем только сообщение ошибки, не весь объект
      if (import.meta.env.DEV) {
        console.error('[ApprovedMaterialRequests] Error:', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  };

  // Изменение статуса позиции
  const handleChangeItemStatus = async (
    item: any,
    newStatus: string,
    comment: string,
    loadingMessage: string,
    successMessage: string
  ) => {
    try {
      message.loading({ content: loadingMessage, key: 'status-change' });

      await materialRequestsAPI.changeItemStatus(item.id, {
        new_status: newStatus,
        comment: comment,
      });

      message.success({ content: successMessage, key: 'status-change' });

      // Обновляем список
      fetchRequests();
      queryClient.invalidateQueries({ queryKey: ['warehouse-items'] });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || 'Ошибка при изменении статуса';
      message.error({ content: errorMessage, key: 'status-change' });
      console.error('Item status change error:', error);
    }
  };

  // Интерфейс для отображения материала в плоской таблице
  interface FlatMaterialRow {
    key: string;
    request: MaterialRequest;
    material: any;
    materialIndex: number;
    isFirstRowOfRequest: boolean;
  }

  // Преобразуем данные в плоскую структуру - только согласованные позиции
  const flattenData = (): FlatMaterialRow[] => {
    const flatData: FlatMaterialRow[] = [];
    const approvedStatuses = ['APPROVED', 'SENT_TO_SITE', 'WAREHOUSE_SHIPPING', 'PAYMENT', 'PAID', 'DELIVERY'];

    requests.forEach((request) => {
      if (request.items && request.items.length > 0) {
        // Фильтруем только согласованные позиции (но не отработанные)
        const approvedItems = request.items.filter(
          item => approvedStatuses.includes(item.item_status || '') && item.item_status !== 'COMPLETED'
        );

        approvedItems.forEach((item, index) => {
          flatData.push({
            key: `${request.id}-${item.id}`,
            request: request,
            material: item,
            materialIndex: index + 1,
            isFirstRowOfRequest: index === 0,
          });
        });
      }
    });

    return flatData;
  };

  // Проверка доступа к кнопкам workflow снабженца
  const canUseSupplyWorkflow = () => {
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true;
    }
    return canUseButton('supply_workflow');
  };

  const canUseWarehouseWorkflow = () => {
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true;
    }
    return canUseButton('warehouse_workflow');
  };

  // Колонки таблицы
  const columns = [
    {
      title: 'Дата',
      key: 'created_at',
      width: 110,
      fixed: 'left' as const,
      render: (record: FlatMaterialRow) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {new Date(record.request.created_at).toLocaleDateString('ru-RU')}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            ({record.request.request_number})
          </div>
        </div>
      ),
    },
    {
      title: 'Номер (п/п)',
      key: 'material_index',
      width: 80,
      align: 'center' as const,
      render: (record: FlatMaterialRow) => record.materialIndex || '-',
    },
    {
      title: 'Материал',
      key: 'material_name',
      width: 300,
      render: (record: FlatMaterialRow) => {
        if (!record.material) return '-';
        const material = record.material;
        const isCancelled = material.status === 'CANCELLED';

        if (isCancelled) {
          return (
            <div>
              <div style={{ textDecoration: 'line-through', color: '#999' }}>
                {material.material_name}
              </div>
            </div>
          );
        }

        return (
          <div>
            <div style={{ fontWeight: 500 }}>{material.material_name}</div>
            {material.item_status && material.item_status !== 'DRAFT' && (
              <Tag color={getStatusColor(material.item_status)} style={{ marginTop: 4 }}>
                {material.item_status_display}
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Кол-во',
      key: 'quantity',
      width: 100,
      align: 'center' as const,
      render: (record: FlatMaterialRow) => {
        if (!record.material) return '-';
        return `${record.material.quantity} ${record.material.unit}`;
      },
    },
    {
      title: 'Автор',
      key: 'author',
      width: 150,
      render: (record: FlatMaterialRow) => record.request.author_data?.full_name || '-',
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 250,
      fixed: 'right' as const,
      render: (record: FlatMaterialRow) => {
        if (!record.material) return null;

        const itemStatus = record.material.item_status;
        const isCancelled = record.material.status === 'CANCELLED';

        if (isCancelled) return null;

        return (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {/* APPROVED → Снабженец выбирает: оплата или выдача со склада */}
            {itemStatus === 'APPROVED' && canUseSupplyWorkflow() && (
              <>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  size="small"
                  onClick={() => handleChangeItemStatus(
                    record.material,
                    'PAYMENT',
                    'Отправлено на оплату',
                    'Отправка на оплату...',
                    'Позиция отправлена на оплату'
                  )}
                  block
                >
                  На оплату
                </Button>
                <Button
                  icon={<SendOutlined />}
                  size="small"
                  onClick={() => handleChangeItemStatus(
                    record.material,
                    'SENT_TO_SITE',
                    'Отправлено на объект',
                    'Отправка на объект...',
                    'Материал отправлен на объект'
                  )}
                  block
                >
                  Отправить на объект
                </Button>
              </>
            )}

            {/* PAYMENT → Снабженец подтверждает оплату */}
            {itemStatus === 'PAYMENT' && canUseSupplyWorkflow() && (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                size="small"
                onClick={() => handleChangeItemStatus(
                  record.material,
                  'PAID',
                  'Оплачено снабженцем',
                  'Подтверждение оплаты...',
                  'Оплата подтверждена'
                )}
                block
              >
                Оплачено
              </Button>
            )}

            {/* PAID → Снабженец подтверждает доставку */}
            {itemStatus === 'PAID' && canUseSupplyWorkflow() && (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                size="small"
                onClick={() => handleChangeItemStatus(
                  record.material,
                  'DELIVERY',
                  'Доставлено на объект',
                  'Подтверждение доставки...',
                  'Доставка подтверждена'
                )}
                block
              >
                Доставлено
              </Button>
            )}

            {/* SENT_TO_SITE → Завсклад отправляет на объект */}
            {itemStatus === 'SENT_TO_SITE' && canUseWarehouseWorkflow() && (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                size="small"
                onClick={() => handleChangeItemStatus(
                  record.material,
                  'WAREHOUSE_SHIPPING',
                  'Материалы отправлены со склада',
                  'Подтверждение отправки...',
                  'Отправка подтверждена'
                )}
                block
              >
                Отправлено со склада
              </Button>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Последнее действие',
      key: 'updated_at',
      width: 150,
      render: (record: FlatMaterialRow) =>
        new Date(record.request.updated_at).toLocaleString('ru-RU'),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title level={2}>Согласованные заявки</Title>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/dashboard/material-requests')}
          >
            Назад к заявкам
          </Button>
        </div>

        {/* Фильтр по объектам */}
        <Card>
          <Space align="center">
            <span style={{ fontWeight: 500 }}>Объект:</span>
            <select
              style={{ width: 400, padding: '8px', borderRadius: '4px', border: '1px solid #d9d9d9' }}
              value={selectedProjectId || ''}
              onChange={(e) => setSelectedProjectId(Number(e.target.value))}
            >
              <option value="">Выберите объект</option>
              {Array.isArray(projects) && projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {selectedProjectId && (
              <span style={{ color: '#666' }}>
                (Только согласованные позиции)
              </span>
            )}
          </Space>
        </Card>

        {!selectedProjectId && projects.length > 0 && (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <Title level={4}>Выберите объект для просмотра согласованных заявок</Title>
            </div>
          </Card>
        )}

        {selectedProjectId && (
          <Card>
            <style>
              {`
                .request-separator {
                  border-top: 3px solid #52c41a !important;
                  background-color: #f6ffed;
                }
                .request-separator:hover {
                  background-color: #d9f7be !important;
                }
              `}
            </style>
            <Table
              columns={columns}
              dataSource={flattenData()}
              loading={loading}
              rowKey="key"
              scroll={{ x: 1400 }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total: number) => `Всего согласованных позиций: ${total}`,
              }}
              size="small"
              bordered
              rowClassName={(record: FlatMaterialRow) =>
                record.isFirstRowOfRequest ? 'request-separator' : ''
              }
              locale={{
                emptyText: 'Нет согласованных позиций'
              }}
            />
          </Card>
        )}
      </Space>
    </div>
  );
};

export default ApprovedMaterialRequests;
