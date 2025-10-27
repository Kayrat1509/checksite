from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in
from .models import User
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def user_post_save(sender, instance, created, **kwargs):
    """
    Signal handler for post-save events on User model.
    """
    if created:
        # Additional logic when user is created
        # For example, create user profile, send notifications, etc.
        pass


@receiver(user_logged_in)
def track_temp_password_login(sender, request, user, **kwargs):
    """
    Отслеживание входа пользователя с временным паролем.
    Увеличивает счетчик попыток входа и блокирует после 3-й попытки.
    """
    if not hasattr(user, 'password_change_required'):
        return

    # Проверяем, требуется ли смена пароля
    if user.password_change_required:
        # Увеличиваем счетчик
        limit_reached = user.increment_temp_password_login()

        if limit_reached:
            logger.warning(
                f'Пользователь {user.email} достиг лимита входов с временным паролем'
            )

            # Отправляем напоминание о смене пароля
            from apps.users.tasks import send_password_change_reminder
            send_password_change_reminder.delay(user_id=user.id)
        else:
            logger.info(
                f'Пользователь {user.email} вошел с временным паролем. '
                f'Попыток: {user.login_attempts_with_temp_password}/3'
            )
