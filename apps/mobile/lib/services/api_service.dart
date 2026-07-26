import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/models.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});
  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiService {
  ApiService({FlutterSecureStorage? storage, http.Client? client})
      : _storage = storage ?? const FlutterSecureStorage(),
        _client = client ?? http.Client();

  final FlutterSecureStorage _storage;
  final http.Client _client;

  static const _accessKey = 'umkm_access';
  static const _refreshKey = 'umkm_refresh';
  static const _profileNameKey = 'umkm_profile_name';

  Future<String?> get accessToken => _storage.read(key: _accessKey);
  Future<String?> get profileName => _storage.read(key: _profileNameKey);

  Future<void> updateStoredProfileName(String profileName) async {
    await _storage.write(key: _profileNameKey, value: profileName);
  }

  Future<void> _saveSession(AuthSession session) async {
    await _storage.write(key: _accessKey, value: session.accessToken);
    await _storage.write(key: _refreshKey, value: session.refreshToken);
    await _storage.write(key: _profileNameKey, value: session.profileName);
  }

  Future<void> clearSession() async {
    await _storage.deleteAll();
  }

  Future<AuthSession> register(
    String profileName,
    String email,
    String password,
  ) async {
    return _auth(
      '/auth/register',
      body: {
        'profileName': profileName,
        'email': email.trim().toLowerCase(),
        'password': password,
      },
    );
  }

  /// Combined check — never reveals whether username or email collided.
  Future<Map<String, dynamic>> checkRegistrationAvailability(
    String profileName,
    String email,
  ) async {
    final data = await request(
      'POST',
      '/auth/register-availability',
      body: {
        'profileName': profileName.trim(),
        'email': email.trim().toLowerCase(),
      },
      auth: false,
    );
    return data as Map<String, dynamic>;
  }

  Future<AuthSession> login(String login, String password) async {
    return _auth(
      '/auth/login',
      body: {'login': login, 'password': password},
    );
  }

  Future<AuthSession> _auth(
    String path, {
    required Map<String, dynamic> body,
  }) async {
    final res = await _client.post(
      Uri.parse('${AppConfig.apiBaseUrl}$path'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    final data = _decode(res);
    final session = AuthSession.fromJson(data as Map<String, dynamic>);
    await _saveSession(session);
    return session;
  }

  Future<dynamic> request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
    bool auth = true,
  }) async {
    var uri = Uri.parse('${AppConfig.apiBaseUrl}$path');
    if (query != null && query.isNotEmpty) {
      uri = uri.replace(queryParameters: query);
    }

    Future<http.Response> send(String? token) {
      final headers = <String, String>{'Content-Type': 'application/json'};
      if (auth && token != null) headers['Authorization'] = 'Bearer $token';
      final encoded = body == null ? null : jsonEncode(body);
      switch (method) {
        case 'POST':
          return _client.post(uri, headers: headers, body: encoded);
        case 'PATCH':
          return _client.patch(uri, headers: headers, body: encoded);
        case 'DELETE':
          return _client.delete(uri, headers: headers);
        default:
          return _client.get(uri, headers: headers);
      }
    }

    var token = await accessToken;
    var res = await send(token);
    if (res.statusCode == 401 && auth) {
      final refreshed = await _refresh();
      if (refreshed) {
        token = await accessToken;
        res = await send(token);
      }
    }
    return _decode(res);
  }

  Future<bool> _refresh() async {
    final refresh = await _storage.read(key: _refreshKey);
    if (refresh == null) return false;
    try {
      final res = await _client.post(
        Uri.parse('${AppConfig.apiBaseUrl}/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refresh}),
      );
      if (res.statusCode >= 400) return false;
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      await _saveSession(AuthSession.fromJson(data));
      return true;
    } catch (_) {
      return false;
    }
  }

  dynamic _decode(http.Response res) {
    if (res.statusCode >= 400) {
      String message = 'Something went wrong—please try again.';
      try {
        final body = jsonDecode(res.body);
        if (body is Map && body['message'] != null) {
          final m = body['message'];
          message = m is List ? m.join(', ') : m.toString();
        }
      } catch (_) {}
      throw ApiException(message, statusCode: res.statusCode);
    }
    if (res.body.isEmpty) return null;
    return jsonDecode(res.body);
  }

  Future<Map<String, dynamic>> lookupPostal({
    required String country,
    required String postalCode,
  }) async {
    final data = await request(
      'GET',
      '/geo/postal-lookup',
      query: {
        'country': country,
        'postalCode': postalCode,
      },
    );
    return data as Map<String, dynamic>;
  }

  Future<List<Product>> listProducts() async {
    final data = await request('GET', '/products', query: {'limit': '100'});
    final items = (data as Map<String, dynamic>)['items'] as List<dynamic>;
    return items
        .map((e) => Product.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<Customer>> listCustomers() async {
    final data = await request('GET', '/customers', query: {'limit': '100'});
    final items = (data as Map<String, dynamic>)['items'] as List<dynamic>;
    return items
        .map((e) => Customer.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<PaginatedOrders> listOrders({int page = 1, int limit = 50}) async {
    final data = await request(
      'GET',
      '/orders',
      query: {
        'page': '$page',
        'limit': '$limit',
        'sort': 'date',
        'dir': 'desc',
      },
    );
    return PaginatedOrders.fromJson(data as Map<String, dynamic>);
  }

  Future<OrderSummary> getOrderSummary() async {
    final data = await request('GET', '/orders/summary');
    return OrderSummary.fromJson(data as Map<String, dynamic>);
  }

  Future<List<WarehouseRestock>> listWarehouseRestocks() async {
    final data = await request('GET', '/warehouse', query: {'limit': '100'});
    final items = (data as Map<String, dynamic>)['items'] as List<dynamic>;
    return items
        .map((e) => WarehouseRestock.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
