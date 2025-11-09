import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, Select, InputNumber, message, Card, Typography, Tooltip, Popconfirm, Tabs } from 'antd';
import { PlusOutlined, DownloadOutlined, EditOutlined, CloseCircleOutlined, SendOutlined, CheckOutlined, RollbackOutlined, UndoOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { materialRequestsAPI, MaterialRequest, CreateMaterialRequestData } from '../api/materialRequests';
import { projectsAPI } from '../api/projects';
import { useAuthStore } from '../stores/authStore';
import { useButtonAccess } from '../hooks/useButtonAccess';
import { useQueryClient } from '@tanstack/react-query';
import ApprovalFlowTimeline from '../components/ApprovalFlow/ApprovalFlowTimeline';
import { approvalFlowsAPI, type MaterialRequestApproval } from '../api/approvalFlows';

const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;
const { TabPane } = Tabs;

// Интерфейс для проекта
interface Project {
  id: number;
  name: string;
}

// Маппинг статусов на цвета (УПРОЩЕННАЯ СХЕМА - 7 статусов)
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    DRAFT: 'default',                  // Серый - Черновик
    IN_APPROVAL: 'blue',               // Синий - На согласовании
    RETURNED_FOR_REVISION: 'orange',   // Оранжевый - На доработке
    PAYMENT: 'gold',                   // Золотой - На оплате
    DELIVERY: 'cyan',                  // Голубой - На доставке
    COMPLETED: 'green',                // Зелёный - Отработано
    CANCELLED: 'red',                  // Красный - Отменено
  };
  return colors[status] || 'default';
};

// Текстовые метки для статусов (для отображения в UI)
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    DRAFT: 'Черновик',
    IN_APPROVAL: 'На согласовании',
    RETURNED_FOR_REVISION: 'На доработке',
    PAYMENT: 'На оплате',
    DELIVERY: 'На доставке',
    COMPLETED: 'Отработано',
    CANCELLED: 'Отменено',
  };
  return labels[status] || status;
};

// Константы для фильтрации по статусам (НОВАЯ СХЕМА)
// Вкладка "На согласовании" - позиции в процессе согласования
const APPROVAL_STATUSES = ['IN_APPROVAL', 'RETURNED_FOR_REVISION'];

// Вкладка "На оплате" - позиции после согласования, ожидающие оплаты
const PAYMENT_STATUSES = ['PAYMENT'];

// Вкладка "На доставке" - позиции после оплаты, ожидающие доставки и приемки
const DELIVERY_STATUSES = ['DELIVERY'];

// Вкладка "Отработанные заявки" - завершенные позиции
const COMPLETED_STATUSES = ['COMPLETED'];

