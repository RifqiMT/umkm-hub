/// API + Firebase configuration for UMKM Hub mobile.
class AppConfig {
  /// Android emulator → host machine: 10.0.2.2
  /// iOS simulator / desktop → localhost
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3001/api/v1',
  );

  static const String firebaseApiKey = String.fromEnvironment(
    'FIREBASE_API_KEY',
    defaultValue: '',
  );

  static const String firebaseAuthDomain = String.fromEnvironment(
    'FIREBASE_AUTH_DOMAIN',
    defaultValue: '',
  );

  static const String firebaseProjectId = String.fromEnvironment(
    'FIREBASE_PROJECT_ID',
    defaultValue: '',
  );

  static const String firebaseStorageBucket = String.fromEnvironment(
    'FIREBASE_STORAGE_BUCKET',
    defaultValue: '',
  );

  static const String firebaseMessagingSenderId = String.fromEnvironment(
    'FIREBASE_MESSAGING_SENDER_ID',
    defaultValue: '',
  );

  static const String firebaseAppId = String.fromEnvironment(
    'FIREBASE_APP_ID',
    defaultValue: '',
  );

  static bool get firebaseConfigured =>
      firebaseApiKey.isNotEmpty &&
      firebaseAuthDomain.isNotEmpty &&
      firebaseProjectId.isNotEmpty &&
      firebaseAppId.isNotEmpty;
}
