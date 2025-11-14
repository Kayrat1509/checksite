# apps/material_requests/models.py
"""
Модели для системы заявок на строительные материалы.

Система включает:
1. MaterialRequest - основная заявка
2. MaterialRequestItem - позиция заявки (материал)
3. ApprovalStep - этап согласования заявки
4. MaterialRequestHistory - история изменений заявки
"""

from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.core.cache import cache
from apps.users.models import User, Company
from apps.projects.models import Project


class MaterialRequest(models.Model):
    """
    Основная модель заявки на строительные материалы.

    Жизненный цикл заявки:
    1. DRAFT - Черновик (автор создает заявку)
    2. IN_APPROVAL - На согласовании (проходит цепочку согласования)
    3. APPROVED - Согласована (все согласовали, передана снабженцу)
    4. IN_PAYMENT - На оплате (снабженец нашел поставщика)
    5. IN_DELIVERY - На доставке (оплачено, ждем поставку)
    6. COMPLETED - Отработана (материалы получены на объекте)
    7. REJECTED - Отклонена (возвращена на доработку)
    """

    # Статусы заявки
    STATUS_DRAFT = 'DRAFT'
    STATUS_IN_APPROVAL = 'IN_APPROVAL'
    STATUS_APPROVED = 'APPROVED'
    STATUS_IN_PAYMENT = 'IN_PAYMENT'
    STATUS_IN_DELIVERY = 'IN_DELIVERY'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_REJECTED = 'REJECTED'

    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Черновик'),
        (STATUS_IN_APPROVAL, 'На согласовании'),
        (STATUS_APPROVED, 'Согласована'),
        (STATUS_IN_PAYMENT, 'На оплате'),
        (STATUS_IN_DELIVERY, 'На доставке'),
        (STATUS_COMPLETED, 'Отработана и доставлена на объект'),
        (STATUS_REJECTED, 'На доработке'),
    ]

    # Основная информация
    request_number = models.CharField(
        'Номер заявки',
        max_length=50,
        editable=False,
        help_text='Автогенерируемый номер в формате ДДММГГГГ-№ (уникален в рамках компании)'
    )

    title = models.CharField(
        'Название заявки',
        max_length=255,
        help_text='Краткое описание заявки'
    )

    description = models.TextField(
        'Описание',
        blank=True,
        null=True,
        help_text='Дополнительное описание или комментарии к заявке'
    )

    # Автор заявки (может быть: Мастер, Прораб, Начальник участка)
    author = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_material_requests',
        verbose_name='Автор заявки',
        help_text='Сотрудник, создавший заявку (Мастер, Прораб или Начальник участка)'
    )

    # Привязка к проекту (компания доступна через project.company)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='material_requests',
        verbose_name='Проект',
        help_text='Проект, для которого создается заявка'
    )

    # Статус заявки
    status = models.CharField(
        'Статус',
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
        help_text='Текущий статус заявки'
    )

    # Текущий этап согласования
    current_approval_role = models.CharField(
        'Текущая роль на согласовании',
        max_length=50,
        blank=True,
        null=True,
        help_text='Роль сотрудника, который должен согласовать заявку сейчас'
    )

    # Даты
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

    submitted_at = models.DateTimeField(
        'Дата отправки на согласование',
        null=True,
        blank=True,
        help_text='Когда заявка была отправлена на согласование'
    )

    approved_at = models.DateTimeField(
        'Дата полного согласования',
        null=True,
        blank=True,
        help_text='Когда директор согласовал заявку'
    )

    completed_at = models.DateTimeField(
        'Дата завершения',
        null=True,
        blank=True,
        help_text='Когда материалы были получены на объекте'
    )

    # Причина возврата на доработку
    rejection_reason = models.TextField(
        'Причина возврата',
        blank=True,
        null=True,
        help_text='Почему заявка была возвращена на доработку'
    )

    rejected_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rejected_material_requests',
        verbose_name='Кто вернул на доработку'
    )

    rejected_at = models.DateTimeField(
        'Дата возврата',
        null=True,
        blank=True
    )

    # Soft delete
    is_deleted = models.BooleanField(
        'Удалена',
        default=False,
        help_text='Мягкое удаление'
    )

    deleted_at = models.DateTimeField(
        'Дата удаления',
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'material_requests'
        verbose_name = 'Заявка на материалы'
        verbose_name_plural = 'Заявки на материалы'
        ordering = ['-created_at']
        # Уникальность номера заявки в рамках компании
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'request_number'],
                name='unique_request_number_per_company'
            )
        ]
        indexes = [
            models.Index(fields=['request_number']),
            models.Index(fields=['status']),
            models.Index(fields=['author']),
            models.Index(fields=['project']),
            models.Index(fields=['company']),
            models.Index(fields=['current_approval_role']),
            models.Index(fields=['is_deleted']),

            # Составные индексы для частых запросов (оптимизация производительности)
            # Фильтрация по компании + статусу + soft delete (основной фильтр в ViewSet)
            models.Index(fields=['company', 'status', 'is_deleted'], name='idx_company_status_deleted'),

            # Фильтрация по компании + роли согласующего (для вкладки "На согласовании")
            models.Index(fields=['company', 'current_approval_role'], name='idx_company_approval_role'),

            # Фильтрация по проекту + статусу (для отчетов по проекту)
            models.Index(fields=['project', 'status'], name='idx_project_status'),

            # Фильтрация по автору + дате создания (для вкладки "Мои заявки")
            models.Index(fields=['author', '-created_at'], name='idx_author_created'),
        ]

    def __str__(self):
        return f"{self.request_number}: {self.title}"

    def save(self, *args, **kwargs):
        """Переопределяем save для автогенерации номера заявки."""
        from django.db import transaction

        if not self.request_number:
            # Генерируем номер внутри транзакции с блокировкой для предотвращения race condition
            with transaction.atomic():
                self.request_number = self.generate_request_number()
        super().save(*args, **kwargs)

    def generate_request_number(self):
        """
        Генерирует уникальный номер заявки в формате ДДММГГГГ-№.

        Номер продолжается (не сбрасывается) и уникален в рамках компании.
        Пример: 12112025-1, 12112025-2, 13112025-3 (номер 3 продолжается на следующий день)

        ВАЖНО: Метод должен вызываться внутри transaction.atomic() для предотвращения race condition.
        """
        from django.db.models import Max
        import re

        # Текущая дата в формате ДДММГГГГ
        today = timezone.now().strftime('%d%m%Y')

        # Используем select_for_update для блокировки строк при чтении
        # Это предотвращает одновременное создание заявок с одинаковыми номерами
        last_request = MaterialRequest.objects.filter(
            project__company=self.project.company
        ).select_for_update().aggregate(Max('request_number'))

        last_number = last_request['request_number__max']

        if last_number:
            # Извлекаем последний порядковый номер (после дефиса)
            match = re.search(r'-(\d+)$', last_number)
            if match:
                next_number = int(match.group(1)) + 1
            else:
                next_number = 1
        else:
            next_number = 1

        return f'{today}-{next_number}'

    def submit_for_approval(self):
        """
        Отправляет заявку на согласование.

        Все операции выполняются атомарно для предотвращения несогласованного состояния.
        """
        from django.db import transaction

        if self.status != self.STATUS_DRAFT:
            raise ValidationError('Только черновики можно отправить на согласование')

        # Определяем первую роль в цепочке согласования на основе роли автора
        first_role = self.get_first_approval_role()

        # Атомарная транзакция для обновления статуса и создания шага согласования
        with transaction.atomic():
            self.status = self.STATUS_IN_APPROVAL
            self.current_approval_role = first_role
            self.submitted_at = timezone.now()
            self.save()

            # Создаем первый шаг согласования
            ApprovalStep.objects.create(
                material_request=self,
                role=first_role,
                status=ApprovalStep.STATUS_PENDING
            )

    def get_first_approval_role(self):
        """
        Определяет первую роль в цепочке согласования на основе роли автора.

        Правила:
        - Если автор Мастер или Прораб -> начинаем с Начальника участка
        - Если автор Начальник участка -> начинаем с Инженера ПТО
        """
        if self.author.role in ['MASTER', 'FOREMAN']:
            return 'SITE_MANAGER'
        elif self.author.role == 'SITE_MANAGER':
            return 'ENGINEER'
        else:
            # Если роль не соответствует ожидаемым, начинаем с Начальника участка
            return 'SITE_MANAGER'

    def approve_by_role(self, user, role):
        """
        Согласование заявки текущей ролью.

        Args:
            user: Пользователь, который согласует
            role: Роль пользователя

        Все операции выполняются атомарно для предотвращения несогласованного состояния.
        """
        from django.db import transaction

        if self.status != self.STATUS_IN_APPROVAL:
            raise ValidationError('Заявка не находится на согласовании')

        if self.current_approval_role != role:
            raise ValidationError(f'Сейчас заявка должна согласовываться ролью {self.current_approval_role}')

        # Все операции выполняются атомарно
        with transaction.atomic():
            # Отмечаем текущий шаг как согласованный
            current_step = ApprovalStep.objects.filter(
                material_request=self,
                role=role,
                status=ApprovalStep.STATUS_PENDING
            ).first()

            if current_step:
                current_step.status = ApprovalStep.STATUS_APPROVED
                current_step.approved_by = user
                current_step.approved_at = timezone.now()
                current_step.save()

            # Определяем следующую роль в цепочке
            next_role = self.get_next_approval_role(role)

            if next_role:
                # Есть следующий этап
                self.current_approval_role = next_role
                self.save()

                # Создаем следующий шаг согласования
                ApprovalStep.objects.create(
                    material_request=self,
                    role=next_role,
                    status=ApprovalStep.STATUS_PENDING
                )
            else:
                # Это был последний этап (Директор согласовал)
                self.status = self.STATUS_APPROVED
                self.current_approval_role = None
                self.approved_at = timezone.now()
                self.save()

    def get_company_available_roles(self):
        """
        Получает список доступных ролей в компании (с кэшированием).

        Кэширование на 5 минут для предотвращения N+1 проблемы при массовом согласовании.
        """
        company_id = self.project.company_id
        cache_key = f'company_available_roles_{company_id}'
        available_roles = cache.get(cache_key)

        if available_roles is None:
            # Получаем все активные роли пользователей в компании
            available_roles = set(
                User.objects.filter(company_id=company_id, is_active=True)
                .values_list('role', flat=True)
                .distinct()
            )
            # Кэшируем на 5 минут
            cache.set(cache_key, available_roles, timeout=300)

        return available_roles

    def get_next_approval_role(self, current_role):
        """
        Определяет следующую роль в цепочке согласования.

        Цепочка: Мастер → Прораб → Начальник участка → Инженер ПТО →
                 Руководитель проекта → Главный инженер → Директор → (конец)

        Пропускаем роль, если нет пользователя с такой ролью в компании.
        Использует кэширование для предотвращения N+1 проблемы.
        """
        approval_chain = [
            'MASTER',
            'FOREMAN',
            'SITE_MANAGER',
            'ENGINEER',
            'PROJECT_MANAGER',
            'CHIEF_ENGINEER',
            'DIRECTOR',
        ]

        try:
            current_index = approval_chain.index(current_role)
        except ValueError:
            return None

        # Получаем доступные роли в компании (с кэшированием)
        available_roles = self.get_company_available_roles()

        # Ищем следующую роль, для которой есть пользователи в компании
        for i in range(current_index + 1, len(approval_chain)):
            next_role = approval_chain[i]
            # Проверяем через кэшированный set (O(1) вместо запроса к БД)
            if next_role in available_roles:
                return next_role

        # Если дошли до конца цепочки
        return None

    def reject_to_author(self, user, reason):
        """
        Возвращает заявку автору на доработку.

        Args:
            user: Пользователь, который возвращает
            reason: Причина возврата

        Все операции выполняются атомарно для предотвращения несогласованного состояния.
        """
        from django.db import transaction

        if not reason:
            raise ValidationError('Необходимо указать причину возврата')

        # Атомарная транзакция для обновления заявки и шагов согласования
        with transaction.atomic():
            self.status = self.STATUS_REJECTED
            self.rejection_reason = reason
            self.rejected_by = user
            self.rejected_at = timezone.now()
            self.current_approval_role = None
            self.save()

            # Отмечаем все активные шаги согласования как отклоненные
            ApprovalStep.objects.filter(
                material_request=self,
                status=ApprovalStep.STATUS_PENDING
            ).update(
                status=ApprovalStep.STATUS_REJECTED,
                approved_at=timezone.now()
            )

    def mark_as_payment(self, user):
        """
        Снабженец переводит заявку в статус "На оплате".

        Args:
            user: Снабженец, который переводит
        """
        if self.status != self.STATUS_APPROVED:
            raise ValidationError('Только согласованные заявки можно перевести на оплату')

        if user.role != 'SUPPLY_MANAGER':
            raise ValidationError('Только снабженец может перевести заявку на оплату')

        self.status = self.STATUS_IN_PAYMENT
        self.save()

    def mark_as_paid(self, user):
        """
        Снабженец отмечает заявку как оплаченную (переводит в "На доставке").

        Args:
            user: Снабженец, который отмечает
        """
        if self.status != self.STATUS_IN_PAYMENT:
            raise ValidationError('Только заявки на оплате можно отметить как оплаченные')

        if user.role != 'SUPPLY_MANAGER':
            raise ValidationError('Только снабженец может отметить заявку как оплаченную')

        self.status = self.STATUS_IN_DELIVERY
        self.save()

    def mark_as_received(self, user):
        """
        Мастер/Прораб/Начальник участка/Завсклад объекта принимают материалы.

        Args:
            user: Пользователь, который принимает материалы

        Примечание: Для простых операций обновления одного поля транзакция не обязательна,
        но рекомендуется для единообразия и безопасности.
        """
        if self.status != self.STATUS_IN_DELIVERY:
            raise ValidationError('Только заявки на доставке можно отметить как принятые')

        allowed_roles = ['MASTER', 'FOREMAN', 'SITE_MANAGER', 'SITE_WAREHOUSE_MANAGER']
        if user.role not in allowed_roles:
            raise ValidationError('Только Мастер, Прораб, Начальник участка или Завсклад объекта могут принять материалы')

        self.status = self.STATUS_COMPLETED
        self.completed_at = timezone.now()
        self.save()


