import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Device-local translation cache — one blob per language the user has selected.
class TranslateCacheStore {
  TranslateCacheStore._();

  static const cachePrefix = 'umkm-translate-cache:';
  static const usedLanguagesKey = 'umkm-translate-used-langs';
  static const maxEntries = 4000;
  static const maxUsedLanguages = 12;

  static Future<Map<String, String>> load(String lang) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('$cachePrefix$lang');
    if (raw == null || raw.isEmpty) return {};
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return {};
      return decoded.map(
        (key, value) => MapEntry(key.toString(), value.toString()),
      );
    } catch (_) {
      return {};
    }
  }

  static Future<void> save(String lang, Map<String, String> entries) async {
    if (entries.isEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    var next = Map<String, String>.from(entries);
    if (next.length > maxEntries) {
      final keys = next.keys.toList()..sort();
      final trimmed = keys.skip(keys.length - maxEntries);
      next = {for (final key in trimmed) key: next[key]!};
    }
    await prefs.setString('$cachePrefix$lang', jsonEncode(next));
  }

  static Future<void> merge(String lang, Map<String, String> pairs) async {
    if (pairs.isEmpty) return;
    final current = await load(lang);
    current.addAll(pairs);
    await save(lang, current);
  }

  static Future<List<String>> usedLanguages() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(usedLanguagesKey);
    return raw ?? const [];
  }

  static Future<void> recordUsedLanguage(String lang) async {
    final code = lang.trim();
    if (code.isEmpty || code == 'en') return;
    final prefs = await SharedPreferences.getInstance();
    final used = (await usedLanguages()).where((item) => item != code).toList();
    used.insert(0, code);
    await prefs.setStringList(
      usedLanguagesKey,
      used.take(maxUsedLanguages).toList(growable: false),
    );
  }

  static Future<void> clearLanguage(String lang) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('$cachePrefix$lang');
    final used = (await usedLanguages()).where((item) => item != lang).toList();
    await prefs.setStringList(usedLanguagesKey, used);
  }
}
