from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Issue
from apps.notifications.tasks import send_telegram_notification, send_email_notification


@receiver(pre_save, sender=Issue)
def check_overdue_status(sender, instance, **kwargs):
    """Auto-set overdue status if deadline is passed."""
    if instance.deadline and instance.deadline < timezone.now():
        if instance.status in [Issue.Status.NEW, Issue.Status.IN_PROGRESS]:
            instance.status = Issue.Status.OVERDUE


@receiver(post_save, sender=Issue)
def issue_post_save(sender, instance, created, **kwargs):
    """
    Send notifications when issue is created or updated.
    """
    if created:
        # Send notification to assigned user
        if instance.assigned_to:
            message = f"""
🔔 Новое замечание назначено вам!

📋 {instance.title}
🏗 Проект: {instance.project.name}
📍 Участок: {instance.site.name}
⏰ Срок: {instance.deadline.strftime('%d.%m.%Y %H:%M') if instance.deadline else 'Не указан'}
⚠️ Приоритет: {instance.get_priority_display()}

Описание: {instance.description}
            """

            # Send Telegram notification
            if instance.assigned_to.telegram_id:
                send_telegram_notification.delay(
                    instance.assigned_to.telegram_id,
                    message
                )

            # Send Email notification
            send_email_notification.delay(
                instance.assigned_to.email,
                'Новое замечание',
                message
            )
    else:
        # Notify on status change
        if instance.status == Issue.Status.PENDING_REVIEW and instance.created_by:
            message = f"""
✅ Замечание отправлено на проверку

📋 {instance.title}
👷 Исполнитель: {instance.assigned_to.get_full_name() if instance.assigned_to else 'Не назначен'}
            """

            if instance.created_by.telegram_id:
                send_telegram_notification.delay(
                    instance.created_by.telegram_id,
                    message
                )

        elif instance.status == Issue.Status.COMPLETED and instance.assigned_to:
            message = f"""
🎉 Замечание принято!

📋 {instance.title}
✅ Работа выполнена качественно
            """

            if instance.assigned_to.telegram_id:
                send_telegram_notification.delay(
                    instance.assigned_to.telegram_id,
                    message
                )