class MaterialRequestItem(models.Model):
    """
    Позиция заявки на материалы (конкретный материал).
    """

    # Статусы позиции
    STATUS_PENDING = 'PENDING'              # Ожидает доставки
    STATUS_PARTIALLY_DELIVERED = 'PARTIAL'  # Частично доставлено
    STATUS_DELIVERED = 'DELIVERED'          # Полностью доставлено
    STATUS_RECEIVED = 'RECEIVED'            # Принято на объекте

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Ожидает доставки'),
        (STATUS_PARTIALLY_DELIVERED, 'Частично доставлено'),
        (STATUS_DELIVERED, 'Полностью доставлено'),
        (STATUS_RECEIVED, 'Принято на объекте'),
    ]

    # Привязка к заявке
    material_request = models.ForeignKey(
        MaterialRequest,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Заявка',
        help_text='Заявка, к которой относится позиция'
    )

    # Информация о материале
    material_name = models.CharField(
        'Название материала',
        max_length=255,
        help_text='Название строительного материала'
    )

    unit = models.CharField(
        'Единица измерения',
        max_length=50,
        help_text='Единица измерения (шт, м, кг, л и т.д.)'
    )

    quantity_requested = models.DecimalField(
        'Количество по заявке',
        max_digits=10,
        decimal_places=2,
        help_text='Запрошенное количество материала'
    )

    quantity_actual = models.DecimalField(
        'Количество по факту',
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Фактически полученное количество (заполняется при получении)'
    )

    # Статус позиции
    status = models.CharField(
        'Статус позиции',
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        help_text='Статус доставки конкретной позиции'
    )

    notes = models.TextField(
        'Примечания',
        blank=True,
        null=True,
        help_text='Дополнительные примечания к позиции'
    )

    # Дата принятия позиции на объекте
    received_at = models.DateTimeField(
        'Дата принятия',
        null=True,
        blank=True,
        help_text='Когда позиция была принята на объекте (статус RECEIVED)'
    )

    # Связь с тендером (если позиция была объявлена в тендер)
    tender = models.ForeignKey(
        'tenders.Tender',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='material_items',
        verbose_name='Тендер',
        help_text='Тендер, если позиция была объявлена на тендер'
    )

    # Номер позиции в заявке
    position_number = models.PositiveIntegerField(
        'Номер позиции',
        help_text='Порядковый номер позиции в заявке'
    )

    def mark_as_received(self, user):
        """
        Отметить позицию как принятую на объекте.

        Args:
            user: Пользователь, который принимает позицию
        """
        from django.core.exceptions import ValidationError
        from django.utils import timezone

        if self.status == self.STATUS_RECEIVED:
            raise ValidationError('Эта позиция уже принята')

        allowed_roles = ['MASTER', 'FOREMAN', 'SITE_MANAGER', 'SITE_WAREHOUSE_MANAGER']
        if user.role not in allowed_roles:
            raise ValidationError(
                'Только Мастер, Прораб, Начальник участка или Завсклад объекта могут принять позицию'
            )

        self.status = self.STATUS_RECEIVED
        self.received_at = timezone.now()  # Сохраняем дату и время принятия
        self.save()

    def update_status_based_on_quantity(self):
        """
        Автоматически обновить статус позиции на основе фактического количества.
        """
        if self.quantity_actual is None or self.quantity_actual == 0:
            self.status = self.STATUS_PENDING
        elif self.quantity_actual < self.quantity_requested:
            self.status = self.STATUS_PARTIALLY_DELIVERED
        elif self.quantity_actual >= self.quantity_requested:
            self.status = self.STATUS_DELIVERED
        self.save()

    class Meta:
        db_table = 'material_request_items'
        verbose_name = 'Позиция заявки'
        verbose_name_plural = 'Позиции заявок'
        ordering = ['position_number']
        indexes = [
            models.Index(fields=['material_request']),
            models.Index(fields=['material_name']),
        ]

    def __str__(self):
        return f"{self.material_request.request_number} - Поз. {self.position_number}: {self.material_name}"


