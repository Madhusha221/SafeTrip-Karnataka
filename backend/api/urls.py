
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterAPIView,
    LoginAPIView,
    CurrentUserAPIView,
    DistrictViewSet,
    PlaceViewSet,
    IncidentReportViewSet,
    IncidentCommentViewSet,
    ReviewViewSet,
    PlacePhotoViewSet,
    RouteSafetyAPIView,
    WomenSafeHavenAPIView,
    GenerateTripBriefAPIView,
)

from .chatbot_views import SafeTripChatbotAPIView


# ============================================================
# ROUTER
# ============================================================

router = DefaultRouter()

router.register(
    r"districts",
    DistrictViewSet,
    basename="district"
)

router.register(
    r"places",
    PlaceViewSet,
    basename="place"
)

router.register(
    r"incidents",
    IncidentReportViewSet,
    basename="incident"
)

router.register(
    r"incident-comments",
    IncidentCommentViewSet,
    basename="incident-comment"
)

router.register(
    r"reviews",
    ReviewViewSet,
    basename="review"
)

router.register(
    r"place-photos",
    PlacePhotoViewSet,
    basename="place-photo"
)


# ============================================================
# URLS
# ============================================================

urlpatterns = [

    # --------------------------------------------------------
    # Authentication
    # --------------------------------------------------------

    path(
        "auth/register/",
        RegisterAPIView.as_view(),
        name="auth-register"
    ),

    path(
        "auth/login/",
        LoginAPIView.as_view(),
        name="auth-login"
    ),

    path(
        "auth/token/refresh/",
        TokenRefreshView.as_view(),
        name="auth-token-refresh"
    ),

    path(
        "auth/me/",
        CurrentUserAPIView.as_view(),
        name="auth-me"
    ),

    # --------------------------------------------------------
    # Router APIs
    # --------------------------------------------------------

    path(
        "",
        include(router.urls)
    ),

    # --------------------------------------------------------
    # Route safety
    # --------------------------------------------------------

    path(
        "routes/safety-eval/",
        RouteSafetyAPIView.as_view(),
        name="route-safety-eval"
    ),

    # --------------------------------------------------------
    # Women safety
    # --------------------------------------------------------

    path(
        "women-safety/safe-havens/",
        WomenSafeHavenAPIView.as_view(),
        name="safe-havens"
    ),

    # --------------------------------------------------------
    # Trip safety brief
    # --------------------------------------------------------

    path(
        "trip-brief/generate/",
        GenerateTripBriefAPIView.as_view(),
        name="generate-trip-brief"
    ),

    # --------------------------------------------------------
    # SafeTrip AI Chatbot
    # --------------------------------------------------------

    path(
        "chatbot/",
        SafeTripChatbotAPIView.as_view(),
        name="safetrip-chatbot"
    ),
]
