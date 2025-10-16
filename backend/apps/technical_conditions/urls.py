from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TechnicalConditionViewSet

router = DefaultRouter()
router.register(r'technical-conditions', TechnicalConditionViewSet, basename='technical-condition')

urlpatterns = [
    path('', include(router.urls)),
]
