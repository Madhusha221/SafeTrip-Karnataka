import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

import '../services/auth_service.dart';

/// SafeTrip Karnataka route planner.
///
/// Uses the existing Django endpoint: /routes/safety-eval/
/// Loads the same public /incidents/ collection used by the website route map.
/// Place search and reverse geocoding use OpenStreetMap Nominatim.
class RouteMapScreen extends StatefulWidget {
  final Map<String, dynamic>? initialPlace;

  const RouteMapScreen({super.key, this.initialPlace});

  @override
  State<RouteMapScreen> createState() => _RouteMapScreenState();
}

class _RouteMapScreenState extends State<RouteMapScreen> {
  static const Color _teal = Color(0xFF078F87);
  static const Color _tealDark = Color(0xFF06776F);
  static const Color _ink = Color(0xFF17243B);
  static const Color _muted = Color(0xFF70819A);
  static const Color _page = Color(0xFFF5F8FC);
  static const LatLng _defaultCenter = LatLng(12.5, 76.5);

  final MapController _mapController = MapController();
  final TextEditingController _originController = TextEditingController();
  final TextEditingController _destinationController =
      TextEditingController();
  final TextEditingController _searchController = TextEditingController();

  bool _loadingRoutes = false;
  bool _loadingIncidents = false;
  bool _searching = false;
  bool _locating = false;
  bool _isNavigating = false;
  bool _showHotTiles = false;
  bool _showIncidents = true;

  String _travelMode = 'car';
  String _activeSafetyTab = 'Reports';

  String? _routeError;
  String? _placeError;
  String? _incidentError;

  List<Map<String, dynamic>> _routes = [];
  int _selectedRoute = 0;

  List<Map<String, dynamic>> _incidents = [];
  List<Map<String, dynamic>> _searchResults = [];

  LatLng? _originPoint;
  LatLng? _destinationPoint;
  LatLng? _currentPosition;
  LatLng? _clickedPoint;

  Map<String, dynamic>? _selectedPlace;
  Map<String, dynamic>? _selectedIncident;

  StreamSubscription<Position>? _positionSubscription;

  Map<String, dynamic>? get _currentRoute =>
      _routes.isNotEmpty && _selectedRoute < _routes.length
          ? _routes[_selectedRoute]
          : null;

  String get _apiBase {
    final value = AuthService.baseUrl.toString().trim();

    return value.endsWith('/')
        ? value.substring(0, value.length - 1)
        : value;
  }

  List<LatLng> _coordinatesFor(Map<String, dynamic>? route) {
    if (route == null) return [];

    dynamic raw;

    final geometry = route['geometry'];
    final geojson = route['geojson'];

    if (geometry is Map && geometry['coordinates'] != null) {
      raw = geometry['coordinates'];
    } else if (geojson is Map && geojson['coordinates'] != null) {
      raw = geojson['coordinates'];
    } else {
      raw = route['coordinates'];
    }

    if (raw is! List) return [];

    final points = <LatLng>[];

    for (final item in raw) {
      if (item is! List || item.length < 2) continue;

      final first = _asDouble(item[0]);
      final second = _asDouble(item[1]);

      if (first == null || second == null) continue;

      // The Django website API returns GeoJSON coordinates:
      // [longitude, latitude].
      final lat = second;
      final lon = first;

      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        points.add(LatLng(lat, lon));
      }
    }

