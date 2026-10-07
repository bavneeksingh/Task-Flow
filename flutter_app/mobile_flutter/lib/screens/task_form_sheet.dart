import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../models/models.dart';
import '../theme.dart';
import '../utils/format.dart';
import '../widgets/common.dart';
import '../widgets/date_field.dart';

/// Result of the task sheet, so the caller can show the right message.
enum TaskFormResult { created, updated, deleted }

Future<TaskFormResult?> showTaskForm(BuildContext context, {required int projectId, Task? task}) {
  return showModalBottomSheet<TaskFormResult>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (_) => TaskFormSheet(projectId: projectId, task: task),
  );
}

class TaskFormSheet extends StatefulWidget {
  const TaskFormSheet({super.key, required this.projectId, this.task});
  final int projectId;
  final Task? task;

  @override
  State<TaskFormSheet> createState() => _TaskFormSheetState();
}

class _TaskFormSheetState extends State<TaskFormSheet> {
  late final _name = TextEditingController(text: widget.task?.name ?? '');
  late final _description = TextEditingController(text: widget.task?.description ?? '');
  late String _priority = widget.task?.priority ?? 'Medium';
  late String _status = widget.task?.status ?? 'Pending';
  late String? _due = dateOnly(widget.task?.dueDate);
  Map<String, String> _errors = {};
  String _formError = '';
  bool _busy = false;

  bool get _editing => widget.task != null;

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    super.dispose();
  }

  void _fail(ApiException e) {
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

  Future<void> _save() async {
    final errors = validateTask(name: _name.text, description: _description.text);
    setState(() {
      _errors = errors;
      _formError = '';
    });
    if (errors.isNotEmpty) return;

    final body = {
      'name': _name.text.trim(),
      'description': _description.text.trim(),
      'priority': _priority,
      'status': _status,
      'due_date': _due,
    };
    setState(() => _busy = true);
    final api = context.read<ApiClient>();
    try {
      if (_editing) {
        await api.updateTask(widget.task!.id, body);
      } else {
        await api.createTask(widget.projectId, body);
      }
      if (mounted) Navigator.pop(context, _editing ? TaskFormResult.updated : TaskFormResult.created);
    } on ApiException catch (e) {
      _fail(e);
    }
  }

  Future<void> _delete() async {
    final ok = await confirmDialog(
      context,
      title: 'Delete this task?',
      message: '"${widget.task!.name}" will be permanently deleted.',
      confirmLabel: 'Delete task',
    );
    if (!ok || !mounted) return;
    setState(() => _busy = true);
    try {
      await context.read<ApiClient>().deleteTask(widget.task!.id);
      if (mounted) Navigator.pop(context, TaskFormResult.deleted);
    } on ApiException catch (e) {
      _fail(e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
          Text(_editing ? 'Edit task' : 'New task',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 16),
          FormBanner(message: _formError),
          TextField(
            controller: _name,
            autofocus: !_editing,
            maxLength: 160,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(labelText: 'Task name', errorText: _errors['name']),
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
          ChoiceRow(label: 'Priority', options: priorities, value: _priority, onChanged: (v) => setState(() => _priority = v)),
          const SizedBox(height: 14),
          ChoiceRow(label: 'Status', options: taskStatuses, value: _status, onChanged: (v) => setState(() => _status = v)),
          const SizedBox(height: 16),
          DateField(label: 'Due date', value: _due, error: _errors['due_date'], onChanged: (v) => setState(() => _due = v)),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _busy ? null : _save,
            child: _busy
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                : Text(_editing ? 'Save changes' : 'Add task'),
          ),
          if (_editing) ...[
            const SizedBox(height: 10),
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(foregroundColor: AppColors.dangerText),
              icon: const Icon(Icons.delete_outline_rounded),
              label: const Text('Delete task'),
              onPressed: _busy ? null : _delete,
            ),
          ],
        ]),
      ),
    );
  }
}
