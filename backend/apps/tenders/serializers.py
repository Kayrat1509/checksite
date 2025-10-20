from rest_framework import serializers
from .models import Tender, TenderDocument, TenderBid
from apps.users.serializers import UserSerializer
from apps.projects.serializers import ProjectListSerializer


class TenderDocumentSerializer(serializers.ModelSerializer):
    """Сериализатор для документов тендера"""
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    
    class Meta:
        model = TenderDocument
        fields = ['id', 'tender', 'file', 'file_name', 'description', 'uploaded_by', 'uploaded_by_name', 'uploaded_at']
        read_only_fields = ['uploaded_by', 'uploaded_at']


class TenderBidSerializer(serializers.ModelSerializer):
    """Сериализатор для заявок на тендер"""
    participant_name = serializers.CharField(source='participant.get_full_name', read_only=True)
    
    class Meta:
        model = TenderBid
        fields = ['id', 'tender', 'participant', 'participant_name', 'company_name', 'amount', 'comment', 'submitted_at', 'is_winner']
        read_only_fields = ['participant', 'submitted_at', 'is_winner']


class TenderListSerializer(serializers.ModelSerializer):
    """Сериализатор для списка тендеров"""
    project_name = serializers.CharField(source='project.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    responsible_name = serializers.CharField(source='responsible.get_full_name', read_only=True)
    bids_count = serializers.IntegerField(source='bids.count', read_only=True)
    
    class Meta:
        model = Tender
        fields = [
            'id', 'title', 'description', 'tender_type', 'company_name', 'city',
            'project', 'project_name', 'status', 'start_date', 'end_date',
            'budget', 'execution_period', 'created_by', 'created_by_name',
            'responsible', 'responsible_name', 'bids_count', 'created_at', 'updated_at'
        ]


class TenderDetailSerializer(serializers.ModelSerializer):
    """Детальный сериализатор тендера"""
    project = ProjectListSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)
    responsible = UserSerializer(read_only=True)
    winner = UserSerializer(read_only=True)
    documents = TenderDocumentSerializer(many=True, read_only=True)
    bids = TenderBidSerializer(many=True, read_only=True)
    
    class Meta:
        model = Tender
        fields = [
            'id', 'title', 'description', 'tender_type', 'company_name', 'city', 'project',
            'status', 'start_date', 'end_date', 'budget', 'execution_period',
            'created_by', 'responsible', 'winner', 'winning_amount',
            'documents', 'bids', 'created_at', 'updated_at'
        ]


class TenderCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания тендера"""
    
    class Meta:
        model = Tender
        fields = [
            'title', 'description', 'tender_type', 'company_name', 'city', 'project',
            'status', 'start_date', 'end_date', 'budget', 'execution_period', 'responsible'
        ]

    def create(self, validated_data):
        # Устанавливаем создателя из request.user
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class TenderUpdateSerializer(serializers.ModelSerializer):
    """Сериализатор для обновления тендера"""
    
    class Meta:
        model = Tender
        fields = [
            'title', 'description', 'tender_type', 'company_name', 'city', 'project',
            'status', 'start_date', 'end_date', 'budget', 'execution_period', 'responsible',
            'winner', 'winning_amount'
        ]
