import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';

import '../config.dart';

/// Firebase Authentication wrapper (free tier).
/// When [AppConfig.firebaseConfigured] is false, all methods no-op or throw.
class FirebaseAuthService {
  FirebaseAuthService._();
  static final FirebaseAuthService instance = FirebaseAuthService._();

  static bool get isConfigured => AppConfig.firebaseConfigured;

  static Future<void> initialize() async {
    if (!isConfigured) return;
    if (Firebase.apps.isNotEmpty) return;
    await Firebase.initializeApp(
      options: const FirebaseOptions(
        apiKey: AppConfig.firebaseApiKey,
        authDomain: AppConfig.firebaseAuthDomain,
        projectId: AppConfig.firebaseProjectId,
        storageBucket: AppConfig.firebaseStorageBucket,
        messagingSenderId: AppConfig.firebaseMessagingSenderId,
        appId: AppConfig.firebaseAppId,
      ),
    );
  }

  FirebaseAuth get _auth {
    if (!isConfigured) {
      throw StateError('Firebase is not configured');
    }
    return FirebaseAuth.instance;
  }

  User? get currentUser => isConfigured ? _auth.currentUser : null;

  Stream<User?> authStateChanges() {
    if (!isConfigured) return Stream.value(null);
    return _auth.authStateChanges();
  }

  Future<UserCredential> signIn(String email, String password) {
    return _auth.signInWithEmailAndPassword(
      email: email.trim().toLowerCase(),
      password: password,
    );
  }

  Future<UserCredential> register(String email, String password) async {
    final cred = await _auth.createUserWithEmailAndPassword(
      email: email.trim().toLowerCase(),
      password: password,
    );
    await cred.user?.sendEmailVerification();
    return cred;
  }

  Future<void> sendPasswordResetEmail(String email) {
    return _auth.sendPasswordResetEmail(email: email.trim().toLowerCase());
  }

  Future<void> signOut() async {
    if (!isConfigured) return;
    await _auth.signOut();
  }

  Future<String?> getIdToken({bool forceRefresh = false}) async {
    if (!isConfigured) return null;
    final user = _auth.currentUser;
    if (user == null) return null;
    return user.getIdToken(forceRefresh);
  }
}
