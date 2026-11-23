import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../services/auth_service.dart';
import '../services/place_service.dart';
import 'route_map_screen.dart';


class PlaceDetailsScreen extends StatefulWidget {
  final Map<String, dynamic> place;

  const PlaceDetailsScreen({
    Key? key,
    required this.place,
  }) : super(key: key);

  @override
  State<PlaceDetailsScreen> createState() => _PlaceDetailsScreenState();
}

class _PlaceDetailsScreenState extends State<PlaceDetailsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final ImagePicker _imagePicker = ImagePicker();

  List<dynamic> reviews = [];
  List<dynamic> photos = [];
  List<dynamic> incidents = [];
  String searchedWikimediaImageUrl = '';

  bool isLoading = true;
  bool isUploading = false;

  String? errorMessage;

  static const Color teal = Color(0xFF0D998C);
  static const Color dark = Color(0xFF172033);
  static const Color muted = Color(0xFF64748B);
  static const Color pageBackground = Color(0xFFF8FAFC);
  static const Color borderColor = Color(0xFFE2E8F0);

  int get placeId =>
      int.tryParse(widget.place['id']?.toString() ?? '') ?? 0;

  String get placeName =>
      widget.place['name']?.toString() ?? 'Tourist Place';

  String get districtName {
    final district = widget.place['district'];

    return widget.place['district_name']?.toString() ??
        (district is Map
            ? district['name']?.toString() ?? ''
            : district?.toString() ?? '');
  }

  int get districtId {
    final district = widget.place['district'];

    if (district is Map) {
      return int.tryParse(district['id']?.toString() ?? '') ?? 0;
    }

    return int.tryParse(
          widget.place['district_id']?.toString() ?? '',
        ) ??
        0;
  }

  String get description {
    final value = widget.place['description']?.toString() ?? '';

    if (value.trim().isNotEmpty) return value;

    return 'Discover $placeName with SafeTrip Karnataka. Explore its location, visitor information and community safety reports.';
  }

  String get address =>
      widget.place['address']?.toString() ??
      'Location details not available';

  String get category =>
      widget.place['category']?.toString() ?? 'Tourist Place';

  String get serverUrl {
    final uri = Uri.parse(AuthService.baseUrl.trim());
    return '${uri.scheme}://${uri.authority}';
  }

  String resolveImageUrl(dynamic value) {
    final path = value?.toString().trim() ?? '';

    if (path.isEmpty || path == 'null') return '';

    final uri = Uri.tryParse(path);

    if (uri != null && uri.hasScheme) return path;

    if (path.startsWith('/')) return '$serverUrl$path';

    return '$serverUrl/$path';
  }

  String get imageUrl {
    String readImage(dynamic value) {
      if (value is Map) {
        value = value['image_url'] ??
            value['image'] ??
            value['photo_url'] ??
            value['photo'];
      }

      return resolveImageUrl(value);
    }

    // Check direct image fields one by one to skip null or empty values.
    for (final key in [
      'image_url',
      'image',
      'photo_url',
      'photo',
    ]) {
      final url = readImage(widget.place[key]);
      if (url.isNotEmpty) return url;
    }

    // Also support images returned in uploaded_photos.
    final uploadedPhotos = widget.place['uploaded_photos'];
    if (uploadedPhotos is List) {
      for (final photo in uploadedPhotos) {
        final url = readImage(photo);
        if (url.isNotEmpty) return url;
      }
    }

    final commons = (widget.place['wikimedia_commons'] ??
            widget.place['wikimedia_image'])
        ?.toString()
        .trim() ?? '';
    if (commons.startsWith('http://') || commons.startsWith('https://')) {
      return commons;
    }
    if (commons.startsWith('File:')) {
      return 'https://commons.wikimedia.org/wiki/Special:FilePath/${Uri.encodeComponent(commons.substring(5))}';
    }

    return searchedWikimediaImageUrl;
  }

  // Same Wikimedia Commons search used by the website for destinations
  // that do not already have an uploaded/API image.
  Future<String> _searchWikimediaImage() async {
    final name = placeName.trim();
    if (name.isEmpty) return '';

    final params = <String, String>{
      'action': 'query',
      'generator': 'search',
      'gsrsearch': '"$name" ${districtName.isNotEmpty ? districtName : 'Karnataka'} Karnataka',
      'gsrnamespace': '6',
      'gsrlimit': '5',
      'prop': 'imageinfo',
      'iiprop': 'url',
      'iiurlwidth': '800',
      'format': 'json',
      'origin': '*',
    };

    try {
      final uri = Uri.https('commons.wikimedia.org', '/w/api.php', params);
      final response = await http.get(
        uri,
        headers: {'Accept': 'application/json'},
      ).timeout(const Duration(seconds: 8));
      if (response.statusCode != 200) return '';

      final decoded = jsonDecode(response.body);
      final query = decoded is Map ? decoded['query'] : null;
      final pages = query is Map && query['pages'] is Map
          ? (query['pages'] as Map).values.toList()
          : <dynamic>[];
      final nameWords = name
          .toLowerCase()
          .split(RegExp(r'[\s-]+'))
          .where((word) => word.length >= 3)
          .toList();

      for (final pageValue in pages) {
        if (pageValue is! Map) continue;
        final title = pageValue['title']?.toString().toLowerCase() ?? '';
        final infoList = pageValue['imageinfo'];
        if (nameWords.isNotEmpty &&
            nameWords.any((word) => title.contains(word)) &&
            infoList is List && infoList.isNotEmpty &&
            infoList.first is Map) {
          final info = infoList.first as Map;
          final image = info['thumburl'] ?? info['url'];
          if (image != null && image.toString().trim().isNotEmpty) {
            return image.toString();
          }
        }
      }
    } catch (_) {
      // Fall back to the existing image placeholder if search is unavailable.
    }
    return '';
  }

  double? number(dynamic value) {
    if (value == null) return null;
    return double.tryParse(value.toString());
  }

  @override
  void initState() {
    super.initState();

    _tabController = TabController(length: 4, vsync: this);

    _loadPlaceData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadPlaceData() async {
    if (placeId == 0) {
      if (!mounted) return;

      setState(() {
        isLoading = false;
        errorMessage = 'Place ID is not available.';
      });

      return;
    }

    setState(() {
      isLoading = true;
      errorMessage = null;
    });

    try {
      final results = await Future.wait([
        PlaceService.getReviews(placeId),
        PlaceService.getPhotos(placeId),
        PlaceService.getIncidents(placeId),
      ]);

      var searchedImage = '';
      if (imageUrl.isEmpty) {
        searchedImage = await _searchWikimediaImage();
      }

      if (!mounted) return;

      setState(() {
        reviews = results[0];
        photos = results[1];
        incidents = results[2];
        searchedWikimediaImageUrl = searchedImage;
        isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        isLoading = false;
        errorMessage = e.toString();
      });
    }
  }

  void _message(String message) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Future<bool> _isLoggedIn() async {
    final token = await AuthService.getAccessToken();

    if (token == null || token.isEmpty) {
      _message('Please sign in to continue.');
      return false;
    }

    return true;
  }

  @override
Widget build(BuildContext context) {
  final rating = number(widget.place['rating']);

  final reviewCount =
      widget.place['review_count']?.toString() ??
          reviews.length.toString();

  return Scaffold(
    backgroundColor: pageBackground,
    appBar: AppBar(
      backgroundColor: Colors.white,
      elevation: 0.5,
      foregroundColor: dark,
      title: const Text(
        'Place Details',
        style: TextStyle(
          color: dark,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
      ),
    ),
    body: Column(
      children: [
        Expanded(
          flex: 5,
          child: SingleChildScrollView(
            child: _buildPlaceHeader(rating, reviewCount),
          ),
        ),
        Container(
          margin: const EdgeInsets.fromLTRB(12, 8, 12, 8),
          padding: const EdgeInsets.all(5),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: borderColor),
          ),
          child: TabBar(
            controller: _tabController,
            isScrollable: true,
            indicator: BoxDecoration(
              color: teal,
              borderRadius: BorderRadius.circular(11),
            ),
            indicatorSize: TabBarIndicatorSize.tab,
            dividerColor: Colors.transparent,
            labelColor: Colors.white,
            unselectedLabelColor: muted,
            labelStyle: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
            tabs: const [
              Tab(
                icon: Icon(Icons.info_outline, size: 17),
                text: 'Overview',
              ),
              Tab(
                icon: Icon(Icons.shield_outlined, size: 17),
                text: 'Safety',
              ),
              Tab(
                icon: Icon(Icons.star_outline, size: 17),
                text: 'Reviews',
              ),
              Tab(
                icon: Icon(Icons.photo_outlined, size: 17),
                text: 'Photos',
              ),
            ],
          ),
        ),
        Expanded(
          flex: 6,
          child: isLoading
              ? const Center(
                  child: CircularProgressIndicator(color: teal),
                )
              : errorMessage != null
                  ? _buildError()
                  : TabBarView(
                      controller: _tabController,
                      children: [
                        _buildOverview(),
                        _buildSafetyTab(),
                        _buildReviewsTab(),
                        _buildPhotosTab(),
                      ],
                    ),
        ),
      ],
    ),
    bottomNavigationBar: Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
      child: SafeArea(
        child: SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) {
                    return RouteMapScreen(
                      initialPlace: widget.place,
                    );
                  },
                ),
              );
            },
            icon: const Icon(Icons.explore_outlined),
            label: const Text(
              'Get Directions (Safe Route)',
              style: TextStyle(
                fontWeight: FontWeight.bold,
              ),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: teal,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(50),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(13),
              ),
              elevation: 0,
            ),
          ),
        ),
      ),
    ),
  );
}
  // ------------------------------------------------------------
  // PLACE HEADER
  // ------------------------------------------------------------

  Widget _buildPlaceHeader(double? rating, String reviewCount) {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 8, 12, 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(19),
        border: Border.all(color: borderColor),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 185,
            width: double.infinity,
            child: Stack(
              fit: StackFit.expand,
              children: [
                imageUrl.isNotEmpty
                    ? Image.network(
                        imageUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) =>
                            _imagePlaceholder(),
                      )
                    : _imagePlaceholder(),
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Color(0x99000000),
                      ],
                    ),
                  ),
                ),
                Positioned(
                  left: 13,
                  top: 13,
                  child: _heroButton(
                    icon: Icons.arrow_back,
                    label: 'Back',
                    onTap: () => Navigator.pop(context),
                  ),
                ),
                Positioned(
                  right: 13,
                  bottom: 13,
                  child: _heroButton(
                    icon: Icons.photo_library_outlined,
                    label: 'Photos (${photos.length})',
                    onTap: () => _tabController.animateTo(3),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(17, 16, 17, 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 11,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDDF5EF),
                    borderRadius: BorderRadius.circular(30),
                  ),
                  child: Text(
                    category,
                    style: const TextStyle(
                      color: Color(0xFF087B6F),
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
                    ),
                  ),
                ),
                const SizedBox(height: 11),
                Text(
                  placeName,
                  style: const TextStyle(
                    fontSize: 23,
                    height: 1.15,
                    fontWeight: FontWeight.w900,
                    color: dark,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.location_on_outlined,
                      color: teal,
                      size: 19,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        [
                          address,
                          if (districtName.isNotEmpty) districtName,
                          'Karnataka',
                          'India',
                        ].join(', '),
                        style: const TextStyle(
                          color: muted,
                          fontSize: 12,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 13),
                Row(
                  children: [
                    const Icon(
                      Icons.star,
                      color: Color(0xFFF5B400),
                      size: 20,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      rating != null
                          ? rating.toStringAsFixed(1)
                          : 'Not rated',
                      style: const TextStyle(
                        color: dark,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      '$reviewCount reviews',
                      style: const TextStyle(
                        color: muted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  description,
                  style: const TextStyle(
                    color: muted,
                    fontSize: 13,
                    height: 1.65,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _heroButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: 11,
            vertical: 9,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: dark),
              const SizedBox(width: 5),
              Text(
                label,
                style: const TextStyle(
                  color: dark,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _imagePlaceholder() {
    return Container(
      color: const Color(0xFFE2E8F0),
      child: const Center(
        child: Icon(
          Icons.image_outlined,
          size: 55,
          color: Colors.blueGrey,
        ),
      ),
    );
  }

  // ------------------------------------------------------------
  // OVERVIEW
  // ------------------------------------------------------------

  Widget _buildOverview() {
    final openingHours =
        widget.place['opening_hours']?.toString();

    final fee = widget.place['fee']?.toString();

    final safety = number(widget.place['safety_index']);

    return RefreshIndicator(
      onRefresh: _loadPlaceData,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(13, 8, 13, 20),
        children: [
          _sectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _sectionHeading(
                  Icons.info_outline,
                  'About This Place',
                  'Information collected from available place data',
                ),
                const SizedBox(height: 18),
                Text(
                  description,
                  style: const TextStyle(
                    color: muted,
                    fontSize: 13,
                    height: 1.7,
                  ),
                ),
                const SizedBox(height: 18),
                _detailRow(
                  Icons.access_time,
                  'Opening Hours',
                  openingHours != null &&
                          openingHours.trim().isNotEmpty
                      ? openingHours
                      : 'Hours not available',
                ),
                _detailRow(
                  Icons.confirmation_number_outlined,
                  'Entry Fee',
                  fee != null && fee.trim().isNotEmpty
                      ? fee
                      : 'Entry fee information not available',
                ),
                _detailRow(
                  Icons.location_on_outlined,
                  'Location',
                  address,
                ),
                if (safety != null)
                  _detailRow(
                    Icons.shield_outlined,
                    'Safety Index',
                    safety.toStringAsFixed(1),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          _sectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _sectionHeading(
                  Icons.verified_user_outlined,
                  'SafeTrip Community Reports',
                  'Traveler experiences help create safer journeys.',
                ),
                const SizedBox(height: 15),
                Row(
                  children: [
                    Expanded(
                      child: _summaryTile(
                        'Verified',
                        _countIncidents('verified'),
                        Colors.red,
                        const Color(0xFFFFF1F2),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _summaryTile(
                        'Pending',
                        _countIncidents('pending'),
                        Colors.orange,
                        const Color(0xFFFFF9E9),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                OutlinedButton.icon(
                  onPressed: () => _tabController.animateTo(1),
                  icon: const Icon(
                    Icons.shield_outlined,
                    color: teal,
                  ),
                  label: const Text(
                    'View Safety & Incidents',
                    style: TextStyle(color: teal),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          _sectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _sectionHeading(
                  Icons.explore_outlined,
                  'Explore More',
                  'Discover information shared by other travelers.',
                ),
                _actionRow(
                  'Read Community Reviews',
                  Icons.rate_review_outlined,
                  () => _tabController.animateTo(2),
                ),
                _actionRow(
                  'View Destination Photos',
                  Icons.photo_library_outlined,
                  () => _tabController.animateTo(3),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  int _countIncidents(String status) {
    return incidents.where((item) {
      return item['status']?.toString().toLowerCase() == status;
    }).length;
  }

  // ------------------------------------------------------------
  // SAFETY TAB
  // ------------------------------------------------------------

  Widget _buildSafetyTab() {
    return RefreshIndicator(
      onRefresh: _loadPlaceData,
      child: ListView(
        padding: const EdgeInsets.all(13),
        children: [
          _sectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _sectionHeading(
                  Icons.shield_outlined,
                  'Safety & Incidents',
                  'Incident information reported for this destination.',
                ),
                const SizedBox(height: 16),
                _summaryTile(
                  'Verified incidents',
                  _countIncidents('verified'),
                  Colors.red,
                  const Color(0xFFFFF1F2),
                ),
                const SizedBox(height: 10),
                _summaryTile(
                  'Pending reports',
                  _countIncidents('pending'),
                  Colors.orange,
                  const Color(0xFFFFF9E9),
                ),
                const SizedBox(height: 15),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _showReportIncidentDialog,
                    icon: const Icon(Icons.add_alert_outlined),
                    label: const Text('Report an Incident'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: teal,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 13),
          if (incidents.isEmpty)
            _emptyState(
              Icons.shield_outlined,
              'No incidents reported',
              'There are no incident reports available for this place.',
            )
          else ...[
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 10),
              child: Text(
                'Community Incident Reports',
                style: TextStyle(
                  color: dark,
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            ...incidents.map(_incidentCard),
          ],
        ],
      ),
    );
  }

  Widget _incidentCard(dynamic incident) {
    final title =
        incident['title']?.toString() ?? 'Incident report';

    final detail =
        incident['description']?.toString() ??
            'No description available';

    final status =
        incident['status']?.toString() ?? 'Unknown';

    final severity =
        incident['severity']?.toString() ?? 'Not specified';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: dark,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            detail,
            style: const TextStyle(
              color: muted,
              fontSize: 13,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 7,
            children: [
              _smallLabel('Status: $status'),
              _smallLabel('Severity: $severity'),
            ],
          ),
        ],
      ),
    );
  }

  // ------------------------------------------------------------
  // REPORT INCIDENT
  // ------------------------------------------------------------

  Future<void> _showReportIncidentDialog() async {
    if (!await _isLoggedIn()) return;

    if (districtId == 0) {
      _message(
        'District ID is missing for this place. Cannot submit the report.',
      );
      return;
    }

    final titleController = TextEditingController();
    final descriptionController = TextEditingController();

    String severity = 'medium';
    String incidentType = 'Safety';

    bool submitting = false;

    await showDialog(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Report an Incident'),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: titleController,
                      decoration: const InputDecoration(
                        labelText: 'Incident title',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: descriptionController,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        labelText: 'Describe the incident',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: incidentType,
                      decoration: const InputDecoration(
                        labelText: 'Incident type',
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'Safety',
                          child: Text('Safety'),
                        ),
                        DropdownMenuItem(
                          value: 'Harassment',
                          child: Text('Harassment'),
                        ),
                        DropdownMenuItem(
                          value: 'Theft',
                          child: Text('Theft'),
                        ),
                        DropdownMenuItem(
                          value: 'Accident',
                          child: Text('Accident'),
                        ),
                        DropdownMenuItem(
                          value: 'Other',
                          child: Text('Other'),
                        ),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setDialogState(
                            () => incidentType = value,
                          );
                        }
                      },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: severity,
                      decoration: const InputDecoration(
                        labelText: 'Severity',
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'low',
                          child: Text('Low'),
                        ),
                        DropdownMenuItem(
                          value: 'medium',
                          child: Text('Medium'),
                        ),
                        DropdownMenuItem(
                          value: 'high',
                          child: Text('High'),
                        ),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setDialogState(
                            () => severity = value,
                          );
                        }
                      },
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: submitting
                      ? null
                      : () => Navigator.pop(dialogContext),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: submitting
                      ? null
                      : () async {
                          if (titleController.text.trim().isEmpty ||
                              descriptionController.text.trim().isEmpty) {
                            _message('Please complete all fields.');
                            return;
                          }

                          setDialogState(() => submitting = true);

                          try {
                            await PlaceService.addIncident(
                              placeId: placeId,
                              title: titleController.text.trim(),
                              description:
                                  descriptionController.text.trim(),
                              severity: severity,
                              incidentType: incidentType,
                              districtId: districtId,
                            );

                            if (!mounted) return;

                            Navigator.pop(dialogContext);

                            _message('Incident report submitted.');

                            await _loadPlaceData();
                          } catch (e) {
                            setDialogState(
                              () => submitting = false,
                            );

                            _message(e.toString());
                          }
                        },
                  child: submitting
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                          ),
                        )
                      : const Text('Submit Report'),
                ),
              ],
            );
          },
        );
      },
    );

    titleController.dispose();
    descriptionController.dispose();
  }

  // ------------------------------------------------------------
  // REVIEWS TAB
  // ------------------------------------------------------------

  Widget _buildReviewsTab() {
    return RefreshIndicator(
      onRefresh: _loadPlaceData,
      child: ListView(
        padding: const EdgeInsets.all(13),
        children: [
          _sectionCard(
            child: Row(
              children: [
                Expanded(
                  child: _sectionHeading(
                    Icons.star_outline,
                    'Community Reviews',
                    '${reviews.length} reviews shared by travelers',
                  ),
                ),
                IconButton(
                  onPressed: _showAddReviewDialog,
                  tooltip: 'Write a review',
                  icon: const Icon(
                    Icons.add_circle,
                    color: teal,
                    size: 29,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 13),
          if (reviews.isEmpty)
            _emptyState(
              Icons.rate_review_outlined,
              'No reviews yet',
              'Be the first to share your experience.',
            )
          else
            ...reviews.map(_reviewCard),
        ],
      ),
    );
  }

  Widget _reviewCard(dynamic review) {
    final rating = number(review['rating']) ?? 0;

    final comment =
        review['comment']?.toString() ?? '';

    final username =
        review['username']?.toString() ??
            review['user_name']?.toString() ??
            'Traveler';

    final reviewId =
        int.tryParse(review['id']?.toString() ?? '') ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const CircleAvatar(
                backgroundColor: Color(0xFFE0F5F0),
                child: Icon(Icons.person_outline, color: teal),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  username,
                  style: const TextStyle(
                    color: dark,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ),
              const Icon(
                Icons.star,
                color: Color(0xFFF5B400),
                size: 17,
              ),
              Text(
                rating.toStringAsFixed(1),
                style: const TextStyle(
                  color: dark,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (reviewId != 0)
                PopupMenuButton<String>(
                  onSelected: (value) {
                    if (value == 'delete') {
                      _deleteReview(reviewId);
                    }
                  },
                  itemBuilder: (_) => const [
                    PopupMenuItem(
                      value: 'delete',
                      child: Row(
                        children: [
                          Icon(
                            Icons.delete_outline,
                            color: Colors.red,
                          ),
                          SizedBox(width: 8),
                          Text('Delete review'),
                        ],
                      ),
                    ),
                  ],
                ),
            ],
          ),
          if (comment.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              comment,
              style: const TextStyle(
                color: muted,
                fontSize: 13,
                height: 1.6,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _showAddReviewDialog() async {
    if (!await _isLoggedIn()) return;

    final commentController = TextEditingController();

    int selectedRating = 5;
    bool submitting = false;

    await showDialog(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
              ),
              title: const Text('Write a Review'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Select your rating'),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<int>(
                    value: selectedRating,
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                    ),
                    items: List.generate(
                      5,
                      (index) => DropdownMenuItem(
                        value: index + 1,
                        child: Text('${index + 1} Stars'),
                      ),
                    ),
                    onChanged: (value) {
                      if (value != null) {
                        setDialogState(
                          () => selectedRating = value,
                        );
                      }
                    },
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: commentController,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      hintText: 'Share your experience...',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: submitting
                      ? null
                      : () => Navigator.pop(dialogContext),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: submitting
                      ? null
                      : () async {
                          if (commentController.text.trim().isEmpty) {
                            _message('Please write your review.');
                            return;
                          }

                          setDialogState(() => submitting = true);

                          try {
                            await PlaceService.addReview(
                              placeId: placeId,
                              rating: selectedRating,
                              comment: commentController.text.trim(),
                            );

                            if (!mounted) return;

                            Navigator.pop(dialogContext);

                            _message('Review submitted successfully.');

                            await _loadPlaceData();
                          } catch (e) {
                            setDialogState(
                              () => submitting = false,
                            );

                            _message(e.toString());
                          }
                        },
                  child: submitting
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                          ),
                        )
                      : const Text('Submit'),
                ),
              ],
            );
          },
        );
      },
    );

    commentController.dispose();
  }

  Future<void> _deleteReview(int reviewId) async {
    if (!await _isLoggedIn()) return;

    final confirmed = await _confirmDelete(
      'Delete Review',
      'Are you sure you want to delete this review?',
    );

    if (!confirmed) return;

    try {
      await PlaceService.deleteReview(reviewId);

      _message('Review deleted.');

      await _loadPlaceData();
    } catch (e) {
      _message(e.toString());
    }
  }

  // ------------------------------------------------------------
  // PHOTOS TAB
  // ------------------------------------------------------------

  Widget _buildPhotosTab() {
    return RefreshIndicator(
      onRefresh: _loadPlaceData,
      child: ListView(
        padding: const EdgeInsets.all(13),
        children: [
          _sectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _sectionHeading(
                  Icons.photo_library_outlined,
                  'Destination Photos',
                  'Photos available for $placeName',
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: isUploading ? null : _uploadPhoto,
                    icon: const Icon(Icons.add_a_photo_outlined),
                    label: const Text('Upload a Photo'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: teal,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 13),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 13),
          if (photos.isEmpty)
            _emptyState(
              Icons.photo_library_outlined,
              'No destination photos available',
              'Upload the first community photo for this place.',
            )
          else
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: photos.length,
              gridDelegate:
                  const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 1,
              ),
              itemBuilder: (context, index) {
                final photo = photos[index];

                final url = resolveImageUrl(
                  photo['image_url'] ?? photo['image'],
                );

                final photoId =
                    int.tryParse(photo['id']?.toString() ?? '') ?? 0;

                return ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      url.isEmpty
                          ? _imagePlaceholder()
                          : Image.network(
                              url,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) =>
                                  _imagePlaceholder(),
                            ),
                      if (photoId != 0)
                        Positioned(
                          top: 5,
                          right: 5,
                          child: Material(
                            color: Colors.black54,
                            borderRadius: BorderRadius.circular(30),
                            child: IconButton(
                              icon: const Icon(
                                Icons.delete_outline,
                                color: Colors.white,
                                size: 20,
                              ),
                              onPressed: () => _deletePhoto(photoId),
                              tooltip: 'Delete photo',
                            ),
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  Future<void> _uploadPhoto() async {
    if (!await _isLoggedIn()) return;

    try {
      final XFile? selectedImage =
          await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 80,
      );

      if (selectedImage == null) return;

      final captionController = TextEditingController();

      final caption = await showDialog<String>(
        context: context,
        builder: (dialogContext) {
          return AlertDialog(
            title: const Text('Photo Caption'),
            content: TextField(
              controller: captionController,
              maxLines: 2,
              decoration: const InputDecoration(
                hintText: 'Write a caption (optional)',
                border: OutlineInputBorder(),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: () => Navigator.pop(
                  dialogContext,
                  captionController.text.trim(),
                ),
                child: const Text('Continue'),
              ),
            ],
          );
        },
      );

      captionController.dispose();

      if (caption == null) return;

      setState(() => isUploading = true);

      await PlaceService.uploadPhoto(
        placeId: placeId,
        image: File(selectedImage.path),
        caption: caption,
      );

      if (!mounted) return;

      setState(() => isUploading = false);

      _message('Photo uploaded successfully.');

      await _loadPlaceData();
    } catch (e) {
      if (!mounted) return;

      setState(() => isUploading = false);

      _message(e.toString());
    }
  }

  Future<void> _deletePhoto(int photoId) async {
    if (!await _isLoggedIn()) return;

    final confirmed = await _confirmDelete(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
    );

    if (!confirmed) return;

    try {
      await PlaceService.deletePhoto(photoId);

      _message('Photo deleted.');

      await _loadPlaceData();
    } catch (e) {
      _message(e.toString());
    }
  }

  // ------------------------------------------------------------
  // COMMON DIALOG
  // ------------------------------------------------------------

  Future<bool> _confirmDelete(
    String title,
    String message,
  ) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: Text(title),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
              ),
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('Delete'),
            ),
          ],
        );
      },
    );

    return result ?? false;
  }

  // ------------------------------------------------------------
  // REUSABLE DESIGN COMPONENTS
  // ------------------------------------------------------------

  Widget _sectionCard({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: child,
    );
  }

  Widget _sectionHeading(
    IconData icon,
    String title,
    String subtitle,
  ) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          height: 43,
          width: 43,
          decoration: BoxDecoration(
            color: const Color(0xFFE9FAF6),
            borderRadius: BorderRadius.circular(13),
          ),
          child: Icon(icon, color: teal, size: 23),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: dark,
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: const TextStyle(
                  color: muted,
                  fontSize: 11,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _detailRow(
    IconData icon,
    String title,
    String value,
  ) {
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: const Color(0xFFFAFCFD),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: teal, size: 19),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: dark,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    color: muted,
                    fontSize: 12,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _summaryTile(
    String title,
    int count,
    Color color,
    Color backgroundColor,
  ) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(13),
        border: Border.all(color: color.withOpacity(0.12)),
      ),
      child: Row(
        children: [
          Icon(
            Icons.warning_amber_rounded,
            color: color,
            size: 20,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                color: dark,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Text(
            count.toString(),
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w900,
              fontSize: 17,
            ),
          ),
        ],
      ),
    );
  }

  Widget _actionRow(
    String title,
    IconData icon,
    VoidCallback onTap,
  ) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon, color: teal),
      title: Text(
        title,
        style: const TextStyle(
          color: dark,
          fontSize: 13,
          fontWeight: FontWeight.w600,
        ),
      ),
      trailing: const Icon(
        Icons.chevron_right,
        color: muted,
      ),
      onTap: onTap,
    );
  }

  Widget _smallLabel(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 9,
        vertical: 6,
      ),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: muted,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _emptyState(
    IconData icon,
    String title,
    String message,
  ) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
        horizontal: 20,
        vertical: 32,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(17),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        children: [
          Icon(
            icon,
            size: 43,
            color: Colors.blueGrey.shade300,
          ),
          const SizedBox(height: 12),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: dark,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: muted,
              fontSize: 12,
              height: 1.5,
            ),
          ),
        ],
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
            const Icon(
              Icons.cloud_off_outlined,
              size: 48,
              color: Colors.blueGrey,
            ),
            const SizedBox(height: 12),
            Text(
              errorMessage ?? 'Unable to load place information.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: muted),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadPlaceData,
              child: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }
}
