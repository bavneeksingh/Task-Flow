import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../models/models.dart';
import '../utils/format.dart';
import '../widgets/common.dart';
import '../widgets/date_field.dart';

/// Opens the create/edit project sheet. Returns the saved project, or null if cancelled.
Future<Project?> showProjectForm(BuildContext context, {Project? project}) {
  return showModalBottomSheet<Project>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (_) => ProjectFormSheet(project: project),
  );
}

class ProjectFormSheet extends StatefulWidget {
  const ProjectFormSheet({super.key, this.project});
  final Project? project;

  @override
  State<ProjectFormSheet> createState() => _ProjectFormSheetState();
}

class _ProjectFormSheetState extends State<ProjectFormSheet> {
  late final _name = TextEditingController(text: widget.project?.name ?? '');
  late final _description = TextEditingController(text: widget.project?.description ?? '');
  late String _status = widget.project?.status ?? 'Not Started';
  late String? _start = dateOnly(widget.project?.startDate);
  late String? _end = dateOnly(widget.project?.endDate);
  Map<String, String> _errors = {};
  String _formError = '';
  bool _busy = false;

  bool get _editing => widget.project != null;

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final errors = validateProject(
      name: _name.text,
      description: _description.text,
      startDate: _start,
      endDate: _end,
    );
    setState(() {
      _errors = errors;
      _formError = '';
    });
    if (errors.isNotEmpty) return;

    final body = {
      'name': _name.text.trim(),
      'description': _description.text.trim(),
      'status': _status,
      'start_date': _start,
      'end_date': _end,
    };
    setState(() => _busy = true);
    final api = context.read<ApiClient>();
    try {
      final saved = _editing ? await api.updateProject(widget.project!.id, body) : await api.createProject(body);
      if (mounted) Navigator.pop(context, saved);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        if (e.fields.isNotEmpty) {
          _errors = e.fields;
        } else {
          _formError = e.message;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
          Text(_editing ? 'Edit project' : 'New project',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 16),
          FormBanner(message: _formError),
          TextField(
            controller: _name,
            autofocus: !_editing,
            maxLength: 120,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(labelText: 'Project name', errorText: _errors['name']),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _description,
            minLines: 2,
            maxLines: 5,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(labelText: 'Description', errorText: _errors['description']),
          ),
          const SizedBox(height: 16),
          ChoiceRow(
            label: 'Status',
            options: projectStatuses,
            value: _status,
            onChanged: (v) => setState(() => _status = v),
          ),
          const SizedBox(height: 16),
          DateField(label: 'Start date', value: _start, error: _errors['start_date'], onChanged: (v) => setState(() => _start = v)),
          const SizedBox(height: 12),
          DateField(label: 'End date', value: _end, error: _errors['end_date'], onChanged: (v) => setState(() => _end = v)),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _busy ? null : _save,
            child: _busy
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                : Text(_editing ? 'Save changes' : 'Create project'),
          ),
        ]),
      ),
    );
  }
}
