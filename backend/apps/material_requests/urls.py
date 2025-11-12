# apps/material_requests/urls.py
"""
URL маршруты для API заявок на материалы.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MaterialRequestViewSet

# Создаем роутер для автоматической генерации маршрутов
router = DefaultRouter()
router.register(r'material-requests', MaterialRequestViewSet, basename='material-request')

urlpatterns = [
    path('', include(router.urls)),
]
