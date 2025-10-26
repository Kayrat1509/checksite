from django.db.models.signals import post_save, pre_save, pre_delete
from django.dispatch import receiver
from django.utils import timezone
from .models import Issue, IssuePhoto
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


# ==================== Сигналы для управления файлами IssuePhoto ====================

@receiver(pre_delete, sender=IssuePhoto)
def delete_photo_file_on_delete(sender, instance, **kwargs):
    """
    Автоматически удаляет файл фотографии при удалении записи из БД.

    Вызывается перед удалением объекта IssuePhoto.
    Удаляет физический файл с диска, чтобы не накапливались "мертвые" файлы.

    Пример:
        Когда пользователь удаляет замечание, все связанные фото
        автоматически удаляются из БД (CASCADE), и этот сигнал
        удаляет физические файлы с диска.
    """
    if instance.photo:
        # Проверяем, существует ли файл на диске
        if instance.photo.storage.exists(instance.photo.name):
            # Удаляем файл с диска
            # save=False означает что мы не сохраняем модель после удаления файла
            instance.photo.delete(save=False)


@receiver(pre_save, sender=IssuePhoto)
def delete_old_photo_on_update(sender, instance, **kwargs):
    """
    Автоматически удаляет старый файл фотографии при замене на новый.

    Вызывается перед сохранением объекта IssuePhoto.
    Если фото заменяется на новое, удаляет старый файл с диска.

    Важно: Из-за UniqueConstraint на (issue, stage), Django сначала удаляет
    старую запись, а потом создает новую. Поэтому этот сигнал обрабатывает
    только случай обновления существующей записи (например, изменение caption).

    Пример:
        Когда пользователь загружает новое фото "До" для замечания,
        которое уже имеет фото "До", Django удалит старую запись
        (сработает сигнал pre_delete выше), а потом создаст новую.
    """
    # Если это новая запись (нет pk), пропускаем
    if not instance.pk:
        return

    try:
        # Получаем старый объект из БД
        old_instance = IssuePhoto.objects.get(pk=instance.pk)
        old_file = old_instance.photo
        new_file = instance.photo

        # Если файл изменился, удаляем старый
        if old_file and new_file and old_file != new_file:
            if old_file.storage.exists(old_file.name):
                old_file.delete(save=False)
    except IssuePhoto.DoesNotExist:
        # Старая запись не найдена - ничего не делаем
        pass
