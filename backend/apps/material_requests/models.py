from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.projects.models import Project


class MaterialRequest(models.Model):
    """
    Модель заявки на строительные материалы.
    Основная таблица для учета и контроля движения строительных материалов.
    """

    class Status(models.TextChoices):
        # Статусы согласно новой схеме согласования
        DRAFT = 'DRAFT', _('Черновик')
        UNDER_REVIEW = 'UNDER_REVIEW', _('На проверке снабжения')
        WAREHOUSE_CHECK = 'WAREHOUSE_CHECK', _('Центр склад')
        BACK_TO_SUPPLY = 'BACK_TO_SUPPLY', _('Снабжение')
        PROJECT_MANAGER_APPROVAL = 'PROJECT_MANAGER_APPROVAL', _('У руководителя проекта')
        DIRECTOR_APPROVAL = 'DIRECTOR_APPROVAL', _('У директора')
        REWORK = 'REWORK', _('На доработке')
        APPROVED = 'APPROVED', _('Согласовано')
        SENT_TO_SITE = 'SENT_TO_SITE', _('Отправить на объект (у зав.склада)')
        WAREHOUSE_SHIPPING = 'WAREHOUSE_SHIPPING', _('Отправлено на объект (у автора)')
        PAYMENT = 'PAYMENT', _('На оплате')
        PAID = 'PAID', _('Оплачено')
        DELIVERY = 'DELIVERY', _('Доставлено')
        COMPLETED = 'COMPLETED', _('Отработано')

    # Основные поля заявки
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='material_requests',
        verbose_name=_('Объект')
    )

    # Номер заявки (генерируется автоматически: З-001/25)
    request_number = models.CharField(
        _('Номер заявки'),
        max_length=50,
        unique=True,
        editable=False
    )

    # Автор заявки (прораб/начальник участка)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_material_requests',
        verbose_name=_('Автор (Прораб)')
    )

    # Статус заявки
    status = models.CharField(
        _('Статус'),
        max_length=30,
        choices=Status.choices,
        default=Status.DRAFT
    )

    # Ответственный за текущий этап
    responsible = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='responsible_material_requests',
        verbose_name=_('Ответственный')
    )

    # Дополнительные поля из карточки заявки
    drawing_reference = models.CharField(
        _('Чертёж / Лист'),
        max_length=255,
        blank=True,
        help_text=_('Ссылка на чертёж или номер листа')
    )

    work_type = models.CharField(
        _('Вид работ'),
        max_length=255,
        blank=True
    )

    notes = models.TextField(
        _('Примечание'),
        blank=True
    )

    # Подпись автора
    author_signature = models.CharField(
        _('Фамилия, инициалы, подпись автора'),
        max_length=255,
        blank=True
    )

    # Даты
    created_at = models.DateTimeField(_('Дата создания'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Последнее действие'), auto_now=True)

    class Meta:
        verbose_name = _('Заявка на материалы')
        verbose_name_plural = _('Заявки на материалы')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['author', 'created_at']),
            models.Index(fields=['responsible']),
        ]

    def __str__(self):
        return f"{self.request_number} - {self.project.name}"

    def save(self, *args, **kwargs):
        """
        Автоматическая генерация номера заявки при создании.
        Нумерация независимая для каждого объекта (проекта).
        Формат: З-{project_id}-{number}/{year}
        Например: З-10-001/25 (проект 10, заявка 001, год 2025)
        """
        if not self.request_number:
            from django.utils import timezone
            year = timezone.now().year % 100  # Последние 2 цифры года
            project_id = self.project.id

            # Находим последнюю заявку текущего года для ДАННОГО ПРОЕКТА
            last_request = MaterialRequest.objects.filter(
                project=self.project,
                request_number__endswith=f'/{year:02d}'
            ).order_by('-created_at').first()

            if last_request:
                # Извлекаем номер из последней заявки этого проекта
                # Формат: З-{project_id}-{number}/{year}
                try:
                    parts = last_request.request_number.split('-')
                    if len(parts) >= 3:
                        # Новый формат: З-{project_id}-{number}/{year}
                        number_part = parts[2].split('/')[0]
                        last_number = int(number_part)
                    else:
                        # Старый формат: З-{number}/{year}
                        last_number = int(parts[1].split('/')[0])
                    new_number = last_number + 1
                except (IndexError, ValueError):
                    new_number = 1
            else:
                # Первая заявка для этого проекта в текущем году
                new_number = 1

            self.request_number = f'З-{project_id}-{new_number:03d}/{year:02d}'

        super().save(*args, **kwargs)


