
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../services/auth_service.dart';

class CommunityScreen extends StatefulWidget {
  const CommunityScreen({Key? key}) : super(key: key);

  @override
  State<CommunityScreen> createState() => _CommunityScreenState();
}

class _CommunityScreenState extends State<CommunityScreen> {
  static const Color teal = Color(0xFF00A88F);
  static const Color navy = Color(0xFF0F172A);
  static const Color background = Color(0xFFF8FAFC);

  bool isLoading = true;
  bool isSubmitting = false;

  String errorMessage = '';
  String selectedTab = 'Reviews';
  String searchQuery = '';
  String selectedDistrict = 'All Districts';
  String selectedRating = 'All Ratings';

  List<dynamic> reviews = [];
  List<dynamic> photos = [];
  List<dynamic> places = [];
  List<dynamic> districts = [];

  @override
  void initState() {
    super.initState();
    loadCommunityData();
  }

  List<dynamic> extractList(dynamic data) {
    if (data is List) return data;
    if (data is Map && data['results'] is List) {
      return data['results'];
    }
    return [];
  }

  Future<List<dynamic>> fetchList(String endpoint) async {
    final response = await http
        .get(Uri.parse('${AuthService.baseUrl}/$endpoint'))
        .timeout(const Duration(seconds: 20));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Unable to load $endpoint (${response.statusCode})');
    }

