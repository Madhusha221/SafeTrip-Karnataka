
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'auth_service.dart';

class PlaceService {
  static String get baseUrl => AuthService.baseUrl;

  static Future<Map<String, String>> _headers({
    bool authenticated = false,
  }) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };

    if (authenticated) {
      final token = await AuthService.getAccessToken();

      if (token == null || token.isEmpty) {
        throw Exception('Please sign in to continue.');
      }

      headers['Authorization'] = 'Bearer $token';
    }

    return headers;
  }

  static Future<Map<String, String>> _uploadHeaders() async {
    final token = await AuthService.getAccessToken();

    if (token == null || token.isEmpty) {
      throw Exception('Please sign in to upload.');
    }

    return {
      'Authorization': 'Bearer $token',
    };
  }

  static List<dynamic> _extractList(dynamic data) {
    if (data is List) return data;

    if (data is Map && data['results'] is List) {
      return data['results'];
    }

    return [];
  }

  static String _getError(String body) {
    try {
      final data = jsonDecode(body);

      if (data is Map) {
        return (data['detail'] ??
                data['error'] ??
                data['message'] ??
                data.toString())
            .toString();
      }

      return data.toString();
    } catch (_) {
      return 'Something went wrong. Please try again.';
    }
  }

  static void _checkResponse(http.Response response) {
    if (response.statusCode < 200 ||
        response.statusCode >= 300) {
      throw Exception(_getError(response.body));
    }
  }

  // ---------------- GET REVIEWS ----------------

  static Future<List<dynamic>> getReviews(int placeId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/reviews/?place=$placeId'),
      headers: await _headers(),
    );

    _checkResponse(response);
    return _extractList(jsonDecode(response.body));
  }

  // ---------------- ADD REVIEW ----------------

  static Future<void> addReview({
    required int placeId,
    required int rating,
    required String comment,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/reviews/'),
      headers: await _headers(authenticated: true),
      body: jsonEncode({
        'place': placeId,
        'rating': rating,
        'comment': comment,
      }),
    );

    _checkResponse(response);
  }

  // ---------------- DELETE REVIEW ----------------

  static Future<void> deleteReview(int reviewId) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/reviews/$reviewId/'),
      headers: await _headers(authenticated: true),
    );

    _checkResponse(response);
  }

  // ---------------- GET PHOTOS ----------------

  static Future<List<dynamic>> getPhotos(int placeId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/place-photos/?place=$placeId'),
      headers: await _headers(),
    );

    _checkResponse(response);
    return _extractList(jsonDecode(response.body));
  }

  // ---------------- UPLOAD PHOTO ----------------

  static Future<void> uploadPhoto({
    required int placeId,
    required File image,
    String caption = '',
  }) async {
    final request = http.MultipartRequest(
      'POST',
      Uri.parse('$baseUrl/place-photos/'),
    );

    request.headers.addAll(await _uploadHeaders());

    request.fields['place'] = placeId.toString();
    request.fields['caption'] = caption;

    request.files.add(
      await http.MultipartFile.fromPath(
        'image',
        image.path,
      ),
    );

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(
      streamedResponse,
    );

    _checkResponse(response);
  }

  // ---------------- DELETE PHOTO ----------------

  static Future<void> deletePhoto(int photoId) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/place-photos/$photoId/'),
      headers: await _headers(authenticated: true),
    );

    _checkResponse(response);
  }

  // ---------------- GET INCIDENTS ----------------

  static Future<List<dynamic>> getIncidents(int placeId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/incidents/?place=$placeId'),
      headers: await _headers(),
    );

    _checkResponse(response);
    return _extractList(jsonDecode(response.body));
  }

  // ---------------- REPORT INCIDENT ----------------

  static Future<void> addIncident({
    required int placeId,
    required String title,
    required String description,
    required String severity,
    required String incidentType,
    required int districtId,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/incidents/'),
      headers: await _headers(authenticated: true),
      body: jsonEncode({
        'place': placeId,
        'district': districtId,
        'title': title,
        'description': description,
        'severity': severity,
        'incident_type': incidentType,
      }),
    );

    _checkResponse(response);
  }

  // ---------------- UPLOAD INCIDENT EVIDENCE ----------------

  static Future<void> uploadIncidentEvidence({
    required int incidentId,
    required List<File> images,
    String caption = '',
  }) async {
    final request = http.MultipartRequest(
      'POST',
      Uri.parse('$baseUrl/incidents/$incidentId/evidence-photos/'),
    );

    request.headers.addAll(await _uploadHeaders());

    request.fields['caption'] = caption;

    for (final image in images) {
      request.files.add(
        await http.MultipartFile.fromPath(
          'images',
          image.path,
        ),
      );
    }

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(
      streamedResponse,
    );

    _checkResponse(response);
  }
}
