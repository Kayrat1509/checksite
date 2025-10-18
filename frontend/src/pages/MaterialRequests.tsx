import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, Select, InputNumber, message, Card, Typography, Tooltip, Popconfirm } from 'antd';
import { PlusOutlined, DownloadOutlined, EditOutlined, CloseCircleOutlined, SendOutlined, CheckOutlined, RollbackOutlined } from '@ant-design/icons';
import { materialRequestsAPI, MaterialRequest, CreateMaterialRequestData } from '../api/materialRequests';
import { projectsAPI } from '../api/projects';
import { useAuthStore } from '../stores/authStore';

const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

// Интерфейс для проекта
interface Project {
  id: number;
  name: string;
}

// Маппинг статусов на цвета согласно новой схеме согласования
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    DRAFT: 'default',                       // Серый - Черновик
    UNDER_REVIEW: 'blue',                   // Синий - На проверке снабжения
    WAREHOUSE_CHECK: 'cyan',                // Голубой - Центр склад
    BACK_TO_SUPPLY: 'blue',                 // Синий - Снабжение
    PROJECT_MANAGER_APPROVAL: 'geekblue',   // Темно-синий - У руководителя проекта
    DIRECTOR_APPROVAL: 'purple',            // Фиолетовый - У директора
    REWORK: 'orange',                       // Оранжевый - На доработке
    APPROVED: 'green',                      // Зелёный - Согласовано
    SENT_TO_SITE: 'cyan',                   // Голубой - Отправить на объект (у зав.склада)
    WAREHOUSE_SHIPPING: 'geekblue',         // Темно-синий - Отправлено на объект (у автора)
    PAYMENT: 'gold',                        // Золотой - На оплате
    PAID: 'lime',                           // Салатовый - Оплачено
    DELIVERY: 'magenta',                    // Пурпурный - Доставлено
    COMPLETED: 'green',                     // Зелёный - Отработано
  };
  return colors[status] || 'default';
};

