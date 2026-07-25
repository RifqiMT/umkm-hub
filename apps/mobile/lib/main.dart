import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'screens/home_shell.dart';
import 'screens/login_screen.dart';
import 'services/api_service.dart';
import 'services/session_controller.dart';
import 'theme/umkm_theme.dart';
import 'widgets/ui.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const UmkmHubApp());
}

class UmkmHubApp extends StatelessWidget {
  const UmkmHubApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider(create: (_) => ApiService()),
        ChangeNotifierProvider(
          create: (context) => SessionController(context.read<ApiService>()),
        ),
      ],
      child: MaterialApp(
        title: 'UMKM Hub',
        debugShowCheckedModeBanner: false,
        theme: buildUmkmTheme(),
        home: const _Root(),
      ),
    );
  }
}

class _Root extends StatelessWidget {
  const _Root();

  @override
  Widget build(BuildContext context) {
    return Consumer<SessionController>(
      builder: (context, session, _) {
        if (session.loading) {
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
