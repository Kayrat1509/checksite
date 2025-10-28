from rest_framework import viewsets, filters, status as http_status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
from .models import Project, Site, Category, Drawing
from .serializers import (
    ProjectSerializer, ProjectListSerializer,
    SiteSerializer, CategorySerializer, DrawingSerializer,
    ProjectImportSerializer
)
from apps.users.permissions import (
    IsManagementOrSuperAdmin, CanManageProjects, CanManageProjectsAndDrawings
)


class ProjectViewSet(viewsets.ModelViewSet):
    """ViewSet for managing projects."""

    queryset = Project.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'project_manager']
    search_fields = ['name', 'address', 'customer']
    ordering_fields = ['name', 'created_at', 'start_date']

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return ProjectListSerializer
        return ProjectSerializer

    def get_permissions(self):
        """
        Установка прав доступа в зависимости от действия.
        Создание/редактирование/удаление доступно только для:
        Директор, Главный инженер, Руководитель проекта, Начальник участка, Инженер ПТО.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [CanManageProjectsAndDrawings()]
        return [IsAuthenticated()]

    def get_queryset(self):
        """
        Фильтрация проектов на основе компании пользователя и закрепленных проектов.

        Логика доступа:
        - Superadmin: видит все проекты всех компаний
        - Директор, Главный инженер (is_management): видят все проекты своей компании
        - ВСЕ ОСТАЛЬНЫЕ пользователи (включая Руководитель проекта, Начальник участка, Инженер ПТО и др.):
          видят ТОЛЬКО проекты, где они назначены как project_manager или team_members
        """
        from apps.users.models import User
        user = self.request.user

        # Superadmin видит все проекты всех компаний
        if user.is_superuser:
            return Project.objects.all()

        # Пользователи без компании не видят проекты
        if not user.company:
            return Project.objects.none()

        # Только Директор и Главный инженер видят все проекты своей компании
        # (is_management включает: SUPERADMIN, DIRECTOR, CHIEF_ENGINEER)
        if user.is_management:
            return Project.objects.filter(company=user.company)

        # ВСЕ ОСТАЛЬНЫЕ пользователи (включая PROJECT_MANAGER, SITE_MANAGER, ENGINEER и т.д.)
        # видят только проекты, где они назначены участниками или руководителями
        return Project.objects.filter(
            company=user.company
        ).filter(
            models.Q(project_manager=user) |
            models.Q(team_members=user)
        ).distinct()

    def perform_create(self, serializer):
        """Set the company and project_manager when creating a project."""
        # Автоматически привязываем проект к компании пользователя
        if not serializer.validated_data.get('company') and self.request.user.company:
            serializer.validated_data['company'] = self.request.user.company

        # Устанавливаем project_manager, если не указан
        if not serializer.validated_data.get('project_manager'):
            serializer.save(project_manager=self.request.user)
        else:
            serializer.save()

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        """Add a team member to the project."""
        project = self.get_object()
        user_id = request.data.get('user_id')

        if not user_id:
            return Response({'error': 'user_id required'}, status=400)

        project.team_members.add(user_id)
        return Response({'message': 'Участник добавлен'})

    @action(detail=True, methods=['post'])
    def remove_member(self, request, pk=None):
        """Remove a team member from the project."""
        project = self.get_object()
        user_id = request.data.get('user_id')

        if not user_id:
            return Response({'error': 'user_id required'}, status=400)

        project.team_members.remove(user_id)
        return Response({'message': 'Участник удален'})

    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Get detailed project statistics."""
        project = self.get_object()

        stats = {
            'total_issues': project.total_issues,
            'completed_issues': project.completed_issues,
            'progress_percentage': project.progress_percentage,
            'total_sites': project.sites.count(),
            'team_size': project.team_members.count(),
        }

        return Response(stats)

    @action(detail=True, methods=['get'])
    def contractors(self, request, pk=None):
        """Get contractors assigned to this project."""
        from apps.users.serializers import UserSerializer
        project = self.get_object()
        contractors = project.team_members.filter(role='CONTRACTOR')
        serializer = UserSerializer(contractors, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='download-template')
    def download_template(self, request):
        """
        Скачать шаблон Excel для импорта проектов.

        GET /api/projects/download-template/

        Возвращает Excel файл с заголовками:
        - Наименование объекта*
        - Страна
        - Адрес*
        """
        from .utils import generate_excel_template
        return generate_excel_template()

    @action(detail=False, methods=['post'], url_path='import-excel', parser_classes=[MultiPartParser, FormParser])
    def import_excel(self, request):
        """
        Импортировать проекты из Excel файла.

        POST /api/projects/import-excel/

        Ожидается multipart/form-data с файлом 'file'.

        Структура Excel файла:
        - Наименование объекта* (обязательное)
        - Страна (необязательное)
        - Адрес* (обязательное)

        Возвращает:
        {
            "success": true,
            "created": 10,
            "errors": []
        }
        """
        from .utils import parse_excel_file

        # Валидация файла через сериализатор
        serializer = ProjectImportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'success': False, 'errors': serializer.errors},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        # Парсим Excel файл
        file = serializer.validated_data['file']
        result = parse_excel_file(file)

        if not result['success']:
            return Response(
                {'success': False, 'errors': result['errors']},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        # Создаем проекты
        created_count = 0
        errors = []

        for idx, project_data in enumerate(result['data'], start=2):
            try:
                # Проверяем, есть ли уже проект с таким названием в компании
                existing_project = Project.objects.filter(
                    company=request.user.company,
                    name=project_data['name']
                ).first()

                if existing_project:
                    errors.append(
                        f'Строка {idx}: Проект "{project_data["name"]}" уже существует'
                    )
                    continue

                # Создаем новый проект
                Project.objects.create(
                    company=request.user.company,
                    name=project_data['name'],
                    address=project_data['address'],
                    customer=project_data.get('customer', ''),
                    project_manager=request.user
                )
                created_count += 1

            except Exception as e:
                errors.append(f'Строка {idx}: Ошибка при создании проекта - {str(e)}')

        return Response({
            'success': True,
            'created': created_count,
            'errors': errors
        })

    @action(detail=False, methods=['get'], url_path='export-excel')
    def export_excel(self, request):
        """
        Экспортировать все проекты компании в Excel файл.

        GET /api/projects/export-excel/

        Структура экспорта:
        - Наименование объекта
        - Страна
        - Адрес
        - Закреплённые сотрудники
        - Надзоры
        - Подрядчики

        Возвращает Excel файл для скачивания.
        """
        from .utils import generate_excel_export

        # Получаем все проекты пользователя (с учетом прав доступа)
        projects = self.get_queryset().select_related(
            'company', 'project_manager'
        ).prefetch_related(
            'team_members', 'supervisions', 'contractors'
        )

        return generate_excel_export(projects)


class SiteViewSet(viewsets.ModelViewSet):
    """ViewSet for managing construction sites."""

    queryset = Site.objects.all()
    serializer_class = SiteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['project', 'is_active', 'site_manager']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManagementOrSuperAdmin()]
        return [IsAuthenticated()]


class CategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for managing issue categories."""

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']

    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManagementOrSuperAdmin()]
        return [IsAuthenticated()]


class DrawingViewSet(viewsets.ModelViewSet):
    """ViewSet for managing project drawings (PDF files)."""

    queryset = Drawing.objects.all()
    serializer_class = DrawingSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['project']
    search_fields = ['file_name']
    ordering_fields = ['created_at', 'file_name']

    def get_permissions(self):
        """
        Установка прав доступа в зависимости от действия.
        Создание/редактирование/удаление чертежей доступно только для:
        Директор, Главный инженер, Руководитель проекта, Начальник участка, Инженер ПТО.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [CanManageProjectsAndDrawings()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """Set the uploaded_by field to the current user."""
        serializer.save(uploaded_by=self.request.user)

    def get_queryset(self):
        """Filter drawings based on user's company and project access."""
        user = self.request.user

        # Superadmin видит все чертежи
        if user.is_superuser:
            return Drawing.objects.all()

        # Пользователи без компании не видят чертежи
        if not user.company:
            return Drawing.objects.none()

        # Руководство видит все чертежи своей компании
        if user.is_management:
            return Drawing.objects.filter(project__company=user.company)

        # Остальные видят только чертежи из проектов, где они участники
        return Drawing.objects.filter(
            project__company=user.company
        ).filter(
            models.Q(project__project_manager=user) |
            models.Q(project__team_members=user)
        ).distinct()
