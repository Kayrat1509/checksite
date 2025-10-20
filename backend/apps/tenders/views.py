from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from .models import Tender, TenderDocument, TenderBid
from .serializers import (
    TenderListSerializer,
    TenderDetailSerializer,
    TenderCreateSerializer,
    TenderUpdateSerializer,
    TenderDocumentSerializer,
    TenderBidSerializer
)
from .permissions import CanManageTenders


class TenderViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления тендерами.
    Доступно: ИТР и Руководство
    """
    permission_classes = [CanManageTenders]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'tender_type', 'project']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'deadline', 'budget_max']
    ordering = ['-created_at']

    def get_queryset(self):
        """Возвращаем тендеры в зависимости от роли пользователя"""
        user = self.request.user

        # Базовый queryset с оптимизацией запросов
        queryset = Tender.objects.select_related(
            'project', 'created_by', 'responsible', 'winner'
        ).prefetch_related('bids')

        # Суперадмин видит все
        if user.is_superuser:
            return queryset

        # Руководство видит все тендеры
        if user.role in ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER']:
            return queryset

        # ИТР видят тендеры своих проектов
        return queryset.filter(project__team_members=user).distinct()

    def get_serializer_class(self):
        """Выбираем сериализатор в зависимости от действия"""
        if self.action == 'list':
            return TenderListSerializer
        elif self.action == 'create':
            return TenderCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return TenderUpdateSerializer
        return TenderDetailSerializer

    def perform_create(self, serializer):
        """Устанавливаем создателя при создании тендера"""
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Опубликовать тендер (перевести в статус PUBLISHED)"""
        tender = self.get_object()
        
        if tender.status != Tender.Status.DRAFT:
            return Response(
                {'error': 'Только черновики можно публиковать'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tender.status = Tender.Status.PUBLISHED
        tender.published_at = timezone.now()
        tender.save()
        
        serializer = self.get_serializer(tender)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Закрыть тендер"""
        tender = self.get_object()
        
        if tender.status == Tender.Status.CLOSED:
            return Response(
                {'error': 'Тендер уже закрыт'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tender.status = Tender.Status.CLOSED
        tender.save()
        
        serializer = self.get_serializer(tender)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Отменить тендер"""
        tender = self.get_object()
        
        if tender.status == Tender.Status.CLOSED:
            return Response(
                {'error': 'Закрытый тендер нельзя отменить'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tender.status = Tender.Status.CANCELLED
        tender.save()
        
        serializer = self.get_serializer(tender)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def select_winner(self, request, pk=None):
        """Выбрать победителя тендера"""
        tender = self.get_object()
        bid_id = request.data.get('bid_id')
        
        if not bid_id:
            return Response(
                {'error': 'Необходимо указать ID заявки (bid_id)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            bid = TenderBid.objects.get(id=bid_id, tender=tender)
        except TenderBid.DoesNotExist:
            return Response(
                {'error': 'Заявка не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        tender.winner = bid.participant
        tender.status = Tender.Status.CLOSED
        tender.save()
        
        serializer = self.get_serializer(tender)
        return Response(serializer.data)


class TenderDocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления документами тендера.
    Доступно: ИТР и Руководство
    """
    permission_classes = [CanManageTenders]
    serializer_class = TenderDocumentSerializer

    def get_queryset(self):
        """Возвращаем документы тендеров, к которым есть доступ"""
        user = self.request.user
        
        # Суперадмин видит все
        if user.is_superuser:
            return TenderDocument.objects.all()
        
        # Руководство видит все документы
        if user.role in ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER']:
            return TenderDocument.objects.all()
        
        # ИТР видят документы тендеров своих проектов
        return TenderDocument.objects.filter(tender__project__team_members=user).distinct()

    def perform_create(self, serializer):
        """Устанавливаем загрузившего при создании документа"""
        serializer.save(uploaded_by=self.request.user)


class TenderBidViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления заявками на тендер.
    Доступно: ИТР и Руководство
    """
    permission_classes = [CanManageTenders]
    serializer_class = TenderBidSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['tender', 'participant']
    ordering_fields = ['created_at', 'price']
    ordering = ['-created_at']

    def get_queryset(self):
        """Возвращаем заявки тендеров, к которым есть доступ"""
        user = self.request.user
        
        # Суперадмин видит все
        if user.is_superuser:
            return TenderBid.objects.all()
        
        # Руководство видит все заявки
        if user.role in ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER']:
            return TenderBid.objects.all()
        
        # ИТР видят заявки тендеров своих проектов
        return TenderBid.objects.filter(tender__project__team_members=user).distinct()

    def perform_create(self, serializer):
        """Устанавливаем создателя при создании заявки"""
        serializer.save(created_by=self.request.user)
