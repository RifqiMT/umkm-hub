import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class UmkmColors {
  static const brand = Color(0xFF0B6B58);
  static const brandDeep = Color(0xFF064F41);
  static const brandSoft = Color(0xFFD3EBE3);
  static const ink = Color(0xFF14241E);
  static const muted = Color(0xFF5A6F66);
  static const line = Color(0xFFC5D4CC);
  static const surface = Color(0xFFFBFEFC);
  static const bg = Color(0xFFEEF5F1);
  static const danger = Color(0xFFA33B3B);
}

/// Shared type styles — Manrope only (matches web `--font-ui`).
class UmkmType {
  static TextStyle display({
    double size = 26,
    FontWeight weight = FontWeight.w700,
    Color color = UmkmColors.brandDeep,
    double letterSpacing = -0.4,
    double height = 1.2,
  }) {
    return GoogleFonts.manrope(
      fontSize: size,
      fontWeight: weight,
      color: color,
      letterSpacing: letterSpacing,
      height: height,
    );
  }

  static TextStyle title({
    double size = 20,
    FontWeight weight = FontWeight.w700,
    Color color = UmkmColors.brandDeep,
  }) {
    return display(size: size, weight: weight, color: color, letterSpacing: -0.3);
  }

  static TextStyle body({
    double size = 15,
    FontWeight weight = FontWeight.w500,
    Color color = UmkmColors.ink,
  }) {
    return GoogleFonts.manrope(
      fontSize: size,
      fontWeight: weight,
      color: color,
      letterSpacing: -0.15,
      height: 1.45,
    );
  }

  static TextStyle label({
    double size = 12,
    FontWeight weight = FontWeight.w700,
    Color color = UmkmColors.muted,
  }) {
    return GoogleFonts.manrope(
      fontSize: size,
      fontWeight: weight,
      color: color,
      letterSpacing: 0.6,
    );
  }
}

ThemeData buildUmkmTheme() {
  final base = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    colorScheme: ColorScheme.fromSeed(
      seedColor: UmkmColors.brand,
      brightness: Brightness.light,
      primary: UmkmColors.brand,
      onPrimary: const Color(0xFFF4FFFB),
      secondary: UmkmColors.brandDeep,
      surface: UmkmColors.surface,
      error: UmkmColors.danger,
    ),
    scaffoldBackgroundColor: UmkmColors.bg,
  );

  final textTheme = GoogleFonts.manropeTextTheme(base.textTheme).apply(
    bodyColor: UmkmColors.ink,
    displayColor: UmkmColors.ink,
  );

  return base.copyWith(
    textTheme: textTheme.copyWith(
      displayLarge: UmkmType.display(size: 32),
      displayMedium: UmkmType.display(size: 28),
      headlineLarge: UmkmType.display(size: 26),
      headlineMedium: UmkmType.title(size: 22),
      headlineSmall: UmkmType.title(size: 18),
      titleLarge: UmkmType.title(size: 18),
      titleMedium: UmkmType.body(size: 16, weight: FontWeight.w700),
      titleSmall: UmkmType.body(size: 14, weight: FontWeight.w700),
      bodyLarge: UmkmType.body(size: 16),
      bodyMedium: UmkmType.body(size: 15),
      bodySmall: UmkmType.body(size: 13, color: UmkmColors.muted),
      labelLarge: UmkmType.body(size: 14, weight: FontWeight.w700),
      labelMedium: UmkmType.label(size: 12),
      labelSmall: UmkmType.label(size: 11),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: UmkmColors.surface.withOpacity(0.88),
      foregroundColor: UmkmColors.brandDeep,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      centerTitle: false,
      titleTextStyle: UmkmType.display(size: 22, weight: FontWeight.w700),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: UmkmColors.surface.withOpacity(0.96),
      indicatorColor: UmkmColors.brandSoft,
      elevation: 0,
      height: 68,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return UmkmType.body(
          size: 12,
          weight: selected ? FontWeight.w700 : FontWeight.w500,
          color: selected ? UmkmColors.brandDeep : UmkmColors.muted,
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return IconThemeData(
          color: selected ? UmkmColors.brandDeep : UmkmColors.muted,
        );
      }),
    ),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: UmkmColors.brand,
      foregroundColor: const Color(0xFFF4FFFB),
      elevation: 2,
      extendedPadding: const EdgeInsets.symmetric(horizontal: 18),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      extendedTextStyle: UmkmType.body(
        size: 14,
        weight: FontWeight.w700,
        color: const Color(0xFFF4FFFB),
      ),
    ),
    cardTheme: CardThemeData(
      color: UmkmColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: UmkmColors.line.withOpacity(0.72)),
      ),
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      clipBehavior: Clip.antiAlias,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      labelStyle: UmkmType.body(size: 14, color: UmkmColors.muted),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: UmkmColors.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: UmkmColors.line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: UmkmColors.brand, width: 1.4),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: UmkmColors.brand,
        foregroundColor: const Color(0xFFF4FFFB),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: UmkmType.body(
          size: 14,
          weight: FontWeight.w700,
          color: const Color(0xFFF4FFFB),
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: UmkmColors.brandDeep,
        textStyle: UmkmType.body(size: 14, weight: FontWeight.w700),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: UmkmColors.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      titleTextStyle: UmkmType.title(size: 20),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: UmkmColors.surface,
      showDragHandle: true,
      dragHandleColor: UmkmColors.line,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
    ),
    listTileTheme: const ListTileThemeData(
      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      iconColor: UmkmColors.brand,
    ),
    dividerTheme: const DividerThemeData(color: UmkmColors.line, space: 1),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: UmkmColors.brandDeep,
      contentTextStyle: UmkmType.body(
        size: 14,
        weight: FontWeight.w600,
        color: const Color(0xFFF4FFFB),
      ),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
  );
}
