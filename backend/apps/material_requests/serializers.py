"""
Сериализаторы для API заявок на материалы
"""
from rest_framework import serializers
from .models import MaterialRequest, MaterialRequestItem
from apps.users.serializers import UserSerializer
from apps.projects.serializers import ProjectSerializer


class MaterialRequestItemSerializer(serializers.ModelSerializer):
    """Сериализатор для позиции материала"""

    class Meta:
        model = MaterialRequestItem
        fields = [
            'id',
            'material_name',
            'unit',
            'quantity_requested',
            'quantity_actual',
            'notes',
            'order',
        ]

    def validate_quantity_requested(self, value):
        """Проверка количества"""
        if value <= 0:
            raise serializers.ValidationError('Количество должно быть больше 0')
        return value


class MaterialRequestSerializer(serializers.ModelSerializer):
    """
    Сериализатор для заявки на материалы
    """
    # Вложенные объекты (read-only)
    items = MaterialRequestItemSerializer(many=True, read_only=True)
    created_by = UserSerializer(read_only=True)
    project = ProjectSerializer(read_only=True)
    current_approver = UserSerializer(read_only=True)

    # Для создания/обновления (write-only)
    project_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    items_data = MaterialRequestItemSerializer(many=True, write_only=True)

    # Дополнительные поля
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = MaterialRequest
        fields = [
            'id',
            'number',
            'company',
            'project',
            'project_id',
            'created_by',
            'status',
            'status_display',
            'current_approver_role',
            'current_approver',
            'approval_chain',
            'approval_chain_index',
            'approval_history',
            'rejection_reason',
            'rejected_at',
            'rejected_by',
            'created_at',
            'updated_at',
            'submitted_at',
            'approved_at',
            'completed_at',
            'items',
            'items_data',
        ]
        read_only_fields = [
            'id',
            'number',
            'company',
            'created_by',
            'status',
            'current_approver_role',
            'current_approver',
            'approval_chain',
            'approval_chain_index',
            'approval_history',
            'rejection_reason',
            'rejected_at',
            'rejected_by',
            'created_at',
            'updated_at',
            'submitted_at',
            'approved_at',
            'completed_at',
        ]

    def validate(self, data):
        """Валидация заявки"""
        # Проверяем наличие позиций
        if 'items_data' not in data or not data['items_data']:
            raise serializers.ValidationError('Укажите хотя бы одну позицию материала')

        return data

    def create(self, validated_data):
        """Создание заявки с позициями"""
        items_data = validated_data.pop('items_data')
        project_id = validated_data.pop('project_id', None)

        # Получаем пользователя из контекста
        user = self.context['request'].user

        # Создаём заявку
        request = MaterialRequest.objects.create(
            company=user.company,
            project_id=project_id,
            created_by=user,
            **validated_data
        )

        # Создаём позиции
        for i, item_data in enumerate(items_data):
            MaterialRequestItem.objects.create(
                request=request,
                order=i,
                **item_data
            )

        return request

    def update(self, instance, validated_data):
        """
        Обновление заявки.
        ВАЖНО: Редактировать можно только черновики!
        """
        if instance.status != MaterialRequest.Status.DRAFT:
            raise serializers.ValidationError(
                'Редактировать можно только черновики. '
                'Для изменения согласованной заявки нужно вернуть её на доработку.'
            )

        items_data = validated_data.pop('items_data', None)
        project_id = validated_data.pop('project_id', None)

        # Обновляем основные поля
        if project_id is not None:
            instance.project_id = project_id

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        # Обновляем позиции (если переданы)
        if items_data is not None:
            # Удаляем старые позиции
            instance.items.all().delete()

            # Создаём новые
            for i, item_data in enumerate(items_data):
                MaterialRequestItem.objects.create(
                    request=instance,
                    order=i,
                    **item_data
                )

        return instance


class MaterialRequestListSerializer(serializers.ModelSerializer):
    """
    Упрощённый сериализатор для списка заявок (без полной истории)
    """
    created_by = UserSerializer(read_only=True)
    project = ProjectSerializer(read_only=True)
    items_count = serializers.IntegerField(source='items.count', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = MaterialRequest
        fields = [
            'id',
            'number',
            'project',
            'created_by',
            'status',
            'status_display',
            'current_approver_role',
            'items_count',
            'created_at',
            'submitted_at',
        ]


class ApproveRequestSerializer(serializers.Serializer):
    """Сериализатор для согласования заявки"""
    comment = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class RejectRequestSerializer(serializers.Serializer):
    """Сериализатор для возврата заявки на доработку"""
    reason = serializers.CharField(
        required=True,
        min_length=10,
        max_length=2000,
        error_messages={
            'required': 'Укажите причину возврата на доработку',
            'min_length': 'Причина должна содержать минимум 10 символов'
        }
    )


class MarkPaidSerializer(serializers.Serializer):
    """Сериализатор для отметки оплаты"""
    comment = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class MarkDeliveredSerializer(serializers.Serializer):
    """Сериализатор для приёмки материала"""
    items = serializers.ListField(
        child=serializers.DictField(
            child=serializers.DecimalField(max_digits=10, decimal_places=3)
        ),
        required=True,
        help_text='Список: [{"item_id": 1, "quantity_actual": 5.5}, ...]'
    )
    comment = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate_items(self, value):
        """Проверка позиций"""
        if not value:
            raise serializers.ValidationError('Укажите хотя бы одну позицию')

        for item in value:
            if 'item_id' not in item or 'quantity_actual' not in item:
                raise serializers.ValidationError(
                    'Каждая позиция должна содержать item_id и quantity_actual'
                )

            if item['quantity_actual'] < 0:
                raise serializers.ValidationError('Количество не может быть отрицательным')

        return value
