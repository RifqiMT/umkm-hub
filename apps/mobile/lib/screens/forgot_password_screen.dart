import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config.dart';
import '../services/session_controller.dart';
import '../theme/umkm_theme.dart';
import '../widgets/ui.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final emailCtrl = TextEditingController();
  bool busy = false;
  bool sent = false;

  @override
  void dispose() {
    emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = emailCtrl.text.trim();
    if (email.isEmpty) return;
    setState(() => busy = true);
    final session = context.read<SessionController>();
    session.clearError();
    await session.forgotPassword(email);
    if (mounted) {
      setState(() {
        busy = false;
        sent = session.error == null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<SessionController>();
    final firebase = AppConfig.firebaseConfigured;

    return SoftSurface(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('Forgot password'),
          backgroundColor: Colors.transparent,
        ),
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
                      firebase
                          ? 'Enter your email and we will send a reset link.'
                          : 'Enter your username or email. If an account exists, we will email a reset link.',
                      style: const TextStyle(
                        color: UmkmColors.muted,
                        fontSize: 16,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 20),
                    if (session.error != null) ...[
                      ErrorBanner(message: session.error!),
                      const SizedBox(height: 12),
                    ],
                    if (sent) ...[
                      const SuccessBanner(
                        message:
                            'If an account exists for that address, a reset link has been sent.',
                      ),
                      const SizedBox(height: 20),
                      FilledButton(
                        onPressed: () => Navigator.of(context).pop(),
                        child: const Text('Back to sign in'),
                      ),
                    ] else ...[
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            children: [
                              TextField(
                                controller: emailCtrl,
                                keyboardType: firebase
                                    ? TextInputType.emailAddress
                                    : TextInputType.text,
                                autocorrect: false,
                                decoration: InputDecoration(
                                  labelText:
                                      firebase ? 'Email' : 'Username or email',
                                  hintText: firebase
                                      ? 'you@example.com'
                                      : 'username or you@example.com',
                                ),
                              ),
                              const SizedBox(height: 20),
                              SizedBox(
                                width: double.infinity,
                                child: FilledButton(
                                  onPressed: busy ? null : _submit,
                                  child: Text(
                                    busy ? 'Sending…' : 'Send reset link',
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
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
