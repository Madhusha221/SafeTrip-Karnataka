
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../services/auth_service.dart';
import 'places_screen.dart';

class SelectDestinationScreen extends StatefulWidget {
  const SelectDestinationScreen({Key? key}) : super(key: key);

  @override
  State<SelectDestinationScreen> createState() =>
      _SelectDestinationScreenState();
}

class _SelectDestinationScreenState extends State<SelectDestinationScreen> {
  static const Color teal = Color(0xFF0D9488);
  static const Color navy = Color(0xFF0F172A);
  static const Color background = Color(0xFFF8FAFC);

  List<dynamic> districts = [];

  String fromLocation = 'Bengaluru';
  String toLocation = 'Mangaluru';
  DateTime? travelDate;

  bool isLoading = true;
  String districtError = '';

  @override
  void initState() {
    super.initState();
    loadDistricts();
  }

  Future<void> loadDistricts() async {
    setState(() {
      isLoading = true;
      districtError = '';
    });

    try {
      final response = await http
          .get(Uri.parse('${AuthService.baseUrl}/districts/'))
          .timeout(const Duration(seconds: 15));

      if (response.statusCode != 200) {
        throw Exception('Failed to load districts');
      }

      final data = jsonDecode(response.body);

      final List<dynamic> districtList = data is List
          ? data
          : (data['results'] as List? ?? []);

      if (!mounted) return;

      setState(() {
        districts = districtList;

        final names = districtList
            .map((district) => district['name'].toString())
            .toList();

        if (names.isNotEmpty) {
          fromLocation =
              names.contains('Bengaluru') ? 'Bengaluru' : names.first;

          toLocation = names.contains(toLocation)
              ? toLocation
              : names.first;
        }
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        districtError = 'Unable to load Karnataka districts.';
      });
    } finally {
      if (mounted) {
        setState(() => isLoading = false);
      }
    }
  }

