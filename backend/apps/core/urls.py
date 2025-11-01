"""
URL маршруты для корзины (Recycle Bin).
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RecycleBinViewSet

router = DefaultRouter()
router.register(r'recycle-bin', RecycleBinViewSet, basename='recycle-bin')

urlpatterns = [
    path('', include(router.urls)),
]
