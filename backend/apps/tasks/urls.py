# apps/tasks/urls.py
"""
URL маршруты для Task API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet

# Создаем router для автоматической генерации URL
router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')

urlpatterns = [
    path('', include(router.urls)),
]
