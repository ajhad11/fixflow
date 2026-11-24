from decimal import Decimal
from django.db import models
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.businesses.models import Business, Branch, ShopSettings
from apps.businesses.serializers import BusinessSerializer, BranchSerializer, ShopSettingsSerializer
from apps.accounts.models import CustomUser, Role
from apps.accounts.permissions import IsStaffUser, IsSuperAdmin, IsShopOwner
from apps.repairs.models import RepairTicket
from apps.customers.models import Customer
from apps.inventory.models import InventoryItem
from apps.billing.models import Invoice, Payment

class BusinessViewSet(viewsets.ModelViewSet):
    serializer_class = BusinessSerializer

    def get_permissions(self):
        if self.action in ['list', 'create', 'destroy']:
            return [IsSuperAdmin()]
        return [IsShopOwner()]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or (user.role and user.role.name == Role.SUPER_ADMIN):
            return Business.objects.all().prefetch_related('branches').select_related('settings', 'subscription')
        if user.business:
            return Business.objects.filter(id=user.business_id).prefetch_related('branches').select_related('settings', 'subscription')
        return Business.objects.none()

class DashboardMetricsView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        user = request.user
        business_id = user.business_id

        # Filters scoped to business
        ticket_qs = RepairTicket.objects.filter(is_deleted=False)
        cust_qs = Customer.objects.filter(is_deleted=False)
        inv_qs = InventoryItem.objects.filter(is_deleted=False)
        invc_qs = Invoice.objects.filter(is_deleted=False)
        pay_qs = Payment.objects.all()

        if not (user.is_superuser or (user.role and user.role.name == Role.SUPER_ADMIN)):
            ticket_qs = ticket_qs.filter(business_id=business_id)
            cust_qs = cust_qs.filter(business_id=business_id)
            inv_qs = inv_qs.filter(business_id=business_id)
            invc_qs = invc_qs.filter(business_id=business_id)
            pay_qs = pay_qs.filter(business_id=business_id)

        # Basic KPI Counts
        total_repairs = ticket_qs.count()
        pending_statuses = [
            RepairTicket.Status.RECEIVED,
            RepairTicket.Status.UNDER_DIAGNOSIS,
            RepairTicket.Status.WAITING_FOR_APPROVAL,
            RepairTicket.Status.WAITING_FOR_PARTS,
            RepairTicket.Status.IN_PROGRESS,
            RepairTicket.Status.QUALITY_CHECK,
        ]
        pending_repairs = ticket_qs.filter(status__in=pending_statuses).count()
        completed_repairs = ticket_qs.filter(
            status__in=[RepairTicket.Status.READY_FOR_DELIVERY, RepairTicket.Status.DELIVERED]
        ).count()
        total_customers = cust_qs.count()

        # Monthly Revenue (Current Month payments)
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_revenue = pay_qs.filter(payment_date__gte=month_start).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')

        # Low stock items count
        inventory_alerts = inv_qs.filter(quantity_in_stock__lte=models.F('low_stock_threshold') if hasattr(models, 'F') else 5).count()

        # Repair status distribution
        status_counts = ticket_qs.values('status').annotate(count=Count('id')).order_by('-count')
        status_map = dict(RepairTicket.Status.choices)
        status_distribution = [
            {
                'status': sc['status'],
                'label': status_map.get(sc['status'], sc['status']),
                'count': sc['count']
            }
            for sc in status_counts
        ]

        # Monthly Revenue Trend (Last 6 Months)
        monthly_revenue_trend = []
        for i in range(5, -1, -1):
            target_date = now - timezone.timedelta(days=i * 30)
            m_start = target_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if target_date.month == 12:
                m_end = target_date.replace(year=target_date.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            else:
                m_end = target_date.replace(month=target_date.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
            
            m_sum = pay_qs.filter(payment_date__gte=m_start, payment_date__lt=m_end).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            monthly_revenue_trend.append({
                'month': target_date.strftime('%b %Y'),
                'revenue': float(m_sum)
            })

        # Technician Performance
        tech_qs = CustomUser.objects.filter(role__name=Role.TECHNICIAN, is_active=True)
        if business_id and not user.is_superuser:
            tech_qs = tech_qs.filter(business_id=business_id)

        technician_performance = []
        for tech in tech_qs[:10]:
            active_t = RepairTicket.objects.filter(
                assigned_technician=tech,
                status__in=pending_statuses,
                is_deleted=False
            ).count()
            completed_t = RepairTicket.objects.filter(
                assigned_technician=tech,
                status__in=[RepairTicket.Status.READY_FOR_DELIVERY, RepairTicket.Status.DELIVERED],
                is_deleted=False
            ).count()
            technician_performance.append({
                'id': str(tech.id),
                'name': tech.full_name,
                'email': tech.email,
                'active_tickets': active_t,
                'completed_tickets': completed_t,
            })

        # Recent 5 Repairs
        recent_repairs_qs = ticket_qs.select_related('customer', 'device', 'assigned_technician')[:5]
        recent_repairs = [
            {
                'id': str(t.id),
                'ticket_number': t.ticket_number,
                'tracking_token': t.tracking_token,
                'customer_name': t.customer.name,
                'device_info': f"{t.device.brand} {t.device.model_name}",
                'status': t.status,
                'priority': t.priority,
                'technician_name': t.assigned_technician.full_name if t.assigned_technician else 'Unassigned',
                'created_at': t.created_at.isoformat(),
            }
            for t in recent_repairs_qs
        ]

        return Response({
            'kpis': {
                'total_repairs': total_repairs,
                'pending_repairs': pending_repairs,
                'completed_repairs': completed_repairs,
                'total_customers': total_customers,
                'monthly_revenue': float(monthly_revenue),
                'inventory_alerts': inventory_alerts,
            },
            'status_distribution': status_distribution,
            'monthly_revenue_trend': monthly_revenue_trend,
            'technician_performance': technician_performance,
            'recent_repairs': recent_repairs,
            'shop_info': {
                'business_name': user.business.name if user.business else 'Platform SuperAdmin',
                'currency_symbol': user.business.settings.currency_symbol if user.business and hasattr(user.business, 'settings') else '$',
            }
        })
