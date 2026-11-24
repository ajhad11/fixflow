from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import Role, CustomUser, UserProfile
from apps.businesses.models import Business, Branch, ShopSettings, Subscription
from apps.customers.models import DeviceCategory, Customer, Device
from apps.inventory.models import InventoryCategory, Supplier, InventoryItem
from apps.repairs.models import RepairTicket, RepairStatusHistory
from apps.billing.models import Invoice, InvoiceItem, Payment

class Command(BaseCommand):
    help = 'Seeds initial FixFlow roles, demo business, staff accounts, device categories, and demo tickets'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding FixFlow Initial Data in PostgreSQL..."))

        # 1. Create Roles
        roles_data = [
            (Role.SUPER_ADMIN, 'Super Administrator with global platform authority'),
            (Role.SHOP_OWNER, 'Shop Owner with full authority over own business'),
            (Role.RECEPTIONIST, 'Front-desk receptionist managing customers, intake, and invoices'),
            (Role.TECHNICIAN, 'Technician diagnosing and performing device repairs'),
            (Role.CUSTOMER, 'Customer tracking repairs and reviewing quotations'),
        ]
        roles = {}
        for code, desc in roles_data:
            role, _ = Role.objects.get_or_create(name=code, defaults={'description': desc})
            roles[code] = role
        self.stdout.write(self.style.SUCCESS(f"Initialized {len(roles)} RBAC roles."))

        # 2. Create Platform Super Admin
        super_admin, created = CustomUser.objects.get_or_create(
            email='admin@fixflow.com',
            defaults={
                'first_name': 'FixFlow',
                'last_name': 'SuperAdmin',
                'role': roles[Role.SUPER_ADMIN],
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            super_admin.set_password('Admin@12345')
            super_admin.save()
            UserProfile.objects.get_or_create(user=super_admin, defaults={'bio': 'Global Administrator'})
            self.stdout.write(self.style.SUCCESS("Created Super Admin: admin@fixflow.com / Admin@12345"))

        # 3. Create Demo Business
        business, b_created = Business.objects.get_or_create(
            slug='apex-tech-repairs',
            defaults={
                'name': 'Apex Tech Repairs',
                'email': 'contact@apextech.com',
                'phone': '+1 (555) 234-5678',
                'address': '450 Silicon Avenue, Tech Hub, Suite 101',
                'is_active': True,
            }
        )

        Branch.objects.get_or_create(
            business=business,
            code='MAIN',
            defaults={
                'name': 'Downtown Flagship Branch',
                'phone': '+1 (555) 234-5678',
                'address': '450 Silicon Avenue, Tech Hub',
                'is_main': True,
            }
        )

        ShopSettings.objects.get_or_create(
            business=business,
            defaults={
                'currency_symbol': '$',
                'tax_rate': 8.50,
                'invoice_footer_notes': 'Thank you for choosing Apex Tech Repairs. All repairs include a standard 30-day warranty.',
                'warranty_terms': 'Warranty covers parts installed and technical workmanship. Physical or liquid damage voids warranty.',
            }
        )

        Subscription.objects.get_or_create(
            business=business,
            defaults={
                'plan_name': 'ENTERPRISE',
                'status': 'ACTIVE',
                'max_technicians': 25,
                'max_branches': 5,
            }
        )
        self.stdout.write(self.style.SUCCESS(f"Configured Business: {business.name}"))

        # 4. Create Staff Accounts
        staff_data = [
            ('owner@apextech.com', 'Sarah', 'Jenkins', Role.SHOP_OWNER, 'Owner@12345', 'Master Technician & Shop Owner'),
            ('reception@apextech.com', 'David', 'Miller', Role.RECEPTIONIST, 'Recept@12345', 'Front-desk Intake Manager'),
            ('tech@apextech.com', 'Alex', 'Chen', Role.TECHNICIAN, 'Tech@12345', 'Senior Micro-soldering & Screen Specialist'),
            ('tech2@apextech.com', 'Maria', 'Garcia', Role.TECHNICIAN, 'Tech@12345', 'Laptop & Motherboard Specialist'),
        ]

        for email, fn, ln, role_code, pwd, spec in staff_data:
            user, u_created = CustomUser.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': fn,
                    'last_name': ln,
                    'business': business,
                    'role': roles[role_code],
                    'is_staff': True,
                }
            )
            if u_created:
                user.set_password(pwd)
                user.save()
                UserProfile.objects.get_or_create(user=user, defaults={'specialization': spec})
                self.stdout.write(self.style.SUCCESS(f"Created Staff: {email} ({role_code})"))

        # 5. Create Device Categories
        categories = [
            ('Smartphones', 'Smartphone'),
            ('Laptops', 'Laptop'),
            ('Tablets', 'Tablet'),
            ('Desktop PCs', 'Monitor'),
            ('Gaming Consoles', 'Gamepad2'),
            ('Audio & Wearables', 'Headphones'),
        ]
        cat_objs = {}
        for name, icon in categories:
            cat, _ = DeviceCategory.objects.get_or_create(
                business=business,
                name=name,
                defaults={'icon': icon}
            )
            cat_objs[name] = cat
        self.stdout.write(self.style.SUCCESS("Created Device Categories."))

        # 6. Create Seed Customers & Devices
        customer_1, _ = Customer.objects.get_or_create(
            business=business,
            phone='+1 (555) 777-1001',
            defaults={
                'name': 'Johnathan Davis',
                'email': 'jdavis@example.com',
                'address': '12 Elm Street, Springfield',
                'notes': 'Preferred contact via WhatsApp or SMS',
            }
        )

        device_1, _ = Device.objects.get_or_create(
            business=business,
            customer=customer_1,
            brand='Apple',
            model_name='iPhone 14 Pro',
            defaults={
                'category': cat_objs['Smartphones'],
                'serial_number': 'F2LLM0987N1',
                'imei': '354892019283741',
                'physical_condition': 'Front OLED glass shattered; light bezel scuffing.',
            }
        )

        customer_2, _ = Customer.objects.get_or_create(
            business=business,
            phone='+1 (555) 777-2002',
            defaults={
                'name': 'Elena Rostova',
                'email': 'elena.rostova@example.com',
                'address': '88 Highland Park, Bay Area',
            }
        )

        device_2, _ = Device.objects.get_or_create(
            business=business,
            customer=customer_2,
            brand='Dell',
            model_name='XPS 15 9520',
            defaults={
                'category': cat_objs['Laptops'],
                'serial_number': 'DLXPS9520-449',
                'physical_condition': 'Good cosmetic condition; powers on but fan spins at max speed with black screen.',
            }
        )

        # 7. Create Demo Inventory Items
        inv_cat, _ = InventoryCategory.objects.get_or_create(business=business, name='Screens & Displays')
        supplier, _ = Supplier.objects.get_or_create(
            business=business,
            name='Global Mobile Parts Direct',
            defaults={'phone': '+1 (800) 555-0199', 'contact_person': 'Robert Vance'}
        )

        item_screen, _ = InventoryItem.objects.get_or_create(
            business=business,
            sku='OLED-IP14P-OEM',
            defaults={
                'category': inv_cat,
                'supplier': supplier,
                'name': 'iPhone 14 Pro OEM OLED Display Assembly',
                'cost_price': 110.00,
                'selling_price': 199.00,
                'quantity_in_stock': 8,
                'low_stock_threshold': 3,
                'compatible_devices': 'iPhone 14 Pro (A2890, A2650)',
            }
        )

        item_battery, _ = InventoryItem.objects.get_or_create(
            business=business,
            sku='BAT-IP14P-GEN',
            defaults={
                'category': inv_cat,
                'supplier': supplier,
                'name': 'iPhone 14 Pro Replacement Battery 3200mAh',
                'cost_price': 22.00,
                'selling_price': 65.00,
                'quantity_in_stock': 2, # Low stock alert!
                'low_stock_threshold': 4,
                'compatible_devices': 'iPhone 14 Pro',
            }
        )

        # 8. Create Demo Repair Ticket
        tech_user = CustomUser.objects.filter(email='tech@apextech.com').first()
        ticket, t_created = RepairTicket.objects.get_or_create(
            business=business,
            ticket_number='FIX-202611-0001-A1',
            defaults={
                'customer': customer_1,
                'device': device_1,
                'assigned_technician': tech_user,
                'reported_problem': 'Dropped phone on pavement. Screen is cracked and touchscreen does not respond on top third.',
                'accessories_received': 'Leather Protective Case',
                'physical_condition': 'Display shattered; chassis intact.',
                'priority': RepairTicket.Priority.HIGH,
                'status': RepairTicket.Status.IN_PROGRESS,
                'estimated_cost': 249.00,
                'is_approved_by_customer': True,
                'expected_delivery_date': timezone.now().date() + timezone.timedelta(days=1),
            }
        )

        if t_created:
            RepairStatusHistory.objects.create(
                ticket=ticket,
                old_status=RepairTicket.Status.RECEIVED,
                new_status=RepairTicket.Status.IN_PROGRESS,
                changed_by=tech_user,
                notes='Parts inspected and technician begun teardown and display replacement.'
            )

        self.stdout.write(self.style.SUCCESS("Seeding Completed Successfully!"))
