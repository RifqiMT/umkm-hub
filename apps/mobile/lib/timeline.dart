/// Shared calendar timelines for Analytics and date pickers (web-aligned).
class AppTimeline {
  AppTimeline._();

  /// Rolling years in Analytics “Annual” charts (ending at selected year).
  static const int annualWindow = 10;

  static const int yearMin = 2020;
  static const int yearMax = 2035;

  /// Descending year list for dropdowns (newest first).
  static List<int> yearOptions([DateTime? now]) {
    final n = (now ?? DateTime.now().toUtc()).year;
    final end = n + 5 > yearMax ? n + 5 : yearMax;
    final start = n - 10 < yearMin ? n - 10 : yearMin;
    return [for (var y = end; y >= start; y--) y];
  }

  static String annualWindowLabel(int endYear) {
    final start = endYear - (annualWindow - 1);
    return '$start–$endYear';
  }

  static DateTime get firstDate => DateTime(yearMin);
  static DateTime get lastDate => DateTime(yearMax, 12, 31);
}
