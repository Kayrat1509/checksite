from rest_framework import serializers
from .models import WarehouseReceipt
from apps.users.models import User
from apps.projects.models import Project
from apps.material_requests.serializers import MaterialRequestItemSerializer


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


class WarehouseReceiptListSerializer(serializers.ModelSerializer):
    """!5@80;870B>@ 4;O A?8A:0 ?>ABC?;5=89 =0 A:;04."""

    # 0==K5 > ?@>5:B5
    project_data = ProjectBasicSerializer(source='project', read_only=True)

    # 0==K5 > ?@8=O2H5<
    received_by_data = UserBasicSerializer(source='received_by', read_only=True)

    # 0==K5 > <0B5@80;5 87 70O2:8
    material_name = serializers.CharField(source='material_item.material_name', read_only=True)
    request_number = serializers.CharField(source='material_request.request_number', read_only=True)

    # B>1@0605<K5 AB0BCAK
    quality_status_display = serializers.CharField(source='get_quality_status_display', read_only=True)

    class Meta:
        model = WarehouseReceipt
        fields = [
            'id',
            'material_request',
            'request_number',
            'material_item',
            'material_name',
            'project',
            'project_data',
            'receipt_date',
            'received_quantity',
            'unit',
            'waybill_number',
            'supplier',
            'received_by',
            'received_by_data',
            'quality_status',
            'quality_status_display',
            'notes',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class WarehouseReceiptDetailSerializer(serializers.ModelSerializer):
    """5B0;L=K9 A5@80;870B>@ 4;O ?>ABC?;5=8O =0 A:;04."""

    # 0==K5 > ?@>5:B5
    project_data = ProjectBasicSerializer(source='project', read_only=True)

    # 0==K5 > ?@8=O2H5<
    received_by_data = UserBasicSerializer(source='received_by', read_only=True)

    # >;=0O 8=D>@<0F8O > ?>78F88 <0B5@80;0
    material_item_data = MaterialRequestItemSerializer(source='material_item', read_only=True)

    # ><5@ 70O2:8
    request_number = serializers.CharField(source='material_request.request_number', read_only=True)

    # B>1@0605<K5 AB0BCAK
    quality_status_display = serializers.CharField(source='get_quality_status_display', read_only=True)

    class Meta:
        model = WarehouseReceipt
        fields = [
            'id',
            'material_request',
            'request_number',
            'material_item',
            'material_item_data',
            'project',
            'project_data',
            'receipt_date',
            'received_quantity',
            'unit',
            'waybill_number',
            'supplier',
            'received_by',
            'received_by_data',
            'quality_status',
            'quality_status_display',
            'notes',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class WarehouseReceiptCreateSerializer(serializers.ModelSerializer):
    """!5@80;870B>@ 4;O A>740=8O ?>ABC?;5=8O =0 A:;04."""

    class Meta:
        model = WarehouseReceipt
        fields = [
            'material_request',
            'material_item',
            'project',
            'receipt_date',
            'received_quantity',
            'unit',
            'waybill_number',
            'supplier',
            'notes',
            'quality_status'
        ]

    def create(self, validated_data):
        """!>740=85 70?8A8 > ?>ABC?;5=88 A 02B><0B8G5A:8< 70?>;=5=85< ?>;L7>20B5;O."""
        request = self.context.get('request')
        if request and request.user:
            validated_data['received_by'] = request.user

        return super().create(validated_data)


class WarehouseReceiptUpdateSerializer(serializers.ModelSerializer):
    """!5@80;870B>@ 4;O >1=>2;5=8O ?>ABC?;5=8O =0 A:;04."""

    class Meta:
        model = WarehouseReceipt
        fields = [
            'receipt_date',
            'received_quantity',
            'unit',
            'waybill_number',
            'supplier',
            'notes',
            'quality_status'
        ]