class MaterialRequestItem(models.Model):
    """
    Модель для позиций материалов в заявке.
    Одна заявка может содержать несколько позиций материалов.
    """

    class ItemStatus(models.TextChoices):
        # Статусы позиции материала (для отмены)
        ACTIVE = 'ACTIVE', _('Активна')
        CANCELLED = 'CANCELLED', _('Отменена')

    class ApprovalStatus(models.TextChoices):
        # Статусы согласования позиции директором
        PENDING = 'PENDING', _('Ожидает согласования')
        APPROVED = 'APPROVED', _('Согласовано')
        REJECTED = 'REJECTED', _('Отклонено')
        REWORK = 'REWORK', _('На доработке')

    class AvailabilityStatus(models.TextChoices):
        # Статусы наличия материала на складе
        NOT_CHECKED = 'NOT_CHECKED', _('Не проверено')
        IN_STOCK = 'IN_STOCK', _('В наличии')
        PARTIALLY_IN_STOCK = 'PARTIALLY_IN_STOCK', _('Частично в наличии')
        OUT_OF_STOCK = 'OUT_OF_STOCK', _('Нет на складе')

    class ProcessStatus(models.TextChoices):
        # Независимый статус движения позиции по процессу согласования
        # Новая логика: Автор → Снабжение → Завсклад → Снабжение → Инженер ПТО → Снабжение → Рук.проекта → Снабжение → Директор → Снабжение
        DRAFT = 'DRAFT', _('Черновик')
        UNDER_REVIEW = 'UNDER_REVIEW', _('Снабжение (проверка)')
        WAREHOUSE_CHECK = 'WAREHOUSE_CHECK', _('Завсклад')
        BACK_TO_SUPPLY = 'BACK_TO_SUPPLY', _('Снабжение (после склада)')
        ENGINEER_APPROVAL = 'ENGINEER_APPROVAL', _('Инженер ПТО')
        BACK_TO_SUPPLY_AFTER_ENGINEER = 'BACK_TO_SUPPLY_AFTER_ENGINEER', _('Снабжение (после инженера)')
        PROJECT_MANAGER_APPROVAL = 'PROJECT_MANAGER_APPROVAL', _('Руководитель проекта')
        BACK_TO_SUPPLY_AFTER_PM = 'BACK_TO_SUPPLY_AFTER_PM', _('Снабжение (после рук.проекта)')
        DIRECTOR_APPROVAL = 'DIRECTOR_APPROVAL', _('Директор')
        BACK_TO_SUPPLY_AFTER_DIRECTOR = 'BACK_TO_SUPPLY_AFTER_DIRECTOR', _('Снабжение (после директора)')
        RETURNED_FOR_REVISION = 'RETURNED_FOR_REVISION', _('На доработке (у автора)')
        REWORK = 'REWORK', _('На доработке')
        APPROVED = 'APPROVED', _('Согласовано')
        SENT_TO_SITE = 'SENT_TO_SITE', _('Отправить на объект (у зав.склада)')
        WAREHOUSE_SHIPPING = 'WAREHOUSE_SHIPPING', _('Отправлено на объект (у автора)')
        PAYMENT = 'PAYMENT', _('На оплате')
        PAID = 'PAID', _('Оплачено')
        DELIVERY = 'DELIVERY', _('Доставлено')
        COMPLETED = 'COMPLETED', _('Отработано')

    request = models.ForeignKey(
        MaterialRequest,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name=_('Заявка')
    )

    # Название материала
    material_name = models.CharField(
        _('Материал'),
        max_length=255,
        help_text=_('Наименование материала (например: Арматура Ø12)')
    )

    # Количество
    quantity = models.DecimalField(
        _('Количество'),
        max_digits=10,
        decimal_places=2
    )

    # Единица измерения
    unit = models.CharField(
        _('Ед. изм.'),
        max_length=50,
        default='шт',
        help_text=_('Единица измерения (кг, м, м², м³, шт и т.д.)')
    )

    # Дополнительные параметры
    specifications = models.TextField(
        _('Спецификация'),
        blank=True,
        help_text=_('Дополнительные характеристики материала')
    )

    # Порядковый номер в заявке
    order = models.PositiveIntegerField(
        _('Порядок'),
        default=0
    )

    # Статус позиции (активна/отменена)
    status = models.CharField(
        _('Статус позиции'),
        max_length=20,
        choices=ItemStatus.choices,
        default=ItemStatus.ACTIVE
    )

    # Статус согласования директором
    approval_status = models.CharField(
        _('Статус согласования'),
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING
    )

    # Статус наличия на складе (проверяется зав.центрскладом)
    availability_status = models.CharField(
        _('Наличие на складе'),
        max_length=30,
        choices=AvailabilityStatus.choices,
        default=AvailabilityStatus.NOT_CHECKED,
        help_text=_('Статус проверки наличия материала на складе')
    )

    # Независимый статус движения позиции по процессу согласования
    item_status = models.CharField(
        _('Статус позиции в процессе'),
        max_length=30,
        choices=ProcessStatus.choices,
        default=ProcessStatus.DRAFT,
        help_text=_('Независимый статус движения позиции материала по процессу согласования')
    )

    # Количество в наличии (если частично)
    available_quantity = models.DecimalField(
        _('Количество в наличии'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Указывается при частичном наличии на складе')
    )

    # Причина отмены
    cancellation_reason = models.TextField(
        _('Причина отмены'),
        blank=True,
        help_text=_('Указывается при отмене позиции')
    )

    # Кто отменил позицию
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cancelled_material_items',
        verbose_name=_('Отменил')
    )

    # Дата отмены
    cancelled_at = models.DateTimeField(
        _('Дата отмены'),
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(_('Добавлено'), auto_now_add=True)

    class Meta:
        verbose_name = _('Позиция материала')
        verbose_name_plural = _('Позиции материалов')
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.material_name} - {self.quantity} {self.unit}"


