from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import TechnicalCondition
from .serializers import (
    TechnicalConditionSerializer,
    TechnicalConditionCreateSerializer,
    TechnicalConditionUpdateSerializer
)
import logging

# Логгер для отладки
logger = logging.getLogger(__name__)


class CanManageTechnicalConditions(IsAuthenticated):
    """
    Право на добавление/редактирование/удаление техусловий.
    Доступно: Инженер ПТО, Главный инженер, Начальник участка, Прораб, Руководитель проекта, Директор
    """

    def has_permission(self, request, view):
        # Сначала проверяем базовую аутентификацию
        if not super().has_permission(request, view):
            return False

        # Суперадмин всегда имеет доступ
        if request.user.is_superuser:
            return True

        # Разрешенные роли для управления техусловиями
        allowed_roles = [
            'ENGINEER',           # Инженер ПТО
            'CHIEF_ENGINEER',     # Главный инженер
            'SITE_MANAGER',       # Начальник участка
            'FOREMAN',            # Прораб
            'PROJECT_MANAGER',    # Руководитель проекта
            'DIRECTOR'            # Директор
        ]

        # Проверяем роль пользователя
        return request.user.role in allowed_roles


class TechnicalConditionViewSet(viewsets.ModelViewSet):
    """ViewSet для управления техническими условиями."""

    queryset = TechnicalCondition.objects.all()
    serializer_class = TechnicalConditionSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]  # Для загрузки файлов

    def get_serializer_class(self):
        """Возвращает соответствующий сериализатор в зависимости от действия."""
        if self.action == 'create':
            return TechnicalConditionCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return TechnicalConditionUpdateSerializer
        return TechnicalConditionSerializer

    def get_permissions(self):
        """
        Установка прав доступа.
        Просмотр доступен всем авторизованным пользователям.
        Создание, редактирование и удаление - только для разрешенных ролей.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [CanManageTechnicalConditions()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        """Создание нового техусловия с логированием."""
        # Логируем входящие данные для отладки
        logger.info(f"POST data: {request.data}")
        logger.info(f"FILES: {request.FILES}")
        logger.info(f"User: {request.user}, Role: {request.user.role if hasattr(request.user, 'role') else 'N/A'}")

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            # Логируем ошибки валидации
            logger.error(f"Validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        """Сохраняет техусловие с указанием автора."""
        serializer.save(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """Удаление техусловия."""
        instance = self.get_object()

        # Удаляем файл с диска
        if instance.file:
            instance.file.delete(save=False)

        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
