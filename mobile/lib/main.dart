import 'package:flutter/material.dart';
import 'screens/splash_screen.dart';

void main() {
  runApp(const SafeTripApp());
}

class SafeTripApp extends StatelessWidget {
  const SafeTripApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SafeTrip Karnataka',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primaryColor: const Color(0xFF00A88F),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF00A88F),
          primary: const Color(0xFF00A88F),
          secondary: const Color(0xFFE11D48),
        ),
        useMaterial3: true,
        fontFamily: 'Roboto',
      ),
      home: const SplashScreen(),
    );
  }
}
