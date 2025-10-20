from django.contrib import admin
from .models import Tender, TenderDocument, TenderBid, PublicTenderAccess


@admin.register(Tender)
class TenderAdmin(admin.ModelAdmin):
    """Админка для тендеров"""
    list_display = [
        'title',
        'tender_type',
        'project',
        'status',
        'budget',
        'start_date',
        'end_date',
        'created_by',
        'created_at'
    ]
    list_filter = ['status', 'tender_type', 'created_at', 'start_date']
    search_fields = ['title', 'description', 'project__name']
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['project', 'created_by', 'responsible', 'winner']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('title', 'description', 'tender_type', 'project')
        }),
        ('Статус и даты', {
            'fields': ('status', 'start_date', 'end_date')
        }),
        ('Бюджет и сроки', {
            'fields': ('budget', 'execution_period', 'winning_amount')
        }),
        ('Ответственные', {
            'fields': ('created_by', 'responsible', 'winner')
        }),
        ('Техническая информация', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TenderDocument)
class TenderDocumentAdmin(admin.ModelAdmin):
    """Админка для документов тендера"""
    list_display = ['tender', 'file_name', 'uploaded_by', 'uploaded_at']
    list_filter = ['uploaded_at']
    search_fields = ['tender__title', 'file_name', 'description']
    readonly_fields = ['uploaded_at']
    autocomplete_fields = ['tender', 'uploaded_by']


@admin.register(TenderBid)
class TenderBidAdmin(admin.ModelAdmin):
    """Админка для заявок на тендер"""
    list_display = [
        'tender',
        'participant',
        'company_name',
        'amount',
        'is_winner',
        'submitted_at'
    ]
    list_filter = ['is_winner', 'submitted_at']
    search_fields = ['tender__title', 'participant__full_name', 'company_name', 'comment']
    readonly_fields = ['submitted_at']
    autocomplete_fields = ['tender', 'participant']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('tender', 'participant', 'company_name')
        }),
        ('Коммерческие условия', {
            'fields': ('amount', 'comment')
        }),
        ('Статус', {
            'fields': ('is_winner', 'submitted_at')
        }),
    )


@admin.register(PublicTenderAccess)
class PublicTenderAccessAdmin(admin.ModelAdmin):
    """Админка для управления доступом к публичным тендерам"""
    list_display = [
        'company_name',
        'contact_person',
        'email',
        'phone',
        'city',
        'status',
        'created_at',
        'last_login'
    ]
    list_filter = ['status', 'city', 'created_at']
    search_fields = ['company_name', 'contact_person', 'email', 'phone']
    readonly_fields = ['created_at', 'last_login', 'password']
    autocomplete_fields = ['approved_by']
    
    fieldsets = (
        ('Информация о компании', {
            'fields': ('company_name', 'contact_person', 'email', 'phone', 'city')
        }),
        ('Статус и модерация', {
            'fields': ('status', 'approved_by', 'approved_at', 'rejection_reason')
        }),
        ('Безопасность', {
            'fields': ('password', 'is_active')
        }),
        ('Активность', {
            'fields': ('created_at', 'last_login')
        }),
    )
    
    actions = ['approve_access', 'reject_access']
    
    def approve_access(self, request, queryset):
        """Одобрить доступ"""
        from django.utils import timezone
        updated = queryset.update(
            status='APPROVED',
            approved_by=request.user,
            approved_at=timezone.now()
        )
        self.message_user(request, f'Одобрено заявок: {updated}')
    approve_access.short_description = 'Одобрить выбранные заявки'
    
    def reject_access(self, request, queryset):
        """Отклонить доступ"""
        updated = queryset.update(status='REJECTED')
        self.message_user(request, f'Отклонено заявок: {updated}')
    reject_access.short_description = 'Отклонить выбранные заявки'
