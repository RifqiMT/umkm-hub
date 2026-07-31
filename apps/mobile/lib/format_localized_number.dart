import 'package:intl/intl.dart';

String resolveNumberLocale(String? lang) {
  if (lang == null || lang.isEmpty || lang == 'en') return 'en_US';
  return lang.replaceAll('-', '_');
}

String formatLocalizedNumber(
  num value,
  String? lang, {
  int? decimalDigits,
}) {
  final locale = resolveNumberLocale(lang);
  try {
    if (decimalDigits != null) {
      final pattern = decimalDigits == 0
          ? NumberFormat.decimalPattern(locale)
          : NumberFormat('#,##0.${'#' * decimalDigits}', locale);
      return pattern.format(value);
    }
    return NumberFormat.decimalPattern(locale).format(value);
  } catch (_) {
    return NumberFormat.decimalPattern('en_US').format(value);
  }
}

String formatLocalizedInteger(num value, String? lang) {
  return formatLocalizedNumber(value, lang, decimalDigits: 0);
}