const MaterialRequests = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient(); // Для инвалидации кеша страницы Склад
  const { canUseButton } = useButtonAccess('material-requests'); // Проверка доступа к кнопкам
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // Активная вкладка фильтра
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isEditItemModalVisible, setIsEditItemModalVisible] = useState(false);
  const [editingRequest, setEditingRequest] = useState<MaterialRequest | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [editItemForm] = Form.useForm();

  // Состояние для цепочек согласования
  const [approvalsByRequest, setApprovalsByRequest] = useState<Record<number, MaterialRequestApproval[]>>({});
  const [loadingApprovals, setLoadingApprovals] = useState<Record<number, boolean>>({});

  // Загрузка данных
  useEffect(() => {
    fetchProjects();
  }, []);

  // При изменении выбранного проекта загружаем заявки
  useEffect(() => {
    if (selectedProjectId) {
      fetchRequests();
    }
  }, [selectedProjectId]);

  const fetchRequests = async () => {
    if (!selectedProjectId) return;

    setLoading(true);
    try {
      // Фильтруем заявки по выбранному проекту
      const data = await materialRequestsAPI.getMaterialRequests({ project: selectedProjectId });
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
      let projectsList: Project[] = [];
      if (Array.isArray(data)) {
        projectsList = data;
      } else if (data && typeof data === 'object' && Array.isArray(data.results)) {
        projectsList = data.results;
      } else {
        projectsList = [];
        console.warn('Неожиданный формат данных проектов:', data);
      }

      setProjects(projectsList);

      // Автоматически выбираем первый проект, если он есть
      if (projectsList.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectsList[0].id);
      }
    } catch (error) {
      console.error('Ошибка загрузки проектов:', error);
      setProjects([]);
    }
  };

  // Создание новой заявки
  const handleCreateRequest = async (values: CreateMaterialRequestData) => {
    try {
      // Автоматически привязываем к выбранному проекту
      const requestData = {
        ...values,
        project: selectedProjectId,
      };
      await materialRequestsAPI.createMaterialRequest(requestData);
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

  // Редактирование позиции материала
  const handleEditItem = async (item: any) => {
    try {
      setEditingItem(item);

      // Предзаполняем форму данными позиции
      editItemForm.setFieldsValue({
        material_name: item.material_name,
        quantity: item.quantity,
        unit: item.unit,
        specifications: item.specifications,
      });

      setIsEditItemModalVisible(true);
    } catch (error) {
      message.error('Ошибка при загрузке данных позиции');
      console.error(error);
    }
  };

  // Обновление позиции материала
  const handleUpdateItem = async (values: any) => {
    if (!editingItem) return;

    try {
      await materialRequestsAPI.updateItem(editingItem.id, values);
      message.success('Позиция обновлена успешно!');
      setIsEditItemModalVisible(false);
      editItemForm.resetFields();
      setEditingItem(null);
      fetchRequests();
    } catch (error) {
      message.error('Ошибка обновления позиции');
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

      // Обновляем список заявок
      fetchRequests();

      // Инвалидируем кеш страницы Склад, чтобы отмененная позиция исчезла
      queryClient.invalidateQueries({ queryKey: ['warehouse-materials'] });
    } catch (error: any) {
      // Выводим более подробное сообщение об ошибке
      const errorMessage = error?.response?.data?.detail ||
                          error?.response?.data?.error ||
                          'Ошибка при отмене позиции';
      message.error({ content: errorMessage, key: 'cancel' });
      console.error('Cancel error:', error?.response?.data);
    }
  };

  // Загрузка цепочки согласования для заявки
  const fetchApprovals = async (requestId: number) => {
    if (approvalsByRequest[requestId]) {
      // Уже загружены
      return;
    }

    setLoadingApprovals(prev => ({ ...prev, [requestId]: true }));
    try {
      const data = await approvalFlowsAPI.getMaterialRequestApprovals(requestId);
      setApprovalsByRequest(prev => ({ ...prev, [requestId]: data.approvals || [] }));
    } catch (error) {
      console.error('Ошибка загрузки цепочки согласования:', error);
    } finally {
      setLoadingApprovals(prev => ({ ...prev, [requestId]: false }));
    }
  };

  // Восстановление отмененной позиции материала
  const handleRestoreItem = async (material: any) => {
    // Проверяем, есть ли у материала id
    if (!material || !material.id) {
      message.error('Невозможно восстановить позицию: отсутствует идентификатор');
      return;
    }

    // Проверяем, что позиция отменена
    if (material.status !== 'CANCELLED') {
      message.warning('Позиция не отменена, восстановление невозможно');
      return;
    }

    try {
      message.loading({ content: 'Восстановление позиции...', key: 'restore' });

      // Восстанавливаем позицию материала
      await materialRequestsAPI.restoreItem(material.id);

      message.success({ content: 'Позиция восстановлена и продолжит согласование', key: 'restore' });

      // Обновляем список заявок
      fetchRequests();

      // Инвалидируем кеш страницы Склад
      queryClient.invalidateQueries({ queryKey: ['warehouse-materials'] });
    } catch (error: any) {
      // Выводим более подробное сообщение об ошибке
      const errorMessage = error?.response?.data?.detail ||
                          error?.response?.data?.error ||
                          'Ошибка при восстановлении позиции';
      message.error({ content: errorMessage, key: 'restore' });
      console.error('Restore error:', error?.response?.data);
    }
  };

  // Универсальная функция смены статуса заявки (устаревшая, для совместимости)
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

  // Универсальная функция смены статуса отдельной позиции материала
  const handleChangeItemStatus = async (item: any, newStatus: string, comment: string, loadingText: string, successText: string) => {
    try {
      message.loading({ content: loadingText, key: 'item-status' });

      await materialRequestsAPI.changeItemStatus(item.id!, {
        new_status: newStatus,
        comment: comment
      });

      message.success({ content: successText, key: 'item-status' });
      fetchRequests();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail ||
                          error?.response?.data?.new_status?.[0] ||
                          'Ошибка при смене статуса';
      message.error({ content: errorMessage, key: 'item-status' });
      console.error('Item status change error:', error?.response?.data);
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
    isFirstRowOfRequest: boolean; // Флаг для первой строки заявки
  }

  // Преобразуем данные в плоскую структуру для таблицы
  // НОВАЯ ЛОГИКА: Показываем все позиции (кроме черновиков), фильтрация по вкладкам
  const flattenData = (): FlatMaterialRow[] => {
    const flatData: FlatMaterialRow[] = [];

    requests.forEach((request) => {
      if (request.items && request.items.length > 0) {
        // Показываем все позиции, фильтрация будет в getFilteredData()
        request.items.forEach((item, index) => {
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

  // Функция фильтрации данных по активной вкладке (НОВАЯ СХЕМА)
  const getFilteredData = (data: FlatMaterialRow[]) => {
    return data.filter(row => {
      // Если нет материала, пропускаем строку
      if (!row.material) {
        return false;
      }

      const status = row.material.item_status;

      // Фильтрация по вкладкам
      if (activeTab === 'approval') {
        // Вкладка "На согласовании" - позиции в процессе согласования (включая доработку)
        return APPROVAL_STATUSES.includes(status);
      }

      if (activeTab === 'payment') {
        // Вкладка "На оплате" - позиции после согласования, ожидающие оплаты
        return PAYMENT_STATUSES.includes(status);
      }

      if (activeTab === 'delivery') {
        // Вкладка "На доставке" - позиции после оплаты, ожидающие доставки и приемки
        return DELIVERY_STATUSES.includes(status);
      }

      if (activeTab === 'completed') {
        // Вкладка "Отработанные заявки" - завершенные позиции
        return COMPLETED_STATUSES.includes(status);
      }

      // Вкладка "Все заявки" - показываем все позиции (кроме отмененных)
      // DRAFT позиции тоже показываем, чтобы автор мог отправить их на согласование
      return status !== 'CANCELLED';
    });
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

            {/* Показываем статус наличия на складе (кроме отработанных и статуса "Нет на складе") */}
            {requestStatus !== 'COMPLETED' &&
             material.availability_status &&
             material.availability_status !== 'NOT_CHECKED' &&
             material.availability_status !== 'OUT_OF_STOCK' && (
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
            {material.item_status === 'WAREHOUSE_CHECK' && canUseWarehouseWorkflow() && (
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
      title: 'Кол-во по заявке',
      key: 'quantity',
      width: 120,
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
      title: 'Кол-во по факту',
      key: 'actual_quantity',
      width: 120,
      align: 'center' as const,
      render: (record: FlatMaterialRow) => {
        if (!record.material) return '-';

        const material = record.material;

        // НОВАЯ ЛОГИКА: Колонка доступна только на вкладке "На доставке"
        // Редактирование только для ИТР на объекте (4 роли)
        const allowedRoles = ['SITE_MANAGER', 'FOREMAN', 'MASTER', 'SITE_WAREHOUSE_MANAGER'];
        const canEdit = (user?.is_superuser || allowedRoles.includes(user?.role || '')) &&
                        material.item_status === 'DELIVERY' &&
                        activeTab === 'delivery';

        // Если позиция отменена, отображаем прочерк
        if (material.status === 'CANCELLED') {
          return <span style={{ color: '#999' }}>-</span>;
        }

        // Показываем колонку только на вкладке "На доставке"
        if (activeTab !== 'delivery') {
          return <span style={{ color: '#999' }}>-</span>;
        }

        return (
          <div>
            {canEdit ? (
              <InputNumber
                min={0}
                step={0.01}
                placeholder="Не указано"
                value={material.actual_quantity || undefined}
                onChange={async (value) => {
                  if (value === null || value === undefined) return;

                  try {
                    // Используем новый endpoint update_actual_quantity
                    const response = await materialRequestsAPI.updateActualQuantity(material.id!, {
                      actual_quantity: value,
                    });

                    // Проверяем, произошел ли автоматический переход в COMPLETED
                    if (response.auto_completed) {
                      message.success(`Фактическое количество обновлено. Позиция автоматически переведена в "Отработано"`);
                    } else {
                      message.success('Фактическое количество обновлено');
                    }

                    // Обновляем таблицу материальных заявок
                    fetchRequests();
                  } catch (error: any) {
                    const errorMsg = error?.response?.data?.detail || 'Ошибка при обновлении количества';
                    message.error(errorMsg);
                    console.error(error);
                  }
                }}
                style={{ width: '100%' }}
                size="small"
              />
            ) : (
              <span>{material.actual_quantity || '-'}</span>
            )}
          </div>
        );
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
      title: 'Автор',
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
        // НОВАЯ УПРОЩЕННАЯ ЛОГИКА (7 статусов)
        const itemStatus = record.material?.item_status || 'DRAFT';
        const isCancelled = record.material?.status === 'CANCELLED';

        return (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {/* Показываем статус позиции */}
            {!isCancelled && (
              <Tag color={getStatusColor(itemStatus)} style={{ width: '100%', textAlign: 'center' }}>
                {getStatusLabel(itemStatus)}
              </Tag>
            )}

            {/* Для отмененных позиций показываем только статус "Отменено" */}
            {isCancelled && (
              <Tag color="red" style={{ width: '100%', textAlign: 'center' }}>
                Отменено
              </Tag>
            )}

            {/* НОВЫЕ КНОПКИ ДЛЯ УПРОЩЕННОЙ СХЕМЫ */}

            {/* 1. DRAFT → Отправка на согласование */}
            {itemStatus === 'DRAFT' && canSubmitForApproval() && !isCancelled && record.material && (
              <Button
                type="primary"
                icon={<SendOutlined />}
                size="small"
                onClick={() => handleChangeItemStatus(record.material, 'IN_APPROVAL', 'Отправлено на согласование', 'Отправка на согласование...', 'Позиция отправлена на согласование')}
                block
              >
                На согласование
              </Button>
            )}

            {/* 2. RETURNED_FOR_REVISION → Автор может редактировать и повторно отправить */}
            {itemStatus === 'RETURNED_FOR_REVISION' && canSubmitForApproval() && !isCancelled && record.material && (
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Button
                  type="default"
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => handleEditItem(record.material)}
                  block
                  style={{ backgroundColor: '#faad14', borderColor: '#faad14', color: '#fff' }}
                >
                  Редактировать позицию
                </Button>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  size="small"
                  onClick={() => handleChangeItemStatus(record.material, 'IN_APPROVAL', 'Отправлено на согласование после доработки', 'Отправка на согласование...', 'Позиция отправлена на согласование после доработки')}
                  block
                >
                  Отправить после доработки
                </Button>
              </Space>
            )}

            {/* 3. IN_APPROVAL → Согласование происходит через ApprovalFlowTemplate, кнопок здесь нет */}
            {/* Согласование/отклонение происходит в expandedRowRender через ApprovalFlowTimeline */}

            {/* 4. PAYMENT → Снабженец отмечает "Оплачено" */}
            {itemStatus === 'PAYMENT' && canUseSupplyWorkflow() && !isCancelled && record.material && (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                size="small"
                onClick={() => handleChangeItemStatus(record.material, 'DELIVERY', 'Оплачено', 'Отметка оплаты...', 'Позиция оплачена и переведена на доставку')}
                block
              >
                Оплачено
              </Button>
            )}

            {/* 5. DELIVERY → ИТР на объекте могут принять материал */}
            {itemStatus === 'DELIVERY' && canAcceptOnSite() && !isCancelled && record.material && (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                size="small"
                onClick={() => handleChangeItemStatus(record.material, 'COMPLETED', 'Принято на объекте', 'Прием на объекте...', 'Позиция принята на объекте')}
                block
              >
                Принять
              </Button>
            )}

            {/* 6. COMPLETED → Отработано, никаких кнопок не показываем */}
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
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      align: 'center' as const,
      fixed: 'right' as const,
      render: (record: FlatMaterialRow) => {
        // Определяем, можно ли редактировать заявку
        const isAuthor = record.request.author_data?.id === user?.id;
        const isDraftOrRework = record.material &&
                        (record.material.item_status === 'DRAFT' || record.material.item_status === 'RETURNED_FOR_REVISION');
        const canEdit = isAuthor && isDraftOrRework && canEditRequest();

        return (
          <Space size="small">
            {/* Кнопка "Скачать Excel" проверяется через матрицу доступа */}
            {canExportExcel() && (
              <Tooltip title="Скачать Excel">
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={() => handleExportExcel(record.request)}
                  size="small"
                />
              </Tooltip>
            )}
            {/* Кнопка "Редактировать" доступна только автору при статусах DRAFT или RETURNED_FOR_REVISION */}
            {canEdit && (
              <Tooltip title="Изменить">
                <Button
                  type="default"
                  icon={<EditOutlined />}
                  onClick={() => handleEditRequest(record.request)}
                  size="small"
                />
              </Tooltip>
            )}
            {/* Кнопка "Отменить" - показывается только для активных позиций и проверяется через матрицу */}
            {canDeleteItem() && record.material && record.material.status !== 'CANCELLED' && (
              <Tooltip title="Отменить позицию">
                <Popconfirm
                  title="Отменить позицию?"
                  description="Позиция будет отменена (видна снабжению для отмены закупа)"
                  onConfirm={() => handleCancelItem(record.material)}
                  okText="Да"
                  cancelText="Нет"
                >
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    size="small"
                  />
                </Popconfirm>
              </Tooltip>
            )}

            {/* Кнопка "Восстановить" - показывается только для отмененных позиций и проверяется через матрицу */}
            {canDeleteItem() && record.material && record.material.status === 'CANCELLED' && (
              <Tooltip title="Восстановить позицию (продолжит согласование)">
                <Popconfirm
                  title="Восстановить позицию?"
                  description="Позиция вернется к предыдущему статусу согласования"
                  onConfirm={() => handleRestoreItem(record.material)}
                  okText="Да"
                  cancelText="Нет"
                >
                  <Button
                    type="primary"
                    icon={<UndoOutlined />}
                    size="small"
                  />
                </Popconfirm>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  // Проверка доступа к кнопке "Создать заявку" через систему ButtonAccess
  const canCreateRequest = () => {
    // SUPERADMIN всегда имеет доступ
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true;
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('create');
  };

  // Проверка доступа к редактированию заявки
  const canEditRequest = () => {
    // SUPERADMIN всегда имеет доступ
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true;
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('edit');
  };

  // Проверка доступа к удалению/отмене позиции
  const canDeleteItem = () => {
    // SUPERADMIN всегда имеет доступ
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true;
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('delete');
  };

  // Проверка доступа к экспорту в Excel
  const canExportExcel = () => {
    // SUPERADMIN всегда имеет доступ
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true;
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('view_details');
  };

  // Проверка доступа к согласованию/отклонению заявки
  const canApproveReject = () => {
    // SUPERADMIN всегда имеет доступ
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true;
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('approve');
  };

  // Проверка доступа к отправке на согласование
  const canSubmitForApproval = () => {
    // SUPERADMIN всегда имеет доступ
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true;
    }
    // Для остальных ролей проверяем через матрицу доступа из админ-панели
    return canUseButton('submit');
  };

  // Проверка доступа к workflow-действиям для разных ролей
  const canUseWarehouseWorkflow = () => {
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true;
    }
    return canUseButton('warehouse_workflow');
  };

  const canUseSupplyWorkflow = () => {
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true;
    }
    return canUseButton('supply_workflow');
  };

  const canUseDirectorWorkflow = () => {
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true;
    }
    return canUseButton('director_workflow');
  };

  const canUseEngineerWorkflow = () => {
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true;
    }
    return canUseButton('engineer_workflow');
  };

  const canUsePMWorkflow = () => {
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true;
    }
    return canUseButton('pm_workflow');
  };

  // Проверка доступа к кнопке "Принято на объекте" (НОВАЯ ЛОГИКА - только 4 роли)
  const canAcceptOnSite = () => {
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true;
    }
    // Только: Начальник участка, Прораб, Мастер, Завсклад объекта
    const allowedRoles = ['SITE_MANAGER', 'FOREMAN', 'MASTER', 'SITE_WAREHOUSE_MANAGER'];
    return allowedRoles.includes(user?.role || '');
  };

  // УСТАРЕВШАЯ функция - оставлена для обратной совместимости с другими частями кода
  const canMarkAsCompleted = (request: MaterialRequest) => {
    if (user?.is_superuser || user?.role === 'SUPERADMIN') {
      return true;
    }

    // Прораб, Энергетик, Мастер, Начальник участка, Завсклад - всегда могут
    if (['FOREMAN', 'POWER_ENGINEER', 'MASTER', 'SITE_MANAGER', 'WAREHOUSE_HEAD'].includes(user?.role || '')) {
      return true;
    }

    // Директор - только если он автор заявки
    if (user?.role === 'DIRECTOR') {
      return request.author_data?.id === user?.id;
    }

    return false;
  };

  // Функция для отображения расширенной строки с цепочкой согласования
  const expandedRowRender = (record: FlatMaterialRow) => {
    // Показываем цепочку согласования только для первой строки заявки
    if (!record.isFirstRowOfRequest) {
      return null;
    }

    const requestId = record.request.id;
    const approvals = approvalsByRequest[requestId] || [];
    const isLoading = loadingApprovals[requestId];

    // Получаем current_step из заявки
    const currentStep = record.request.current_step;

    if (isLoading) {
      return <div style={{ padding: 16 }}>Загрузка цепочки согласования...</div>;
    }

    if (approvals.length === 0) {
      return (
        <div style={{ padding: 16, color: '#999' }}>
          Цепочка согласования не настроена для этой заявки
        </div>
      );
    }

    return (
      <ApprovalFlowTimeline
        approvals={approvals}
        currentStep={currentStep}
        materialRequestId={requestId}
        onApprovalAction={() => {
          // После действия обновляем список заявок и цепочку согласования
          fetchRequests();
          setApprovalsByRequest(prev => {
            const updated = { ...prev };
            delete updated[requestId]; // Удаляем, чтобы перезагрузить
            return updated;
          });
          // Перезагружаем цепочку
          fetchApprovals(requestId);
        }}
      />
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Заявки на материалы</Title>

      {/* Фильтр по объектам */}
      <Card style={{ marginTop: 16, marginBottom: 16 }}>
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space align="center">
            <span style={{ fontWeight: 500 }}>Объект:</span>
            <Select
              style={{ width: 400 }}
              placeholder="Выберите объект"
              value={selectedProjectId}
              onChange={(value) => setSelectedProjectId(value)}
              showSearch
              optionFilterProp="children"
              size="large"
            >
              {projects.map((project) => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
            {selectedProjectId && (
              <span style={{ color: '#666' }}>
                (Заявки привязаны к выбранному объекту)
              </span>
            )}
          </Space>
          <Space>
            {canCreateRequest() && selectedProjectId && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsModalVisible(true)}
                size="large"
              >
                Создать заявку
              </Button>
            )}
          </Space>
        </Space>
      </Card>

      {!selectedProjectId && projects.length > 0 && (
        <Card style={{ marginTop: 16 }}>
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <Title level={4}>Выберите объект для просмотра заявок</Title>
            <p>Все заявки привязаны к конкретному объекту.</p>
          </div>
        </Card>
      )}

      {projects.length === 0 && !loading && (
        <Card style={{ marginTop: 16 }}>
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <Title level={4}>У вас нет доступных объектов</Title>
            <p>Обратитесь к администратору для получения доступа к объектам.</p>
          </div>
        </Card>
      )}

      {selectedProjectId && (
        <Card style={{ marginTop: 16 }}>
          <style>
            {`
              .request-separator {
                border-top: 3px solid #1890ff !important;
                background-color: #f0f5ff;
              }
              .request-separator:hover {
                background-color: #e6f0ff !important;
              }
            `}
          </style>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
          >
            {/* Вкладка 1: Все заявки */}
            <TabPane tab="Все заявки" key="all">
              <Table
                columns={columns}
                dataSource={getFilteredData(flattenData())}
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
                rowClassName={(record: FlatMaterialRow) =>
                  record.isFirstRowOfRequest ? 'request-separator' : ''
                }
                expandable={{
                  expandedRowRender,
                  onExpand: (expanded, record) => {
                    if (expanded && record.isFirstRowOfRequest) {
                      fetchApprovals(record.request.id);
                    }
                  },
                  rowExpandable: (record) => record.isFirstRowOfRequest,
                }}
              />
            </TabPane>

            {/* Вкладка 2: На согласовании */}
            <TabPane tab="На согласовании" key="approval">
              <Table
                columns={columns}
                dataSource={getFilteredData(flattenData())}
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
                rowClassName={(record: FlatMaterialRow) =>
                  record.isFirstRowOfRequest ? 'request-separator' : ''
                }
                expandable={{
                  expandedRowRender,
                  onExpand: (expanded, record) => {
                    if (expanded && record.isFirstRowOfRequest) {
                      fetchApprovals(record.request.id);
                    }
                  },
                  rowExpandable: (record) => record.isFirstRowOfRequest,
                }}
              />
            </TabPane>

            {/* Вкладка 3: На оплате */}
            <TabPane tab="На оплате" key="payment">
              <Table
                columns={columns}
                dataSource={getFilteredData(flattenData())}
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
                rowClassName={(record: FlatMaterialRow) =>
                  record.isFirstRowOfRequest ? 'request-separator' : ''
                }
                expandable={{
                  expandedRowRender,
                  onExpand: (expanded, record) => {
                    if (expanded && record.isFirstRowOfRequest) {
                      fetchApprovals(record.request.id);
                    }
                  },
                  rowExpandable: (record) => record.isFirstRowOfRequest,
                }}
              />
            </TabPane>

            {/* Вкладка 4: На доставке */}
            <TabPane tab="На доставке" key="delivery">
              <Table
                columns={columns}
                dataSource={getFilteredData(flattenData())}
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
                rowClassName={(record: FlatMaterialRow) =>
                  record.isFirstRowOfRequest ? 'request-separator' : ''
                }
                expandable={{
                  expandedRowRender,
                  onExpand: (expanded, record) => {
                    if (expanded && record.isFirstRowOfRequest) {
                      fetchApprovals(record.request.id);
                    }
                  },
                  rowExpandable: (record) => record.isFirstRowOfRequest,
                }}
              />
            </TabPane>

            {/* Вкладка 5: Отработанные заявки */}
            <TabPane tab="Отработанные заявки" key="completed">
              <Table
                columns={columns}
                dataSource={getFilteredData(flattenData())}
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
                rowClassName={(record: FlatMaterialRow) =>
                  record.isFirstRowOfRequest ? 'request-separator' : ''
                }
                expandable={{
                  expandedRowRender,
                  onExpand: (expanded, record) => {
                    if (expanded && record.isFirstRowOfRequest) {
                      fetchApprovals(record.request.id);
                    }
                  },
                  rowExpandable: (record) => record.isFirstRowOfRequest,
                }}
              />
            </TabPane>
          </Tabs>
        </Card>
      )}

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
        {/* Информация о выбранном объекте */}
        {selectedProjectId && (
          <div style={{
            marginBottom: 16,
            padding: '12px 16px',
            background: '#f0f5ff',
            borderRadius: '4px',
            border: '1px solid #adc6ff'
          }}>
            <Space>
              <span style={{ fontWeight: 500 }}>Объект:</span>
              <span style={{ color: '#1890ff' }}>
                {projects.find(p => p.id === selectedProjectId)?.name}
              </span>
            </Space>
          </div>
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateRequest}
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
                          <Option value="тн">тн</Option>
                          <Option value="м">м</Option>
                          <Option value="м.п.">м.п.</Option>
                          <Option value="м²">м²</Option>
                          <Option value="м³">м³</Option>
                          <Option value="литр">литр</Option>
                          <Option value="комплект">комплект</Option>
                          <Option value="партия">партия</Option>
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

      {/* Модальное окно редактирования позиции материала */}
      <Modal
        title="Редактировать позицию материала"
        open={isEditItemModalVisible}
        onCancel={() => {
          setIsEditItemModalVisible(false);
          editItemForm.resetFields();
          setEditingItem(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editItemForm}
          layout="vertical"
          onFinish={handleUpdateItem}
        >
          <Form.Item
            name="material_name"
            label="Материал"
            rules={[{ required: true, message: 'Укажите название материала' }]}
          >
            <Input placeholder="Название материала (например: Арматура Ø12)" />
          </Form.Item>

          <Form.Item
            name="quantity"
            label="Количество"
            rules={[{ required: true, message: 'Укажите количество' }]}
          >
            <InputNumber
              min={0.01}
              step={0.01}
              placeholder="Количество"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="unit"
            label="Единица измерения"
            rules={[{ required: true, message: 'Укажите единицу измерения' }]}
          >
            <Select placeholder="Выберите единицу измерения">
              <Option value="шт">шт (штуки)</Option>
              <Option value="кг">кг (килограммы)</Option>
              <Option value="т">т (тонны)</Option>
              <Option value="м">м (метры)</Option>
              <Option value="м²">м² (квадратные метры)</Option>
              <Option value="м³">м³ (кубические метры)</Option>
              <Option value="л">л (литры)</Option>
              <Option value="уп">уп (упаковки)</Option>
              <Option value="комп">комп (комплекты)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="specifications"
            label="Примечание / Спецификация"
          >
            <TextArea rows={3} placeholder="Дополнительные характеристики материала" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Сохранить изменения
              </Button>
              <Button onClick={() => {
                setIsEditItemModalVisible(false);
                editItemForm.resetFields();
                setEditingItem(null);
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
