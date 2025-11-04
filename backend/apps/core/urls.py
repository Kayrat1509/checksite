"""
URL маршруты для корзины (Recycle Bin), матрицы доступа к кнопкам и формы обратной связи.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RecycleBinViewSet, ButtonAccessViewSet, ContactFormViewSet

router = DefaultRouter()
router.register(r'recycle-bin', RecycleBinViewSet, basename='recycle-bin')
router.register(r'button-access', ButtonAccessViewSet, basename='button-access')
router.register(r'contact-form', ContactFormViewSet, basename='contact-form')

urlpatterns = [
    path('', include(router.urls)),
]
