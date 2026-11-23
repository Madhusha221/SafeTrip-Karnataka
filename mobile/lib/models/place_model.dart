class TouristPlace {
  final String id;
  final String district;
  final String name;
  final String category;
  final double rating;
  final int reviews;
  final String imageUrl;
  final String description;
  final double safetyIndex;
  final String bestTime;
  final String entryFee;
  final String avgVisit;

  TouristPlace({
    required this.id,
    required this.district,
    required this.name,
    required this.category,
    required this.rating,
    required this.reviews,
    required this.imageUrl,
    required this.description,
    required this.safetyIndex,
    required this.bestTime,
    required this.entryFee,
    required this.avgVisit,
  });
}
