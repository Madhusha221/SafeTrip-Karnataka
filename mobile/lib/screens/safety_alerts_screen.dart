import 'package:flutter/material.dart';

class SafetyAlertsScreen extends StatelessWidget {
  const SafetyAlertsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Safety Insights & Alerts',
            style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Incident Reports for Tannirbhavi Beach',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),

          _alertCard(
            title: 'Harassment Report',
            location: 'Near parking area',
            timeAgo: '5 days ago',
            status: 'Verified',
            color: Colors.red,
          ),
          _alertCard(
            title: 'Suspicious Activity',
            location: 'Beach Road',
            timeAgo: '12 days ago',
            status: 'Verified',
            color: Colors.amber,
          ),
          _alertCard(
            title: 'Poor Lighting',
            location: 'Inner Road',
            timeAgo: '20 days ago',
            status: 'Pending',
            color: Colors.orange,
          ),

          const SizedBox(height: 20),
          const Text('Safety Tips for Women',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),

          _tipCheck('Prefer well-lit areas'),
          _tipCheck('Travel in groups (if possible)'),
          _tipCheck('Keep emergency contacts handy'),
          _tipCheck('Use live location sharing'),
        ],
      ),
    );
  }

  Widget _alertCard({
    required String title,
    required String location,
    required String timeAgo,
    required String status,
    required Color color,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.blueGrey.shade200),
      ),
      child: Row(
        children: [
          Icon(Icons.warning, color: color, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 13)),
                Text('$location • $timeAgo',
                    style: const TextStyle(color: Colors.grey, fontSize: 11)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              status,
              style: TextStyle(
                  color: color, fontSize: 10, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  Widget _tipCheck(String tip) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 18),
          const SizedBox(width: 8),
          Text(tip, style: const TextStyle(fontSize: 13)),
        ],
      ),
    );
  }
}
