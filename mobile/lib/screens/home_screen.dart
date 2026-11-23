
import 'package:flutter/material.dart';

import 'select_destination_screen.dart';
import 'places_screen.dart';
import 'women_traveler_screen.dart';
import 'route_map_screen.dart';
import 'safety_alerts_screen.dart';
import 'community_screen.dart';
import 'splash_screen.dart';
import '../widgets/chatbot_widget.dart';
import '../services/auth_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _searchController =
      TextEditingController();

  static const Color teal = Color(0xFF00A88F);
  static const Color navy = Color(0xFF0F172A);
  static const Color background = Color(0xFFF8FAFC);

  Map<String, dynamic>? currentUser;
  bool isLoadingUser = true;
  bool isLoggingOut = false;

  final List<Map<String, dynamic>> destinations = [
    {
      'name': 'Mangaluru',
      'category': 'Beaches',
      'rating': '4.7',
      'reviews': '1.2k',
      'image':
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      'color': Color(0xFFE0F2FE),
      'textColor': Color(0xFF075985),
    },
    {
      'name': 'Mysuru',
      'category': 'Heritage',
      'rating': '4.8',
      'reviews': '3.1k',
      'image':
          'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=800&q=80',
      'color': Color(0xFFFEF3C7),
      'textColor': Color(0xFF92400E),
    },
    {
      'name': 'Coorg',
      'category': 'Hill Station',
      'rating': '4.6',
      'reviews': '980',
      'image':
          'https://images.unsplash.com/photo-1434394354979-a235cd36269d?auto=format&fit=crop&w=800&q=80',
      'color': Color(0xFFD1FAE5),
      'textColor': Color(0xFF065F46),
    },
    {
      'name': 'Hampi',
      'category': 'UNESCO',
      'rating': '4.7',
      'reviews': '920',
      'image':
          'https://images.unsplash.com/photo-1627894483216-2138af692e32?auto=format&fit=crop&w=800&q=80',
      'color': Color(0xFFEDE9FE),
      'textColor': Color(0xFF5B21B6),
    },
  ];

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final user = await AuthService.getCurrentUser();

    if (!mounted) return;

    setState(() {
      currentUser = user;
      isLoadingUser = false;
    });
  }

  String get _displayName {
    final firstName =
        currentUser?['first_name']?.toString().trim() ?? '';
    final lastName =
        currentUser?['last_name']?.toString().trim() ?? '';

    final fullName = '$firstName $lastName'.trim();

    if (fullName.isNotEmpty) return fullName;

    return currentUser?['username']?.toString() ?? 'My Account';
  }

  String get _accountIdentifier {
    final username =
        currentUser?['username']?.toString().trim() ?? '';

    if (username.isNotEmpty) return '@$username';

    return currentUser?['email']?.toString() ?? '';
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _open(Widget screen) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => screen),
    );
  }

  void _searchPlaces() {
    _open(const SelectDestinationScreen());
  }

  Future<void> _logout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text(
          'Are you sure you want to sign out?',
        ),
        actions: [
          TextButton(
            onPressed: () =>
                Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () =>
                Navigator.pop(dialogContext, true),
            child: const Text(
              'Sign Out',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;

    setState(() => isLoggingOut = true);

    await AuthService.logout();

    if (!mounted) return;

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => const SplashScreen(),
      ),
      (route) => false,
    );
  }

  Widget _buildAccountMenu() {
    return PopupMenuButton<String>(
      tooltip: 'Account',
      onSelected: (value) {
        if (value == 'logout') {
          _logout();
        }
      },
      offset: const Offset(0, 52),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(15),
      ),
      itemBuilder: (context) => [
        PopupMenuItem<String>(
          enabled: false,
          child: SizedBox(
            width: 190,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _displayName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: navy,
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (_accountIdentifier.isNotEmpty) ...[
                  const SizedBox(height: 5),
                  Text(
                    _accountIdentifier,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.blueGrey,
                      fontSize: 12,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
        const PopupMenuDivider(),
        const PopupMenuItem<String>(
          value: 'logout',
          child: Row(
            children: [
              Icon(
                Icons.logout,
                color: Color(0xFFE11D48),
                size: 20,
              ),
              SizedBox(width: 10),
              Text(
                'Sign Out',
                style: TextStyle(
                  color: Color(0xFFE11D48),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 9,
        ),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: const Color(0xFFE2E8F0),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 17,
              backgroundColor: teal.withOpacity(0.13),
              child: const Icon(
                Icons.person_outline,
                color: teal,
                size: 21,
              ),
            ),
            const SizedBox(width: 8),
            if (isLoadingUser)
              const SizedBox(
                width: 45,
                height: 14,
                child: LinearProgressIndicator(
                  color: teal,
                  backgroundColor: Color(0xFFE2E8F0),
                ),
              )
            else
              ConstrainedBox(
                constraints: const BoxConstraints(
                  maxWidth: 90,
                ),
                child: Text(
                  _displayName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: navy,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            const SizedBox(width: 4),
            const Icon(
              Icons.keyboard_arrow_down,
              size: 17,
              color: Colors.blueGrey,
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: background,
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(),
              _buildHero(),
              _buildQuickActions(),
              _buildDestinations(),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
      floatingActionButton: const ChatbotWidget(),
      floatingActionButtonLocation:
          FloatingActionButtonLocation.endFloat,
      bottomNavigationBar: _buildBottomNavigation(),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 16, 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: teal.withOpacity(0.12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.explore,
              color: teal,
              size: 27,
            ),
          ),
          const SizedBox(width: 10),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'SafeTrip Karnataka',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                    color: navy,
                  ),
                ),
                Text(
                  'Travel safely. Explore freely.',
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.blueGrey,
                  ),
                ),
              ],
            ),
          ),
          _buildAccountMenu(),
        ],
      ),
    );
  }

  Widget _buildHero() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 20),
      height: 390,
      width: double.infinity,
      decoration: BoxDecoration(
        color: navy,
        borderRadius: BorderRadius.circular(25),
        image: const DecorationImage(
          image: NetworkImage(
            'https://images.unsplash.com/photo-1600100397608-f010e423b971?auto=format&fit=crop&w=1200&q=80',
          ),
          fit: BoxFit.cover,
          opacity: 0.38,
        ),
      ),
      child: Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(25),
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              navy.withOpacity(0.35),
              navy.withOpacity(0.92),
            ],
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 9,
              ),
              decoration: BoxDecoration(
                color: teal.withOpacity(0.22),
                borderRadius: BorderRadius.circular(30),
                border: Border.all(
                  color: teal.withOpacity(0.6),
                ),
              ),
              child: const Text(
                '✦  TRAVEL SAFETY & TOURIST INTELLIGENCE',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Color(0xFF99F6E4),
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 25),
            const Text(
              'Explore Karnataka',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white,
                fontSize: 30,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Beautiful Places.\nSafer Journeys.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Color(0xFF2DD4BF),
                fontSize: 25,
                height: 1.2,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Plan your trips, get real safety insights, '
              'and explore Karnataka with confidence.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Color(0xFFE2E8F0),
                fontSize: 13,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 25),
            TextField(
              controller: _searchController,
              onSubmitted: (_) => _searchPlaces(),
              style: const TextStyle(color: navy),
              decoration: InputDecoration(
                hintText: 'Search destinations...',
                hintStyle: const TextStyle(
                  color: Colors.blueGrey,
                  fontSize: 13,
                ),
                prefixIcon: const Icon(
                  Icons.search,
                  color: Colors.blueGrey,
                ),
                suffixIcon: IconButton(
                  onPressed: _searchPlaces,
                  icon: const Icon(
                    Icons.arrow_forward,
                    color: Colors.white,
                  ),
                  style: IconButton.styleFrom(
                    backgroundColor: teal,
                  ),
                ),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(
                  vertical: 14,
                  horizontal: 12,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(15),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Explore & Stay Safe',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
              color: navy,
            ),
          ),
          const SizedBox(height: 14),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.45,
            children: [
              _actionCard(
                'Plan Your Trip',
                'Custom itineraries & safety briefs',
                Icons.navigation_outlined,
                const Color(0xFF0D9488),
                () => _open(const SelectDestinationScreen()),
              ),
              _actionCard(
                'Safety Map',
                'Compare safe vs caution routes',
                Icons.map_outlined,
                const Color(0xFF0284C7),
                () => _open(const RouteMapScreen()),
              ),
              _actionCard(
                'Report Incident',
                'Community safety alerts',
                Icons.warning_amber_rounded,
                const Color(0xFFF59E0B),
                () => _open(const SafetyAlertsScreen()),
              ),
              _actionCard(
                'Women Traveler Mode',
                'Solo travel safety information',
                Icons.favorite_border,
                const Color(0xFFE11D48),
                () => _open(const WomenTravelerScreen()),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _actionCard(
    String title,
    String subtitle,
    IconData icon,
    Color color,
    VoidCallback onTap,
  ) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.16),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Icon(icon, color: Colors.white, size: 25),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDestinations() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 28, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Popular Destinations',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: navy,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Top safety rated tourist hubs in Karnataka',
                      style: TextStyle(
                        color: Colors.blueGrey,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              TextButton(
                onPressed: () => _open(const PlacesScreen()),
                child: const Text(
                  'View All →',
                  style: TextStyle(
                    color: teal,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 260,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: destinations.length,
              separatorBuilder: (_, __) =>
                  const SizedBox(width: 13),
              itemBuilder: (context, index) {
                return _destinationCard(destinations[index]);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _destinationCard(
    Map<String, dynamic> destination,
  ) {
    return InkWell(
      onTap: () => _open(const PlacesScreen()),
      borderRadius: BorderRadius.circular(18),
      child: Container(
        width: 230,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: const Color(0xFFE2E8F0),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(18),
                  ),
                  child: Image.network(
                    destination['image'],
                    height: 145,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      height: 145,
                      color: const Color(0xFFE2E8F0),
                      child: const Icon(
                        Icons.image_not_supported,
                      ),
                    ),
                  ),
                ),
                Positioned(
                  top: 12,
                  left: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: destination['color'],
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      destination['category'],
                      style: TextStyle(
                        color: destination['textColor'],
                        fontWeight: FontWeight.bold,
                        fontSize: 10,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment:
                        MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          destination['name'],
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                            color: navy,
                          ),
                        ),
                      ),
                      const Icon(
                        Icons.star,
                        size: 15,
                        color: Color(0xFFF59E0B),
                      ),
                      Text(
                        destination['rating'],
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Row(
                    children: [
                      Icon(
                        Icons.shield_outlined,
                        color: Color(0xFF059669),
                        size: 15,
                      ),
                      SizedBox(width: 5),
                      Text(
                        'High Safety Zone',
                        style: TextStyle(
                          color: Color(0xFF059669),
                          fontWeight: FontWeight.bold,
                          fontSize: 11,
                        ),
                      ),
                      Spacer(),
                      Text(
                        'Explore →',
                        style: TextStyle(
                          color: teal,
                          fontWeight: FontWeight.bold,
                          fontSize: 11,
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

  void _handleBottomNavigation(int index) {
    switch (index) {
      case 0:
        break;
      case 1:
        _open(const SelectDestinationScreen());
        break;
      case 2:
        _open(const PlacesScreen());
        break;
      case 3:
        _open(const RouteMapScreen());
        break;
      case 4:
        _open(const CommunityScreen());
        break;
    }
  }

  Widget _buildBottomNavigation() {
    return BottomNavigationBar(
      type: BottomNavigationBarType.fixed,
      currentIndex: 0,
      selectedItemColor: teal,
      unselectedItemColor: Colors.blueGrey,
      backgroundColor: Colors.white,
      selectedFontSize: 11,
      unselectedFontSize: 10,
      showUnselectedLabels: true,
      elevation: 12,
      onTap: _handleBottomNavigation,
      items: const [
        BottomNavigationBarItem(
          icon: Icon(Icons.home_outlined),
          activeIcon: Icon(Icons.home),
          label: 'Home',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.navigation_outlined),
          activeIcon: Icon(Icons.navigation),
          label: 'Plan Trip',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.explore_outlined),
          activeIcon: Icon(Icons.explore),
          label: 'Explore',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.route_outlined),
          activeIcon: Icon(Icons.route),
          label: 'Safe Routes',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.people_outline),
          activeIcon: Icon(Icons.people),
          label: 'Community',
        ),
      ],
    );
  }
}
