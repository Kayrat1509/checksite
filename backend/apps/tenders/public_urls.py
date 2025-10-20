"""
URLs для публичного API тендеров
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .public_views import (
    PublicTenderViewSet,
    public_tender_register,
    public_tender_login,
    public_tender_status
)

# Роутер для ViewSet
router = DefaultRouter()
router.register(r'list', PublicTenderViewSet, basename='public-tender')

urlpatterns = [
    # Регистрация и авторизация
    path('register/', public_tender_register, name='public-tender-register'),
    path('login/', public_tender_login, name='public-tender-login'),
    path('status/', public_tender_status, name='public-tender-status'),
    
    # Список тендеров
    path('', include(router.urls)),
]
