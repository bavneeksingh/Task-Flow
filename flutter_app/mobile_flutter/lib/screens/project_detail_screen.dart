import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../models/models.dart';
import '../theme.dart';
import '../utils/format.dart';
import '../widgets/common.dart';
import 'project_form_sheet.dart';
import 'task_form_sheet.dart';

class ProjectDetailScreen extends StatefulWidget {
  const ProjectDetailScreen({super.key, required this.projectId, this.initialName});

  final int projectId;
  final String? initialName; // shown in the app bar while loading

  @override
  State<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends State<ProjectDetailScreen> {
  Project? _project;
  Object? _projectError;
  bool _projectLoading = true;
  int _projectReq = 0;

  List<Task>? _tasks;
  Object? _tasksError;
  bool _tasksLoading = true;
  int _tasksReq = 0;

  final _search = TextEditingController();
  Timer? _debounce;
  String _query = '';
  String _status = '';
  String _priority = '';
  int? _busyTaskId;

  ApiClient get _api => context.read<ApiClient>();
  bool get _filtering => _query.isNotEmpty || _status.isNotEmpty || _priority.isNotEmpty;

  @override
  void initState() {
    super.initState();
    _loadProject();
    _loadTasks();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  Future<void> _loadProject() async {
    final id = ++_projectReq;
    setState(() {
      _projectLoading = true;
      _projectError = null;
    });
    try {
      final p = await _api.getProject(widget.projectId);
      if (!mounted || id != _projectReq) return;
      setState(() {
        _project = p;
        _projectLoading = false;
      });
    } catch (e) {
      if (!mounted || id != _projectReq) return;
      setState(() {
        _projectError = e;
        _projectLoading = false;
      });
    }
  }

  Future<void> _loadTasks() async {
    final id = ++_tasksReq;
    setState(() {
      _tasksLoading = true;
      _tasksError = null;
    });
    try {
      final t = await _api.listTasks(widget.projectId, search: _query, status: _status, priority: _priority);
      if (!mounted || id != _tasksReq) return;
      setState(() {
        _tasks = t;
        _tasksLoading = false;
      });
    } catch (e) {
      if (!mounted || id != _tasksReq) return;
      setState(() {
        _tasksError = e;
        _tasksLoading = false;
      });
    }
  }

  // Task changes also change the project's counts (and, on this backend, its status).
  Future<void> _refresh() => Future.wait([_loadProject(), _loadTasks()]);

  void _onSearch(String text) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      _query = text.trim();
      _loadTasks();
    });
  }

  void _clearFilters() {
    _search.clear();
    _query = '';
    setState(() {
      _status = '';
      _priority = '';
    });
    _loadTasks();
  }

  Future<void> _setStatus(Task t, String status, String message) async {
    setState(() => _busyTaskId = t.id);
    try {
      await _api.updateTask(t.id, {'status': status});
      if (!mounted) return;
      showSnack(context, message);
      await _refresh();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busyTaskId = null);
    }
  }

  Future<void> _taskForm([Task? task]) async {
    final result = await showTaskForm(context, projectId: widget.projectId, task: task);
    if (result == null || !mounted) return;
    showSnack(context, switch (result) {
      TaskFormResult.created => 'Task added',
      TaskFormResult.updated => 'Task updated',
      TaskFormResult.deleted => 'Task deleted',
    });
    _refresh();
  }

  Future<void> _deleteTask(Task t) async {
    final ok = await confirmDialog(context,
        title: 'Delete this task?', message: '"${t.name}" will be permanently deleted.', confirmLabel: 'Delete task');
    if (!ok || !mounted) return;
    setState(() => _busyTaskId = t.id);
    try {
      await _api.deleteTask(t.id);
      if (!mounted) return;
      showSnack(context, 'Task deleted');
      await _refresh();
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busyTaskId = null);
    }
  }

  Future<void> _editProject() async {
    final saved = await showProjectForm(context, project: _project);
    if (saved == null || !mounted) return;
    showSnack(context, 'Project updated');
    _refresh();
  }

  Future<void> _deleteProject() async {
    final p = _project!;
    final ok = await confirmDialog(context,
        title: 'Delete this project?',
        message: '"${p.name}" and all ${p.taskCount} of its tasks will be permanently deleted.',
        confirmLabel: 'Delete project');
    if (!ok || !mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    try {
      await _api.deleteProject(p.id);
      navigator.pop();
      messenger.showSnackBar(const SnackBar(content: Text('Project deleted')));
    } on ApiException catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = _project;
    return Scaffold(
      appBar: AppBar(
        title: Text(p?.name ?? widget.initialName ?? 'Project', maxLines: 1, overflow: TextOverflow.ellipsis),
        actions: [
          if (p != null) ...[
            IconButton(tooltip: 'Edit project', icon: const Icon(Icons.edit_outlined), onPressed: _editProject),
            IconButton(tooltip: 'Delete project', icon: const Icon(Icons.delete_outline_rounded), onPressed: _deleteProject),
          ],
        ],
      ),
      body: _body(p),
    );
  }

  Widget _body(Project? p) {
    if (p == null && _projectLoading) return const LoadingView(label: 'Loading project');
    if (p == null) {
      final err = _projectError;
      if (err is ApiException && err.status == 404) {
        return ListView(padding: const EdgeInsets.all(20), children: [
          EmptyView(
            title: 'Project not found',
            message: 'It may have been deleted, or it belongs to another account.',
            action: OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Back to projects')),
          ),
        ]);
      }
      return ListView(padding: const EdgeInsets.all(20), children: [ErrorView(error: err!, onRetry: _loadProject)]);
    }

    final text = Theme.of(context).textTheme;
    final tasks = _tasks;
    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
        children: [
          if (_projectError != null) ErrorView(error: _projectError!, onRetry: _loadProject),
          Wrap(spacing: 10, runSpacing: 6, crossAxisAlignment: WrapCrossAlignment.center, children: [
            StatusBadge(status: p.status),
            if (p.startDate != null || p.endDate != null)
              Text('📅 ${p.startDate != null ? formatDate(p.startDate) : 'No start'} → ${p.endDate != null ? formatDate(p.endDate) : 'no end'}',
                  style: const TextStyle(color: AppColors.inkMuted, fontSize: 13)),
            Text('Created ${formatDate(p.createdAt)}', style: const TextStyle(color: AppColors.inkMuted, fontSize: 13)),
          ]),
          if ((p.description ?? '').isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(p.description!, style: const TextStyle(fontSize: 15, height: 1.45)),
          ],
          const SizedBox(height: 16),

          // Progress
          SectionCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Text('📈 Progress', style: text.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
                const Spacer(),
                Text('${p.completionPercent}% complete',
                    style: const TextStyle(color: AppColors.inkMuted, fontWeight: FontWeight.w600)),
              ]),
              const SizedBox(height: 12),
              StatusRibbon(tall: true, pending: p.pendingCount, inProgress: p.inProgressCount, completed: p.completedCount),
              const SizedBox(height: 12),
              Wrap(spacing: 16, runSpacing: 6, children: [
                LegendItem(color: AppColors.done, label: '${p.completedCount} completed'),
                LegendItem(color: AppColors.doing, label: '${p.inProgressCount} in progress'),
                LegendItem(color: AppColors.ink, label: '${p.pendingCount} pending'),
              ]),
            ]),
          ),
          const SizedBox(height: 24),

          // Tasks header + filters
          Row(children: [
            Expanded(
              child: Text('📝 Tasks${tasks != null ? ' (${tasks.length})' : ''}',
                  style: text.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
            ),
            FilledButton.icon(onPressed: () => _taskForm(), icon: const Icon(Icons.add_rounded), label: const Text('Add task')),
          ]),
          const SizedBox(height: 12),
          SearchField(controller: _search, hint: 'Search tasks by name', onChanged: _onSearch),
          const SizedBox(height: 10),
          ChoiceRow(
            label: 'Status',
            options: taskStatuses,
            value: _status,
            allLabel: 'All',
            onChanged: (v) {
              setState(() => _status = v);
              _loadTasks();
            },
          ),
          const SizedBox(height: 8),
          ChoiceRow(
            label: 'Priority',
            options: priorities,
            value: _priority,
            allLabel: 'All',
            onChanged: (v) {
              setState(() => _priority = v);
              _loadTasks();
            },
          ),
          const SizedBox(height: 12),

          if (_tasksError != null) ErrorView(error: _tasksError!, onRetry: _loadTasks),
          if (tasks == null && _tasksLoading) const LoadingView(label: 'Loading tasks'),
          if (tasks != null && tasks.isEmpty && _tasksError == null)
            EmptyView(
              title: _filtering ? 'No tasks match' : 'No tasks yet',
              message: _filtering ? 'Try different filters.' : 'Break this project into tasks to track progress.',
              action: _filtering
                  ? OutlinedButton(onPressed: _clearFilters, child: const Text('Clear filters'))
                  : FilledButton(onPressed: () => _taskForm(), child: const Text('Add the first task')),
            ),
          if (tasks != null)
            for (final t in tasks)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Opacity(opacity: _tasksLoading ? 0.6 : 1, child: _taskTile(t)),
              ),
        ],
      ),
    );
  }

  Widget _taskTile(Task t) {
    final busy = _busyTaskId == t.id;
    final overdue = isOverdue(t);
    return SectionCard(
      padding: 12,
      onTap: busy ? null : () => _taskForm(t),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Semantics(
          label: t.isDone ? 'Mark ${t.name} as pending' : 'Mark ${t.name} as completed',
          child: Checkbox(
            value: t.isDone,
            activeColor: AppColors.doneText,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
            onChanged: busy
                ? null
                : (_) => _setStatus(t, t.isDone ? 'Pending' : 'Completed', t.isDone ? 'Task reopened' : 'Task completed'),
          ),
        ),
        const SizedBox(width: 4),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 10),
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
              if ((t.description ?? '').isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(t.description!, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.inkMuted)),
              ],
              const SizedBox(height: 8),
              Wrap(spacing: 8, runSpacing: 6, crossAxisAlignment: WrapCrossAlignment.center, children: [
                PriorityBadge(priority: t.priority),
                StatusBadge(status: t.status),
                if (t.dueDate != null)
                  Text(
                    '${overdue ? 'Overdue, due' : 'Due'} ${formatDate(t.dueDate)}',
                    style: TextStyle(
                      fontSize: 12,
                      color: overdue ? AppColors.dangerText : AppColors.inkMuted,
                      fontWeight: overdue ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
              ]),
            ]),
          ),
        ),
        if (busy)
          const Padding(
            padding: EdgeInsets.all(12),
            child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.5)),
          )
        else
          PopupMenuButton<String>(
            tooltip: 'Task actions',
            onSelected: (v) {
              if (v.startsWith('status:')) {
                _setStatus(t, v.substring(7), 'Status updated');
              } else if (v == 'edit') {
                _taskForm(t);
              } else if (v == 'delete') {
                _deleteTask(t);
              }
            },
            itemBuilder: (_) => <PopupMenuEntry<String>>[
              for (final s in taskStatuses)
                if (s != t.status) PopupMenuItem(value: 'status:$s', child: Text('Mark as $s')),
              const PopupMenuDivider(),
              const PopupMenuItem(value: 'edit', child: Text('Edit')),
              const PopupMenuItem(value: 'delete', child: Text('Delete')),
            ],
          ),
      ]),
    );
  }
}
