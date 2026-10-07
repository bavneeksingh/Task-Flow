import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../models/models.dart';
import '../state/auth_state.dart';
import '../theme.dart';
import '../utils/format.dart';
import '../widgets/common.dart';
import '../widgets/half_donut.dart';
import 'project_detail_screen.dart';
import 'project_form_sheet.dart';
import 'task_list_screen.dart';

class _DashboardData {
  _DashboardData(this.stats, this.projectsInProgress, this.projects, this.tasks);
  final DashboardStats stats;
  final int projectsInProgress;
  final List<Project> projects;
  final List<Task> tasks;
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  _DashboardData? _data;
  Object? _error;
  bool _loading = true;
  int _request = 0; // newest request wins; older responses are ignored

  @override
  void initState() {
    super.initState();
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
      final r = await Future.wait<Object>([
        api.dashboard(),
        api.listProjects(status: 'In Progress'),
        api.listProjects(),
        api.listAllTasks(),
      ]);
      if (!mounted || id != _request) return;
      setState(() {
        _data = _DashboardData(
          r[0] as DashboardStats,
          (r[1] as List<Project>).length,
          r[2] as List<Project>,
          r[3] as List<Task>,
        );
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

  Future<void> _open(Widget screen) async {
    await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => screen));
    if (mounted) _load(); // something may have changed on the other screen
  }

  Future<void> _createProject() async {
    final saved = await showProjectForm(context);
    if (saved == null || !mounted) return;
    showSnack(context, 'Project created');
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    return Scaffold(
      appBar: AppBar(title: const Text('Dashboard'), actions: const [AccountButton()]),
      body: _data == null && _loading
          ? const LoadingView(label: 'Loading dashboard')
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
                children: _data == null
                    ? [ErrorView(error: _error!, onRetry: _load)]
                    : _content(_data!, user?.firstName ?? ''),
              ),
            ),
    );
  }

  List<Widget> _content(_DashboardData d, String firstName) {
    final s = d.stats;
    final names = {for (final p in d.projects) p.id: p.name};
    final today = todayIso();
    final todayTasks = d.tasks.where((t) => dateOnly(t.dueDate) == today && !t.isDone).take(3).toList();
    final text = Theme.of(context).textTheme;

    return [
      if (_error != null) ErrorView(error: _error!, onRetry: _load),
      Text('${greeting(DateTime.now())},', style: text.titleLarge?.copyWith(color: AppColors.inkMuted)),
      Text('$firstName!', style: text.displaySmall?.copyWith(fontWeight: FontWeight.w800)),
      const SizedBox(height: 20),

      // Today (yellow card)
      SectionCard(
        color: AppColors.pastelYellow,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Today', style: text.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          if (todayTasks.isEmpty)
            const Text('No tasks due today. Enjoy your day!', style: TextStyle(color: AppColors.inkMuted))
          else
            for (final (i, t) in todayTasks.indexed) ...[
              InkWell(
                onTap: () => _open(ProjectDetailScreen(projectId: t.projectId, initialName: names[t.projectId])),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${names[t.projectId] ?? 'Project'} • ${formatDate(t.dueDate)}',
                        style: const TextStyle(color: AppColors.inkMuted, fontSize: 13)),
                    Text(t.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                  ]),
                ),
              ),
              if (i < todayTasks.length - 1) const Divider(height: 20, color: Color(0x14000000)),
            ],
        ]),
      ),
      const SizedBox(height: 12),

      // To do / In progress (mint + purple cards)
      Row(children: [
        Expanded(
          child: _PastelTile(
            color: AppColors.pastelMint,
            icon: Icons.task_alt_rounded,
            title: 'To do list',
            subtitle: '${s.pendingTasks} tasks',
            onTap: () => _open(const TaskListScreen(status: 'Pending')),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _PastelTile(
            color: AppColors.pastelPurple,
            icon: Icons.schedule_rounded,
            title: 'In progress',
            subtitle: '${s.inProgressTasks} tasks',
            onTap: () => _open(const TaskListScreen(status: 'In Progress')),
          ),
        ),
      ]),
      const SizedBox(height: 12),

      // The five numbers the assignment requires
      SectionCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Overview', style: text.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          _StatGrid(items: [
            ('Projects', s.totalProjects),
            ('Projects in progress', d.projectsInProgress),
            ('Tasks', s.totalTasks),
            ('Completed tasks', s.completedTasks),
            ('Pending tasks', s.pendingTasks),
          ]),
        ]),
      ),
      const SizedBox(height: 24),

      // Recent projects
      Row(children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Projects', style: text.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
            Text('Currently you have ${s.totalProjects} projects.', style: const TextStyle(color: AppColors.inkMuted)),
          ]),
        ),
        OutlinedButton.icon(onPressed: _createProject, icon: const Icon(Icons.add_rounded), label: const Text('Add')),
      ]),
      const SizedBox(height: 12),
      if (d.projects.isEmpty)
        const EmptyView(title: 'No projects yet', message: 'Tap Add to create your first project.')
      else
        for (final p in d.projects.take(3)) ...[
          SectionCard(
            padding: 16,
            onTap: () => _open(ProjectDetailScreen(projectId: p.id, initialName: p.name)),
            child: Row(children: [
              Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: const BoxDecoration(color: AppColors.pastelPink, shape: BoxShape.circle),
                child: const Text('🎨', style: TextStyle(fontSize: 18)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(p.name,
                    maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              ),
              const SizedBox(width: 8),
              SizedBox(
                width: 64,
                child: StatusRibbon(pending: p.pendingCount, inProgress: p.inProgressCount, completed: p.completedCount),
              ),
              const SizedBox(width: 10),
              Text('${p.completedCount}/${p.taskCount}', style: const TextStyle(fontWeight: FontWeight.w700)),
            ]),
          ),
          const SizedBox(height: 10),
        ],
      const SizedBox(height: 14),

      // Activity half-donut
      SectionCard(
        child: Column(children: [
          Align(
            alignment: Alignment.centerLeft,
            child: Text('Activity', style: text.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
          ),
          const SizedBox(height: 24),
          HalfDonut(done: s.completedTasks, inProgress: s.inProgressTasks, total: s.totalTasks),
          const SizedBox(height: 20),
          const Wrap(spacing: 20, runSpacing: 8, alignment: WrapAlignment.center, children: [
            LegendItem(color: AppColors.done, label: 'Done'),
            LegendItem(color: AppColors.doing, label: 'In progress'),
            LegendItem(color: AppColors.ink, label: 'To do'),
          ]),
        ]),
      ),
      const SizedBox(height: 16),
      const Center(child: Text('Pull down to refresh', style: TextStyle(color: AppColors.inkMuted, fontSize: 12))),
    ];
  }
}

class _PastelTile extends StatelessWidget {
  const _PastelTile({required this.color, required this.icon, required this.title, required this.subtitle, required this.onTap});

  final Color color;
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => SectionCard(
        color: color,
        padding: 16,
        onTap: onTap,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.7), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, size: 22),
          ),
          const SizedBox(height: 14),
          Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          Text(subtitle, style: const TextStyle(color: AppColors.inkMuted)),
        ]),
      );
}

class _StatGrid extends StatelessWidget {
  const _StatGrid({required this.items});
  final List<(String, int)> items;

  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, c) {
        final w = (c.maxWidth - 10) / 2;
        return Wrap(spacing: 10, runSpacing: 10, children: [
          for (final (label, value) in items)
            Container(
              width: w,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.bgRoot, borderRadius: BorderRadius.circular(kRadiusSm)),
              child: Semantics(
                label: '$label: $value',
                excludeSemantics: true,
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(label, style: const TextStyle(color: AppColors.inkMuted, fontSize: 13)),
                  const SizedBox(height: 2),
                  Text('$value', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 24)),
                ]),
              ),
            ),
        ]);
      });
}
