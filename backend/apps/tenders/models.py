from django.db import models
from django.contrib.auth import get_user_model
from apps.projects.models import Project
from apps.core.mixins import SoftDeleteMixin, SoftDeleteManager

User = get_user_model()


class Tender(SoftDeleteMixin, models.Model):
    """
    Модель для управления тендерами.
    Доступ: ИТР (Инженер ПТО, Начальник участка, Прораб, Мастер) и Руководство (Руководитель проекта, Главный инженер, Директор)

    Использует мягкое удаление (soft delete):
    - При удалении тендер перемещается в корзину на 31 день
    - Можно восстановить в течение 31 дней
    - После 31 дня удаляется автоматически навсегда
    """

    class Status(models.TextChoices):
        """Статусы тендера"""
        DRAFT = 'DRAFT', 'Черновик'
        PUBLISHED = 'PUBLISHED', 'Опубликован'
        IN_PROGRESS = 'IN_PROGRESS', 'В процессе'
        CLOSED = 'CLOSED', 'Закрыт'
        CANCELLED = 'CANCELLED', 'Отменен'

    class TenderType(models.TextChoices):
        """Типы тендеров"""
        MATERIALS = 'MATERIALS', 'Материалы'
        WORKS = 'WORKS', 'Работы'
        EQUIPMENT = 'EQUIPMENT', 'Оборудование'
        SERVICES = 'SERVICES', 'Услуги'

    # Основная информация
    title = models.CharField('Название', max_length=500)
    description = models.TextField('Описание', blank=True)
    tender_type = models.CharField('Тип тендера', max_length=20, choices=TenderType.choices, default=TenderType.MATERIALS)
    company_name = models.CharField('Компания', max_length=300, blank=True, help_text='Название компании-заказчика')
    city = models.CharField('Город', max_length=100, blank=True, help_text='Город реализации проекта')

    # Привязка к проекту
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='tenders',
        verbose_name='Проект'
    )
    
    # Статус и даты
    status = models.CharField('Статус', max_length=20, choices=Status.choices, default=Status.DRAFT)
    start_date = models.DateTimeField('Дата начала', null=True, blank=True)
    end_date = models.DateTimeField('Дата окончания', null=True, blank=True)
    
    # Бюджет и сроки
    budget = models.DecimalField('Бюджет', max_digits=15, decimal_places=2, null=True, blank=True, help_text='Плановый бюджет в тенге')
    execution_period = models.CharField('Срок исполнения', max_length=200, blank=True, help_text='Например: 30 дней, 2 месяца, до 15.05.2025')

    # Ответственные
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_tenders',
        verbose_name='Создал'
    )
    responsible = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='responsible_tenders',
        verbose_name='Ответственный'
    )
    
    # Победитель тендера
    winner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='won_tenders',
        verbose_name='Победитель'
    )
    winning_amount = models.DecimalField('Сумма победителя', max_digits=15, decimal_places=2, null=True, blank=True)
    
    # Даты
    created_at = models.DateTimeField('Создан', auto_now_add=True)
    updated_at = models.DateTimeField('Обновлен', auto_now=True)

    # Managers для soft delete
    objects = SoftDeleteManager()  # По умолчанию: только активные (не удаленные)
    all_objects = models.Manager()  # Для доступа ко всем записям (включая удаленные)

    class Meta:
        verbose_name = 'Тендер'
        verbose_name_plural = 'Тендеры'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.get_status_display()})'


class TenderDocument(models.Model):
    """Документы тендера"""
    
    tender = models.ForeignKey(
        Tender,
        on_delete=models.CASCADE,
        related_name='documents',
        verbose_name='Тендер'
    )
    file = models.FileField('Файл', upload_to='tenders/documents/%Y/%m/%d/')
    file_name = models.CharField('Название файла', max_length=255)
    description = models.TextField('Описание', blank=True)
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name='Загрузил'
    )
    uploaded_at = models.DateTimeField('Загружен', auto_now_add=True)

    class Meta:
        verbose_name = 'Документ тендера'
        verbose_name_plural = 'Документы тендеров'
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.file_name


class TenderBid(models.Model):
    """Заявки на участие в тендере"""
    
    tender = models.ForeignKey(
        Tender,
        on_delete=models.CASCADE,
        related_name='bids',
        verbose_name='Тендер'
    )
    participant = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='tender_bids',
        verbose_name='Участник'
    )
    company_name = models.CharField('Название компании', max_length=500)
    amount = models.DecimalField('Предложенная сумма', max_digits=15, decimal_places=2)
    comment = models.TextField('Комментарий', blank=True)
    
    submitted_at = models.DateTimeField('Подана', auto_now_add=True)
    
    # Статус заявки
    is_winner = models.BooleanField('Победитель', default=False)

    class Meta:
        verbose_name = 'Заявка на тендер'
        verbose_name_plural = 'Заявки на тендеры'
        ordering = ['amount']  # Сортировка по сумме (от меньшей к большей)
        unique_together = ['tender', 'participant']  # Один участник - одна заявка

    def __str__(self):
        return f'{self.company_name} - {self.amount}'


class PublicTenderAccess(models.Model):
    """
    Модель для управления доступом внешних пользователей к публичному списку тендеров.
    Регистрация через специальную форму на главной странице.
    """
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Ожидает модерации'
        APPROVED = 'APPROVED', 'Одобрен'
        REJECTED = 'REJECTED', 'Отклонен'
    
    # Контактная информация
    company_name = models.CharField('Название компании', max_length=300)
    contact_person = models.CharField('Контактное лицо', max_length=200)
    email = models.EmailField('Email', unique=True)
    phone = models.CharField('Телефон', max_length=50)
    city = models.CharField('Город', max_length=100)
    
    # Пароль для входа в публичный раздел
    password = models.CharField('Пароль', max_length=255, help_text='Хэшированный пароль')
    
    # Статус заявки
    status = models.CharField('Статус', max_length=20, choices=Status.choices, default=Status.PENDING)
    
    # Даты
    created_at = models.DateTimeField('Дата регистрации', auto_now_add=True)
    approved_at = models.DateTimeField('Дата одобрения', null=True, blank=True)
    last_login = models.DateTimeField('Последний вход', null=True, blank=True)
    
    # Модератор
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_public_accesses',
        verbose_name='Одобрил'
    )
    
    # Причина отклонения
    rejection_reason = models.TextField('Причина отклонения', blank=True)
    
    # Флаг активности
    is_active = models.BooleanField('Активен', default=True)

    class Meta:
        verbose_name = 'Доступ к публичным тендерам'
        verbose_name_plural = 'Доступы к публичным тендерам'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.company_name} ({self.contact_person}) - {self.get_status_display()}'
