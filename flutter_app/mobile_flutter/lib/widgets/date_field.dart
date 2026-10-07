import 'package:flutter/material.dart';

import '../theme.dart';
import '../utils/format.dart';

/// Tappable date input using the platform date picker. Value is "YYYY-MM-DD" or null.
class DateField extends StatelessWidget {
  const DateField({super.key, required this.label, required this.value, required this.onChanged, this.error});

  final String label;
  final String? value;
  final ValueChanged<String?> onChanged;
  final String? error;

  Future<void> _pick(BuildContext context) async {
    final initial = parseIsoDate(value) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked != null) onChanged(isoDate(picked));
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(kRadiusSm),
      onTap: () => _pick(context),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          errorText: error,
          prefixIcon: const Icon(Icons.event_rounded),
          suffixIcon: value == null
              ? null
              : IconButton(tooltip: 'Clear $label', icon: const Icon(Icons.close_rounded), onPressed: () => onChanged(null)),
        ),
        child: Text(
          value == null ? 'Not set' : formatDate(value),
          style: TextStyle(color: value == null ? AppColors.inkSubtle : AppColors.ink),
        ),
      ),
    );
  }
}
