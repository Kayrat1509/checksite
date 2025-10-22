from django.contrib import admin
from django.utils.html import format_html
from .models import WarehouseReceipt


@admin.register(WarehouseReceipt)
class WarehouseReceiptAdmin(admin.ModelAdmin):
    """Админ-панель для складских поступлений."""

    list_display = [
        'id',
        'get_material_name',
        'get_request_number',
        'project',
        'receipt_date',
        'received_quantity',
        'unit',
        'get_quality_badge',
        'received_by',
    ]

    list_filter = [
        'quality_status',
        'project',
        'receipt_date',
        'received_by',
    ]

    search_fields = [
        'material_item__material_name',
        'material_request__request_number',
        'waybill_number',
        'supplier',
        'notes',
    ]

    readonly_fields = ['created_at', 'updated_at']

    date_hierarchy = 'receipt_date'

    autocomplete_fields = ['material_request', 'material_item', 'project', 'received_by']

    fieldsets = (
        ('Основная информация', {
            'fields': ('material_request', 'material_item', 'project')
        }),
        ('Детали поступления', {
            'fields': (
                'receipt_date',
                'received_quantity',
                'unit',
                'waybill_number',
                'supplier',
            )
        }),
        ('Качество и примечания', {
            'fields': ('quality_status', 'notes')
        }),
        ('Ответственные', {
            'fields': ('received_by',)
        }),
        ('Служебная информация', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_material_name(self, obj):
        """Отображает название материала из позиции."""
        return obj.material_item.material_name if obj.material_item else '-'
    get_material_name.short_description = 'Материал'
    get_material_name.admin_order_field = 'material_item__material_name'

    def get_request_number(self, obj):
        """Отображает номер заявки."""
        return obj.material_request.request_number if obj.material_request else '-'
    get_request_number.short_description = 'Номер заявки'
    get_request_number.admin_order_field = 'material_request__request_number'

    def get_quality_badge(self, obj):
        """Отображает статус качества с цветовым индикатором."""
        colors = {
            'GOOD': '#52c41a',        # Зеленый
            'DAMAGED': '#faad14',     # Оранжевый
            'DEFECTIVE': '#f5222d',   # Красный
            'PARTIAL': '#1890ff',     # Синий
        }
        color = colors.get(obj.quality_status, '#d9d9d9')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_quality_status_display()
        )
    get_quality_badge.short_description = 'Качество'
    get_quality_badge.admin_order_field = 'quality_status'
