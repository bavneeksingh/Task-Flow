import 'dart:convert';

import '../models/models.dart';

const projectStatuses = ['Not Started', 'In Progress', 'Completed'];
const taskStatuses = ['Pending', 'In Progress', 'Completed'];
const priorities = ['Low', 'Medium', 'High'];

const _monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthsLong = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const _weekdaysShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

String _two(int n) => n.toString().padLeft(2, '0');

/// LOCAL calendar date as "YYYY-MM-DD". Deliberately not toUtc()/toIso8601String():
/// in India (UTC+5:30) local midnight is the previous day in UTC, which would put
/// tasks on the wrong day.
String isoDate(DateTime d) => '${d.year.toString().padLeft(4, '0')}-${_two(d.month)}-${_two(d.day)}';

String todayIso() => isoDate(DateTime.now());

/// "2026-10-08T00:00:00.000Z" -> "2026-10-08"; "" or null -> null.
String? dateOnly(String? s) => (s == null || s.trim().isEmpty) ? null : s.split('T').first;

DateTime? parseIsoDate(String? s) {
  final d = dateOnly(s);
  if (d == null) return null;
  final parts = d.split('-');
  if (parts.length != 3) return null;
  final y = int.tryParse(parts[0]);
  final m = int.tryParse(parts[1]);
  final day = int.tryParse(parts[2]);
  if (y == null || m == null || day == null) return null;
  return DateTime(y, m, day);
}

/// "2026-03-05" -> "5 Mar 2026"
String formatDate(String? s) {
  final d = parseIsoDate(s);
  return d == null ? '' : '${d.day} ${_monthsShort[d.month - 1]} ${d.year}';
}

/// DateTime -> "Wed, Oct 8"
String formatDayLong(DateTime d) => '${_weekdaysShort[d.weekday - 1]}, ${_monthsShort[d.month - 1]} ${d.day}';

bool isOverdue(Task t) {
  final d = dateOnly(t.dueDate);
  return d != null && !t.isDone && d.compareTo(todayIso()) < 0;
}

String greeting(DateTime now) {
  if (now.hour < 12) return 'Good morning';
  if (now.hour < 17) return 'Good afternoon';
  return 'Good evening';
}

String initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
  return parts.map((p) => p[0]).take(2).join().toUpperCase();
}

// ---------------- validation (same rules as the website) ----------------
final _emailRe = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

Map<String, String> validateLogin(String email, String password) {
  final e = <String, String>{};
  if (email.trim().isEmpty) {
    e['email'] = 'Enter your email address.';
  } else if (!_emailRe.hasMatch(email.trim())) {
    e['email'] = 'Enter a valid email address.';
  }
  if (password.isEmpty) e['password'] = 'Enter your password.';
  return e;
}

Map<String, String> validateRegister(String fullName, String email, String password) {
  final e = validateLogin(email, password.isEmpty ? 'x' : password);
  if (fullName.trim().isEmpty) {
    e['full_name'] = 'Enter your full name.';
  } else if (fullName.trim().length > 120) {
    e['full_name'] = 'Keep your name under 120 characters.';
  }
  if (password.isEmpty) {
    e['password'] = 'Choose a password.';
  } else if (password.length < 8) {
    e['password'] = 'Use at least 8 characters.';
  } else if (utf8.encode(password).length > 72) {
    e['password'] = 'Use at most 72 characters.';
  }
  return e;
}

Map<String, String> validateProject({
  required String name,
  required String description,
  String? startDate,
  String? endDate,
}) {
  final e = <String, String>{};
  if (name.trim().isEmpty) {
    e['name'] = 'Give the project a name.';
  } else if (name.trim().length > 120) {
    e['name'] = 'Keep the name under 120 characters.';
  }
  if (description.length > 5000) e['description'] = 'Keep the description under 5000 characters.';
  if (startDate != null && endDate != null && endDate.compareTo(startDate) < 0) {
    e['end_date'] = "End date can't be before the start date.";
  }
  return e;
}

Map<String, String> validateTask({required String name, required String description}) {
  final e = <String, String>{};
  if (name.trim().isEmpty) {
    e['name'] = 'Give the task a name.';
  } else if (name.trim().length > 160) {
    e['name'] = 'Keep the name under 160 characters.';
  }
  if (description.length > 5000) e['description'] = 'Keep the description under 5000 characters.';
  return e;
}
