from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.accounts.models import CustomUser, Role
from apps.businesses.models import Business, ShopSettings
from apps.customers.models import Customer, DeviceCategory, Device
from apps.repairs.models import RepairTicket, RepairStatusHistory

class RepairTicketWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Business & Roles
        self.role_owner = Role.objects.create(name=Role.SHOP_OWNER)
        self.role_tech = Role.objects.create(name=Role.TECHNICIAN)

        self.biz = Business.objects.create(name='Precision Repair Labs', slug='precision-labs')
        ShopSettings.objects.create(business=self.biz, currency_symbol='$')

        self.staff_user = CustomUser.objects.create_user(
            email='intake@precision.com',
            password='Password123!',
            business=self.biz,
            role=self.role_owner,
            is_staff=True,
        )

        self.tech_user = CustomUser.objects.create_user(
            email='tech1@precision.com',
            password='Password123!',
            first_name='Leo',
            last_name='Fender',
            business=self.biz,
            role=self.role_tech,
            is_staff=True,
        )

        self.client.force_authenticate(user=self.staff_user)

        self.cat = DeviceCategory.objects.create(business=self.biz, name='Smartphones')
        self.customer = Customer.objects.create(business=self.biz, name='Diana Prince', phone='777888999')
        self.device = Device.objects.create(
            business=self.biz,
            customer=self.customer,
            category=self.cat,
            brand='Apple',
            model_name='iPhone 15'
        )

    def test_repair_ticket_creation_and_status_history(self):
        url = reverse('repairs:repair-ticket-list')
        payload = {
            'customer': str(self.customer.id),
            'device': str(self.device.id),
            'reported_problem': 'Cracked front glass and unresponsive volume button',
            'accessories_received': 'Silicone case',
            'estimated_cost': 180.00,
            'priority': 'HIGH'
        }
        res = self.client.post(url, payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data['ticket_number'].startswith('FIX-'))
        self.assertEqual(res.data['status'], RepairTicket.Status.RECEIVED)

        # Verify initial status history was recorded in PostgreSQL
        ticket = RepairTicket.objects.get(id=res.data['id'])
        self.assertTrue(ticket.tracking_token.startswith('ff-'))
        history = ticket.status_history.first()
        self.assertIsNotNone(history)
        self.assertEqual(history.new_status, RepairTicket.Status.RECEIVED)

    def test_status_transition_endpoint(self):
        ticket = RepairTicket.objects.create(
            business=self.biz,
            customer=self.customer,
            device=self.device,
            reported_problem='Battery drains in 2 hours',
            status=RepairTicket.Status.RECEIVED
        )

        url = reverse('repairs:repair-ticket-status', kwargs={'pk': ticket.id})
        res = self.client.patch(url, {
            'status': RepairTicket.Status.IN_PROGRESS,
            'notes': 'New genuine battery installed and cycling tests begun.'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        ticket.refresh_from_db()
        self.assertEqual(ticket.status, RepairTicket.Status.IN_PROGRESS)
        self.assertEqual(ticket.status_history.count(), 1)
        self.assertEqual(ticket.status_history.first().new_status, RepairTicket.Status.IN_PROGRESS)

    def test_technician_assignment(self):
        ticket = RepairTicket.objects.create(
            business=self.biz,
            customer=self.customer,
            device=self.device,
            reported_problem='No sound from earpiece',
            status=RepairTicket.Status.RECEIVED
        )

        url = reverse('repairs:repair-ticket-assign', kwargs={'pk': ticket.id})
        res = self.client.post(url, {'technician_id': str(self.tech_user.id)})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        ticket.refresh_from_db()
        self.assertEqual(ticket.assigned_technician, self.tech_user)

    def test_public_qr_tracking_privacy(self):
        ticket = RepairTicket.objects.create(
            business=self.biz,
            customer=self.customer,
            device=self.device,
            reported_problem='Water ingress on charging port',
            status=RepairTicket.Status.IN_PROGRESS,
            estimated_cost=120.00
        )
        RepairStatusHistory.objects.create(
            ticket=ticket,
            old_status=RepairTicket.Status.RECEIVED,
            new_status=RepairTicket.Status.IN_PROGRESS,
            notes='Drying in ultrasonic bath'
        )

        # Unauthenticated customer request
        unauth_client = APIClient()
        url = reverse('public_tracking', kwargs={'token': ticket.tracking_token})
        res = unauth_client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['ticket_number'], ticket.ticket_number)
        self.assertEqual(res.data['device']['model_name'], 'iPhone 15')
        self.assertEqual(len(res.data['timeline']), 1)
        # Ensure private internal notes or other customer passwords are NOT exposed
        self.assertNotIn('internal_notes', res.data)
