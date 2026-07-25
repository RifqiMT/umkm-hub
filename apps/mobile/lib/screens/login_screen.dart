import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/session_controller.dart';
import '../theme/umkm_theme.dart';
import '../widgets/ui.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final nameCtrl = TextEditingController();
  final passCtrl = TextEditingController();
  bool registerMode = false;
  bool busy = false;

  @override
  void dispose() {
    nameCtrl.dispose();
    passCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => busy = true);
    final session = context.read<SessionController>();
    if (registerMode) {
      await session.register(nameCtrl.text.trim(), passCtrl.text);
    } else {
      await session.login(nameCtrl.text.trim(), passCtrl.text);
    }
    if (mounted) setState(() => busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<SessionController>();
    return SoftSurface(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'UMKM Hub',
                      style: UmkmType.display(
                        size: 36,
                        weight: FontWeight.w700,
                        color: UmkmColors.brandDeep,
                        letterSpacing: -0.8,
                        height: 1.05,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      registerMode
                          ? 'Create a profile to manage products, customers, and orders.'
                          : 'Sign in to your UMKM workspace.',
                      style: const TextStyle(
                        color: UmkmColors.muted,
                        fontSize: 16,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 28),
                    if (session.error != null) ...[
                      ErrorBanner(message: session.error!),
                      const SizedBox(height: 12),
                    ],
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          children: [
                            TextField(
                              controller: nameCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Profile name',
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: passCtrl,
                              obscureText: true,
                              decoration: const InputDecoration(
                                labelText: 'Password',
                              ),
                            ),
                            const SizedBox(height: 20),
                            SizedBox(
                              width: double.infinity,
                              child: FilledButton(
                                onPressed: busy ? null : _submit,
                                child: Text(
                                  busy
                                      ? 'Please wait…'
                                      : (registerMode
                                          ? 'Create profile'
                                          : 'Sign in'),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: () =>
                          setState(() => registerMode = !registerMode),
                      child: Text(
                        registerMode
                            ? 'Already have a profile? Sign in'
                            : 'New here? Create a profile',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
