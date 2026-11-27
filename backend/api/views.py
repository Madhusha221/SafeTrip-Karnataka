from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
import logging
from django.contrib.auth import authenticate

from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    District,
    Place,
    IncidentReport,
    IncidentPhoto,  # ADD THIS
    IncidentComment,
    Review,
    PlacePhoto,
    RouteSafety,
    WomenSafeHaven,
)
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    DistrictSerializer,
    PlaceSerializer,
    IncidentReportSerializer,
    IncidentPhotoSerializer,  # ADD THIS
    IncidentCommentSerializer,
    ReviewSerializer,
    PlacePhotoSerializer,
    RouteSafetySerializer,
    WomenSafeHavenSerializer,
)

from services.osm_service import OSMPlaceService
from services.routing_service import RoutingService

from ai_intelligence.safety_scorer import SafetyScorer
from ai_intelligence.trip_brief_generator import TripBriefGenerator


# ============================================================
# AUTHENTICATION
# ============================================================


class RegisterAPIView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        serializer = RegisterSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "message": "Registration successful.",

                "user": UserSerializer(
                    user
                ).data,

                "access": str(
                    refresh.access_token
                ),

                "refresh": str(
                    refresh
                ),
            },
            status=status.HTTP_201_CREATED
        )


class LoginAPIView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        username = request.data.get(
            "username",
            ""
        ).strip()

        password = request.data.get(
            "password",
            ""
        )

        # ----------------------------------------------------
        # Validate input
        # ----------------------------------------------------

        if not username or not password:

            return Response(
                {
                    "error": (
                        "Username and password "
                        "are required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ----------------------------------------------------
        # Authenticate Django user
        # ----------------------------------------------------

        user = authenticate(
            request=request,
            username=username,
            password=password
        )

        if user is None:

            return Response(
                {
                    "error": (
                        "Invalid username or password."
                    )
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        # ----------------------------------------------------
        # Generate JWT tokens
        # ----------------------------------------------------

        refresh = RefreshToken.for_user(user)

        # ----------------------------------------------------
        # Return user + JWT tokens
        # ----------------------------------------------------

        return Response(
            {
                "message": "Login successful.",

                "user": UserSerializer(
                    user
                ).data,

                "access": str(
                    refresh.access_token
                ),

                "refresh": str(
                    refresh
                ),
            },
            status=status.HTTP_200_OK
        )


class CurrentUserAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        return Response(
            UserSerializer(
                request.user
            ).data
        )


# ============================================================
# DISTRICTS
# ============================================================


# ============================================================
# DISTRICTS
# ============================================================

class DistrictViewSet(viewsets.ModelViewSet):

    queryset = District.objects.all().order_by("name")
    serializer_class = DistrictSerializer

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)

        except Exception:
            logging.getLogger(__name__).exception(
                "SAFETRIP DISTRICTS API ERROR"
            )
            raise

# ============================================================
# PLACES
# ============================================================



class PlaceViewSet(viewsets.ModelViewSet):
    serializer_class = PlaceSerializer

    def get_queryset(self):
        queryset = (
            Place.objects
            
            .filter(
                Q(
                    source="OpenStreetMap",
                    external_place_id__startswith="osm:"
                )
                | Q(
                    source="Curated",
                    external_place_id__startswith="curated:"
                )
            )

            .select_related("district")
            .order_by("name")
        )

        district_name = self.request.query_params.get("district")
        category = self.request.query_params.get("category")
        search = self.request.query_params.get("search")

        if district_name:
            queryset = queryset.filter(
                district__name__icontains=district_name
            )

        if category and category.lower() != "all":
            queryset = queryset.filter(
                category__iexact=category
            )

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(description__icontains=search)
                | Q(district__name__icontains=search)
            )

        return queryset

    def list(self, request, *args, **kwargs):
        # Return saved places immediately.
        # Avoid calling OpenStreetMap on every page request.
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def safety_insights(self, request, pk=None):
        place = self.get_object()
        incidents = place.incidents.all()

        verified_count = incidents.filter(
            status="Verified"
        ).count()

        safety = SafetyScorer.calculate_place_safety(
            incident_count=verified_count,
            lighting_score=4,
            crowd_density=4,
            patrol_level=4,
            female_solo_rating=place.rating,
        )

        return Response({
            "place": place.name,
            "district": place.district.name,
            "safety_insights": safety,
            "incidents": IncidentReportSerializer(
                incidents,
                many=True,
                context={"request": request},
            ).data,
        })


# ============================================================
# INCIDENT REPORTS
# ============================================================



class IncidentReportViewSet(
    viewsets.ModelViewSet
):

    queryset = IncidentReport.objects.all().order_by(
        "-created_at"
    )

    serializer_class = IncidentReportSerializer

    # Allow JSON + multipart image uploads
    parser_classes = [
        MultiPartParser,
        FormParser,
        JSONParser,
    ]

   
    def get_permissions(self):

        # Public incident viewing
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]

        # Public evidence photo viewing
        if (
            self.action == "evidence_photos"
            and self.request.method == "GET"
        ):
            return [AllowAny()]

        # Public comment viewing
        if (
            self.action == "comments"
            and self.request.method == "GET"
        ):
            return [AllowAny()]

        # Admin-only incident editing and deletion
        if self.action in [
            "update",
            "partial_update",
            "destroy",
            "admin_overview",
            "update_status",
        ]:
            return [IsAdminUser()]

        # Preserve existing evidence-photo ownership permissions
        if self.action == "delete_evidence_photo":
            return [IsAuthenticated()]

              # Travelers can submit incidents, upload evidence and comment
        return [IsAuthenticated()]

    def get_queryset(self):

        queryset = IncidentReport.objects.all().order_by(
            "-created_at"
        )

        # Optional district filter
        district = self.request.query_params.get(
            "district"
        )

        if district:
            queryset = queryset.filter(
                district__name__icontains=district
            )

        # Optional place filter
        place_id = self.request.query_params.get(
            "place"
        )

        if place_id:
            queryset = queryset.filter(
                place_id=place_id
            )

        # Optional incident type filter
        incident_type = self.request.query_params.get(
            "incident_type"
        )

        if incident_type:
            queryset = queryset.filter(
                incident_type__iexact=incident_type
            )

        # Optional severity filter
        severity = self.request.query_params.get(
            "severity"
        )

        
        if severity:
            queryset = queryset.filter(
                severity__iexact=severity
            )

        # Search incident reports
        search = self.request.query_params.get("search")

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(location_name__icontains=search)
                | Q(incident_type__icontains=search)
                | Q(district__name__icontains=search)
            )

        return queryset


    def create(
        self,
        request,
        *args,
        **kwargs
    ):

        # ----------------------------------------------------
        # User must be logged in
        # ----------------------------------------------------

        if not request.user.is_authenticated:

            return Response(
                {
                    "error": (
                        "You must be logged in "
                        "to submit an incident."
                    )
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        serializer = self.get_serializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        # ----------------------------------------------------
        # Automatically attach logged-in user
        # ----------------------------------------------------

        serializer.save(
            reported_by=request.user
        )

        return Response(
            {
                "message": (
                    "Incident report submitted "
                    "successfully."
                ),

                "report": self.get_serializer(
                    serializer.instance,
                    context={
                        "request": request
                    }
                ).data
            },
            status=status.HTTP_201_CREATED
        )

    def update(
        self,
        request,
        *args,
        **kwargs
    ):

        incident = self.get_object()

        # Only the owner or admin can edit
        if (
            incident.reported_by != request.user
            and not request.user.is_staff
        ):

            return Response(
                {
                    "error": (
                        "You can only edit "
                        "your own incident reports."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        return super().update(
            request,
            *args,
            **kwargs
        )

    def destroy(
        self,
        request,
        *args,
        **kwargs
    ):

        incident = self.get_object()

        # Only the owner or admin can delete
        if (
            incident.reported_by != request.user
            and not request.user.is_staff
        ):

            return Response(
                {
                    "error": (
                        "You can only delete "
                        "your own incident reports."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        return super().destroy(
            request,
            *args,
            **kwargs
        )

    # ========================================================
    # COMMENTS
        # ========================================================
    # INCIDENT EVIDENCE PHOTOS
    # ========================================================

    @action(
        detail=True,
        methods=["get", "post"],
        url_path="evidence-photos"
    )
    def evidence_photos(self, request, pk=None):

        incident = self.get_object()

        # View evidence photos
        if request.method == "GET":
            photos = incident.evidence_photos.all()

            serializer = IncidentPhotoSerializer(
                photos,
                many=True,
                context={"request": request}
            )

            return Response(serializer.data)

        # Upload multiple evidence photos
        images = request.FILES.getlist("images")

        if not images:
            images = request.FILES.getlist("images[]")

        if not images:
            images = request.FILES.getlist("image")

        if not images:
            return Response(
                {"error": "Please select at least one photo."},
                status=status.HTTP_400_BAD_REQUEST
            )

        caption = request.data.get("caption", "")
        uploaded_photos = []

        for image in images:
            photo = IncidentPhoto.objects.create(
                incident=incident,
                image=image,
                caption=caption,
                uploaded_by=request.user
            )

            uploaded_photos.append(photo)

        serializer = IncidentPhotoSerializer(
            uploaded_photos,
            many=True,
            context={"request": request}
        )

        return Response(
            {
                "message": "Evidence photos uploaded successfully.",
                "count": len(uploaded_photos),
                "photos": serializer.data
            },
            status=status.HTTP_201_CREATED
        )
    # ========================================================
    # ========================================================
    # DELETE INCIDENT EVIDENCE PHOTO
    # ========================================================

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"evidence-photos/(?P<photo_id>[^/.]+)"
    )
    def delete_evidence_photo(self, request, pk=None, photo_id=None):

        incident = self.get_object()

        photo = get_object_or_404(
            IncidentPhoto,
            id=photo_id,
            incident=incident
        )

        # Only the uploader or admin can delete the photo
        if (
            photo.uploaded_by != request.user
            and not request.user.is_staff
        ):
            return Response(
                {"error": "You can only delete your own evidence photos."},
                status=status.HTTP_403_FORBIDDEN
            )

        photo.delete()

        return Response(
            {"message": "Evidence photo deleted successfully."},
            status=status.HTTP_200_OK
        )
    @action(
        detail=True,
        methods=["get", "post"],
        url_path="comments"
    )
    def comments(
        self,
        request,
        pk=None
    ):

        incident = self.get_object()

        # ----------------------------------------------------
        # GET COMMENTS
        # ----------------------------------------------------

        if request.method == "GET":

            comments = incident.comments.all().order_by(
                "created_at"
            )

            serializer = IncidentCommentSerializer(
                comments,
                many=True,
                context={
                    "request": request
                }
            )

            return Response(
                serializer.data
            )

        # ----------------------------------------------------
        # POST COMMENT
        # ----------------------------------------------------

        if not request.user.is_authenticated:

            return Response(
                {
                    "error": (
                        "You must be logged in "
                        "to comment on an incident."
                    )
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        serializer = IncidentCommentSerializer(
            data={
                "incident": incident.id,
                "comment": request.data.get(
                    "comment",
                    ""
                ),
            }
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save(
            user=request.user,
            incident=incident
        )

        return Response(
            {
                "message": "Comment added successfully.",

                "comment": IncidentCommentSerializer(
                    serializer.instance,
                    context={
                        "request": request
                    }
                ).data
            },
            status=status.HTTP_201_CREATED
        )


    # ========================================================
    # ADMIN DASHBOARD OVERVIEW
    # ========================================================

    @action(
        detail=False,
        methods=["get"],
        url_path="admin-overview"
    )
    def admin_overview(self, request):

        queryset = IncidentReport.objects.all()

        return Response({
            "total": queryset.count(),
            "pending": queryset.filter(
                status="Pending"
            ).count(),
            "verified": queryset.filter(
                status="Verified"
            ).count(),
            "resolved": queryset.filter(
                status="Resolved"
            ).count(),
        })

    # ========================================================
    # ADMIN UPDATE INCIDENT STATUS
    # ========================================================

    @action(
        detail=True,
        methods=["patch"],
        url_path="status"
    )
    def update_status(self, request, pk=None):

        incident = self.get_object()

        new_status = request.data.get("status")

        allowed_statuses = dict(
            IncidentReport.STATUS_CHOICES
        )

        if new_status not in allowed_statuses:
            return Response(
                {
                    "error": "Invalid incident status.",
                    "allowed_statuses": list(
                        allowed_statuses.keys()
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        incident.status = new_status
        incident.save(
            update_fields=["status", "updated_at"]
        )

        serializer = self.get_serializer(
            incident,
            context={"request": request}
        )

        return Response({
            "message": "Incident status updated successfully.",
            "incident": serializer.data
        })

# ============================================================
# INCIDENT COMMENTS
# ============================================================


class IncidentCommentViewSet(
    viewsets.ModelViewSet
):

    serializer_class = IncidentCommentSerializer

    queryset = IncidentComment.objects.all().order_by(
        "created_at"
    )

    def get_permissions(self):

        if self.action in [
            "list",
            "retrieve",
        ]:

            return [AllowAny()]

        return [IsAuthenticated()]

    def get_queryset(self):

        queryset = IncidentComment.objects.all().order_by(
            "created_at"
        )

        incident_id = self.request.query_params.get(
            "incident"
        )

        if incident_id:

            queryset = queryset.filter(
                incident_id=incident_id
            )

        return queryset

    def create(
        self,
        request,
        *args,
        **kwargs
    ):

        incident_id = request.data.get(
            "incident"
        )

        comment_text = request.data.get(
            "comment",
            ""
        )

        if not incident_id:

            return Response(
                {
                    "error": (
                        "Incident ID is required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not comment_text.strip():

            return Response(
                {
                    "error": (
                        "Comment cannot be empty."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        incident = get_object_or_404(
            IncidentReport,
            id=incident_id
        )

        comment = IncidentComment.objects.create(
            incident=incident,
            user=request.user,
            comment=comment_text
        )

        serializer = self.get_serializer(
            comment,
            context={
                "request": request
            }
        )

        return Response(
            {
                "message": "Comment added successfully.",
                "comment": serializer.data
            },
            status=status.HTTP_201_CREATED
        )

    def update(
        self,
        request,
        *args,
        **kwargs
    ):

        comment = self.get_object()

        if (
            comment.user != request.user
            and not request.user.is_staff
        ):

            return Response(
                {
                    "error": (
                        "You can only edit "
                        "your own comments."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        return super().update(
            request,
            *args,
            **kwargs
        )

    def destroy(
        self,
        request,
        *args,
        **kwargs
    ):

        comment = self.get_object()

        if (
            comment.user != request.user
            and not request.user.is_staff
        ):

            return Response(
                {
                    "error": (
                        "You can only delete "
                        "your own comments."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        return super().destroy(
            request,
            *args,
            **kwargs
        )


# ============================================================
# REVIEWS
# ============================================================

class ReviewViewSet(viewsets.ModelViewSet):

    queryset = Review.objects.all().order_by("-created_at")
    serializer_class = ReviewSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = Review.objects.all().order_by("-created_at")

        place_id = self.request.query_params.get("place")

        if place_id:
            queryset = queryset.filter(place_id=place_id)

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def update(self, request, *args, **kwargs):
        review = self.get_object()

        if (
            review.user != request.user
            and not request.user.is_staff
        ):
            return Response(
                {"error": "You can only edit your own reviews."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        review = self.get_object()

        if (
            review.user != request.user
            and not request.user.is_staff
        ):
            return Response(
                {"error": "You can only delete your own reviews."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().destroy(request, *args, **kwargs)


# ============================================================
# PLACE PHOTO UPLOADS
# ============================================================

class PlacePhotoViewSet(viewsets.ModelViewSet):

    queryset = PlacePhoto.objects.all().order_by("-created_at")
    serializer_class = PlacePhotoSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]

        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = PlacePhoto.objects.all().order_by("-created_at")

        place_id = self.request.query_params.get("place")

        if place_id:
            queryset = queryset.filter(place_id=place_id)

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def update(self, request, *args, **kwargs):
        photo = self.get_object()

        if (
            photo.user != request.user
            and not request.user.is_staff
        ):
            return Response(
                {"error": "You can only edit your own photos."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        photo = self.get_object()

        if (
            photo.user != request.user
            and not request.user.is_staff
        ):
            return Response(
                {"error": "You can only delete your own photos."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().destroy(request, *args, **kwargs)



class RouteSafetyAPIView(APIView):

    def get(self, request):
        from_dist = request.query_params.get("from")
        to_dist = request.query_params.get("to")

        # Optional exact destination coordinates
        destination_lat = request.query_params.get(
            "destination_lat"
        )
        destination_lon = request.query_params.get(
            "destination_lon"
        )

        if not from_dist:
            return Response(
                {"error": "'from' origin is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Find origin district
        origin_district = District.objects.filter(
            name__iexact=from_dist
        ).first()

        if not origin_district:
            origin_district = District.objects.filter(
                name__icontains=from_dist
            ).first()

        if not origin_district:
            return Response(
                {
                    "error": (
                        f"Origin district '{from_dist}' "
                        "was not found."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # If coordinates are supplied, route to the exact place.
        # Otherwise, preserve the existing district-to-district API.
        if destination_lat is not None and destination_lon is not None:
            try:
                destination_lat = float(destination_lat)
                destination_lon = float(destination_lon)

                if not (
                    -90 <= destination_lat <= 90
                    and -180 <= destination_lon <= 180
                ):
                    raise ValueError("Coordinates are out of range.")

            except (TypeError, ValueError):
                return Response(
                    {"error": "Valid destination coordinates are required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            destination_name = to_dist or "Selected tourist place"

            destination_info = {
                "name": destination_name,
                "latitude": destination_lat,
                "longitude": destination_lon,
            }

        else:
            if not to_dist:
                return Response(
                    {
                        "error": (
                            "'to' destination or destination "
                            "coordinates are required."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            destination_district = District.objects.filter(
                name__iexact=to_dist
            ).first()

            if not destination_district:
                destination_district = District.objects.filter(
                    name__icontains=to_dist
                ).first()

            if not destination_district:
                return Response(
                    {
                        "error": (
                            f"Destination district '{to_dist}' "
                            "was not found."
                        )
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            destination_info = {
                "name": destination_district.name,
                "latitude": destination_district.latitude,
                "longitude": destination_district.longitude,
            }

        # Calculate the real road route using OSRM
        try:
            route_data = RoutingService.get_routes(
                origin_latitude=origin_district.latitude,
                origin_longitude=origin_district.longitude,
                destination_latitude=destination_info["latitude"],
                destination_longitude=destination_info["longitude"],
            )

        except Exception as error:
            print(f"Route calculation error: {error}")

            return Response(
                {"error": "Unable to calculate the route."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "success": route_data.get("success", False),
                "source": route_data.get("source", "OSRM"),
                "from": {
                    "district": origin_district.name,
                    "latitude": origin_district.latitude,
                    "longitude": origin_district.longitude,
                },
                "to": destination_info,
                "routes": route_data.get("routes", []),
                "error": route_data.get("error"),
            }
        )


# ============================================================
# WOMEN SAFE HAVENS
# ============================================================


class WomenSafeHavenAPIView(APIView):

    def get(
        self,
        request
    ):

        district = request.query_params.get(
            "district"
        )

        if not district:

            return Response(
                {
                    "error": (
                        "District is required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        havens = WomenSafeHaven.objects.filter(
            district__name__icontains=district
        )

        return Response(
            WomenSafeHavenSerializer(
                havens,
                many=True
            ).data
        )


# ============================================================
# TRIP BRIEF
# ============================================================


class GenerateTripBriefAPIView(APIView):

    def post(
        self,
        request
    ):

        user_name = request.data.get(
            "user_name",
            "Traveler"
        )

        origin = request.data.get(
            "origin"
        )

        destination = request.data.get(
            "destination"
        )

        travel_date = request.data.get(
            "travel_date"
        )

        place_ids = request.data.get(
            "place_ids",
            []
        )

        if not origin or not destination:

            return Response(
                {
                    "error": (
                        "Origin and destination "
                        "are required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        selected_places = []

        if place_ids:

            places_qs = Place.objects.filter(
                id__in=place_ids
            )

            for place in places_qs:

                selected_places.append(
                    {
                        "name": place.name,

                        "category": place.category,

                        "safety_index":
                            place.safety_index,
                    }
                )

        brief = (
            TripBriefGenerator.generate_brief(
                user_name=user_name,

                origin=origin,

                destination=destination,

                places_selected=selected_places,

                travel_date=travel_date
            )
        )

        return Response(
            brief
        )