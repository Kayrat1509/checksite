from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import RoleTemplate
from .serializers import (
    RoleTemplateSerializer,
    UserAccessInfoSerializer
)
from apps.users.permissions import CanAccessSettings
from apps.users.models import User
from apps.users.serializers import UserSerializer

# PageAccessViewSet удалён - используйте ButtonAccessViewSet из apps.core
# Новый endpoint: /api/button-access/page_access/
# AccessManagementViewSet удалён - функциональность перенесена в ButtonAccess


class RoleTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet для управления шаблонами ролей."""

    serializer_class = RoleTemplateSerializer
    permission_classes = [CanAccessSettings]

    def get_queryset(self):
        """Возвращаем только шаблоны компании пользователя."""
        return RoleTemplate.objects.filter(company=self.request.user.company)

    @action(detail=True, methods=['post'], url_path='apply-to-user')
    def apply_to_user(self, request, pk=None):
        """
        Применить шаблон к пользователю.

        POST /api/settings/role-templates/{id}/apply-to-user/
        Body: { "user_id": 123 }

        Применяет права доступа из шаблона к указанному пользователю.
        """
        template = self.get_object()
        user_id = request.data.get('user_id')

        if not user_id:
            return Response(
                {'error': 'Параметр user_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(id=user_id, company=request.user.company)
        except User.DoesNotExist:
            return Response(
                {'error': 'Пользователь не найден в вашей компании'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Применяем шаблон
        template.apply_to_user(user)

        return Response({
            'message': f'Шаблон "{template.name}" применен к пользователю {user.get_full_name()}',
            'user': UserSerializer(user).data,
            'template': RoleTemplateSerializer(template).data
        })

    @action(detail=False, methods=['get'], url_path='for-role/(?P<role>[^/.]+)')
    def for_role(self, request, role=None):
        """
        Получить шаблоны для конкретной роли.

        GET /api/settings/role-templates/for-role/DIRECTOR/

        Возвращает все шаблоны для указанной роли в компании пользователя.
        """
        templates = self.get_queryset().filter(role=role)
        serializer = self.get_serializer(templates, many=True)
        return Response(serializer.data)
