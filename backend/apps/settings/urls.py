from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RoleTemplateViewSet

# PageAccessViewSet удалён - используйте /api/button-access/page_access/
# AccessManagementViewSet удалён - функциональность в ButtonAccess

router = DefaultRouter()
router.register(r'role-templates', RoleTemplateViewSet, basename='role-templates')

urlpatterns = [
    path('', include(router.urls)),
]
