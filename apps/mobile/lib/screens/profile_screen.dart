import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../data/ui_languages.dart';
import '../format_money.dart';
import '../services/api_service.dart';
import '../services/session_controller.dart';
import '../services/translate_service.dart';
import '../services/ui_language_service.dart';
import '../theme/umkm_theme.dart';
import '../widgets/ui.dart';
import 'analytics_screen.dart';
import 'glossary_screen.dart';

final _dateFmt = DateFormat.yMMMd('en_US');

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final nameCtrl = TextEditingController();
  final passCtrl = TextEditingController();
  final confirmCtrl = TextEditingController();
  final firstNameCtrl = TextEditingController();
  final lastNameCtrl = TextEditingController();
  final emailCtrl = TextEditingController();
  final cityCtrl = TextEditingController();
  final countryCtrl = TextEditingController();
  final businessNameCtrl = TextEditingController();
  final businessPhoneCtrl = TextEditingController();
  final businessAddressCtrl = TextEditingController();
  final npwpCtrl = TextEditingController();
  final invoicePrefixCtrl = TextEditingController();
  final ppnCtrl = TextEditingController(text: '11');

  String? profileId;
  String? createdAt;
  String? updatedAt;
  String? loadedName;
  String? loadedFirstName;
  String? loadedLastName;
  String? loadedEmail;
  String? loadedCity;
  String? loadedCountry;
  String? locationSource;
  bool locationSet = false;
  bool locationNeedsReentry = false;
  bool clearLocation = false;
  bool emailVerified = false;
  bool accountVerified = false;
  String? error;
  String? message;
  String? devVerifyUrl;
  bool booting = true;
  bool saving = false;
  bool savingPersonal = false;
  bool savingBusiness = false;
  bool sendingVerify = false;
  bool isPkp = false;
  bool taxInclusive = false;
  double defaultPpnPercent = 11;
  bool detecting = false;
  bool showPassword = false;
  bool snapshotLoading = true;
  bool _hydrating = false;

  int? productCount;
  num? inventorySellValue;
  int? customerCount;
  int? interestedCount;
  int? orderCount;
  num? totalRevenue;
  num? profitMarginRate;

  @override
  void initState() {
    super.initState();
    countryCtrl.addListener(() {
      if (_hydrating) return;
      setState(() {
        if (locationSource == 'IP') locationSource = 'MANUAL';
        message = null;
      });
    });
    _load();
  }

  @override
  void dispose() {
    nameCtrl.dispose();
    passCtrl.dispose();
    confirmCtrl.dispose();
    firstNameCtrl.dispose();
    lastNameCtrl.dispose();
    emailCtrl.dispose();
    cityCtrl.dispose();
    countryCtrl.dispose();
    businessNameCtrl.dispose();
    businessPhoneCtrl.dispose();
    businessAddressCtrl.dispose();
    npwpCtrl.dispose();
    invoicePrefixCtrl.dispose();
    ppnCtrl.dispose();
    super.dispose();
  }

  String _monogram(String name) {
    final parts = name
        .trim()
        .split(RegExp(r'[._\s-]+'))
        .where((p) => p.isNotEmpty)
        .toList();
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    final t = name.trim();
    if (t.isEmpty) return 'UH';
    return t.substring(0, t.length >= 2 ? 2 : 1).toUpperCase();
  }

  String _shortId(String id) {
    if (id.length <= 12) return id;
    return '${id.substring(0, 8)}…${id.substring(id.length - 4)}';
  }

  String _formatIsoDate(String? iso) {
    if (iso == null || iso.isEmpty) return '—';
    final day = iso.length >= 10 ? iso.substring(0, 10) : iso;
    final parsed = DateTime.tryParse('${day}T00:00:00.000Z');
    if (parsed == null) return iso;
    return _dateFmt.format(parsed);
  }

  Future<Map<String, dynamic>?> _safeSummary(
    ApiService api,
    String path,
  ) async {
    try {
      final data = await api.request('GET', path);
      return data as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  int _passwordScore(String password) {
    if (password.isEmpty) return 0;
    var score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (RegExp(r'[A-Z]').hasMatch(password) &&
        RegExp(r'[a-z]').hasMatch(password)) {
      score += 1;
    }
    if (RegExp(r'\d').hasMatch(password) ||
        RegExp(r'[^A-Za-z0-9]').hasMatch(password)) {
      score += 1;
    }
    return score;
  }

  String? _validate() {
    final password = passCtrl.text;
    final confirm = confirmCtrl.text;
    if (password.isEmpty) {
      return 'Enter a new password to update credentials.';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    if (password.length > 128) {
      return 'Password must be at most 128 characters.';
    }
    if (password != confirm) {
      return 'New password and confirmation do not match.';
    }
    return null;
  }

  Future<void> _load() async {
    setState(() {
      booting = true;
      snapshotLoading = true;
      error = null;
    });
    try {
      final me =
          await context.read<ApiService>().request('GET', '/profiles/me');
      final map = me as Map<String, dynamic>;
      final name = (map['profileName'] as String?) ?? '';
      final first = (map['firstName'] as String?) ?? '';
      final last = (map['lastName'] as String?) ?? '';
      final mail = (map['email'] as String?) ?? '';
      if (!mounted) return;
      _hydrating = true;
      setState(() {
        profileId = map['id'] as String?;
        createdAt = map['createdAt'] as String?;
        updatedAt = map['updatedAt'] as String?;
        loadedName = name;
        loadedFirstName = first;
        loadedLastName = last;
        loadedEmail = mail;
        loadedCity = (map['locationCity'] as String?) ?? '';
        loadedCountry = (map['locationCountry'] as String?) ?? '';
        locationSource = map['locationSource'] as String?;
        locationSet = map['locationSet'] == true;
        locationNeedsReentry = map['locationNeedsReentry'] == true;
        emailVerified = map['emailVerified'] == true;
        accountVerified = map['accountVerified'] == true;
        clearLocation = false;
        devVerifyUrl = null;
        nameCtrl.text = name;
        firstNameCtrl.text = first;
        lastNameCtrl.text = last;
        emailCtrl.text = mail;
        cityCtrl.text = loadedCity ?? '';
        countryCtrl.text = loadedCountry ?? '';
        businessNameCtrl.text = (map['businessName'] as String?) ?? '';
        businessPhoneCtrl.text = (map['businessPhone'] as String?) ?? '';
        businessAddressCtrl.text = (map['businessAddress'] as String?) ?? '';
        npwpCtrl.text = (map['npwp'] as String?) ?? '';
        invoicePrefixCtrl.text = (map['invoicePrefix'] as String?) ?? '';
        isPkp = map['isPkp'] == true;
        taxInclusive = map['taxInclusive'] == true;
        defaultPpnPercent =
            (map['defaultPpnPercent'] as num?)?.toDouble() ?? 11;
        ppnCtrl.text = defaultPpnPercent % 1 == 0
            ? defaultPpnPercent.toStringAsFixed(0)
            : defaultPpnPercent.toString();
        booting = false;
      });
      _hydrating = false;
    } catch (e) {
      if (!mounted) return;
      setState(() {
        error = e.toString();
        booting = false;
      });
    }

    try {
      final api = context.read<ApiService>();
      final results = await Future.wait([
        _safeSummary(api, '/products/summary'),
        _safeSummary(api, '/customers/summary'),
        _safeSummary(api, '/orders/summary'),
      ]);
      if (!mounted) return;
      final products = results[0];
      final customers = results[1];
      final orders = results[2];
      setState(() {
        productCount = (products?['productCount'] as num?)?.toInt();
        inventorySellValue = products?['inventorySellValue'] as num?;
        customerCount = (customers?['customerCount'] as num?)?.toInt();
        interestedCount = (customers?['interestedCount'] as num?)?.toInt();
        orderCount = (orders?['orderCount'] as num?)?.toInt();
        totalRevenue = orders?['totalRevenue'] as num?;
        profitMarginRate = orders?['profitMarginRate'] as num?;
        snapshotLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => snapshotLoading = false);
    }
  }

  Future<void> _save() async {
    final validation = _validate();
    if (validation != null) {
      setState(() {
        error = validation;
        message = null;
      });
      return;
    }
    setState(() {
      error = null;
      message = null;
      saving = true;
    });
    try {
      await context.read<ApiService>().request(
            'PATCH',
            '/profiles/me',
            body: {'password': passCtrl.text},
          );
      passCtrl.clear();
      confirmCtrl.clear();
      if (!mounted) return;
      setState(() {
        showPassword = false;
        message = 'Password updated.';
        saving = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        error = e.toString();
        saving = false;
      });
    }
  }

  String? _validatePersonal() {
    if (firstNameCtrl.text.trim().length > 64 ||
        lastNameCtrl.text.trim().length > 64) {
      return 'Names must be at most 64 characters.';
    }
    return null;
  }

  Future<void> _saveBusiness() async {
    setState(() {
      error = null;
      message = null;
      savingBusiness = true;
    });
    try {
      final ppn = double.tryParse(ppnCtrl.text.trim()) ?? defaultPpnPercent;
      final updated = await context.read<ApiService>().request(
            'PATCH',
            '/profiles/me',
            body: {
              'businessName': businessNameCtrl.text.trim().isEmpty
                  ? null
                  : businessNameCtrl.text.trim(),
              'businessPhone': businessPhoneCtrl.text.trim().isEmpty
                  ? null
                  : businessPhoneCtrl.text.trim(),
              'businessAddress': businessAddressCtrl.text.trim().isEmpty
                  ? null
                  : businessAddressCtrl.text.trim(),
              'npwp': npwpCtrl.text.trim().isEmpty
                  ? null
                  : npwpCtrl.text.trim(),
              'isPkp': isPkp,
              'defaultPpnPercent': ppn.round(),
              'taxInclusive': taxInclusive,
              'invoicePrefix': invoicePrefixCtrl.text.trim().isEmpty
                  ? null
                  : invoicePrefixCtrl.text.trim(),
            },
          );
      final map = updated as Map<String, dynamic>;
      if (!mounted) return;
      _hydrating = true;
      setState(() {
        businessNameCtrl.text = (map['businessName'] as String?) ?? '';
        businessPhoneCtrl.text = (map['businessPhone'] as String?) ?? '';
        businessAddressCtrl.text = (map['businessAddress'] as String?) ?? '';
        npwpCtrl.text = (map['npwp'] as String?) ?? '';
        invoicePrefixCtrl.text = (map['invoicePrefix'] as String?) ?? '';
        isPkp = map['isPkp'] == true;
        taxInclusive = map['taxInclusive'] == true;
        defaultPpnPercent =
            (map['defaultPpnPercent'] as num?)?.toDouble() ?? 11;
        ppnCtrl.text = defaultPpnPercent % 1 == 0
            ? defaultPpnPercent.toStringAsFixed(0)
            : defaultPpnPercent.toString();
        message = 'Invoice profile saved.';
        savingBusiness = false;
      });
      _hydrating = false;
    } catch (e) {
      if (!mounted) return;
      setState(() {
        error = e.toString();
        savingBusiness = false;
      });
    }
  }

  Future<void> _savePersonal() async {
    final validation = _validatePersonal();
    if (validation != null) {
      setState(() {
        error = validation;
        message = null;
      });
      return;
    }
    final first = firstNameCtrl.text.trim();
    final last = lastNameCtrl.text.trim();
    final city = cityCtrl.text.trim();
    final country = countryCtrl.text.trim();
    final locationDirty = clearLocation ||
        city != (loadedCity ?? '') ||
        country != (loadedCountry ?? '');
    final unchanged = first == (loadedFirstName ?? '') &&
        last == (loadedLastName ?? '') &&
        !locationDirty;
    if (unchanged) {
      setState(() {
        error = 'No changes to save.';
        message = null;
      });
      return;
    }

    setState(() {
      error = null;
      message = null;
      savingPersonal = true;
    });
    try {
      final body = <String, dynamic>{
        'firstName': first.isEmpty ? null : first,
        'lastName': last.isEmpty ? null : last,
      };
      if (locationDirty) {
        final nextCity = clearLocation || city.isEmpty ? null : city;
        final nextCountry =
            clearLocation || country.isEmpty ? null : country;
        body['locationCity'] = nextCity;
        body['locationCountry'] = nextCountry;
        if (nextCity != null || nextCountry != null) {
          body['locationSource'] = locationSource ?? 'MANUAL';
        }
      }
      final updated = await context
          .read<ApiService>()
          .request('PATCH', '/profiles/me', body: body);
      final map = updated as Map<String, dynamic>;
      if (!mounted) return;
      _hydrating = true;
      setState(() {
        loadedFirstName = (map['firstName'] as String?) ?? '';
        loadedLastName = (map['lastName'] as String?) ?? '';
        loadedEmail = (map['email'] as String?) ?? '';
        loadedCity = (map['locationCity'] as String?) ?? '';
        loadedCountry = (map['locationCountry'] as String?) ?? '';
        locationSource = map['locationSource'] as String?;
        locationSet = map['locationSet'] == true;
        locationNeedsReentry = map['locationNeedsReentry'] == true;
        emailVerified = map['emailVerified'] == true;
        accountVerified = map['accountVerified'] == true;
        clearLocation = false;
        firstNameCtrl.text = loadedFirstName ?? '';
        lastNameCtrl.text = loadedLastName ?? '';
        emailCtrl.text = loadedEmail ?? '';
        cityCtrl.text = loadedCity ?? '';
        countryCtrl.text = loadedCountry ?? '';
        message = 'Personal details updated.';
        savingPersonal = false;
      });
      _hydrating = false;
    } catch (e) {
      if (!mounted) return;
      setState(() {
        error = e.toString();
        savingPersonal = false;
      });
    }
  }

  Future<void> _sendVerification() async {
    if ((loadedEmail ?? '').isEmpty) {
      setState(() {
        error = 'This profile has no email address to verify.';
        message = null;
      });
      return;
    }
    setState(() {
      error = null;
      message = null;
      sendingVerify = true;
      devVerifyUrl = null;
    });
    try {
      final result = await context.read<ApiService>().request(
            'POST',
            '/profiles/me/email/send-verification',
            body: {},
          );
      final map = result as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        message = (map['message'] as String?) ?? 'Verification email sent.';
        devVerifyUrl = map['devVerifyUrl'] as String?;
        sendingVerify = false;
      });
      if (map['alreadyVerified'] == true) {
        await _load();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        error = e.toString();
        sendingVerify = false;
      });
    }
  }

  Future<void> _detectLocation() async {
    setState(() {
      error = null;
      message = null;
      detecting = true;
    });
    try {
      final result = await context.read<ApiService>().request(
            'POST',
            '/profiles/me/detect-location',
            body: {'save': true},
          );
      final map = result as Map<String, dynamic>;
      final profile = map['profile'] as Map<String, dynamic>?;
      if (!mounted) return;
      _hydrating = true;
      setState(() {
        if (profile != null) {
          locationSet = profile['locationSet'] == true;
          locationSource = profile['locationSource'] as String?;
          locationNeedsReentry = profile['locationNeedsReentry'] == true;
          loadedCity = (profile['locationCity'] as String?) ??
              (map['city'] as String?) ??
              '';
          loadedCountry = (profile['locationCountry'] as String?) ??
              (map['country'] as String?) ??
              '';
        } else {
          locationSet = true;
          locationSource = 'IP';
          loadedCity = (map['city'] as String?) ?? '';
          loadedCountry = (map['country'] as String?) ?? '';
        }
        cityCtrl.text = (map['city'] as String?) ?? loadedCity ?? '';
        countryCtrl.text = (map['country'] as String?) ?? loadedCountry ?? '';
        clearLocation = false;
        message = 'Location detected and saved.';
        detecting = false;
      });
      _hydrating = false;
    } catch (e) {
      // Private/local IP: leave fields for manual entry with a clear message.
      if (!mounted) return;
      setState(() {
        error =
            'Could not detect location on this network. Enter city and country manually.';
        detecting = false;
      });
    }
  }

  Future<void> _delete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete profile?'),
        content: const Text(
          'This removes the profile and all related products, customers, orders, and warehouse history. It cannot be undone.',
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

  Future<void> _copyId() async {
    final id = profileId;
    if (id == null) return;
    await Clipboard.setData(ClipboardData(text: id));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Profile ID copied')),
    );
  }

  Widget _statTile({
    required String label,
    required String value,
    required String hint,
  }) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: UmkmColors.line.withOpacity(0.85)),
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color.lerp(UmkmColors.brandSoft, Colors.white, 0.55)!,
            Colors.white,
          ],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: UmkmType.body(
              size: 10.5,
              weight: FontWeight.w700,
              color: UmkmColors.muted,
            ).copyWith(letterSpacing: 0.6),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: UmkmType.body(
              size: 18,
              weight: FontWeight.w700,
              color: UmkmColors.brandDeep,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            hint,
            style: UmkmType.body(size: 12, color: UmkmColors.muted),
          ),
        ],
      ),
    );
  }

  Widget _shortcutTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      leading: CircleAvatar(
        backgroundColor: UmkmColors.brandSoft,
        foregroundColor: UmkmColors.brandDeep,
        child: Icon(icon, size: 22),
      ),
      title: Text(
        title,
        style: UmkmType.body(size: 15.5, weight: FontWeight.w700),
      ),
      subtitle: Text(
        subtitle,
        style: UmkmType.body(size: 13, color: UmkmColors.muted),
      ),
      trailing: const Icon(
        Icons.chevron_right_rounded,
        color: UmkmColors.muted,
      ),
      onTap: onTap,
    );
  }

  @override
  Widget build(BuildContext context) {
    final loginName =
        nameCtrl.text.trim().isEmpty ? (loadedName ?? '…') : nameCtrl.text.trim();
    final person = '${firstNameCtrl.text.trim()} ${lastNameCtrl.text.trim()}'
        .trim();
    final displayName = person.isNotEmpty ? person : loginName;
    final score = _passwordScore(passCtrl.text);
    final strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

    return ListView(
      children: [
        const PageIntro(
          subtitle:
              'Your identity, workspace login, security, and a snapshot of what you manage in UMKM Hub.',
        ),
        if (error != null) ErrorBanner(message: error!),
        if (message != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: UmkmColors.brandSoft.withOpacity(0.55),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: UmkmColors.brand.withOpacity(0.28),
                ),
              ),
              child: Text(
                message!,
                style: UmkmType.body(
                  size: 13.5,
                  weight: FontWeight.w600,
                  color: UmkmColors.brandDeep,
                ),
              ),
            ),
          ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: UmkmColors.line.withOpacity(0.85)),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color.lerp(UmkmColors.brandSoft, Colors.white, 0.35)!,
                  Colors.white,
                ],
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 56,
                  height: 56,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [UmkmColors.brand, UmkmColors.brandDeep],
                    ),
                  ),
                  child: Text(
                    _monogram(displayName == '…' ? 'UH' : displayName),
                    style: const TextStyle(
                      color: Color(0xFFF7FFFB),
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                      letterSpacing: 0.4,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'SIGNED IN AS',
                        style: UmkmType.body(
                          size: 10.5,
                          weight: FontWeight.w700,
                          color: UmkmColors.brand,
                        ).copyWith(letterSpacing: 0.8),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        booting ? '…' : displayName,
                        style: UmkmType.body(
                          size: 20,
                          weight: FontWeight.w700,
                          color: UmkmColors.brandDeep,
                        ),
                      ),
                      if (person.isNotEmpty && loginName != '…') ...[
                        const SizedBox(height: 2),
                        Text(
                          '@$loginName',
                          style: UmkmType.body(
                            size: 13,
                            weight: FontWeight.w600,
                            color: UmkmColors.muted,
                          ),
                        ),
                      ],
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 16,
                        runSpacing: 8,
                        children: [
                          _metaChip('Member since', _formatIsoDate(createdAt)),
                          _metaChip('Updated', _formatIsoDate(updatedAt)),
                          if (profileId != null)
                            GestureDetector(
                              onTap: _copyId,
                              child: _metaChip(
                                'Profile ID',
                                _shortId(profileId!),
                                action: 'Copy',
                              ),
                            ),
                        ],
                      ),
                      if ((loadedEmail ?? '').isNotEmpty ||
                          (loadedCity ?? '').isNotEmpty ||
                          (loadedCountry ?? '').isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Text(
                          [
                            if ((loadedEmail ?? '').isNotEmpty) loadedEmail,
                            [
                              if ((loadedCity ?? '').isNotEmpty) loadedCity,
                              if ((loadedCountry ?? '').isNotEmpty)
                                loadedCountry,
                            ].join(', '),
                          ]
                              .whereType<String>()
                              .where((s) => s.isNotEmpty)
                              .join(' · '),
                          style: UmkmType.body(
                            size: 12.5,
                            color: UmkmColors.muted,
                          ),
                        ),
                      ],
                      if ((loadedEmail ?? '').isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            _statusChip(
                              emailVerified
                                  ? 'Email verified'
                                  : 'Email unverified',
                              emailVerified,
                            ),
                            _statusChip(
                              accountVerified
                                  ? 'Account verified'
                                  : 'Account unverified',
                              accountVerified,
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SectionLabel(
          'Workspace',
          subtitle: 'Live counts from your catalog, CRM, and orders.',
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final wide = constraints.maxWidth >= 520;
              final tiles = [
                _statTile(
                  label: 'Products',
                  value: snapshotLoading
                      ? '…'
                      : formatQty(productCount ?? 0),
                  hint: inventorySellValue == null
                      ? 'Catalog SKUs'
                      : '${formatMoney(inventorySellValue!)} stock value',
                ),
                _statTile(
                  label: 'Customers',
                  value: snapshotLoading
                      ? '…'
                      : formatQty(customerCount ?? 0),
                  hint: interestedCount == null
                      ? 'CRM contacts'
                      : '${formatQty(interestedCount!)} interested',
                ),
                _statTile(
                  label: 'Orders',
                  value: snapshotLoading ? '…' : formatQty(orderCount ?? 0),
                  hint: totalRevenue == null
                      ? 'Active sales'
                      : '${formatMoney(totalRevenue!)} revenue',
                ),
                _statTile(
                  label: 'Margin',
                  value: snapshotLoading
                      ? '…'
                      : profitMarginRate == null
                          ? '—'
                          : '${profitMarginRate!.toStringAsFixed(1)}%',
                  hint: 'From orders with known cost',
                ),
              ];
              if (wide) {
                return Row(
                  children: [
                    for (var i = 0; i < tiles.length; i++) ...[
                      if (i > 0) const SizedBox(width: 8),
                      Expanded(child: tiles[i]),
                    ],
                  ],
                );
              }
              return Column(
                children: [
                  Row(
                    children: [
                      Expanded(child: tiles[0]),
                      const SizedBox(width: 8),
                      Expanded(child: tiles[1]),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(child: tiles[2]),
                      const SizedBox(width: 8),
                      Expanded(child: tiles[3]),
                    ],
                  ),
                ],
              );
            },
          ),
        ),
        const SectionLabel(
          'Identity',
          subtitle:
              'Optional contact and location for this workspace. These details are separate from sign-in.',
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: FormSection(
            title: 'Personal details',
            description: locationNeedsReentry
                ? 'Your previous location used an older hash format and must be entered again.'
                : 'Name, email status, and workspace location in one place.',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _PersonalPreviewCard(
                  firstName: firstNameCtrl.text,
                  lastName: lastNameCtrl.text,
                  email: emailCtrl.text,
                  city: clearLocation ? '' : cityCtrl.text,
                  country: clearLocation ? '' : countryCtrl.text,
                  emailVerified: emailVerified,
                ),
                const SizedBox(height: 14),
                Text(
                  'Name',
                  style: UmkmType.body(
                    size: 14,
                    weight: FontWeight.w700,
                    color: UmkmColors.ink,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'How you appear on this profile page.',
                  style: UmkmType.body(size: 12.5, color: UmkmColors.muted),
                ),
                const SizedBox(height: 10),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: TextField(
                        controller: firstNameCtrl,
                        enabled: !booting,
                        textCapitalization: TextCapitalization.words,
                        decoration: const InputDecoration(
                          labelText: 'First name',
                          hintText: 'Optional',
                        ),
                        onChanged: (_) => setState(() => message = null),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: lastNameCtrl,
                        enabled: !booting,
                        textCapitalization: TextCapitalization.words,
                        decoration: const InputDecoration(
                          labelText: 'Last name',
                          hintText: 'Optional',
                        ),
                        onChanged: (_) => setState(() => message = null),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  'Email',
                  style: UmkmType.body(
                    size: 14,
                    weight: FontWeight.w700,
                    color: UmkmColors.ink,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Linked to your username at registration and cannot be changed.',
                  style: UmkmType.body(size: 12.5, color: UmkmColors.muted),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: emailCtrl,
                  readOnly: true,
                  enableInteractiveSelection: true,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Email address',
                  ),
                ),
                if ((loadedEmail ?? '').isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: StatusChip(
                      label: emailVerified ? 'Verified' : 'Unverified',
                      tone: emailVerified
                          ? StatusTone.brand
                          : StatusTone.neutral,
                    ),
                  ),
                ],
                if (!emailVerified && (loadedEmail ?? '').isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                    decoration: BoxDecoration(
                      color: UmkmColors.brandSoft.withOpacity(0.45),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: UmkmColors.brand.withOpacity(0.28),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Verify your email',
                          style: UmkmType.body(
                            size: 14,
                            weight: FontWeight.w700,
                            color: UmkmColors.brandDeep,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Confirm this address to finish account verification.',
                          style: UmkmType.body(
                            size: 12.5,
                            color: UmkmColors.muted,
                          ),
                        ),
                        const SizedBox(height: 10),
                        FilledButton.icon(
                          onPressed: (booting || sendingVerify)
                              ? null
                              : _sendVerification,
                          icon: sendingVerify
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(
                                  Icons.mark_email_unread_outlined,
                                  size: 18,
                                ),
                          label: Text(
                            sendingVerify
                                ? 'Sending…'
                                : 'Send verification email',
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                if (devVerifyUrl != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Dev verify link:\n$devVerifyUrl',
                    style: UmkmType.body(
                      size: 12,
                      color: UmkmColors.brandDeep,
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                Text(
                  'Location',
                  style: UmkmType.body(
                    size: 14,
                    weight: FontWeight.w700,
                    color: UmkmColors.ink,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  locationNeedsReentry
                      ? 'Enter city and country again to restore location.'
                      : 'Detect from your network or type manually. Stored encrypted; IP is hashed.',
                  style: UmkmType.body(size: 12.5, color: UmkmColors.muted),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: cityCtrl,
                  enabled: !booting,
                  decoration: const InputDecoration(
                    labelText: 'City',
                    hintText: 'e.g. Jakarta',
                  ),
                  onChanged: (_) => setState(() {
                    locationSource = 'MANUAL';
                    clearLocation = false;
                    message = null;
                  }),
                ),
                const SizedBox(height: 12),
                CountryField(controller: countryCtrl),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    OutlinedButton.icon(
                      onPressed:
                          (booting || detecting) ? null : _detectLocation,
                      icon: detecting
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.my_location_outlined, size: 18),
                      label: Text(
                        detecting ? 'Detecting…' : 'Detect from network',
                      ),
                    ),
                    if (locationSet ||
                        cityCtrl.text.isNotEmpty ||
                        countryCtrl.text.isNotEmpty ||
                        clearLocation)
                      TextButton(
                        onPressed: booting
                            ? null
                            : () {
                                _hydrating = true;
                                setState(() {
                                  cityCtrl.clear();
                                  countryCtrl.clear();
                                  locationSource = null;
                                  clearLocation = true;
                                  message = null;
                                });
                                _hydrating = false;
                              },
                        child: const Text('Clear'),
                      ),
                    if (locationSource == 'IP' && locationSet)
                      const StatusChip(
                        label: 'From network',
                        tone: StatusTone.brand,
                      )
                    else if (locationSource == 'MANUAL' && locationSet)
                      const StatusChip(
                        label: 'Manual',
                        tone: StatusTone.neutral,
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed:
                      (booting || savingPersonal) ? null : _savePersonal,
                  child: Text(
                    savingPersonal ? 'Saving…' : 'Save personal details',
                  ),
                ),
              ],
            ),
          ),
        ),
        const SectionLabel(
          'Invoicing',
          subtitle:
              'Business details for PDF invoices and e-Faktur exports.',
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: FormSection(
            title: 'Invoice & tax profile',
            description:
                'Most UMKM stay on Non-PKP. Switch to PKP only when VAT-registered.',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: ChoiceChip(
                        label: const Text('Non-PKP'),
                        selected: !isPkp,
                        onSelected: booting
                            ? null
                            : (_) => setState(() {
                                  isPkp = false;
                                  taxInclusive = false;
                                  message = null;
                                }),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ChoiceChip(
                        label: const Text('PKP'),
                        selected: isPkp,
                        onSelected: booting
                            ? null
                            : (_) => setState(() {
                                  isPkp = true;
                                  message = null;
                                }),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: businessNameCtrl,
                  enabled: !booting,
                  decoration: const InputDecoration(
                    labelText: 'Business name',
                    hintText: 'Shown on invoice header',
                  ),
                  onChanged: (_) => setState(() => message = null),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: businessPhoneCtrl,
                  enabled: !booting,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Business phone',
                  ),
                  onChanged: (_) => setState(() => message = null),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: businessAddressCtrl,
                  enabled: !booting,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Business address',
                    hintText: 'Street, city — shown on invoices',
                  ),
                  onChanged: (_) => setState(() => message = null),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: npwpCtrl,
                  enabled: !booting,
                  decoration: const InputDecoration(
                    labelText: 'NPWP',
                    hintText: '15 or 16 digits',
                  ),
                  onChanged: (_) => setState(() => message = null),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: invoicePrefixCtrl,
                  enabled: !booting,
                  decoration: const InputDecoration(
                    labelText: 'Invoice prefix',
                    hintText: 'e.g. INV',
                  ),
                  onChanged: (_) => setState(() => message = null),
                ),
                if (isPkp) ...[
                  const SizedBox(height: 12),
                  TextField(
                    controller: ppnCtrl,
                    enabled: !booting,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Default PPN %',
                    ),
                    onChanged: (_) => setState(() => message = null),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Tax-inclusive pricing'),
                    subtitle: const Text(
                      'Catalog prices already include PPN when enabled.',
                    ),
                    value: taxInclusive,
                    onChanged: booting
                        ? null
                        : (v) => setState(() {
                              taxInclusive = v;
                              message = null;
                            }),
                  ),
                ],
                const SizedBox(height: 16),
                FilledButton(
                  onPressed:
                      (booting || savingBusiness) ? null : _saveBusiness,
                  child: Text(
                    savingBusiness ? 'Saving…' : 'Save invoice profile',
                  ),
                ),
              ],
            ),
          ),
        ),
        const SectionLabel(
          'Security',
          subtitle: 'Username is permanent. You can update your password here.',
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: FormSection(
            title: 'Credentials',
            description:
                'Username was set at registration and cannot be changed.',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: nameCtrl,
                  readOnly: true,
                  enableInteractiveSelection: true,
                  decoration: const InputDecoration(
                    labelText: 'Username',
                    helperText:
                        'Username cannot be changed or reused by another account.',
                    helperMaxLines: 2,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: passCtrl,
                  enabled: !booting,
                  obscureText: !showPassword,
                  decoration: InputDecoration(
                    labelText: 'New password',
                    hintText: 'Leave blank to keep current',
                    suffixIcon: IconButton(
                      onPressed: passCtrl.text.isEmpty
                          ? null
                          : () => setState(() => showPassword = !showPassword),
                      icon: Icon(
                        showPassword
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                      ),
                    ),
                  ),
                  onChanged: (_) => setState(() {
                    message = null;
                  }),
                ),
                if (passCtrl.text.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: score / 4,
                      minHeight: 8,
                      backgroundColor: UmkmColors.line.withOpacity(0.45),
                      color: score <= 1
                          ? UmkmColors.danger
                          : score == 2
                              ? const Color(0xFFD97706)
                              : UmkmColors.brand,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    strengthLabels[score],
                    style: UmkmType.body(
                      size: 12,
                      weight: FontWeight.w700,
                      color: UmkmColors.muted,
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                TextField(
                  controller: confirmCtrl,
                  enabled: !booting && passCtrl.text.isNotEmpty,
                  obscureText: !showPassword,
                  decoration: const InputDecoration(
                    labelText: 'Confirm password',
                    hintText: 'Repeat new password',
                  ),
                  onChanged: (_) => setState(() {
                    message = null;
                  }),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: (booting || saving) ? null : _save,
                  child: Text(saving ? 'Saving…' : 'Save password'),
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
          'Language',
          subtitle:
              'Auto-translate labels across Products, Orders, Warehouse, Customers, and Profile.',
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: FormSection(
            title: 'Auto translation',
            child: Consumer2<UiLanguageService, TranslateService>(
              builder: (context, language, translate, _) {
                final selected = language.code ?? '';
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    DropdownButtonFormField<String>(
                      value: selected,
                      decoration: const InputDecoration(
                        labelText: 'Display language',
                      ),
                      items: [
                        const DropdownMenuItem(
                          value: '',
                          child: Text('Original (English)'),
                        ),
                        ...uiLanguages.map(
                          (lang) => DropdownMenuItem(
                            value: lang.code,
                            child: Text(lang.label),
                          ),
                        ),
                      ],
                      onChanged: booting || translate.loading
                          ? null
                          : (value) async {
                              await language.setCode(
                                (value == null || value.isEmpty) ? null : value,
                              );
                              if (!context.mounted) return;
                              setState(() {
                                message = language.isActive
                                    ? 'Language updated — UI labels are translating.'
                                    : 'Back to original English.';
                              });
                            },
                    ),
                    const SizedBox(height: 8),
                    Text(
                      language.isActive
                          ? translate.loading
                              ? 'Translating workspace… ${translate.progressPercent}%'
                              : 'Navigation, forms, lists, analytics, dictionary, and profile labels — including numbers — are translated with Google Translate. Product names and IDs stay as entered.'
                          : 'Pick a language to translate navigation, forms, and common labels with Google Translate across Products, Warehouse, Customers, Orders, Analytics, Dictionary, and Profile.',
                      style: UmkmType.body(size: 13.5, color: UmkmColors.muted),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
        const SectionLabel(
          'Shortcuts',
          subtitle: 'Jump to tools that help you understand this workspace.',
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 0, 14, 8),
          child: Card(
            margin: EdgeInsets.zero,
            child: Column(
              children: [
                _shortcutTile(
                  icon: Icons.insights_outlined,
                  title: 'Analytics',
                  subtitle: 'Trends, mix, and lead times',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const AnalyticsScreen(),
                      ),
                    );
                  },
                ),
                Divider(
                  height: 1,
                  indent: 72,
                  color: UmkmColors.line.withOpacity(0.7),
                ),
                _shortcutTile(
                  icon: Icons.menu_book_outlined,
                  title: 'Dictionary',
                  subtitle: 'Plain-English meanings for every metric',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const GlossaryScreen(),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
        const SectionLabel(
          'Tips',
          subtitle: 'Small habits that protect your data.',
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: FormSection(
            title: 'Keep the account healthy',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '• Use a unique password you do not reuse elsewhere.',
                  style: UmkmType.body(size: 13.5),
                ),
                const SizedBox(height: 6),
                Text(
                  '• Log out on shared devices when you finish.',
                  style: UmkmType.body(size: 13.5),
                ),
                const SizedBox(height: 6),
                Text(
                  '• Delete the profile only after you have exported what you need.',
                  style: UmkmType.body(size: 13.5),
                ),
              ],
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
                'Removes this profile and all related products, customers, orders, targets, and warehouse history.',
            child: TextButton(
              onPressed: booting ? null : _delete,
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

  Widget _statusChip(String label, bool ok) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: ok
            ? UmkmColors.brandSoft.withOpacity(0.7)
            : UmkmColors.line.withOpacity(0.35),
        border: Border.all(
          color: ok
              ? UmkmColors.brand.withOpacity(0.35)
              : UmkmColors.line.withOpacity(0.8),
        ),
      ),
      child: Text(
        label.toUpperCase(),
        style: UmkmType.body(
          size: 10,
          weight: FontWeight.w700,
          color: ok ? UmkmColors.brandDeep : UmkmColors.muted,
        ).copyWith(letterSpacing: 0.4),
      ),
    );
  }

  Widget _metaChip(String label, String value, {String? action}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: UmkmType.body(
            size: 10,
            weight: FontWeight.w700,
            color: UmkmColors.muted,
          ).copyWith(letterSpacing: 0.5),
        ),
        const SizedBox(height: 2),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              value,
              style: UmkmType.body(size: 13, weight: FontWeight.w600),
            ),
            if (action != null) ...[
              const SizedBox(width: 6),
              Text(
                action,
                style: UmkmType.body(
                  size: 12,
                  weight: FontWeight.w700,
                  color: UmkmColors.brand,
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }
}

class _PersonalPreviewCard extends StatelessWidget {
  const _PersonalPreviewCard({
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.city,
    required this.country,
    required this.emailVerified,
  });

  final String firstName;
  final String lastName;
  final String email;
  final String city;
  final String country;
  final bool emailVerified;

  String get _displayName {
    final parts = [firstName.trim(), lastName.trim()]
        .where((part) => part.isNotEmpty);
    return parts.join(' ');
  }

  String get _monogram {
    String takeTwo(String value) {
      final trimmed = value.trim();
      if (trimmed.isEmpty) return '';
      return trimmed.substring(0, trimmed.length >= 2 ? 2 : 1).toUpperCase();
    }

    final first = firstName.trim();
    final last = lastName.trim();
    if (first.isNotEmpty && last.isNotEmpty) {
      return '${first[0]}${last[0]}'.toUpperCase();
    }
    if (first.isNotEmpty) return takeTwo(first);
    if (last.isNotEmpty) return takeTwo(last);
    final local = email.split('@').first.trim();
    if (local.isEmpty) return 'UH';
    return takeTwo(local);
  }

  String get _location {
    return [city.trim(), country.trim()]
        .where((part) => part.isNotEmpty)
        .join(', ');
  }

  @override
  Widget build(BuildContext context) {
    final name = _displayName;
    final location = _location;
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            UmkmColors.brandSoft.withOpacity(0.55),
            UmkmColors.surface,
          ],
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: UmkmColors.brand.withOpacity(0.22)),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [UmkmColors.brand, UmkmColors.brandDeep],
              ),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Text(
              _monogram,
              style: UmkmType.body(
                size: 15,
                weight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name.isEmpty ? 'Add your name' : name,
                  style: UmkmType.body(
                    size: 15,
                    weight: FontWeight.w700,
                    color: name.isEmpty ? UmkmColors.muted : UmkmColors.ink,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  [
                    if (email.trim().isNotEmpty) email.trim(),
                    if (location.isNotEmpty) location,
                  ].join(' · '),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: UmkmType.body(size: 12.5, color: UmkmColors.muted),
                ),
              ],
            ),
          ),
          if (email.trim().isNotEmpty) ...[
            const SizedBox(width: 8),
            StatusChip(
              label: emailVerified ? 'Verified' : 'Unverified',
              tone: emailVerified ? StatusTone.brand : StatusTone.neutral,
            ),
          ],
        ],
      ),
    );
  }
}
