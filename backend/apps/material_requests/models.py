"""
Модели для системы поэтапного согласования заявок на материалы
"""
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.core.models import SoftDeleteMixin
import json


class MaterialRequest(SoftDeleteMixin, models.Model):
    """
    Заявка на строительные материалы с поэтапным согласованием.

    Цепочка согласования:
    Мастер/Прораб → Начальник участка → Инженер ПТО → Руководитель проекта →
    Главный инженер → Директор → Завсклад → Снабженец → Оплата → Доставка → Отработано

    Особенности:
    - Автор (Мастер/Прораб/Нач.участка) создаёт заявку
    - Каждый этап может согласовать или вернуть на доработку
    - Если роли нет в компании - этап автоматически пропускается
    - После согласования Директором → Завсклад → Снабженец
    - Нельзя редактировать заявку после отправки на согласование
    """

    class Status(models.TextChoices):
        """Статусы заявки"""
        DRAFT = 'DRAFT', 'Черновик'

        # Этапы согласования
        SITE_MANAGER_APPROVAL = 'SITE_MANAGER_APPROVAL', 'На согласовании у Начальника участка'
        ENGINEER_APPROVAL = 'ENGINEER_APPROVAL', 'На согласовании у Инженера ПТО'
        PM_APPROVAL = 'PM_APPROVAL', 'На согласовании у Руководителя проекта'
        CHIEF_POWER_APPROVAL = 'CHIEF_POWER_APPROVAL', 'На согласовании у Главного энергетика'
        CHIEF_ENGINEER_APPROVAL = 'CHIEF_ENGINEER_APPROVAL', 'На согласовании у Главного инженера'
        DIRECTOR_APPROVAL = 'DIRECTOR_APPROVAL', 'На согласовании у Директора'

        # После согласования Директором
        APPROVED = 'APPROVED', 'Согласовано'
        WAREHOUSE_REVIEW = 'WAREHOUSE_REVIEW', 'Проверка наличия на складе'
        PROCUREMENT = 'PROCUREMENT', 'Поиск поставщиков'
        PAYMENT = 'PAYMENT', 'На оплате'
        DELIVERY = 'DELIVERY', 'На доставке'
        COMPLETED = 'COMPLETED', 'Отработано и доставлено'

        # Отклонение
        REJECTED = 'REJECTED', 'Возвращена на доработку'

    # Основные поля
    number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='Номер заявки',
        help_text='Автоматически генерируется: MR-2024-0001'
    )
    company = models.ForeignKey(
        'users.Company',
        on_delete=models.CASCADE,
        related_name='material_requests',
        verbose_name='Компания'
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='material_requests',
        verbose_name='Проект'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_material_requests',
        verbose_name='Автор заявки'
    )

    # Статус и согласование
    status = models.CharField(
        max_length=50,
        choices=Status.choices,
        default=Status.DRAFT,
        verbose_name='Статус',
        db_index=True
    )
    current_approver_role = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        verbose_name='Роль текущего согласующего',
        help_text='Роль сотрудника, который должен согласовать сейчас'
    )
    current_approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pending_material_requests',
        verbose_name='Текущий согласующий'
    )

    # Цепочка согласования (динамическая)
    approval_chain = models.JSONField(
        default=list,
        verbose_name='Цепочка согласования',
        help_text='Список ролей для согласования в порядке следования'
    )
    approval_chain_index = models.IntegerField(
        default=0,
        verbose_name='Текущий индекс в цепочке',
        help_text='Индекс текущего этапа в approval_chain'
    )

    # История согласования
    approval_history = models.JSONField(
        default=list,
        verbose_name='История согласования',
        help_text='Список всех действий по согласованию'
    )

    # Причина отклонения
    rejection_reason = models.TextField(
        blank=True,
        verbose_name='Причина возврата на доработку'
    )
    rejected_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата возврата'
    )
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rejected_material_requests',
        verbose_name='Кто вернул на доработку'
    )

    # Даты
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления'
    )
    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата отправки на согласование'
    )
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата полного согласования'
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата завершения (доставлено)'
    )

    class Meta:
        verbose_name = 'Заявка на материалы'
        verbose_name_plural = 'Заявки на материалы'
        ordering = ['-created_at']
        db_table = 'material_requests'
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['project', 'status']),
            models.Index(fields=['created_by', 'status']),
            models.Index(fields=['current_approver', 'status']),
        ]

    def __str__(self):
        return f'{self.number} - {self.project.name if self.project else "Без проекта"}'

    def save(self, *args, **kwargs):
        """Автогенерация номера заявки при создании"""
        if not self.number:
            self.number = self.generate_request_number()
        super().save(*args, **kwargs)

    def generate_request_number(self):
        """
        Генерирует уникальный номер заявки в формате MR-YYYY-NNNN
        MR = Material Request
        """
        year = timezone.now().year
        prefix = f'MR-{year}-'

        # Находим последнюю заявку этого года
        last_request = MaterialRequest.objects.filter(
            number__startswith=prefix
        ).order_by('-number').first()

        if last_request:
            # Извлекаем номер из последней заявки
            try:
                last_number = int(last_request.number.split('-')[-1])
                new_number = last_number + 1
            except (ValueError, IndexError):
                new_number = 1
        else:
            new_number = 1

        return f'{prefix}{new_number:04d}'

    def build_approval_chain(self):
        """
        Строит динамическую цепочку согласования на основе:
        1. Автора заявки (пропускаем его роль)
        2. Наличия ролей в компании

        Логика:
        - Если автор = Мастер или Прораб → начинаем с Начальника участка
        - Если автор = Начальник участка → начинаем с Инженера ПТО
        - Пропускаем роли, которых нет в компании
        """
        from apps.users.models import User

        # Полная цепочка ролей (в порядке согласования)
        full_chain = [
            'SITE_MANAGER',      # Начальник участка
            'ENGINEER',          # Инженер ПТО
            'PROJECT_MANAGER',   # Руководитель проекта
            'CHIEF_POWER_ENGINEER',  # Главный энергетик
            'CHIEF_ENGINEER',    # Главный инженер
            'DIRECTOR',          # Директор
        ]

        # Определяем с какой роли начать
        author_role = self.created_by.role if self.created_by else None
        start_index = 0

        if author_role in ['MASTER', 'FOREMAN']:
            # Начинаем с Начальника участка
            start_index = 0
        elif author_role == 'SITE_MANAGER':
            # Начинаем с Инженера ПТО
            start_index = 1

        # Обрезаем цепочку с нужного места
        chain_to_check = full_chain[start_index:]

        # Проверяем наличие ролей в компании
        actual_chain = []
        for role in chain_to_check:
            has_role = User.objects.filter(
                company=self.company,
                role=role,
                is_active=True,
                is_deleted=False
            ).exists()

            if has_role:
                actual_chain.append(role)

        # Сохраняем цепочку
        self.approval_chain = actual_chain
        self.approval_chain_index = 0

        # Устанавливаем первого согласующего
        if actual_chain:
            self.current_approver_role = actual_chain[0]
            self.current_approver = self._get_approver_by_role(actual_chain[0])

        return actual_chain

    def _get_approver_by_role(self, role):
        """Находит первого активного пользователя с указанной ролью в компании"""
        from apps.users.models import User
        return User.objects.filter(
            company=self.company,
            role=role,
            is_active=True,
            is_deleted=False
        ).first()

    def submit_for_approval(self):
        """
        Отправляет заявку на согласование (из DRAFT в первый этап)
        """
        if self.status != self.Status.DRAFT:
            raise ValueError('Отправить на согласование можно только черновик')

        # Строим цепочку
        chain = self.build_approval_chain()

        if not chain:
            # Нет согласующих → сразу APPROVED
            self.status = self.Status.APPROVED
            self.approved_at = timezone.now()
        else:
            # Переходим к первому этапу
            first_role = chain[0]
            status_map = {
                'SITE_MANAGER': self.Status.SITE_MANAGER_APPROVAL,
                'ENGINEER': self.Status.ENGINEER_APPROVAL,
                'PROJECT_MANAGER': self.Status.PM_APPROVAL,
                'CHIEF_POWER_ENGINEER': self.Status.CHIEF_POWER_APPROVAL,
                'CHIEF_ENGINEER': self.Status.CHIEF_ENGINEER_APPROVAL,
                'DIRECTOR': self.Status.DIRECTOR_APPROVAL,
            }
            self.status = status_map.get(first_role, self.Status.SITE_MANAGER_APPROVAL)

        self.submitted_at = timezone.now()
        self.save()

    def approve(self, user, comment=''):
        """
        Согласование заявки текущим пользователем
        """
        # Проверка прав
        if self.current_approver_role != user.role:
            raise PermissionError(f'Согласовать может только {self.current_approver_role}')

        # Записываем в историю
        self.approval_history.append({
            'timestamp': timezone.now().isoformat(),
            'user_id': user.id,
            'user_name': user.get_full_name(),
            'user_role': user.role,
            'action': 'approved',
            'comment': comment,
            'previous_status': self.status,
        })

        # Переходим к следующему этапу
        self.approval_chain_index += 1

        if self.approval_chain_index >= len(self.approval_chain):
            # Закончили цепочку → APPROVED
            self.status = self.Status.APPROVED
            self.approved_at = timezone.now()
            self.current_approver_role = None
            self.current_approver = None
        else:
            # Следующий этап
            next_role = self.approval_chain[self.approval_chain_index]
            self.current_approver_role = next_role
            self.current_approver = self._get_approver_by_role(next_role)

            # Меняем статус
            status_map = {
                'SITE_MANAGER': self.Status.SITE_MANAGER_APPROVAL,
                'ENGINEER': self.Status.ENGINEER_APPROVAL,
                'PROJECT_MANAGER': self.Status.PM_APPROVAL,
                'CHIEF_POWER_ENGINEER': self.Status.CHIEF_POWER_APPROVAL,
                'CHIEF_ENGINEER': self.Status.CHIEF_ENGINEER_APPROVAL,
                'DIRECTOR': self.Status.DIRECTOR_APPROVAL,
            }
            self.status = status_map.get(next_role, self.status)

        self.save()

    def reject(self, user, reason):
        """
        Возврат заявки на доработку
        """
        if not reason or len(reason) < 10:
            raise ValueError('Укажите причину возврата (минимум 10 символов)')

        # Записываем в историю
        self.approval_history.append({
            'timestamp': timezone.now().isoformat(),
            'user_id': user.id,
            'user_name': user.get_full_name(),
            'user_role': user.role,
            'action': 'rejected',
            'reason': reason,
            'previous_status': self.status,
        })

        # Возвращаем в черновик
        self.status = self.Status.REJECTED
        self.rejection_reason = reason
        self.rejected_at = timezone.now()
        self.rejected_by = user
        self.current_approver_role = None
        self.current_approver = None

        # Сбрасываем цепочку (при повторной отправке начнётся заново)
        self.approval_chain = []
        self.approval_chain_index = 0

        self.save()

    def mark_as_paid(self, user, comment=''):
        """Снабженец отмечает заявку как оплаченную"""
        if user.role != 'SUPPLY_MANAGER':
            raise PermissionError('Отметить оплату может только Снабженец')

        if self.status not in [self.Status.PROCUREMENT, self.Status.PAYMENT]:
            raise ValueError('Неверный статус для отметки оплаты')

        self.approval_history.append({
            'timestamp': timezone.now().isoformat(),
            'user_id': user.id,
            'user_name': user.get_full_name(),
            'user_role': user.role,
            'action': 'marked_paid',
            'comment': comment,
            'previous_status': self.status,
        })

        self.status = self.Status.DELIVERY
        self.save()

    def mark_as_delivered(self, user, comment=''):
        """
        Приёмка материала (Мастер/Прораб/Нач.участка/Завсклад)
        """
        allowed_roles = ['MASTER', 'FOREMAN', 'SITE_MANAGER', 'SITE_WAREHOUSE_MANAGER']
        if user.role not in allowed_roles:
            raise PermissionError('Принять материал может только Мастер/Прораб/Нач.участка/Завсклад объекта')

        if self.status != self.Status.DELIVERY:
            raise ValueError('Принять можно только материал в статусе "На доставке"')

        self.approval_history.append({
            'timestamp': timezone.now().isoformat(),
            'user_id': user.id,
            'user_name': user.get_full_name(),
            'user_role': user.role,
            'action': 'delivered',
            'comment': comment,
            'previous_status': self.status,
        })

        self.status = self.Status.COMPLETED
        self.completed_at = timezone.now()
        self.save()


class MaterialRequestItem(models.Model):
    """
    Позиция материала в заявке.
    Каждая заявка содержит список материалов.
    """
    request = models.ForeignKey(
        MaterialRequest,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Заявка'
    )
    material_name = models.CharField(
        max_length=255,
        verbose_name='Название материала',
        help_text='Например: Цемент М500, Арматура А500С Ø12'
    )
    unit = models.CharField(
        max_length=50,
        verbose_name='Единица измерения',
        help_text='Например: тонна, м³, шт., кг'
    )
    quantity_requested = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        verbose_name='Количество по заявке',
        help_text='Запрошенное количество'
    )
    quantity_actual = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name='Количество по факту',
        help_text='Фактически доставленное количество'
    )
    notes = models.TextField(
        blank=True,
        verbose_name='Примечания',
        help_text='Дополнительная информация о материале'
    )

    # Порядковый номер в заявке
    order = models.PositiveIntegerField(
        default=0,
        verbose_name='Порядок'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Позиция материала'
        verbose_name_plural = 'Позиции материалов'
        ordering = ['request', 'order', 'id']
        db_table = 'material_request_items'

    def __str__(self):
        return f'{self.material_name} ({self.quantity_requested} {self.unit})'
