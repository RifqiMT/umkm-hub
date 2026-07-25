import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/api_service.dart';
import '../services/session_controller.dart';
import '../theme/umkm_theme.dart';
import '../widgets/ui.dart';
import 'analytics_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final nameCtrl = TextEditingController();
  final passCtrl = TextEditingController();
  String? profileId;
  String? error;
  String? message;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    nameCtrl.dispose();
    passCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final me = await context.read<ApiService>().request('GET', '/profiles/me');
      final map = me as Map<String, dynamic>;
      setState(() {
        profileId = map['id'] as String?;
        nameCtrl.text = (map['profileName'] as String?) ?? '';
        error = null;
      });
    } catch (e) {
      setState(() => error = e.toString());
    }
  }

  Future<void> _save() async {
    setState(() {
      error = null;
      message = null;
    });
    try {
      final body = <String, dynamic>{
        'profileName': nameCtrl.text.trim(),
      };
      if (passCtrl.text.isNotEmpty) body['password'] = passCtrl.text;
      await context
          .read<ApiService>()
          .request('PATCH', '/profiles/me', body: body);
      passCtrl.clear();
      setState(() => message = 'Profile updated.');
    } catch (e) {
      setState(() => error = e.toString());
    }
  }

  Future<void> _delete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete profile?'),
        content: const Text(
          'This removes the profile and all related data. It cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await context.read<ApiService>().request('DELETE', '/profiles/me');
      await context.read<SessionController>().logout();
    } catch (e) {
      setState(() => error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        const PageIntro(
          subtitle: 'Manage your UMKM Hub login credentials.',
        ),
        if (error != null) ErrorBanner(message: error!),
        if (message != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              message!,
              style: const TextStyle(color: UmkmColors.brandDeep),
            ),
          ),
        const SectionLabel(
          'Account',
          subtitle: 'Sign-in details for this workspace.',
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: FormSection(
            title: 'Credentials',
            description: 'Profile ID: ${profileId ?? '…'}',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Profile name'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: passCtrl,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'New password (optional)',
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _save,
                  child: const Text('Save changes'),
                ),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: () => context.read<SessionController>().logout(),
                  child: const Text('Log out'),
                ),
              ],
            ),
          ),
        ),
        const SectionLabel(
          'Insights',
          subtitle: 'Revenue graphs for this workspace.',
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: FormSection(
            title: 'Analytics',
            description:
                'Monthly and annual revenue and order charts.',
            child: FilledButton.tonal(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const AnalyticsScreen(),
                  ),
                );
              },
              child: const Text('Open analytics'),
            ),
          ),
        ),
        const SectionLabel(
          'Danger zone',
          subtitle: 'Permanent account removal.',
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          child: FormSection(
            title: 'Delete profile',
            description:
                'Removes this profile and all related products, customers, orders, and warehouse history.',
            child: TextButton(
              onPressed: _delete,
              child: const Text(
                'Delete profile',
                style: TextStyle(color: UmkmColors.danger),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
