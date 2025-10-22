from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import WarehouseReceipt
from .serializers import (
    WarehouseReceiptListSerializer,
    WarehouseReceiptDetailSerializer,
    WarehouseReceiptCreateSerializer,
    WarehouseReceiptUpdateSerializer
)


class WarehouseReceiptViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления складскими поступлениями.

    Позволяет:
    - Просматривать список всех поступлений
    - Создавать новые записи о поступлении материалов
    - Редактировать существующие записи
    - Удалять записи (только для суперадминов)
    - Фильтровать по проекту, материалу, дате
    """

    queryset = WarehouseReceipt.objects.select_related(
        'project',
        'material_request',
        'material_item',
        'received_by'
    ).all()

    permission_classes = [permissions.IsAuthenticated]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['project', 'material_request', 'quality_status', 'received_by']
    search_fields = ['material_item__material_name', 'waybill_number', 'supplier', 'notes']
    ordering_fields = ['receipt_date', 'received_quantity', 'created_at']
    ordering = ['-receipt_date', '-created_at']

    def get_serializer_class(self):
        """Выбор сериализатора в зависимости от действия."""
        if self.action == 'list':
            return WarehouseReceiptListSerializer
        elif self.action == 'create':
            return WarehouseReceiptCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return WarehouseReceiptUpdateSerializer
        return WarehouseReceiptDetailSerializer

    def get_queryset(self):
        """
        Фильтрация записей в зависимости от роли пользователя.

        - Суперадмины и заведующие складом видят все записи
        - Остальные пользователи видят записи только своих проектов
        """
        user = self.request.user
        queryset = super().get_queryset()

        # Суперадмины и заведующие складом видят всё
        if user.is_superuser or user.role == 'WAREHOUSE_HEAD':
            return queryset

        # Остальные видят только свои проекты
        user_projects = user.projects.all()
        return queryset.filter(project__in=user_projects)
