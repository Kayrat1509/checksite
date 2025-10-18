from rest_framework import serializers
from .models import (
    MaterialRequest,
    MaterialRequestItem,
    MaterialRequestDocument,
    MaterialRequestHistory,
    MaterialRequestComment
)
from apps.projects.models import Project
from apps.users.models import User


class UserBasicSerializer(serializers.ModelSerializer):
    """!5@80;870B>@ 4;O 107>2>9 8=D>@<0F88 > ?>;L7>20B5;5."""
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'role']


class ProjectBasicSerializer(serializers.ModelSerializer):
    """!5@80;870B>@ 4;O 107>2>9 8=D>@<0F88 > ?@>5:B5."""

    class Meta:
        model = Project
        fields = ['id', 'name', 'address']


class MaterialRequestItemSerializer(serializers.ModelSerializer):
    """Сериализатор для позиций материалов в заявке."""
    cancelled_by_data = UserBasicSerializer(source='cancelled_by', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    approval_status_display = serializers.CharField(source='get_approval_status_display', read_only=True)
    availability_status_display = serializers.CharField(source='get_availability_status_display', read_only=True)

    class Meta:
        model = MaterialRequestItem
        fields = [
            'id',
            'material_name',
            'quantity',
            'unit',
            'specifications',
            'order',
            'status',
            'status_display',
            'approval_status',
            'approval_status_display',
            'availability_status',
            'availability_status_display',
            'available_quantity',
            'cancellation_reason',
            'cancelled_by',
            'cancelled_by_data',
            'cancelled_at',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'status', 'cancelled_by', 'cancelled_at', 'approval_status', 'availability_status']


class MaterialRequestDocumentSerializer(serializers.ModelSerializer):
    """!5@80;870B>@ 4;O 4>:C<5=B>2 70O2:8."""
    uploaded_by_data = UserBasicSerializer(source='uploaded_by', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = MaterialRequestDocument
        fields = [
            'id',
            'document_type',
            'file',
            'file_url',
            'file_name',
            'description',
            'uploaded_by',
            'uploaded_by_data',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'uploaded_by']

    def get_file_url(self, obj):
        """>;CG5=85 ?>;=>3> URL D09;0."""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class MaterialRequestHistorySerializer(serializers.ModelSerializer):
    """!5@80;870B>@ 4;O 8AB>@88 87<5=5=89 70O2:8."""
    user_data = UserBasicSerializer(source='user', read_only=True)
    old_status_display = serializers.CharField(source='get_old_status_display', read_only=True)
    new_status_display = serializers.CharField(source='get_new_status_display', read_only=True)

    class Meta:
        model = MaterialRequestHistory
        fields = [
            'id',
            'user',
            'user_data',
            'old_status',
            'old_status_display',
            'new_status',
            'new_status_display',
            'comment',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class MaterialRequestCommentSerializer(serializers.ModelSerializer):
    """!5@80;870B>@ 4;O :><<5=B0@852 : 70O2:5."""
    author_data = UserBasicSerializer(source='author', read_only=True)

    class Meta:
        model = MaterialRequestComment
        fields = [
            'id',
            'author',
            'author_data',
            'text',
            'read_by',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']


class MaterialRequestListSerializer(serializers.ModelSerializer):
    """!5@80;870B>@ 4;O A?8A:0 70O2>: (B01;8F0)."""
    project_data = ProjectBasicSerializer(source='project', read_only=True)
    author_data = UserBasicSerializer(source='author', read_only=True)
    responsible_data = UserBasicSerializer(source='responsible', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    # >;CG05< ?5@2K9 <0B5@80; 4;O >B>1@065=8O 2 B01;8F5
    first_material = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()
    # >102;O5< 2A5 <0B5@80;K 4;O >B>1@065=8O 2 @0A:@K20NI59AO AB@>:5
    items = MaterialRequestItemSerializer(many=True, read_only=True)

    class Meta:
        model = MaterialRequest
        fields = [
            'id',
            'request_number',
            'project',
            'project_data',
            'author',
            'author_data',
            'responsible',
            'responsible_data',
            'status',
            'status_display',
            'first_material',
            'items_count',
            'items',  # >102;O5< ?>;5 A 2A5<8 <0B5@80;0<8
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'request_number', 'created_at', 'updated_at']

    def get_first_material(self, obj):
        """>;CG05< ?5@2K9 <0B5@80; 4;O >B>1@065=8O 2 B01;8F5."""
        first_item = obj.items.first()
        if first_item:
            return {
                'material_name': first_item.material_name,
                'quantity': str(first_item.quantity),
                'unit': first_item.unit
            }
        return None

    def get_items_count(self, obj):
        """>;8G5AB2> ?>78F89 <0B5@80;>2."""
        return obj.items.count()


class MaterialRequestDetailSerializer(serializers.ModelSerializer):
    """5B0;L=K9 A5@80;870B>@ 4;O :0@B>G:8 70O2:8."""
    project_data = ProjectBasicSerializer(source='project', read_only=True)
    author_data = UserBasicSerializer(source='author', read_only=True)
    responsible_data = UserBasicSerializer(source='responsible', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    # ;>65==K5 40==K5
    items = MaterialRequestItemSerializer(many=True, read_only=True)
    documents = MaterialRequestDocumentSerializer(many=True, read_only=True)
    history = MaterialRequestHistorySerializer(many=True, read_only=True)
    comments = MaterialRequestCommentSerializer(many=True, read_only=True)

    class Meta:
        model = MaterialRequest
        fields = [
            'id',
            'request_number',
            'project',
            'project_data',
            'author',
            'author_data',
            'responsible',
            'responsible_data',
            'status',
            'status_display',
            'drawing_reference',
            'work_type',
            'notes',
            'author_signature',
            'items',
            'documents',
            'history',
            'comments',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'request_number', 'created_at', 'updated_at']


class MaterialRequestCreateSerializer(serializers.ModelSerializer):
    """!5@80;870B>@ 4;O A>740=8O =>2>9 70O2:8."""
    items = MaterialRequestItemSerializer(many=True, required=True)

    class Meta:
        model = MaterialRequest
        fields = [
            'project',
            'drawing_reference',
            'work_type',
            'notes',
            'author_signature',
            'items'
        ]

    def validate_items(self, value):
        """@>25@:0 =0;8G8O E>BO 1K >4=>3> <0B5@80;0."""
        if not value:
            raise serializers.ValidationError("0O2:0 4>;6=0 A>45@60BL E>BO 1K >48= <0B5@80;")
        return value

    def create(self, validated_data):
        """!>740=85 70O2:8 A <0B5@80;0<8."""
        items_data = validated_data.pop('items')
        request_user = self.context['request'].user

        # !>7405< 70O2:C
        material_request = MaterialRequest.objects.create(
            author=request_user,
            **validated_data
        )

        # !>7405< ?>78F88 <0B5@80;>2
        for item_data in items_data:
            MaterialRequestItem.objects.create(
                request=material_request,
                **item_data
            )

        # !>7405< 70?8AL 2 8AB>@88
        MaterialRequestHistory.objects.create(
            request=material_request,
            user=request_user,
            old_status='',
            new_status=material_request.status,
            comment='0O2:0 A>740=0'
        )

        return material_request


class MaterialRequestUpdateSerializer(serializers.ModelSerializer):
    """!5@80;870B>@ 4;O >1=>2;5=8O 70O2:8."""

    class Meta:
        model = MaterialRequest
        fields = [
            'drawing_reference',
            'work_type',
            'notes',
            'author_signature'
        ]


class MaterialRequestStatusChangeSerializer(serializers.Serializer):
    """!5@80;870B>@ 4;O 87<5=5=8O AB0BCA0 70O2:8."""
    new_status = serializers.ChoiceField(choices=MaterialRequest.Status.choices)
    comment = serializers.CharField(required=False, allow_blank=True)

    def validate_new_status(self, value):
        """0;840F8O =>2>3> AB0BCA0."""
        material_request = self.context.get('material_request')
        if material_request and value == material_request.status:
            raise serializers.ValidationError(">2K9 AB0BCA A>2?0405B A B5:CI8<")
        return value

    def save(self):
        """7<5=5=85 AB0BCA0 8 A>740=85 70?8A8 2 8AB>@88."""
        material_request = self.context['material_request']
        user = self.context['request'].user
        old_status = material_request.status
        new_status = self.validated_data['new_status']
        comment = self.validated_data.get('comment', '')

        # 1=>2;O5< AB0BCA
        material_request.status = new_status
        material_request.save()

        # !>7405< 70?8AL 2 8AB>@88
        MaterialRequestHistory.objects.create(
            request=material_request,
            user=user,
            old_status=old_status,
            new_status=new_status,
            comment=comment
        )

        return material_request
