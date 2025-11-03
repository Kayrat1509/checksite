"""
ViewSets для новой системы управления цепочками согласования заявок.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .approval_models import (
    ApprovalFlowTemplate,
    ApprovalStep,
    MaterialRequestApproval,
    # CompanyApprovalSettings  # УДАЛЕНО: старая логика доступа
)
from .serializers import (
    ApprovalFlowTemplateListSerializer,
    ApprovalFlowTemplateDetailSerializer,
    ApprovalFlowTemplateCreateUpdateSerializer,
    ApprovalStepSerializer,
    MaterialRequestApprovalSerializer,
    MaterialRequestApprovalActionSerializer,
    # CompanyApprovalSettingsSerializer  # УДАЛЕНО: старая логика доступа
)
from .permissions import (
    CanManageApprovalFlow,
    CanApproveRequest,
    # IsSuperuserOrReadOnly  # УДАЛЕНО: использовался только для CompanyApprovalSettings
)


class ApprovalFlowTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления шаблонами цепочек согласования.

    Endpoints:
    - GET /api/approval-flows/ - Список шаблонов компании
    - POST /api/approval-flows/ - Создать новый шаблон
    - GET /api/approval-flows/{id}/ - Детали шаблона
    - PUT/PATCH /api/approval-flows/{id}/ - Обновить шаблон
    - DELETE /api/approval-flows/{id}/ - Удалить шаблон
    - POST /api/approval-flows/{id}/activate/ - Активировать шаблон
    """

    queryset = ApprovalFlowTemplate.objects.all()
    permission_classes = [IsAuthenticated, CanManageApprovalFlow]

    def get_serializer_class(self):
        """Выбор сериализатора в зависимости от действия."""
        if self.action == 'list':
            return ApprovalFlowTemplateListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ApprovalFlowTemplateCreateUpdateSerializer
        return ApprovalFlowTemplateDetailSerializer

    def get_queryset(self):
        """Фильтрация шаблонов по компании пользователя."""
        user = self.request.user

        # Суперадмин видит все шаблоны
        if user.is_superuser:
            return ApprovalFlowTemplate.objects.all().select_related('company', 'created_by').prefetch_related('steps')

        # Обычные пользователи видят только шаблоны своей компании
        if user.company:
            return ApprovalFlowTemplate.objects.filter(
                company=user.company
            ).select_related('company', 'created_by').prefetch_related('steps')

        return ApprovalFlowTemplate.objects.none()

    def perform_create(self, serializer):
        """Автоматическое заполнение created_by и company при создании."""
        user = self.request.user

        # Определяем компанию
        company = serializer.validated_data.get('company')
        if not company and user.company:
            # Если компания не указана, используем компанию пользователя
            company = user.company

        serializer.save(created_by=user, company=company)

    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, pk=None):
        """
        Активация шаблона цепочки согласования.
        Деактивирует все остальные шаблоны этой компании.
        """
        template = self.get_object()

        # Деактивируем все другие шаблоны в этой компании
        ApprovalFlowTemplate.objects.filter(
            company=template.company,
            is_active=True
        ).exclude(pk=template.pk).update(is_active=False)

        # Активируем текущий шаблон
        template.is_active = True
        template.save()

        serializer = self.get_serializer(template)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='active')
    def get_active(self, request):
        """
        Получить активный шаблон цепочки согласования для компании пользователя.
        """
        user = request.user

        # Определяем компанию
        company = user.company
        if not company and user.is_superuser:
            # Суперадмин может указать компанию в query params
            company_id = request.query_params.get('company_id')
            if company_id:
                from apps.users.models import Company
                try:
                    company = Company.objects.get(id=company_id)
                except Company.DoesNotExist:
                    return Response(
                        {'detail': 'Компания не найдена'},
                        status=status.HTTP_404_NOT_FOUND
                    )

        if not company:
            return Response(
                {'detail': 'Компания пользователя не найдена'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Ищем активный шаблон
        try:
            template = ApprovalFlowTemplate.objects.get(company=company, is_active=True)
            serializer = ApprovalFlowTemplateDetailSerializer(template)
            return Response(serializer.data)
        except ApprovalFlowTemplate.DoesNotExist:
            return Response(
                {'detail': 'Активный шаблон цепочки согласования не найден'},
                status=status.HTTP_404_NOT_FOUND
            )


class ApprovalStepViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления этапами согласования.

    Обычно этапы управляются через ApprovalFlowTemplate,
    но этот ViewSet позволяет работать с ними напрямую.
    """

    queryset = ApprovalStep.objects.all()
    serializer_class = ApprovalStepSerializer
    permission_classes = [IsAuthenticated, CanManageApprovalFlow]

    def get_queryset(self):
        """Фильтрация этапов по компании пользователя."""
        user = self.request.user

        # Суперадмин видит все этапы
        if user.is_superuser:
            return ApprovalStep.objects.all().select_related('flow_template__company')

        # Обычные пользователи видят только этапы шаблонов своей компании
        if user.company:
            return ApprovalStep.objects.filter(
                flow_template__company=user.company
            ).select_related('flow_template__company')

        return ApprovalStep.objects.none()


class MaterialRequestApprovalViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для просмотра и работы с согласованиями заявок.

    Endpoints:
    - GET /api/material-request-approvals/ - Список всех согласований
    - GET /api/material-request-approvals/{id}/ - Детали согласования
    - POST /api/material-request-approvals/{id}/approve/ - Согласовать этап
    - POST /api/material-request-approvals/{id}/reject/ - Отклонить заявку
    - GET /api/material-request-approvals/my-pending/ - Мои ожидающие согласования
    """

    queryset = MaterialRequestApproval.objects.all()
    serializer_class = MaterialRequestApprovalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Фильтрация согласований по доступным проектам пользователя."""
        user = self.request.user

        # Суперадмин видит все согласования
        if user.is_superuser:
            return MaterialRequestApproval.objects.all().select_related(
                'material_request',
                'step',
                'approver'
            )

        # Обычные пользователи видят согласования заявок своей компании
        if user.company:
            return MaterialRequestApproval.objects.filter(
                material_request__project__company=user.company
            ).select_related('material_request', 'step', 'approver')

        return MaterialRequestApproval.objects.none()

    @action(detail=False, methods=['get'], url_path='my-pending')
    def my_pending(self, request):
        """
        Получить список согласований, ожидающих действия текущего пользователя.
        """
        user = request.user

        pending_approvals = MaterialRequestApproval.objects.filter(
            approver=user,
            status=MaterialRequestApproval.ApprovalStatus.PENDING
        ).select_related('material_request', 'step').order_by('created_at')

        serializer = self.get_serializer(pending_approvals, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanApproveRequest])
    def approve(self, request, pk=None):
        """
        Согласовать текущий этап заявки.
        """
        approval = self.get_object()
        serializer = MaterialRequestApprovalActionSerializer(
            data=request.data,
            context={'approval': approval, 'request': request}
        )
        serializer.is_valid(raise_exception=True)

        comment = serializer.validated_data.get('comment', '')

        try:
            # Используем метод из MaterialRequest для согласования
            approval.material_request.approve_current_step(request.user, comment)

            # Обновляем данные approval
            approval.refresh_from_db()
            response_serializer = self.get_serializer(approval)

            return Response({
                'message': 'Этап успешно согласован',
                'approval': response_serializer.data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanApproveRequest])
    def reject(self, request, pk=None):
        """
        Отклонить заявку на текущем этапе.
        """
        approval = self.get_object()
        serializer = MaterialRequestApprovalActionSerializer(
            data=request.data,
            context={'approval': approval, 'request': request}
        )
        serializer.is_valid(raise_exception=True)

        comment = serializer.validated_data.get('comment', '')

        if not comment:
            return Response(
                {'detail': 'Комментарий обязателен при отклонении заявки'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Используем метод из MaterialRequest для отклонения
            approval.material_request.reject_request(request.user, comment)

            # Обновляем данные approval
            approval.refresh_from_db()
            response_serializer = self.get_serializer(approval)

            return Response({
                'message': 'Заявка отклонена',
                'approval': response_serializer.data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


# ========== УДАЛЕНО: CompanyApprovalSettingsViewSet ==========
# ПРИЧИНА: Старая логика доступа через can_manage_approval_flow и approval_flow_managers
# ЗАМЕНЕНО НА: ButtonAccess - единая матрица доступа (/admin/core/buttonaccess/)
#
# class CompanyApprovalSettingsViewSet(viewsets.ModelViewSet):
#     """ViewSet для управления настройками доступа к цепочкам согласования."""
#     queryset = CompanyApprovalSettings.objects.all()
#     serializer_class = CompanyApprovalSettingsSerializer
#     permission_classes = [IsAuthenticated, IsSuperuserOrReadOnly]
#     ...
# ========== КОНЕЦ УДАЛЕННОГО КОДА ==========
