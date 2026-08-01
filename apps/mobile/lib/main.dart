import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'screens/home_shell.dart';
import 'screens/login_screen.dart';
import 'services/api_service.dart';
import 'services/firebase_auth_service.dart';
import 'services/session_controller.dart';
import 'services/translate_service.dart';
import 'services/ui_language_service.dart';
import 'theme/umkm_theme.dart';
import 'widgets/auto_translate_text.dart';
import 'widgets/translation_progress_overlay.dart';
import 'widgets/ui.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await FirebaseAuthService.initialize();
  runApp(const UmkmHubApp());
}

class UmkmHubApp extends StatelessWidget {
  const UmkmHubApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider(create: (_) => ApiService()),
        ChangeNotifierProvider.value(value: TranslateService.instance),
        ChangeNotifierProvider(
          create: (context) {
            TranslateService.instance.bindApi(context.read<ApiService>());
            return UiLanguageService()..load();
          },
        ),
        ChangeNotifierProvider(
          create: (context) => SessionController(context.read<ApiService>()),
        ),
      ],
      child: MaterialApp(
        title: 'UMKM Hub',
        debugShowCheckedModeBanner: false,
        theme: buildUmkmTheme(),
        builder: (context, child) {
          return Stack(
            alignment: Alignment.topCenter,
            children: [
              if (child != null) child,
              const TranslationProgressOverlay(),
            ],
          );
        },
        home: const _Root(),
      ),
    );
  }
}

class _Root extends StatelessWidget {
  const _Root();

  @override
  Widget build(BuildContext context) {
    return Consumer2<SessionController, UiLanguageService>(
      builder: (context, session, language, _) {
        if (!language.ready || session.loading) {
          return SoftSurface(
            child: Scaffold(
              backgroundColor: Colors.transparent,
              body: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'UMKM Hub',
                      style: Theme.of(context).appBarTheme.titleTextStyle,
                    ),
                    const SizedBox(height: 16),
                    const CircularProgressIndicator(),
                    const SizedBox(height: 12),
                    const Tr('Checking session…'),
                  ],
                ),
              ),
            ),
          );
        }
        if (session.isAuthenticated) {
          return const HomeShell();
        }
        return const LoginScreen();
      },
    );
  }
}
