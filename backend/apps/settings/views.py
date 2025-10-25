from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import PageAccess
from .serializers import PageAccessSerializer, AccessMatrixSerializer
from apps.users.permissions import CanAccessSettings


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
