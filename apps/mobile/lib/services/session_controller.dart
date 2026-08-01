import 'package:flutter/foundation.dart';

import '../config.dart';
import '../models/models.dart';
import 'api_service.dart';
import 'firebase_auth_service.dart';

class SessionController extends ChangeNotifier {
  SessionController(this._api) {
    _bootstrap();
  }

  final ApiService _api;
  bool loading = true;
  bool isAuthenticated = false;
  String? profileName;
  String? error;

  bool get firebaseEnabled => AppConfig.firebaseConfigured;

  Future<void> _bootstrap() async {
    try {
      if (FirebaseAuthService.isConfigured) {
        final user = FirebaseAuthService.instance.currentUser;
        if (user != null) {
          final idToken = await FirebaseAuthService.instance.getIdToken();
          if (idToken != null) {
            try {
              final session = await _api.firebaseSessionFromToken(idToken);
              profileName = session.profileName;
              isAuthenticated = true;
            } catch (_) {
              isAuthenticated = false;
            }
          }
        } else {
          isAuthenticated = false;
        }
      } else {
        final token = await _api.accessToken;
        profileName = await _api.profileName;
        isAuthenticated = token != null && token.isNotEmpty;
      }
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

  Future<void> login(String login, String password) async {
    error = null;
    notifyListeners();
    try {
      final AuthSession session;
      if (FirebaseAuthService.isConfigured) {
        session = await _api.firebaseLogin(login, password);
      } else {
        session = await _api.login(login, password);
      }
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
      final AuthSession session;
      if (FirebaseAuthService.isConfigured) {
        session = await _api.firebaseRegister(name, email, password);
      } else {
        session = await _api.register(name, email, password);
      }
      profileName = session.profileName;
      isAuthenticated = true;
    } catch (e) {
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

  Future<void> forgotPassword(String email) async {
    error = null;
    notifyListeners();
    try {
      if (FirebaseAuthService.isConfigured) {
        await _api.firebaseForgotPassword(email);
      } else {
        await _api.request(
          'POST',
          '/auth/forgot-password',
          body: {'login': email.trim()},
          auth: false,
        );
      }
    } catch (e) {
      error = e.toString();
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
