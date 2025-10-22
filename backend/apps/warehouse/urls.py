from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WarehouseReceiptViewSet

# !>7405< @>CB5@ 4;O 02B><0B8G5A:>9 35=5@0F88 URL
router = DefaultRouter()
router.register(r'receipts', WarehouseReceiptViewSet, basename='warehouse-receipt')

urlpatterns = [
    path('', include(router.urls)),
]
