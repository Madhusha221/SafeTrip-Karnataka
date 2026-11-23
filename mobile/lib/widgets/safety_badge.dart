import 'package:flutter/material.dart';

class SafetyBadge extends StatelessWidget {
  final double score;

  const SafetyBadge({Key? key, required this.score}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    Color badgeColor = score >= 4.5
        ? const Color(0xFF10B981)
        : score >= 3.5
            ? const Color(0xFFF59E0B)
            : const Color(0xFFEF4444);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: badgeColor.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: badgeColor, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.verified_user, size: 12, color: badgeColor),
          const SizedBox(width: 4),
          Text(
            '★ ${score.toStringAsFixed(1)} Safe',
            style: TextStyle(
              color: badgeColor,
              fontSize: 10,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
