import 'package:flutter/foundation.dart';

import 'api_service.dart';

class SessionController extends ChangeNotifier {
  SessionController(this._api) {
    _bootstrap();
  }

  final ApiService _api;
  bool loading = true;
  bool isAuthenticated = false;
  String? profileName;
  String? error;

  Future<void> _bootstrap() async {
    try {
      final token = await _api.accessToken;
      profileName = await _api.profileName;
      isAuthenticated = token != null && token.isNotEmpty;
    } catch (e, st) {
      debugPrint('Session bootstrap failed: $e\n$st');
      isAuthenticated = false;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> login(String name, String password) async {
    error = null;
    notifyListeners();
    try {
      final session = await _api.login(name, password);
      profileName = session.profileName;
      isAuthenticated = true;
    } catch (e) {
      error = e.toString();
      isAuthenticated = false;
    }
    notifyListeners();
  }

  Future<void> register(String name, String password) async {
    error = null;
    notifyListeners();
    try {
      final session = await _api.register(name, password);
      profileName = session.profileName;
      isAuthenticated = true;
    } catch (e) {
      error = e.toString();
      isAuthenticated = false;
    }
    notifyListeners();
  }

  Future<void> logout() async {
    await _api.clearSession();
    isAuthenticated = false;
    profileName = null;
    notifyListeners();
  }
}
