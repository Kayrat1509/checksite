"""
Views для публичного API тендеров
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth.hashers import check_password
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Tender, PublicTenderAccess
from .public_serializers import (
    PublicTenderSerializer,
    PublicTenderAccessRegisterSerializer,
    PublicTenderAccessLoginSerializer,
    PublicTenderAccessSerializer
)


class PublicTenderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для просмотра публичного списка тендеров.
    Доступно только зарегистрированным внешним пользователям (PublicTenderAccess).
    """
    queryset = Tender.objects.filter(status=Tender.Status.PUBLISHED).select_related(
        'project', 'project__project_manager'
    )
    serializer_class = PublicTenderSerializer
    permission_classes = [AllowAny]  # Временно, потом добавим кастомный permission
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tender_type', 'city']
    search_fields = ['title', 'description', 'company_name']
    ordering_fields = ['created_at', 'budget']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Фильтрация по бюджету"""
        queryset = super().get_queryset()
        
        # Фильтр по минимальному бюджету
        budget_min = self.request.query_params.get('budget_min')
        if budget_min:
            queryset = queryset.filter(budget__gte=budget_min)
        
        # Фильтр по максимальному бюджету
        budget_max = self.request.query_params.get('budget_max')
        if budget_max:
            queryset = queryset.filter(budget__lte=budget_max)
        
        return queryset


@api_view(['POST'])
@permission_classes([AllowAny])
def public_tender_register(request):
    """
    Регистрация нового внешнего пользователя для доступа к публичным тендерам.
    После регистрации заявка отправляется на модерацию.
    """
    serializer = PublicTenderAccessRegisterSerializer(data=request.data)
    
    if serializer.is_valid():
        access = serializer.save()
        return Response({
            'message': 'Заявка на регистрацию успешно отправлена. '
                      'После модерации вы получите доступ к просмотру тендеров.',
            'email': access.email,
            'status': access.status
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def public_tender_login(request):
    """
    Вход для внешнего пользователя в публичный раздел тендеров.
    Возвращает JWT токен для доступа к API.
    """
    serializer = PublicTenderAccessLoginSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    email = serializer.validated_data['email']
    password = serializer.validated_data['password']
    
    try:
        access = PublicTenderAccess.objects.get(email=email, is_active=True)
    except PublicTenderAccess.DoesNotExist:
        return Response({
            'error': 'Неверный email или пароль'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Проверка статуса
    if access.status != PublicTenderAccess.Status.APPROVED:
        if access.status == PublicTenderAccess.Status.PENDING:
            return Response({
                'error': 'Ваша заявка еще не одобрена. Ожидайте модерации.'
            }, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({
                'error': 'Ваша заявка была отклонена. ' + (access.rejection_reason or '')
            }, status=status.HTTP_403_FORBIDDEN)
    
    # Проверка пароля
    if not check_password(password, access.password):
        return Response({
            'error': 'Неверный email или пароль'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Обновление времени последнего входа
    access.last_login = timezone.now()
    access.save(update_fields=['last_login'])
    
    # Генерация токенов (используем простой подход без JWT для публичных пользователей)
    # Для полноценной реализации можно создать отдельную модель токенов
    return Response({
        'message': 'Вход выполнен успешно',
        'access_id': access.id,
        'company_name': access.company_name,
        'contact_person': access.contact_person
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_tender_status(request):
    """
    Проверка статуса заявки на доступ по email.
    """
    email = request.query_params.get('email')
    
    if not email:
        return Response({
            'error': 'Параметр email обязателен'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        access = PublicTenderAccess.objects.get(email=email)
        serializer = PublicTenderAccessSerializer(access)
        return Response(serializer.data)
    except PublicTenderAccess.DoesNotExist:
        return Response({
            'error': 'Заявка с указанным email не найдена'
        }, status=status.HTTP_404_NOT_FOUND)
