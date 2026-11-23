
from rest_framework import serializers
from django.contrib.auth.models import User

from .models import (
    District,
    Place,
    IncidentReport,
    IncidentPhoto,
    IncidentComment,
    Review,
    PlacePhoto,
    RouteSafety,
    WomenSafeHaven,
)


# ============================================================
# USER
# ============================================================

class UserSerializer(serializers.ModelSerializer):

    is_admin = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_admin",
        ]

    def get_is_admin(self, obj):
        return obj.is_staff or obj.is_superuser

# ============================================================
# USER REGISTRATION
# ============================================================

class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type": "password"}
    )

    confirm_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"}
    )

    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "password",
            "confirm_password",
        ]
        read_only_fields = ["id"]

    def validate_email(self, value):
        email = value.strip().lower()

        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return email

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })

        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        password = validated_data.pop("password")

        user = User(**validated_data)
        user.set_password(password)
        user.save()

        return user


# ============================================================
# INCIDENT COMMENT
# ============================================================

class IncidentCommentSerializer(serializers.ModelSerializer):

    username = serializers.CharField(
        source="user.username",
        read_only=True,
        allow_null=True
    )

    user_email = serializers.CharField(
        source="user.email",
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = IncidentComment
        fields = [
            "id",
            "incident",
            "user",
            "username",
            "user_email",
            "comment",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "user",
            "created_at",
            "updated_at",
        ]


# ============================================================
# INCIDENT EVIDENCE PHOTO
# Multiple photos for one incident
# ============================================================

class IncidentPhotoSerializer(serializers.ModelSerializer):

    username = serializers.CharField(
        source="uploaded_by.username",
        read_only=True,
        allow_null=True
    )

    image_url = serializers.SerializerMethodField()

    class Meta:
        model = IncidentPhoto
        fields = [
            "id",
            "incident",
            "uploaded_by",
            "username",
            "image",
            "image_url",
            "caption",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "uploaded_by",
            "created_at",
        ]

    def get_image_url(self, obj):
        if not obj.image:
            return None

        request = self.context.get("request")

        try:
            url = obj.image.url

            if request:
                return request.build_absolute_uri(url)

            return url

        except (ValueError, AttributeError):
            return None


# ============================================================
# INCIDENT REPORT
# ============================================================

class IncidentReportSerializer(serializers.ModelSerializer):

    reported_by_username = serializers.CharField(
        source="reported_by.username",
        read_only=True,
        allow_null=True
    )

    reported_by_email = serializers.CharField(
        source="reported_by.email",
        read_only=True,
        allow_null=True
    )

    place_name = serializers.CharField(
        source="place.name",
        read_only=True,
        allow_null=True
    )

    district_name = serializers.CharField(
        source="district.name",
        read_only=True,
        allow_null=True
    )

    comments = IncidentCommentSerializer(
        many=True,
        read_only=True
    )

    evidence_photos = IncidentPhotoSerializer(
        many=True,
        read_only=True
    )

    comments_count = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = IncidentReport
        fields = [
            "id",
            "reported_by",
            "reported_by_username",
            "reported_by_email",
            "place",
            "place_name",
            "district",
            "district_name",
            "title",
            "location_name",
            "incident_type",
            "severity",
            "description",
            "latitude",
            "longitude",
            "image",
            "image_url",
            "evidence_photos",
            "status",
            "reported_ago",
            "lighting_level",
            "crowd_density",
            "created_at",
            "updated_at",
            "comments",
            "comments_count",
        ]

        read_only_fields = [
            "reported_by",
            "status",
            "created_at",
            "updated_at",
        ]

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_image_url(self, obj):
        request = self.context.get("request")

        if not obj.image:
            return None

        try:
            url = obj.image.url

            if request:
                return request.build_absolute_uri(url)

            return url

        except (ValueError, AttributeError):
            return None


# ============================================================
# REVIEW
# ============================================================

class ReviewSerializer(serializers.ModelSerializer):

    username = serializers.CharField(
        source="user.username",
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = Review
        fields = "__all__"

        read_only_fields = [
            "id",
            "user",
            "user_name",
            "user_avatar",
            "created_at",
            "helpful_count",
        ]

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError(
                "Rating must be between 1 and 5."
            )

        return value

    def validate_comment(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError(
                "Please write a review."
            )

        return value.strip()

    def create(self, validated_data):
        request = self.context.get("request")

        if request and request.user.is_authenticated:
            user = request.user
            validated_data["user"] = user
            validated_data["user_name"] = (
                user.get_full_name().strip()
                or user.username
            )

        review = super().create(validated_data)

        self.update_place_rating(review.place)

        return review

    def update(self, instance, validated_data):
        review = super().update(instance, validated_data)

        self.update_place_rating(review.place)

        return review

    @staticmethod
    def update_place_rating(place):
        reviews = place.reviews.all()

        place.review_count = reviews.count()

        if place.review_count:
            average = sum(
                review.rating for review in reviews
            ) / place.review_count

            place.rating = round(average, 2)

        else:
            place.rating = None

        place.save(
            update_fields=["rating", "review_count"]
        )


# ============================================================
# PLACE PHOTO
# Normal tourist photos
# ============================================================

class PlacePhotoSerializer(serializers.ModelSerializer):

    username = serializers.CharField(
        source="user.username",
        read_only=True,
        allow_null=True
    )

    image_url = serializers.SerializerMethodField()

    class Meta:
        model = PlacePhoto
        fields = [
            "id",
            "place",
            "user",
            "username",
            "image",
            "image_url",
            "caption",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "user",
            "created_at",
        ]

    def get_image_url(self, obj):
        if not obj.image:
            return None

        request = self.context.get("request")

        try:
            url = obj.image.url

            if request:
                return request.build_absolute_uri(url)

            return url

        except (ValueError, AttributeError):
            return None


# ============================================================
# PLACE
# ============================================================

class PlaceSerializer(serializers.ModelSerializer):

    reviews = ReviewSerializer(
        many=True,
        read_only=True
    )

    incidents = IncidentReportSerializer(
        many=True,
        read_only=True
    )

    uploaded_photos = PlacePhotoSerializer(
        many=True,
        read_only=True
    )

    district_name = serializers.CharField(
        source="district.name",
        read_only=True
    )

    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Place
        fields = [
            "id",
            "external_place_id",
            "source",
            "district",
            "district_name",
            "name",
            "image",
            "image_url",
            "category",
            "latitude",
            "longitude",
            "description",
            "website",
            "phone",
            "opening_hours",
            "address",
            "fee",
            "rating",
            "review_count",
            "safety_index",
            "reviews",
            "incidents",
            "uploaded_photos",
            "created_at",
            "updated_at",
        ]

    def get_image_url(self, obj):
        if not obj.image:
            return None

        request = self.context.get("request")

        try:
            url = obj.image.url

            if request:
                return request.build_absolute_uri(url)

            return url

        except (ValueError, AttributeError):
            return None


# ============================================================
# DISTRICT
# ============================================================

class DistrictSerializer(serializers.ModelSerializer):

    places = PlaceSerializer(
        many=True,
        read_only=True
    )

    total_places = serializers.SerializerMethodField()

    class Meta:
        model = District
        fields = [
            "id",
            "name",
            "region",
            "photo_url",
            "latitude",
            "longitude",
            "safety_index",
            "description",
            "places",
            "total_places",
        ]

    def get_total_places(self, obj):
        return obj.places.count()


# ============================================================
# ROUTE SAFETY
# ============================================================

class RouteSafetySerializer(serializers.ModelSerializer):

    from_district_name = serializers.CharField(
        source="from_district.name",
        read_only=True
    )

    to_district_name = serializers.CharField(
        source="to_district.name",
        read_only=True
    )

    class Meta:
        model = RouteSafety
        fields = [
            "id",
            "from_district",
            "from_district_name",
            "to_district",
            "to_district_name",
            "recommended_route_name",
            "recommended_duration",
            "recommended_distance",
            "recommended_safety_score",
            "alt_route_name",
            "alt_duration",
            "alt_distance",
            "alt_safety_score",
            "safe_reasons",
            "alt_warning_reasons",
        ]


# ============================================================
# WOMEN SAFE HAVEN
# ============================================================

class WomenSafeHavenSerializer(serializers.ModelSerializer):

    district_name = serializers.CharField(
        source="district.name",
        read_only=True
    )

    class Meta:
        model = WomenSafeHaven
        fields = "__all__"
