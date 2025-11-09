from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from apps.projects.models import Project
from apps.core.mixins import SoftDeleteMixin, SoftDeleteManager


class MaterialRequest(SoftDeleteMixin, models.Model):
    """
    Модель заявки на строительные материалы.
    Основная таблица для учета и контроля движения строительных материалов.

    Использует мягкое удаление (soft delete):
    - При удалении заявка перемещается в корзину на 31 день
    - Можно восстановить в течение 31 дней
    - После 31 дня удаляется автоматически навсегда

    НОВАЯ СИСТЕМА: Упрощенные статусы + настраиваемая цепочка согласования
    """

    class Status(models.TextChoices):
        """Упрощенные статусы заявки (вместо hardcoded цепочки)"""
        DRAFT = 'DRAFT', _('Черновик')
        IN_PROGRESS = 'IN_PROGRESS', _('На согласовании')
        APPROVED = 'APPROVED', _('Согласовано')
        REJECTED = 'REJECTED', _('Отклонено')
        COMPLETED = 'COMPLETED', _('Выполнено')

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

    # НОВАЯ СИСТЕМА: Текущий этап согласования
    current_step = models.ForeignKey(
        'material_requests.ApprovalStep',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='current_material_requests',
        verbose_name=_('Текущий этап согласования'),
        help_text=_('На каком этапе цепочки согласования находится заявка')
    )

    # Ответственный за текущий этап (автоматически устанавливается из current_step)
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

    # Managers для soft delete
    objects = SoftDeleteManager()  # По умолчанию: только активные (не удаленные)
    all_objects = models.Manager()  # Для доступа ко всем записям (включая удаленные)

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

    def initialize_approval_flow(self):
        """
        Инициализация процесса согласования при создании заявки.
        Создает записи MaterialRequestApproval для каждого этапа активной цепочки компании.
        """
        from .approval_models import ApprovalFlowTemplate, MaterialRequestApproval

        # Получаем активную цепочку согласования компании
        try:
            flow = ApprovalFlowTemplate.objects.get(
                company=self.project.company,
                is_active=True
            )
        except ApprovalFlowTemplate.DoesNotExist:
            # Если нет активной цепочки - создаем default
            flow = self._create_default_approval_flow()

        # Создаем записи согласования для каждого этапа
        for step in flow.steps.all():
            MaterialRequestApproval.objects.create(
                material_request=self,
                step=step,
                status='PENDING'
            )

        # Переходим на первый этап
        self.move_to_next_step()

        # Отправляем email уведомление первому согласующему
        from .tasks import send_material_request_notification
        try:
            send_material_request_notification.delay(
                request_id=self.id,
                notification_type='created'
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f'Ошибка при отправке email о создании заявки {self.request_number}: {str(e)}')

    def _create_default_approval_flow(self):
        """Создает default цепочку согласования если её нет"""
        from .approval_models import ApprovalFlowTemplate, ApprovalStep

        flow = ApprovalFlowTemplate.objects.create(
            company=self.project.company,
            name="Default схема согласования",
            is_active=True,
            created_by=self.author
        )

        # Default цепочка: Снабженец → Завсклад → Руководитель проекта → Директор
        default_steps = [
            {'role': 'SUPPLY_MANAGER', 'order': 1},
            {'role': 'WAREHOUSE_HEAD', 'order': 2},
            {'role': 'PROJECT_MANAGER', 'order': 3},
            {'role': 'DIRECTOR', 'order': 4},
        ]

        for step_data in default_steps:
            ApprovalStep.objects.create(
                flow_template=flow,
                **step_data,
                skip_if_empty=True
            )

        return flow

    def move_to_next_step(self):
        """
        Переход к следующему этапу согласования.
        Автоматически пропускает этапы, если нет пользователя с нужной ролью.
        """
        from .approval_models import MaterialRequestApproval

        # Получаем следующий этап с статусом PENDING
        next_approval = self.approvals.filter(
            status='PENDING'
        ).order_by('step__order').first()

        if not next_approval:
            # Все этапы пройдены - заявка согласована
            self.status = self.Status.APPROVED
            self.current_step = None
            self.responsible = None
            self.save(update_fields=['status', 'current_step', 'responsible'])

            # Отправляем email автору о полном согласовании
            from .tasks import send_material_request_notification
            try:
                send_material_request_notification.delay(
                    request_id=self.id,
                    notification_type='fully_approved'
                )
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f'Ошибка при отправке email о полном согласовании заявки {self.request_number}: {str(e)}')

            return

        step = next_approval.step

        # Ищем пользователя с нужной ролью в проекте/компании
        approver = self._find_approver_for_step(step)

        if not approver and step.skip_if_empty:
            # Пропускаем этап автоматически
            next_approval.status = 'SKIPPED'
            next_approval.save(update_fields=['status'])

            # Логируем пропуск
            self._log_history(
                user=None,
                old_status=f"Этап {step.order}",
                new_status="Пропущено (нет согласующего)",
                comment=f"Автоматически пропущен этап: {step.get_role_display()}"
            )

            # Переходим к следующему этапу рекурсивно
            return self.move_to_next_step()

        # Устанавливаем текущий этап и ответственного
        next_approval.approver = approver
        next_approval.save(update_fields=['approver'])

        self.current_step = step
        self.responsible = approver
        self.status = self.Status.IN_PROGRESS
        self.save(update_fields=['current_step', 'responsible', 'status'])

        # Отправляем email новому согласующему (если это не первый этап - для первого уже отправили в initialize_approval_flow)
        # Проверяем, есть ли уже согласованные этапы
        has_approved_steps = self.approvals.filter(status='APPROVED').exists()
        if has_approved_steps and approver:
            from .tasks import send_material_request_notification
            try:
                send_material_request_notification.delay(
                    request_id=self.id,
                    notification_type='step_approved'
                )
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f'Ошибка при отправке email о новом этапе согласования заявки {self.request_number}: {str(e)}')

    def _find_approver_for_step(self, step):
        """
        Поиск пользователя с нужной ролью для этапа согласования.
        Ищет среди участников проекта и сотрудников компании.
        """
        from apps.users.models import User

        # Сначала ищем среди участников проекта
        approver = self.project.team_members.filter(role=step.role).first()

        if not approver:
            # Если не найден в проекте - ищем среди всех сотрудников компании
            approver = User.objects.filter(
                company=self.project.company,
                role=step.role,
                is_active=True
            ).first()

        return approver

    def approve_current_step(self, user, comment=''):
        """
        Утверждение текущего этапа согласования.

        Args:
            user: Пользователь, который утверждает
            comment: Комментарий при утверждении
        """
        from .approval_models import MaterialRequestApproval

        if not self.current_step:
            raise ValueError("Заявка не находится на этапе согласования")

        # Получаем текущее согласование
        approval = self.approvals.get(
            step=self.current_step,
            status='PENDING'
        )

        # Проверка прав
        if approval.approver and approval.approver != user:
            raise PermissionError(
                f"Вы не являетесь утверждающим на этом этапе. "
                f"Ожидается: {approval.approver.get_full_name()}"
            )

        # Утверждаем
        approval.status = 'APPROVED'
        approval.comment = comment
        approval.approved_at = timezone.now()
        approval.save(update_fields=['status', 'comment', 'approved_at'])

        # Логируем
        self._log_history(
            user=user,
            old_status=f"Этап {self.current_step.order}",
            new_status="Утверждено",
            comment=comment
        )

        # Переходим к следующему этапу (внутри этого метода отправятся email уведомления)
        self.move_to_next_step()

    def reject_request(self, user, comment):
        """
        Отклонение заявки на текущем этапе.

        Args:
            user: Пользователь, который отклоняет
            comment: Причина отклонения (обязательно)
        """
        from .approval_models import MaterialRequestApproval

        if not comment:
            raise ValueError("Необходимо указать причину отклонения")

        if not self.current_step:
            raise ValueError("Заявка не находится на этапе согласования")

        # Получаем текущее согласование
        approval = self.approvals.get(
            step=self.current_step,
            status='PENDING'
        )

        # Проверка прав
        if approval.approver and approval.approver != user:
            raise PermissionError(
                f"Вы не можете отклонить эту заявку. "
                f"Ожидается: {approval.approver.get_full_name()}"
            )

        # Отклоняем
        approval.status = 'REJECTED'
        approval.comment = comment
        approval.approved_at = timezone.now()
        approval.save(update_fields=['status', 'comment', 'approved_at'])

        # Меняем статус заявки
        self.status = self.Status.REJECTED
        self.current_step = None
        self.responsible = None
        self.save(update_fields=['status', 'current_step', 'responsible'])

        # Логируем
        self._log_history(
            user=user,
            old_status=f"Этап {approval.step.order}",
            new_status="Отклонено",
            comment=comment
        )

        # Отправляем email автору об отклонении
        from .tasks import send_material_request_notification
        try:
            send_material_request_notification.delay(
                request_id=self.id,
                notification_type='rejected',
                rejection_reason=comment,
                rejected_by_name=user.get_full_name()
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f'Ошибка при отправке email об отклонении заявки {self.request_number}: {str(e)}')

    def reconfigure_pending_approvals(self, new_flow_template):
        """
        Перенастраивает заявку на новую цепочку согласования.
        Используется при изменении активной цепочки согласования.

        Логика:
        1. Находит последний APPROVED этап в старой цепочке
        2. Определяет роль последнего согласующего
        3. Удаляет все PENDING этапы из старой цепочки
        4. Создает новые PENDING этапы из новой цепочки, начиная после роли последнего согласующего
        5. Переходит на следующий этап (или завершает, если этапов больше нет)

        Args:
            new_flow_template: Новый шаблон цепочки согласования (ApprovalFlowTemplate)
        """
        from .approval_models import MaterialRequestApproval
        import logging

        logger = logging.getLogger(__name__)

        # Проверяем, что заявка находится в процессе согласования
        if self.status not in [self.Status.IN_PROGRESS, self.Status.DRAFT]:
            logger.info(
                f'Заявка {self.request_number} имеет статус {self.status}, '
                f'перенастройка не требуется'
            )
            return

        # Находим последний согласованный этап (если есть)
        last_approved = self.approvals.filter(
            status='APPROVED'
        ).order_by('-step__order').first()

        # Определяем, с какой роли начинать новую цепочку
        if last_approved:
            # Есть уже согласованные этапы - продолжаем после последней согласованной роли
            last_approved_role = last_approved.step.role
            last_approved_order = last_approved.step.order

            logger.info(
                f'Заявка {self.request_number}: последний согласовавший - '
                f'{last_approved_role} (этап {last_approved_order})'
            )

            # Находим порядковый номер этой роли в новой цепочке
            new_steps = list(new_flow_template.steps.order_by('order'))
            start_from_order = 0

            for idx, step in enumerate(new_steps):
                if step.role == last_approved_role:
                    # Начинаем со следующего этапа после этой роли
                    start_from_order = idx + 1
                    break

            # Если роль не найдена в новой цепочке, начинаем с первого этапа
            if start_from_order == 0:
                logger.warning(
                    f'Роль {last_approved_role} не найдена в новой цепочке согласования. '
                    f'Начинаем с первого этапа новой цепочки.'
                )
        else:
            # Нет согласованных этапов - начинаем с первого этапа новой цепочки
            start_from_order = 0
            logger.info(
                f'Заявка {self.request_number}: нет согласованных этапов, '
                f'начинаем с первого этапа новой цепочки'
            )

        # Удаляем все PENDING этапы из старой цепочки
        deleted_count = self.approvals.filter(status='PENDING').delete()[0]
        logger.info(
            f'Заявка {self.request_number}: удалено {deleted_count} ожидающих этапов '
            f'из старой цепочки'
        )

        # Создаем новые PENDING этапы из новой цепочки
        new_steps = new_flow_template.steps.order_by('order')
        created_count = 0

        for step in new_steps[start_from_order:]:
            MaterialRequestApproval.objects.create(
                material_request=self,
                step=step,
                status='PENDING'
            )
            created_count += 1

        logger.info(
            f'Заявка {self.request_number}: создано {created_count} новых этапов '
            f'из новой цепочки (начиная с позиции {start_from_order})'
        )

        # Логируем изменение цепочки согласования
        self._log_history(
            user=None,
            old_status='Цепочка согласования',
            new_status='Обновлена',
            comment=f'Цепочка согласования обновлена на "{new_flow_template.name}". '
                    f'Удалено {deleted_count} ожидающих этапов, '
                    f'создано {created_count} новых этапов.'
        )

        # Переходим на следующий этап (или завершаем, если этапов больше нет)
        self.move_to_next_step()

        logger.info(
            f'Заявка {self.request_number}: перенастройка завершена. '
            f'Текущий этап: {self.current_step.get_role_display() if self.current_step else "завершено"}'
        )

    def _log_history(self, user, old_status, new_status, comment=''):
        """Добавление записи в историю заявки"""
        MaterialRequestHistory.objects.create(
            request=self,
            user=user,
            old_status=old_status,
            new_status=new_status,
            comment=comment
        )


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

    # Количество по заявке
    quantity = models.DecimalField(
        _('Количество по заявке'),
        max_digits=10,
        decimal_places=2
    )

    # Количество по факту (фактически получено/поставлено)
    actual_quantity = models.DecimalField(
        _('Количество по факту'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Фактическое количество, полученное на объекте (заполняется автором после доставки)')
    )

    # Количество выданное со склада
    issued_quantity = models.DecimalField(
        _('Выдано'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        default=0,
        help_text=_('Количество материала, выданное со склада (заполняется завскладом)')
    )

    # Кто последний изменил issued_quantity
    issued_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='issued_materials',
        verbose_name=_('Изменил'),
        help_text=_('Пользователь, который последний изменил количество выдано')
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

    # Статус позиции до отмены (для восстановления)
    previous_item_status = models.CharField(
        _('Предыдущий статус позиции'),
        max_length=30,
        choices=ProcessStatus.choices,
        null=True,
        blank=True,
        help_text=_('Сохраняется при отмене для возможности восстановления позиции на том же этапе согласования')
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
