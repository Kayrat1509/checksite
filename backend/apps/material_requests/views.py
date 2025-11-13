# apps/material_requests/views.py
"""
Views для API заявок на материалы.
"""

import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Prefetch
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)

from .models import MaterialRequest, MaterialRequestItem, ApprovalStep, MaterialRequestHistory
from .serializers import (
    MaterialRequestListSerializer,
    MaterialRequestDetailSerializer,
    MaterialRequestCreateSerializer,
    MaterialRequestSubmitSerializer,
    MaterialRequestApproveSerializer,
    MaterialRequestRejectSerializer,
    MaterialRequestActualQuantitySerializer,
    MaterialRequestItemSerializer,
)


class MaterialRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet для работы с заявками на материалы.

    Поддерживает:
    - CRUD операции
    - Фильтрацию по статусам (вкладки)
    - Согласование/отклонение заявок
    - Управление фактическим количеством
    """

    permission_classes = [IsAuthenticated]
    queryset = MaterialRequest.objects.filter(is_deleted=False)

    def get_serializer_class(self):
        """Выбор сериализатора в зависимости от действия."""
        if self.action == 'list':
            return MaterialRequestListSerializer
        elif self.action == 'create':
            return MaterialRequestCreateSerializer
        elif self.action == 'submit':
            return MaterialRequestSubmitSerializer
        elif self.action == 'approve':
            return MaterialRequestApproveSerializer
        elif self.action == 'reject':
            return MaterialRequestRejectSerializer
        elif self.action == 'update_actual_quantity':
            return MaterialRequestActualQuantitySerializer
        return MaterialRequestDetailSerializer

    def get_queryset(self):
        """
        Фильтрация заявок в зависимости от роли пользователя и параметров запроса.

        Учитывает:
        - Компанию пользователя
        - Закрепленные проекты (team_members)
        - Роль пользователя
        """
        user = self.request.user

        # Базовая фильтрация по компании
        queryset = MaterialRequest.objects.filter(
            company=user.company,
            is_deleted=False
        )

        # Фильтрация по закрепленным проектам
        # Руководящие роли видят все заявки компании
        management_roles = [
            'SUPERADMIN', 'DIRECTOR', 'CHIEF_ENGINEER',
            'PROJECT_MANAGER', 'CHIEF_POWER_ENGINEER'
        ]

        # Если пользователь НЕ руководитель и НЕ снабженец,
        # показываем только заявки по закрепленным проектам ИЛИ созданные самим пользователем
        if user.role not in management_roles and user.role != 'SUPPLY_MANAGER':
            # Получаем проекты, где пользователь в team_members или является руководителем
            user_projects = user.projects.all() | user.managed_projects.all()
            # ВАЖНО: пользователь должен видеть свои собственные заявки + заявки по закрепленным проектам
            queryset = queryset.filter(Q(author=user) | Q(project__in=user_projects))

        # Оптимизация запросов
        queryset = queryset.select_related(
            'author',
            'project',
            'company',
            'rejected_by'
        ).prefetch_related(
            Prefetch('items', queryset=MaterialRequestItem.objects.order_by('position_number')),
            Prefetch('approval_steps', queryset=ApprovalStep.objects.order_by('created_at')),
            Prefetch('history', queryset=MaterialRequestHistory.objects.order_by('-created_at'))
        )

        # Фильтрация по вкладкам (tab parameter)
        tab = self.request.query_params.get('tab', None)

        if tab == 'all':
            # Все заявки - без фильтрации по статусу
            pass
        elif tab == 'in_approval':
            # На согласовании
            queryset = queryset.filter(status=MaterialRequest.STATUS_IN_APPROVAL)
        elif tab == 'approved':
            # Согласованные заявки
            queryset = queryset.filter(status=MaterialRequest.STATUS_APPROVED)
        elif tab == 'in_payment':
            # На оплате
            queryset = queryset.filter(status=MaterialRequest.STATUS_IN_PAYMENT)
        elif tab == 'in_delivery':
            # На доставке
            queryset = queryset.filter(status=MaterialRequest.STATUS_IN_DELIVERY)
        elif tab == 'completed':
            # Отработанные заявки:
            # Показываем заявки, у которых ЕСТЬ ХОТЯ БЫ ОДНА принятая позиция (статус RECEIVED)
            # Frontend будет фильтровать и показывать только принятые позиции
            from django.db.models import Exists, OuterRef
            has_received_items = MaterialRequestItem.objects.filter(
                material_request=OuterRef('pk'),
                status=MaterialRequestItem.STATUS_RECEIVED
            )
            queryset = queryset.filter(Exists(has_received_items))
        elif tab == 'my':
            # Мои заявки (созданные текущим пользователем)
            queryset = queryset.filter(author=user)
        elif tab == 'draft':
            # Черновики
            queryset = queryset.filter(status=MaterialRequest.STATUS_DRAFT)

        # Фильтрация по проекту
        project_id = self.request.query_params.get('project', None)
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        # Фильтрация по статусу
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Поиск по номеру заявки или названию
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(request_number__icontains=search) |
                Q(title__icontains=search) |
                Q(description__icontains=search)
            )

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        """Создание заявки с автором и компанией."""
        # author и company устанавливаются в сериализаторе из context
        serializer.save()

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """
        Отправка заявки на согласование.

        Endpoint: POST /api/material-requests/{id}/submit/
        """
        material_request = self.get_object()

        # Проверка прав: только автор может отправить на согласование
        if material_request.author != request.user:
            return Response(
                {'error': 'Только автор заявки может отправить её на согласование'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            material_request.submit_for_approval()

            # Записываем в историю
            MaterialRequestHistory.objects.create(
                material_request=material_request,
                action=MaterialRequestHistory.ACTION_SUBMITTED,
                user=request.user,
                comment='Заявка отправлена на согласование'
            )

            return Response({
                'message': 'Заявка успешно отправлена на согласование',
                'current_approval_role': material_request.current_approval_role
            })

        except DjangoValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Согласование заявки текущей ролью.

        Endpoint: POST /api/material-requests/{id}/approve/
        Body: {"comment": "Согласовано"} (опционально)
        """
        material_request = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_role = request.user.role

        # Проверка, что сейчас очередь этой роли
        if material_request.current_approval_role != user_role:
            return Response(
                {
                    'error': f'Сейчас заявка ожидает согласования роли: {material_request.current_approval_role}'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            material_request.approve_by_role(request.user, user_role)

            # Обновляем комментарий в шаге согласования
            comment = serializer.validated_data.get('comment', '')
            if comment:
                approval_step = ApprovalStep.objects.filter(
                    material_request=material_request,
                    role=user_role,
                    status=ApprovalStep.STATUS_APPROVED
                ).order_by('-approved_at').first()
                if approval_step:
                    approval_step.comment = comment
                    approval_step.save()

            # Записываем в историю
            MaterialRequestHistory.objects.create(
                material_request=material_request,
                action=MaterialRequestHistory.ACTION_APPROVED,
                user=request.user,
                comment=f'Согласовано ролью {user_role}. {comment}' if comment else f'Согласовано ролью {user_role}'
            )

            return Response({
                'message': 'Заявка успешно согласована',
                'status': material_request.status,
                'next_approval_role': material_request.current_approval_role
            })

        except DjangoValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Возврат заявки автору на доработку.

        Endpoint: POST /api/material-requests/{id}/reject/
        Body: {"reason": "Причина возврата"}
        """
        material_request = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reason = serializer.validated_data['reason']

        try:
            material_request.reject_to_author(request.user, reason)

            # Записываем в историю
            MaterialRequestHistory.objects.create(
                material_request=material_request,
                action=MaterialRequestHistory.ACTION_REJECTED,
                user=request.user,
                comment=f'Возвращено на доработку: {reason}'
            )

            return Response({
                'message': 'Заявка возвращена на доработку',
                'reason': reason
            })

        except DjangoValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='mark-payment')
    def mark_payment(self, request, pk=None):
        """
        Снабженец переводит заявку в статус "На оплате".

        Endpoint: POST /api/material-requests/{id}/mark-payment/
        """
        material_request = self.get_object()

        if request.user.role != 'SUPPLY_MANAGER':
            return Response(
                {'error': 'Только снабженец может перевести заявку на оплату'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            material_request.mark_as_payment(request.user)

            # Записываем в историю
            MaterialRequestHistory.objects.create(
                material_request=material_request,
                action=MaterialRequestHistory.ACTION_PAYMENT,
                user=request.user,
                comment='Заявка переведена на оплату'
            )

            return Response({'message': 'Заявка переведена на оплату'})

        except DjangoValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='mark-paid')
    def mark_paid(self, request, pk=None):
        """
        Снабженец отмечает заявку как оплаченную (переводит в "На доставке").

        Endpoint: POST /api/material-requests/{id}/mark-paid/
        """
        material_request = self.get_object()

        if request.user.role != 'SUPPLY_MANAGER':
            return Response(
                {'error': 'Только снабженец может отметить заявку как оплаченную'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            material_request.mark_as_paid(request.user)

            # Записываем в историю
            MaterialRequestHistory.objects.create(
                material_request=material_request,
                action=MaterialRequestHistory.ACTION_PAID,
                user=request.user,
                comment='Заявка оплачена, переведена на доставку'
            )

            return Response({'message': 'Заявка оплачена и переведена на доставку'})

        except DjangoValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='mark-received')
    def mark_received(self, request, pk=None):
        """
        Мастер/Прораб/Начальник участка/Завсклад объекта принимают материалы.

        Endpoint: POST /api/material-requests/{id}/mark-received/
        """
        material_request = self.get_object()

        allowed_roles = ['MASTER', 'FOREMAN', 'SITE_MANAGER', 'SITE_WAREHOUSE_MANAGER']
        if request.user.role not in allowed_roles:
            return Response(
                {'error': 'Только Мастер, Прораб, Начальник участка или Завсклад объекта могут принять материалы'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            material_request.mark_as_received(request.user)

            # Записываем в историю
            MaterialRequestHistory.objects.create(
                material_request=material_request,
                action=MaterialRequestHistory.ACTION_COMPLETED,
                user=request.user,
                comment='Материалы приняты на объекте'
            )

            return Response({'message': 'Материалы успешно приняты на объекте'})

        except DjangoValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='update-actual-quantity')
    def update_actual_quantity(self, request, pk=None):
        """
        Обновление фактического количества материала.

        Доступно для ролей: Мастер, Прораб, Начальник участка, Завсклад объекта.

        Endpoint: POST /api/material-requests/{id}/update-actual-quantity/
        Body: {"item_id": 1, "quantity_actual": 100.50, "notes": "Комментарий"}
        """
        material_request = self.get_object()

        allowed_roles = ['MASTER', 'FOREMAN', 'SITE_MANAGER', 'SITE_WAREHOUSE_MANAGER']
        if request.user.role not in allowed_roles:
            return Response(
                {'error': 'У вас нет прав для обновления фактического количества'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Проверяем, что заявка на доставке
        if material_request.status != MaterialRequest.STATUS_IN_DELIVERY:
            return Response(
                {'error': 'Фактическое количество можно указать только для заявок на доставке'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        item_id = serializer.validated_data['item_id']
        quantity_actual = serializer.validated_data['quantity_actual']
        notes = serializer.validated_data.get('notes', '')

        try:
            # Находим позицию заявки
            item = MaterialRequestItem.objects.get(
                id=item_id,
                material_request=material_request
            )

            # Обновляем фактическое количество и примечание
            item.quantity_actual = quantity_actual
            if notes:
                item.notes = notes
            item.save()

            # Автоматически обновляем статус позиции на основе количества
            item.update_status_based_on_quantity()

            # Записываем в историю
            MaterialRequestHistory.objects.create(
                material_request=material_request,
                action=MaterialRequestHistory.ACTION_DELIVERED,
                user=request.user,
                comment=f'Обновлено фактическое количество позиции "{item.material_name}": {quantity_actual} {item.unit}. {notes}'
            )

            return Response({
                'message': 'Фактическое количество успешно обновлено',
                'item_id': item.id,
                'quantity_actual': float(item.quantity_actual),
                'item_status': item.status,
                'item_status_display': item.get_status_display()
            })

        except MaterialRequestItem.DoesNotExist:
            return Response(
                {'error': 'Позиция не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], url_path='receive-item')
    def receive_item(self, request, pk=None):
        """
        Приёмка конкретной позиции заявки на объекте.

        Доступно для ролей: Мастер, Прораб, Начальник участка, Завсклад объекта.

        Endpoint: POST /api/material-requests/{id}/receive-item/
        Body: {"item_id": 1}
        """
        material_request = self.get_object()

        allowed_roles = ['MASTER', 'FOREMAN', 'SITE_MANAGER', 'SITE_WAREHOUSE_MANAGER']
        if request.user.role not in allowed_roles:
            return Response(
                {'error': 'У вас нет прав для приёмки материалов'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Проверяем, что заявка на доставке
        if material_request.status != MaterialRequest.STATUS_IN_DELIVERY:
            return Response(
                {'error': 'Можно принимать только позиции заявок на доставке'},
                status=status.HTTP_400_BAD_REQUEST
            )

        item_id = request.data.get('item_id')
        if not item_id:
            return Response(
                {'error': 'Не указан ID позиции (item_id)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Находим позицию заявки
            item = MaterialRequestItem.objects.get(
                id=item_id,
                material_request=material_request
            )

            # Отмечаем позицию как принятую
            item.mark_as_received(request.user)

            # Записываем в историю
            MaterialRequestHistory.objects.create(
                material_request=material_request,
                action=MaterialRequestHistory.ACTION_ITEM_RECEIVED,
                user=request.user,
                comment=f'Позиция "{item.material_name}" ({item.quantity_requested} {item.unit}) принята на объекте'
            )

            # Проверяем, все ли позиции приняты (для информации)
            all_items_received = all(
                i.status == MaterialRequestItem.STATUS_RECEIVED
                for i in material_request.items.all()
            )

            logger.info(
                f"Позиция '{item.material_name}' заявки {material_request.request_number} принята. "
                f"Статус заявки: {material_request.status}. "
                f"Все позиции приняты: {all_items_received}"
            )

            return Response({
                'message': 'Позиция успешно принята на объекте',
                'item_id': item.id,
                'item_status': item.status,
                'item_status_display': item.get_status_display(),
                'all_items_received': all_items_received,
                'request_status': material_request.status
            })

        except MaterialRequestItem.DoesNotExist:
            return Response(
                {'error': 'Позиция не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )
        except DjangoValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='statistics')
    def statistics(self, request):
        """
        Получение статистики по заявкам для текущего пользователя.

        Endpoint: GET /api/material-requests/statistics/

        Возвращает количество заявок по каждому статусу с учетом прав доступа.
        """
        user = request.user
        company = user.company

        # Базовая фильтрация по компании
        base_queryset = MaterialRequest.objects.filter(company=company, is_deleted=False)

        # Применяем ту же логику фильтрации, что и в get_queryset
        management_roles = [
            'SUPERADMIN', 'DIRECTOR', 'CHIEF_ENGINEER',
            'PROJECT_MANAGER', 'CHIEF_POWER_ENGINEER'
        ]

        # Если пользователь НЕ руководитель и НЕ снабженец,
        # показываем только заявки по закрепленным проектам или созданные самим пользователем
        if user.role not in management_roles and user.role != 'SUPPLY_MANAGER':
            user_projects = user.projects.all() | user.managed_projects.all()
            base_queryset = base_queryset.filter(Q(author=user) | Q(project__in=user_projects))

        # Статистика по вкладкам
        stats = {
            'all': base_queryset.count(),
            'draft': base_queryset.filter(status=MaterialRequest.STATUS_DRAFT).count(),
            'in_approval': base_queryset.filter(status=MaterialRequest.STATUS_IN_APPROVAL).count(),
            'approved': base_queryset.filter(status=MaterialRequest.STATUS_APPROVED).count(),
            'in_payment': base_queryset.filter(status=MaterialRequest.STATUS_IN_PAYMENT).count(),
            'in_delivery': base_queryset.filter(status=MaterialRequest.STATUS_IN_DELIVERY).count(),
            'completed': base_queryset.filter(status=MaterialRequest.STATUS_COMPLETED).count(),
            'my': MaterialRequest.objects.filter(author=user, company=company, is_deleted=False).count(),
        }

        return Response(stats)
