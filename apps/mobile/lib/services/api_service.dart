import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/models.dart';
import 'firebase_auth_service.dart';

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
    if (FirebaseAuthService.isConfigured) {
      await FirebaseAuthService.instance.signOut();
    }
    await _storage.deleteAll();
  }

  Future<String?> _resolveBearerToken() async {
    if (FirebaseAuthService.isConfigured) {
      return FirebaseAuthService.instance.getIdToken();
    }
    return _storage.read(key: _accessKey);
  }

  Future<AuthSession> firebaseSessionFromToken(String idToken) async {
    return _auth('/auth/firebase/session', body: {'idToken': idToken});
  }

  Future<AuthSession> firebaseLogin(String email, String password) async {
    await FirebaseAuthService.instance.signIn(email, password);
    final idToken = await FirebaseAuthService.instance.getIdToken();
    if (idToken == null) {
      throw ApiException('Login failed');
    }
    return firebaseSessionFromToken(idToken);
  }

  Future<AuthSession> firebaseRegister(
    String profileName,
    String email,
    String password,
  ) async {
    await FirebaseAuthService.instance.register(email, password);
    final idToken = await FirebaseAuthService.instance.getIdToken();
    if (idToken == null) {
      throw ApiException('Registration failed');
    }
    return _auth(
      '/auth/firebase/register',
      body: {
        'idToken': idToken,
        'profileName': profileName.trim(),
      },
    );
  }

  Future<void> firebaseForgotPassword(String email) async {
    await FirebaseAuthService.instance.sendPasswordResetEmail(email);
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

    var token = await _resolveBearerToken();
    var res = await send(token);
    if (res.statusCode == 401 && auth) {
      final refreshed = await _refresh();
      if (refreshed) {
        token = await _resolveBearerToken();
        res = await send(token);
      }
    }
    return _decode(res);
  }

  Future<bool> _refresh() async {
    if (FirebaseAuthService.isConfigured) {
      final token =
          await FirebaseAuthService.instance.getIdToken(forceRefresh: true);
      if (token != null) return true;
      await clearSession();
      return false;
    }
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

  /// Encodes list filters as comma-joined query values (matches web API client).
  static Map<String, String> encodeQuery(Map<String, Object?> raw) {
    final out = <String, String>{};
    raw.forEach((key, value) {
      if (value == null) return;
      if (value is String) {
        if (value.isEmpty) return;
        out[key] = value;
      } else if (value is Iterable) {
        final parts = value
            .map((e) => e.toString().trim())
            .where((e) => e.isNotEmpty)
            .toList();
        if (parts.isEmpty) return;
        out[key] = parts.join(',');
      } else {
        out[key] = value.toString();
      }
    });
    return out;
  }

  Future<List<Product>> listProducts({
    String? search,
    List<String> unit = const [],
    List<String> costSet = const [],
    List<String> packReady = const [],
    List<String> stockStatus = const [],
    int limit = 100,
  }) async {
    final data = await request(
      'GET',
      '/products',
      query: encodeQuery({
        'limit': '$limit',
        'search': search,
        'unit': unit,
        'costSet': costSet,
        'packReady': packReady,
        'stockStatus': stockStatus,
      }),
    );
    final items = (data as Map<String, dynamic>)['items'] as List<dynamic>;
    return items
        .map((e) => Product.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<Customer>> listCustomers({
    String? search,
    List<String> status = const [],
    List<String> companyType = const [],
    List<String> relationshipLevel = const [],
    List<String> partnershipStage = const [],
    int limit = 100,
  }) async {
    final data = await request(
      'GET',
      '/customers',
      query: encodeQuery({
        'limit': '$limit',
        'search': search,
        'status': status,
        'companyType': companyType,
        'relationshipLevel': relationshipLevel,
        'partnershipStage': partnershipStage,
      }),
    );
    final items = (data as Map<String, dynamic>)['items'] as List<dynamic>;
    return items
        .map((e) => Customer.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<PaginatedOrders> listOrders({
    int page = 1,
    int limit = 50,
    String? search,
    List<String> status = const [],
    List<String> paymentStatus = const [],
    List<String> billStatus = const [],
    List<String> invoiceStatus = const [],
    String? orderDateFrom,
    String? orderDateTo,
    String? shipmentDateFrom,
    String? shipmentDateTo,
    String? invoiceDateFrom,
    String? invoiceDateTo,
  }) async {
    final data = await request(
      'GET',
      '/orders',
      query: encodeQuery({
        'page': '$page',
        'limit': '$limit',
        'sort': 'date',
        'dir': 'desc',
        'search': search,
        'status': status,
        'paymentStatus': paymentStatus,
        'billStatus': billStatus,
        'invoiceStatus': invoiceStatus,
        'orderDateFrom': orderDateFrom,
        'orderDateTo': orderDateTo,
        'shipmentDateFrom': shipmentDateFrom,
        'shipmentDateTo': shipmentDateTo,
        'invoiceDateFrom': invoiceDateFrom,
        'invoiceDateTo': invoiceDateTo,
      }),
    );
    return PaginatedOrders.fromJson(data as Map<String, dynamic>);
  }

  Future<OrderSummary> getOrderSummary({
    String? search,
    List<String> status = const [],
    List<String> paymentStatus = const [],
    List<String> billStatus = const [],
    List<String> invoiceStatus = const [],
    String? orderDateFrom,
    String? orderDateTo,
    String? shipmentDateFrom,
    String? shipmentDateTo,
    String? invoiceDateFrom,
    String? invoiceDateTo,
  }) async {
    final data = await request(
      'GET',
      '/orders/summary',
      query: encodeQuery({
        'search': search,
        'status': status,
        'paymentStatus': paymentStatus,
        'billStatus': billStatus,
        'invoiceStatus': invoiceStatus,
        'orderDateFrom': orderDateFrom,
        'orderDateTo': orderDateTo,
        'shipmentDateFrom': shipmentDateFrom,
        'shipmentDateTo': shipmentDateTo,
        'invoiceDateFrom': invoiceDateFrom,
        'invoiceDateTo': invoiceDateTo,
      }),
    );
    return OrderSummary.fromJson(data as Map<String, dynamic>);
  }

  Future<List<WarehouseRestock>> listWarehouseRestocks({
    String? search,
    int limit = 100,
  }) async {
    final data = await request(
      'GET',
      '/warehouse',
      query: encodeQuery({
        'limit': '$limit',
        'search': search,
      }),
    );
    final items = (data as Map<String, dynamic>)['items'] as List<dynamic>;
    return items
        .map((e) => WarehouseRestock.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<WarehouseSale>> listWarehouseSales({
    String? search,
    int limit = 100,
  }) async {
    final data = await request(
      'GET',
      '/warehouse/sales',
      query: encodeQuery({
        'limit': '$limit',
        'search': search,
      }),
    );
    final items = (data as Map<String, dynamic>)['items'] as List<dynamic>;
    return items
        .map((e) => WarehouseSale.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  String _filenameFromDisposition(String? header, String fallback) {
    if (header == null || header.isEmpty) return fallback;
    final utf = RegExp(r"filename\*=UTF-8''([^;]+)", caseSensitive: false)
        .firstMatch(header);
    if (utf != null) {
      return Uri.decodeComponent(utf.group(1)!);
    }
    final plain =
        RegExp(r'filename="?([^";]+)"?', caseSensitive: false).firstMatch(header);
    if (plain != null) return plain.group(1)!;
    return fallback;
  }

  Future<({List<int> bytes, String filename})> downloadFeatureExport({
    required String entity,
    required String format,
  }) async {
    final uri = Uri.parse('${AppConfig.apiBaseUrl}/export').replace(
      queryParameters: {'entity': entity, 'format': format},
    );

    Future<http.Response> send(String? token) {
      final headers = <String, String>{};
      if (token != null) headers['Authorization'] = 'Bearer $token';
      return _client.get(uri, headers: headers);
    }

    var token = await accessToken;
    var res = await send(token);
    if (res.statusCode == 401) {
      final refreshed = await _refresh();
      if (refreshed) {
        token = await accessToken;
        res = await send(token);
      }
    }
    if (res.statusCode >= 400) {
      _decode(res);
    }

    final fallback = format == 'csv'
        ? 'umkm-hub-$entity.zip'
        : format == 'csv-unified'
            ? 'umkm-hub-$entity-unified.csv'
            : 'umkm-hub-$entity.json';
    return (
      bytes: res.bodyBytes,
      filename: _filenameFromDisposition(
        res.headers['content-disposition'],
        fallback,
      ),
    );
  }

  Future<Map<String, dynamic>> uploadFeatureImport({
    required String entity,
    required String format,
    required List<int> bytes,
    required String filename,
  }) async {
    final uri = Uri.parse('${AppConfig.apiBaseUrl}/import').replace(
      queryParameters: {'entity': entity, 'format': format},
    );

    Future<http.Response> send(String? token) async {
      final request = http.MultipartRequest('POST', uri);
      if (token != null) {
        request.headers['Authorization'] = 'Bearer $token';
      }
      request.files.add(
        http.MultipartFile.fromBytes('file', bytes, filename: filename),
      );
      final streamed = await _client.send(request);
      return http.Response.fromStream(streamed);
    }

    var token = await accessToken;
    var res = await send(token);
    if (res.statusCode == 401) {
      final refreshed = await _refresh();
      if (refreshed) {
        token = await accessToken;
        res = await send(token);
      }
    }
    final data = _decode(res);
    return data as Map<String, dynamic>;
  }

  Future<List<String>> translateBatch(List<String> texts, String to) async {
    final payload = {'to': to, 'texts': texts};

    Future<List<String>> parse(dynamic data) async {
      final map = data as Map<String, dynamic>;
      final list = map['translations'];
      if (list is! List) return List<String>.from(texts);
      return list.map((item) => item?.toString() ?? '').toList(growable: false);
    }

    try {
      return parse(
        await request('POST', '/translate/batch', body: payload),
      );
    } catch (_) {
      return parse(
        await request(
          'POST',
          '/translate/batch-public',
          body: payload,
          auth: false,
        ),
      );
    }
  }
}
