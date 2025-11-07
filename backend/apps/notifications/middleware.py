"""
WebSocket Authentication Middleware для Channels.

Поддерживает аутентификацию через HttpOnly cookies вместо токена в URL.
Это безопаснее, так как токен не попадает в логи и URL history.
"""

from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from apps.users.models import User
import logging

logger = logging.getLogger(__name__)


class JWTAuthMiddleware(BaseMiddleware):
    """
    JWT аутентификация для WebSocket через HttpOnly cookie.

    Читает access_token из cookie header при WebSocket handshake.
    Устанавливает user в scope для использования в consumers.
    """

    async def __call__(self, scope, receive, send):
        # Получить headers из scope
        headers = dict(scope.get('headers', []))

        # Извлечь Cookie header
        cookie_header = headers.get(b'cookie', b'').decode('utf-8')

        # Парсинг cookies
        cookies = {}
        if cookie_header:
            for cookie in cookie_header.split('; '):
                if '=' in cookie:
                    key, value = cookie.split('=', 1)
                    cookies[key] = value

        # Получить access_token из cookie
        token_string = cookies.get('access_token')

        if token_string:
            try:
                # Валидация JWT токена
                access_token = AccessToken(token_string)

                # Получить пользователя из токена
                user_id = access_token.get('user_id')
                if user_id:
                    user = await self.get_user(user_id)
                    scope['user'] = user
                    logger.debug(f'WebSocket authenticated: user_id={user_id}')
                else:
                    scope['user'] = AnonymousUser()
                    logger.warning('WebSocket: токен не содержит user_id')

            except (InvalidToken, TokenError) as e:
                # Токен невалиден (истёк, подделан, etc.)
                scope['user'] = AnonymousUser()
                logger.warning(f'WebSocket: невалидный токен - {str(e)}')

            except Exception as e:
                # Неожиданная ошибка
                scope['user'] = AnonymousUser()
                logger.error(f'WebSocket auth error: {str(e)}')
        else:
            # Токен не найден в cookies
            scope['user'] = AnonymousUser()
            logger.debug('WebSocket: токен не найден в cookies')

        # Передать дальше в consumer
        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def get_user(self, user_id):
        """
        Получить пользователя из базы данных асинхронно.

        Args:
            user_id: ID пользователя из JWT токена

        Returns:
            User или AnonymousUser если не найден
        """
        try:
            return User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            logger.warning(f'WebSocket: пользователь {user_id} не найден')
            return AnonymousUser()


def JWTAuthMiddlewareStack(inner):
    """
    Helper функция для применения JWTAuthMiddleware к routing.

    Usage:
        from apps.notifications.middleware import JWTAuthMiddlewareStack

        application = ProtocolTypeRouter({
            "websocket": JWTAuthMiddlewareStack(
                URLRouter(websocket_urlpatterns)
            ),
        })
    """
    return JWTAuthMiddleware(inner)