    return extractList(jsonDecode(response.body));
  }

  Future<void> loadCommunityData() async {
    if (mounted) {
      setState(() {
        isLoading = true;
        errorMessage = '';
      });
    }

    try {
      final results = await Future.wait([
        fetchList('reviews/'),
        fetchList('place-photos/'),
        fetchList('places/'),
        fetchList('districts/'),
      ]);

      if (!mounted) return;

      setState(() {
        reviews = results[0];
        photos = results[1];
        places = results[2];
        districts = results[3];
        isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        errorMessage = e.toString().replaceFirst('Exception: ', '');
        isLoading = false;
      });
    }
  }

  String valueOf(dynamic value, [String fallback = '']) {
    if (value == null) return fallback;
    return value.toString();
  }

  Map<String, dynamic> asMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return {};
  }

  String placeName(dynamic review) {
    final item = asMap(review);
    final place = asMap(item['place']);

    return valueOf(
      place['name'] ?? item['place_name'],
      'Tourist place',
    );
  }

  String districtName(dynamic review) {
    final item = asMap(review);
    final place = asMap(item['place']);

    return valueOf(
      place['district_name'] ??
          asMap(place['district'])['name'] ??
          item['district_name'],
      '',
    );
  }

  String username(dynamic review) {
    final item = asMap(review);
    final user = asMap(item['user']);

    return valueOf(
      item['username'] ??
          item['user_name'] ??
          user['username'] ??
          user['first_name'],
      'Traveller',
    );
  }

  int ratingOf(dynamic review) {
    final item = asMap(review);
    return int.tryParse(valueOf(item['rating'])) ?? 0;
  }

  String commentOf(dynamic review) {
    return valueOf(asMap(review)['comment']);
  }

  String dateOf(dynamic review) {
    final item = asMap(review);
    final raw = valueOf(item['created_at'] ?? item['date']);

    if (raw.isEmpty) return '';

    final date = DateTime.tryParse(raw);
    if (date == null) return raw;

    return '${date.day.toString().padLeft(2, '0')}/'
        '${date.month.toString().padLeft(2, '0')}/'
        '${date.year}';
  }

  List<dynamic> get filteredReviews {
    return reviews.where((review) {
      final query = searchQuery.toLowerCase();

      final matchesSearch = query.isEmpty ||
          commentOf(review).toLowerCase().contains(query) ||
          username(review).toLowerCase().contains(query) ||
          placeName(review).toLowerCase().contains(query) ||
          districtName(review).toLowerCase().contains(query);

      final matchesDistrict = selectedDistrict == 'All Districts' ||
          districtName(review) == selectedDistrict;

      final matchesRating = selectedRating == 'All Ratings' ||
          ratingOf(review).toString() == selectedRating;

      return matchesSearch && matchesDistrict && matchesRating;
    }).toList();
  }

  List<dynamic> get filteredPhotos {
    return photos.where((photo) {
      final item = asMap(photo);
      final place = asMap(item['place']);

      final name = valueOf(
        place['name'] ?? item['place_name'],
      ).toLowerCase();

      final district = valueOf(
        place['district_name'] ?? item['district_name'],
      );

      final query = searchQuery.toLowerCase();

      final matchesSearch = query.isEmpty || name.contains(query);
      final matchesDistrict = selectedDistrict == 'All Districts' ||
          district == selectedDistrict;

      return matchesSearch && matchesDistrict;
    }).toList();
  }

  double get averageRating {
    if (reviews.isEmpty) return 0;

    final total = reviews.fold<int>(
      0,
      (sum, review) => sum + ratingOf(review),
    );

    return total / reviews.length;
  }

  Future<void> submitReview({
    required int placeId,
    required int rating,
    required String comment,
    required bool soloFemale,
  }) async {
    final token = await AuthService.getAccessToken();

    if (token == null || token.isEmpty) {
      throw Exception('Please sign in before posting a review.');
    }

    final response = await http
        .post(
          Uri.parse('${AuthService.baseUrl}/reviews/'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
          body: jsonEncode({
            'place': placeId,
            'rating': rating,
            'comment': comment.trim(),
            'is_solo_female': soloFemale,
          }),
        )
        .timeout(const Duration(seconds: 20));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      String message = 'Unable to post review.';

      try {
        final data = jsonDecode(response.body);
        if (data is Map) {
          message = valueOf(
            data['detail'] ?? data['message'] ?? data['error'],
            message,
          );
        }
      } catch (_) {}

      throw Exception(message);
    }
  }

  void showMessage(String message, {bool isError = false}) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red.shade700 : teal,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void openReviewForm() {
    if (places.isEmpty) {
      showMessage('No tourist places are available yet.', isError: true);
      return;
    }

    int? selectedPlaceId;
    int selectedStars = 5;
    bool soloFemale = false;
    final commentController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 22,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Center(
                      child: Container(
                        width: 42,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                    const SizedBox(height: 22),
                    const Text(
                      'Share your experience',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: navy,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Help other travellers explore Karnataka safely.',
                      style: TextStyle(color: Colors.blueGrey),
                    ),
                    const SizedBox(height: 22),
                    const Text(
                      'Tourist place',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<int>(
                      value: selectedPlaceId,
                      isExpanded: true,
                      decoration: InputDecoration(
                        hintText: 'Select a place',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      items: places.map((place) {
                        final item = asMap(place);
                        final id = int.tryParse(valueOf(item['id']));
                        if (id == null) return null;

                        return DropdownMenuItem<int>(
                          value: id,
                          child: Text(
                            valueOf(item['name'], 'Tourist place'),
                            overflow: TextOverflow.ellipsis,
                          ),
                        );
                      }).whereType<DropdownMenuItem<int>>().toList(),
                      onChanged: (value) {
                        setSheetState(() => selectedPlaceId = value);
                      },
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Your rating',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: List.generate(5, (index) {
                        final star = index + 1;
                        return IconButton(
                          onPressed: () {
                            setSheetState(() => selectedStars = star);
                          },
                          icon: Icon(
                            star <= selectedStars
                                ? Icons.star_rounded
                                : Icons.star_outline_rounded,
                            color: Colors.amber.shade700,
                            size: 32,
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Your review',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: commentController,
                      maxLines: 4,
                      maxLength: 1000,
                      decoration: InputDecoration(
                        hintText: 'Tell us about your experience...',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      value: soloFemale,
                      activeColor: teal,
                      title: const Text(
                        'I travelled as a solo female traveller',
                        style: TextStyle(fontSize: 13),
                      ),
                      onChanged: (value) {
                        setSheetState(() => soloFemale = value ?? false);
                      },
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: teal,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 15),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: isSubmitting
                            ? null
                            : () async {
                                if (selectedPlaceId == null) {
                                  showMessage('Please select a place.',
                                      isError: true);
                                  return;
                                }

                                if (commentController.text.trim().isEmpty) {
                                  showMessage('Please write your review.',
                                      isError: true);
                                  return;
                                }

                                setState(() => isSubmitting = true);

                                try {
                                  await submitReview(
                                    placeId: selectedPlaceId!,
                                    rating: selectedStars,
                                    comment: commentController.text,
                                    soloFemale: soloFemale,
                                  );

                                  if (!mounted) return;

                                  Navigator.pop(sheetContext);
                                  showMessage('Review posted successfully!');
                                  await loadCommunityData();
                                } catch (e) {
                                  showMessage(
                                    e.toString().replaceFirst(
                                          'Exception: ',
                                          '',
                                        ),
                                    isError: true,
                                  );
                                } finally {
                                  if (mounted) {
                                    setState(() => isSubmitting = false);
                                  }
                                }
                              },
                        child: Text(
                          isSubmitting ? 'Posting...' : 'Post Review',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    ).whenComplete(() => commentController.dispose());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Community',
          style: TextStyle(
            color: navy,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            onPressed: loadCommunityData,
            icon: const Icon(Icons.refresh_rounded, color: navy),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: isLoading
          ? const Center(
              child: CircularProgressIndicator(color: teal),
            )
          : errorMessage.isNotEmpty
              ? _buildError()
              : RefreshIndicator(
                  color: teal,
                  onRefresh: loadCommunityData,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildHero(),
                      const SizedBox(height: 18),
                      _buildStats(),
                      const SizedBox(height: 22),
                      _buildFilters(),
                      const SizedBox(height: 22),
                      _buildFeedHeader(),
                      const SizedBox(height: 14),
                      if (selectedTab == 'Reviews') _buildReviews(),
                      if (selectedTab == 'Photos') _buildPhotos(),
                      if (selectedTab == 'Videos') _buildVideos(),
                      const SizedBox(height: 24),
                      _buildCommunityInfo(),
                    ],
                  ),
                ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_outlined, size: 48, color: Colors.grey),
            const SizedBox(height: 14),
            const Text(
              'Unable to load Community',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: navy,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              errorMessage,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.blueGrey),
            ),
            const SizedBox(height: 18),
            ElevatedButton(
              onPressed: loadCommunityData,
              style: ElevatedButton.styleFrom(backgroundColor: teal),
              child: const Text(
                'Try again',
                style: TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHero() {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF087F70), Color(0xFF00A88F)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.travel_explore_rounded,
            color: Colors.white,
            size: 34,
          ),
          const SizedBox(height: 14),
          const Text(
            'Travel Together.\nShare Your Experience.',
            style: TextStyle(
              color: Colors.white,
              fontSize: 23,
              height: 1.25,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Discover places through real traveller experiences.',
            style: TextStyle(
              color: Colors.white.withOpacity(0.9),
              height: 1.4,
            ),
          ),
          const SizedBox(height: 18),
          OutlinedButton.icon(
            onPressed: openReviewForm,
            icon: const Icon(Icons.add, size: 18),
            label: const Text('Share your review'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.white,
              side: const BorderSide(color: Colors.white),
              padding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStats() {
    final stats = [
      ['${reviews.length}', 'Reviews', Icons.rate_review_outlined],
      ['${photos.length}', 'Photos', Icons.photo_library_outlined],
      ['${places.length}', 'Places', Icons.place_outlined],
      [averageRating.toStringAsFixed(1), 'Avg. rating', Icons.star_outline],
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: stats.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 1.9,
      ),
      itemBuilder: (context, index) {
        final stat = stats[index];

        return Container(
          padding: const EdgeInsets.all(13),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(15),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Row(
            children: [
              Icon(stat[2] as IconData, color: teal, size: 25),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      stat[0] as String,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: navy,
                      ),
                    ),
                    Text(
                      stat[1] as String,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.blueGrey,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildFilters() {
    final districtNames = districts.map((district) {
      final item = asMap(district);
      return valueOf(item['name']);
    }).where((name) => name.isNotEmpty).toSet().toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Explore the community',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: navy,
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          onChanged: (value) => setState(() => searchQuery = value),
          decoration: InputDecoration(
            hintText: 'Search reviews and places...',
            prefixIcon: const Icon(Icons.search, color: teal),
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.symmetric(vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(13),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(13),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
          ),
        ),
        const SizedBox(height: 10),
        DropdownButtonFormField<String>(
          value: selectedDistrict,
          isExpanded: true,
          decoration: InputDecoration(
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 12,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(13),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
          ),
          items: [
            const DropdownMenuItem(
              value: 'All Districts',
              child: Text('All Districts'),
            ),
            ...districtNames.map(
              (name) => DropdownMenuItem(
                value: name,
                child: Text(name),
              ),
            ),
          ],
          onChanged: (value) {
            setState(() => selectedDistrict = value ?? 'All Districts');
          },
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: DropdownButtonFormField<String>(
                value: selectedRating,
                decoration: InputDecoration(
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 12,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(13),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                ),
                items: [
                  'All Ratings',
                  '5',
                  '4',
                  '3',
                  '2',
                  '1',
                ].map((rating) {
                  return DropdownMenuItem(
                    value: rating,
                    child: Text(
                      rating == 'All Ratings' ? rating : '$rating stars',
                    ),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() => selectedRating = value ?? 'All Ratings');
                },
              ),
            ),
            const SizedBox(width: 8),
            TextButton(
              onPressed: () {
                setState(() {
                  searchQuery = '';
                  selectedDistrict = 'All Districts';
                  selectedRating = 'All Ratings';
                });
              },
              child: const Text(
                'Reset',
                style: TextStyle(color: teal),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildFeedHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Community Feed',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: navy,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: ['Reviews', 'Photos', 'Videos'].map((tab) {
            final selected = selectedTab == tab;

            return Expanded(
              child: GestureDetector(
                onTap: () => setState(() => selectedTab = tab),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 11),
                  margin: const EdgeInsets.only(right: 6),
                  decoration: BoxDecoration(
                    color: selected ? teal : Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: selected ? teal : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Text(
                    tab,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: selected ? Colors.white : navy,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildReviews() {
    final items = filteredReviews;

    if (items.isEmpty) {
      return _emptyState(
        Icons.rate_review_outlined,
        'No reviews found',
        'Be the first to share your travel experience.',
      );
    }

    return Column(
      children: items.map(_reviewCard).toList(),
    );
  }

  Widget _reviewCard(dynamic review) {
    final item = asMap(review);
    final name = username(review);
    final soloFemale = item['is_solo_female'] == true;

    return Container(
      margin: const EdgeInsets.only(bottom: 13),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(17),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                backgroundColor: teal.withOpacity(0.12),
                child: Text(
                  name.isNotEmpty ? name[0].toUpperCase() : 'T',
                  style: const TextStyle(
                    color: teal,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: navy,
                      ),
                    ),
                    Text(
                      dateOf(review),
                      style: const TextStyle(
                        color: Colors.blueGrey,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              if (soloFemale)
                const Icon(
                  Icons.verified_user_outlined,
                  color: teal,
                  size: 21,
                ),
            ],
          ),
          const SizedBox(height: 13),
          Row(
            children: List.generate(
              5,
              (index) => Icon(
                index < ratingOf(review)
                    ? Icons.star_rounded
                    : Icons.star_outline_rounded,
                color: Colors.amber.shade700,
                size: 19,
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            placeName(review),
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              color: navy,
              fontSize: 15,
            ),
          ),
          if (districtName(review).isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 3),
              child: Text(
                districtName(review),
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.blueGrey,
                ),
              ),
            ),
          const SizedBox(height: 10),
          Text(
            commentOf(review),
            style: const TextStyle(
              color: Color(0xFF475569),
              height: 1.5,
            ),
          ),
          if (soloFemale) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 10,
                vertical: 6,
              ),
              decoration: BoxDecoration(
                color: teal.withOpacity(0.08),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Text(
                'Solo female traveller',
                style: TextStyle(
                  color: teal,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String? photoUrl(dynamic photo) {
    final item = asMap(photo);
    final raw = valueOf(
      item['image'] ?? item['photo'] ?? item['image_url'] ?? item['photo_url'],
    );

    if (raw.isEmpty) return null;

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }

    final base = Uri.parse(AuthService.baseUrl);
    final origin = '${base.scheme}://${base.authority}';

    return raw.startsWith('/') ? '$origin$raw' : '$origin/$raw';
  }

  Widget _buildPhotos() {
    final items = filteredPhotos;

    if (items.isEmpty) {
      return _emptyState(
        Icons.photo_library_outlined,
        'No photos found',
        'Community photos will appear here when available.',
      );
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: items.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 0.85,
      ),
      itemBuilder: (context, index) {
        final photo = items[index];
        final item = asMap(photo);
        final url = photoUrl(photo);

        return ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: Container(
            color: Colors.white,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: SizedBox(
                    width: double.infinity,
                    child: url == null
                        ? const Icon(
                            Icons.image_outlined,
                            color: Colors.grey,
                            size: 40,
                          )
                        : Image.network(
                            url,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => const Icon(
                              Icons.broken_image_outlined,
                              color: Colors.grey,
                              size: 40,
                            ),
                          ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(9),
                  child: Text(
                    valueOf(
                      asMap(item['place'])['name'] ??
                          item['place_name'],
                      'Karnataka',
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: navy,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildVideos() {
    return _emptyState(
      Icons.video_library_outlined,
      'Videos coming soon',
      'Community video sharing is not connected yet.',
    );
  }

  Widget _buildCommunityInfo() {
    return Container(
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Community Highlights',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.bold,
              color: navy,
            ),
          ),
          SizedBox(height: 10),
          Text(
            'Your experiences help fellow travellers discover Karnataka and make informed travel decisions.',
            style: TextStyle(
              color: Colors.blueGrey,
              height: 1.5,
            ),
          ),
          SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.people_outline, color: teal),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Explore, share and travel responsibly.',
                  style: TextStyle(
                    color: navy,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _emptyState(IconData icon, String title, String description) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
        horizontal: 20,
        vertical: 35,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          Icon(icon, size: 38, color: teal),
          const SizedBox(height: 12),
          Text(
            title,
            style: const TextStyle(
              color: navy,
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            description,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.blueGrey,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}
