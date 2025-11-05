# apps/tasks/views.py
"""
ViewSet для управления задачами через REST API.
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q

from .models import Task
from .serializers import (
    TaskListSerializer,
    TaskDetailSerializer,
    TaskCreateSerializer,
    TaskUpdateSerializer,
    TaskRejectSerializer,
    TaskCompleteSerializer,
)


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления задачами.

    Список endpoints:
    - GET /api/tasks/ - список задач (с фильтрацией)
    - POST /api/tasks/ - создать задачу
    - GET /api/tasks/{id}/ - детали задачи
    - PUT /api/tasks/{id}/ - обновить задачу
    - DELETE /api/tasks/{id}/ - удалить задачу (soft delete)
    - POST /api/tasks/{id}/complete/ - отметить выполненной
    - POST /api/tasks/{id}/reject/ - отменить задачу
    - GET /api/tasks/my/ - мои задачи (где я исполнитель)
    - GET /api/tasks/created/ - созданные мной задачи
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'created_by', 'assigned_to_user', 'assigned_to_contractor', 'project', 'company']
    search_fields = ['task_number', 'title', 'description']
    ordering_fields = ['created_at', 'deadline', 'updated_at', 'task_number']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Возвращает задачи компании текущего пользователя (без удаленных).
        """
        user = self.request.user

        # Базовый queryset - только задачи компании пользователя и не удаленные
        queryset = Task.objects.filter(
            company=user.company,
            is_deleted=False
        ).select_related(
            'created_by',
            'assigned_to_user',
            'assigned_to_contractor',
            'company',
            'project'
        )

        # Дополнительные фильтры из query params
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Фильтр по проекту
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        return queryset

    def get_serializer_class(self):
        """
        Выбирает сериализатор в зависимости от действия.
        """
        if self.action == 'list':
            return TaskListSerializer
        elif self.action == 'create':
            return TaskCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return TaskUpdateSerializer
        elif self.action == 'reject':
            return TaskRejectSerializer
        elif self.action == 'complete':
            return TaskCompleteSerializer
        else:
            return TaskDetailSerializer

    def perform_destroy(self, instance):
        """
        Soft delete - перемещаем задачу в корзину вместо удаления.
        """
        instance.soft_delete()

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        Отмечает задачу как выполненную.

        POST /api/tasks/{id}/complete/
        """
        task = self.get_object()

        # Проверяем, что задача еще не выполнена
        if task.status == Task.STATUS_COMPLETED:
            return Response(
                {'detail': 'Задача уже отмечена как выполненная'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Проверяем, что задача не отменена
        if task.status == Task.STATUS_REJECTED:
            return Response(
                {'detail': 'Нельзя выполнить отмененную задачу'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Отмечаем задачу как выполненную
        task.mark_as_completed(user=request.user)

        serializer = TaskDetailSerializer(task)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Отменяет задачу с указанием причины.

        POST /api/tasks/{id}/reject/
        Body: {"rejection_reason": "Причина отмены"}
        """
        task = self.get_object()

        # Проверяем, что задача еще не отменена
        if task.status == Task.STATUS_REJECTED:
            return Response(
                {'detail': 'Задача уже отменена'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Проверяем, что задача не выполнена
        if task.status == Task.STATUS_COMPLETED:
            return Response(
                {'detail': 'Нельзя отменить выполненную задачу'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Отменяем задачу
        task.mark_as_rejected(
            reason=serializer.validated_data['rejection_reason'],
            user=request.user
        )

        result_serializer = TaskDetailSerializer(task)
        return Response(result_serializer.data)

    @action(detail=False, methods=['get'])
    def my(self, request):
        """
        Возвращает список задач, где текущий пользователь является исполнителем.

        GET /api/tasks/my/
        """
        user = request.user
        queryset = self.get_queryset().filter(
            Q(assigned_to_user=user) | Q(assigned_to_contractor=user)
        )

        # Применяем фильтры и сортировку
        queryset = self.filter_queryset(queryset)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = TaskListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = TaskListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def created(self, request):
        """
        Возвращает список задач, созданных текущим пользователем.

        GET /api/tasks/created/
        """
        queryset = self.get_queryset().filter(created_by=request.user)

        # Применяем фильтры и сортировку
        queryset = self.filter_queryset(queryset)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = TaskListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = TaskListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Возвращает статистику по задачам текущей компании.

        GET /api/tasks/stats/
        """
        queryset = self.get_queryset()

        stats = {
            'total': queryset.count(),
            'in_progress': queryset.filter(status=Task.STATUS_IN_PROGRESS).count(),
            'completed': queryset.filter(status=Task.STATUS_COMPLETED).count(),
            'overdue': queryset.filter(status=Task.STATUS_OVERDUE).count(),
            'rejected': queryset.filter(status=Task.STATUS_REJECTED).count(),
        }

        return Response(stats)
