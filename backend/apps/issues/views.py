from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db import models
from .models import Issue, IssuePhoto, IssueComment
from .serializers import (
    IssueSerializer, IssueListSerializer, IssueCreateSerializer,
    IssueUpdateSerializer, IssueStatusUpdateSerializer,
    IssuePhotoSerializer, IssueCommentSerializer
)
from apps.users.permissions import CanCreateIssues, CanVerifyIssues


class IssueViewSet(viewsets.ModelViewSet):
    """ViewSet for managing issues."""

    queryset = Issue.objects.select_related(
        'project', 'site', 'category', 'created_by', 'assigned_to', 'verified_by'
    ).prefetch_related('photos', 'comments')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'project', 'site', 'category', 'assigned_to']
    search_fields = ['title', 'description', 'location_notes']
    ordering_fields = ['created_at', 'deadline', 'priority', 'status']

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return IssueListSerializer
        elif self.action == 'create':
            return IssueCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return IssueUpdateSerializer
        elif self.action == 'update_status':
            return IssueStatusUpdateSerializer
        return IssueSerializer

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action == 'create':
            return [CanCreateIssues()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        """Create issue with photos support."""
        from apps.projects.models import Site

        # Извлекаем файлы фото из запроса
        photos_before = request.FILES.getlist('photos_before', [])
        photos_after = request.FILES.getlist('photos_after', [])

        # Если site не указан, создаем или используем участок по умолчанию
        if 'site' not in request.data or not request.data['site']:
            project_id = request.data.get('project')
            if project_id:
                site, created = Site.objects.get_or_create(
                    project_id=project_id,
                    name='По умолчанию',
                    defaults={'description': 'Автоматически созданный участок'}
                )
                request.data._mutable = True
                request.data['site'] = site.id
                request.data._mutable = False

        # Создаем замечание
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        issue = serializer.save()

        # Загружаем фото "До"
        for photo_file in photos_before:
            IssuePhoto.objects.create(
                issue=issue,
                photo=photo_file,
                stage=IssuePhoto.Stage.BEFORE,
                uploaded_by=request.user
            )

        # Загружаем фото "После"
        for photo_file in photos_after:
            IssuePhoto.objects.create(
                issue=issue,
                photo=photo_file,
                stage=IssuePhoto.Stage.AFTER,
                uploaded_by=request.user
            )

        # Возвращаем полные данные замечания
        headers = self.get_success_headers(serializer.data)
        return Response(
            IssueSerializer(issue).data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )

    def get_queryset(self):
        """Filter issues based on user company and assigned projects."""
        user = self.request.user
        queryset = super().get_queryset()

        # Superadmin видит все замечания
        if user.is_superuser:
            return queryset

        # Пользователи без компании не видят замечания
        if not user.company:
            return queryset.none()

        # Фильтруем по компании пользователя
        queryset = queryset.filter(project__company=user.company)

        # Руководство видит все замечания своей компании
        if user.is_management:
            return queryset

        # ИТР и Технадзор видят замечания в проектах, где они участники
        if user.is_itr or user.is_supervisor:
            return queryset.filter(
                models.Q(project__project_manager=user) |
                models.Q(project__team_members=user) |
                models.Q(created_by=user)
            ).distinct()

        # Подрядчики видят только назначенные им замечания
        return queryset.filter(assigned_to=user)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update issue status with validation."""
        issue = self.get_object()
        serializer = self.get_serializer(
            data=request.data,
            context={'request': request, 'issue': issue}
        )
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']
        comment_text = serializer.validated_data.get('comment', '')

        # Update status
        issue.status = new_status

        # Handle status-specific logic
        if new_status == Issue.Status.COMPLETED:
            issue.completed_at = timezone.now()
            issue.verified_by = request.user

        elif new_status == Issue.Status.OVERDUE:
            # This should be set automatically by task
            pass

        issue.save()

        # Add comment if provided
        if comment_text:
            IssueComment.objects.create(
                issue=issue,
                author=request.user,
                text=comment_text
            )

        return Response({
            'message': f'Статус изменен на "{issue.get_status_display()}"',
            'issue': IssueSerializer(issue).data
        })

    @action(detail=True, methods=['post'])
    def upload_photo(self, request, pk=None):
        """Upload a photo for the issue."""
        issue = self.get_object()

        serializer = IssuePhotoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        photo = serializer.save(
            issue=issue,
            uploaded_by=request.user
        )

        return Response(
            IssuePhotoSerializer(photo).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        """Add a comment to the issue."""
        issue = self.get_object()

        serializer = IssueCommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comment = serializer.save(
            issue=issue,
            author=request.user
        )

        return Response(
            IssueCommentSerializer(comment).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'])
    def my_issues(self, request):
        """Get issues assigned to current user."""
        issues = self.get_queryset().filter(assigned_to=request.user)
        serializer = IssueListSerializer(issues, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pending_review(self, request):
        """Get issues pending review."""
        if not request.user.can_verify_issues:
            return Response(
                {'error': 'У вас нет прав для просмотра'},
                status=status.HTTP_403_FORBIDDEN
            )

        issues = self.get_queryset().filter(status=Issue.Status.PENDING_REVIEW)
        serializer = IssueListSerializer(issues, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue issues."""
        issues = self.get_queryset().filter(
            deadline__lt=timezone.now(),
            status__in=[Issue.Status.NEW, Issue.Status.IN_PROGRESS, Issue.Status.PENDING_REVIEW]
        )
        serializer = IssueListSerializer(issues, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get issue statistics."""
        queryset = self.get_queryset()

        stats = {
            'total': queryset.count(),
            'new': queryset.filter(status=Issue.Status.NEW).count(),
            'in_progress': queryset.filter(status=Issue.Status.IN_PROGRESS).count(),
            'pending_review': queryset.filter(status=Issue.Status.PENDING_REVIEW).count(),
            'completed': queryset.filter(status=Issue.Status.COMPLETED).count(),
            'overdue': queryset.filter(
                deadline__lt=timezone.now(),
                status__in=[Issue.Status.NEW, Issue.Status.IN_PROGRESS, Issue.Status.PENDING_REVIEW]
            ).count(),
            'by_priority': {
                'critical': queryset.filter(priority=Issue.Priority.CRITICAL).count(),
                'high': queryset.filter(priority=Issue.Priority.HIGH).count(),
                'normal': queryset.filter(priority=Issue.Priority.NORMAL).count(),
            }
        }

        return Response(stats)


class IssuePhotoViewSet(viewsets.ModelViewSet):
    """ViewSet for managing issue photos."""

    queryset = IssuePhoto.objects.all()
    serializer_class = IssuePhotoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['issue', 'stage']


class IssueCommentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing issue comments."""

    queryset = IssueComment.objects.all()
    serializer_class = IssueCommentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['issue', 'author']

    def perform_create(self, serializer):
        """Set author to current user."""
        serializer.save(author=self.request.user)
