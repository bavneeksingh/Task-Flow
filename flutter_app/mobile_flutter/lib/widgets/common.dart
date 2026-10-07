import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../state/auth_state.dart';
import '../theme.dart';
import '../utils/format.dart';

// ---------------- badges ----------------
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final (bg, fg, dot) = switch (status) {
      'In Progress' => (AppColors.pastelPurple, AppColors.doingText, AppColors.doing),
      'Completed' => (AppColors.pastelMint, AppColors.doneText, AppColors.done),
      _ => (AppColors.todoBg, AppColors.inkMuted, AppColors.inkSubtle),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(99)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 7, height: 7, decoration: BoxDecoration(color: dot, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text(status, style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w700)),
      ]),
    );
  }
}

class PriorityBadge extends StatelessWidget {
  const PriorityBadge({super.key, required this.priority});
  final String priority;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (priority) {
      'High' => (AppColors.pastelPink, AppColors.dangerText),
      'Medium' => (AppColors.pastelYellow, AppColors.warningText),
      _ => (AppColors.pastelMint, AppColors.doneText),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(99)),
      child: Text(priority, style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w700)),
    );
  }
}

// ---------------- progress ribbon ----------------
/// One bar split into completed / in progress / pending, like the website's StatusRibbon.
class StatusRibbon extends StatelessWidget {
  const StatusRibbon({super.key, this.pending = 0, this.inProgress = 0, this.completed = 0, this.tall = false});

  final int pending;
  final int inProgress;
  final int completed;
  final bool tall;

  @override
  Widget build(BuildContext context) {
    final total = pending + inProgress + completed;
    final h = tall ? 14.0 : 8.0;
    return Semantics(
      label: total == 0
          ? 'No tasks yet'
          : '$completed of $total tasks completed, $inProgress in progress, $pending pending',
      child: ClipRRect(
        borderRadius: BorderRadius.circular(h / 2),
        child: SizedBox(
          height: h,
          width: double.infinity,
          child: total == 0
              ? const ColoredBox(color: AppColors.lineStrong)
              : Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  if (completed > 0) Expanded(flex: completed, child: const ColoredBox(color: AppColors.done)),
                  if (inProgress > 0) Expanded(flex: inProgress, child: const ColoredBox(color: AppColors.doing)),
                  if (pending > 0) Expanded(flex: pending, child: const ColoredBox(color: AppColors.lineStrong)),
                ]),
        ),
      ),
    );
  }
}

class LegendItem extends StatelessWidget {
  const LegendItem({super.key, required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 10, height: 10, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(3))),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(color: AppColors.inkMuted, fontSize: 13)),
      ]);
}

// ---------------- containers ----------------
class SectionCard extends StatelessWidget {
  const SectionCard({super.key, required this.child, this.color = AppColors.surface, this.padding = 20, this.onTap});

  final Widget child;
  final Color color;
  final double padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: color,
        borderRadius: BorderRadius.circular(kRadius),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(padding: EdgeInsets.all(padding), child: child),
        ),
      );
}

// ---------------- states ----------------
class LoadingView extends StatelessWidget {
  const LoadingView({super.key, this.label = 'Loading'});
  final String label;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Semantics(label: label, child: const CircularProgressIndicator(color: AppColors.primaryDark)),
        ),
      );
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.error, this.onRetry});
  final Object error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final offline = error is ApiException && (error as ApiException).isNetwork;
    final message = error is ApiException ? (error as ApiException).message : 'Something went wrong. Please try again.';
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 12),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(color: AppColors.pastelPink.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(kRadius)),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(offline ? Icons.wifi_off_rounded : Icons.error_outline_rounded, color: AppColors.dangerText, size: 32),
        const SizedBox(height: 8),
        Text(offline ? 'You seem to be offline' : 'Something went wrong',
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.dangerText)),
        const SizedBox(height: 6),
        Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.inkMuted)),
        if (onRetry != null) ...[
          const SizedBox(height: 14),
          OutlinedButton(onPressed: onRetry, child: const Text('Try again')),
        ],
      ]),
    );
  }
}

