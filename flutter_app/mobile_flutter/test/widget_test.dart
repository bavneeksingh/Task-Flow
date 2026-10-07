// Unit tests for the pure-Dart parts: date logic, validation, JSON parsing and the
// API client's error handling (with a fake HTTP client and in-memory token store).
// Run with: flutter test
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:taskflow/api/api_client.dart';
import 'package:taskflow/models/models.dart';
import 'package:taskflow/utils/format.dart';

class MemoryTokens extends TokenStore {
  String? value;
  @override
  Future<String?> read() async => value;
  @override
  Future<void> write(String token) async => value = token;
  @override
  Future<void> clear() async => value = null;
}

Task task({String status = 'Pending', String? due}) => Task(
    id: 1, projectId: 1, name: 't', description: null, status: status, priority: 'Low', dueDate: due, createdAt: '');

void main() {
  group('dates', () {
    test('isoDate uses the LOCAL calendar date', () {
      expect(isoDate(DateTime(2026, 3, 5)), '2026-03-05');
      expect(isoDate(DateTime(2026, 12, 31, 23, 59)), '2026-12-31');
    });

    test('dateOnly / parse / format', () {
      expect(dateOnly('2026-10-08T00:00:00.000Z'), '2026-10-08');
      expect(dateOnly(''), isNull);
      expect(parseIsoDate('2026-02-30'), DateTime(2026, 3, 2)); // DateTime normalises; picker never produces this
      expect(formatDate('2026-03-05'), '5 Mar 2026');
      expect(formatDate(null), '');
      expect(formatDayLong(DateTime(2026, 10, 8)), 'Thu, Oct 8');
    });

    test('isOverdue', () {
      final yesterday = isoDate(DateTime.now().subtract(const Duration(days: 1)));
      final tomorrow = isoDate(DateTime.now().add(const Duration(days: 1)));
      expect(isOverdue(task(due: yesterday)), isTrue);
      expect(isOverdue(task(due: yesterday, status: 'Completed')), isFalse);
      expect(isOverdue(task(due: tomorrow)), isFalse);
      expect(isOverdue(task()), isFalse);
    });

    test('greeting and initials', () {
      expect(greeting(DateTime(2026, 1, 1, 9)), 'Good morning');
      expect(greeting(DateTime(2026, 1, 1, 14)), 'Good afternoon');
      expect(greeting(DateTime(2026, 1, 1, 20)), 'Good evening');
      expect(initials('harshil kumar singh'), 'HK');
    });
  });

  group('validation', () {
    test('login', () {
      expect(validateLogin('', ''), {'email': 'Enter your email address.', 'password': 'Enter your password.'});
      expect(validateLogin('nope', 'x').keys, ['email']);
      expect(validateLogin('a@b.co', 'x'), isEmpty);
    });

    test('register', () {
      expect(validateRegister(' ', 'a@b.co', 'short').keys.toSet(), {'full_name', 'password'});
      expect(validateRegister('A', 'a@b.co', 'long-enough'), isEmpty);
    });

    test('project dates must be in order', () {
      expect(validateProject(name: 'X', description: '', startDate: '2026-03-01', endDate: '2026-02-01').keys, ['end_date']);
      expect(validateProject(name: 'X', description: '', startDate: '2026-03-01', endDate: '2026-03-01'), isEmpty);
    });

    test('task name required', () {
      expect(validateTask(name: '  ', description: '').keys, ['name']);
    });
  });

  test('Project.fromJson reads the Node backend shape', () {
    final p = Project.fromJson({
      'id': 3, 'name': 'Site', 'description': null, 'status': 'In Progress',
      'start_date': '2026-01-01', 'end_date': null, 'created_at': '2026-01-01T10:00:00.000Z',
      'task_count': 4, 'pending_count': 1, 'in_progress_count': 1, 'completed_count': 2,
    });
    expect(p.completionPercent, 50);
    expect(p.description, isNull);
  });

  group('ApiClient', () {
    ApiClient client(MockClient mock, MemoryTokens tokens) =>
        ApiClient(baseUrl: 'http://test', tokens: tokens, httpClient: mock);

    test('sends the token and drops empty query params', () async {
      late http.Request seen;
      final tokens = MemoryTokens()..value = 'abc';
      final api = client(MockClient((req) async {
        seen = req;
        return http.Response('[]', 200);
      }), tokens);
      await api.listProjects(search: '', status: 'Completed');
      expect(seen.headers['Authorization'], 'Bearer abc');
      expect(seen.url.queryParameters, {'status': 'Completed'});
    });

    test('expired token ends the session with a clear message', () async {
      String? ended;
      final api = client(
        MockClient((_) async => http.Response(
            jsonEncode({'error': {'code': 'token_expired', 'message': 'Session expired or invalid token'}}), 401)),
        MemoryTokens()..value = 'old',
      )..onSessionEnded = (m) => ended = m;

      await expectLater(api.dashboard(), throwsA(isA<ApiException>().having((e) => e.status, 'status', 401)));
      expect(ended, 'Your session has expired. Please log in again.');
    });

    test('wrong password does NOT end a session', () async {
      var ended = false;
      final api = client(
        MockClient((_) async => http.Response(jsonEncode({'error': {'message': 'Incorrect email or password'}}), 401)),
        MemoryTokens(),
      )..onSessionEnded = (_) => ended = true;

      await expectLater(
          api.login('a@b.co', 'x'), throwsA(isA<ApiException>().having((e) => e.message, 'message', 'Incorrect email or password')));
      expect(ended, isFalse);
    });

    test('no connection becomes a network error, not a crash', () async {
      final api = client(MockClient((_) async => throw http.ClientException('connection refused')), MemoryTokens());
      await expectLater(api.listAllTasks(), throwsA(isA<ApiException>().having((e) => e.isNetwork, 'isNetwork', isTrue)));
    });

    test('server field errors are passed through', () async {
      final api = client(
        MockClient((_) async =>
            http.Response(jsonEncode({'error': {'fields': {'email': 'Email already registered'}}}), 400)),
        MemoryTokens(),
      );
      await expectLater(
        api.register('A', 'a@b.co', 'password1'),
        throwsA(isA<ApiException>().having((e) => e.fields['email'], 'email', 'Email already registered')),
      );
    });
  });
}