class ApprovalStep(models.Model):
    """
    Этап согласования заявки на материалы.

    Каждая заявка проходит несколько этапов согласования,
    для каждого этапа создается запись в этой таблице.
    """

    # Статусы этапа согласования
    STATUS_PENDING = 'PENDING'
    STATUS_APPROVED = 'APPROVED'
    STATUS_REJECTED = 'REJECTED'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Ожидает согласования'),
        (STATUS_APPROVED, 'Согласовано'),
        (STATUS_REJECTED, 'Отклонено'),
    ]

    # Привязка к заявке
    material_request = models.ForeignKey(
        MaterialRequest,
        on_delete=models.CASCADE,
        related_name='approval_steps',
        verbose_name='Заявка'
    )

    # Роль, которая должна согласовать
    role = models.CharField(
        'Роль согласующего',
        max_length=50,
        help_text='Роль пользователя, который должен согласовать этот этап'
    )

    # Статус этапа
    status = models.CharField(
        'Статус',
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING
    )

    # Кто согласовал
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_steps',
        verbose_name='Согласовал'
    )

    # Даты
    created_at = models.DateTimeField(
        'Дата создания',
        auto_now_add=True
    )

    approved_at = models.DateTimeField(
        'Дата согласования',
        null=True,
        blank=True
    )

    # Комментарий при согласовании
    comment = models.TextField(
        'Комментарий',
        blank=True,
        null=True
    )

    class Meta:
        db_table = 'material_request_approval_steps'
        verbose_name = 'Этап согласования'
        verbose_name_plural = 'Этапы согласования'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['material_request', 'role']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.material_request.request_number} - {self.role} ({self.get_status_display()})"


