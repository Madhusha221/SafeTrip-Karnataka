
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../services/auth_service.dart';
import 'place_details_screen.dart';

class PlacesScreen extends StatefulWidget {
  final String selectedDistrict;

  const PlacesScreen({
    Key? key,
    this.selectedDistrict = 'All',
  }) : super(key: key);

  @override
  State<PlacesScreen> createState() => _PlacesScreenState();
}

class _PlacesScreenState extends State<PlacesScreen> {
  List<Map<String, dynamic>> allPlaces = [];
  List<Map<String, dynamic>> places = [];

  List<String> categories = ['All'];

  Map<String, String> photoUrlsByPlaceId = {};
  Map<String, String> wikimediaImageUrlsByPlaceId = {};

  String selectedCategory = 'All';

  bool isLoading = true;
  String? errorMessage;

  final Set<String> favorites = {};

  @override
  void initState() {
    super.initState();
    fetchPlaces();
  }

  // Backend server URL
  String get serverUrl {
    final uri = Uri.parse(AuthService.baseUrl);
    return '${uri.scheme}://${uri.authority}';
  }

  // Convert relative image paths into complete URLs
  String makeImageUrl(String imagePath) {
    final path = imagePath.trim();

    if (path.isEmpty || path == 'null') {
      return '';
    }

    final uri = Uri.tryParse(path);

    if (uri != null && uri.hasScheme) {
      return path;
    }

    if (path.startsWith('/')) {
      return '$serverUrl$path';
    }

    return '$serverUrl/$path';
  }

  // Fetch photos separately from the PlacePhoto API
  Future<void> fetchPlacePhotos() async {
    final uri = Uri.parse(
      '${AuthService.baseUrl}/place-photos/',
    );

    final response = await http
        .get(uri)
        .timeout(const Duration(seconds: 15));

    if (response.statusCode != 200) {
      throw Exception(
        'Failed to load place photos: ${response.statusCode}',
      );
    }

    final decoded = jsonDecode(response.body);

    final List<dynamic> photoList = decoded is List
        ? decoded
        : decoded is Map && decoded['results'] is List
            ? decoded['results']
            : [];

    final Map<String, String> photoMap = {};

    for (final item in photoList) {
      final photo = Map<String, dynamic>.from(item);

      final placeId = photo['place']?.toString();

      final rawImage = photo['image_url'] ??
          photo['image'] ??
          '';

      final imageUrl = makeImageUrl(
        rawImage.toString(),
      );

      if (placeId != null &&
          placeId.isNotEmpty &&
          imageUrl.isNotEmpty) {
        photoMap.putIfAbsent(placeId, () => imageUrl);
      }
    }

    photoUrlsByPlaceId = photoMap;
  }

  String getDistrictName(Map<String, dynamic> place) {
    final district = place['district'];
    if (place['district_name'] != null &&
        place['district_name'].toString().trim().isNotEmpty) {
      return place['district_name'].toString().trim();
    }
    if (district is Map) return district['name']?.toString() ?? '';
    return district?.toString() ?? widget.selectedDistrict;
  }

