from rest_framework import serializers
from apps.repairs.models import (
    RepairTicket,
    RepairStatusHistory,
    RepairDiagnosis,
    RepairNote,
    RepairAttachment,
    RepairPart,
)
from apps.customers.serializers import CustomerSerializer, DeviceSerializer
from apps.accounts.serializers import CustomUserSerializer

class RepairStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.full_name', read_only=True)

    class Meta:
        model = RepairStatusHistory
        fields = ['id', 'old_status', 'new_status', 'changed_by', 'changed_by_name', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']

class RepairDiagnosisSerializer(serializers.ModelSerializer):
    technician_name = serializers.CharField(source='technician.full_name', read_only=True)

    class Meta:
        model = RepairDiagnosis
        fields = [
            'id', 'ticket', 'technician', 'technician_name',
            'technical_findings', 'recommended_action', 'estimated_labor_hours',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class RepairNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.full_name', read_only=True)

    class Meta:
        model = RepairNote
        fields = ['id', 'ticket', 'author', 'author_name', 'note', 'is_internal', 'created_at']
        read_only_fields = ['id', 'author', 'created_at']

class RepairPartSerializer(serializers.ModelSerializer):
    total_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    added_by_name = serializers.CharField(source='added_by.full_name', read_only=True)

    class Meta:
        model = RepairPart
        fields = [
            'id', 'ticket', 'inventory_item', 'part_name', 'quantity',
            'unit_cost', 'unit_price', 'total_price', 'added_by', 'added_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'total_price', 'added_by', 'created_at']

class RepairTicketListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    device_name = serializers.SerializerMethodField()
    technician_name = serializers.CharField(source='assigned_technician.full_name', read_only=True)

    class Meta:
        model = RepairTicket
        fields = [
            'id', 'ticket_number', 'tracking_token',
            'customer', 'customer_name', 'customer_phone',
            'device', 'device_name',
            'assigned_technician', 'technician_name',
            'reported_problem', 'priority', 'status',
            'estimated_cost', 'final_cost', 'expected_delivery_date',
            'is_approved_by_customer', 'created_at'
        ]

    def get_device_name(self, obj):
        return f"{obj.device.brand} {obj.device.model_name}"

class RepairTicketDetailSerializer(serializers.ModelSerializer):
    customer = CustomerSerializer(read_only=True)
    device = DeviceSerializer(read_only=True)
    assigned_technician = CustomUserSerializer(read_only=True)
    status_history = RepairStatusHistorySerializer(many=True, read_only=True)
    diagnosis = RepairDiagnosisSerializer(read_only=True)
    notes = RepairNoteSerializer(many=True, read_only=True)
    parts_used = RepairPartSerializer(many=True, read_only=True)
    qr_url = serializers.SerializerMethodField()

    class Meta:
        model = RepairTicket
        fields = [
            'id', 'ticket_number', 'tracking_token', 'qr_url',
            'business', 'branch', 'customer', 'device',
            'assigned_technician', 'reported_problem',
            'accessories_received', 'physical_condition',
            'estimated_cost', 'final_cost', 'expected_delivery_date',
            'priority', 'status', 'is_approved_by_customer', 'delivered_at',
            'status_history', 'diagnosis', 'notes', 'parts_used',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'ticket_number', 'tracking_token', 'created_at', 'updated_at']

    def get_qr_url(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(f"/api/v1/repairs/{obj.id}/qr/")
        return f"/api/v1/repairs/{obj.id}/qr/"

class RepairTicketCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RepairTicket
        fields = [
            'id', 'ticket_number', 'customer', 'device', 'branch',
            'assigned_technician', 'reported_problem', 'accessories_received',
            'physical_condition', 'estimated_cost', 'expected_delivery_date',
            'priority', 'status'
        ]
        read_only_fields = ['id', 'ticket_number', 'status']

class UpdateStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=RepairTicket.Status.choices)
    notes = serializers.CharField(required=False, allow_blank=True, default='')

class AssignTechnicianSerializer(serializers.Serializer):
    technician_id = serializers.UUIDField(required=True)
