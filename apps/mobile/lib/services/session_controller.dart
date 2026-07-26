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

  void clearError() {
    if (error == null) return;
    error = null;
    notifyListeners();
  }

  void setError(String? message) {
    if (error == message) return;
    error = message;
    notifyListeners();
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

  Future<void> register(String name, String email, String password) async {
    error = null;
    notifyListeners();
    try {
      final session = await _api.register(name, email, password);
      profileName = session.profileName;
      isAuthenticated = true;
    } catch (e) {
      // Never reveal whether username or email collided.
      if (e is ApiException && e.statusCode == 409) {
        error =
            'This username or email is already in use. Sign in, or try different details.';
      } else {
        error = e.toString();
      }
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

  Future<void> setProfileName(String name) async {
    await _api.updateStoredProfileName(name);
    profileName = name;
    notifyListeners();
  }
}
