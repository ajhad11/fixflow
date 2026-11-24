from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from apps.repairs.views import PublicTrackingView

urlpatterns = [
    path('admin/', admin.site.urls),

    # OpenAPI Schema & Interactive Docs
    path('api/v1/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/v1/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/v1/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Direct Dashboard Route
    path('api/v1/dashboard/', include('apps.businesses.dashboard_urls')),

    # Public Customer Tracking
    path('api/v1/public/track/<str:token>/', PublicTrackingView.as_view(), name='public_tracking'),

    # FixFlow Core Domain APIs
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/businesses/', include('apps.businesses.urls')),
    path('api/v1/customers/', include('apps.customers.urls')),
    path('api/v1/devices/', include('apps.customers.device_urls')),
    path('api/v1/repairs/', include('apps.repairs.urls')),
    path('api/v1/inventory/', include('apps.inventory.urls')),
    path('api/v1/billing/', include('apps.billing.urls')),
    path('api/v1/warranties/', include('apps.warranties.urls')),
    path('api/v1/ai/', include('apps.ai_assistant.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
    path('api/v1/reports/', include('apps.reports.urls')),
    path('api/v1/audit/', include('apps.audit.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