class MaterialRequestHistory(models.Model):
    """
    История изменений заявки на материалы.

    Сохраняет все важные действия с заявкой:
    - Создание
    - Отправка на согласование
    - Согласование на каждом этапе
    - Возврат на доработку
    - Перевод в статус оплаты/доставки/завершения
    """

    ACTION_CREATED = 'CREATED'
    ACTION_SUBMITTED = 'SUBMITTED'
    ACTION_APPROVED = 'APPROVED'
    ACTION_REJECTED = 'REJECTED'
    ACTION_PAYMENT = 'PAYMENT'
    ACTION_PAID = 'PAID'
    ACTION_DELIVERY = 'DELIVERY'
    ACTION_DELIVERED = 'DELIVERED'  # Обновление фактического количества позиции
    ACTION_ITEM_RECEIVED = 'ITEM_RECEIVED'  # Приёмка конкретной позиции
    ACTION_RECEIVED = 'RECEIVED'  # Приёмка всех материалов
    ACTION_COMPLETED = 'COMPLETED'

    ACTION_CHOICES = [
        (ACTION_CREATED, 'Создана'),
        (ACTION_SUBMITTED, 'Отправлена на согласование'),
        (ACTION_APPROVED, 'Согласована'),
        (ACTION_REJECTED, 'Возвращена на доработку'),
        (ACTION_PAYMENT, 'Переведена на оплату'),
        (ACTION_PAID, 'Оплачена'),
        (ACTION_DELIVERY, 'Переведена на доставку'),
        (ACTION_DELIVERED, 'Обновлено фактическое количество'),
        (ACTION_ITEM_RECEIVED, 'Позиция принята на объекте'),
        (ACTION_RECEIVED, 'Материалы приняты'),
        (ACTION_COMPLETED, 'Завершена'),
    ]

    # Привязка к заявке
    material_request = models.ForeignKey(
        MaterialRequest,
        on_delete=models.CASCADE,
        related_name='history',
        verbose_name='Заявка'
    )

    # Тип действия
    action = models.CharField(
        'Действие',
        max_length=20,
        choices=ACTION_CHOICES
    )

    # Кто выполнил действие
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='material_request_actions',
        verbose_name='Пользователь'
    )

    # Дата действия
    created_at = models.DateTimeField(
        'Дата действия',
        auto_now_add=True
    )

    # Дополнительная информация (JSON)
    details = models.JSONField(
        'Детали',
        default=dict,
        blank=True,
        help_text='Дополнительная информация о действии'
    )

    # Комментарий
    comment = models.TextField(
        'Комментарий',
        blank=True,
        null=True
    )

    class Meta:
        db_table = 'material_request_history'
        verbose_name = 'История заявки'
        verbose_name_plural = 'История заявок'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['material_request']),
            models.Index(fields=['action']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.material_request.request_number} - {self.get_action_display()} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"
