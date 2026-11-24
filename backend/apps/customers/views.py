from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend

from apps.customers.models import Customer, DeviceCategory, Device, DeviceImage
from apps.customers.serializers import (
    CustomerSerializer,
    DeviceCategorySerializer,
    DeviceSerializer,
    DeviceImageSerializer,
)
from apps.accounts.permissions import IsStaffUser
from apps.businesses.mixins import TenantQuerySetMixin
from apps.repairs.models import RepairTicket

class DeviceCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = DeviceCategorySerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return DeviceCategory.objects.all()
        return DeviceCategory.objects.filter(business=user.business)

    def perform_create(self, serializer):
        serializer.save(business=self.request.user.business)

class CustomerViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsStaffUser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['name', 'phone', 'email', 'notes']
    ordering_fields = ['name', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False).prefetch_related('devices')

    def perform_destroy(self, instance):
        instance.soft_delete()

    @action(detail=True, methods=['get'])
    def full_history(self, request, pk=None):
        customer = self.get_object()
        devices = customer.devices.filter(is_deleted=False)
        repairs = RepairTicket.objects.filter(customer=customer, is_deleted=False).select_related('device', 'assigned_technician')

        repair_data = [
            {
                'id': str(r.id),
                'ticket_number': r.ticket_number,
                'tracking_token': r.tracking_token,
                'device_info': f"{r.device.brand} {r.device.model_name}",
                'reported_problem': r.reported_problem,
                'status': r.status,
                'priority': r.priority,
                'technician': r.assigned_technician.full_name if r.assigned_technician else 'Unassigned',
                'estimated_cost': float(r.estimated_cost),
                'created_at': r.created_at.isoformat(),
            }
            for r in repairs
        ]

        return Response({
            'customer': CustomerSerializer(customer).data,
            'devices': DeviceSerializer(devices, many=True).data,
            'repairs': repair_data,
        })

class DeviceViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer
    permission_classes = [IsStaffUser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['brand', 'model_name', 'serial_number', 'imei', 'customer__name', 'customer__phone']
    filterset_fields = ['category', 'customer']
    ordering_fields = ['brand', 'model_name', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False).select_related('customer', 'category').prefetch_related('images')

    def perform_destroy(self, instance):
        instance.soft_delete()

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_image(self, request, pk=None):
        device = self.get_object()
        image_file = request.FILES.get('image')
        caption = request.data.get('caption', '')

        if not image_file:
            return Response({'image': 'Image file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        device_image = DeviceImage.objects.create(
            device=device,
            image=image_file,
            caption=caption
        )
        return Response(DeviceImageSerializer(device_image).data, status=status.HTTP_201_CREATED)
