// Plain data classes mirroring the JSON the Node backend returns.

int _int(Object? v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;
String? _str(Object? v) => v == null ? null : '$v';

class AppUser {
  AppUser({required this.id, required this.fullName, required this.email});

  final int id;
  final String fullName;
  final String email;

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: _int(j['id']),
        fullName: _str(j['full_name']) ?? '',
        email: _str(j['email']) ?? '',
      );

  String get firstName => fullName.trim().split(RegExp(r'\s+')).first;
}

class AuthResult {
  AuthResult({required this.token, required this.user});
  final String token;
  final AppUser user;

  factory AuthResult.fromJson(Map<String, dynamic> j) => AuthResult(
        token: _str(j['access_token']) ?? '',
        user: AppUser.fromJson(j['user'] as Map<String, dynamic>),
      );
}

class Project {
  Project({
    required this.id,
    required this.name,
    required this.description,
    required this.status,
    required this.startDate,
    required this.endDate,
    required this.createdAt,
    required this.taskCount,
    required this.pendingCount,
    required this.inProgressCount,
    required this.completedCount,
  });

  final int id;
  final String name;
  final String? description;
  final String status;
  final String? startDate; // "YYYY-MM-DD" or null
  final String? endDate;
  final String createdAt; // ISO timestamp
  final int taskCount;
  final int pendingCount;
  final int inProgressCount;
  final int completedCount;

  int get completionPercent => taskCount == 0 ? 0 : (completedCount * 100 / taskCount).round();

  factory Project.fromJson(Map<String, dynamic> j) => Project(
        id: _int(j['id']),
        name: _str(j['name']) ?? '',
        description: _str(j['description']),
        status: _str(j['status']) ?? 'Not Started',
        startDate: _str(j['start_date']),
        endDate: _str(j['end_date']),
        createdAt: _str(j['created_at']) ?? '',
        taskCount: _int(j['task_count']),
        pendingCount: _int(j['pending_count']),
        inProgressCount: _int(j['in_progress_count']),
        completedCount: _int(j['completed_count']),
      );
}

class Task {
  Task({
    required this.id,
    required this.projectId,
    required this.name,
    required this.description,
    required this.status,
    required this.priority,
    required this.dueDate,
    required this.createdAt,
  });

  final int id;
  final int projectId;
  final String name;
  final String? description;
  final String status;
  final String priority;
  final String? dueDate;
  final String createdAt;

  bool get isDone => status == 'Completed';

  factory Task.fromJson(Map<String, dynamic> j) => Task(
        id: _int(j['id']),
        projectId: _int(j['project_id']),
        name: _str(j['name']) ?? '',
        description: _str(j['description']),
        status: _str(j['status']) ?? 'Pending',
        priority: _str(j['priority']) ?? 'Medium',
        dueDate: _str(j['due_date']),
        createdAt: _str(j['created_at']) ?? '',
      );
}

class DashboardStats {
  DashboardStats({
    required this.totalProjects,
    required this.totalTasks,
    required this.pendingTasks,
    required this.inProgressTasks,
    required this.completedTasks,
  });

  final int totalProjects;
  final int totalTasks;
  final int pendingTasks;
  final int inProgressTasks;
  final int completedTasks;

  factory DashboardStats.fromJson(Map<String, dynamic> j) => DashboardStats(
        totalProjects: _int(j['total_projects']),
        totalTasks: _int(j['total_tasks']),
        pendingTasks: _int(j['pending_tasks']),
        inProgressTasks: _int(j['in_progress_tasks']),
        completedTasks: _int(j['completed_tasks']),
      );
}
