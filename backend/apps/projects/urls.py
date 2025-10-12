from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, SiteViewSet, CategoryViewSet, DrawingViewSet

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'sites', SiteViewSet, basename='site')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'drawings', DrawingViewSet, basename='drawing')

urlpatterns = [
    path('', include(router.urls)),
]
