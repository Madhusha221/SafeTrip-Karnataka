
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter/services.dart';
import '../services/auth_service.dart';

class WomenTravelerScreen extends StatefulWidget {
  final VoidCallback? onOpenReport;

  const WomenTravelerScreen({
    super.key,
    this.onOpenReport,
  });

  @override
  State<WomenTravelerScreen> createState() =>
      _WomenTravelerScreenState();
}

class _WomenTravelerScreenState
    extends State<WomenTravelerScreen> {
  // Website theme colours
  static const Color pink = Color(0xFFE43D78);
  static const Color rose = Color(0xFFE11D48);
  static const Color teal = Color(0xFF078F87);
  static const Color ink = Color(0xFF0F172A);
  static const Color muted = Color(0xFF64748B);
  static const Color page = Color(0xFFFFF8FC);
  static const Color border = Color(0xFFE2E8F0);

  static const LatLng defaultCenter =
      LatLng(12.9716, 77.5946);

  final MapController _mapController = MapController();

  final TextEditingController _originController =
      TextEditingController(text: 'Bengaluru');

  final TextEditingController _destinationController =
      TextEditingController(text: 'Mysuru');

  final TextEditingController _contactNameController =
      TextEditingController();

  final TextEditingController _contactPhoneController =
      TextEditingController();

  bool womenModeEnabled = true;
  bool loadingIncidents = true;
  bool loadingRoutes = false;
  bool locating = false;
  bool showContactForm = false;

  String? incidentError;
  String? locationError;
  String? routeError;
  String? sosNotice;

  LatLng? currentPosition;

  List<Map<String, dynamic>> incidents = [];
  List<Map<String, dynamic>> routes = [];
  List<Map<String, dynamic>> trustedContacts = [];

  Map<String, dynamic>? routeInfo;

  int selectedRoute = 0;

  String activeMapFilter = 'All';

  String get apiBase {
    final value = AuthService.baseUrl.trim();

    return value.endsWith('/')
        ? value.substring(0, value.length - 1)
        : value;
  }

  Map<String, dynamic>? get currentRoute {
    if (routes.isEmpty || selectedRoute >= routes.length) {
      return null;
    }

    return routes[selectedRoute];
  }

  List<Map<String, dynamic>> get mappedIncidents {
    return incidents.where((item) {
      return incidentCoordinates(item) != null;
    }).toList();
  }

  List<Map<String, dynamic>> get recentUpdates {
    return incidents.take(3).toList();
  }

  final List<String> safetyTips = [
    'Prefer well-lit and busy routes, especially during late evening travel.',
    'Use verified cabs or registered Karnataka Tourism taxis.',
    'Keep emergency number 112 handy at all times.',
    'Share your trip details with someone you trust.',
    'Keep your phone charged and emergency contacts accessible.',
  ];

  @override
  void initState() {
    super.initState();
    loadIncidents();
  }

  @override
  void dispose() {
    _mapController.dispose();
    _originController.dispose();
    _destinationController.dispose();
    _contactNameController.dispose();
    _contactPhoneController.dispose();
    super.dispose();
  }

  double? asDouble(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '');
  }

  List<dynamic> getList(dynamic data) {
    if (data is List) return data;
    if (data is Map) {
      if (data['results'] is List) return data['results'];
      if (data['incidents'] is List) return data['incidents'];
    }
    return [];
  }

  LatLng? incidentCoordinates(Map<String, dynamic> item) {
    final location = item['location'];

    final latitude = asDouble(
      item['latitude'] ??
          item['lat'] ??
          (location is Map ? location['latitude'] : null),
    );

    final longitude = asDouble(
      item['longitude'] ??
          item['lng'] ??
          item['lon'] ??
          (location is Map ? location['longitude'] : null) ??
          (location is Map ? location['lng'] : null),
    );

    if (latitude == null || longitude == null) return null;

    if (latitude.abs() > 90 || longitude.abs() > 180) {
      return null;
    }

    return LatLng(latitude, longitude);
  }

  Future<void> loadIncidents() async {
    setState(() {
      loadingIncidents = true;
      incidentError = null;
    });

    try {
      final response = await http
          .get(Uri.parse('$apiBase/incidents/'))
          .timeout(const Duration(seconds: 20));

      if (response.statusCode != 200) {
        throw Exception(
          'Unable to load community safety reports.',
        );
      }

      final data = jsonDecode(response.body);
      final list = getList(data);

      if (!mounted) return;

      setState(() {
        incidents = list
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        incidents = [];
        incidentError = error.toString().replaceFirst(
              'Exception: ',
              '',
            );
      });
    } finally {
      if (mounted) {
        setState(() {
          loadingIncidents = false;
        });
      }
    }
  }

  List<LatLng> get routeCoordinates {
    final route = currentRoute;
    if (route == null) return [];

    dynamic points;

    final geometry = route['geometry'];
    final geojson = route['geojson'];

    if (geometry is Map && geometry['coordinates'] != null) {
      points = geometry['coordinates'];
    } else if (geojson is Map && geojson['coordinates'] != null) {
      points = geojson['coordinates'];
    } else {
      points = route['coordinates'];
    }

    if (points is! List) return [];

    final result = <LatLng>[];

    for (final point in points) {
      if (point is! List || point.length < 2) continue;

      final first = asDouble(point[0]);
      final second = asDouble(point[1]);

      if (first == null || second == null) continue;

      double latitude;
      double longitude;

      if (geometry is Map || geojson is Map) {
        longitude = first;
        latitude = second;
      } else if (first >= 74 &&
          first <= 79 &&
          second >= 11 &&
          second <= 19) {
        longitude = first;
        latitude = second;
      } else {
        latitude = first;
        longitude = second;
      }

      if (latitude.abs() <= 90 &&
          longitude.abs() <= 180) {
        result.add(LatLng(latitude, longitude));
      }
    }

    return result;
  }

  Future<void> checkSafetyRoute() async {
    final origin = _originController.text.trim();
    final destination = _destinationController.text.trim();

    if (origin.isEmpty || destination.isEmpty) {
      setState(() {
        routeError =
            'Enter both starting point and destination.';
      });
      return;
    }

    setState(() {
      loadingRoutes = true;
      routeError = null;
      routes = [];
      routeInfo = null;
    });

    try {
      final uri = Uri.parse(
        '$apiBase/routes/safety-eval/',
      ).replace(queryParameters: {
        'from': origin,
        'to': destination,
      });

      final response = await http
          .get(uri)
          .timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);

      if (data is! Map) {
        throw Exception('Unexpected route response.');
      }

      if (response.statusCode != 200 ||
          data['success'] == false) {
        throw Exception(
          data['error'] ?? 'Unable to calculate route.',
        );
      }

      if (data['routes'] is! List ||
          (data['routes'] as List).isEmpty) {
        throw Exception(
          'No route alternatives were returned.',
        );
      }

      if (!mounted) return;

      setState(() {
        routes = (data['routes'] as List)
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();

        routeInfo = Map<String, dynamic>.from(data);
        selectedRoute = 0;
      });

      _fitRoute(routeCoordinates);
    } catch (error) {
      if (!mounted) return;

      setState(() {
        routeError = error.toString().replaceFirst(
              'Exception: ',
              '',
            );
      });
    } finally {
      if (mounted) {
        setState(() {
          loadingRoutes = false;
        });
      }
    }
  }

  void _fitRoute(List<LatLng> points) {
    if (points.length < 2) return;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;

      final bounds = LatLngBounds.fromPoints(points);

      _mapController.fitCamera(
        CameraFit.bounds(
          bounds: bounds,
          padding: const EdgeInsets.all(35),
        ),
      );
    });
  }

  Future<void> locateMe() async {
    setState(() {
      locating = true;
      locationError = null;
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
        currentPosition = point;
      });

      _mapController.move(point, 14);
    } catch (error) {
      if (!mounted) return;

      setState(() {
        locationError = error.toString().replaceFirst(
              'Exception: ',
              '',
            );
      });
    } finally {
      if (mounted) {
        setState(() {
          locating = false;
        });
      }
    }
  }

  Future<void> triggerSOS() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Emergency SOS'),
        content: const Text(
          'This will open your phone dialler to call '
          "India's emergency number 112. Continue?",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: rose,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Call 112'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    await callNumber('112');

    if (!mounted) return;

    setState(() {
      sosNotice =
          'Your phone dialler was opened. Complete the call if you need emergency assistance.';
    });
  }

  Future<void> callNumber(String number) async {
    final uri = Uri(scheme: 'tel', path: number);

    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      } else {
        showMessage('Unable to open the phone dialler.');
      }
    } catch (_) {
      showMessage('Unable to open the phone dialler.');
    }
  }

  Future<void> shareLocation() async {
    if (currentPosition == null) {
      setState(() {
        sosNotice =
            'Please enable GPS location before sharing your location.';
      });
      return;
    }

    final url =
        'https://www.google.com/maps?q=${currentPosition!.latitude},${currentPosition!.longitude}';

    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Share my location'),
        content: SelectableText(url),
        actions: [
          TextButton(
            onPressed: () async {
              await Clipboard.setData(
                ClipboardData(text: url),
              );

              if (context.mounted) {
                Navigator.pop(context);
              }

              showMessage('Location link copied.');
            },
            child: const Text('Copy link'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void addTrustedContact() {
    final name = _contactNameController.text.trim();
    final phone = _contactPhoneController.text.trim();

    if (name.isEmpty || phone.isEmpty) {
      showMessage('Enter contact name and phone number.');
      return;
    }

    setState(() {
      trustedContacts.add({
        'id': DateTime.now().millisecondsSinceEpoch,
        'name': name,
        'phone': phone,
      });

      _contactNameController.clear();
      _contactPhoneController.clear();
      showContactForm = false;
    });

    showMessage('Trusted contact added for this session.');
  }

  void showMessage(String message) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  void scrollToRoute() {
    // The route checker is already visible below Quick Actions
    // on smaller screens. This button gives the user feedback.
    showMessage('Route Safety Check is below the Safety Map.');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: page,
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: ink,
        elevation: 0,
        title: const Text(
          'Women Traveller Safety',
          style: TextStyle(
            fontWeight: FontWeight.w900,
            fontSize: 17,
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh reports',
            onPressed: loadIncidents,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(13, 16, 13, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHero(),
              const SizedBox(height: 16),
              _buildSummaryCards(),
              if (sosNotice != null) ...[
                const SizedBox(height: 14),
                _buildNotice(),
              ],
              const SizedBox(height: 16),
              _buildMainDashboard(),
              const SizedBox(height: 16),
              _buildBottomDashboard(),
              const SizedBox(height: 16),
              _buildFooter(),
            ],
          ),
        ),
      ),
    );
  }

  // ------------------------------------------------------------
  // HERO BANNER
  // ------------------------------------------------------------

  Widget _buildHero() {
    return Container(
      width: double.infinity,
      constraints: const BoxConstraints(minHeight: 235),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(25),
        image: const DecorationImage(
          image: NetworkImage(
            'https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1800&q=85',
          ),
          fit: BoxFit.cover,
          colorFilter: ColorFilter.mode(
            Color(0xAA640A41),
            BlendMode.darken,
          ),
        ),
        gradient: const LinearGradient(
          colors: [
            Color(0xFFE11D78),
            Color(0xFF9D174D),
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: rose.withOpacity(0.18),
            blurRadius: 15,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(25),
          gradient: const LinearGradient(
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
            colors: [
              Color(0xD1640A41),
              Color(0x887C1D55),
            ],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 8,
              ),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.20),
                borderRadius: BorderRadius.circular(30),
                border: Border.all(
                  color: Colors.white24,
                ),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.verified_user,
                    size: 16,
                    color: Colors.white,
                  ),
                  SizedBox(width: 7),
                  Text(
                    'WOMEN TRAVELLER SAFETY HUB',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 10,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 17),
            const Text(
              'Travel Confidently.\nStay Protected.',
              style: TextStyle(
                color: Colors.white,
                fontSize: 29,
                height: 1.08,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'A dedicated safety space for women travellers in Karnataka with safety information, route insights and emergency help.',
              style: TextStyle(
                color: Color(0xFFFFE4F1),
                fontSize: 12,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 18),
            _buildWomenModeToggle(),
          ],
        ),
      ),
    );
  }

  Widget _buildWomenModeToggle() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.18),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white30),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 43,
                height: 43,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: pink,
                ),
                child: const Icon(
                  Icons.shield_outlined,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 11),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Women Safety Mode',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    SizedBox(height: 3),
                    Text(
                      'Safety preference',
                      style: TextStyle(
                        color: Color(0xFFFFE4F1),
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ),
              Switch(
                value: womenModeEnabled,
                activeColor: Colors.white,
                activeTrackColor: const Color(0xFF34D399),
                inactiveThumbColor: Colors.white,
                onChanged: (value) {
                  setState(() {
                    womenModeEnabled = value;
                  });
                },
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 9),
            decoration: BoxDecoration(
              color: womenModeEnabled
                  ? const Color(0xFF34D399)
                  : Colors.blueGrey,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              womenModeEnabled
                  ? '✓  WOMEN MODE ACTIVE'
                  : 'WOMEN MODE OFF',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Color(0xFF0F172A),
                fontWeight: FontWeight.w900,
                fontSize: 10,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ------------------------------------------------------------
  // SUMMARY CARDS
  // ------------------------------------------------------------

  Widget _buildSummaryCards() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _statCard(
                Icons.shield_outlined,
                'My Safety Score',
                'Not calculated',
                'Safety scoring not integrated',
                const Color(0xFF059669),
                const Color(0xFFD1FAE5),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _statCard(
                Icons.location_on_outlined,
                'Geolocated Reports',
                '${mappedIncidents.length}',
                'Community incident reports',
                const Color(0xFF7E22CE),
                const Color(0xFFF3E8FF),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _statCard(
                Icons.navigation_outlined,
                'Trip Status',
                'Not travelling',
                'No active trip tracking',
                const Color(0xFF0284C7),
                const Color(0xFFE0F2FE),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _statCard(
                Icons.people_outline,
                'Trusted Contacts',
                '${trustedContacts.length}',
                'Added in this session',
                const Color(0xFFEA580C),
                const Color(0xFFFFEDD5),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        _emergencySummaryCard(),
      ],
    );
  }

  Widget _statCard(
    IconData icon,
    String title,
    String value,
    String subtitle,
    Color foreground,
    Color background,
  ) {
    return Container(
      constraints: const BoxConstraints(minHeight: 110),
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(17),
        border: Border.all(color: border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.025),
            blurRadius: 8,
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 37,
            height: 37,
            decoration: BoxDecoration(
              color: background,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: foreground, size: 20),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF475569),
                    fontWeight: FontWeight.w800,
                    fontSize: 10,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  value,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: ink,
                    fontWeight: FontWeight.w900,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: muted,
                    fontSize: 8,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _emergencySummaryCard() {
    return InkWell(
      onTap: triggerSOS,
      borderRadius: BorderRadius.circular(17),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(17),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(17),
          gradient: const LinearGradient(
            colors: [
              Color(0xFFE11D48),
              Color(0xFFDB2777),
            ],
          ),
          boxShadow: [
            BoxShadow(
              color: rose.withOpacity(0.18),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: const Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'EMERGENCY SOS',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 18,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Call 112 for help',
                    style: TextStyle(
                      color: Color(0xFFFFE4E6),
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.sos,
              size: 36,
              color: Colors.white,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotice() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        border: Border.all(color: const Color(0xFFBFDBFE)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.info_outline,
            color: Color(0xFF1D4ED8),
            size: 18,
          ),
          const SizedBox(width: 9),
          Expanded(
            child: Text(
              sosNotice!,
              style: const TextStyle(
                color: Color(0xFF1E3A8A),
                fontSize: 11,
              ),
            ),
          ),
          IconButton(
            onPressed: () {
              setState(() {
                sosNotice = null;
              });
            },
            icon: const Icon(Icons.close, size: 17),
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }

  // ------------------------------------------------------------
  // MAIN DASHBOARD
  // ------------------------------------------------------------

  Widget _buildMainDashboard() {
    return Column(
      children: [
        _buildQuickActions(),
        const SizedBox(height: 15),
        _buildSafetyMap(),
        const SizedBox(height: 15),
        _buildRouteChecker(),
      ],
    );
  }

  Widget _dashboardCard({
    required Widget child,
    EdgeInsets padding = const EdgeInsets.all(17),
    Color borderColor = const Color(0xFFFBCFE8),
  }) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(23),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.025),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: child,
    );
  }

  Widget _sectionTitle(
    IconData icon,
    String title, {
    Color color = pink,
  }) {
    return Row(
      children: [
        Icon(icon, color: color, size: 22),
        const SizedBox(width: 9),
        Expanded(
          child: Text(
            title,
            style: const TextStyle(
              color: ink,
              fontSize: 16,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
      ],
    );
  }

  Widget _quickAction(
    IconData icon,
    String title,
    VoidCallback onTap,
  ) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(13),
      child: Container(
        width: double.infinity,
        margin: const EdgeInsets.only(top: 9),
        padding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 14,
        ),
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFFFCE7F3)),
          borderRadius: BorderRadius.circular(13),
        ),
        child: Row(
          children: [
            Icon(icon, color: pink, size: 19),
            const SizedBox(width: 11),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  color: Color(0xFF1E293B),
                  fontWeight: FontWeight.w800,
                  fontSize: 11,
                ),
              ),
            ),
            const Icon(
              Icons.arrow_forward_ios,
              size: 13,
              color: muted,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions() {
    return _dashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle(Icons.bolt, 'Quick Actions'),
          const SizedBox(height: 7),
          _quickAction(
            Icons.location_on_outlined,
            locating ? 'Finding location...' : 'Find My Location',
            locateMe,
          ),
          _quickAction(
            Icons.navigation_outlined,
            'Check Route Safety',
            scrollToRoute,
          ),
          _quickAction(
            Icons.share_outlined,
            'Share My Location',
            shareLocation,
          ),
          _quickAction(
            Icons.people_outline,
            'Manage Trusted Contacts',
            () {
              setState(() {
                showContactForm = !showContactForm;
              });
            },
          ),
          const SizedBox(height: 9),
          InkWell(
            onTap: () => callNumber('112'),
            borderRadius: BorderRadius.circular(13),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: rose,
                borderRadius: BorderRadius.circular(13),
              ),
              child: const Row(
                children: [
                  Icon(Icons.phone, color: Colors.white, size: 19),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Call 112 Emergency',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  Icon(
                    Icons.arrow_forward_ios,
                    color: Colors.white,
                    size: 13,
                  ),
                ],
              ),
            ),
          ),
          if (showContactForm) ...[
            const SizedBox(height: 17),
            const Divider(),
            const Text(
              'Add trusted contact',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 10),
            _textField(
              controller: _contactNameController,
              hint: 'Contact name',
              icon: Icons.person_outline,
            ),
            const SizedBox(height: 9),
            _textField(
              controller: _contactPhoneController,
              hint: 'Phone number',
              icon: Icons.phone_outlined,
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: addTrustedContact,
                style: ElevatedButton.styleFrom(
                  backgroundColor: teal,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Add Contact'),
              ),
            ),
          ],
          if (trustedContacts.isNotEmpty) ...[
            const Divider(height: 25),
            const Text(
              'Your contacts (session only)',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 11,
                color: muted,
              ),
            ),
            const SizedBox(height: 8),
            ...trustedContacts.map((contact) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 5),
                child: Row(
                  children: [
                    const Icon(
                      Icons.person,
                      color: teal,
                      size: 17,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        contact['name'].toString(),
                        style: const TextStyle(fontSize: 11),
                      ),
                    ),
                    TextButton(
                      onPressed: () =>
                          callNumber(contact['phone'].toString()),
                      child: const Text('Call'),
                    ),
                    IconButton(
                      onPressed: () {
                        setState(() {
                          trustedContacts.removeWhere(
                            (item) => item['id'] == contact['id'],
                          );
                        });
                      },
                      icon: const Icon(
                        Icons.delete_outline,
                        color: rose,
                        size: 19,
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ],
      ),
    );
  }

  Widget _textField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        hintText: hint,
        prefixIcon: Icon(icon, size: 19),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 12,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }

  // ------------------------------------------------------------
  // SAFETY MAP
  // ------------------------------------------------------------

  Widget _buildSafetyMap() {
    final points = <Marker>[];

    if (currentPosition != null) {
      points.add(
        Marker(
          point: currentPosition!,
          width: 35,
          height: 35,
          child: Container(
            width: 22,
            height: 22,
            decoration: BoxDecoration(
              color: const Color(0xFF2878FF),
              shape: BoxShape.circle,
              border: Border.all(
                color: Colors.white,
                width: 4,
              ),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x4D000000),
                  blurRadius: 10,
                  offset: Offset(0, 2),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (activeMapFilter == 'All' ||
        activeMapFilter == 'Reports') {
      for (final item in mappedIncidents) {
        final coordinate = incidentCoordinates(item);
        if (coordinate == null) continue;

        points.add(
          Marker(
            point: coordinate,
            width: 34,
            height: 34,
            child: Container(
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: const Color(0xFFE43D50),
                border: Border.all(
                  color: Colors.white,
                  width: 3,
                ),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(50),
                  topRight: Radius.circular(50),
                  bottomLeft: Radius.circular(50),
                  bottomRight: Radius.circular(5),
                ),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x400F172A),
                    blurRadius: 7,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: const Text(
                '!',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ),
        );
      }
    }

    return _dashboardCard(
      padding: const EdgeInsets.all(13),
      borderColor: border,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: _sectionTitle(
                  Icons.location_on_outlined,
                  'Your Safety Map',
                ),
              ),
              TextButton.icon(
                onPressed: loadIncidents,
                icon: const Icon(Icons.refresh, size: 15),
                label: const Text(
                  'Refresh',
                  style: TextStyle(fontSize: 10),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 7,
            runSpacing: 7,
            children: [
              _filterChip('All'),
              _filterChip('Reports'),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  border: Border.all(color: border),
                  borderRadius: BorderRadius.circular(30),
                ),
                child: const Text(
                  'Police / Hospitals: data not connected',
                  style: TextStyle(
                    color: muted,
                    fontSize: 9,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(17),
            child: SizedBox(
              height: 420,
              child: Stack(
                children: [
                  FlutterMap(
                    mapController: _mapController,
                    options: const MapOptions(
                      initialCenter: defaultCenter,
                      initialZoom: 7,
                      minZoom: 4,
                      maxZoom: 18,
                    ),
                    children: [
                      TileLayer(
                        urlTemplate:
                            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName:
                            'com.safetrip.karnataka',
                      ),
                      if (routeCoordinates.length > 1)
                        PolylineLayer(
                          polylines: [
                            Polyline(
                              points: routeCoordinates,
                              strokeWidth: 6,
                              color: teal,
                            ),
                          ],
                        ),
                      MarkerLayer(markers: points),
                    ],
                  ),
                  Positioned(
                    right: 12,
                    bottom: 12,
                    child: ElevatedButton.icon(
                      onPressed: locating ? null : locateMe,
                      icon: const Icon(
                        Icons.my_location,
                        size: 17,
                      ),
                      label: Text(
                        locating ? 'Locating...' : 'My Location',
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF1D4ED8),
                        elevation: 4,
                      ),
                    ),
                  ),
                  if (loadingIncidents)
                    const Positioned(
                      top: 10,
                      left: 10,
                      child: _MapStatus(
                        text: 'Loading reports...',
                      ),
                    ),
                ],
              ),
            ),
          ),
          if (locationError != null)
            _errorText(locationError!),
          if (incidentError != null)
            _errorText(incidentError!),
          const SizedBox(height: 10),
          const Text(
            'Map markers show geolocated community reports returned by your backend. Absence of a report does not mean a location is safe.',
            style: TextStyle(
              color: muted,
              fontSize: 10,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String value) {
    final selected = activeMapFilter == value;

    return InkWell(
      onTap: () {
        setState(() {
          activeMapFilter = value;
        });
      },
      borderRadius: BorderRadius.circular(30),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: 13,
          vertical: 8,
        ),
        decoration: BoxDecoration(
          color: selected ? teal : Colors.white,
          border: Border.all(
            color: selected ? teal : border,
          ),
          borderRadius: BorderRadius.circular(30),
        ),
        child: Text(
          value,
          style: TextStyle(
            color: selected ? Colors.white : muted,
            fontSize: 10,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }

  // ------------------------------------------------------------
  // ROUTE SAFETY CHECK
  // ------------------------------------------------------------

  Widget _buildRouteChecker() {
    return _dashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle(
            Icons.navigation_outlined,
            'Route Safety Check',
          ),
          const SizedBox(height: 18),
          _routeInput(
            'From',
            _originController,
            'Starting location',
          ),
          const SizedBox(height: 13),
          _routeInput(
            'To',
            _destinationController,
            'Destination',
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              onPressed: loadingRoutes
                  ? null
                  : checkSafetyRoute,
              icon: loadingRoutes
                  ? const SizedBox(
                      height: 17,
                      width: 17,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.navigation, size: 17),
              label: Text(
                loadingRoutes
                    ? 'Checking Route...'
                    : 'Check Safety Route',
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 12,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: teal,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
          if (routeError != null) ...[
            const SizedBox(height: 12),
            _errorBox(routeError!),
          ],
          if (currentRoute != null) ...[
            const SizedBox(height: 14),
            _buildRouteResult(),
          ],
          if (currentRoute == null &&
              !loadingRoutes &&
              routeError == null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                'Enter your starting point and destination to calculate available road routes.',
                style: TextStyle(
                  color: muted,
                  fontSize: 10,
                  height: 1.5,
                ),
              ),
            ),
          ],
          const Divider(height: 28),
          const Text(
            'Emergency numbers',
            style: TextStyle(
              color: ink,
              fontWeight: FontWeight.w900,
              fontSize: 12,
            ),
          ),
          _emergencyNumber(
            'Emergency assistance',
            '112',
            Icons.phone,
            rose,
          ),
          _emergencyNumber(
            'Women helpline',
            '1091',
            Icons.phone,
            ink,
          ),
        ],
      ),
    );
  }

  Widget _routeInput(
    String label,
    TextEditingController controller,
    String hint,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF475569),
            fontSize: 11,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          decoration: InputDecoration(
            hintText: hint,
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 13,
              vertical: 13,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: teal),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRouteResult() {
    final route = currentRoute!;

    final distance = route['distance_km'] ?? 'Unavailable';
    final duration =
        route['duration_text'] ?? 'Unavailable';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDFA),
        border: Border.all(
          color: const Color(0xFF99F6E4),
        ),
        borderRadius: BorderRadius.circular(17),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Route ${selectedRoute + 1}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 13,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 9,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(30),
                ),
                child: const Text(
                  'Route returned',
                  style: TextStyle(
                    color: teal,
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 13),
          const Text(
            'Distance',
            style: TextStyle(color: muted, fontSize: 10),
          ),
          Text(
            '$distance km',
            style: const TextStyle(
              color: ink,
              fontSize: 22,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 9),
          const Text(
            'Travel time',
            style: TextStyle(color: muted, fontSize: 10),
          ),
          Text(
            duration.toString(),
            style: const TextStyle(
              color: ink,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 9),
          Text(
            'Source: ${routeInfo?['source'] ?? 'Routing API'}',
            style: const TextStyle(
              color: muted,
              fontSize: 9,
            ),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(9),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(9),
            ),
            child: const Text(
              'A safety score is not available yet. Route distance and time do not establish that a route is safe.',
              style: TextStyle(
                color: Color(0xFF92400E),
                fontSize: 9,
                height: 1.4,
              ),
            ),
          ),
          if (routes.length > 1) ...[
            const SizedBox(height: 13),
            const Text(
              'Other route options',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 11,
              ),
            ),
            const SizedBox(height: 7),
            ...List.generate(routes.length, (index) {
              final item = routes[index];
              final selected = selectedRoute == index;

              return InkWell(
                onTap: () {
                  setState(() {
                    selectedRoute = index;
                  });
                  _fitRoute(routeCoordinates);
                },
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 7),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: selected ? teal : Colors.white,
                    border: Border.all(
                      color: selected ? teal : border,
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    'Route ${index + 1} · ${item['distance_km'] ?? '—'} km · ${item['duration_text'] ?? 'Time unavailable'}',
                    style: TextStyle(
                      color: selected ? Colors.white : ink,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              );
            }),
          ],
        ],
      ),
    );
  }

  Widget _emergencyNumber(
    String label,
    String number,
    IconData icon,
    Color color,
  ) {
    return InkWell(
      onTap: () => callNumber(number),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 11),
        child: Row(
          children: [
            Icon(icon, color: color, size: 17),
            const SizedBox(width: 9),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w800,
                  fontSize: 11,
                ),
              ),
            ),
            Text(
              number,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.w900,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ------------------------------------------------------------
  // BOTTOM DASHBOARD
  // ------------------------------------------------------------

  Widget _buildBottomDashboard() {
    return Column(
      children: [
        _buildRecentUpdates(),
        const SizedBox(height: 14),
        _buildSafetyTips(),
        const SizedBox(height: 14),
        _buildWomenFriendlyStays(),
      ],
    );
  }

  Widget _buildRecentUpdates() {
    return _dashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: _sectionTitle(
                  Icons.notifications_active_outlined,
                  'Recent Safety Updates',
                  color: rose,
                ),
              ),
              TextButton(
                onPressed: widget.onOpenReport ??
                    () => showMessage(
                          'Connect your Report Issue screen here.',
                        ),
                child: const Text(
                  'Report an issue',
                  style: TextStyle(
                    color: teal,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (loadingIncidents)
            const Text(
              'Loading reports...',
              style: TextStyle(color: muted, fontSize: 11),
            )
          else if (recentUpdates.isEmpty)
            Text(
              incidentError ??
                  'No community reports are currently available.',
              style: const TextStyle(
                color: muted,
                fontSize: 11,
              ),
            )
          else
            ...recentUpdates.asMap().entries.map((entry) {
              final item = entry.value;

              final title = item['title'] ??
                  item['incident_type'] ??
                  'Community safety report';

              final location = item['location_name'] ??
                  item['description'] ??
                  'Location details unavailable';

              return Container(
                padding: const EdgeInsets.symmetric(vertical: 11),
                decoration: const BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: Color(0xFFF1F5F9),
                    ),
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 33,
                      height: 33,
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF1F2),
                        borderRadius: BorderRadius.circular(30),
                      ),
                      child: const Icon(
                        Icons.warning_amber_rounded,
                        color: rose,
                        size: 18,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title.toString(),
                            style: const TextStyle(
                              color: ink,
                              fontWeight: FontWeight.w800,
                              fontSize: 11,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            location.toString(),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: muted,
                              fontSize: 10,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildSafetyTips() {
    return _dashboardCard(
      borderColor: border,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle(
            Icons.lightbulb_outline,
            'Safety Tips for Women Travellers',
            color: const Color(0xFFF59E0B),
          ),
          const SizedBox(height: 16),
          ...safetyTips.map((tip) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 13),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.check_circle,
                    color: Color(0xFF10B981),
                    size: 17,
                  ),
                  const SizedBox(width: 9),
                  Expanded(
                    child: Text(
                      tip,
                      style: const TextStyle(
                        color: Color(0xFF334155),
                        fontSize: 11,
                        height: 1.5,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildWomenFriendlyStays() {
    return _dashboardCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle(
            Icons.bed_outlined,
            'Women-Friendly Stays',
          ),
          const SizedBox(height: 15),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFFFDF2F8),
              borderRadius: BorderRadius.circular(17),
            ),
            child: const Column(
              children: [
                Icon(
                  Icons.apartment_outlined,
                  color: pink,
                  size: 34,
                ),
                SizedBox(height: 10),
                Text(
                  'Accommodation data integration pending',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: ink,
                    fontWeight: FontWeight.w900,
                    fontSize: 12,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'Verified women-friendly accommodation listings will appear here when a trusted data source is connected.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: muted,
                    fontSize: 10,
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

  // ------------------------------------------------------------
  // FOOTER
  // ------------------------------------------------------------

  Widget _buildFooter() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(19),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'SafeTrip Women Safety Hub',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Community reports and route data are loaded from your SafeTrip backend.',
            style: TextStyle(
              color: Color(0xFFCBD5E1),
              fontSize: 10,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 13,
            runSpacing: 9,
            children: [
              _footerStatus(
                Icons.check_circle,
                'Incident API',
                const Color(0xFF34D399),
              ),
              _footerStatus(
                Icons.check_circle,
                'Route API',
                const Color(0xFF34D399),
              ),
              _footerStatus(
                Icons.info_outline,
                'Nearby services pending',
                const Color(0xFF7DD3FC),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _footerStatus(
    IconData icon,
    String text,
    Color color,
  ) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 5),
        Text(
          text,
          style: const TextStyle(
            color: Color(0xFFE2E8F0),
            fontSize: 9,
          ),
        ),
      ],
    );
  }

  // ------------------------------------------------------------
  // REUSABLE HELPERS
  // ------------------------------------------------------------

  Widget _errorText(String text) {
    return Padding(
      padding: const EdgeInsets.only(top: 9),
      child: Text(
        text,
        style: const TextStyle(
          color: rose,
          fontSize: 10,
        ),
      ),
    );
  }

  Widget _errorBox(String text) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF1F2),
        border: Border.all(
          color: const Color(0xFFFECACA),
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: Color(0xFFBE123C),
          fontSize: 10,
        ),
      ),
    );
  }
}

class _MapStatus extends StatelessWidget {
  final String text;

  const _MapStatus({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 10,
        vertical: 7,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(9),
        boxShadow: const [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 5,
          ),
        ],
      ),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}
