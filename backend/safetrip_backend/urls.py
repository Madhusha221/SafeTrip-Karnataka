from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include


# ============================================================
# URL CONFIGURATION
# ============================================================

urlpatterns = [

    # Django Admin
    path(
        'admin/',
        admin.site.urls
    ),

    # SafeTrip Karnataka REST API
    path(
        'api/',
        include('api.urls')
    ),

]


# ============================================================
# USER-UPLOADED MEDIA FILES
# ============================================================
#
# During development, Django will serve uploaded files from:
#
# backend/media/
#
# Incident photos will be available through:
#
# /media/incident_reports/filename.jpg
#
# This is suitable for local development only.
# Production will use proper media/static serving.
#

if settings.DEBUG:

    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )