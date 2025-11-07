"""
🚨 DEPRECATED - Этот файл больше не используется!

JWT Authentication middleware для Django Channels WebSocket.

⚠️ ПРОБЛЕМА БЕЗОПАСНОСТИ:
Этот middleware извлекает JWT токен из query-параметра ?token=xxx,
что небезопасно, так как токены попадают в:
- Логи веб-сервера (Nginx, Apache)
- Логи прокси
- История браузера
- Referrer headers

✅ НОВОЕ РЕШЕНИЕ:
Используйте apps.notifications.middleware.JWTAuthMiddleware,
который читает токен из HttpOnly cookie (безопасно).

Обновлено: 2025-11-08
Этот файл оставлен для справки, НЕ ИСПОЛЬЗУЕТСЯ в production.
"""
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_string):
    """
    Получает пользователя из JWT токена.

    Args:
        token_string: строка JWT токена

    Returns:
        User объект или AnonymousUser если токен невалиден
    """
    try:
        # Валидируем и декодируем JWT токен
        access_token = AccessToken(token_string)
        user_id = access_token['user_id']

        # Получаем пользователя из БД
        user = User.objects.get(id=user_id)
        return user
    except (InvalidToken, TokenError, User.DoesNotExist, KeyError):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Middleware для JWT аутентификации WebSocket соединений.

    Извлекает токен из query-параметра ?token=xxx и устанавливает
    аутентифицированного пользователя в scope['user'].
    """

    async def __call__(self, scope, receive, send):
        """
        Обрабатывает WebSocket соединение и добавляет пользователя в scope.

        Args:
            scope: WebSocket scope (содержит информацию о соединении)
            receive: функция для получения сообщений
            send: функция для отправки сообщений
        """
        # Извлекаем query параметры из URL
        query_string = scope.get('query_string', b'').decode('utf-8')
        query_params = parse_qs(query_string)

        # Получаем токен из query параметра 'token'
        token = query_params.get('token', [None])[0]

        if token:
            # Аутентифицируем пользователя по токену
            scope['user'] = await get_user_from_token(token)
        else:
            # Если токена нет, используем анонимного пользователя
            scope['user'] = AnonymousUser()

        # Передаем управление следующему middleware или consumer
        return await super().__call__(scope, receive, send)
