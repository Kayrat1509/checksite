from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PageAccessViewSet, RoleTemplateViewSet, AccessManagementViewSet

router = DefaultRouter()
router.register(r'page-access', PageAccessViewSet, basename='page-access')
router.register(r'role-templates', RoleTemplateViewSet, basename='role-templates')
router.register(r'access-management', AccessManagementViewSet, basename='access-management')

urlpatterns = [
    path('', include(router.urls)),
]
