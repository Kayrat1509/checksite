"""
Custom JWT Authentication для работы с HttpOnly cookies.

Поддерживает:
- Аутентификацию через HttpOnly cookie
- Fallback на Authorization header (для обратной совместимости)
- Безопасность: токены не хранятся в localStorage
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from django.conf import settings


class CookieJWTAuthentication(JWTAuthentication):
    """
    JWT аутентификация через HttpOnly cookies с fallback на header.

    Приоритет:
    1. Cookie 'access_token' (HttpOnly, Secure в production)
    2. Authorization header 'Bearer <token>' (для обратной совместимости)
    """

    def authenticate(self, request):
        # Попытка получить токен из cookie
        cookie_name = settings.SIMPLE_JWT.get('AUTH_COOKIE', 'access_token')
        raw_token = request.COOKIES.get(cookie_name)

        if raw_token is None:
            # Fallback на стандартный Authorization header
            return super().authenticate(request)

        try:
            # Валидация токена из cookie
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except InvalidToken:
            # Если токен в cookie невалиден, пробуем header
            return super().authenticate(request)
