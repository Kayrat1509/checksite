from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.core.mail import send_mail
from django.conf import settings
import requests
from .models import Notification


@shared_task
def send_notification_to_user(user_id, notification_type, title, message, link=''):
    """
    Create notification and send it via WebSocket.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()

    try:
        user = User.objects.get(id=user_id)

        # Create notification in database
        notification = Notification.objects.create(
            user=user,
            type=notification_type,
            title=title,
            message=message,
            link=link
        )

        # Send via WebSocket
        channel_layer = get_channel_layer()
        group_name = f'user_{user_id}'

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'notification_message',
                'data': {
                    'id': notification.id,
                    'type': notification.type,
                    'title': notification.title,
                    'message': notification.message,
                    'link': notification.link,
                    'created_at': notification.created_at.isoformat(),
                }
            }
        )

        return f"Notification sent to user {user_id}"

    except User.DoesNotExist:
        return f"User {user_id} not found"


@shared_task
def send_telegram_notification(telegram_id, message):
    """
    Send notification via Telegram Bot.
    """
    if not settings.TELEGRAM_BOT_TOKEN:
        return "Telegram bot token not configured"

    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"

    payload = {
        'chat_id': telegram_id,
        'text': message,
        'parse_mode': 'HTML'
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code == 200:
            return f"Telegram message sent to {telegram_id}"
        else:
            return f"Failed to send Telegram message: {response.text}"
    except Exception as e:
        return f"Error sending Telegram message: {str(e)}"


@shared_task
def send_email_notification(email, subject, message):
    """
    Send notification via email.
    """
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        return f"Email sent to {email}"
    except Exception as e:
        return f"Error sending email: {str(e)}"
