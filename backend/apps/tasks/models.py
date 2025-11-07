# apps/tasks/models.py
"""
Модель для управления задачами.

Руководители и ИТР могут назначать задачи сотрудникам и подрядчикам.
При создании, изменении, отмене задачи отправляется email уведомление.
Автоматическая проверка просроченных задач через Celery.
"""

from django.db import models
from django.utils import timezone
from apps.users.models import User, Company
from apps.projects.models import Project


class Task(models.Model):
    """
    Модель задачи для назначения работ сотрудникам и подрядчикам.
    """

    # Статусы задачи
    STATUS_IN_PROGRESS = 'IN_PROGRESS'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_OVERDUE = 'OVERDUE'
    STATUS_REJECTED = 'REJECTED'

    STATUS_CHOICES = [
        (STATUS_IN_PROGRESS, 'В исполнении'),
        (STATUS_COMPLETED, 'Исполнено'),
        (STATUS_OVERDUE, 'Просрочено'),
        (STATUS_REJECTED, 'Отклонено'),
    ]

    # Основная информация
    task_number = models.CharField(
        'Номер задачи',
        max_length=50,
        unique=True,
        editable=False,
        help_text='Автогенерируемый номер в формате TASK-YYYYMMDD-XXX'
    )

    title = models.CharField(
        'Название задачи',
        max_length=255,
        help_text='Краткое название задачи'
    )

    description = models.TextField(
        'Описание задачи',
        blank=True,
        null=True,
        help_text='Полное описание задачи с деталями (опционально)'
    )

    # Участники
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_tasks',
        verbose_name='От кого',
        help_text='Пользователь, создавший задачу. При удалении создателя задача остается в статусе "В процессе"'
    )

    assigned_to_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='assigned_user_tasks',
        verbose_name='Кому (сотрудник)',
        null=True,
        blank=True,
        help_text='Исполнитель - сотрудник. При удалении исполнителя задача переходит в статус "Просрочено"'
    )

    assigned_to_contractor = models.ForeignKey(
        'users.User',  # Подрядчики тоже User, но с другой ролью
        on_delete=models.SET_NULL,
        related_name='assigned_contractor_tasks',
        verbose_name='Кому (подрядчик)',
        null=True,
        blank=True,
        limit_choices_to={'role': 'CONTRACTOR'},
        help_text='Исполнитель - подрядчик. При удалении подрядчика задача переходит в статус "Просрочено"'
    )

    # Сроки
    created_at = models.DateTimeField(
        'Дата создания',
        auto_now_add=True,
        help_text='Автоматически устанавливается при создании'
    )

    updated_at = models.DateTimeField(
        'Дата изменения',
        auto_now=True,
        help_text='Автоматически обновляется при изменении'
    )

    deadline = models.DateTimeField(
        'Срок исполнения',
        help_text='Дедлайн выполнения задачи'
    )

    completed_at = models.DateTimeField(
        'Дата выполнения',
        null=True,
        blank=True,
        help_text='Устанавливается при отметке задачи как выполненной'
    )

    # Статус
    status = models.CharField(
        'Статус',
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_IN_PROGRESS,
        help_text='Текущий статус задачи'
    )

    # Отмена задачи
    rejection_reason = models.TextField(
        'Причина отклонения',
        null=True,
        blank=True,
        help_text='Обязательно при отмене задачи'
    )

    rejected_at = models.DateTimeField(
        'Дата отклонения',
        null=True,
        blank=True
    )

    # Компания и проект
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='tasks',
        verbose_name='Компания',
        help_text='Компания, к которой относится задача'
    )

    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        related_name='tasks',
        verbose_name='Проект',
        null=True,
        blank=True,
        help_text='Проект, к которому относится задача (опционально)'
    )

    # Soft delete (корзина)
    deleted_at = models.DateTimeField(
        'Удалено',
        null=True,
        blank=True,
        help_text='Время перемещения в корзину'
    )

    is_deleted = models.BooleanField(
        'В корзине',
        default=False,
        help_text='True если задача в корзине'
    )

    class Meta:
        db_table = 'tasks'
        verbose_name = 'Задача'
        verbose_name_plural = 'Задачи'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['task_number']),
            models.Index(fields=['status']),
            models.Index(fields=['deadline']),
            models.Index(fields=['created_by']),
            models.Index(fields=['assigned_to_user']),
            models.Index(fields=['assigned_to_contractor']),
            models.Index(fields=['company']),
            models.Index(fields=['is_deleted']),
        ]

    def __str__(self):
        return f"{self.task_number}: {self.title}"

    def save(self, *args, **kwargs):
        """
        Переопределяем save для автогенерации номера задачи.
        """
        if not self.task_number:
            self.task_number = self.generate_task_number()

        # Автоматически проверяем просрочку при сохранении
        if self.status == self.STATUS_IN_PROGRESS and self.deadline < timezone.now():
            self.status = self.STATUS_OVERDUE

        super().save(*args, **kwargs)

    def generate_task_number(self):
        """
        Генерирует уникальный номер задачи в формате TASK-YYYYMMDD-XXX.

        Пример: TASK-20251105-001
        """
        from django.db.models import Max
        import re

        today = timezone.now().strftime('%Y%m%d')
        prefix = f'TASK-{today}-'

        # Находим последний номер задачи за сегодня
        last_task = Task.objects.filter(
            task_number__startswith=prefix
        ).aggregate(Max('task_number'))

        last_number = last_task['task_number__max']

        if last_number:
            # Извлекаем последнюю цифру и увеличиваем на 1
            match = re.search(r'-(\d{3})$', last_number)
            if match:
                next_number = int(match.group(1)) + 1
            else:
                next_number = 1
        else:
            next_number = 1

        return f'{prefix}{next_number:03d}'

    @property
    def assigned_to(self):
        """
        Возвращает исполнителя задачи (сотрудник или подрядчик).
        """
        return self.assigned_to_user or self.assigned_to_contractor

    @property
    def assigned_to_email(self):
        """
        Возвращает email исполнителя для отправки уведомлений.
        """
        assignee = self.assigned_to
        return assignee.email if assignee else None

    @property
    def is_overdue(self):
        """
        Проверяет, просрочена ли задача.
        """
        if self.status == self.STATUS_IN_PROGRESS:
            return timezone.now() > self.deadline
        return self.status == self.STATUS_OVERDUE

    def mark_as_completed(self, user=None):
        """
        Отмечает задачу как выполненную.
        """
        self.status = self.STATUS_COMPLETED
        self.completed_at = timezone.now()
        self.save()

        # Отправляем уведомление создателю задачи
        from .tasks import send_task_notification
        send_task_notification.delay(
            task_id=self.id,
            notification_type='completed',
            completed_by_user_id=user.id if user else None
        )

    def mark_as_rejected(self, reason, user=None):
        """
        Отменяет задачу с указанием причины.
        """
        if not reason:
            raise ValueError('Необходимо указать причину отклонения')

        self.status = self.STATUS_REJECTED
        self.rejection_reason = reason
        self.rejected_at = timezone.now()
        self.save()

        # Отправляем уведомление исполнителю о отмене
        from .tasks import send_task_notification
        send_task_notification.delay(
            task_id=self.id,
            notification_type='rejected'
        )

    def soft_delete(self):
        """
        Мягкое удаление (перемещение в корзину).
        """
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save()