class MaterialRequestDocument(models.Model):
    """
    Модель для документов и вложений заявки.
    Включает: реестр, счета, ТТН, фото поставки и т.д.
    """

    class DocumentType(models.TextChoices):
        REGISTRY = 'REGISTRY', _('Реестр')
        INVOICE = 'INVOICE', _('Счёт')
        WAYBILL = 'WAYBILL', _('ТТН')
        PHOTO = 'PHOTO', _('Фото')
        OTHER = 'OTHER', _('Другое')

    request = models.ForeignKey(
        MaterialRequest,
        on_delete=models.CASCADE,
        related_name='documents',
        verbose_name=_('Заявка')
    )

    document_type = models.CharField(
        _('Тип документа'),
        max_length=20,
        choices=DocumentType.choices,
        default=DocumentType.OTHER
    )

    # Файл документа (PDF, JPG, PNG, WebP)
    file = models.FileField(
        _('Файл'),
        upload_to='material_requests/%Y/%m/%d/'
    )

    file_name = models.CharField(
        _('Название файла'),
        max_length=255
    )

    description = models.CharField(
        _('Описание'),
        max_length=500,
        blank=True
    )

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_('Загрузил')
    )

    created_at = models.DateTimeField(_('Дата загрузки'), auto_now_add=True)

    class Meta:
        verbose_name = _('Документ заявки')
        verbose_name_plural = _('Документы заявок')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_document_type_display()} - {self.file_name}"

    def save(self, *args, **kwargs):
        """
        Автоматическая конвертация изображений в WebP при сохранении.
        Согласно ТЗ пункт 7: "Фото автоматически конвертируются в .webp"
        """
        if self.file and self.document_type == self.DocumentType.PHOTO:
            from apps.issues.utils import convert_image_to_webp, validate_image_format

            # Проверяем, что это новый загружаемый файл
            is_new_upload = hasattr(self.file, 'content_type') or (
                hasattr(self.file, 'file') and
                hasattr(self.file.file, 'content_type')
            )

            if is_new_upload and validate_image_format(self.file):
                try:
                    # Конвертируем в WebP
                    converted_file = convert_image_to_webp(
                        self.file,
                        quality=85,
                        max_dimension=2560
                    )
                    self.file = converted_file
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Ошибка конвертации изображения в WebP: {str(e)}")

        super().save(*args, **kwargs)


class MaterialRequestHistory(models.Model):
    """
    Модель для истории изменений заявки.
    Логирование всех действий, статусов, ответственных и времени.
    Согласно ТЗ пункт 7: "Логи всех действий сохраняются в MaterialRequestHistory"
    """

    request = models.ForeignKey(
        MaterialRequest,
        on_delete=models.CASCADE,
        related_name='history',
        verbose_name=_('Заявка')
    )

    # Кто выполнил действие
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_('Пользователь')
    )

    # Старый статус
    old_status = models.CharField(
        _('Старый статус'),
        max_length=30,
        blank=True
    )

    # Новый статус
    new_status = models.CharField(
        _('Новый статус'),
        max_length=30
    )

    # Комментарий к действию
    comment = models.TextField(
        _('Комментарий'),
        blank=True
    )

    # Время действия
    created_at = models.DateTimeField(_('Дата и время'), auto_now_add=True)

    class Meta:
        verbose_name = _('История заявки')
        verbose_name_plural = _('История заявок')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.request.request_number} - {self.new_status} ({self.created_at})"


class MaterialRequestComment(models.Model):
    """
    Модель для комментариев к заявке.
    Вкладка "Комментарии и история статусов" в карточке заявки.
    """

    request = models.ForeignKey(
        MaterialRequest,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name=_('Заявка')
    )

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_('Автор')
    )

    text = models.TextField(_('Комментарий'))

    # Поле для отслеживания пользователей, которые прочитали комментарий
    read_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='read_material_request_comments',
        blank=True,
        verbose_name=_('Прочитано пользователями')
    )

    created_at = models.DateTimeField(_('Создан'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Обновлен'), auto_now=True)

    class Meta:
        verbose_name = _('Комментарий к заявке')
        verbose_name_plural = _('Комментарии к заявкам')
        ordering = ['created_at']

    def __str__(self):
        return f"Комментарий от {self.author} к {self.request.request_number}"
