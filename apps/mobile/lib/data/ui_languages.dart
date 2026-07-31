class UiLanguageOption {
  const UiLanguageOption({
    required this.code,
    required this.name,
    required this.nativeName,
  });

  final String code;
  final String name;
  final String nativeName;

  String get label =>
      nativeName == name ? name : '$name ($nativeName)';
}

/// Google Translate language codes (aligned with web).
const List<UiLanguageOption> uiLanguages = [
  UiLanguageOption(code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia'),
  UiLanguageOption(code: 'en', name: 'English', nativeName: 'English'),
  UiLanguageOption(code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu'),
  UiLanguageOption(code: 'jw', name: 'Javanese', nativeName: 'Basa Jawa'),
  UiLanguageOption(code: 'su', name: 'Sundanese', nativeName: 'Basa Sunda'),
  UiLanguageOption(code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文'),
  UiLanguageOption(code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文'),
  UiLanguageOption(code: 'ja', name: 'Japanese', nativeName: '日本語'),
  UiLanguageOption(code: 'ko', name: 'Korean', nativeName: '한국어'),
  UiLanguageOption(code: 'ar', name: 'Arabic', nativeName: 'العربية'),
  UiLanguageOption(code: 'hi', name: 'Hindi', nativeName: 'हिन्दी'),
  UiLanguageOption(code: 'th', name: 'Thai', nativeName: 'ไทย'),
  UiLanguageOption(code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt'),
  UiLanguageOption(code: 'tl', name: 'Tagalog', nativeName: 'Tagalog'),
  UiLanguageOption(code: 'nl', name: 'Dutch', nativeName: 'Nederlands'),
  UiLanguageOption(code: 'de', name: 'German', nativeName: 'Deutsch'),
  UiLanguageOption(code: 'fr', name: 'French', nativeName: 'Français'),
  UiLanguageOption(code: 'es', name: 'Spanish', nativeName: 'Español'),
  UiLanguageOption(code: 'pt', name: 'Portuguese', nativeName: 'Português'),
  UiLanguageOption(code: 'ru', name: 'Russian', nativeName: 'Русский'),
  UiLanguageOption(code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans'),
  UiLanguageOption(code: 'bn', name: 'Bengali', nativeName: 'বাংলা'),
  UiLanguageOption(code: 'my', name: 'Myanmar (Burmese)', nativeName: 'မြန်မာ'),
  UiLanguageOption(code: 'tr', name: 'Turkish', nativeName: 'Türkçe'),
  UiLanguageOption(code: 'uk', name: 'Ukrainian', nativeName: 'Українська'),
  UiLanguageOption(code: 'ur', name: 'Urdu', nativeName: 'اردو'),
];

UiLanguageOption? findUiLanguage(String? code) {
  if (code == null || code.isEmpty) return null;
  for (final lang in uiLanguages) {
    if (lang.code == code) return lang;
  }
  return null;
}
