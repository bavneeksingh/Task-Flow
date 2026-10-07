import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../models/models.dart';
import '../theme.dart';
import '../utils/format.dart';
import '../widgets/common.dart';
import 'project_detail_screen.dart';

/// All of the user's tasks in one status, across projects
/// (the website's /tasks?status=... page, opened from the dashboard cards).
class TaskListScreen extends StatefulWidget {
  const TaskListScreen({super.key, required this.status});
  final String status;

  @override
  State<TaskListScreen> createState() => _TaskListScreenState();
}

class _TaskListScreenState extends State<TaskListScreen> {
  List<Task>? _tasks;
  Map<int, String> _projectNames = {};
  Object? _error;
  bool _loading = true;
  int _request = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  String get _title => switch (widget.status) {
        'Pending' => 'To do list',
        'In Progress' => 'In progress tasks',
        'Completed' => 'Completed tasks',
        _ => 'Tasks',
      };

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
        _tasks = (r[0] as List<Task>).where((t) => t.status == widget.status).toList();
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

  Future<void> _openProject(Task t) async {
    await Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => ProjectDetailScreen(projectId: t.projectId, initialName: _projectNames[t.projectId]),
    ));
    if (mounted) _load();
  }

  @override
  Widget build(BuildContext context) {
    final tasks = _tasks;
    return Scaffold(
      appBar: AppBar(title: Text(_title)),
      body: tasks == null && _loading
          ? const LoadingView(label: 'Loading tasks')
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
                children: [
                  if (_error != null) ErrorView(error: _error!, onRetry: _load),
                  if (tasks != null) ...[
                    Text('${tasks.length} task${tasks.length == 1 ? '' : 's'}',
                        style: const TextStyle(color: AppColors.inkMuted)),
                    const SizedBox(height: 10),
                    if (tasks.isEmpty)
                      EmptyView(
                        title: 'No ${widget.status.toLowerCase()} tasks',
                        message: "You don't have any tasks in this status right now.",
                      ),
                    for (final t in tasks)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: SectionCard(
                          padding: 16,
                          onTap: () => _openProject(t),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Wrap(spacing: 8, runSpacing: 4, crossAxisAlignment: WrapCrossAlignment.center, children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(color: AppColors.lineStrong, borderRadius: BorderRadius.circular(6)),
                                child: Text(_projectNames[t.projectId] ?? 'Unknown project',
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                              ),
                              if (t.dueDate != null)
                                Text('Due: ${formatDate(t.dueDate)}',
                                    style: TextStyle(
                                        fontSize: 12, color: isOverdue(t) ? AppColors.dangerText : AppColors.inkMuted)),
                            ]),
                            const SizedBox(height: 6),
                            Text(t.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                            if ((t.description ?? '').isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(t.description!,
                                  maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.inkMuted)),
                            ],
                            const SizedBox(height: 10),
                            Row(children: [
                              StatusBadge(status: t.status),
                              const Spacer(),
                              const Text('Open project', style: TextStyle(fontWeight: FontWeight.w700)),
                              const Icon(Icons.chevron_right_rounded),
                            ]),
                          ]),
                        ),
                      ),
                  ],
                ],
              ),
            ),
    );
  }
}
