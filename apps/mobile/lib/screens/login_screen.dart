import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config.dart';
import '../services/api_service.dart';
import '../services/session_controller.dart';
import '../theme/umkm_theme.dart';
import '../widgets/ui.dart';
import 'forgot_password_screen.dart';

final _usernameRe = RegExp(r'^[a-zA-Z0-9._-]+$');
final _emailRe = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

const _registerConflict =
    'This username or email is already in use. Sign in, or try different details.';

enum _Availability { idle, checking, available, taken }

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final nameCtrl = TextEditingController();
  final emailCtrl = TextEditingController();
  final passCtrl = TextEditingController();
  final _api = ApiService();
  Timer? _availabilityTimer;
  int _checkSeq = 0;
  bool registerMode = false;
  bool busy = false;
  _Availability availability = _Availability.idle;

  @override
  void dispose() {
    _availabilityTimer?.cancel();
    nameCtrl.dispose();
    emailCtrl.dispose();
    passCtrl.dispose();
    super.dispose();
  }

  String? _usernameHint(String value) {
    final name = value.trim();
    if (name.isEmpty) return null;
    if (name.length < 3) return 'Too short (min 3).';
    if (name.length > 64) return 'Too long.';
    if (!_usernameRe.hasMatch(name)) {
      return 'Letters, numbers, dots, underscores, and hyphens only.';
    }
    return null;
  }

  String? _emailHint(String value) {
    final mail = value.trim();
    if (mail.isEmpty) return null;
    if (mail.length > 254) return 'Too long.';
    if (!_emailRe.hasMatch(mail)) return 'Enter a valid email address.';
    return null;
  }

  bool get _identityReady {
    if (!registerMode) return false;
    return _usernameHint(nameCtrl.text) == null &&
        _emailHint(emailCtrl.text) == null &&
        nameCtrl.text.trim().length >= 3 &&
        emailCtrl.text.trim().isNotEmpty;
  }

  bool get _registerBlocked {
    if (!registerMode) return false;
    return !_identityReady ||
        availability != _Availability.available ||
        passCtrl.text.length < 8;
  }

  void _onIdentityChanged() {
    setState(() {});
    context.read<SessionController>().clearError();
    _scheduleAvailabilityCheck();
  }

  void _scheduleAvailabilityCheck() {
    _availabilityTimer?.cancel();
    if (!_identityReady) {
      setState(() => availability = _Availability.idle);
      return;
    }

    final seq = ++_checkSeq;
    setState(() => availability = _Availability.checking);

    _availabilityTimer = Timer(const Duration(milliseconds: 350), () async {
      try {
        final result = await _api.checkRegistrationAvailability(
          nameCtrl.text,
          emailCtrl.text,
        );
        if (!mounted || seq != _checkSeq) return;
        final available = result['available'] == true;
        setState(() {
          availability =
              available ? _Availability.available : _Availability.taken;
        });
        final session = context.read<SessionController>();
        if (available) {
          session.clearError();
        } else {
          session.setError(_registerConflict);
        }
      } catch (e, st) {
        debugPrint('Registration availability check failed: $e\n$st');
        if (!mounted || seq != _checkSeq) return;
        setState(() => availability = _Availability.idle);
      }
    });
  }

  String _identityHelper(String? formatHint, String idle) {
    if (formatHint != null) return formatHint;
    if (!_identityReady) return idle;
    switch (availability) {
      case _Availability.checking:
        return 'Checking username and email…';
      case _Availability.taken:
        return 'Already in use — sign in';
      case _Availability.available:
        return 'Available';
      case _Availability.idle:
        return idle;
    }
  }

  Future<void> _submit() async {
    if (registerMode && _registerBlocked) return;
    setState(() => busy = true);
    final session = context.read<SessionController>();
    if (registerMode) {
      await session.register(
        nameCtrl.text.trim(),
        emailCtrl.text.trim(),
        passCtrl.text,
      );
      if (mounted &&
          session.error != null &&
          (session.error!.toLowerCase().contains('already in use') ||
              session.error!.toLowerCase().contains('already taken'))) {
        setState(() {
          availability = _Availability.taken;
          registerMode = false;
        });
      }
    } else {
      if (AppConfig.firebaseConfigured &&
          !nameCtrl.text.trim().contains('@')) {
        session.setError('Sign in with your email address.');
        if (mounted) setState(() => busy = false);
        return;
      }
      await session.login(nameCtrl.text.trim(), passCtrl.text);
    }
    if (mounted) setState(() => busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<SessionController>();
    final firebase = AppConfig.firebaseConfigured;
    final nameHint = registerMode ? _usernameHint(nameCtrl.text) : null;
    final emailHint = registerMode ? _emailHint(emailCtrl.text) : null;
    final taken = registerMode && availability == _Availability.taken;
    final available = registerMode && availability == _Availability.available;
    final helperColor = (Color? formatBad) {
      if (formatBad != null) return const Color(0xFFB42318);
      if (taken) return const Color(0xFFB42318);
      if (available) return UmkmColors.brandDeep;
      return UmkmColors.muted;
    };

    final narrow = MediaQuery.sizeOf(context).width < 380;
    return SoftSurface(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: EdgeInsets.symmetric(
                horizontal: narrow ? UmkmSpace.md : UmkmSpace.xl,
                vertical: UmkmSpace.xl,
              ),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'UMKM Hub',
                      style: UmkmType.display(
                        size: narrow ? 30 : 36,
                        weight: FontWeight.w700,
                        color: UmkmColors.brandDeep,
                        letterSpacing: -0.8,
                        height: 1.05,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      registerMode
                          ? 'Create a profile with a username, email, and password.'
                          : 'Sign in to your UMKM workspace.',
                      style: TextStyle(
                        color: UmkmColors.muted,
                        fontSize: narrow ? 14.5 : 16,
                        height: 1.4,
                      ),
                    ),
                    SizedBox(height: narrow ? 22 : 28),
                    if (session.error != null) ...[
                      ErrorBanner(message: session.error!),
                      const SizedBox(height: 12),
                    ],
                    Card(
                      child: Padding(
                        padding: EdgeInsets.all(narrow ? 16 : 20),
                        child: Column(
                          children: [
                            TextField(
                              controller: nameCtrl,
                              keyboardType: registerMode
                                  ? TextInputType.text
                                  : TextInputType.emailAddress,
                              autocorrect: false,
                              onChanged: (_) => registerMode
                                  ? _onIdentityChanged()
                                  : setState(() {}),
                              decoration: InputDecoration(
                                labelText: registerMode
                                    ? 'Username'
                                    : firebase
                                        ? 'Email'
                                        : 'Username or email',
                                hintText: registerMode
                                    ? 'Must be unique'
                                    : firebase
                                        ? 'you@example.com'
                                        : 'username or you@example.com',
                                helperText: registerMode
                                    ? _identityHelper(
                                        nameHint,
                                        '3–64 characters · checked with your email',
                                      )
                                    : null,
                                helperMaxLines: 2,
                                helperStyle: TextStyle(
                                  color: helperColor(nameHint != null
                                      ? const Color(0xFFB42318)
                                      : null),
                                  fontWeight:
                                      nameHint != null || taken
                                      ? FontWeight.w600
                                      : FontWeight.w400,
                                ),
                              ),
                            ),
                            if (registerMode) ...[
                              const SizedBox(height: 12),
                              TextField(
                                controller: emailCtrl,
                                keyboardType: TextInputType.emailAddress,
                                autocorrect: false,
                                onChanged: (_) => _onIdentityChanged(),
                                decoration: InputDecoration(
                                  labelText: 'Email address',
                                  hintText: 'you@example.com',
                                  helperText: _identityHelper(
                                    emailHint,
                                    'Checked with your username · then locked',
                                  ),
                                  helperMaxLines: 2,
                                  helperStyle: TextStyle(
                                    color: helperColor(emailHint != null
                                        ? const Color(0xFFB42318)
                                        : null),
                                    fontWeight:
                                        emailHint != null || taken
                                        ? FontWeight.w600
                                        : FontWeight.w400,
                                  ),
                                ),
                              ),
                            ],
                            const SizedBox(height: 12),
                            TextField(
                              controller: passCtrl,
                              obscureText: true,
                              onChanged: (_) => setState(() {}),
                              decoration: const InputDecoration(
                                labelText: 'Password',
                              ),
                            ),
                            if (!registerMode) ...[
                              const SizedBox(height: 8),
                              Align(
                                alignment: Alignment.centerLeft,
                                child: TextButton(
                                  onPressed: () {
                                    Navigator.of(context).push(
                                      MaterialPageRoute<void>(
                                        builder: (_) =>
                                            const ForgotPasswordScreen(),
                                      ),
                                    );
                                  },
                                  child: const Text('Forgot password?'),
                                ),
                              ),
                            ],
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              child: FilledButton(
                                onPressed:
                                    busy ||
                                        (registerMode && _registerBlocked)
                                    ? null
                                    : _submit,
                                child: Text(
                                  busy
                                      ? 'Please wait…'
                                      : registerMode &&
                                            availability ==
                                                _Availability.checking
                                      ? 'Checking…'
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
                      onPressed: () {
                        _availabilityTimer?.cancel();
                        setState(() {
                          registerMode = !registerMode;
                          availability = _Availability.idle;
                        });
                        session.clearError();
                      },
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
