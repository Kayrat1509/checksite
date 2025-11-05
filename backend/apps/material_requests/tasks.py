# apps/material_requests/tasks.py
"""
Celery задачи для заявок на материалы и системы согласования.
"""

import logging
from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_material_request_notification(self, request_id, notification_type, **kwargs):
    """
    Отправляет email уведомление по заявке на материалы.

    Args:
        request_id: ID заявки
        notification_type: Тип уведомления
            - 'created': Заявка создана, уведомить первого согласующего
            - 'step_approved': Этап согласован, уведомить следующего согласующего
            - 'fully_approved': Заявка полностью согласована, уведомить автора
            - 'rejected': Заявка отклонена, уведомить автора
        **kwargs: Дополнительные параметры (approver_name, comment, и т.д.)

    Retry: 3 попытки с интервалом 60 секунд
    """
    try:
        from apps.material_requests.models import MaterialRequest

        # Получаем заявку
        request = MaterialRequest.objects.select_related(
            'created_by',
            'created_by__company',
            'project',
            'current_approval_step',
            'current_approval_step__responsible_user'
        ).get(id=request_id)

        # Определяем получателя в зависимости от типа уведомления
        recipient_email = None
        recipient_name = None

        if notification_type == 'created':
            # Уведомляем первого согласующего
            if request.current_approval_step and request.current_approval_step.responsible_user:
                recipient = request.current_approval_step.responsible_user
                recipient_email = recipient.email
                recipient_name = recipient.get_full_name()
            else:
                logger.warning(f'У заявки {request_id} нет текущего согласующего')
                return

        elif notification_type == 'step_approved':
            # Уведомляем следующего согласующего
            if request.current_approval_step and request.current_approval_step.responsible_user:
                recipient = request.current_approval_step.responsible_user
                recipient_email = recipient.email
                recipient_name = recipient.get_full_name()
            else:
                logger.warning(f'У заявки {request_id} нет следующего согласующего')
                return

        elif notification_type in ['fully_approved', 'rejected']:
            # Уведомляем автора заявки
            recipient = request.created_by
            recipient_email = recipient.email
            recipient_name = recipient.get_full_name()

        # Проверяем наличие email
        if not recipient_email:
            logger.warning(f'У получателя уведомления нет email для заявки {request_id}')
            return

        # Подготавливаем контекст для шаблона
        context = {
            'request': request,
            'request_number': request.request_number if hasattr(request, 'request_number') else f'#{request.id}',
            'title': request.title if hasattr(request, 'title') else 'Заявка на материалы',
            'created_by': request.created_by,
            'project': request.project,
            'current_step': request.current_approval_step,
            'recipient_name': recipient_name,
            'status_display': request.get_status_display(),
            'approver_name': kwargs.get('approver_name', ''),
            'comment': kwargs.get('comment', ''),
            'rejection_reason': kwargs.get('rejection_reason', ''),
            'site_url': settings.SITE_URL,
            'site_name': settings.SITE_NAME,
        }

        # Выбираем шаблон и тему в зависимости от типа уведомления
        if notification_type == 'created':
            template_name = 'request_created'
            subject = f'📝 Новая заявка на согласование - {settings.SITE_NAME}'

        elif notification_type == 'step_approved':
            template_name = 'step_approved'
            subject = f'✅ Заявка ожидает вашего согласования - {settings.SITE_NAME}'

        elif notification_type == 'fully_approved':
            template_name = 'fully_approved'
            subject = f'🎉 Ваша заявка полностью согласована - {settings.SITE_NAME}'

        elif notification_type == 'rejected':
            template_name = 'request_rejected'
            subject = f'❌ Ваша заявка отклонена - {settings.SITE_NAME}'

        else:
            logger.error(f'Неизвестный тип уведомления: {notification_type}')
            return

        # Рендерим HTML и текстовую версии
        html_message = render_to_string(f'material_requests/emails/{template_name}.html', context)
        text_message = render_to_string(f'material_requests/emails/{template_name}.txt', context)

        # Отправляем email
        send_mail(
            subject=subject,
            message=text_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            html_message=html_message,
            fail_silently=False,
        )

        logger.info(f'Email уведомление типа "{notification_type}" для заявки {request_id} отправлено на {recipient_email}')

    except MaterialRequest.DoesNotExist:
        logger.error(f'Заявка с ID {request_id} не найдена')
        raise

    except Exception as exc:
        logger.error(f'Ошибка при отправке email уведомления для заявки {request_id}: {str(exc)}')
        # Retry задачи при ошибке
        raise self.retry(exc=exc)
