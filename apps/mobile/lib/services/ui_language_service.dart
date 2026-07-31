import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'translate_service.dart';

/// Device language preference — same storage key as web (`umkm-ui-language`).
class UiLanguageService extends ChangeNotifier {
  static const storageKey = 'umkm-ui-language';

  String? _code;
  bool _ready = false;

  String? get code => _code;
  bool get ready => _ready;
  bool get isActive => _code != null && _code!.isNotEmpty && _code != 'en';

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(storageKey)?.trim();
    _code = (raw == null || raw.isEmpty || raw == 'en') ? null : raw;
    _ready = true;
    await TranslateService.instance.applyLanguage(_code);
    notifyListeners();
  }

  Future<void> setCode(String? next) async {
    final normalized = next?.trim();
    final value = (normalized == null || normalized.isEmpty || normalized == 'en')
        ? null
        : normalized;
    if (value == _code) return;

    final prefs = await SharedPreferences.getInstance();
    if (value == null) {
      await prefs.remove(storageKey);
    } else {
      await prefs.setString(storageKey, value);
    }
    _code = value;
    await TranslateService.instance.applyLanguage(_code);
    notifyListeners();
  }
}
