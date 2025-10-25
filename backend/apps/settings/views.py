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
    permission_classes = [CanAccessSettings]

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