  Future<void> selectTravelDate() async {
    final selected = await showDatePicker(
      context: context,
      initialDate: travelDate ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(primary: teal),
          ),
          child: child!,
        );
      },
    );

    if (selected != null) {
      setState(() => travelDate = selected);
    }
  }

  // Pass the selected destination to the Places screen.
  void findPlaces() {
    if (toLocation.isEmpty) return;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PlacesScreen(
          selectedDistrict: toLocation,
        ),
      ),
    );
  }

  Widget stepItem(int number, String label, {bool active = false}) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 32,
          height: 32,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: active ? teal : const Color(0xFFF1F5F9),
          ),
          child: Text(
            '$number',
            style: TextStyle(
              color: active ? Colors.white : Colors.blueGrey,
              fontWeight: FontWeight.bold,
              fontSize: 13,
            ),
          ),
        ),
        const SizedBox(width: 7),
        Text(
          label,
          style: TextStyle(
            color: active ? const Color(0xFF0F766E) : Colors.blueGrey,
            fontWeight: active ? FontWeight.bold : FontWeight.w500,
            fontSize: 11,
          ),
        ),
      ],
    );
  }

  Widget formLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 7),
      child: Text(
        label,
        style: const TextStyle(
          color: Color(0xFF334155),
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  InputDecoration fieldDecoration({Widget? suffixIcon}) {
    return InputDecoration(
      filled: true,
      fillColor: const Color(0xFFF8FAFC),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: 12,
        vertical: 14,
      ),
      suffixIcon: suffixIcon,
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: teal, width: 1.5),
      ),
    );
  }

  Widget districtDropdown({
    required String value,
    required ValueChanged<String?> onChanged,
  }) {
    final names = districts
        .map((district) => district['name'].toString())
        .toSet()
        .toList();

    return DropdownButtonFormField<String>(
      value: names.contains(value) ? value : null,
      isExpanded: true,
      decoration: fieldDecoration(),
      style: const TextStyle(
        color: navy,
        fontSize: 13,
        fontWeight: FontWeight.bold,
      ),
      items: names.map((name) {
        return DropdownMenuItem(
          value: name,
          child: Text(name, overflow: TextOverflow.ellipsis),
        );
      }).toList(),
      onChanged: isLoading ? null : onChanged,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: navy, size: 19),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Plan Your Trip',
          style: TextStyle(
            color: navy,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 32),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 800),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Page heading
                  Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 7,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0FDFA),
                          borderRadius: BorderRadius.circular(30),
                          border: Border.all(
                            color: const Color(0xFF99F6E4),
                          ),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.navigation, size: 15, color: teal),
                            SizedBox(width: 7),
                            Text(
                              'Smart Trip Planner',
                              style: TextStyle(
                                color: teal,
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 13),
                      const Text(
                        'Plan Your Trip',
                        style: TextStyle(
                          color: navy,
                          fontSize: 29,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 7),
                      const Text(
                        'Discover real tourist places and safety information\nacross Karnataka.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 28),

                  // Progress stepper
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 17,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        stepItem(1, 'Select', active: true),
                        const Expanded(
                          child: Divider(
                            indent: 7,
                            endIndent: 7,
                            color: Color(0xFFE2E8F0),
                          ),
                        ),
                        stepItem(2, 'Explore'),
                        const Expanded(
                          child: Divider(
                            indent: 7,
                            endIndent: 7,
                            color: Color(0xFFE2E8F0),
                          ),
                        ),
                        stepItem(3, 'Plan'),
                        const Expanded(
                          child: Divider(
                            indent: 7,
                            endIndent: 7,
                            color: Color(0xFFE2E8F0),
                          ),
                        ),
                        stepItem(4, 'Confirm'),
                      ],
                    ),
                  ),

                  const SizedBox(height: 22),

                  // District selection form
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.06),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        formLabel('From'),
                        districtDropdown(
                          value: fromLocation,
                          onChanged: (value) {
                            if (value != null) {
                              setState(() => fromLocation = value);
                            }
                          },
                        ),
                        const SizedBox(height: 17),

                        formLabel('Destination'),
                        districtDropdown(
                          value: toLocation,
                          onChanged: (value) {
                            if (value != null) {
                              setState(() => toLocation = value);
                            }
                          },
                        ),
                        const SizedBox(height: 17),

                        formLabel('Travel Date'),
                        InkWell(
                          onTap: selectTravelDate,
                          borderRadius: BorderRadius.circular(12),
                          child: InputDecorator(
                            decoration: fieldDecoration(
                              suffixIcon: const Icon(
                                Icons.calendar_month,
                                color: Colors.blueGrey,
                                size: 19,
                              ),
                            ),
                            child: Text(
                              travelDate == null
                                  ? 'Select travel date'
                                  : '${travelDate!.day.toString().padLeft(2, '0')}/${travelDate!.month.toString().padLeft(2, '0')}/${travelDate!.year}',
                              style: TextStyle(
                                color: travelDate == null
                                    ? Colors.blueGrey
                                    : navy,
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),

                        if (districtError.isNotEmpty) ...[
                          const SizedBox(height: 14),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEF2F2),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: const Color(0xFFFECACA),
                              ),
                            ),
                            child: Text(
                              districtError,
                              style: const TextStyle(
                                color: Color(0xFFB91C1C),
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ],

                        const SizedBox(height: 22),

                        SizedBox(
                          height: 51,
                          child: ElevatedButton(
                            onPressed: isLoading ? null : findPlaces,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: teal,
                              disabledBackgroundColor:
                                  const Color(0xFFCBD5E1),
                              foregroundColor: Colors.white,
                              elevation: 5,
                              shadowColor: teal.withOpacity(0.3),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            child: isLoading
                                ? const Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      SizedBox(
                                        width: 17,
                                        height: 17,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      ),
                                      SizedBox(width: 10),
                                      Text(
                                        'Loading Districts...',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13,
                                        ),
                                      ),
                                    ],
                                  )
                                : const Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        'Find Tourist Places',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13,
                                        ),
                                      ),
                                      SizedBox(width: 9),
                                      Icon(Icons.arrow_forward, size: 18),
                                    ],
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 18),

                  // Selected destination
                  if (!isLoading && toLocation.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 42,
                            height: 42,
                            decoration: const BoxDecoration(
                              color: Color(0xFFF0FDFA),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.location_on,
                              color: teal,
                            ),
                          ),
                          const SizedBox(width: 13),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Selected destination',
                                style: TextStyle(
                                  color: Color(0xFF64748B),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                toLocation,
                                style: const TextStyle(
                                  color: navy,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                  const SizedBox(height: 18),

                  // Travel safety tip
                  Container(
                    padding: const EdgeInsets.all(17),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF1F2),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: const Color(0xFFFBCFE8),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: const BoxDecoration(
                                color: Color(0xFFF43F5E),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.auto_awesome,
                                color: Colors.white,
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 12),
                            const Expanded(
                              child: Text(
                                'Travel Safety Tip',
                                style: TextStyle(
                                  color: navy,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          "Explore real places first, then use SafeTrip's safety information to plan your journey.",
                          style: TextStyle(
                            color: Color(0xFF475569),
                            fontSize: 12,
                            height: 1.5,
                          ),
                        ),
                        const SizedBox(height: 15),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                    'Safety Brief will be connected next.',
                                  ),
                                ),
                              );
                            },
                            icon: const Icon(Icons.description, size: 17),
                            label: const Text(
                              'Get Personalized Safety Brief',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFE11D48),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 13,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              elevation: 2,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