const MaterialRequests = () => {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingRequest, setEditingRequest] = useState<MaterialRequest | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // Загрузка данных
  useEffect(() => {
    fetchRequests();
    fetchProjects();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await materialRequestsAPI.getMaterialRequests();
      // Убеждаемся, что data - это массив
      if (Array.isArray(data)) {
        setRequests(data);
      } else if (data && typeof data === 'object' && Array.isArray(data.results)) {
        // DRF pagination возвращает объект с полем results
        setRequests(data.results);
      } else {
        // Если данные не массив и не объект с results, устанавливаем пустой массив
        setRequests([]);
        console.warn('Неожиданный формат данных:', data);
      }
    } catch (error) {
      message.error('Ошибка загрузки заявок');
      console.error(error);
      setRequests([]); // Устанавливаем пустой массив в случае ошибки
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await projectsAPI.getProjects();
      // Убеждаемся, что data - это массив для проектов
      if (Array.isArray(data)) {
        setProjects(data);
      } else if (data && typeof data === 'object' && Array.isArray(data.results)) {
        setProjects(data.results);
      } else {
        setProjects([]);
        console.warn('Неожиданный формат данных проектов:', data);
      }
    } catch (error) {
      console.error('Ошибка загрузки проектов:', error);
      setProjects([]);
    }
  };

  // Создание новой заявки
  const handleCreateRequest = async (values: CreateMaterialRequestData) => {
    try {
      await materialRequestsAPI.createMaterialRequest(values);
      message.success('Заявка создана успешно!');
      setIsModalVisible(false);
      form.resetFields();
      fetchRequests();
    } catch (error) {
      message.error('Ошибка создания заявки');
      console.error(error);
    }
  };

  // Экспорт заявки в Excel
  const handleExportExcel = async (request: MaterialRequest) => {
    try {
      message.loading({ content: 'Формирование Excel файла...', key: 'export' });
      const blob = await materialRequestsAPI.exportExcel(request.id);

      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Заявка_${request.request_number}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success({ content: 'Excel файл успешно скачан!', key: 'export' });
    } catch (error) {
      message.error({ content: 'Ошибка при экспорте заявки', key: 'export' });
      console.error(error);
    }
  };

  // Редактирование заявки
  const handleEditRequest = async (request: MaterialRequest) => {
    try {
      // Загружаем полную информацию о заявке
      const fullRequest = await materialRequestsAPI.getMaterialRequest(request.id);

      setEditingRequest(fullRequest);

      // Предзаполняем форму данными заявки
      editForm.setFieldsValue({
        drawing_reference: fullRequest.drawing_reference,
        work_type: fullRequest.work_type,
        notes: fullRequest.notes,
      });

      setIsEditModalVisible(true);
    } catch (error) {
      message.error('Ошибка при загрузке данных заявки');
      console.error(error);
    }
  };

  // Обновление заявки
  const handleUpdateRequest = async (values: any) => {
    if (!editingRequest) return;

    try {
      await materialRequestsAPI.updateMaterialRequest(editingRequest.id, values);
      message.success('Заявка обновлена успешно!');
      setIsEditModalVisible(false);
      editForm.resetFields();
      setEditingRequest(null);
      fetchRequests();
    } catch (error) {
      message.error('Ошибка обновления заявки');
      console.error(error);
    }
  };

  // Отмена позиции материала из заявки
  const handleCancelItem = async (material: any) => {
    // Проверяем, есть ли у материала id
    if (!material || !material.id) {
      message.error('Невозможно отменить позицию: отсутствует идентификатор');
      return;
    }

    // Проверяем, не отменена ли уже позиция
    if (material.status === 'CANCELLED') {
      message.warning('Позиция уже отменена');
      return;
    }

    try {
      message.loading({ content: 'Отмена позиции...', key: 'cancel' });

      // Отменяем конкретную позицию материала
      await materialRequestsAPI.cancelItem(material.id, 'Отменено прорабом');

      message.success({ content: 'Позиция отменена', key: 'cancel' });
      fetchRequests(); // Обновляем список заявок
    } catch (error: any) {
      // Выводим более подробное сообщение об ошибке
      const errorMessage = error?.response?.data?.detail ||
                          error?.response?.data?.error ||
                          'Ошибка при отмене позиции';
      message.error({ content: errorMessage, key: 'cancel' });
      console.error('Cancel error:', error?.response?.data);
    }
  };

  // Универсальная функция смены статуса
  const handleChangeStatus = async (request: MaterialRequest, newStatus: string, comment: string, loadingText: string, successText: string) => {
    try {
      message.loading({ content: loadingText, key: 'status' });

      await materialRequestsAPI.changeStatus(request.id, {
        new_status: newStatus,
        comment: comment
      });

      message.success({ content: successText, key: 'status' });
      fetchRequests();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail ||
                          error?.response?.data?.new_status?.[0] ||
                          'Ошибка при смене статуса';
      message.error({ content: errorMessage, key: 'status' });
      console.error('Status change error:', error?.response?.data);
    }
  };

  // 1. Отправка заявки на согласование (DRAFT → UNDER_REVIEW)
  const handleSendToReview = async (request: MaterialRequest) => {
    await handleChangeStatus(
      request,
      'UNDER_REVIEW',
      'Отправлено на проверку снабжения',
      'Отправка на согласование...',
      'Заявка отправлена на согласование'
    );
  };

  // 2. Снабженец отправляет на проверку склада (UNDER_REVIEW → WAREHOUSE_CHECK)
  const handleSendToWarehouse = async (request: MaterialRequest) => {
    await handleChangeStatus(
      request,
      'WAREHOUSE_CHECK',
      'Отправлено на проверку склада',
      'Отправка на склад...',
      'Заявка отправлена на склад'
    );
  };

  // 3. Зав.склада возвращает снабженцу (WAREHOUSE_CHECK → BACK_TO_SUPPLY)
  const handleReturnToSupply = async (request: MaterialRequest) => {
    await handleChangeStatus(
      request,
      'BACK_TO_SUPPLY',
      'Возвращено снабженцу с отметками о наличии',
      'Возврат снабженцу...',
      'Заявка возвращена снабженцу'
    );
  };

  // 4. Снабженец отправляет руководителю (BACK_TO_SUPPLY → PROJECT_MANAGER_APPROVAL)
  const handleSendToProjectManager = async (request: MaterialRequest) => {
    await handleChangeStatus(
      request,
      'PROJECT_MANAGER_APPROVAL',
      'Отправлено руководителю проекта',
      'Отправка руководителю...',
      'Заявка отправлена руководителю проекта'
    );
  };

  // 5. Руководитель согласовывает (PROJECT_MANAGER_APPROVAL → DIRECTOR_APPROVAL)
  const handleApproveByProjectManager = async (request: MaterialRequest) => {
    await handleChangeStatus(
      request,
      'DIRECTOR_APPROVAL',
      'Согласовано руководителем проекта',
      'Согласование...',
      'Заявка согласована и отправлена директору'
    );
  };

  // 6. Директор возвращает снабженцу (DIRECTOR_APPROVAL → BACK_TO_SUPPLY)
  const handleDirectorReturnToSupply = async (request: MaterialRequest) => {
    await handleChangeStatus(
      request,
      'BACK_TO_SUPPLY',
      'Согласовано директором, возвращено снабженцу',
      'Возврат снабженцу...',
      'Заявка согласована и возвращена снабженцу'
    );
  };

  // 7. Снабженец ставит на оплату (BACK_TO_SUPPLY → PAYMENT)
  const handleSendToPayment = async (request: MaterialRequest) => {
    await handleChangeStatus(
      request,
      'PAYMENT',
      'Отправлено на оплату',
      'Отправка на оплату...',
      'Заявка отправлена на оплату'
    );
  };

  // 8. Снабженец отмечает оплачено (PAYMENT → PAID)
  const handleMarkAsPaid = async (request: MaterialRequest) => {
    await handleChangeStatus(
      request,
      'PAID',
      'Оплачено',
      'Отметка оплаты...',
      'Заявка помечена как оплаченная'
    );
  };

  // 9. Снабженец отмечает доставлено (PAID → DELIVERY)
  const handleMarkAsDelivered = async (request: MaterialRequest) => {
    await handleChangeStatus(
      request,
      'DELIVERY',
      'Доставлено',
      'Отметка доставки...',
      'Заявка помечена как доставленная'
    );
  };

  // 10. Прораб/Мастер/Начальник участка отмечает отработано (DELIVERY → COMPLETED)
  const handleMarkAsCompleted = async (request: MaterialRequest) => {
    await handleChangeStatus(
      request,
      'COMPLETED',
      'Отработано',
      'Завершение заявки...',
      'Заявка отработана'
    );
  };

  // 11. Отправка на доработку автору (любой статус → REWORK)
  const handleSendToRework = async (request: MaterialRequest) => {
    await handleChangeStatus(
      request,
      'REWORK',
      'Отправлено на доработку',
      'Отправка на доработку...',
      'Заявка отправлена на доработку'
    );
  };

  // Функции для индивидуального согласования позиций директором
  const handleApproveItem = async (itemId: number) => {
    try {
      message.loading({ content: 'Согласование позиции...', key: 'approve-item' });
      await materialRequestsAPI.approveItem(itemId, 'APPROVED');
      message.success({ content: 'Позиция согласована', key: 'approve-item' });
      fetchRequests();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || 'Ошибка при согласовании позиции';
      message.error({ content: errorMessage, key: 'approve-item' });
    }
  };

  const handleRejectItem = async (itemId: number) => {
    try {
      message.loading({ content: 'Отклонение позиции...', key: 'reject-item' });
      await materialRequestsAPI.approveItem(itemId, 'REJECTED');
      message.success({ content: 'Позиция отклонена', key: 'reject-item' });
      fetchRequests();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || 'Ошибка при отклонении позиции';
      message.error({ content: errorMessage, key: 'reject-item' });
    }
  };

  const handleReworkItem = async (itemId: number) => {
    try {
      message.loading({ content: 'Отправка на доработку...', key: 'rework-item' });
      await materialRequestsAPI.approveItem(itemId, 'REWORK');
      message.success({ content: 'Позиция отправлена на доработку', key: 'rework-item' });
      fetchRequests();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || 'Ошибка при отправке на доработку';
      message.error({ content: errorMessage, key: 'rework-item' });
    }
  };

  // Функции для обновления статуса наличия на складе (для Зав.центрскладом)
  const handleMarkInStock = async (itemId: number) => {
    try {
      message.loading({ content: 'Отметка наличия...', key: 'availability' });
      await materialRequestsAPI.updateAvailability(itemId, 'IN_STOCK');
      message.success({ content: 'Материал отмечен как "В наличии"', key: 'availability' });
      fetchRequests();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || 'Ошибка при обновлении статуса';
      message.error({ content: errorMessage, key: 'availability' });
    }
  };

  const handleMarkPartiallyInStock = async (itemId: number) => {
    try {
      message.loading({ content: 'Отметка частичного наличия...', key: 'availability' });
      await materialRequestsAPI.updateAvailability(itemId, 'PARTIALLY_IN_STOCK');
      message.success({ content: 'Материал отмечен как "Частично в наличии"', key: 'availability' });
      fetchRequests();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || 'Ошибка при обновлении статуса';
      message.error({ content: errorMessage, key: 'availability' });
    }
  };

  const handleMarkOutOfStock = async (itemId: number) => {
    try {
      message.loading({ content: 'Отметка отсутствия...', key: 'availability' });
      await materialRequestsAPI.updateAvailability(itemId, 'OUT_OF_STOCK');
      message.success({ content: 'Материал отмечен как "Нет на складе"', key: 'availability' });
      fetchRequests();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || 'Ошибка при обновлении статуса';
      message.error({ content: errorMessage, key: 'availability' });
    }
  };

  // Функция отправки материалов со склада на объект (для снабженца)
  const handleSendToSite = async (request: MaterialRequest) => {
    await handleChangeStatus(
      request,
      'SENT_TO_SITE',
      'Материалы отправлены на объект со склада',
      'Отправка на объект...',
      'Материалы отправлены на объект'
    );
  };

  // Зав.склада подтверждает отправку материалов на объект
  const handleConfirmShipping = async (request: MaterialRequest) => {
    await handleChangeStatus(
      request,
      'WAREHOUSE_SHIPPING',
      'Материалы отправлены со склада на объект',
      'Подтверждение отправки...',
      'Отправка подтверждена'
    );
  };

  // Автор (прораб) принимает материалы на объекте
  const handleAcceptOnSite = async (request: MaterialRequest) => {
    await handleChangeStatus(
      request,
      'COMPLETED',
      'Материалы приняты на объекте и отработаны',
      'Приемка материалов...',
      'Материалы приняты и отработаны'
    );
  };

  // Интерфейс для отображения материала в плоской таблице
  interface FlatMaterialRow {
    key: string;
    request: MaterialRequest;
    material: any;
    materialIndex: number;
  }

  // Преобразуем данные в плоскую структуру для таблицы
  const flattenData = (): FlatMaterialRow[] => {
    const flatData: FlatMaterialRow[] = [];

    requests.forEach((request) => {
      // Фильтруем черновики: показываем только автору
      if (request.status === 'DRAFT' && request.author_data?.id !== user?.id) {
        return; // Пропускаем эту заявку
      }

      if (request.items && request.items.length > 0) {
        request.items.forEach((item, index) => {
          flatData.push({
            key: `${request.id}-${item.id}`,
            request: request,
            material: item,
            materialIndex: index + 1,
          });
        });
      } else {
        // Если нет материалов, все равно показываем заявку
        flatData.push({
          key: `${request.id}-empty`,
          request: request,
          material: null,
          materialIndex: 0,
        });
      }
    });

    return flatData;
  };

  // Колонки таблицы в новом порядке
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

        const userRole = user?.role;
        const requestStatus = record.request.status;
        const material = record.material;
        const isCancelled = material.status === 'CANCELLED';

        // Если позиция отменена, отображаем с зачеркиванием
        if (isCancelled) {
          return (
            <div>
              <div style={{ textDecoration: 'line-through', color: '#999' }}>
                {material.material_name}
              </div>
              {material.cancellation_reason && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                  {material.cancellation_reason}
                </div>
              )}
            </div>
          );
        }

        // Определяем цвет тега статуса согласования
        const getApprovalStatusColor = (approvalStatus?: string): string => {
          const colors: Record<string, string> = {
            PENDING: 'default',
            APPROVED: 'green',
            REJECTED: 'red',
            REWORK: 'orange'
          };
          return colors[approvalStatus || 'PENDING'] || 'default';
        };

        // Определяем цвет тега статуса наличия
        const getAvailabilityStatusColor = (availabilityStatus?: string): string => {
          const colors: Record<string, string> = {
            NOT_CHECKED: 'default',
            IN_STOCK: 'green',
            PARTIALLY_IN_STOCK: 'orange',
            OUT_OF_STOCK: 'red'
          };
          return colors[availabilityStatus || 'NOT_CHECKED'] || 'default';
        };

        return (
          <div>
            <div style={{ marginBottom: 8 }}>{material.material_name}</div>

            {/* Показываем текущий статус согласования позиции (кроме отработанных) */}
            {requestStatus !== 'COMPLETED' && material.approval_status && material.approval_status !== 'PENDING' && (
              <Tag color={getApprovalStatusColor(material.approval_status)} style={{ marginBottom: 4 }}>
                {material.approval_status_display}
              </Tag>
            )}

            {/* Показываем статус наличия на складе (кроме отработанных) */}
            {requestStatus !== 'COMPLETED' && material.availability_status && material.availability_status !== 'NOT_CHECKED' && (
              <Tag color={getAvailabilityStatusColor(material.availability_status)} style={{ marginBottom: 4 }}>
                {material.availability_status_display}
                {material.availability_status === 'PARTIALLY_IN_STOCK' && material.available_quantity && (
                  <span> ({material.available_quantity})</span>
                )}
              </Tag>
            )}

            {/* Кнопки для директора при статусе DIRECTOR_APPROVAL */}
            {requestStatus === 'DIRECTOR_APPROVAL' && userRole === 'DIRECTOR' && material.approval_status === 'PENDING' && (
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Button
                  type="primary"
                  size="small"
                  onClick={() => handleApproveItem(material.id!)}
                  block
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                >
                  Согласовать
                </Button>
                <Button
                  danger
                  size="small"
                  onClick={() => handleRejectItem(material.id!)}
                  block
                >
                  Отклонить
                </Button>
                <Button
                  type="default"
                  size="small"
                  onClick={() => handleReworkItem(material.id!)}
                  block
                  style={{ backgroundColor: '#faad14', borderColor: '#faad14', color: '#fff' }}
                >
                  На доработку
                </Button>
              </Space>
            )}

            {/* Кнопки для зав.центрскладом при статусе WAREHOUSE_CHECK */}
            {requestStatus === 'WAREHOUSE_CHECK' && ['WAREHOUSE_HEAD', 'SUPERADMIN'].includes(userRole || '') && (
              <Space direction="vertical" size="small" style={{ width: '100%', marginTop: 8 }}>
                <Button
                  type="primary"
                  size="small"
                  onClick={() => handleMarkInStock(material.id!)}
                  block
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                >
                  В наличии
                </Button>
                <Button
                  type="default"
                  size="small"
                  onClick={() => handleMarkPartiallyInStock(material.id!)}
                  block
                  style={{ backgroundColor: '#faad14', borderColor: '#faad14', color: '#fff' }}
                >
                  Частично в наличии
                </Button>
              </Space>
            )}

          </div>
        );
      },
    },
    {
      title: 'Ед. изм.',
      key: 'unit',
      width: 90,
      align: 'center' as const,
      render: (record: FlatMaterialRow) =>
        record.material ? record.material.unit : '-',
    },
    {
      title: 'Кол-во',
      key: 'quantity',
      width: 100,
      align: 'center' as const,
      render: (record: FlatMaterialRow) => {
        if (!record.material) return '-';

        // Если позиция отменена, отображаем с зачеркиванием
        if (record.material.status === 'CANCELLED') {
          return (
            <span style={{ textDecoration: 'line-through', color: '#999' }}>
              {record.material.quantity}
            </span>
          );
        }

        return record.material.quantity;
      },
    },
    {
      title: 'Примечания',
      key: 'specifications',
      width: 200,
      render: (record: FlatMaterialRow) => {
        if (!record.material) return '-';

        return (
          <div>
            <div>{record.material.specifications || '-'}</div>
            {record.material.status === 'CANCELLED' && record.material.cancelled_by_data && (
              <div style={{ fontSize: '11px', color: '#ff4d4f', marginTop: 4 }}>
                Отменил: {record.material.cancelled_by_data.full_name}
                {record.material.cancelled_at && (
                  <div>
                    {new Date(record.material.cancelled_at).toLocaleString('ru-RU')}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Автор (Прораб)',
      key: 'author',
      width: 180,
      render: (record: FlatMaterialRow) =>
        record.request.author_data?.full_name || '-',
    },
    {
      title: 'Статус',
      key: 'status',
      width: 250,
      render: (record: FlatMaterialRow) => {
        const status = record.request.status;
        const userRole = user?.role;
        const isCancelled = record.material?.status === 'CANCELLED';

        return (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {/* Показываем статус заявки только для активных позиций */}
            {!isCancelled && (
              <Tag color={getStatusColor(status)} style={{ width: '100%', textAlign: 'center' }}>
                {record.request.status_display}
              </Tag>
            )}

            {/* Для отмененных позиций показываем только статус "Отменено" */}
            {isCancelled && (
              <Tag color="red" style={{ width: '100%', textAlign: 'center' }}>
                Отменено
              </Tag>
            )}

            {/* 1. DRAFT → Прораб отправляет на согласование */}
            {status === 'DRAFT' && ['FOREMAN', 'MASTER', 'SITE_MANAGER'].includes(userRole || '') && !isCancelled && (
              <Button
                type="primary"
                icon={<SendOutlined />}
                size="small"
                onClick={() => handleSendToReview(record.request)}
                block
              >
                На согласование
              </Button>
            )}

            {/* 2. UNDER_REVIEW → Снабженец отправляет на склад */}
            {status === 'UNDER_REVIEW' && ['SUPPLY_MANAGER', 'SUPERADMIN'].includes(userRole || '') && !isCancelled && (
              <Button
                type="primary"
                icon={<SendOutlined />}
                size="small"
                onClick={() => handleSendToWarehouse(record.request)}
                block
              >
                На проверку склада
              </Button>
            )}

            {/* 3. WAREHOUSE_CHECK → Зав.склада возвращает снабженцу */}
            {status === 'WAREHOUSE_CHECK' && userRole === 'WAREHOUSE_HEAD' && !isCancelled && (
              <Button
                type="primary"
                icon={<RollbackOutlined />}
                size="small"
                onClick={() => handleReturnToSupply(record.request)}
                block
              >
                Вернуть снабженцу
              </Button>
            )}

            {/* 4. BACK_TO_SUPPLY → Снабженец отправляет руководителю или на оплату */}
            {status === 'BACK_TO_SUPPLY' && ['SUPPLY_MANAGER', 'SUPERADMIN'].includes(userRole || '') && !isCancelled && (
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {/* Проверяем наличие материалов на складе */}
                {(() => {
                  // Считаем статусы наличия всех позиций в заявке
                  const hasInStock = record.request.items?.some((item: any) => item.availability_status === 'IN_STOCK');
                  const hasPartiallyInStock = record.request.items?.some((item: any) => item.availability_status === 'PARTIALLY_IN_STOCK');
                  const hasOutOfStock = record.request.items?.some((item: any) => item.availability_status === 'OUT_OF_STOCK' || !item.availability_status || item.availability_status === 'NOT_CHECKED');

                  return (
                    <>
                      {/* Если все в наличии - только кнопка "Отправить на объект" */}
                      {hasInStock && !hasOutOfStock && !hasPartiallyInStock && (
                        <Button
                          type="primary"
                          icon={<SendOutlined />}
                          size="small"
                          onClick={() => handleSendToSite(record.request)}
                          block
                        >
                          Отправить на объект
                        </Button>
                      )}

                      {/* Если частично в наличии - обе кнопки */}
                      {hasPartiallyInStock && (
                        <>
                          <Button
                            type="primary"
                            icon={<SendOutlined />}
                            size="small"
                            onClick={() => handleSendToSite(record.request)}
                            block
                          >
                            Отправить на объект
                          </Button>
                          <Button
                            type="default"
                            size="small"
                            onClick={() => handleSendToPayment(record.request)}
                            block
                          >
                            На оплату
                          </Button>
                        </>
                      )}

                      {/* Если нет на складе - кнопки для согласования и оплаты */}
                      {!hasInStock && !hasPartiallyInStock && (
                        <>
                          <Button
                            type="primary"
                            icon={<SendOutlined />}
                            size="small"
                            onClick={() => handleSendToProjectManager(record.request)}
                            block
                          >
                            Руководителю
                          </Button>
                          <Button
                            type="default"
                            size="small"
                            onClick={() => handleSendToPayment(record.request)}
                            block
                          >
                            На оплату
                          </Button>
                        </>
                      )}
                    </>
                  );
                })()}
              </Space>
            )}

            {/* 5. PROJECT_MANAGER_APPROVAL → Руководитель согласовывает */}
            {status === 'PROJECT_MANAGER_APPROVAL' && userRole === 'PROJECT_MANAGER' && !isCancelled && (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                size="small"
                onClick={() => handleApproveByProjectManager(record.request)}
                block
              >
                Согласовать
              </Button>
            )}

            {/* 6. DIRECTOR_APPROVAL → Директор возвращает снабженцу */}
            {status === 'DIRECTOR_APPROVAL' && userRole === 'DIRECTOR' && !isCancelled && (
              <Button
                type="primary"
                icon={<RollbackOutlined />}
                size="small"
                onClick={() => handleDirectorReturnToSupply(record.request)}
                block
              >
                Вернуть снабженцу
              </Button>
            )}

            {/* 7. REWORK → Автор отправляет повторно */}
            {status === 'REWORK' && ['FOREMAN', 'MASTER', 'SITE_MANAGER'].includes(userRole || '') && !isCancelled && (
              <Button
                type="primary"
                icon={<SendOutlined />}
                size="small"
                onClick={() => handleSendToReview(record.request)}
                block
              >
                Отправить повторно
              </Button>
            )}

            {/* 8. PAYMENT → Снабженец отмечает оплачено */}
            {status === 'PAYMENT' && userRole === 'SUPPLY_MANAGER' && !isCancelled && (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                size="small"
                onClick={() => handleMarkAsPaid(record.request)}
                block
              >
                Оплачено
              </Button>
            )}

            {/* 9. PAID → Снабженец отмечает доставлено */}
            {status === 'PAID' && userRole === 'SUPPLY_MANAGER' && !isCancelled && (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                size="small"
                onClick={() => handleMarkAsDelivered(record.request)}
                block
              >
                Доставлено
              </Button>
            )}

            {/* 10. DELIVERY → Прораб/Мастер/Начальник отмечает отработано */}
            {status === 'DELIVERY' && ['FOREMAN', 'MASTER', 'SITE_MANAGER'].includes(userRole || '') && !isCancelled && (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                size="small"
                onClick={() => handleMarkAsCompleted(record.request)}
                block
              >
                Отработано
              </Button>
            )}

            {/* 11. SENT_TO_SITE → Зав.склада подтверждает отправку */}
            {status === 'SENT_TO_SITE' && ['WAREHOUSE_HEAD', 'SUPERADMIN'].includes(userRole || '') && !isCancelled && (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                size="small"
                onClick={() => handleConfirmShipping(record.request)}
                block
              >
                Отправлено на объект
              </Button>
            )}

            {/* 12. WAREHOUSE_SHIPPING → Автор принимает на объекте */}
            {status === 'WAREHOUSE_SHIPPING' && ['FOREMAN', 'MASTER', 'SITE_MANAGER', 'SUPERADMIN'].includes(userRole || '') && !isCancelled && (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                size="small"
                onClick={() => handleAcceptOnSite(record.request)}
                block
              >
                Принято на объекте
              </Button>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Ответственный',
      key: 'responsible',
      width: 180,
      render: (record: FlatMaterialRow) =>
        record.request.responsible_data?.full_name || '-',
    },
    {
      title: 'Последнее действие',
      key: 'updated_at',
      width: 150,
      render: (record: FlatMaterialRow) =>
        new Date(record.request.updated_at).toLocaleString('ru-RU'),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      align: 'center' as const,
      fixed: 'right' as const,
      render: (record: FlatMaterialRow) => (
        <Space size="small">
          <Tooltip title="Скачать Excel">
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => handleExportExcel(record.request)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Изменить">
            <Button
              type="default"
              icon={<EditOutlined />}
              onClick={() => handleEditRequest(record.request)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Отменить позицию">
            <Popconfirm
              title="Отменить позицию?"
              description="Позиция будет отменена (видна снабжению для отмены закупа)"
              onConfirm={() => handleCancelItem(record.material)}
              okText="Да"
              cancelText="Нет"
              disabled={!record.material || record.material.status === 'CANCELLED'}
            >
              <Button
                danger
                icon={<CloseCircleOutlined />}
                size="small"
                disabled={!record.material || record.material.status === 'CANCELLED'}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Проверка, может ли пользователь создавать заявки
  const canCreateRequest = () => {
    if (!user) return false;
    // Роли снабжения не могут создавать заявки
    const supplyRoles = ['SUPPLY_MANAGER', 'WAREHOUSE_HEAD', 'ACCOUNTANT'];
    return !supplyRoles.includes(user.role);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Заявки на материалы</Title>

      <Card
        extra={
          canCreateRequest() && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsModalVisible(true)}
            >
              Создать заявку
            </Button>
          )
        }
        style={{ marginTop: 16 }}
      >
        <Table
          columns={columns}
          dataSource={flattenData()}
          loading={loading}
          rowKey="key"
          scroll={{ x: 1600 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total: number) => `Всего позиций: ${total}`,
          }}
          size="small"
          bordered
        />
      </Card>

      {/* Модальное окно создания заявки */}
      <Modal
        title="Создать заявку на материалы"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateRequest}
        >
          <Form.Item
            name="project"
            label="Объект"
            rules={[{ required: true, message: 'Выберите объект' }]}
          >
            <Select
              placeholder="Выберите объект"
              showSearch
              optionFilterProp="children"
            >
              {projects.map((project) => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="drawing_reference"
            label="Чертёж / Лист"
          >
            <Input placeholder="Ссылка на чертёж или номер листа" />
          </Form.Item>

          <Form.Item
            name="work_type"
            label="Вид работ"
          >
            <Input placeholder="Вид работ" />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Примечание"
          >
            <TextArea rows={3} placeholder="Дополнительные примечания" />
          </Form.Item>

          <h3>Материалы</h3>
          <Form.List
            name="items"
            rules={[
              {
                validator: async (_, items) => {
                  if (!items || items.length < 1) {
                    return Promise.reject(new Error('Добавьте хотя бы один материал'));
                  }
                },
              },
            ]}
          >
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} style={{ marginBottom: 16, padding: 12, border: '1px solid #d9d9d9', borderRadius: 4 }}>
                    <Space style={{ display: 'flex', marginBottom: 8 }} align="baseline" wrap>
                      <Form.Item
                        {...restField}
                        name={[name, 'material_name']}
                        rules={[{ required: true, message: 'Укажите материал' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="Название материала" style={{ width: 250 }} />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        rules={[{ required: true, message: 'Укажите количество' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber placeholder="Количество" min={0} style={{ width: 120 }} />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'unit']}
                        rules={[{ required: true, message: 'Укажите единицу' }]}
                        initialValue="шт"
                        style={{ marginBottom: 0 }}
                      >
                        <Select style={{ width: 100 }}>
                          <Option value="шт">шт</Option>
                          <Option value="кг">кг</Option>
                          <Option value="м">м</Option>
                          <Option value="м²">м²</Option>
                          <Option value="м³">м³</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'order']}
                        initialValue={key}
                        hidden
                      >
                        <InputNumber />
                      </Form.Item>
                      <Button onClick={() => remove(name)} danger>
                        Удалить
                      </Button>
                    </Space>
                    <Form.Item
                      {...restField}
                      name={[name, 'specifications']}
                      label="Примечание"
                      style={{ marginBottom: 0 }}
                    >
                      <TextArea rows={2} placeholder="Дополнительные характеристики материала (необязательно)" style={{ width: '100%' }} />
                    </Form.Item>
                  </div>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Добавить материал
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Создать заявку
              </Button>
              <Button onClick={() => setIsModalVisible(false)}>
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно редактирования заявки */}
      <Modal
        title="Редактировать заявку"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          editForm.resetFields();
          setEditingRequest(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateRequest}
        >
          <Form.Item
            name="drawing_reference"
            label="Чертёж / Лист"
          >
            <Input placeholder="Ссылка на чертёж или номер листа" />
          </Form.Item>

          <Form.Item
            name="work_type"
            label="Вид работ"
          >
            <Input placeholder="Вид работ" />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Примечание"
          >
            <TextArea rows={3} placeholder="Дополнительные примечания" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Сохранить изменения
              </Button>
              <Button onClick={() => {
                setIsEditModalVisible(false);
                editForm.resetFields();
                setEditingRequest(null);
              }}>
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MaterialRequests;