  // Uses the same Wikimedia Commons search and title matching as the website.
  Future<String> searchWikimediaImage(
    Map<String, dynamic> place,
  ) async {
    final name = place['name']?.toString().trim() ?? '';
    if (name.isEmpty) return '';

    final district = getDistrictName(place);
    final params = <String, String>{
      'action': 'query',
      'generator': 'search',
      'gsrsearch': '"$name" ${district.isNotEmpty ? district : 'Karnataka'} Karnataka',
      'gsrnamespace': '6',
      'gsrlimit': '5',
      'prop': 'imageinfo',
      'iiprop': 'url',
      'iiurlwidth': '800',
      'format': 'json',
      'origin': '*',
    };

    try {
      final uri = Uri.https(
        'commons.wikimedia.org',
        '/w/api.php',
        params,
      );
      final response = await http
          .get(uri, headers: {'Accept': 'application/json'})
          .timeout(const Duration(seconds: 8));
      if (response.statusCode != 200) return '';

      final result = jsonDecode(response.body);
      final query = result is Map ? result['query'] : null;
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
        final imageInfo = pageValue['imageinfo'];
        if (nameWords.isNotEmpty &&
            nameWords.any((word) => title.contains(word)) &&
            imageInfo is List && imageInfo.isNotEmpty &&
            imageInfo.first is Map) {
          final info = imageInfo.first as Map;
          final image = info['thumburl'] ?? info['url'];
          if (image != null && image.toString().trim().isNotEmpty) {
            return image.toString();
          }
        }
      }
    } catch (_) {
      // Keep the existing placeholder if Wikimedia is unavailable.
    }
    return '';
  }

  Future<void> loadMissingWikimediaImages(
    List<Map<String, dynamic>> loadedPlaces,
  ) async {
    final missing = loadedPlaces.where((place) {
      final id = (place['id'] ?? place['external_place_id'])?.toString() ?? '';
      return id.isNotEmpty && getImageUrl(place).isEmpty;
    }).toList();

    // Limit concurrency so a large district list does not overwhelm the API.
    for (var start = 0; start < missing.length; start += 4) {
      final batch = missing.skip(start).take(4).toList();
      final results = await Future.wait(batch.map((place) async {
        final id = (place['id'] ?? place['external_place_id']).toString();
        final image = await searchWikimediaImage(place);
        return MapEntry(id, image);
      }));
      for (final result in results) {
        if (result.value.isNotEmpty) {
          wikimediaImageUrlsByPlaceId[result.key] = result.value;
        }
      }
    }
  }

  // Fetch places from the selected district.
  // When district is All, fetch all Karnataka places.
  Future<void> fetchPlaces() async {
    if (!mounted) return;

    setState(() {
      isLoading = true;
      errorMessage = null;
    });

    try {
      final baseUri = Uri.parse(
        '${AuthService.baseUrl}/places/',
      );

      final bool showAll =
          widget.selectedDistrict.trim().toLowerCase() == 'all';

      final firstUri = showAll
          ? baseUri
          : baseUri.replace(
              queryParameters: {
                'district': widget.selectedDistrict,
              },
            );

      final List<Map<String, dynamic>> loadedPlaces = [];

      Uri? nextUri = firstUri;

      // Support Django REST Framework pagination.
      while (nextUri != null) {
        final response = await http
            .get(nextUri)
            .timeout(const Duration(seconds: 20));

        if (response.statusCode != 200) {
          throw Exception(
            'Places API failed: ${response.statusCode}',
          );
        }

        final decoded = jsonDecode(response.body);

        if (decoded is List) {
          loadedPlaces.addAll(
            decoded.map(
              (item) => Map<String, dynamic>.from(item),
            ),
          );

          nextUri = null;
        } else if (decoded is Map &&
            decoded['results'] is List) {
          loadedPlaces.addAll(
            (decoded['results'] as List).map(
              (item) => Map<String, dynamic>.from(item),
            ),
          );

          final next = decoded['next'];

          if (next != null &&
              next.toString().isNotEmpty) {
            nextUri = Uri.tryParse(next.toString());
          } else {
            nextUri = null;
          }
        } else {
          throw Exception(
            'Unexpected places response',
          );
        }
      }

      // Load separate photos, then search Wikimedia for places still without photos.
      await fetchPlacePhotos();
      await loadMissingWikimediaImages(loadedPlaces);

      // Get categories from all loaded places
      final availableCategories = loadedPlaces
          .map(
            (place) =>
                place['category']?.toString() ?? '',
          )
          .where((category) => category.isNotEmpty)
          .toSet()
          .toList()
        ..sort();

      if (!mounted) return;

      setState(() {
        allPlaces = loadedPlaces;

        categories = [
          'All',
          ...availableCategories,
        ];

        applyCategoryFilter();

        isLoading = false;
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        errorMessage = error.toString();
        isLoading = false;
      });
    }
  }

  // Apply category filter locally
  void applyCategoryFilter() {
    if (selectedCategory == 'All') {
      places = List.from(allPlaces);
    } else {
      places = allPlaces.where((place) {
        return place['category']?.toString() ==
            selectedCategory;
      }).toList();
    }
  }

  // Get image URL from the place record, uploaded photos, or PlacePhoto API.
  String getImageUrl(Map<String, dynamic> place) {
    String readImage(dynamic value) {
      if (value is Map) {
        value = value['image_url'] ??
            value['image'] ??
            value['photo_url'] ??
            value['photo'];
      }

      if (value == null) return '';

      return makeImageUrl(value.toString());
    }

    // Check each direct field separately so an empty field does not
    // prevent the next available image field from being checked.
    for (final key in [
      'image_url',
      'image',
      'photo_url',
      'photo',
    ]) {
      final url = readImage(place[key]);
      if (url.isNotEmpty) return url;
    }

    // Some API responses provide additional images in uploaded_photos.
    final uploadedPhotos = place['uploaded_photos'];
    if (uploadedPhotos is List) {
      for (final photo in uploadedPhotos) {
        final url = readImage(photo);
        if (url.isNotEmpty) return url;
      }
    }

    final commons = (place['wikimedia_commons'] ??
            place['wikimedia_image'])
        ?.toString()
        .trim() ?? '';
    if (commons.startsWith('http://') || commons.startsWith('https://')) {
      return commons;
    }
    if (commons.startsWith('File:')) {
      return 'https://commons.wikimedia.org/wiki/Special:FilePath/${Uri.encodeComponent(commons.substring(5))}';
    }

    final placeId = (place['id'] ?? place['external_place_id'])?.toString() ?? '';
    return photoUrlsByPlaceId[placeId] ??
        wikimediaImageUrlsByPlaceId[placeId] ?? '';
  }

  String getPlaceName(Map<String, dynamic> place) {
    return (
      place['name'] ?? 'Unknown Place'
    ).toString();
  }

  String getPlaceDescription(
    Map<String, dynamic> place,
  ) {
    return (
      place['description'] ??
      'Tourist destination discovered from OpenStreetMap.'
    ).toString();
  }

  String getPlaceId(Map<String, dynamic> place) {
    return (
      place['id'] ?? place['name'] ?? ''
    ).toString();
  }

  void toggleFavorite(Map<String, dynamic> place) {
    final id = getPlaceId(place);

    setState(() {
      if (favorites.contains(id)) {
        favorites.remove(id);
      } else {
        favorites.add(id);
      }
    });
  }

  // Image placeholder
  Widget imagePlaceholder() {
    return Container(
      color: const Color(0xFFE2E8F0),
      child: const Center(
        child: Icon(
          Icons.image_outlined,
          size: 45,
          color: Colors.grey,
        ),
      ),
    );
  }

  // Place card
  Widget buildPlaceCard(
    Map<String, dynamic> place,
  ) {
    final imageUrl = getImageUrl(place);

    final isFavorite = favorites.contains(
      getPlaceId(place),
    );

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => PlaceDetailsScreen(
              place: place,
            ),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: const Color(0xFFE5E7EB),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                SizedBox(
                  height: 190,
                  width: double.infinity,
                  child: imageUrl.isNotEmpty
                      ? Image.network(
                          imageUrl,
                          fit: BoxFit.cover,
                          loadingBuilder: (
                            context,
                            child,
                            loadingProgress,
                          ) {
                            if (loadingProgress == null) {
                              return child;
                            }

                            return const Center(
                              child:
                                  CircularProgressIndicator(),
                            );
                          },
                          errorBuilder: (
                            context,
                            error,
                            stackTrace,
                          ) {
                            return imagePlaceholder();
                          },
                        )
                      : imagePlaceholder(),
                ),

                // Favorite button
                Positioned(
                  top: 12,
                  right: 12,
                  child: GestureDetector(
                    onTap: () => toggleFavorite(place),
                    child: CircleAvatar(
                      backgroundColor: Colors.white,
                      child: Icon(
                        isFavorite
                            ? Icons.favorite
                            : Icons.favorite_border,
                        color: isFavorite
                            ? Colors.red
                            : Colors.grey,
                      ),
                    ),
                  ),
                ),

                // Category
                Positioned(
                  bottom: 12,
                  left: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      place['category']?.toString() ??
                          'Place',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
            ),

            // Place information
            Padding(
              padding: const EdgeInsets.all(15),
              child: Column(
                crossAxisAlignment:
                    CrossAxisAlignment.start,
                children: [
                  Text(
                    getPlaceName(place),
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF172033),
                    ),
                  ),

                  const SizedBox(height: 8),

                  Text(
                    getPlaceDescription(place),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13,
                      height: 1.5,
                      color: Color(0xFF64748B),
                    ),
                  ),

                  const SizedBox(height: 12),

                  Row(
                    children: [
                      const Icon(
                        Icons.location_on_outlined,
                        size: 16,
                        color: Colors.grey,
                      ),

                      const SizedBox(width: 4),

                      Expanded(
                        child: Text(
                          (
                            place['address'] ??
                            place['district_name'] ??
                            (widget.selectedDistrict == 'All'
                                ? 'Karnataka'
                                : widget.selectedDistrict)
                          ).toString(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Colors.grey,
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 12),

                  Row(
                    children: [
                      const Icon(
                        Icons.star,
                        color: Colors.amber,
                        size: 17,
                      ),

                      const SizedBox(width: 4),

                      Text(
                        place['rating']?.toString() ??
                            'N/A',
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                        ),
                      ),

                      const SizedBox(width: 12),

                      const Icon(
                        Icons.shield_outlined,
                        color: Color(0xFF10B981),
                        size: 17,
                      ),

                      const SizedBox(width: 4),

                      Text(
                        'Safety: ${place['safety_index'] ?? 'N/A'}',
                        style: const TextStyle(
                          color: Color(0xFF059669),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool showAll =
        widget.selectedDistrict.trim().toLowerCase() == 'all';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),

      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,

        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios,
            color: Colors.black,
          ),
          onPressed: () => Navigator.pop(context),
        ),

        title: Text(
          showAll
              ? 'Places to Visit in Karnataka'
              : 'Places to Visit in ${widget.selectedDistrict}',
          style: const TextStyle(
            color: Color(0xFF172033),
            fontSize: 17,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),

      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              16,
              18,
              16,
              12,
            ),
            child: Column(
              crossAxisAlignment:
                  CrossAxisAlignment.start,
              children: [
                const Text(
                  'Discover tourist destinations across Karnataka',
                  style: TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 13,
                  ),
                ),

                const SizedBox(height: 12),

                Text(
                  '${places.length} places found',
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),

          // Category filters
          if (!isLoading && categories.length > 1)
            SizedBox(
              height: 48,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                ),
                children: categories.map((category) {
                  final selected =
                      selectedCategory == category;

                  return Padding(
                    padding: const EdgeInsets.only(
                      right: 8,
                    ),
                    child: ChoiceChip(
                      label: Text(category),
                      selected: selected,

                      onSelected: (_) {
                        setState(() {
                          selectedCategory = category;
                          applyCategoryFilter();
                        });
                      },

                      selectedColor:
                          const Color(0xFFDCFCE7),

                      labelStyle: TextStyle(
                        color: selected
                            ? const Color(0xFF047857)
                            : Colors.black87,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),

          const SizedBox(height: 8),

          Expanded(
            child: isLoading
                ? const Center(
                    child: CircularProgressIndicator(),
                  )

                : errorMessage != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.error_outline,
                                size: 45,
                                color: Colors.redAccent,
                              ),

                              const SizedBox(height: 12),

                              Text(
                                errorMessage!,
                                textAlign: TextAlign.center,
                              ),

                              const SizedBox(height: 16),

                              ElevatedButton(
                                onPressed: fetchPlaces,
                                child: const Text('Retry'),
                              ),
                            ],
                          ),
                        ),
                      )

                    : places.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.location_off_outlined,
                                  size: 50,
                                  color: Colors.grey,
                                ),

                                const SizedBox(height: 12),

                                Text(
                                  selectedCategory == 'All'
                                      ? showAll
                                          ? 'No places found in Karnataka'
                                          : 'No places found in ${widget.selectedDistrict}'
                                      : 'No $selectedCategory places found',
                                ),

                                TextButton(
                                  onPressed: () {
                                    setState(() {
                                      selectedCategory = 'All';
                                      applyCategoryFilter();
                                    });
                                  },
                                  child: const Text(
                                    'Show all places',
                                  ),
                                ),
                              ],
                            ),
                          )

                        : RefreshIndicator(
                            onRefresh: fetchPlaces,
                            child: ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: places.length,
                              itemBuilder: (context, index) {
                                return buildPlaceCard(
                                  places[index],
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}
