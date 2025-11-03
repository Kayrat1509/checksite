from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MaterialRequestViewSet,
    MaterialRequestItemViewSet,
    MaterialRequestDocumentViewSet,
    MaterialRequestCommentViewSet
)
from .approval_views import (
    ApprovalFlowTemplateViewSet,
    ApprovalStepViewSet,
    MaterialRequestApprovalViewSet,
    # CompanyApprovalSettingsViewSet  # УДАЛЕНО: старая логика доступа
)

# Создаем router для автоматической генерации URL
router = DefaultRouter()

# Основные заявки на материалы
router.register(r'material-requests', MaterialRequestViewSet, basename='material-request')
router.register(r'material-request-items', MaterialRequestItemViewSet, basename='material-request-item')
router.register(r'material-request-documents', MaterialRequestDocumentViewSet, basename='material-request-document')
router.register(r'material-request-comments', MaterialRequestCommentViewSet, basename='material-request-comment')

# Новая система согласования
router.register(r'approval-flows', ApprovalFlowTemplateViewSet, basename='approval-flow')
router.register(r'approval-steps', ApprovalStepViewSet, basename='approval-step')
router.register(r'material-request-approvals', MaterialRequestApprovalViewSet, basename='material-request-approval')
# router.register(r'company-approval-settings', CompanyApprovalSettingsViewSet, basename='company-approval-settings')  # УДАЛЕНО

urlpatterns = [
    path('', include(router.urls)),
]
