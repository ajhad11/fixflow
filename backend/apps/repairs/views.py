import io
import qrcode
from django.http import HttpResponse
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend

from apps.repairs.models import (
    RepairTicket,
    RepairStatusHistory,
    RepairDiagnosis,
    RepairNote,
    RepairPart,
)
from apps.repairs.serializers import (
    RepairTicketListSerializer,
    RepairTicketDetailSerializer,
    RepairTicketCreateSerializer,
    UpdateStatusSerializer,
    AssignTechnicianSerializer,
    RepairNoteSerializer,
    RepairDiagnosisSerializer,
    RepairPartSerializer,
)
from apps.accounts.models import CustomUser, Role
from apps.accounts.permissions import IsStaffUser
from apps.businesses.mixins import TenantQuerySetMixin

class RepairTicketViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    queryset = RepairTicket.objects.all()
    permission_classes = [IsStaffUser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = [
        'ticket_number',
        'customer__name',
        'customer__phone',
        'device__brand',
        'device__model_name',
        'device__serial_number',
        'device__imei',
        'reported_problem'
    ]
    filterset_fields = ['status', 'priority', 'assigned_technician', 'customer', 'device']
    ordering_fields = ['created_at', 'expected_delivery_date', 'priority', 'estimated_cost']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset().filter(is_deleted=False)
        
        # If user is a technician with no admin/owner role, allow filtering to own assigned repairs easily
        if user.role and user.role.name == Role.TECHNICIAN and self.request.query_params.get('my_repairs') == 'true':
            qs = qs.filter(assigned_technician=user)

        return qs.select_related('customer', 'device', 'assigned_technician', 'business')

    def get_serializer_class(self):
        if self.action == 'list':
            return RepairTicketListSerializer
        elif self.action == 'create':
            return RepairTicketCreateSerializer
        return RepairTicketDetailSerializer

    def perform_create(self, serializer):
        user = self.request.user
        ticket = serializer.save(
            business=user.business,
            created_by=user,
            status=RepairTicket.Status.RECEIVED
        )
        # Create initial status history entry
        RepairStatusHistory.objects.create(
            ticket=ticket,
            old_status='NONE',
            new_status=RepairTicket.Status.RECEIVED,
            changed_by=user,
            notes='Initial device intake and ticket generation.'
        )

    def perform_destroy(self, instance):
        instance.soft_delete()

    @action(detail=True, methods=['patch'])
    def status(self, request, pk=None):
        ticket = self.get_object()
        serializer = UpdateStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']
        notes = serializer.validated_data.get('notes', '')
        old_status = ticket.status

        ticket.status = new_status
        if new_status == RepairTicket.Status.DELIVERED and not ticket.delivered_at:
            ticket.delivered_at = timezone.now()
        ticket.save(update_fields=['status', 'delivered_at', 'updated_at'])

        # Record history
        history = RepairStatusHistory.objects.create(
            ticket=ticket,
            old_status=old_status,
            new_status=new_status,
            changed_by=request.user,
            notes=notes
        )

        return Response({
            'detail': f'Status updated to {new_status}',
            'status': new_status,
            'history_id': str(history.id)
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        ticket = self.get_object()
        serializer = AssignTechnicianSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tech_id = serializer.validated_data['technician_id']
        technician = get_object_or_404(CustomUser, id=tech_id, business=ticket.business)

        ticket.assigned_technician = technician
        ticket.save(update_fields=['assigned_technician', 'updated_at'])

        RepairStatusHistory.objects.create(
            ticket=ticket,
            old_status=ticket.status,
            new_status=ticket.status,
            changed_by=request.user,
            notes=f'Assigned to technician {technician.full_name}'
        )

        return Response({
            'detail': f'Technician {technician.full_name} assigned.',
            'assigned_technician': {
                'id': str(technician.id),
                'name': technician.full_name,
                'email': technician.email,
            }
        })

    @action(detail=True, methods=['post'])
    def notes(self, request, pk=None):
        ticket = self.get_object()
        serializer = RepairNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = serializer.save(ticket=ticket, author=request.user)
        return Response(RepairNoteSerializer(note).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def qr(self, request, pk=None):
        ticket = self.get_object()
        # Build tracking URL
        tracking_url = f"http://localhost:5173/track/{ticket.tracking_token}"

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=4,
        )
        qr.add_data(tracking_url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="#0f172a", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        return HttpResponse(buf.getvalue(), content_type='image/png')

class PublicTrackingView(APIView):
    """
    Public customer tracking API using secure random token.
    Zero authentication required; strict data privacy enforced.
    Internal technician notes are strictly excluded.
    """
    permission_classes = [AllowAny]

    def get(self, request, token):
        ticket = get_object_or_404(
            RepairTicket.objects.select_related('device', 'device__category', 'business', 'business__settings'),
            tracking_token=token,
            is_deleted=False
        )

        # Public timeline (exclude internal notes)
        history_qs = ticket.status_history.order_by('created_at')
        timeline = [
            {
                'status': h.new_status,
                'label': dict(RepairTicket.Status.choices).get(h.new_status, h.new_status),
                'timestamp': h.created_at.isoformat(),
                'notes': h.notes,
            }
            for h in history_qs
        ]

        # Customer facing notes only
        customer_notes = [
            {
                'note': n.note,
                'created_at': n.created_at.isoformat(),
            }
            for n in ticket.notes.filter(is_internal=False).order_by('created_at')
        ]

        # Approved quotation summary if present
        quotation_info = None
        if hasattr(ticket, 'quotation'):
            q = ticket.quotation
            quotation_info = {
                'quotation_number': q.quotation_number,
                'total_amount': float(q.total_amount),
                'status': q.status,
            }

        # Warranty details if active
        warranty_info = None
        if hasattr(ticket, 'warranty'):
            w = ticket.warranty
            warranty_info = {
                'warranty_code': w.warranty_code,
                'duration_days': w.duration_days,
                'end_date': w.end_date.isoformat(),
                'status': w.status,
                'covered_components': w.covered_components,
            }

        settings = getattr(ticket.business, 'settings', None)

        return Response({
            'ticket_number': ticket.ticket_number,
            'status': ticket.status,
            'status_display': ticket.get_status_display(),
            'device': {
                'brand': ticket.device.brand,
                'model_name': ticket.device.model_name,
                'category': ticket.device.category.name if ticket.device.category else 'Electronic Device',
            },
            'reported_problem': ticket.reported_problem,
            'expected_delivery_date': ticket.expected_delivery_date.isoformat() if ticket.expected_delivery_date else None,
            'estimated_cost': float(ticket.estimated_cost),
            'timeline': timeline,
            'notes': customer_notes,
            'quotation': quotation_info,
            'warranty': warranty_info,
            'shop': {
                'name': ticket.business.name,
                'phone': ticket.business.phone,
                'address': ticket.business.address,
                'currency_symbol': settings.currency_symbol if settings else '$',
            }
        })
