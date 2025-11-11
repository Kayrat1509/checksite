"""
ViewSets для API заявок на материалы
"""
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models as django_models
from django.shortcuts import get_object_or_404

from .models import MaterialRequest, MaterialRequestItem
from .serializers import (
    MaterialRequestSerializer,
    MaterialRequestListSerializer,
    MaterialRequestItemSerializer,
    ApproveRequestSerializer,
    RejectRequestSerializer,
    MarkPaidSerializer,
    MarkDeliveredSerializer,
)
from apps.users.permissions import HasPageAccess, IsSameCompany
from apps.core.viewsets import SoftDeleteViewSetMixin


class MaterialRequestViewSet(SoftDeleteViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet для управления заявками на материалы.

    Основные операции:
    - list/retrieve: просмотр заявок
    - create: создание черновика заявки
    - update/partial_update: редактирование черновика
    - destroy: мягкое удаление

    Дополнительные actions:
    - submit_for_approval: отправить черновик на согласование
    - approve: согласовать заявку (для текущего согласующего)
    - reject: вернуть на доработку (для текущего согласующего)
    - mark_paid: отметить как оплаченную (для Снабженца)
    - mark_delivered: приёмка материалов (для Мастера/Прораба/Нач.участка/Завсклад объекта)
    """

    queryset = MaterialRequest.objects.select_related(
        'company', 'project', 'created_by', 'current_approver'
    ).prefetch_related('items')
    permission_classes = [IsAuthenticated, HasPageAccess, IsSameCompany]
    page_name = 'material-requests'  # Для HasPageAccess
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'project', 'created_by']
    search_fields = ['number', 'project__name']
    ordering_fields = ['created_at', 'submitted_at', 'number']
    ordering = ['-created_at']

    def get_serializer_class(self):
        """Возвращает нужный сериализатор в зависимости от action"""
        if self.action == 'list':
            return MaterialRequestListSerializer
        elif self.action == 'approve':
            return ApproveRequestSerializer
        elif self.action == 'reject':
            return RejectRequestSerializer
        elif self.action == 'mark_paid':
            return MarkPaidSerializer
        elif self.action == 'mark_delivered':
            return MarkDeliveredSerializer
        return MaterialRequestSerializer

    def get_queryset(self):
        """
        Фильтрация заявок на основе компании и роли пользователя.

        Логика доступа:
        - Superadmin: видит все заявки всех компаний
        - Директор, Главный инженер: видят все заявки своей компании
        - Остальные пользователи: видят заявки своих проектов (где они project_manager или team_members)
        """
        user = self.request.user

        # Superadmin видит все заявки
        if user.is_superuser:
            return MaterialRequest.objects.all()

        # Пользователи без компании не видят заявки
        if not user.company:
            return MaterialRequest.objects.none()

        # Директор и Главный инженер видят все заявки своей компании
        if user.is_management:
            return MaterialRequest.objects.filter(company=user.company)

        # Остальные видят только заявки из проектов, где они участники
        from apps.projects.models import Project
        accessible_projects = Project.objects.filter(
            company=user.company
        ).filter(
            django_models.Q(project_manager=user) |
            django_models.Q(team_members=user)
        ).distinct()

        return MaterialRequest.objects.filter(
            company=user.company,
            project__in=accessible_projects
        )

    def perform_create(self, serializer):
        """Создание заявки с привязкой к компании и автору"""
        # Устанавливаем компанию и автора из текущего пользователя
        serializer.save(
            company=self.request.user.company,
            created_by=self.request.user
        )

    @action(detail=True, methods=['post'], url_path='submit')
    def submit_for_approval(self, request, pk=None):
        """
        Отправить заявку на согласование.

        Доступно только автору заявки, если заявка в статусе DRAFT.
        """
        material_request = self.get_object()
        user = request.user

        # Проверяем, что пользователь - автор заявки
        if material_request.created_by != user:
            return Response(
                {'error': 'Только автор заявки может отправить её на согласование'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Проверяем, что заявка в статусе DRAFT
        if material_request.status != MaterialRequest.Status.DRAFT:
            return Response(
                {'error': f'Нельзя отправить на согласование. Текущий статус: {material_request.get_status_display()}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Отправляем на согласование
        try:
            material_request.submit_for_approval()

            # TODO: Отправить уведомление первому согласующему через Celery
            # from apps.material_requests.tasks import send_approval_notification
            # send_approval_notification.delay(material_request.id)

            return Response(
                {
                    'status': 'success',
                    'message': 'Заявка успешно отправлена на согласование',
                    'current_status': material_request.status,
                    'current_approver_role': material_request.current_approver_role,
                    'current_approver': material_request.current_approver.get_full_name() if material_request.current_approver else None,
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Согласовать заявку.

        Доступно только текущему согласующему (роль которого указана в current_approver_role).
        """
        material_request = self.get_object()
        user = request.user
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comment = serializer.validated_data.get('comment', '')

        # Проверяем, что пользователь - текущий согласующий
        if material_request.current_approver_role != user.role:
            return Response(
                {'error': f'Вы не можете согласовать эту заявку. Текущий согласующий: {material_request.get_current_approver_role_display()}'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Согласовываем заявку
        try:
            material_request.approve(user, comment)

            # TODO: Отправить уведомление следующему согласующему или автору через Celery
            # from apps.material_requests.tasks import send_approval_notification
            # send_approval_notification.delay(material_request.id)

            return Response(
                {
                    'status': 'success',
                    'message': 'Заявка успешно согласована',
                    'current_status': material_request.status,
                    'current_status_display': material_request.get_status_display(),
                    'current_approver_role': material_request.current_approver_role,
                    'current_approver': material_request.current_approver.get_full_name() if material_request.current_approver else None,
                },
                status=status.HTTP_200_OK
            )
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Вернуть заявку на доработку.

        Доступно только текущему согласующему.
        Требуется указать причину возврата (минимум 10 символов).
        """
        material_request = self.get_object()
        user = request.user
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reason = serializer.validated_data['reason']

        # Проверяем, что пользователь - текущий согласующий
        if material_request.current_approver_role != user.role:
            return Response(
                {'error': f'Вы не можете вернуть эту заявку. Текущий согласующий: {material_request.get_current_approver_role_display()}'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Возвращаем на доработку
        try:
            material_request.reject(user, reason)

            # TODO: Отправить уведомление автору через Celery
            # from apps.material_requests.tasks import send_rejection_notification
            # send_rejection_notification.delay(material_request.id)

            return Response(
                {
                    'status': 'success',
                    'message': 'Заявка возвращена на доработку',
                    'rejection_reason': reason,
                },
                status=status.HTTP_200_OK
            )
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'], url_path='mark-paid')
    def mark_paid(self, request, pk=None):
        """
        Отметить заявку как оплаченную.

        Доступно только Снабженцу (SUPPLY_MANAGER) для заявок в статусе PROCUREMENT или PAYMENT.
        """
        material_request = self.get_object()
        user = request.user
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comment = serializer.validated_data.get('comment', '')

        # Проверяем роль пользователя
        if user.role != 'SUPPLY_MANAGER':
            return Response(
                {'error': 'Только Снабженец может отметить заявку как оплаченную'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Отмечаем как оплаченную
        try:
            material_request.mark_as_paid(user, comment)

            # TODO: Отправить уведомление о переходе на доставку через Celery
            # from apps.material_requests.tasks import send_payment_notification
            # send_payment_notification.delay(material_request.id)

            return Response(
                {
                    'status': 'success',
                    'message': 'Заявка отмечена как оплаченная. Статус изменён на "На доставке"',
                    'current_status': material_request.status,
                    'current_status_display': material_request.get_status_display(),
                },
                status=status.HTTP_200_OK
            )
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'], url_path='mark-delivered')
    def mark_delivered(self, request, pk=None):
        """
        Приёмка материалов.

        Доступно для: Мастер, Прораб, Начальник участка, Завсклад объекта.
        Позволяет указать фактическое количество для каждой позиции.
        """
        material_request = self.get_object()
        user = request.user
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        items = serializer.validated_data['items']
        comment = serializer.validated_data.get('comment', '')

        # Проверяем роль пользователя
        allowed_roles = ['MASTER', 'FOREMAN', 'SITE_MANAGER', 'SITE_WAREHOUSE_MANAGER']
        if user.role not in allowed_roles:
            return Response(
                {'error': 'Только Мастер, Прораб, Начальник участка или Завсклад объекта могут принять материалы'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Обновляем фактическое количество для позиций
        try:
            for item_data in items:
                item_id = item_data['item_id']
                quantity_actual = item_data['quantity_actual']

                # Находим позицию
                try:
                    item = MaterialRequestItem.objects.get(
                        id=item_id,
                        request=material_request
                    )
                    item.quantity_actual = quantity_actual
                    item.save(update_fields=['quantity_actual'])
                except MaterialRequestItem.DoesNotExist:
                    return Response(
                        {'error': f'Позиция с ID {item_id} не найдена в этой заявке'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Отмечаем заявку как доставленную
            material_request.mark_as_delivered(user, comment)

            # TODO: Отправить уведомление о завершении через Celery
            # from apps.material_requests.tasks import send_delivery_notification
            # send_delivery_notification.delay(material_request.id)

            return Response(
                {
                    'status': 'success',
                    'message': 'Материалы успешно приняты. Заявка отработана.',
                    'current_status': material_request.status,
                    'current_status_display': material_request.get_status_display(),
                    'completed_at': material_request.completed_at,
                },
                status=status.HTTP_200_OK
            )
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'], url_path='approval-history')
    def approval_history(self, request, pk=None):
        """
        Получить историю согласования заявки.

        Возвращает все этапы согласования с комментариями и датами.
        """
        material_request = self.get_object()

        return Response(
            {
                'approval_chain': material_request.approval_chain,
                'approval_chain_index': material_request.approval_chain_index,
                'approval_history': material_request.approval_history,
                'current_approver_role': material_request.current_approver_role,
                'current_approver': material_request.current_approver.get_full_name() if material_request.current_approver else None,
                'status': material_request.status,
                'status_display': material_request.get_status_display(),
            },
            status=status.HTTP_200_OK
        )


class MaterialRequestItemViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для просмотра позиций материалов.

    Только чтение. Создание и редактирование позиций происходит через MaterialRequestViewSet.
    """
    queryset = MaterialRequestItem.objects.select_related('request')
    serializer_class = MaterialRequestItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['request', 'unit']
    search_fields = ['material_name']
    ordering_fields = ['order', 'material_name']
    ordering = ['order']

    def get_queryset(self):
        """
        Фильтрация позиций на основе компании пользователя.

        Пользователи видят только позиции заявок своей компании.
        """
        user = self.request.user

        # Superadmin видит все позиции
        if user.is_superuser:
            return MaterialRequestItem.objects.all()

        # Пользователи без компании не видят позиции
        if not user.company:
            return MaterialRequestItem.objects.none()

        # Фильтруем по компании заявки
        return MaterialRequestItem.objects.filter(
            request__company=user.company
        )
