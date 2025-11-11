"""
Celery tasks для уведомлений по заявкам на материалы
"""
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from apps.notifications.tasks import send_notification_to_user, send_email_notification


@shared_task
def send_approval_notification(request_id):
    """
    Отправить уведомление следующему согласующему.

    Вызывается после submit_for_approval() или approve().
    Отправляет Email + WebSocket уведомление текущему согласующему.
    """
    from .models import MaterialRequest
    from apps.users.models import User

    try:
        material_request = MaterialRequest.objects.select_related(
            'created_by',
            'current_approver',
            'project',
            'company'
        ).get(id=request_id)

        # Находим пользователя с нужной ролью для согласования
        if not material_request.current_approver_role:
            return "Нет текущего согласующего"

        # Получаем пользователей с нужной ролью в компании
        approvers = User.objects.filter(
            company=material_request.company,
            role=material_request.current_approver_role,
            is_active=True,
            is_deleted=False
        )

        if not approvers.exists():
            return f"Не найдены пользователи с ролью {material_request.current_approver_role} в компании {material_request.company.name}"

        # Отправляем уведомления всем пользователям с нужной ролью
        for approver in approvers:
            # WebSocket уведомление
            send_notification_to_user.delay(
                user_id=approver.id,
                notification_type='material_request_approval',
                title=f'Заявка на согласование: {material_request.number}',
                message=f'Заявка на материалы от {material_request.created_by.get_full_name()} ожидает вашего согласования. Проект: {material_request.project.name if material_request.project else "Без проекта"}',
                link=f'/material-requests/{material_request.id}'
            )

            # Email уведомление
            if approver.email:
                subject = f'Заявка на согласование: {material_request.number}'
                message = f"""
Здравствуйте, {approver.get_full_name()}!

Новая заявка на материалы ожидает вашего согласования.

Номер заявки: {material_request.number}
Автор: {material_request.created_by.get_full_name()}
Проект: {material_request.project.name if material_request.project else "Без проекта"}
Статус: {material_request.get_status_display()}

Количество позиций: {material_request.items.count()}

Пожалуйста, перейдите в систему для согласования заявки:
{settings.FRONTEND_URL}/material-requests/{material_request.id}

---
Система Check_Site
                """

                send_email_notification.delay(
                    email=approver.email,
                    subject=subject,
                    message=message
                )

        return f"Уведомления отправлены {approvers.count()} согласующим"

    except MaterialRequest.DoesNotExist:
        return f"Заявка {request_id} не найдена"
    except Exception as e:
        return f"Ошибка при отправке уведомлений: {str(e)}"


@shared_task
def send_rejection_notification(request_id):
    """
    Отправить уведомление автору о возврате заявки на доработку.

    Вызывается после reject().
    """
    from .models import MaterialRequest

    try:
        material_request = MaterialRequest.objects.select_related(
            'created_by',
            'rejected_by',
            'project',
            'company'
        ).get(id=request_id)

        author = material_request.created_by

        # WebSocket уведомление
        send_notification_to_user.delay(
            user_id=author.id,
            notification_type='material_request_rejected',
            title=f'Заявка возвращена на доработку: {material_request.number}',
            message=f'Ваша заявка на материалы возвращена на доработку. Причина: {material_request.rejection_reason[:100]}',
            link=f'/material-requests/{material_request.id}'
        )

        # Email уведомление
        if author.email:
            subject = f'Заявка возвращена на доработку: {material_request.number}'
            message = f"""
Здравствуйте, {author.get_full_name()}!

Ваша заявка на материалы возвращена на доработку.

Номер заявки: {material_request.number}
Проект: {material_request.project.name if material_request.project else "Без проекта"}
Возвращена: {material_request.rejected_by.get_full_name() if material_request.rejected_by else "Неизвестно"}

Причина возврата:
{material_request.rejection_reason}

Пожалуйста, внесите необходимые изменения и отправьте заявку повторно:
{settings.FRONTEND_URL}/material-requests/{material_request.id}

---
Система Check_Site
            """

            send_email_notification.delay(
                email=author.email,
                subject=subject,
                message=message
            )

        return f"Уведомление о возврате отправлено автору {author.get_full_name()}"

    except MaterialRequest.DoesNotExist:
        return f"Заявка {request_id} не найдена"
    except Exception as e:
        return f"Ошибка при отправке уведомления: {str(e)}"


