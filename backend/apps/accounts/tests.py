from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.accounts.models import CustomUser, Role
from apps.businesses.models import Business, Branch, ShopSettings
from apps.customers.models import Customer, Device, DeviceCategory
from apps.repairs.models import RepairTicket

class AuthenticationAndTenantTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Roles
        self.role_owner = Role.objects.create(name=Role.SHOP_OWNER, description='Owner')
        self.role_tech = Role.objects.create(name=Role.TECHNICIAN, description='Tech')
        self.role_super = Role.objects.create(name=Role.SUPER_ADMIN, description='Super')

        # Business 1
        self.biz1 = Business.objects.create(name='Shop One', slug='shop-one')
        ShopSettings.objects.create(business=self.biz1)

        # Business 2
        self.biz2 = Business.objects.create(name='Shop Two', slug='shop-two')
        ShopSettings.objects.create(business=self.biz2)

        # Users
        self.user1 = CustomUser.objects.create_user(
            email='owner1@shopone.com',
            password='Password123!',
            business=self.biz1,
            role=self.role_owner,
            is_staff=True,
        )

        self.user2 = CustomUser.objects.create_user(
            email='owner2@shoptwo.com',
            password='Password123!',
            business=self.biz2,
            role=self.role_owner,
            is_staff=True,
        )

        # Demo ticket in biz1
        cust1 = Customer.objects.create(business=self.biz1, name='Alice', phone='111222')
        dev1 = Device.objects.create(business=self.biz1, customer=cust1, brand='Apple', model_name='iPhone 13')
        self.ticket1 = RepairTicket.objects.create(
            business=self.biz1,
            customer=cust1,
            device=dev1,
            reported_problem='Screen cracked',
            status=RepairTicket.Status.RECEIVED
        )

    def test_login_success(self):
        url = reverse('accounts:login')
        response = self.client.post(url, {
            'email': 'owner1@shopone.com',
            'password': 'Password123!'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['email'], 'owner1@shopone.com')
        self.assertEqual(response.data['user']['role'], Role.SHOP_OWNER)
        self.assertEqual(response.data['user']['business']['slug'], 'shop-one')

    def test_login_invalid_password(self):
        url = reverse('accounts:login')
        response = self.client.post(url, {
            'email': 'owner1@shopone.com',
            'password': 'WrongPassword!'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_me_endpoint(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('accounts:current_user')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'owner1@shopone.com')
        self.assertEqual(response.data['role_name'], Role.SHOP_OWNER)

    def test_dashboard_metrics_tenant_scoped(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('dashboard_metrics_root')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('kpis', response.data)
        self.assertEqual(response.data['kpis']['total_repairs'], 1)
        self.assertEqual(response.data['kpis']['pending_repairs'], 1)

        # Shop Two has 0 repairs
        self.client.force_authenticate(user=self.user2)
        response2 = self.client.get(url)
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(response2.data['kpis']['total_repairs'], 0)
