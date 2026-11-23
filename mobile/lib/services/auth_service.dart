
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  // Django backend IP address
static const String baseUrl = 'http://192.168.195.174:8000/api';
  static Future<Map<String, dynamic>> login({
    required String username,
    required String password,
  }) async {
    final url = Uri.parse('$baseUrl/auth/login/');

    try {
      final response = await http
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'username': username.trim(),
              'password': password,
            }),
          )
          .timeout(const Duration(seconds: 20));

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        await _saveTokens(data);

        return {
          'success': true,
          'message': data['message'] ?? 'Login successful',
          'user': data['user'],
        };
      }

      return {
        'success': false,
        'message': _errorMessage(data),
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Unable to connect to server. Check your network connection.',
      };
    }
  }

  // REGISTER
  // Registration creates the account but does NOT log the user in.
  static Future<Map<String, dynamic>> register({
    required String username,
    required String email,
    required String firstName,
    required String lastName,
    required String password,
    required String confirmPassword,
  }) async {
    final url = Uri.parse('$baseUrl/auth/register/');

    try {
      final response = await http
          .post(
            url,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'username': username.trim(),
              'email': email.trim(),
              'first_name': firstName.trim(),
              'last_name': lastName.trim(),
              'password': password,
              'confirm_password': confirmPassword,
            }),
          )
          .timeout(const Duration(seconds: 20));

      final data = jsonDecode(response.body);

      if (response.statusCode == 201) {
        // Do not save tokens here.
        // User must sign in after registration.

        return {
          'success': true,
          'message': data['message'] ?? 'Registration successful',
          'user': data['user'],
        };
      }

      return {
        'success': false,
        'message': _errorMessage(data),
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Unable to connect to server. Check your network connection.',
      };
    }
  }

  // SAVE LOGIN TOKENS
  static Future<void> _saveTokens(Map<String, dynamic> data) async {
    final prefs = await SharedPreferences.getInstance();

    if (data['access'] != null) {
      await prefs.setString('access_token', data['access']);
    }

    if (data['refresh'] != null) {
      await prefs.setString('refresh_token', data['refresh']);
    }
  }

  // GET ACCESS TOKEN
  static Future<String?> getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('access_token');
  }

  // GET CURRENT LOGGED-IN USER
  static Future<Map<String, dynamic>?> getCurrentUser() async {
    final token = await getAccessToken();

    if (token == null) return null;

    try {
      final response = await http.get(
        Uri.parse('$baseUrl/auth/me/'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 20));

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (e) {
      return null;
    }

    return null;
  }

  // LOGOUT
  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    await prefs.remove('refresh_token');
  }

  // FORMAT BACKEND ERRORS
  static String _errorMessage(dynamic data) {
    if (data is Map) {
      if (data['error'] != null) {
        return data['error'].toString();
      }

      if (data['detail'] != null) {
        return data['detail'].toString();
      }

      if (data['message'] != null) {
        return data['message'].toString();
      }

      return data.entries.map((entry) {
        return '${entry.key}: ${entry.value}';
      }).join('\n');
    }

    return 'Something went wrong. Please try again.';
  }
}
