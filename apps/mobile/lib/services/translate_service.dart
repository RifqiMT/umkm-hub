import 'package:flutter/foundation.dart';
import 'package:translator/translator.dart';

import '../data/ui_strings.dart';
import '../format_localized_number.dart';
import 'api_service.dart';
import 'translate_cache_store.dart';

/// Auto-translates UI copy via Google Translate (API proxy first, direct Google fallback).
class TranslateService extends ChangeNotifier {
  TranslateService._();

  static final TranslateService instance = TranslateService._();

  final GoogleTranslator _translator = GoogleTranslator();
  final Map<String, String> _cache = {};
  String? _lang;
  bool _loading = false;
  int _loadedCount = 0;
  ApiService? _api;

  bool get loading => _loading;
  String? get languageCode => _lang;
  bool get isActive => _lang != null && _lang!.isNotEmpty && _lang != 'en';
  int get totalCount => mobileUiStrings.length;
  int get loadedCount => _loadedCount;
  double get progress =>
      totalCount == 0 ? 1 : (_loadedCount / totalCount).clamp(0, 1);
  bool get isComplete => !isActive || (!_loading && _loadedCount >= totalCount);
  int get progressPercent => (progress * 100).round();

  void bindApi(ApiService api) {
    _api = api;
  }

  bool hasCached(String english) => _cache.containsKey(english);

  Future<void> applyLanguage(String? code) async {
    _lang = (code == null || code.isEmpty || code == 'en') ? null : code;
    _cache.clear();
    _loadedCount = 0;
    if (_lang == null) {
      notifyListeners();
      return;
    }

    await TranslateCacheStore.recordUsedLanguage(_lang!);
    _cache.addAll(await TranslateCacheStore.load(_lang!));
    _loadedCount = _countCatalogHits();

    _loading = _loadedCount < totalCount;
    notifyListeners();

    await _preloadCatalog(_lang!);

    _loading = false;
    _loadedCount = totalCount;
    notifyListeners();
  }

  int _countCatalogHits() {
    var hits = 0;
    for (final english in mobileUiStrings) {
      if (_cache.containsKey(english)) hits += 1;
    }
    return hits;
  }

  Future<void> _preloadCatalog(String code) async {
    const batchSize = 40;
    final pending = mobileUiStrings
        .where((english) => !_cache.containsKey(english))
        .toList(growable: false);

    _loadedCount = totalCount - pending.length;
    notifyListeners();

    for (var index = 0; index < pending.length; index += batchSize) {
      final batch = pending
          .skip(index)
          .take(batchSize)
          .toList(growable: false);
      await _translateBatch(batch, code);
      _loadedCount = (totalCount - pending.length + index + batch.length)
          .clamp(0, totalCount);
      notifyListeners();
    }

    await TranslateCacheStore.save(code, Map<String, String>.from(_cache));
  }

  Future<void> _translateBatch(List<String> batch, String code) async {
    // Primary path: UMKM Hub API → Google Translate (fast batched proxy).
    final api = _api;
    if (api != null) {
      try {
        final translated = await api.translateBatch(batch, code);
        final pairs = <String, String>{};
        for (var i = 0; i < batch.length; i++) {
          final value = i < translated.length && translated[i].trim().isNotEmpty
              ? translated[i]
              : batch[i];
          pairs[batch[i]] = value;
          _cache[batch[i]] = value;
        }
        await TranslateCacheStore.merge(code, pairs);
        return;
      } catch (_) {
        // Fall back to direct Google Translate below.
      }
    }

    // Offline / API unavailable: Google Translate via the translator package.
    const parallel = 6;
    for (var i = 0; i < batch.length; i += parallel) {
      final slice = batch.skip(i).take(parallel).toList(growable: false);
      await Future.wait(
        slice.map((english) => _translateAndCache(english, code)),
      );
    }
  }

  Future<void> _translateAndCache(String english, String code) async {
    if (_cache.containsKey(english)) return;
    try {
      final translated = await _translateViaProvider(english, code);
      _cache[english] = translated;
      await TranslateCacheStore.merge(code, {english: translated});
    } catch (_) {
      _cache[english] = english;
    }
  }

  Future<String> _translateViaProvider(String english, String code) async {
    final result = await _translator
        .translate(english, to: code)
        .timeout(const Duration(seconds: 10));
    return result.text;
  }

  String text(String english) {
    if (_lang == null) return english;
    return _cache[english] ?? english;
  }

  String formatInteger(num value) => formatLocalizedInteger(value, _lang);

  String formatNumber(num value, {int? decimalDigits}) =>
      formatLocalizedNumber(value, _lang, decimalDigits: decimalDigits);

  Future<String> translate(String english) async {
    if (_lang == null) return english;
    final cached = _cache[english];
    if (cached != null) return cached;
    await _translateAndCache(english, _lang!);
    notifyListeners();
    return _cache[english] ?? english;
  }
}
