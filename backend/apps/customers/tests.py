from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.accounts.models import CustomUser, Role
from apps.businesses.models import Business, ShopSettings
from apps.customers.models import Customer, DeviceCategory, Device

class CustomerAndDeviceTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Role & Business
        self.role_owner = Role.objects.create(name=Role.SHOP_OWNER)
        self.biz = Business.objects.create(name='Mobile Tech Shop', slug='mobile-tech')
        ShopSettings.objects.create(business=self.biz)

        # Staff user
        self.user = CustomUser.objects.create_user(
            email='owner@mobiletech.com',
            password='Password123!',
            business=self.biz,
            role=self.role_owner,
            is_staff=True,
        )
        self.client.force_authenticate(user=self.user)

        # Device Category
        self.cat = DeviceCategory.objects.create(business=self.biz, name='Smartphones', icon='Smartphone')

    def test_customer_create_and_duplicate_phone_prevention(self):
        # 1. Create first customer
        url = reverse('customers:customer-list')
        payload = {
            'name': 'Marcus Vance',
            'phone': '+1 (555) 333-4444',
            'email': 'marcus@example.com',
            'address': '500 Oak St'
        }
        res1 = self.client.post(url, payload)
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res1.data['name'], 'Marcus Vance')

        # 2. Duplicate phone in same business should be rejected
        res2 = self.client.post(url, payload)
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('phone', res2.data)

    def test_device_registration(self):
        customer = Customer.objects.create(business=self.biz, name='Sarah Connor', phone='999888777')
        url = reverse('devices-list-list')
        payload = {
            'customer': str(customer.id),
            'category': str(self.cat.id),
            'brand': 'Google',
            'model_name': 'Pixel 8 Pro',
            'serial_number': 'P8P-00129',
            'imei': '351234567890123',
            'physical_condition': 'Clean condition'
        }
        res = self.client.post(url, payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['brand'], 'Google')
        self.assertEqual(res.data['customer_name'], 'Sarah Connor')

    def test_customer_full_history(self):
        customer = Customer.objects.create(business=self.biz, name='Bruce Wayne', phone='555123456')
        dev = Device.objects.create(
            business=self.biz,
            customer=customer,
            category=self.cat,
            brand='Samsung',
            model_name='Galaxy S24'
        )

        url = reverse('customers:customer-full-history', kwargs={'pk': customer.id})
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['devices']), 1)
        self.assertEqual(res.data['customer']['name'], 'Bruce Wayne')
