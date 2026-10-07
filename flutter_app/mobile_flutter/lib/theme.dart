import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Same palette as the website's styles.css (:root variables).
class AppColors {
  static const bgRoot = Color(0xFFE9F2F1);
  static const surface = Color(0xFFFFFFFF);
  static const ink = Color(0xFF18181B);
  static const inkMuted = Color(0xFF71717A);
  static const inkSubtle = Color(0xFFA1A1AA);
  static const line = Color(0xFFF4F4F5);
  static const lineStrong = Color(0xFFE4E4E7);

  static const pastelYellow = Color(0xFFFCEFD2);
  static const pastelPurple = Color(0xFFE6DBFA);
  static const pastelMint = Color(0xFFDBF0EC);
  static const pastelPink = Color(0xFFF7CDD3);

  static const primaryDark = Color(0xFF18181B);

  // Fills (bars, dots, chart) use the website's colours.
  static const done = Color(0xFF77CBB9);
  static const doing = Color(0xFF9D7FE3);
  static const todoBg = Color(0xFFF4F4F5);
  static const danger = Color(0xFFE27D88);
  static const warning = Color(0xFFDBAF4B);

  // Darker versions for TEXT on pastel backgrounds, so labels stay readable
  // (the light fills fail contrast when used as text).
  static const doneText = Color(0xFF2F7F6F);
  static const doingText = Color(0xFF6B4FC4);
  static const dangerText = Color(0xFFB83A4B);
  static const warningText = Color(0xFF8A6512);
}

const double kRadius = 20;
const double kRadiusSm = 12;

ThemeData buildTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primaryDark,
      primary: AppColors.primaryDark,
      onPrimary: Colors.white,
      surface: AppColors.surface,
      error: AppColors.dangerText,
    ),
    scaffoldBackgroundColor: AppColors.bgRoot,
  );

  OutlineInputBorder border(Color c, [double w = 1]) => OutlineInputBorder(
        borderRadius: BorderRadius.circular(kRadiusSm),
        borderSide: BorderSide(color: c, width: w),
      );

  return base.copyWith(
    textTheme: GoogleFonts.plusJakartaSansTextTheme(base.textTheme)
        .apply(bodyColor: AppColors.ink, displayColor: AppColors.ink),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.bgRoot,
      foregroundColor: AppColors.ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: border(AppColors.lineStrong),
      enabledBorder: border(AppColors.lineStrong),
      focusedBorder: border(AppColors.primaryDark, 1.5),
      errorBorder: border(AppColors.dangerText),
      focusedErrorBorder: border(AppColors.dangerText, 1.5),
      hintStyle: const TextStyle(color: AppColors.inkSubtle),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.primaryDark,
        foregroundColor: Colors.white,
        minimumSize: const Size(64, 50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(kRadiusSm)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.ink,
        minimumSize: const Size(64, 44),
        side: const BorderSide(color: AppColors.lineStrong),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(kRadiusSm)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ),
    navigationBarTheme: const NavigationBarThemeData(
      backgroundColor: AppColors.surface,
      indicatorColor: AppColors.pastelMint,
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: AppColors.primaryDark,
      foregroundColor: Colors.white,
    ),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
    bottomSheetTheme: const BottomSheetThemeData(backgroundColor: AppColors.surface),
  );
}
