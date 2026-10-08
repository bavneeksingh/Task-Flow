import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../models/models.dart';
import '../theme.dart';
import '../utils/format.dart';
import '../widgets/common.dart';
import 'project_detail_screen.dart';

/// Month grid with a dot per task due that day; tap a day to list its tasks.
/// All dates are LOCAL calendar dates (see isoDate in utils/format.dart).
class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  late DateTime _month; // first day of the shown month
  late DateTime _selected;
  List<Task>? _tasks;
  Map<int, String> _projectNames = {};
  Object? _error;
  bool _loading = true;
  int _request = 0;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _month = DateTime(now.year, now.month);
    _selected = DateTime(now.year, now.month, now.day);
    _load();
  }

  Future<void> _load() async {
    final id = ++_request;
    setState(() {
      _loading = true;
      _error = null;
    });
    final api = context.read<ApiClient>();
    try {
      final r = await Future.wait<Object>([api.listAllTasks(), api.listProjects()]);
      if (!mounted || id != _request) return;
      setState(() {
        _tasks = r[0] as List<Task>;
        _projectNames = {for (final p in r[1] as List<Project>) p.id: p.name};
        _loading = false;
      });
    } catch (e) {
      if (!mounted || id != _request) return;
      setState(() {
        _error = e;
        _loading = false;
      });
    }
  }

  Map<String, List<Task>> get _byDate {
    final map = <String, List<Task>>{};
    for (final t in _tasks ?? const <Task>[]) {
      final d = dateOnly(t.dueDate);
      if (d != null) map.putIfAbsent(d, () => []).add(t);
    }
    return map;
  }

  /// Cells for a Sunday-first grid, padded with days from the neighbouring months.
  List<DateTime> _cells() {
    final leading = _month.weekday % 7; // DateTime.weekday: Mon=1 ... Sun=7
    final daysInMonth = DateTime(_month.year, _month.month + 1, 0).day;
    final count = ((leading + daysInMonth) / 7).ceil() * 7;
    // Building each date from y/m/d (not by adding Durations) avoids DST surprises.
    return [for (var i = 0; i < count; i++) DateTime(_month.year, _month.month, 1 - leading + i)];
  }

  void _shiftMonth(int delta) => setState(() => _month = DateTime(_month.year, _month.month + delta));

  void _goToday() {
    final now = DateTime.now();
    setState(() {
      _month = DateTime(now.year, now.month);
      _selected = DateTime(now.year, now.month, now.day);
    });
  }

  Future<void> _openProject(Task t) async {
    await Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => ProjectDetailScreen(projectId: t.projectId, initialName: _projectNames[t.projectId]),
    ));
    if (mounted) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.asset('assets/logo.jpg', width: 28, height: 28, semanticLabel: 'TaskFlow logo'),
            ),
            const SizedBox(width: 10),
            const Text('Calendar'),
          ],
        ),
        actions: const [AccountButton()],
      ),
      body: _tasks == null && _loading
          ? const LoadingView(label: 'Loading tasks')
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
                children: [
                  if (_error != null) ErrorView(error: _error!, onRetry: _load),
                  if (_tasks != null) ...[_monthCard(), const SizedBox(height: 16), _dayCard()],
                ],
              ),
            ),
    );
  }

  Widget _monthCard() {
    final byDate = _byDate;
    final today = todayIso();
    final selected = isoDate(_selected);
    final text = Theme.of(context).textTheme;

    return SectionCard(
      padding: 14,
      child: Column(children: [
        Row(children: [
          Expanded(
            child: Text('${monthsLong[_month.month - 1]} ${_month.year}',
                style: text.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
          ),
          TextButton(onPressed: _goToday, child: const Text('Today')),
          IconButton(tooltip: 'Previous month', onPressed: () => _shiftMonth(-1), icon: const Icon(Icons.chevron_left_rounded)),
          IconButton(tooltip: 'Next month', onPressed: () => _shiftMonth(1), icon: const Icon(Icons.chevron_right_rounded)),
        ]),
        const SizedBox(height: 8),
        Row(children: [
          for (final d in const ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
            Expanded(
              child: Center(
                child: Text(d, style: const TextStyle(color: AppColors.inkMuted, fontWeight: FontWeight.w700, fontSize: 12)),
              ),
            ),
        ]),
        const SizedBox(height: 6),
        GridView.count(
          crossAxisCount: 7,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 4,
          crossAxisSpacing: 4,
          children: [
            for (final day in _cells())
              _DayCell(
                day: day,
                inMonth: day.month == _month.month,
                isToday: isoDate(day) == today,
                isSelected: isoDate(day) == selected,
                tasks: byDate[isoDate(day)] ?? const [],
                onTap: () => setState(() {
                  _selected = day;
                  if (day.month != _month.month) _month = DateTime(day.year, day.month);
                }),
              ),
          ],
        ),
      ]),
    );
  }

  Widget _dayCard() {
    final tasks = _byDate[isoDate(_selected)] ?? const <Task>[];
    final text = Theme.of(context).textTheme;
    return SectionCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Tasks for ${formatDayLong(_selected)}', style: text.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        Text(
          tasks.isEmpty ? 'You have a free day!' : 'You have ${tasks.length} task${tasks.length == 1 ? '' : 's'} scheduled.',
          style: const TextStyle(color: AppColors.inkMuted),
        ),
        const SizedBox(height: 16),
        if (tasks.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(
              child: Column(children: [
                Text('🏖️', style: TextStyle(fontSize: 30)),
                SizedBox(height: 6),
                Text('No tasks due on this date.', style: TextStyle(color: AppColors.inkMuted)),
              ]),
            ),
          ),
        for (final t in tasks)
          Container(
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.lineStrong),
              borderRadius: BorderRadius.circular(kRadiusSm),
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(kRadiusSm),
              onTap: () => _openProject(t),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(
                    t.name,
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                      color: t.isDone ? AppColors.inkSubtle : AppColors.ink,
                      decoration: t.isDone ? TextDecoration.lineThrough : null,
                    ),
                  ),
                  if ((t.description ?? '').isNotEmpty)
                    Text(t.description!,
                        maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.inkMuted)),
                  const SizedBox(height: 10),
                  Row(children: [
                    StatusBadge(status: t.status),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(_projectNames[t.projectId] ?? '',
                          maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.inkMuted, fontSize: 12)),
                    ),
                    const Icon(Icons.chevron_right_rounded),
                  ]),
                ]),
              ),
            ),
          ),
      ]),
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.day,
    required this.inMonth,
    required this.isToday,
    required this.isSelected,
    required this.tasks,
    required this.onTap,
  });

  final DateTime day;
  final bool inMonth;
  final bool isToday;
  final bool isSelected;
  final List<Task> tasks;
  final VoidCallback onTap;

  Color _dotColor(Task t) {
    if (isSelected) return Colors.white;
    return switch (t.status) {
      'In Progress' => AppColors.doing,
      'Completed' => AppColors.done,
      _ => AppColors.ink,
    };
  }

  @override
  Widget build(BuildContext context) {
    final bg = isSelected ? AppColors.primaryDark : (isToday ? AppColors.pastelYellow : AppColors.surface);
    final fg = isSelected ? Colors.white : (inMonth ? AppColors.ink : AppColors.inkSubtle);
    return Semantics(
      button: true,
      selected: isSelected,
      label: '${formatDayLong(day)}, ${tasks.length} task${tasks.length == 1 ? '' : 's'}',
      excludeSemantics: true,
      child: Material(
        color: bg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
          side: isSelected ? BorderSide.none : const BorderSide(color: AppColors.lineStrong),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Text('${day.day}',
                style: TextStyle(color: fg, fontWeight: isSelected || isToday ? FontWeight.w800 : FontWeight.w500)),
            const SizedBox(height: 3),
            SizedBox(
              height: 6,
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                for (final t in tasks.take(3))
                  Container(
                    width: 5,
                    height: 5,
                    margin: const EdgeInsets.symmetric(horizontal: 1),
                    decoration: BoxDecoration(color: _dotColor(t), shape: BoxShape.circle),
                  ),
                if (tasks.length > 3) Text('+', style: TextStyle(fontSize: 8, height: 0.8, color: fg)),
              ]),
            ),
          ]),
        ),
      ),
    );
  }
}
