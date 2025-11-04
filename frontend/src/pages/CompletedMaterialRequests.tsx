import { useState, useEffect } from 'react';
import { Table, Tag, message, Card, Typography, Button, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { materialRequestsAPI, MaterialRequest } from '../api/materialRequests';
import { projectsAPI } from '../api/projects';
import { useAuthStore } from '../stores/authStore';

const { Title } = Typography;

// Интерфейс для проекта
interface Project {
  id: number;
  name: string;
}

const CompletedMaterialRequests = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

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
        console.log('[CompletedMaterialRequests] Projects loaded:', {
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
          console.warn('[CompletedMaterialRequests] Unexpected data format:', typeof data);
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
        console.error('[CompletedMaterialRequests] Error:', error instanceof Error ? error.message : 'Unknown error');
      }
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

  // Преобразуем данные в плоскую структуру - только отработанные позиции
  const flattenData = (): FlatMaterialRow[] => {
    const flatData: FlatMaterialRow[] = [];

    requests.forEach((request) => {
      if (request.items && request.items.length > 0) {
        // Фильтруем только отработанные позиции
        const completedItems = request.items.filter(
          item => item.item_status === 'COMPLETED'
        );

        completedItems.forEach((item, index) => {
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

  // Колонки таблицы
  const columns = [
    {
      title: 'Дата создания',
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

        return (
          <div>
            <div style={{ fontWeight: 500 }}>{material.material_name}</div>
            <Tag color="green" style={{ marginTop: 4 }}>
              Отработано
            </Tag>
          </div>
        );
      },
    },
    {
      title: 'Кол-во по заявке',
      key: 'quantity',
      width: 120,
      align: 'center' as const,
      render: (record: FlatMaterialRow) => {
        if (!record.material) return '-';
        return `${record.material.quantity} ${record.material.unit}`;
      },
    },
    {
      title: 'Кол-во по факту',
      key: 'actual_quantity',
      width: 120,
      align: 'center' as const,
      render: (record: FlatMaterialRow) => {
        if (!record.material) return '-';
        if (record.material.actual_quantity) {
          return `${record.material.actual_quantity} ${record.material.unit}`;
        }
        return '-';
      },
    },
    {
      title: 'Автор заявки',
      key: 'author',
      width: 150,
      render: (record: FlatMaterialRow) => record.request.author_data?.full_name || '-',
    },
    {
      title: 'Дата отработки',
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
          <Title level={2}>Отработанные заявки</Title>
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
                (Только отработанные позиции)
              </span>
            )}
          </Space>
        </Card>

        {!selectedProjectId && projects.length > 0 && (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <Title level={4}>Выберите объект для просмотра отработанных заявок</Title>
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
                showTotal: (total: number) => `Всего отработанных позиций: ${total}`,
              }}
              size="small"
              bordered
              rowClassName={(record: FlatMaterialRow) =>
                record.isFirstRowOfRequest ? 'request-separator' : ''
              }
              locale={{
                emptyText: 'Нет отработанных позиций'
              }}
            />
          </Card>
        )}
      </Space>
    </div>
  );
};

export default CompletedMaterialRequests;
