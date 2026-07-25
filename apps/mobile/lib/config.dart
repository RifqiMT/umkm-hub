/// API configuration for UMKM Hub mobile.
class AppConfig {
  /// Android emulator → host machine: 10.0.2.2
  /// iOS simulator / desktop → localhost
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3001/api/v1',
  );
}
