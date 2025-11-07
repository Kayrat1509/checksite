from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenVerifyView
from .views import (
    UserViewSet, RegisterView, CompanyViewSet,
    CustomTokenObtainPairView, CustomTokenRefreshView, LogoutView
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'register', RegisterView, basename='register')
router.register(r'companies', CompanyViewSet, basename='company')

urlpatterns = [
    # JWT Authentication - используем кастомные views с HttpOnly cookies
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # User endpoints
    path('', include(router.urls)),
]
