from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PageAccessViewSet

router = DefaultRouter()
router.register(r'page-access', PageAccessViewSet, basename='page-access')

urlpatterns = [
    path('', include(router.urls)),
]
