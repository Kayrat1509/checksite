from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import PageAccess, RoleTemplate
from .serializers import (
    PageAccessSerializer, AccessMatrixSerializer,
    RoleTemplateSerializer, UserAccessManagementSerializer,
    UserAccessInfoSerializer
)
from apps.users.permissions import CanAccessSettings
from apps.users.models import User
from apps.users.serializers import UserSerializer


class PageAccessViewSet(viewsets.ModelViewSet):
    """ViewSet для управления доступом к страницам."""

    queryset = PageAccess.objects.all()
    serializer_class = PageAccessSerializer

    def get_permissions(self):
        """
        Разные permissions для разных action'ов.
        - my-pages: доступно всем аутентифицированным пользователям
        - matrix: только для управленцев (Начальник участка и выше)
        """
        if self.action == 'my_pages':
            return [IsAuthenticated()]
        return [CanAccessSettings()]

    @action(detail=False, methods=['get', 'post', 'put'], url_path='matrix')
    def access_matrix(self, request):
        """
        Управление матрицей доступа для компании пользователя.
        GET /api/settings/page-access/matrix/ - получение матрицы
        POST/PUT /api/settings/page-access/matrix/ - обновление матрицы
        """
        # Получаем компанию пользователя
        user_company = request.user.company
        if not user_company:
            return Response(
                {'error': 'Пользователь не привязан к компании'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if request.method == 'GET':
            # Получение матрицы доступа для компании пользователя
            serializer = AccessMatrixSerializer(context={'company': user_company})
            data = serializer.to_representation(None)
            return Response(data)

        elif request.method in ['POST', 'PUT']:
            # Обновление матрицы доступа для компании пользователя
            serializer = AccessMatrixSerializer(
                data=request.data,
                context={'company': user_company}
            )

            if serializer.is_valid():
                serializer.create(serializer.validated_data)
                return Response(
                    {'message': f'Матрица доступа для компании "{user_company.name}" успешно обновлена', 'data': serializer.data},
                    status=status.HTTP_200_OK
                )

            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='my-pages')
    def my_pages(self, request):
        """
        Получение списка страниц, доступных текущему пользователю.
        GET /api/settings/page-access/my-pages/

        Возвращает список slug'ов страниц, к которым у пользователя есть доступ.
        Используется для динамической фильтрации меню на frontend.
        """
        user = request.user

        # SUPERADMIN имеет доступ ко всем страницам
        if user.is_superuser or (hasattr(user, 'role') and user.role == 'SUPERADMIN'):
            all_pages = [choice[0] for choice in PageAccess.PageChoices.choices]
            return Response({
                'pages': all_pages,
                'is_superadmin': True
            })

        # Проверяем, что у пользователя есть компания
        if not user.company:
            return Response(
                {'error': 'Пользователь не привязан к компании', 'pages': []},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Получаем страницы, доступные для роли пользователя в его компании
        user_role = user.role
        allowed_pages = PageAccess.objects.filter(
            company=user.company,
            role=user_role,
            has_access=True
        ).values_list('page', flat=True)

        return Response({
            'pages': list(allowed_pages),
            'role': user_role,
            'company': user.company.name,
            'is_superadmin': False
        })


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


class AccessManagementViewSet(viewsets.GenericViewSet):
    """ViewSet для управления доступом пользователей к страницам."""

    permission_classes = [CanAccessSettings]

    @action(detail=False, methods=['get'], url_path='users-access')
    def users_access(self, request):
        """
        Получить список пользователей компании с их доступами.

        GET /api/settings/access-management/users-access/

        Возвращает информацию о всех пользователях компании и их правах доступа.
        """
        users = User.objects.filter(company=request.user.company).exclude(is_superuser=True)

        result = []
        for user in users:
            # Получаем разрешенные страницы для роли пользователя
            allowed_pages = PageAccess.objects.filter(
                company=user.company,
                role=user.role,
                has_access=True
            ).values_list('page', flat=True)

            result.append({
                'id': user.id,
                'full_name': user.get_full_name(),
                'email': user.email,
                'role': user.role,
                'role_display': user.get_role_display(),
                'role_category': user.get_role_category(),
                'has_full_access': user.has_full_access,
                'is_company_owner': user.is_company_owner,
                'is_active': user.is_active,
                'allowed_pages': list(allowed_pages)
            })

        return Response(result)

    @action(detail=False, methods=['post'], url_path='update-user-access')
    def update_user_access(self, request):
        """
        Обновить доступ пользователя к страницам.

        POST /api/settings/access-management/update-user-access/
        Body: {
            "user_id": 123,
            "allowed_pages": ["dashboard", "projects", "issues"]
        }

        Обновляет права доступа для роли указанного пользователя.
        """
        serializer = UserAccessManagementSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'message': f'Доступ обновлен для пользователя {user.get_full_name()}',
                'user': UserSerializer(user).data
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='available-pages')
    def available_pages(self, request):
        """
        Получить список всех доступных страниц системы.

        GET /api/settings/access-management/available-pages/

        Возвращает список всех страниц, которые могут быть назначены пользователям.
        """
        pages = [
            {
                'slug': choice[0],
                'name': choice[1]
            }
            for choice in PageAccess.PageChoices.choices
        ]
        return Response({'pages': pages})

    @action(detail=False, methods=['get'], url_path='available-roles')
    def available_roles(self, request):
        """
        Получить список всех доступных ролей.

        GET /api/settings/access-management/available-roles/

        Возвращает список всех ролей в системе.
        """
        roles = [
            {
                'slug': choice[0],
                'name': choice[1]
            }
            for choice in User.Role.choices
        ]
        return Response({'roles': roles})
