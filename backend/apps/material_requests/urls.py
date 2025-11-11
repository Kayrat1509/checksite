"""
URL конфигурация для API заявок на материалы
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MaterialRequestViewSet, MaterialRequestItemViewSet

# Создаём роутер для автоматической генерации URL
router = DefaultRouter()
router.register(r'requests', MaterialRequestViewSet, basename='material-request')
router.register(r'items', MaterialRequestItemViewSet, basename='material-request-item')

app_name = 'material_requests'

urlpatterns = [
    path('', include(router.urls)),
]
