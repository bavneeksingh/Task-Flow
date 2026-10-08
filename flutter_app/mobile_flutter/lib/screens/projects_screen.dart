import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../models/models.dart';
import '../theme.dart';
import '../utils/format.dart';
import '../widgets/common.dart';
import 'project_detail_screen.dart';
import 'project_form_sheet.dart';

class ProjectsScreen extends StatefulWidget {
  const ProjectsScreen({super.key});

  @override
  State<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends State<ProjectsScreen> {
  final _search = TextEditingController();
  Timer? _debounce;
  String _query = '';
  String _status = '';

  List<Project>? _projects;
  Object? _error;
  bool _loading = true;
  int _request = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  bool get _filtering => _query.isNotEmpty || _status.isNotEmpty;

  Future<void> _load() async {
    final id = ++_request;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await context.read<ApiClient>().listProjects(search: _query, status: _status);
      if (!mounted || id != _request) return;
      setState(() {
        _projects = list;
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

  void _onSearch(String text) {
    _debounce?.cancel();
    // Wait for a pause in typing so we don't send a request per keystroke.
    _debounce = Timer(const Duration(milliseconds: 300), () {
      _query = text.trim();
      _load();
    });
  }

  void _clearFilters() {
    _search.clear();
    _query = '';
    setState(() => _status = '');
    _load();
  }

  Future<void> _create() async {
    final saved = await showProjectForm(context);
    if (saved == null || !mounted) return;
    showSnack(context, 'Project created');
    _load();
  }

  Future<void> _open(Project p) async {
    await Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => ProjectDetailScreen(projectId: p.id, initialName: p.name),
    ));
    if (mounted) _load();
  }

  @override
  Widget build(BuildContext context) {
    final projects = _projects;
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.asset('assets/logo.jpg', width: 28, height: 28, semanticLabel: 'TaskFlow logo'),
            ),
            const SizedBox(width: 10),
            const Text('Projects'),
          ],
        ),
        actions: const [AccountButton()],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _create,
        icon: const Icon(Icons.add_rounded),
        label: const Text('New project'),
      ),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
          child: Column(children: [
            SearchField(controller: _search, hint: 'Search projects by name', onChanged: _onSearch),
            const SizedBox(height: 10),
            ChoiceRow(
              options: projectStatuses,
              value: _status,
              allLabel: 'All',
              onChanged: (v) {
                setState(() => _status = v);
                _load();
              },
            ),
          ]),
        ),
        Expanded(
          child: projects == null && _loading
              ? const LoadingView(label: 'Loading projects')
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 100),
                    children: [
                      if (_error != null) ErrorView(error: _error!, onRetry: _load),
                      if (projects != null) ...[
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Text(
                            '${projects.length} project${projects.length == 1 ? '' : 's'}${_filtering ? ' found' : ''}',
                            style: const TextStyle(color: AppColors.inkMuted),
                          ),
                        ),
                        if (projects.isEmpty && _error == null)
                          EmptyView(
                            title: _filtering ? 'No projects match' : 'No projects yet',
                            message: _filtering ? 'Try a different name or status.' : 'Projects hold your tasks. Start with one.',
                            action: _filtering
                                ? OutlinedButton(onPressed: _clearFilters, child: const Text('Clear filters'))
                                : FilledButton(onPressed: _create, child: const Text('Create your first project')),
                          ),
                        for (final p in projects)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: Opacity(opacity: _loading ? 0.6 : 1, child: _ProjectCard(project: p, onTap: () => _open(p))),
                          ),
                      ],
                    ],
                  ),
                ),
        ),
      ]),
    );
  }
}

class _ProjectCard extends StatelessWidget {
  const _ProjectCard({required this.project, required this.onTap});
  final Project project;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = project;
    final hasDates = p.startDate != null || p.endDate != null;
    return SectionCard(
      padding: 16,
      onTap: onTap,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(child: Text(p.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17))),
          const SizedBox(width: 8),
          StatusBadge(status: p.status),
        ]),
        if ((p.description ?? '').isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(p.description!, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.inkMuted)),
        ],
        if (hasDates) ...[
          const SizedBox(height: 6),
          Text(
            '📅 ${p.startDate != null ? formatDate(p.startDate) : 'No start'} → ${p.endDate != null ? formatDate(p.endDate) : 'no end'}',
            style: const TextStyle(color: AppColors.inkMuted, fontSize: 13),
          ),
        ],
        const SizedBox(height: 12),
        StatusRibbon(pending: p.pendingCount, inProgress: p.inProgressCount, completed: p.completedCount),
        const SizedBox(height: 6),
        Text(p.taskCount == 0 ? 'No tasks' : '${p.completedCount}/${p.taskCount} done',
            style: const TextStyle(color: AppColors.inkMuted, fontSize: 13)),
      ]),
    );
  }
}
