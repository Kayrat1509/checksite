from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.db import models
from django.http import HttpResponse
from tablib import Dataset
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    RegisterSerializer, ChangePasswordSerializer, CompanySerializer
)
from .permissions import IsManagementOrSuperAdmin, CanManageProjects, CanManageUsers
from .models import Company
from .resources import UserResource

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Кастомный сериализатор для JWT токенов с поддержкой case-insensitive email."""

    def validate(self, attrs):
        """Приводим email к нижнему регистру перед аутентификацией."""
        # Приводим email (username field) к нижнему регистру
        if self.username_field in attrs:
            attrs[self.username_field] = attrs[self.username_field].lower()

        return super().validate(attrs)


class CustomTokenObtainPairView(TokenObtainPairView):
    """Кастомная view для получения JWT токена с case-insensitive email."""
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(viewsets.GenericViewSet):
    """View for user registration (management only)."""

    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    @action(detail=False, methods=['post'])
    def register(self, request):
        """Register a new user."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response({
            'user': UserSerializer(user).data,
            'message': 'Регистрация успешна. Данные для входа отправлены на email.'
        }, status=status.HTTP_201_CREATED)


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for managing users."""

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Фильтрация пользователей по компании и проектам.

        ЛОГИКА ДЛЯ ПОДРЯДЧИКОВ:
        - Директор/Гл.инженер видят всех подрядчиков своей компании
        - Начальник участка видит только подрядчиков проектов, к которым у него есть доступ
        """
        user = self.request.user

        # Запрещенные роли для доступа к списку пользователей
        FORBIDDEN_ROLES = ['CONTRACTOR', 'SUPERVISOR', 'OBSERVER', 'MASTER']

        # Superadmin sees all users
        if user.is_superuser:
            return User.objects.all()

        # Запрещаем доступ для определенных ролей (кроме действия 'me')
        if self.action != 'me' and user.role in FORBIDDEN_ROLES:
            return User.objects.none()

        # Пользователи без approved=True не имеют доступа (кроме 'me')
        if self.action != 'me' and not user.approved:
            return User.objects.none()

        # Фильтрация пользователей компании
        if user.company:
            # Базовый queryset - пользователи компании
            queryset = User.objects.filter(company=user.company)

            # Руководство видит всех пользователей компании (включая всех подрядчиков)
            management_roles = ['DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER']
            if user.role in management_roles:
                return queryset

            # Для остальных ролей: фильтруем подрядчиков по проектам пользователя
            from apps.projects.models import Project

            # Получаем проекты, к которым у пользователя есть доступ
            user_projects = Project.objects.filter(team_members=user)

            # Получаем ID подрядчиков из проектов пользователя
            contractor_ids_in_user_projects = User.objects.filter(
                role='CONTRACTOR',
                projects__in=user_projects
            ).values_list('id', flat=True)

            # Возвращаем: всех НЕподрядчиков компании + подрядчиков из проектов пользователя
            return queryset.filter(
                models.Q(~models.Q(role='CONTRACTOR')) |  # Все НЕподрядчики
                models.Q(id__in=contractor_ids_in_user_projects)  # Подрядчики из проектов пользователя
            ).distinct()

        # Users without company see no one (except themselves in 'me' action)
        return User.objects.filter(id=user.id)

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        """
        Установка прав доступа.
        Управление пользователями (создание, редактирование, удаление, активация) доступно для:
        Директор, Главный инженер, Руководитель проекта, Начальник участка, Инженер ПТО.
        Просмотр списка пользователей доступен всем аутентифицированным пользователям.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'activate', 'deactivate']:
            return [CanManageUsers()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """Set the company to current user's company if not provided."""
        if not serializer.validated_data.get('company') and self.request.user.company:
            serializer.save(company=self.request.user.company)
        else:
            serializer.save()

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user profile."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['patch'])
    def update_profile(self, request):
        """Update current user profile."""
        serializer = self.get_serializer(
            request.user,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Change user password."""
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        user = request.user

        # Проверяем, меняется ли временный пароль
        if user.password_change_required:
            # Используем специальный метод для смены временного пароля
            user.change_password_from_temp(serializer.validated_data['new_password'])
            return Response({
                'message': 'Временный пароль успешно изменен на постоянный'
            })
        else:
            # Обычная смена пароля
            user.set_password(serializer.validated_data['new_password'])
            user.add_to_password_history(action='changed', details='Пользователь изменил пароль')
            user.save()

            return Response({
                'message': 'Пароль успешно изменен'
            })

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate user account."""
        user = self.get_object()
        user.is_active = True
        user.save()
        # Возвращаем полные данные пользователя для обновления UI
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate user account."""
        user = self.get_object()
        user.is_active = False
        user.save()
        # Возвращаем полные данные пользователя для обновления UI
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def projects(self, request, pk=None):
        """Get user's assigned projects."""
        user = self.get_object()
        from apps.projects.models import Project

        # Получаем проекты, где пользователь является участником или руководителем
        projects = Project.objects.filter(
            models.Q(team_members=user) | models.Q(project_manager=user)
        ).distinct()

        from apps.projects.serializers import ProjectListSerializer
        serializer = ProjectListSerializer(projects, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def assign_projects(self, request, pk=None):
        """Assign projects to user."""
        user = self.get_object()
        project_ids = request.data.get('project_ids', [])

        from apps.projects.models import Project

        # Убираем пользователя из всех проектов
        Project.objects.filter(team_members=user).update()
        for project in Project.objects.filter(team_members=user):
            project.team_members.remove(user)

        # Добавляем в выбранные проекты
        if project_ids:
            projects = Project.objects.filter(id__in=project_ids, company=user.company)
            for project in projects:
                project.team_members.add(user)

        return Response({
            'message': f'Проекты обновлены для {user.get_full_name()}'
        })

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive contractor (soft delete)."""
        user = self.get_object()
        user.archived = True
        user.save()
        # Возвращаем полные данные пользователя для обновления UI
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def unarchive(self, request, pk=None):
        """Unarchive contractor."""
        user = self.get_object()
        user.archived = False
        user.save()
        # Возвращаем полные данные пользователя для обновления UI
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='export-template')
    def export_template(self, request):
        """
        Экспорт шаблона Excel для импорта пользователей.
        Возвращает пустой файл с правильными заголовками и примером данных.
        """
        user_resource = UserResource()

        # Создаем пустой dataset с заголовками
        dataset = Dataset()
        dataset.headers = [
            'ФИО', 'Email *', 'Телефон', 'Должность',
            'Роль *', 'Компания', 'Активен'
        ]

        # Добавляем примеры данных для демонстрации формата
        dataset.append([
            'Иванов Иван Иванович',
            'ivanov@example.com',
            '+7 777 123 45 67',
            'Прораб',
            'Прораб',
            'Ваша компания',
            'Да'
        ])
        dataset.append([
            'Петров Петр Петрович',
            'petrov@example.com',
            '+7 777 987 65 43',
            'Инженер',
            'Инженер ПТО',
            'Ваша компания',
            'Да'
        ])

        # Генерируем Excel файл
        response = HttpResponse(
            dataset.export('xlsx'),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="users_import_template.xlsx"'

        return response

    @action(detail=False, methods=['get'], url_path='export')
    def export_users(self, request):
        """
        Экспорт всех пользователей в Excel.
        Включает данные всех пользователей компании текущего пользователя.
        """
        # Получаем queryset с учетом прав доступа
        queryset = self.get_queryset()

        # Создаем ресурс и экспортируем данные
        user_resource = UserResource()
        dataset = user_resource.export(queryset)

        # Генерируем Excel файл
        response = HttpResponse(
            dataset.export('xlsx'),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="users_export.xlsx"'

        return response

    @action(detail=False, methods=['post'], url_path='import')
    def import_users(self, request):
        """
        Импорт пользователей из Excel файла.
        Создает новых пользователей с временными паролями и отправляет им email.
        """
        # Проверка наличия файла
        if 'file' not in request.FILES:
            return Response(
                {'error': 'Файл не предоставлен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        import_file = request.FILES['file']

        # Проверка типа файла
        if not import_file.name.endswith(('.xlsx', '.xls')):
            return Response(
                {'error': 'Неверный формат файла. Поддерживаются только .xlsx и .xls'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Создаем ресурс для импорта
        user_resource = UserResource()

        try:
            # Читаем данные из файла
            dataset = Dataset()
            if import_file.name.endswith('.xlsx'):
                dataset.load(import_file.read(), format='xlsx')
            else:
                dataset.load(import_file.read(), format='xls')

            # Выполняем dry-run для проверки данных
            result = user_resource.import_data(
                dataset,
                dry_run=True,
                raise_errors=False,
                use_transactions=True
            )

            # Проверяем наличие ошибок
            if result.has_errors():
                errors = []
                for row in result.rows:
                    if row.errors:
                        errors.append({
                            'row': row.number,
                            'errors': [str(e.error) for e in row.errors]
                        })

                return Response({
                    'error': 'Ошибки валидации данных',
                    'details': errors,
                    'total_rows': result.total_rows,
                    'invalid_rows': len(errors)
                }, status=status.HTTP_400_BAD_REQUEST)

            # Если dry-run успешен, выполняем реальный импорт
            result = user_resource.import_data(
                dataset,
                dry_run=False,
                raise_errors=True,
                use_transactions=True
            )

            # Подготавливаем ответ со статистикой
            return Response({
                'success': True,
                'message': 'Импорт выполнен успешно',
                'stats': {
                    'total_rows': result.total_rows,
                    'new_records': result.totals.get('new', 0),
                    'updated_records': result.totals.get('update', 0),
                    'skipped_records': result.totals.get('skip', 0),
                    'errors': result.totals.get('error', 0),
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                'error': 'Ошибка при импорте данных',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CompanyViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing companies."""

    queryset = Company.objects.filter(is_active=True)
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter companies based on user permissions."""
        user = self.request.user

        # Superadmin видит все компании
        if user.is_superuser:
            return Company.objects.all()

        # Обычные пользователи видят только свою компанию
        if user.company:
            return Company.objects.filter(id=user.company.id)

        return Company.objects.none()
