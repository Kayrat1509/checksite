from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.projects.models import Project
from apps.material_requests.models import MaterialRequest, MaterialRequestItem


class WarehouseReceipt(models.Model):
    """
    Модель для учета поступлений материалов на склад объекта.
    Связана с заявкой на материалы и отслеживает фактические поступления.
    """

    # Связь с заявкой на материалы
    material_request = models.ForeignKey(
        MaterialRequest,
        on_delete=models.CASCADE,
        related_name='warehouse_receipts',
        verbose_name=_('Заявка на материалы')
    )

    # Связь с позицией материала из заявки
    material_item = models.ForeignKey(
        MaterialRequestItem,
        on_delete=models.CASCADE,
        related_name='warehouse_receipts',
        verbose_name=_('Позиция материала'),
        help_text=_('Конкретная позиция материала из заявки')
    )

    # Проект (объект), на который прибыл материал
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='warehouse_receipts',
        verbose_name=_('Объект')
    )

    # Дата поступления на склад
    receipt_date = models.DateTimeField(
        _('Дата поступления'),
        help_text=_('Дата и время фактического поступления материала на склад объекта')
    )

    # Количество прибывшего материала
    received_quantity = models.DecimalField(
        _('Количество прибывшее'),
        max_digits=10,
        decimal_places=2,
        help_text=_('Фактическое количество материала, прибывшее на склад')
    )

    # Единица измерения (копируется из позиции материала для удобства)
    unit = models.CharField(
        _('Ед. изм.'),
        max_length=50,
        help_text=_('Единица измерения материала')
    )

    # Номер ТТН (товарно-транспортная накладная)
    waybill_number = models.CharField(
        _('Номер ТТН'),
        max_length=100,
        blank=True,
        help_text=_('Номер товарно-транспортной накладной')
    )

    # Поставщик
    supplier = models.CharField(
        _('Поставщик'),
        max_length=255,
        blank=True,
        help_text=_('Название компании-поставщика')
    )

    # Ответственный за приемку (кто принял материал на складе)
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='warehouse_receipts',
        verbose_name=_('Принял на складе'),
        help_text=_('Сотрудник, который принял материал на складе')
    )

    # Примечания к поступлению
    notes = models.TextField(
        _('Примечания'),
        blank=True,
        help_text=_('Дополнительные заметки о поступлении (брак, несоответствия и т.д.)')
    )

    # Статус качества
    class QualityStatus(models.TextChoices):
        GOOD = 'GOOD', _('Соответствует')
        DAMAGED = 'DAMAGED', _('Повреждено')
        DEFECTIVE = 'DEFECTIVE', _('Брак')
        PARTIAL = 'PARTIAL', _('Частично годное')

    quality_status = models.CharField(
        _('Статус качества'),
        max_length=20,
        choices=QualityStatus.choices,
        default=QualityStatus.GOOD,
        help_text=_('Состояние материала при приемке')
    )

    # Временные метки
    created_at = models.DateTimeField(_('Дата создания записи'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Последнее обновление'), auto_now=True)

    class Meta:
        verbose_name = _('Поступление на склад')
        verbose_name_plural = _('Поступления на склад')
        ordering = ['-receipt_date', '-created_at']
        indexes = [
            models.Index(fields=['project', 'receipt_date']),
            models.Index(fields=['material_request', 'receipt_date']),
            models.Index(fields=['received_by']),
        ]

    def __str__(self):
        return f"{self.material_item.material_name} - {self.received_quantity} {self.unit} ({self.receipt_date.strftime('%d.%m.%Y')})"

    def save(self, *args, **kwargs):
        """
        При сохранении автоматически заполняем связанные поля из материала.
        """
        if not self.unit and self.material_item:
            self.unit = self.material_item.unit

        if not self.project and self.material_request:
            self.project = self.material_request.project

        super().save(*args, **kwargs)
