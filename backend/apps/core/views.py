"""
ViewSet для работы с корзиной (Recycle Bin) и матрицей доступа к кнопкам.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from django.apps import apps

from .permissions import CanAccessRecycleBin, CanRestoreFromRecycleBin, CanPermanentlyDelete
from .serializers import (
    RecycleBinItemSerializer,
    RecycleBinStatsSerializer,
    ButtonAccessSerializer,
    ButtonAccessMinimalSerializer,
)
from .models import ButtonAccess


class RecycleBinViewSet(viewsets.ViewSet):
    """
    ViewSet для управления корзиной (удаленными объектами).

    Endpoints:
    - GET /api/recycle-bin/ - список всех удаленных объектов
    - GET /api/recycle-bin/stats/ - статистика корзины
    - POST /api/recycle-bin/restore/ - восстановить объект
    - DELETE /api/recycle-bin/permanent-delete/ - окончательно удалить объект
    - POST /api/recycle-bin/clean-expired/ - удалить все просроченные объекты (31+ дней)
    """

    permission_classes = [IsAuthenticated, CanAccessRecycleBin]

    # Модели с поддержкой soft delete
    MODELS_WITH_SOFT_DELETE = [
        'projects.Project',
        'users.User',
        'material_requests.MaterialRequest',
        'tenders.Tender',
    ]

    # Маппинг названий моделей
    MODEL_VERBOSE_NAMES = {
        'Project': 'Проект',
        'User': 'Пользователь',
        'MaterialRequest': 'Заявка на материалы',
        'Tender': 'Тендер',
    }

    def _get_model_title(self, obj):
        """Получает название объекта для отображения в корзине."""
        model_name = obj.__class__.__name__

        if model_name == 'Project':
            return obj.name
        elif model_name == 'User':
            return obj.get_full_name() or obj.email
        elif model_name == 'MaterialRequest':
            return f"Заявка №{obj.request_number}"
        elif model_name == 'Tender':
            return obj.title
        else:
            return str(obj)

    def _calculate_days_left(self, deleted_at):
        """Вычисляет количество дней до автоудаления (31 день с момента удаления)."""
        if not deleted_at:
            return None

        now = timezone.now()
        expiration_date = deleted_at + timedelta(days=31)
        days_left = (expiration_date - now).days

        return max(0, days_left)  # Не может быть отрицательным

    def list(self, request):
        """
        Получить список всех удаленных объектов.

        Query params:
        - model: фильтр по типу модели ('Project', 'User', 'MaterialRequest', 'Tender')
        - expires_soon: фильтр по срочности (true - только объекты с days_left < 7)
        """
        user = request.user
        deleted_items = []

        # Фильтры из query params
        model_filter = request.query_params.get('model')
        expires_soon_filter = request.query_params.get('expires_soon', '').lower() == 'true'

        # Собираем удаленные объекты из всех моделей
        for model_path in self.MODELS_WITH_SOFT_DELETE:
            app_label, model_name = model_path.split('.')
            Model = apps.get_model(app_label, model_name)

            # Применяем фильтр по модели
            if model_filter and model_name != model_filter:
                continue

            # Получаем удаленные объекты
            queryset = Model.all_objects.filter(is_deleted=True)

            # Для User и Project фильтруем по компании (если не суперадмин)
            if model_name in ['User', 'Project'] and not user.is_superuser:
                if hasattr(Model, 'company') and user.company:
                    queryset = queryset.filter(company=user.company)

            # Для MaterialRequest и Tender фильтруем по проектам пользователя
            if model_name in ['MaterialRequest', 'Tender'] and not user.is_superuser:
                if hasattr(user, 'projects'):
                    user_projects = user.projects.all()
                    queryset = queryset.filter(project__in=user_projects)

            for obj in queryset:
                days_left = self._calculate_days_left(obj.deleted_at)
                expires_soon = days_left is not None and days_left < 7

                # Применяем фильтр expires_soon
                if expires_soon_filter and not expires_soon:
                    continue

                # Проверяем права на восстановление и удаление через ButtonAccess
                from apps.core.access_helpers import has_button_access
                can_restore = has_button_access(request.user, 'recycle_bin_restore', 'dashboard')
                can_delete = has_button_access(request.user, 'recycle_bin_delete', 'dashboard')

                deleted_items.append({
                    'id': obj.id,
                    'model_name': model_name,
                    'model_verbose_name': self.MODEL_VERBOSE_NAMES.get(model_name, model_name),
                    'title': self._get_model_title(obj),
                    'deleted_at': obj.deleted_at,
                    'deleted_by': obj.deleted_by,
                    'deleted_by_id': obj.deleted_by.id if obj.deleted_by else None,
                    'days_left': days_left,
                    'expires_soon': expires_soon,
                    'can_restore': can_restore,
                    'can_delete': can_delete,
                })

        # Сортируем по дате удаления (новые первыми)
        deleted_items.sort(key=lambda x: x['deleted_at'], reverse=True)

        serializer = RecycleBinItemSerializer(deleted_items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Получить статистику корзины.

        Response:
        {
            "total_items": 42,
            "projects_count": 10,
            "users_count": 15,
            "material_requests_count": 12,
            "tenders_count": 5,
            "expires_soon_count": 3
        }
        """
        user = request.user
        stats = {
            'total_items': 0,
            'projects_count': 0,
            'users_count': 0,
            'material_requests_count': 0,
            'tenders_count': 0,
            'expires_soon_count': 0,
        }

        # Собираем статистику из всех моделей
        for model_path in self.MODELS_WITH_SOFT_DELETE:
            app_label, model_name = model_path.split('.')
            Model = apps.get_model(app_label, model_name)

            # Получаем удаленные объекты
            queryset = Model.all_objects.filter(is_deleted=True)

            # Фильтруем по компании/проектам
            if model_name in ['User', 'Project'] and not user.is_superuser:
                if hasattr(Model, 'company') and user.company:
                    queryset = queryset.filter(company=user.company)

            if model_name in ['MaterialRequest', 'Tender'] and not user.is_superuser:
                if hasattr(user, 'projects'):
                    user_projects = user.projects.all()
                    queryset = queryset.filter(project__in=user_projects)

            count = queryset.count()
            stats['total_items'] += count

            # Подсчет по типам моделей
            if model_name == 'Project':
                stats['projects_count'] = count
            elif model_name == 'User':
                stats['users_count'] = count
            elif model_name == 'MaterialRequest':
                stats['material_requests_count'] = count
            elif model_name == 'Tender':
                stats['tenders_count'] = count

            # Подсчет объектов, у которых осталось < 7 дней
            for obj in queryset:
                days_left = self._calculate_days_left(obj.deleted_at)
                if days_left is not None and days_left < 7:
                    stats['expires_soon_count'] += 1

        serializer = RecycleBinStatsSerializer(stats)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, CanRestoreFromRecycleBin])
    def restore(self, request):
        """
        Восстановить объект из корзины.

        Body:
        {
            "model": "Project",
            "id": 123
        }
        """
        model_name = request.data.get('model')
        object_id = request.data.get('id')

        if not model_name or not object_id:
            return Response(
                {'detail': 'Необходимо указать model и id объекта'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Находим модель
        model_path = None
        for path in self.MODELS_WITH_SOFT_DELETE:
            if path.endswith(f'.{model_name}'):
                model_path = path
                break

        if not model_path:
            return Response(
                {'detail': f'Модель {model_name} не поддерживает корзину'},
                status=status.HTTP_400_BAD_REQUEST
            )

        app_label, model_name = model_path.split('.')
        Model = apps.get_model(app_label, model_name)

        # Получаем объект
        try:
            obj = Model.all_objects.get(id=object_id, is_deleted=True)
        except Model.DoesNotExist:
            return Response(
                {'detail': 'Объект не найден в корзине'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Восстанавливаем
        obj.is_deleted = False
        obj.deleted_at = None
        obj.deleted_by = None
        obj.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])

        return Response({
            'detail': 'Объект успешно восстановлен из корзины',
            'object': {
                'id': obj.id,
                'model': model_name,
                'title': self._get_model_title(obj),
            }
        })

    @action(detail=False, methods=['delete'], permission_classes=[IsAuthenticated, CanPermanentlyDelete])
    def permanent_delete(self, request):
        """
        Окончательно удалить объект из БД (физическое удаление).

        Body:
        {
            "model": "Project",
            "id": 123
        }
        """
        model_name = request.data.get('model')
        object_id = request.data.get('id')

        if not model_name or not object_id:
            return Response(
                {'detail': 'Необходимо указать model и id объекта'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Находим модель
        model_path = None
        for path in self.MODELS_WITH_SOFT_DELETE:
            if path.endswith(f'.{model_name}'):
                model_path = path
                break

        if not model_path:
            return Response(
                {'detail': f'Модель {model_name} не поддерживает корзину'},
                status=status.HTTP_400_BAD_REQUEST
            )

        app_label, model_name = model_path.split('.')
        Model = apps.get_model(app_label, model_name)

        # Получаем объект
        try:
            obj = Model.all_objects.get(id=object_id, is_deleted=True)
        except Model.DoesNotExist:
            return Response(
                {'detail': 'Объект не найден в корзине'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Сохраняем информацию для ответа
        obj_info = {
            'id': obj.id,
            'model': model_name,
            'title': self._get_model_title(obj),
        }

        # Физически удаляем из БД
        obj.delete()

        return Response({
            'detail': 'Объект окончательно удален из базы данных',
            'object': obj_info
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, CanPermanentlyDelete])
    def clean_expired(self, request):
        """
        Удалить все объекты, у которых истек срок хранения (31+ дней).

        Response:
        {
            "deleted_count": 15,
            "details": {
                "Project": 5,
                "User": 3,
                "MaterialRequest": 4,
                "Tender": 3
            }
        }
        """
        now = timezone.now()
        expiration_threshold = now - timedelta(days=31)

        deleted_count = 0
        details = {}

        # Удаляем просроченные объекты из всех моделей
        for model_path in self.MODELS_WITH_SOFT_DELETE:
            app_label, model_name = model_path.split('.')
            Model = apps.get_model(app_label, model_name)

            # Получаем просроченные объекты
            expired_objects = Model.all_objects.filter(
                is_deleted=True,
                deleted_at__lte=expiration_threshold
            )

            count = expired_objects.count()
            if count > 0:
                expired_objects.delete()
                deleted_count += count
                details[model_name] = count

        return Response({
            'detail': f'Удалено {deleted_count} просроченных объектов',
            'deleted_count': deleted_count,
            'details': details
        })


class ButtonAccessViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для получения информации о доступе к кнопкам.

    ВАЖНО: Настройка доступа производится только через Django Admin (/admin/).
    API предоставляет только чтение (ReadOnly).

    Endpoints:
    - GET /api/button-access/ - список всех кнопок с их настройками доступа
    - GET /api/button-access/{id}/ - детальная информация о кнопке
    - GET /api/button-access/by_page/?page=projects - кнопки доступные текущему пользователю на странице
    """

    queryset = ButtonAccess.objects.all()
    serializer_class = ButtonAccessSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Фильтрация queryset по query параметрам.

        Query params:
        - page: фильтр по странице (например, 'projects', 'users')
        """
        queryset = super().get_queryset()

        # Фильтр по странице
        page = self.request.query_params.get('page')
        if page:
            queryset = queryset.filter(page=page)

        return queryset.order_by('page', 'button_key')

    @action(detail=False, methods=['get'])
    def by_page(self, request):
        """
        Получить все доступные кнопки для текущего пользователя на конкретной странице.

        Query params:
        - page (required): название страницы (projects, users, contractors и т.д.)

        Response:
        [
            {
                "button_key": "create",
                "button_name": "Создать проект",
                "description": "Создание нового проекта"
            },
            ...
        ]

        Example:
        GET /api/button-access/by_page/?page=projects
        """
        page = request.query_params.get('page')

        if not page:
            return Response(
                {'error': 'Параметр "page" обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user_role = request.user.role

        # Получаем только кнопки (не страницы) для данной страницы
        buttons = ButtonAccess.objects.filter(
            page=page,
            access_type='button',
            company__isnull=True  # Кнопки всегда глобальные
        )

        # Фильтруем кнопки по доступу пользователя
        available_buttons = []
        for button in buttons:
            if button.has_access(user_role):
                available_buttons.append(button)

        # Используем минимальный сериализатор
        serializer = ButtonAccessMinimalSerializer(available_buttons, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def all_pages(self, request):
        """
        Получить список всех страниц и доступные кнопки на каждой странице для текущего пользователя.

        Response:
        {
            "projects": [
                {"button_key": "create", "button_name": "Создать проект", ...},
                {"button_key": "edit", "button_name": "Редактировать", ...}
            ],
            "users": [
                {"button_key": "create", "button_name": "Добавить сотрудника", ...}
            ],
            ...
        }

        Example:
        GET /api/button-access/all_pages/
        """
        user_role = request.user.role

        # Получаем только кнопки (не страницы)
        all_buttons = ButtonAccess.objects.filter(
            access_type='button',
            company__isnull=True
        ).order_by('page', 'button_key')

        # Группируем по страницам
        pages_dict = {}
        for button in all_buttons:
            if button.has_access(user_role):
                if button.page not in pages_dict:
                    pages_dict[button.page] = []

                pages_dict[button.page].append({
                    'button_key': button.button_key,
                    'button_name': button.button_name,
                    'description': button.description,
                })

        return Response(pages_dict)

    @action(detail=False, methods=['get'])
    def page_access(self, request):
        """
        Получить доступные страницы для текущего пользователя.

        Проверяет доступ к страницам на основе:
        - Роли пользователя
        - Глобальных настроек access_type='page' в ButtonAccess (единые для всех компаний)

        Response:
        {
            "accessible_pages": ["dashboard", "projects", "issues", ...],
            "all_pages": {
                "dashboard": {
                    "has_access": true,
                    "page_name": "Дашборд"
                },
                "projects": {
                    "has_access": true,
                    "page_name": "Проекты"
                },
                ...
            }
        }

        Example:
        GET /api/button-access/page_access/
        """
        user = request.user
        user_role = user.role

        # SUPERADMIN имеет доступ ко всем страницам
        if user_role == 'SUPERADMIN':
            all_pages_list = ['dashboard', 'projects', 'issues', 'users', 'contractors',
                             'supervisions', 'material-requests', 'warehouse', 'tenders',
                             'reports', 'profile', 'settings']
            return Response({
                'accessible_pages': all_pages_list,
                'all_pages': {page: {'has_access': True, 'page_name': page.title()}
                             for page in all_pages_list}
            })

        # Для остальных ролей - проверяем доступ через ButtonAccess (глобальные настройки)
        page_accesses = ButtonAccess.objects.filter(
            access_type='page',
            company__isnull=True  # Глобальные настройки для всех компаний
        )

        accessible_pages = []
        all_pages_dict = {}

        for page_access in page_accesses:
            has_access = page_access.has_access(user_role)
            all_pages_dict[page_access.page] = {
                'has_access': has_access,
                'page_name': page_access.button_name
            }
            if has_access:
                accessible_pages.append(page_access.page)

        return Response({
            'accessible_pages': accessible_pages,
            'all_pages': all_pages_dict
        })