@shared_task
def send_approved_notification(request_id):
    """
    Отправить уведомление автору об успешном согласовании заявки.

    Вызывается когда заявка переходит в статус APPROVED (согласована всеми).
    """
    from .models import MaterialRequest
    from apps.users.models import User

    try:
        material_request = MaterialRequest.objects.select_related(
            'created_by',
            'project',
            'company'
        ).get(id=request_id)

        author = material_request.created_by

        # WebSocket уведомление автору
        send_notification_to_user.delay(
            user_id=author.id,
            notification_type='material_request_approved',
            title=f'Заявка согласована: {material_request.number}',
            message=f'Ваша заявка на материалы успешно согласована всеми участниками. Передана Завскладу.',
            link=f'/material-requests/{material_request.id}'
        )

        # Email уведомление автору
        if author.email:
            subject = f'Заявка согласована: {material_request.number}'
            message = f"""
Здравствуйте, {author.get_full_name()}!

Ваша заявка на материалы успешно согласована всеми участниками.

Номер заявки: {material_request.number}
Проект: {material_request.project.name if material_request.project else "Без проекта"}
Статус: Согласовано

Заявка передана Заведующему склада для проверки наличия материалов.

Отслеживать статус заявки можно в системе:
{settings.FRONTEND_URL}/material-requests/{material_request.id}

---
Система Check_Site
            """

            send_email_notification.delay(
                email=author.email,
                subject=subject,
                message=message
            )

        # Уведомление Завскладу (WAREHOUSE_HEAD)
        warehouse_managers = User.objects.filter(
            company=material_request.company,
            role='WAREHOUSE_HEAD',
            is_active=True,
            is_deleted=False
        )

        for manager in warehouse_managers:
            send_notification_to_user.delay(
                user_id=manager.id,
                notification_type='material_request_warehouse',
                title=f'Новая заявка на проверку: {material_request.number}',
                message=f'Заявка на материалы от {author.get_full_name()} ожидает проверки наличия на складе.',
                link=f'/material-requests/{material_request.id}'
            )

            if manager.email:
                send_email_notification.delay(
                    email=manager.email,
                    subject=f'Новая заявка на проверку: {material_request.number}',
                    message=f"""
Здравствуйте, {manager.get_full_name()}!

Новая заявка на материалы ожидает проверки наличия на складе.

Номер заявки: {material_request.number}
Автор: {author.get_full_name()}
Проект: {material_request.project.name if material_request.project else "Без проекта"}

Пожалуйста, проверьте наличие материалов:
{settings.FRONTEND_URL}/material-requests/{material_request.id}

---
Система Check_Site
                    """
                )

        return f"Уведомления отправлены автору и {warehouse_managers.count()} завскладам"

    except MaterialRequest.DoesNotExist:
        return f"Заявка {request_id} не найдена"
    except Exception as e:
        return f"Ошибка при отправке уведомления: {str(e)}"


@shared_task
def send_payment_notification(request_id):
    """
    Отправить уведомление о переходе на этап доставки.

    Вызывается после mark_as_paid().
    """
    from .models import MaterialRequest

    try:
        material_request = MaterialRequest.objects.select_related(
            'created_by',
            'project',
            'company'
        ).get(id=request_id)

        author = material_request.created_by

        # WebSocket уведомление автору
        send_notification_to_user.delay(
            user_id=author.id,
            notification_type='material_request_delivery',
            title=f'Заявка оплачена: {material_request.number}',
            message=f'Материалы по вашей заявке оплачены. Ожидается доставка.',
            link=f'/material-requests/{material_request.id}'
        )

        # Email уведомление автору
        if author.email:
            subject = f'Заявка оплачена: {material_request.number}'
            message = f"""
Здравствуйте, {author.get_full_name()}!

Материалы по вашей заявке оплачены и находятся на этапе доставки.

Номер заявки: {material_request.number}
Проект: {material_request.project.name if material_request.project else "Без проекта"}
Статус: На доставке

Отслеживать статус доставки можно в системе:
{settings.FRONTEND_URL}/material-requests/{material_request.id}

---
Система Check_Site
            """

            send_email_notification.delay(
                email=author.email,
                subject=subject,
                message=message
            )

        return f"Уведомление о доставке отправлено автору {author.get_full_name()}"

    except MaterialRequest.DoesNotExist:
        return f"Заявка {request_id} не найдена"
    except Exception as e:
        return f"Ошибка при отправке уведомления: {str(e)}"


@shared_task
def send_delivery_notification(request_id):
    """
    Отправить уведомление о завершении заявки (материалы доставлены).

    Вызывается после mark_as_delivered().
    """
    from .models import MaterialRequest

    try:
        material_request = MaterialRequest.objects.select_related(
            'created_by',
            'project',
            'company'
        ).get(id=request_id)

        author = material_request.created_by

        # WebSocket уведомление автору
        send_notification_to_user.delay(
            user_id=author.id,
            notification_type='material_request_completed',
            title=f'Заявка выполнена: {material_request.number}',
            message=f'Материалы по вашей заявке доставлены и приняты. Заявка закрыта.',
            link=f'/material-requests/{material_request.id}'
        )

        # Email уведомление автору
        if author.email:
            subject = f'Заявка выполнена: {material_request.number}'
            message = f"""
Здравствуйте, {author.get_full_name()}!

Материалы по вашей заявке доставлены и приняты.

Номер заявки: {material_request.number}
Проект: {material_request.project.name if material_request.project else "Без проекта"}
Статус: Отработано и доставлено

Заявка успешно выполнена и закрыта.

Детали заявки:
{settings.FRONTEND_URL}/material-requests/{material_request.id}

---
Система Check_Site
            """

            send_email_notification.delay(
                email=author.email,
                subject=subject,
                message=message
            )

        return f"Уведомление о завершении отправлено автору {author.get_full_name()}"

    except MaterialRequest.DoesNotExist:
        return f"Заявка {request_id} не найдена"
    except Exception as e:
        return f"Ошибка при отправке уведомления: {str(e)}"
