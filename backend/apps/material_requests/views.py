from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.db.models import Q
from django.http import HttpResponse
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
from openpyxl.utils import get_column_letter
from datetime import datetime

from .models import (
    MaterialRequest,
    MaterialRequestItem,
    MaterialRequestDocument,
    MaterialRequestComment
)
from .serializers import (
    MaterialRequestListSerializer,
    MaterialRequestDetailSerializer,
    MaterialRequestCreateSerializer,
    MaterialRequestUpdateSerializer,
    MaterialRequestStatusChangeSerializer,
    MaterialRequestItemSerializer,
    MaterialRequestDocumentSerializer,
    MaterialRequestCommentSerializer
)
from .permissions import (
    MaterialRequestPermission,
    MaterialRequestStatusChangePermission,
    MaterialRequestDocumentPermission,
    MaterialRequestCommentPermission
)


class MaterialRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet для работы с заявками на материалы.

    Endpoints согласно ТЗ (раздел 5):
    - GET /api/material-requests/ - список заявок
    - GET /api/material-requests/{id}/ - детальная карточка
    - POST /api/material-requests/ - создать заявку
    - PUT/PATCH /api/material-requests/{id}/ - редактировать заявку
    - DELETE /api/material-requests/{id}/ - удалить заявку
    - PATCH /api/material-requests/{id}/status/ - смена статуса
    - POST /api/material-requests/{id}/upload/ - загрузка файлов
    """

    permission_classes = [IsAuthenticated, MaterialRequestPermission]
    pagination_class = None  # Отключаем пагинацию, возвращаем все заявки
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['project', 'author', 'status', 'responsible']
    search_fields = ['request_number', 'notes', 'items__material_name']
    ordering_fields = ['created_at', 'updated_at', 'request_number']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Получение списка заявок с учетом прав доступа.
        Согласно ТЗ: каждый сотрудник видит заявки своих объектов.
        """
        user = self.request.user

        # Суперадмин и руководители видят все заявки
        if user.is_superuser or user.role in ['SUPERADMIN', 'DIRECTOR', 'CHIEF_ENGINEER']:
            return MaterialRequest.objects.all().select_related(
                'project',
                'author',
                'responsible'
            ).prefetch_related('items', 'documents', 'history', 'comments')

        # Остальные видят заявки своих проектов
        user_projects = user.projects.all() if hasattr(user, 'projects') else []

        return MaterialRequest.objects.filter(
            Q(project__in=user_projects) |
            Q(author=user) |
            Q(responsible=user)
        ).select_related(
            'project',
            'author',
            'responsible'
        ).prefetch_related('items', 'documents', 'history', 'comments').distinct()

    def get_serializer_class(self):
        """Выбор сериализатора в зависимости от действия."""
        if self.action == 'list':
            return MaterialRequestListSerializer
        elif self.action == 'create':
            return MaterialRequestCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return MaterialRequestUpdateSerializer
        elif self.action == 'change_status':
            return MaterialRequestStatusChangeSerializer
        return MaterialRequestDetailSerializer

    def perform_create(self, serializer):
        """Создание заявки с установкой автора."""
        serializer.save()

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated, MaterialRequestStatusChangePermission])
    def change_status(self, request, pk=None):
        """
        Изменение статуса заявки.
        Endpoint: PATCH /api/material-requests/{id}/status/

        Body: {
            "new_status": "UNDER_REVIEW",
            "comment": "Отправлено на проверку"
        }
        """
        material_request = self.get_object()
        serializer = self.get_serializer(
            data=request.data,
            context={
                'material_request': material_request,
                'request': request
            }
        )
        serializer.is_valid(raise_exception=True)
        updated_request = serializer.save()

        # Возвращаем обновленную заявку
        detail_serializer = MaterialRequestDetailSerializer(
            updated_request,
            context={'request': request}
        )
        return Response(detail_serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, MaterialRequestDocumentPermission])
    def upload(self, request, pk=None):
        """
        Загрузка документов к заявке.
        Endpoint: POST /api/material-requests/{id}/upload/

        Multipart form data:
        - document_type: тип документа (REGISTRY, INVOICE, WAYBILL, PHOTO, OTHER)
        - file: файл
        - file_name: название файла
        - description: описание (опционально)
        """
        material_request = self.get_object()

        serializer = MaterialRequestDocumentSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(
            request=material_request,
            uploaded_by=request.user
        )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, MaterialRequestCommentPermission])
    def add_comment(self, request, pk=None):
        """
        Добавление комментария к заявке.
        Endpoint: POST /api/material-requests/{id}/add_comment/

        Body: {
            "text": "Текст комментария"
        }
        """
        material_request = self.get_object()

        serializer = MaterialRequestCommentSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(
            request=material_request,
            author=request.user
        )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        """
        Добавление позиции материала к заявке.
        Endpoint: POST /api/material-requests/{id}/add_item/

        Body: {
            "material_name": "Арматура Ø12",
            "quantity": 1500,
            "unit": "кг",
            "specifications": "Описание",
            "order": 1
        }
        """
        material_request = self.get_object()

        # Проверка прав - только автор или ответственный
        if (request.user != material_request.author and
            request.user != material_request.responsible and
            request.user.role not in ['SUPERADMIN', 'DIRECTOR', 'CHIEF_ENGINEER']):
            return Response(
                {'detail': 'У вас нет прав для добавления материалов к этой заявке'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = MaterialRequestItemSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(request=material_request)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def export_excel(self, request, pk=None):
        """
        Экспорт заявки в Excel.
        Endpoint: GET /api/material-requests/{id}/export_excel/

        Возвращает файл Excel с полной информацией о заявке.
        """
        material_request = self.get_object()

        # Создаем новую книгу Excel
        wb = Workbook()
        ws = wb.active
        # Убираем недопустимые символы из названия листа (Excel не поддерживает: / \ ? * [ ])
        safe_number = material_request.request_number.replace('/', '-')
        ws.title = f"Заявка {safe_number}"

        # Определяем стили
        header_font = Font(bold=True, size=14)
        subheader_font = Font(bold=True, size=11)
        regular_font = Font(size=11)

        header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
        subheader_fill = PatternFill(start_color="D9E2F3", end_color="D9E2F3", fill_type="solid")

        border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )

        center_alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        left_alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)

        # Заголовок документа
        ws.merge_cells('A1:F1')
        ws['A1'] = f'ЗАЯВКА НА МАТЕРИАЛЫ № {material_request.request_number}'
        ws['A1'].font = Font(bold=True, size=16)
        ws['A1'].alignment = center_alignment
        ws['A1'].fill = header_fill
        ws['A1'].font = Font(bold=True, size=16, color="FFFFFF")

        # Информация о заявке
        row = 3
        ws[f'A{row}'] = 'Дата создания:'
        ws[f'B{row}'] = material_request.created_at.strftime('%d.%m.%Y %H:%M')
        ws[f'A{row}'].font = subheader_font

        row += 1
        ws[f'A{row}'] = 'Объект:'
        ws[f'B{row}'] = material_request.project.name if material_request.project else '-'
        ws[f'A{row}'].font = subheader_font

        row += 1
        ws[f'A{row}'] = 'Автор (Прораб):'
        ws[f'B{row}'] = material_request.author.get_full_name() if material_request.author else '-'
        ws[f'A{row}'].font = subheader_font

        row += 1
        ws[f'A{row}'] = 'Статус:'
        ws[f'B{row}'] = material_request.get_status_display()
        ws[f'A{row}'].font = subheader_font

        if material_request.responsible:
            row += 1
            ws[f'A{row}'] = 'Ответственный:'
            ws[f'B{row}'] = material_request.responsible.get_full_name()
            ws[f'A{row}'].font = subheader_font

        if material_request.drawing_reference:
            row += 1
            ws[f'A{row}'] = 'Чертёж / Лист:'
            ws[f'B{row}'] = material_request.drawing_reference
            ws[f'A{row}'].font = subheader_font

        if material_request.work_type:
            row += 1
            ws[f'A{row}'] = 'Вид работ:'
            ws[f'B{row}'] = material_request.work_type
            ws[f'A{row}'].font = subheader_font

        if material_request.notes:
            row += 1
            ws[f'A{row}'] = 'Примечание:'
            ws[f'B{row}'] = material_request.notes
            ws[f'A{row}'].font = subheader_font

        # Таблица материалов
        row += 2
        ws[f'A{row}'] = '№'
        ws[f'B{row}'] = 'Наименование материала'
        ws[f'C{row}'] = 'Количество'
        ws[f'D{row}'] = 'Ед. изм.'
        ws[f'E{row}'] = 'Примечания'
        ws[f'F{row}'] = 'Дата добавления'

        # Применяем стиль к заголовкам таблицы
        for col in ['A', 'B', 'C', 'D', 'E', 'F']:
            cell = ws[f'{col}{row}']
            cell.font = Font(bold=True, size=11, color="FFFFFF")
            cell.fill = header_fill
            cell.alignment = center_alignment
            cell.border = border

        # Заполняем данные материалов
        items = material_request.items.order_by('order')
        for idx, item in enumerate(items, 1):
            row += 1
            ws[f'A{row}'] = idx
            ws[f'B{row}'] = item.material_name
            ws[f'C{row}'] = float(item.quantity)
            ws[f'D{row}'] = item.unit
            ws[f'E{row}'] = item.specifications or '-'
            ws[f'F{row}'] = item.created_at.strftime('%d.%m.%Y')

            # Применяем стиль к ячейкам
            for col in ['A', 'B', 'C', 'D', 'E', 'F']:
                cell = ws[f'{col}{row}']
                cell.border = border
                cell.font = regular_font
                if col == 'A':
                    cell.alignment = center_alignment
                elif col == 'C':
                    cell.alignment = center_alignment
                else:
                    cell.alignment = left_alignment

        # Настраиваем ширину колонок
        ws.column_dimensions['A'].width = 8
        ws.column_dimensions['B'].width = 45
        ws.column_dimensions['C'].width = 12
        ws.column_dimensions['D'].width = 12
        ws.column_dimensions['E'].width = 30
        ws.column_dimensions['F'].width = 15

        # Подпись в конце документа
        row += 3
        ws[f'A{row}'] = f'Всего позиций: {items.count()}'
        ws[f'A{row}'].font = subheader_font

        # Создаем HTTP-ответ с Excel файлом
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        filename = f'Заявка_{material_request.request_number}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        wb.save(response)
        return response


class MaterialRequestItemViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с позициями материалов."""

    queryset = MaterialRequestItem.objects.all().select_related('request', 'cancelled_by')
    serializer_class = MaterialRequestItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['request', 'unit', 'status']
    search_fields = ['material_name', 'specifications']

    @action(detail=True, methods=['patch'])
    def cancel_item(self, request, pk=None):
        """
        Отмена позиции материала.
        Endpoint: PATCH /api/material-request-items/{id}/cancel_item/

        Body: {
            "cancellation_reason": "Причина отмены"
        }
        """
        from django.utils import timezone

        item = self.get_object()
        material_request = item.request

        # Проверка прав - только автор или ответственный или суперадмин
        if (request.user != material_request.author and
            request.user != material_request.responsible and
            request.user.role not in ['SUPERADMIN', 'DIRECTOR', 'CHIEF_ENGINEER']):
            return Response(
                {'detail': 'У вас нет прав для отмены этой позиции'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Проверка, что позиция не была отменена ранее
        if item.status == 'CANCELLED':
            return Response(
                {'detail': 'Позиция уже отменена'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Получаем причину отмены из запроса
        cancellation_reason = request.data.get('cancellation_reason', 'Отменено без указания причины')

        # Обновляем статус позиции
        item.status = 'CANCELLED'
        item.cancellation_reason = cancellation_reason
        item.cancelled_by = request.user
        item.cancelled_at = timezone.now()
        item.save()

        # Возвращаем обновленную позицию
        serializer = self.get_serializer(item)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def approve_item(self, request, pk=None):
        """
        Согласование позиции материала директором.
        Endpoint: PATCH /api/material-request-items/{id}/approve_item/

        Body: {
            "approval_status": "APPROVED" | "REJECTED" | "REWORK",
            "comment": "Комментарий (опционально)"
        }
        """
        item = self.get_object()
        material_request = item.request

        # Проверка прав - только директор или суперадмин
        if request.user.role not in ['SUPERADMIN', 'DIRECTOR']:
            return Response(
                {'detail': 'У вас нет прав для согласования этой позиции'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Получаем новый статус согласования
        approval_status = request.data.get('approval_status')
        if not approval_status or approval_status not in ['APPROVED', 'REJECTED', 'REWORK']:
            return Response(
                {'detail': 'Необходимо указать корректный статус согласования'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Обновляем статус согласования позиции
        item.approval_status = approval_status
        item.save()

        # Возвращаем обновленную позицию
        serializer = self.get_serializer(item)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def update_availability(self, request, pk=None):
        """
        Обновление статуса наличия материала на складе (для зав.центрскладом).
        Endpoint: PATCH /api/material-request-items/{id}/update_availability/

        Body: {
            "availability_status": "IN_STOCK" | "PARTIALLY_IN_STOCK" | "OUT_OF_STOCK",
            "available_quantity": 10.5 (опционально, для PARTIALLY_IN_STOCK)
        }
        """
        item = self.get_object()
        material_request = item.request

        # Проверка прав - только зав.склада или суперадмин
        if request.user.role not in ['SUPERADMIN', 'WAREHOUSE_HEAD']:
            return Response(
                {'detail': 'У вас нет прав для обновления статуса наличия'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Получаем новый статус наличия
        availability_status = request.data.get('availability_status')
        if not availability_status or availability_status not in ['IN_STOCK', 'PARTIALLY_IN_STOCK', 'OUT_OF_STOCK']:
            return Response(
                {'detail': 'Необходимо указать корректный статус наличия'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Обновляем статус наличия позиции
        item.availability_status = availability_status

        # Если частично в наличии, получаем количество
        if availability_status == 'PARTIALLY_IN_STOCK':
            available_quantity = request.data.get('available_quantity')
            if available_quantity is not None:
                item.available_quantity = available_quantity
        else:
            # Для других статусов обнуляем available_quantity
            item.available_quantity = None

        item.save()

        # Возвращаем обновленную позицию
        serializer = self.get_serializer(item)
        return Response(serializer.data)


class MaterialRequestDocumentViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с документами заявок."""

    queryset = MaterialRequestDocument.objects.all().select_related('request', 'uploaded_by')
    serializer_class = MaterialRequestDocumentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['request', 'document_type']


class MaterialRequestCommentViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с комментариями к заявкам."""

    queryset = MaterialRequestComment.objects.all().select_related('request', 'author')
    serializer_class = MaterialRequestCommentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['request', 'author']
