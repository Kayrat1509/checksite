"""
Celery задачи для приложения users.
"""

from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.contrib.auth import get_user_model
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_temp_password_email(self, user_id, temp_password):
    """
    Отправляет email с временным паролем новому пользователю.

    Args:
        user_id: ID пользователя
        temp_password: Временный пароль в открытом виде

    Returns:
        dict: Результат отправки
    """
    try:
        user = User.objects.get(id=user_id)

        # Формируем тему письма
        subject = 'Доступ к системе контроля качества строительства'

        # Формируем контекст для шаблона
        context = {
            'user': user,
            'temp_password': temp_password,
            'site_url': settings.SITE_URL,
            'site_name': 'Система контроля качества строительства',
            'domain': 'stroyka.asia',
        }

        # Рендерим HTML версию письма
        html_message = render_to_string('users/emails/temp_password.html', context)

        # Рендерим текстовую версию письма
        text_message = render_to_string('users/emails/temp_password.txt', context)

        # Отправляем email
        send_mail(
            subject=subject,
            message=text_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )

        logger.info(f'Email с временным паролем отправлен пользователю {user.email}')

        return {
            'status': 'success',
            'user_email': user.email,
            'message': 'Email успешно отправлен'
        }

    except User.DoesNotExist:
        logger.error(f'Пользователь с ID {user_id} не найден')
        return {
            'status': 'error',
            'message': f'Пользователь с ID {user_id} не найден'
        }

    except Exception as exc:
        logger.error(f'Ошибка при отправке email: {str(exc)}')
        # Повторная попытка при ошибке
        raise self.retry(exc=exc)


@shared_task
def send_password_change_reminder(user_id):
    """
    Отправляет напоминание о необходимости смены пароля.

    Args:
        user_id: ID пользователя
    """
    try:
        user = User.objects.get(id=user_id)

        if not user.password_change_required:
            return {'status': 'skipped', 'message': 'Смена пароля не требуется'}

        # Проверяем количество входов
        attempts_left = 3 - user.login_attempts_with_temp_password

        if attempts_left <= 0:
            return {'status': 'blocked', 'message': 'Аккаунт заблокирован'}

        # Формируем тему письма
        subject = 'Напоминание: смените временный пароль'

        # Контекст для шаблона
        context = {
            'user': user,
            'attempts_left': attempts_left,
            'site_url': settings.SITE_URL,
        }

        # Рендерим шаблоны
        html_message = render_to_string('users/emails/password_reminder.html', context)
        text_message = render_to_string('users/emails/password_reminder.txt', context)

        # Отправляем email
        send_mail(
            subject=subject,
            message=text_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=True,
        )

        logger.info(f'Напоминание о смене пароля отправлено пользователю {user.email}')

        return {
            'status': 'success',
            'user_email': user.email,
        }

    except User.DoesNotExist:
        logger.error(f'Пользователь с ID {user_id} не найден')
        return {'status': 'error', 'message': 'Пользователь не найден'}

    except Exception as exc:
        logger.error(f'Ошибка при отправке напоминания: {str(exc)}')
        return {'status': 'error', 'message': str(exc)}