    return points;
  }

  double? _asDouble(dynamic value) {
    if (value is num) return value.toDouble();

    return double.tryParse(value?.toString() ?? '');
  }

  @override
  void initState() {
    super.initState();

    _loadIncidents();

    final place = widget.initialPlace;

    if (place != null) {
      final name = (place['name'] ?? '').toString();
      final address = (place['address'] ?? '').toString();

      final destination = name.isNotEmpty ? name : address;

      _destinationController.text = destination;

      _selectedPlace = Map<String, dynamic>.from(place);

      // Coordinates are optional. Resolve the destination by name/address
      // through Nominatim when the supplied object has no usable coordinates.
      final lat = _asDouble(place['latitude'] ?? place['lat']);

      final lon = _asDouble(
        place['longitude'] ?? place['lng'] ?? place['lon'],
      );

      if (lat != null &&
          lon != null &&
          lat.abs() <= 90 &&
          lon.abs() <= 180) {
        _destinationPoint = LatLng(lat, lon);
        _clickedPoint = _destinationPoint;
      } else if (destination.isNotEmpty) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _resolveInitialDestination(destination, address);
        });
      }
    }
  }

  @override
  void dispose() {
    _positionSubscription?.cancel();

    _originController.dispose();
    _destinationController.dispose();
    _searchController.dispose();

    _mapController.dispose();

    super.dispose();
  }

  Future<void> _resolveInitialDestination(
    String name,
    String address,
  ) async {
    final query = address.isNotEmpty ? '$name, $address' : name;

    await _searchNominatim(
      query,
      selectAsDestination: true,
      quiet: true,
    );
  }

  Future<void> _loadRoutes() async {
    final origin = _originController.text.trim();
    final destination = _destinationController.text.trim();

    if (origin.isEmpty || destination.isEmpty) {
      setState(() {
        _routeError =
            'Enter both a starting point and destination.';
      });
      return;
    }

    if (_travelMode != 'car') {
      setState(() {
        _routeError =
            'The current Django route service supports driving routes only. Choose Car to request a route.';
      });
      return;
    }

    setState(() {
      _loadingRoutes = true;
      _routeError = null;
      _routes = [];
      _selectedRoute = 0;
      _isNavigating = false;
    });

    try {
      final uri = Uri.parse(
        '$_apiBase/routes/safety-eval/',
      ).replace(
        queryParameters: {
          'from': origin,
          'to': destination,
          if (_destinationPoint != null)
            'destination_lat':
                _destinationPoint!.latitude.toString(),
          if (_destinationPoint != null)
            'destination_lon':
                _destinationPoint!.longitude.toString(),
        },
      );

      final response = await http
          .get(uri)
          .timeout(const Duration(seconds: 35));

      if (response.statusCode < 200 ||
          response.statusCode >= 300) {
        final responseBody = response.body.trim();
        final detail = responseBody.isEmpty
            ? ''
            : ' Response: ${responseBody.length > 300 ? responseBody.substring(0, 300) : responseBody}';

        throw Exception(
          'Route request failed with HTTP ${response.statusCode} at $uri.$detail',
        );
      }

      final decoded = jsonDecode(response.body);

      if (decoded is! Map<String, dynamic>) {
        throw Exception(
          'Unexpected response from the route service.',
        );
      }

      if (decoded['success'] == false) {
        throw Exception(
          decoded['error']?.toString() ??
              'The route service could not find a route.',
        );
      }

      final rawRoutes = decoded['routes'];

      if (rawRoutes is! List) {
        throw Exception(
          'The route service response did not contain a routes list.',
        );
      }

      final valid = rawRoutes
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .where((item) => _coordinatesFor(item).length >= 2)
          .toList();

      if (valid.isEmpty) {
        throw Exception(
          'No route with valid map coordinates was returned.',
        );
      }

      if (!mounted) return;

      setState(() {
        _routes = valid;
        _selectedRoute = 0;

        _originPoint ??= _coordinatesFor(valid.first).first;

        _destinationPoint ??= _coordinatesFor(valid.first).last;
      });

      _fitRoute(_coordinatesFor(valid.first));
    } catch (error) {
      if (mounted) {
        setState(() {
          _routeError = error
              .toString()
              .replaceFirst('Exception: ', '');
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _loadingRoutes = false;
        });
      }
    }
  }

  Future<void> _loadIncidents() async {
    setState(() {
      _loadingIncidents = true;
      _incidentError = null;
    });

    try {
      // The website uses GET /incidents/ for all reports.
      // Do not fabricate incident locations.
      final uri = Uri.parse('$_apiBase/incidents/');

      final response = await http
          .get(uri)
          .timeout(const Duration(seconds: 25));

      if (response.statusCode < 200 ||
          response.statusCode >= 300) {
        throw Exception(
          'Incident service returned HTTP ${response.statusCode}.',
        );
      }

      final decoded = jsonDecode(response.body);

      dynamic list = decoded;

      if (decoded is Map) {
        list = decoded['results'] ??
            decoded['incidents'] ??
            decoded['data'];
      }

      if (list is! List) {
        throw Exception(
          'Unexpected incident response format.',
        );
      }

      final incidents = list
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .where((item) => _incidentCoordinates(item) != null)
          .toList();

      if (!mounted) return;

      setState(() {
        _incidents = incidents;
      });
    } catch (error) {
      if (mounted) {
        setState(() {
          _incidentError = error
              .toString()
              .replaceFirst('Exception: ', '');
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _loadingIncidents = false;
        });
      }
    }
  }

  LatLng? _incidentCoordinates(Map<String, dynamic> incident) {
    final location = incident['location'];

    final lat = _asDouble(
      incident['latitude'] ??
          incident['lat'] ??
          (location is Map ? location['latitude'] : null),
    );

    final lon = _asDouble(
      incident['longitude'] ??
          incident['lng'] ??
          incident['lon'] ??
          (location is Map ? location['longitude'] : null) ??
          (location is Map ? location['lng'] : null),
    );

    if (lat == null || lon == null) return null;

    if (lat.abs() > 90 || lon.abs() > 180) return null;

    return LatLng(lat, lon);
  }

  Future<void> _searchNominatim(
    String query, {
    bool selectAsDestination = false,
    bool quiet = false,
  }) async {
    if (query.trim().isEmpty) return;

    if (mounted) {
      setState(() {
        _searching = true;
        _placeError = null;
      });
    }

    try {
      final uri = Uri.https(
        'nominatim.openstreetmap.org',
        '/search',
        {
          'format': 'jsonv2',
          'limit': '6',
          'addressdetails': '1',
          'q': query.trim(),
        },
      );

      final response = await http.get(
        uri,
        headers: const {
          'Accept': 'application/json',
          'User-Agent': 'SafeTripKarnatakaMobile/1.0',
        },
      ).timeout(const Duration(seconds: 20));

      if (response.statusCode != 200) {
        throw Exception(
          'Place search returned HTTP ${response.statusCode}.',
        );
      }

      final decoded = jsonDecode(response.body);

      if (decoded is! List) {
        throw Exception('Unexpected place search response.');
      }

      final results = decoded
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();

      if (!mounted) return;

      setState(() {
        _searchResults = results;
      });

      if (results.isEmpty) {
        if (!quiet) {
          setState(() {
            _placeError = 'No matching places found.';
          });
        }
        return;
      }

      if (selectAsDestination) {
        _selectSearchResult(results.first, asDestination: true);
      }
    } catch (error) {
      if (mounted && !quiet) {
        setState(() {
          _placeError = error
              .toString()
              .replaceFirst('Exception: ', '');
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _searching = false;
        });
      }
    }
  }

  void _selectSearchResult(
    Map<String, dynamic> result, {
    bool asDestination = false,
  }) {
    final lat = _asDouble(result['lat']);
    final lon = _asDouble(result['lon']);

    if (lat == null || lon == null) return;

    final point = LatLng(lat, lon);

    final displayName =
        (result['display_name'] ?? 'Selected location').toString();

    setState(() {
      _clickedPoint = point;
      _searchResults = [];

      if (asDestination) {
        _destinationPoint = point;
        _destinationController.text = displayName;
        _selectedPlace = result;
      } else {
        _destinationPoint = point;
        _destinationController.text = displayName;
        _selectedPlace = result;
      }

      _placeError = null;
    });

    _mapController.move(point, 14);
  }

  Future<void> _reverseGeocode(LatLng point) async {
    try {
      final uri = Uri.https(
        'nominatim.openstreetmap.org',
        '/reverse',
        {
          'format': 'jsonv2',
          'lat': point.latitude.toString(),
          'lon': point.longitude.toString(),
        },
      );

      final response = await http.get(
        uri,
        headers: const {
          'Accept': 'application/json',
          'User-Agent': 'SafeTripKarnatakaMobile/1.0',
        },
      ).timeout(const Duration(seconds: 20));

      if (response.statusCode != 200) return;

      final decoded = jsonDecode(response.body);

      if (decoded is! Map) return;

      final address =
          (decoded['display_name'] ?? '').toString();

      if (!mounted) return;

      setState(() {
        _destinationPoint = point;
        _destinationController.text = address.isNotEmpty
            ? address
            : '${point.latitude}, ${point.longitude}';

        _selectedPlace =
            Map<String, dynamic>.from(decoded);
      });
    } catch (_) {
      if (!mounted) return;

      setState(() {
        _destinationPoint = point;
        _destinationController.text =
            '${point.latitude}, ${point.longitude}';
      });
    }
  }

  void _fitRoute(List<LatLng> points) {
    if (points.length < 2) return;

    final bounds = LatLngBounds.fromPoints(points);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;

      _mapController.fitCamera(
        CameraFit.bounds(
          bounds: bounds,
          padding: const EdgeInsets.all(48),
        ),
      );
    });
  }

  Future<void> _useCurrentLocation({
    bool setAsOrigin = true,
  }) async {
    setState(() {
      _locating = true;
    });

    try {
      final serviceEnabled =
          await Geolocator.isLocationServiceEnabled();

      if (!serviceEnabled) {
        throw Exception(
          'Location services are disabled. Enable GPS and try again.',
        );
      }

      var permission = await Geolocator.checkPermission();

      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied) {
        throw Exception('Location permission was denied.');
      }

      if (permission == LocationPermission.deniedForever) {
        throw Exception(
          'Location permission is permanently denied. Enable it in app settings.',
        );
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );

      final point = LatLng(
        position.latitude,
        position.longitude,
      );

      if (!mounted) return;

      setState(() {
        _currentPosition = point;

        if (setAsOrigin) {
          _originPoint = point;
          _originController.text = 'My current location';
        } else {
          _destinationPoint = point;
          _destinationController.text = 'My current location';
        }

        _placeError = null;
      });

      _mapController.move(point, 15);
    } catch (error) {
      if (mounted) {
        _showMessage(
          error.toString().replaceFirst('Exception: ', ''),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _locating = false;
        });
      }
    }
  }

  Future<void> _startNavigation() async {
    if (_currentRoute == null) {
      _showMessage('Find a route before starting navigation.');
      return;
    }

    final points = _coordinatesFor(_currentRoute);

    if (points.length < 2) {
      _showMessage('This route has no usable navigation geometry.');
      return;
    }

    await _useCurrentLocation();

    if (!mounted || _currentPosition == null) return;

    setState(() {
      _isNavigating = true;
    });

    await _positionSubscription?.cancel();

    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    ).listen(
      (position) {
        if (!mounted) return;

        final current = LatLng(
          position.latitude,
          position.longitude,
        );

        setState(() {
          _currentPosition = current;
        });

        _mapController.move(current, 16);
      },
      onError: (error) {
        if (mounted) {
          _showMessage('Location tracking error: $error');
        }
      },
    );
  }

  Future<void> _stopNavigation() async {
    await _positionSubscription?.cancel();
    _positionSubscription = null;

    if (!mounted) return;

    setState(() {
      _isNavigating = false;
    });
  }

  void _swapLocations() {
    final oldOrigin = _originController.text;
    final oldDestination = _destinationController.text;

    final oldOriginPoint = _originPoint;
    final oldDestinationPoint = _destinationPoint;

    setState(() {
      _originController.text = oldDestination;
      _destinationController.text = oldOrigin;

      _originPoint = oldDestinationPoint;
      _destinationPoint = oldOriginPoint;

      _routes = [];
      _routeError = null;
      _isNavigating = false;
    });
  }

  void _selectRoute(int index) {
    if (index < 0 || index >= _routes.length) return;

    setState(() {
      _selectedRoute = index;
      _isNavigating = false;
    });

    _fitRoute(_coordinatesFor(_routes[index]));
  }

  void _showMessage(String message) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  double? _routeDistanceKm(Map<String, dynamic>? route) {
    if (route == null) return null;

    final value = _asDouble(
      route['distance_km'] ?? route['distance'],
    );

    if (value == null) return null;

    // distance_km is already in kilometres.
    if (route['distance_km'] != null) {
      return value;
    }

    // The API's distance field is in metres.
    return value / 1000;
  }

  String _routeDuration(Map<String, dynamic>? route) {

    if (route == null) return '—';

    final text = route['duration_text'];

    if (text != null && text.toString().isNotEmpty) {
      return text.toString();
    }

    final minutes = _asDouble(route['duration_minutes']);

    if (minutes != null) {
      return '${minutes.round()} min';
    }

    final seconds = _asDouble(route['duration']);

    if (seconds != null) {
      return '${(seconds / 60).round()} min';
    }

    return '—';
  }

  String _distanceLabel(double? distance) {
    if (distance == null) return '—';

    return '${distance.toStringAsFixed(1)} km';
  }

  double? _remainingDistanceKm() {
    final route = _currentRoute;
    final current = _currentPosition;

    if (route == null || current == null) return null;

    final points = _coordinatesFor(route);

    if (points.length < 2) return null;

    final distance = const Distance();

    var nearestIndex = 0;
    var nearestDistance = double.infinity;

    for (var i = 0; i < points.length; i++) {
      final metres = distance.as(
        LengthUnit.Meter,
        current,
        points[i],
      );

      if (metres < nearestDistance) {
        nearestDistance = metres;
        nearestIndex = i;
      }
    }

    var remaining = 0.0;

    for (var i = nearestIndex; i < points.length - 1; i++) {
      remaining += distance.as(
        LengthUnit.Meter,
        points[i],
        points[i + 1],
      );
    }

    return remaining / 1000;
  }

  Color _incidentColor(Map<String, dynamic> incident) {
    final value = (
      incident['severity'] ??
      incident['status'] ??
      incident['incident_type'] ??
      incident['type'] ??
      ''
    ).toString().toLowerCase();

    if (value.contains('high') ||
        value.contains('critical') ||
        value.contains('danger')) {
      return Colors.red;
    }

    if (value.contains('medium') ||
        value.contains('moderate')) {
      return Colors.orange;
    }

    return Colors.blueGrey;
  }

  String _incidentTitle(Map<String, dynamic> incident) {
    return (
      incident['title'] ??
      incident['incident_type'] ??
      incident['type'] ??
      incident['category'] ??
      'Safety report'
    ).toString();
  }

  String _incidentDescription(Map<String, dynamic> incident) {
    return (
      incident['description'] ??
      incident['details'] ??
      incident['message'] ??
      'No additional details provided.'
    ).toString();
  }

  String _placeName(Map<String, dynamic> place) {
    return (
      place['name'] ??
      place['display_name'] ??
      place['title'] ??
      'Selected location'
    ).toString();
  }

  String _placeAddress(Map<String, dynamic> place) {
    return (
      place['address'] ??
      place['display_name'] ??
      place['formatted_address'] ??
      ''
    ).toString();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _page,
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: _ink,
        elevation: 0,
        title: const Text(
          'Route Map',
          style: TextStyle(
            fontWeight: FontWeight.w800,
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh safety reports',
            onPressed: _loadingIncidents ? null : _loadIncidents,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= 900;

            if (wide) {
              return Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SizedBox(
                    width: 360,
                    child: _buildPlannerPanel(),
                  ),
                  Expanded(
                    child: _buildMapPanel(),
                  ),
                ],
              );
            }

            return Column(
              children: [
                Expanded(
                  flex: 6,
                  child: _buildMapPanel(),
                ),
                Expanded(
                  flex: 5,
                  child: _buildPlannerPanel(),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildMapPanel() {
    final route = _currentRoute;
    final routePoints = _coordinatesFor(route);

    final markers = <Marker>[];

    if (_originPoint != null) {
      markers.add(
        Marker(
          point: _originPoint!,
          width: 44,
          height: 44,
          child: const _MapPin(
            icon: Icons.trip_origin,
            color: Colors.green,
          ),
        ),
      );
    }

    if (_destinationPoint != null) {
      markers.add(
        Marker(
          point: _destinationPoint!,
          width: 44,
          height: 44,
          child: const _MapPin(
            icon: Icons.location_on,
            color: Colors.red,
          ),
        ),
      );
    }

    if (_currentPosition != null) {
      markers.add(
        Marker(
          point: _currentPosition!,
          width: 44,
          height: 44,
          child: const _MapPin(
            icon: Icons.my_location,
            color: Colors.blue,
          ),
        ),
      );
    }

    if (_clickedPoint != null &&
        _clickedPoint != _destinationPoint) {
      markers.add(
        Marker(
          point: _clickedPoint!,
          width: 40,
          height: 40,
          child: const _MapPin(
            icon: Icons.place,
            color: _teal,
          ),
        ),
      );
    }

    if (_showIncidents) {
      for (final incident in _incidents) {
        final point = _incidentCoordinates(incident);

        if (point == null) continue;

        markers.add(
          Marker(
            point: point,
            width: 42,
            height: 42,
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _selectedIncident = incident;
                  _selectedPlace = null;
                });
              },
              child: Icon(
                Icons.warning_rounded,
                color: _incidentColor(incident),
                size: 30,
              ),
            ),
          ),
        );
      }
    }

    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: _defaultCenter,
            initialZoom: 6.5,
            onTap: (tapPosition, point) {
              setState(() {
                _clickedPoint = point;
                _selectedIncident = null;
              });

              _reverseGeocode(point);
            },
          ),
          children: [
            TileLayer(
              urlTemplate: _showHotTiles
                  ? 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
                  : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              subdomains: _showHotTiles
                  ? const ['a', 'b', 'c']
                  : const [],
              userAgentPackageName: 'com.safetrip.karnataka',
            ),
            if (routePoints.length >= 2)
              PolylineLayer(
                polylines: [
                  Polyline(
                    points: routePoints,
                    strokeWidth: 7,
                    color: _teal.withValues(alpha: 0.25),
                  ),
                  Polyline(
                    points: routePoints,
                    strokeWidth: 4,
                    color: _teal,
                  ),
                ],
              ),
            MarkerLayer(
              markers: markers,
            ),
            const RichAttributionWidget(
              attributions: [
                TextSourceAttribution(
                  '© OpenStreetMap contributors',
                ),
              ],
            ),
          ],
        ),
        Positioned(
          top: 12,
          right: 12,
          child: Column(
            children: [
              _MapActionButton(
                icon: Icons.layers_outlined,
                tooltip: 'Change map style',
                onPressed: () {
                  setState(() {
                    _showHotTiles = !_showHotTiles;
                  });
                },
              ),
              const SizedBox(height: 8),
              _MapActionButton(
                icon: Icons.my_location,
                tooltip: 'My location',
                onPressed: _locating
                    ? null
                    : () => _useCurrentLocation(),
              ),
              const SizedBox(height: 8),
              _MapActionButton(
                icon: Icons.warning_amber_rounded,
                tooltip: 'Toggle safety reports',
                onPressed: () {
                  setState(() {
                    _showIncidents = !_showIncidents;
                  });
                },
              ),
            ],
          ),
        ),
        Positioned(
          left: 12,
          right: 12,
          top: 12,
          child: _buildMapSearch(),
        ),
        if (_selectedIncident != null)
          Positioned(
            left: 12,
            right: 12,
            bottom: 12,
            child: _buildIncidentPopup(_selectedIncident!),
          ),
        if (_selectedPlace != null)
          Positioned(
            left: 12,
            right: 12,
            bottom: 12,
            child: _buildSelectedPlacePopup(_selectedPlace!),
          ),
      ],
    );
  }

  Widget _buildMapSearch() {
    return Material(
      elevation: 3,
      borderRadius: BorderRadius.circular(12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _searchController,
            textInputAction: TextInputAction.search,
            onSubmitted: (value) {
              _searchNominatim(value);
            },
            decoration: InputDecoration(
              hintText: 'Search a place or location',
              prefixIcon: const Icon(
                Icons.search,
                color: _teal,
              ),
              suffixIcon: _searching
                  ? const Padding(
                      padding: EdgeInsets.all(12),
                      child: SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                        ),
                      ),
                    )
                  : IconButton(
                      icon: const Icon(Icons.arrow_forward),
                      onPressed: () {
                        _searchNominatim(
                          _searchController.text,
                        );
                      },
                    ),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 14,
              ),
            ),
          ),
          if (_searchResults.isNotEmpty)
            ConstrainedBox(
              constraints: const BoxConstraints(
                maxHeight: 210,
              ),
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: _searchResults.length,
                separatorBuilder: (_, __) =>
                    const Divider(height: 1),
                itemBuilder: (context, index) {
                  final result = _searchResults[index];

                  return ListTile(
                    dense: true,
                    leading: const Icon(
                      Icons.place_outlined,
                      color: _teal,
                    ),
                    title: Text(
                      _placeName(result),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    subtitle: Text(
                      _placeAddress(result),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    onTap: () {
                      _selectSearchResult(result);
                      _searchController.clear();
                    },
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildIncidentPopup(
    Map<String, dynamic> incident,
  ) {
    return _InfoPopup(
      color: _incidentColor(incident),
      title: _incidentTitle(incident),
      subtitle: _incidentDescription(incident),
      onClose: () {
        setState(() {
          _selectedIncident = null;
        });
      },
    );
  }

  Widget _buildSelectedPlacePopup(
    Map<String, dynamic> place,
  ) {
    return _InfoPopup(
      color: _teal,
      title: _placeName(place),
      subtitle: _placeAddress(place),
      onClose: () {
        setState(() {
          _selectedPlace = null;
        });
      },
      actionLabel: 'Set as destination',
      onAction: () {
        final point = _clickedPoint;

        if (point != null) {
          setState(() {
            _destinationPoint = point;
            _destinationController.text = _placeAddress(place).isNotEmpty
                ? _placeAddress(place)
                : _placeName(place);
          });
        }

        setState(() {
          _selectedPlace = null;
        });
      },
    );
  }

  Widget _buildPlannerPanel() {
    return Container(
      color: Colors.white,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildPanelHeading(),
          const SizedBox(height: 14),
          _buildLocationFields(),
          const SizedBox(height: 12),
          _buildTravelModes(),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _loadingRoutes ? null : _loadRoutes,
              icon: _loadingRoutes
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.alt_route),
              label: Text(
                _loadingRoutes ? 'Finding route...' : 'Find route',
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: _teal,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
          if (_routeError != null) ...[
            const SizedBox(height: 10),
            _buildError(_routeError!),
          ],
          if (_placeError != null) ...[
            const SizedBox(height: 10),
            _buildError(_placeError!),
          ],
          const SizedBox(height: 16),
          if (_routes.isNotEmpty) _buildRouteResults(),
          const SizedBox(height: 16),
          _buildSafetyReports(),
        ],
      ),
    );
  }

  Widget _buildPanelHeading() {
    return Row(
      children: [
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: _teal.withValues(alpha: 0.10),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(
            Icons.route,
            color: _teal,
          ),
        ),
        const SizedBox(width: 12),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Plan your journey',
                style: TextStyle(
                  color: _ink,
                  fontWeight: FontWeight.w800,
                  fontSize: 17,
                ),
              ),
              SizedBox(height: 3),
              Text(
                'Find a route and view safety reports',
                style: TextStyle(
                  color: _muted,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLocationFields() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _page,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE1E9F1)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              const Icon(
                Icons.trip_origin,
                color: Colors.green,
                size: 20,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: _originController,
                  decoration: const InputDecoration(
                    hintText: 'Starting point',
                    border: InputBorder.none,
                    isDense: true,
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Use my current location',
                onPressed: _locating
                    ? null
                    : () => _useCurrentLocation(),
                icon: const Icon(
                  Icons.my_location,
                  color: _teal,
                  size: 20,
                ),
              ),
            ],
          ),
          const Divider(height: 14),
          Row(
            children: [
              const Icon(
                Icons.location_on,
                color: Colors.red,
                size: 20,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: _destinationController,
                  decoration: const InputDecoration(
                    hintText: 'Destination',
                    border: InputBorder.none,
                    isDense: true,
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Swap locations',
                onPressed: _swapLocations,
                icon: const Icon(
                  Icons.swap_vert,
                  color: _teal,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTravelModes() {
    const modes = [
      ('car', Icons.directions_car, 'Car'),
      ('bike', Icons.two_wheeler, 'Bike'),
      ('bus', Icons.directions_bus, 'Bus'),
      ('walk', Icons.directions_walk, 'Walk'),
    ];

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: modes.map((mode) {
        final selected = _travelMode == mode.$1;

        return ChoiceChip(
          selected: selected,
          onSelected: (_) {
            setState(() {
              _travelMode = mode.$1;
              _routeError = null;
            });
          },
          avatar: Icon(
            mode.$2,
            size: 18,
            color: selected ? Colors.white : _muted,
          ),
          label: Text(mode.$3),
          selectedColor: _teal,
          labelStyle: TextStyle(
            color: selected ? Colors.white : _ink,
            fontWeight: FontWeight.w600,
          ),
          backgroundColor: _page,
          side: BorderSide(
            color: selected ? _teal : const Color(0xFFE1E9F1),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildRouteResults() {
    final route = _currentRoute;
    final distance = _routeDistanceKm(route);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Available routes',
                style: TextStyle(
                  color: _ink,
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                ),
              ),
            ),
            Text(
              '${_routes.length} found',
              style: const TextStyle(
                color: _muted,
                fontSize: 12,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        ...List.generate(_routes.length, (index) {
          final item = _routes[index];
          final selected = index == _selectedRoute;

          return GestureDetector(
            onTap: () => _selectRoute(index),
            child: Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: selected
                    ? _teal.withValues(alpha: 0.07)
                    : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: selected
                      ? _teal
                      : const Color(0xFFE1E9F1),
                  width: selected ? 1.5 : 1,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    selected
                        ? Icons.radio_button_checked
                        : Icons.radio_button_off,
                    color: selected ? _teal : _muted,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Route ${index + 1}',
                          style: const TextStyle(
                            color: _ink,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          _distanceLabel(_routeDistanceKm(item)),
                          style: const TextStyle(
                            color: _muted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    _routeDuration(item),
                    style: const TextStyle(
                      color: _tealDark,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
        if (route != null) ...[
          const SizedBox(height: 8),
          _buildRouteSummary(
            distance: distance,
            duration: _routeDuration(route),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _isNavigating
                  ? _stopNavigation
                  : _startNavigation,
              icon: Icon(
                _isNavigating ? Icons.stop : Icons.navigation,
              ),
              label: Text(
                _isNavigating
                    ? 'Stop navigation'
                    : 'Start navigation',
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor:
                    _isNavigating ? Colors.red : _tealDark,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 13),
              ),
            ),
          ),
          if (_isNavigating) ...[
            const SizedBox(height: 8),
            _buildRemainingDistance(),
          ],
        ],
      ],
    );
  }

  Widget _buildRouteSummary({
    required double? distance,
    required String duration,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _page,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Expanded(
            child: _SummaryValue(
              icon: Icons.route,
              label: 'Distance',
              value: _distanceLabel(distance),
            ),
          ),
          Expanded(
            child: _SummaryValue(
              icon: Icons.schedule,
              label: 'Duration',
              value: duration,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRemainingDistance() {
    final remaining = _remainingDistanceKm();

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.blue.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.my_location,
            color: Colors.blue,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              remaining == null
                  ? 'Tracking your current location'
                  : 'Approx. ${remaining.toStringAsFixed(1)} km remaining along the route',
              style: const TextStyle(
                color: _ink,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSafetyReports() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Safety reports',
                style: TextStyle(
                  color: _ink,
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                ),
              ),
            ),
            if (_loadingIncidents)
              const SizedBox(
                width: 17,
                height: 17,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                ),
              )
            else
              TextButton(
                onPressed: _loadIncidents,
                child: const Text('Refresh'),
              ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            _SafetyTab(
              label: 'Reports',
              selected: _activeSafetyTab == 'Reports',
              onTap: () {
                setState(() {
                  _activeSafetyTab = 'Reports';
                });
              },
            ),
            const SizedBox(width: 8),
            _SafetyTab(
              label: 'Legend',
              selected: _activeSafetyTab == 'Legend',
              onTap: () {
                setState(() {
                  _activeSafetyTab = 'Legend';
                });
              },
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (_activeSafetyTab == 'Reports')
          _buildIncidentList()
        else
          _buildIncidentLegend(),
      ],
    );
  }

  Widget _buildIncidentList() {
    if (_incidentError != null) {
      return _buildError(_incidentError!);
    }

    if (_loadingIncidents && _incidents.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(18),
        child: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_incidents.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: Text(
          'No safety reports with map coordinates were returned.',
          style: TextStyle(
            color: _muted,
            fontSize: 12,
          ),
        ),
      );
    }

    return Column(
      children: _incidents.take(12).map((incident) {
        final color = _incidentColor(incident);

        return ListTile(
          contentPadding: EdgeInsets.zero,
          dense: true,
          leading: Icon(
            Icons.warning_amber_rounded,
            color: color,
          ),
          title: Text(
            _incidentTitle(incident),
            style: const TextStyle(
              color: _ink,
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
          subtitle: Text(
            _incidentDescription(incident),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: _muted,
              fontSize: 11,
            ),
          ),
          onTap: () {
            final point = _incidentCoordinates(incident);

            if (point == null) return;

            setState(() {
              _selectedIncident = incident;
              _selectedPlace = null;
            });

            _mapController.move(point, 15);
          },
        );
      }).toList(),
    );
  }

  Widget _buildIncidentLegend() {
    return Column(
      children: const [
        _LegendRow(
          color: Colors.red,
          label: 'High / critical severity',
        ),
        _LegendRow(
          color: Colors.orange,
          label: 'Medium severity',
        ),
        _LegendRow(
          color: Colors.blueGrey,
          label: 'Other safety reports',
        ),
        _LegendRow(
          color: Colors.green,
          label: 'Route starting point',
        ),
        _LegendRow(
          color: Colors.redAccent,
          label: 'Destination',
        ),
        _LegendRow(
          color: Colors.blue,
          label: 'Current GPS location',
        ),
      ],
    );
  }

  Widget _buildError(String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: Colors.red.withValues(alpha: 0.18),
        ),
      ),
      child: Text(
        message,
        style: const TextStyle(
          color: Colors.red,
          fontSize: 12,
        ),
      ),
    );
  }
}

class _MapPin extends StatelessWidget {
  final IconData icon;
  final Color color;

  const _MapPin({
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Icon(
      icon,
      color: color,
      size: 34,
      shadows: const [
        Shadow(
          color: Colors.white,
          blurRadius: 5,
        ),
      ],
    );
  }
}

class _MapActionButton extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback? onPressed;

  const _MapActionButton({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      elevation: 3,
      borderRadius: BorderRadius.circular(10),
      child: IconButton(
        tooltip: tooltip,
        onPressed: onPressed,
        icon: Icon(
          icon,
          color: _RouteMapScreenState._teal,
        ),
      ),
    );
  }
}

class _InfoPopup extends StatelessWidget {
  final Color color;
  final String title;
  final String subtitle;
  final VoidCallback onClose;
  final String? actionLabel;
  final VoidCallback? onAction;

  const _InfoPopup({
    required this.color,
    required this.title,
    required this.subtitle,
    required this.onClose,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      elevation: 5,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border(
            left: BorderSide(
              color: color,
              width: 4,
            ),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: onClose,
                  icon: const Icon(Icons.close),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            if (subtitle.isNotEmpty)
              Text(
                subtitle,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Color(0xFF70819A),
                  fontSize: 12,
                ),
              ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: onAction,
                  child: Text(actionLabel!),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SummaryValue extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _SummaryValue({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              icon,
              size: 15,
              color: const Color(0xFF078F87),
            ),
            const SizedBox(width: 5),
            Text(
              label,
              style: const TextStyle(
                color: Color(0xFF70819A),
                fontSize: 11,
              ),
            ),
          ],
        ),
        const SizedBox(height: 5),
        Text(
          value,
          style: const TextStyle(
            color: Color(0xFF17243B),
            fontWeight: FontWeight.w800,
            fontSize: 16,
          ),
        ),
      ],
    );
  }
}

class _SafetyTab extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _SafetyTab({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(9),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 9),
          decoration: BoxDecoration(
            color: selected
                ? const Color(0xFF078F87).withValues(alpha: 0.10)
                : const Color(0xFFF5F8FC),
            borderRadius: BorderRadius.circular(9),
            border: Border.all(
              color: selected
                  ? const Color(0xFF078F87)
                  : const Color(0xFFE1E9F1),
            ),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                color: selected
                    ? const Color(0xFF06776F)
                    : const Color(0xFF70819A),
                fontWeight: FontWeight.w700,
                fontSize: 12,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _LegendRow extends StatelessWidget {
  final Color color;
  final String label;

  const _LegendRow({
    required this.color,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Container(
            width: 11,
            height: 11,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                color: Color(0xFF70819A),
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }
}