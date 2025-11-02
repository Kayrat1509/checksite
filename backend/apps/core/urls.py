"""
URL маршруты для корзины (Recycle Bin) и матрицы доступа к кнопкам.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RecycleBinViewSet, ButtonAccessViewSet

router = DefaultRouter()
router.register(r'recycle-bin', RecycleBinViewSet, basename='recycle-bin')
router.register(r'button-access', ButtonAccessViewSet, basename='button-access')

urlpatterns = [
    path('', include(router.urls)),
]
