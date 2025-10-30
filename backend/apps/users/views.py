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

    # ===== НОВЫЕ МЕТОДЫ ДЛЯ PERSONNEL EXCEL V2 =====

    @action(detail=False, methods=['get'], url_path='export-template-v2',
            permission_classes=[permissions.IsAuthenticated])
    def export_template_v2(self, request):
        """
        Экспорт шаблона Excel v2 для импорта персонала.

        Шаблон включает:
        - Лист "Инструкция" с подробным описанием процесса
        - Лист "Данные" с заголовками и dropdown для ролей и проектов
        - Пример заполнения данных

        Permissions: CanManagePersonnelExcel
        """
        from .permissions import CanManagePersonnelExcel
        from .utils.excel_handler import PersonnelExcelHandler
        from datetime import datetime
        import logging
        import traceback

        logger = logging.getLogger(__name__)

        try:
            user = request.user
            logger.info(f"[export_template_v2] User: {user.email}, Company: {user.company}")

            # ВАЖНО: Проверяем наличие компании ДО permission check
            # Иначе для superadmin будет ошибка при попытке доступа к user.company
            if not user.company:
                logger.warning(f"[export_template_v2] User {user.email} has no company")
                return Response({
                    'error': 'У вас нет привязки к компании',
                    'details': 'Для работы с Excel необходимо привязать пользователя к компании через админ-панель'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Проверяем права доступа
            logger.info(f"[export_template_v2] Checking permissions for user {user.email}")
            permission = CanManagePersonnelExcel()
            if not permission.has_permission(request, self):
                logger.warning(f"[export_template_v2] Permission denied for user {user.email}")
                return Response({
                    'error': 'У вас нет прав для экспорта шаблона персонала',
                    'details': 'Требуется роль из категории MANAGEMENT или одобрение директора'
                }, status=status.HTTP_403_FORBIDDEN)

            # Создаем handler и генерируем шаблон
            logger.info(f"[export_template_v2] Creating PersonnelExcelHandler")
            handler = PersonnelExcelHandler(company=user.company)
            logger.info(f"[export_template_v2] Generating template")
            workbook = handler.generate_template_v2()

            # Создаем HTTP response с Excel файлом
            logger.info(f"[export_template_v2] Creating HTTP response")
            response = HttpResponse(
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = 'attachment; filename=users_import_template_v2.xlsx'

            # Сохраняем workbook в response
            logger.info(f"[export_template_v2] Saving workbook to response")
            workbook.save(response)

            logger.info(f"[export_template_v2] Success!")
            return response

        except Exception as e:
            logger.error(f"[export_template_v2] Exception: {str(e)}")
            logger.error(f"[export_template_v2] Traceback: {traceback.format_exc()}")
            return Response({
                'error': 'Ошибка при создании шаблона',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='export-v2',
            permission_classes=[permissions.IsAuthenticated])
    def export_users_v2(self, request):
        """
        Экспорт текущих пользователей компании в Excel v2.

        Включает данные:
        - Email, ФИО, Роль, Должность, Телефон
        - Проекты (через запятую)
        - Dropdown валидация для редактирования

        Используется для варианта 2: Export → Edit → Import

        Permissions: CanManagePersonnelExcel
        """
        from .permissions import CanManagePersonnelExcel
        from .utils.excel_handler import PersonnelExcelHandler
        from datetime import datetime

        try:
            user = request.user

            # ВАЖНО: Проверяем наличие компании ДО permission check
            if not user.company:
                return Response({
                    'error': 'У вас нет привязки к компании',
                    'details': 'Для работы с Excel необходимо привязать пользователя к компании через админ-панель'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Проверяем права доступа
            permission = CanManagePersonnelExcel()
            if not permission.has_permission(request, self):
                return Response({
                    'error': 'У вас нет прав для экспорта персонала',
                    'details': 'Требуется роль из категории MANAGEMENT или одобрение директора'
                }, status=status.HTTP_403_FORBIDDEN)

            # Создаем handler и генерируем экспорт
            handler = PersonnelExcelHandler(company=user.company)
            workbook = handler.generate_export_v2()

            # Создаем HTTP response с Excel файлом
            current_date = datetime.now().strftime('%Y-%m-%d')
            filename = f'users_export_v2_{current_date}.xlsx'

            response = HttpResponse(
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename={filename}'

            # Сохраняем workbook в response
            workbook.save(response)

            return response

        except Exception as e:
            return Response({
                'error': 'Ошибка при экспорте пользователей',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='export-backup',
            permission_classes=[permissions.IsAuthenticated])
    def export_backup(self, request):
        """
        Создание backup всех пользователей компании.

        Включает расширенные данные:
        - ID, Email, ФИО, Роль, Должность, Телефон, Проекты
        - Категория, статусы (активен, подтвержден, одобрен)
        - Даты создания и обновления
        - Лист "Информация" с метаданными backup

        Используется для варианта 3: Backup с timestamp

        Permissions: CanManagePersonnelExcel
        """
        from .permissions import CanManagePersonnelExcel
        from .utils.excel_handler import PersonnelExcelHandler
        from datetime import datetime

        try:
            user = request.user

            # ВАЖНО: Проверяем наличие компании ДО permission check
            # Иначе для superadmin будет ошибка при попытке доступа к user.company
            if not user.company:
                return Response({
                    'error': 'У вас нет привязки к компании',
                    'details': 'Для работы с Excel необходимо привязать пользователя к компании через админ-панель'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Проверяем права доступа (теперь ПОСЛЕ проверки компании)
            permission = CanManagePersonnelExcel()
            if not permission.has_permission(request, self):
                return Response({
                    'error': 'У вас нет прав для создания backup персонала',
                    'details': 'Требуется роль из категории MANAGEMENT или одобрение директора'
                }, status=status.HTTP_403_FORBIDDEN)

            # Создаем handler и генерируем backup
            handler = PersonnelExcelHandler(company=user.company)
            workbook = handler.generate_backup()

            # Создаем HTTP response с Excel файлом
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'users_backup_{timestamp}.xlsx'

            response = HttpResponse(
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename={filename}'

            # Сохраняем workbook в response
            workbook.save(response)

            return response

        except Exception as e:
            return Response({
                'error': 'Ошибка при создании backup',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='import-v2',
            permission_classes=[permissions.IsAuthenticated])
    def import_users_v2(self, request):
        """
        Импорт пользователей из Excel v2 с постоянными паролями.

        Поддерживает два режима:
        - mode=create: Массовое добавление новых пользователей (по умолчанию)
        - mode=update: Обновление данных существующих пользователей

        Процесс:
        1. Парсинг и валидация Excel файла
        2. Генерация постоянных паролей для новых пользователей
        3. Создание/обновление записей в БД
        4. Привязка к проектам
        5. Асинхронная отправка credentials на email

        Request:
            - file: Excel файл (multipart/form-data)
            - mode: 'create' | 'update' (optional, default: 'create')

        Response:
            {
                'status': 'success',
                'stats': {
                    'total_rows': 50,
                    'new_records': 30,
                    'updated_records': 15,
                    'skipped_records': 3,
                    'errors': 2,
                    'projects_assigned': 45,
                    'emails_sent': 30
                },
                'details': {
                    'errors': [{'row': 5, 'errors': ['...']}]
                }
            }

        Permissions: CanManagePersonnelExcel
        """
        from .permissions import CanManagePersonnelExcel
        from .utils.excel_handler import PersonnelExcelHandler
        from .utils.password_generator import generate_and_hash_password
        from .tasks import send_permanent_credentials_email
        from apps.projects.models import Project

        try:
            user = request.user

            # ВАЖНО: Проверяем наличие компании ДО permission check
            # Иначе для superadmin будет ошибка при попытке доступа к user.company
            if not user.company:
                return Response({
                    'error': 'У вас нет привязки к компании',
                    'details': 'Для работы с Excel необходимо привязать пользователя к компании через админ-панель'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Проверяем права доступа (теперь ПОСЛЕ проверки компании)
            permission = CanManagePersonnelExcel()
            if not permission.has_permission(request, self):
                return Response({
                    'error': 'У вас нет прав для импорта персонала',
                    'details': 'Требуется роль из категории MANAGEMENT или одобрение директора'
                }, status=status.HTTP_403_FORBIDDEN)

            # Получаем файл из request
            if 'file' not in request.FILES:
                return Response({
                    'error': 'Файл не предоставлен',
                    'details': 'Требуется загрузить Excel файл'
                }, status=status.HTTP_400_BAD_REQUEST)

            file = request.FILES['file']

            # Получаем режим импорта
            mode = request.data.get('mode', 'create')
            if mode not in ['create', 'update']:
                return Response({
                    'error': 'Неверный режим импорта',
                    'details': 'Допустимые значения: create, update'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Парсим и валидируем файл
            handler = PersonnelExcelHandler(company=user.company)
            parse_result = handler.parse_import_file(file, mode=mode)

            valid_rows = parse_result['valid_rows']
            errors = parse_result['errors']

            # Если есть ошибки валидации, возвращаем их
            if errors:
                return Response({
                    'status': 'validation_error',
                    'message': 'Обнаружены ошибки валидации',
                    'stats': {
                        'total_rows': len(valid_rows) + len(errors),
                        'valid_rows': len(valid_rows),
                        'error_rows': len(errors)
                    },
                    'details': {'errors': errors}
                }, status=status.HTTP_400_BAD_REQUEST)

            # Обрабатываем валидные строки
            new_records = 0
            updated_records = 0
            skipped_records = 0
            projects_assigned = 0
            emails_sent = 0

            for row_data in valid_rows:
                try:
                    email = row_data['email']

                    if mode == 'create':
                        # Создание нового пользователя
                        # Генерируем постоянный пароль
                        plain_password, hashed_password = generate_and_hash_password(length=12)

                        # Определяем категорию роли
                        management_roles = [
                            'DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER',
                            'SITE_MANAGER', 'FOREMAN'
                        ]
                        role_category = 'MANAGEMENT' if row_data['role'] in management_roles else 'ITR_SUPPLY'

                        # Создаем пользователя
                        new_user = User.objects.create(
                            email=email,
                            first_name=row_data['first_name'],
                            last_name=row_data['last_name'],
                            middle_name=row_data['middle_name'],
                            role=row_data['role'],
                            position=row_data['position'],
                            phone=row_data['phone'],
                            company=user.company,
                            role_category=role_category,
                            password=hashed_password,
                            is_active=True,
                            approved=True,
                            # Постоянный пароль - НЕ требует смены
                            password_change_required=False
                        )

                        # Привязываем к проектам
                        if row_data['project_ids']:
                            projects = Project.objects.filter(
                                id__in=row_data['project_ids'],
                                company=user.company
                            )
                            new_user.projects.set(projects)
                            projects_assigned += projects.count()

                        # Отправляем credentials на email асинхронно
                        send_permanent_credentials_email.delay(new_user.id, plain_password)
                        emails_sent += 1

                        new_records += 1

                    elif mode == 'update':
                        # Обновление существующего пользователя
                        existing_user = User.objects.get(
                            email__iexact=email,
                            company=user.company
                        )

                        # Обновляем поля
                        existing_user.first_name = row_data['first_name']
                        existing_user.last_name = row_data['last_name']
                        existing_user.middle_name = row_data['middle_name']
                        existing_user.role = row_data['role']
                        existing_user.position = row_data['position']
                        existing_user.phone = row_data['phone']

                        # Обновляем категорию роли
                        management_roles = [
                            'DIRECTOR', 'CHIEF_ENGINEER', 'PROJECT_MANAGER',
                            'SITE_MANAGER', 'FOREMAN'
                        ]
                        existing_user.role_category = (
                            'MANAGEMENT' if row_data['role'] in management_roles else 'ITR_SUPPLY'
                        )

                        existing_user.save()

                        # Обновляем проекты
                        if row_data['project_ids']:
                            projects = Project.objects.filter(
                                id__in=row_data['project_ids'],
                                company=user.company
                            )
                            existing_user.projects.set(projects)
                            projects_assigned += projects.count()

                        updated_records += 1

                except Exception as row_error:
                    # Если ошибка при обработке конкретной строки
                    skipped_records += 1
                    errors.append({
                        'row': '?',
                        'errors': [f'Ошибка обработки: {str(row_error)}']
                    })

            # Возвращаем результат
            return Response({
                'status': 'success',
                'message': f'Импорт завершен успешно (режим: {mode})',
                'stats': {
                    'total_rows': len(valid_rows),
                    'new_records': new_records,
                    'updated_records': updated_records,
                    'skipped_records': skipped_records,
                    'errors': len(errors),
                    'projects_assigned': projects_assigned,
                    'emails_sent': emails_sent
                },
                'details': {
                    'errors': errors if errors else []
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            # Детальное логирование для отладки
            import traceback
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"[import_users_v2] Exception during import: {str(e)}")
            logger.error(f"[import_users_v2] Traceback: {traceback.format_exc()}")

            return Response({
                'error': 'Ошибка при импорте персонала',
                'details': str(e),
                'traceback': traceback.format_exc() if hasattr(e, '__traceback__') else None
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
