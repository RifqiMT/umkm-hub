/// Compact labels for Analytics Top/Bottom 5 rankings (mirrors web).

String _wordStem(String word, [int max = 3]) {
  final letters = word.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '');
  if (letters.isEmpty) return '';
  final head = letters[0].toUpperCase();
  if (letters.length == 1 || max <= 1) return head;
  final end = letters.length < max ? letters.length : max;
  final rest = letters.substring(1, end).toLowerCase();
  return '$head$rest';
}

/// "Daging Sapi Tenderloin (1000)" → "D.S.Ten 1000"
String abbreviateProductAxisLabel(String name) {
  final match = RegExp(r'^(.*?)\s*\(\s*([\d.]+)\s*\)\s*$').firstMatch(name.trim());
  final base = (match?.group(1) ?? name).trim();
  final pack = match?.group(2);
  final words = base.split(RegExp(r'[\s_\-]+')).where((w) => w.isNotEmpty).toList();

  late final String code;
  if (words.isEmpty) {
    code = '?';
  } else if (words.length == 1) {
    code = _wordStem(words.first, 4);
  } else if (words.length == 2) {
    code = '${_wordStem(words[0], 3)}.${words[1][0].toUpperCase()}';
  } else {
    final head = words.sublist(0, words.length - 1).map((w) => w[0].toUpperCase()).join('.');
    code = '$head.${_wordStem(words.last, 3)}';
  }
  return pack != null ? '$code $pack' : code;
}

/// "Budi Santoso" → "B. Santoso"
String abbreviateCustomerAxisLabel(String name) {
  final parts = name.trim().split(RegExp(r'[\s_\-]+')).where((w) => w.isNotEmpty).toList();
  if (parts.isEmpty) return '—';
  if (parts.length == 1) {
    final w = parts.first;
    return w.length <= 10 ? w : '${w.substring(0, 9)}…';
  }
  final first = parts.first[0].toUpperCase();
  final last = parts.last;
  return '$first. $last';
}
