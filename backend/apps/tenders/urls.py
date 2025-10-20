from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import TenderViewSet, TenderDocumentViewSet, TenderBidViewSet

# Создаем роутер для API эндпоинтов
router = DefaultRouter()
router.register(r'tenders', TenderViewSet, basename='tender')
router.register(r'tender-documents', TenderDocumentViewSet, basename='tender-document')
router.register(r'tender-bids', TenderBidViewSet, basename='tender-bid')

urlpatterns = [
    path('', include(router.urls)),
]
