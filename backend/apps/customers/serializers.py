from rest_framework import serializers
from apps.customers.models import Customer, DeviceCategory, Device, DeviceImage

class DeviceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceCategory
        fields = ['id', 'name', 'icon', 'created_at']

class DeviceImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceImage
        fields = ['id', 'device', 'image', 'caption', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']

class DeviceSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    images = DeviceImageSerializer(many=True, read_only=True)
    active_repairs_count = serializers.SerializerMethodField()

    class Meta:
        model = Device
        fields = [
            'id', 'customer', 'customer_name', 'customer_phone', 'category', 'category_name',
            'brand', 'model_name', 'serial_number', 'imei', 'passcode_pattern',
            'physical_condition', 'images', 'active_repairs_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_active_repairs_count(self, obj):
        return obj.repairs.filter(
            is_deleted=False,
            status__in=[
                'RECEIVED', 'UNDER_DIAGNOSIS', 'WAITING_FOR_APPROVAL',
                'WAITING_FOR_PARTS', 'IN_PROGRESS', 'QUALITY_CHECK'
            ]
        ).count()

class CustomerSerializer(serializers.ModelSerializer):
    device_count = serializers.SerializerMethodField()
    repair_count = serializers.SerializerMethodField()
    devices = DeviceSerializer(many=True, read_only=True)

    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'phone', 'email', 'address', 'notes',
            'device_count', 'repair_count', 'devices', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_device_count(self, obj):
        return obj.devices.filter(is_deleted=False).count()

    def get_repair_count(self, obj):
        return obj.repairs.filter(is_deleted=False).count()

    def validate_phone(self, value):
        business = self.context.get('request').user.business if self.context.get('request') else None
        if not business:
            return value

        qs = Customer.objects.filter(business=business, phone=value, is_deleted=False)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)

        if qs.exists():
            raise serializers.ValidationError(f"A customer with phone number '{value}' already exists in your repair shop.")
        return value