class EmptyView extends StatelessWidget {
  const EmptyView({super.key, required this.title, this.message, this.action, this.emoji = '🗂️'});
  final String title;
  final String? message;
  final Widget? action;
  final String emoji;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.symmetric(vertical: 12),
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(kRadius)),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(emoji, style: const TextStyle(fontSize: 30)),
          const SizedBox(height: 8),
          Text(title, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          if (message != null) ...[
            const SizedBox(height: 6),
            Text(message!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.inkMuted)),
          ],
          if (action != null) ...[const SizedBox(height: 14), action!],
        ]),
      );
}

class FormBanner extends StatelessWidget {
  const FormBanner({super.key, required this.message, this.isNotice = false});
  final String message;
  final bool isNotice;

  @override
  Widget build(BuildContext context) {
    if (message.isEmpty) return const SizedBox.shrink();
    return Semantics(
      liveRegion: true,
      child: Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isNotice ? AppColors.pastelPurple : AppColors.pastelPink,
          borderRadius: BorderRadius.circular(kRadiusSm),
        ),
        child: Text(message,
            style: TextStyle(color: isNotice ? AppColors.doingText : AppColors.dangerText, fontWeight: FontWeight.w600)),
      ),
    );
  }
}

// ---------------- inputs ----------------
/// A horizontal row of choice chips. With [allLabel] it acts as a filter ('' = all).
class ChoiceRow extends StatelessWidget {
  const ChoiceRow({super.key, required this.options, required this.value, required this.onChanged, this.allLabel, this.label});

  final List<String> options;
  final String value;
  final ValueChanged<String> onChanged;
  final String? allLabel;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final items = [if (allLabel != null) ('', allLabel!), for (final o in options) (o, o)];
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      if (label != null)
        Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Text(label!, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
        ),
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(children: [
          for (final (v, text) in items)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(text),
                selected: v == value,
                showCheckmark: false,
                onSelected: (_) => onChanged(v),
                selectedColor: AppColors.primaryDark,
                backgroundColor: AppColors.surface,
                side: BorderSide(color: v == value ? AppColors.primaryDark : AppColors.lineStrong),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(99)),
                labelStyle: TextStyle(
                  color: v == value ? Colors.white : AppColors.ink,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
        ]),
      ),
    ]);
  }
}

class SearchField extends StatelessWidget {
  const SearchField({super.key, required this.controller, required this.hint, required this.onChanged});
  final TextEditingController controller;
  final String hint;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) => TextField(
        controller: controller,
        onChanged: onChanged,
        textInputAction: TextInputAction.search,
        decoration: InputDecoration(
          hintText: hint,
          prefixIcon: const Icon(Icons.search_rounded),
          suffixIcon: ValueListenableBuilder<TextEditingValue>(
            valueListenable: controller,
            builder: (_, v, __) => v.text.isEmpty
                ? const SizedBox.shrink()
                : IconButton(
                    tooltip: 'Clear search',
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () {
                      controller.clear();
                      onChanged('');
                    },
                  ),
          ),
        ),
      );
}

// ---------------- helpers ----------------
void showSnack(BuildContext context, String message, {bool error = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      content: Text(message),
      backgroundColor: error ? AppColors.dangerText : AppColors.primaryDark,
    ));
}

Future<bool> confirmDialog(BuildContext context,
    {required String title, required String message, required String confirmLabel}) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: AppColors.dangerText),
          onPressed: () => Navigator.pop(ctx, true),
          child: Text(confirmLabel),
        ),
      ],
    ),
  );
  return ok ?? false;
}

/// Avatar with the user's initials; tap for account details and Log out.
class AccountButton extends StatelessWidget {
  const AccountButton({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    if (user == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(right: 12),
      child: IconButton(
        tooltip: 'Account',
        onPressed: () => showModalBottomSheet<void>(
          context: context,
          showDragHandle: true,
          builder: (ctx) => SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppColors.pastelPurple,
                  child: Text(initials(user.fullName),
                      style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.doingText)),
                ),
                const SizedBox(height: 12),
                Text(user.fullName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                Text(user.email, style: const TextStyle(color: AppColors.inkMuted)),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    icon: const Icon(Icons.logout_rounded),
                    label: const Text('Log out'),
                    onPressed: () {
                      Navigator.pop(ctx);
                      context.read<AuthState>().logout();
                    },
                  ),
                ),
              ]),
            ),
          ),
        ),
        icon: CircleAvatar(
          radius: 17,
          backgroundColor: AppColors.pastelPurple,
          child: Text(initials(user.fullName),
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.doingText)),
        ),
      ),
    );
  }
}
