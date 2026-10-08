import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import '../models/models.dart';

/// Every failure the UI can see. `isNetwork` means no response arrived at all.
class ApiException implements Exception {
  ApiException(this.message, {this.status = 0, this.code = 'error', this.fields = const {}});

  final String message;
  final int status;
  final String code;
  final Map<String, String> fields; // per-field validation messages from the server

  bool get isNetwork => code == 'network';

  @override
  String toString() => message;
}

/// Keeps the login token in secure device storage:
/// Android Keystore-backed encryption on Android, the Keychain on iOS.
class TokenStore {
  static const _key = 'taskflow_token';
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  String? _cached;
  bool _loaded = false;

  Future<String?> read() async {
    if (_loaded) return _cached;
    try {
      _cached = await _storage.read(key: _key);
    } catch (_) {
      try {
        await _storage.deleteAll();
      } catch (_) {}
      _cached = null;
    }
    _loaded = true;
    return _cached;
  }

  Future<void> write(String token) async {
    _cached = token;
    _loaded = true;
    try {
      await _storage.write(key: _key, value: token);
    } catch (_) {
      // In-memory token is retained if keychain write fails on desktop
    }
  }

  Future<void> clear() async {
    _cached = null;
    _loaded = true;
    try {
      await _storage.delete(key: _key);
    } catch (_) {}
  }
}

/// The single place that talks to the backend.
class ApiClient {
  ApiClient({required this.baseUrl, TokenStore? tokens, http.Client? httpClient})
      : tokens = tokens ?? TokenStore(),
        _http = httpClient ?? http.Client();

  final String baseUrl;
  final TokenStore tokens;
  final http.Client _http;

  /// Called when the server rejects our token (expired, invalid, user gone).
  void Function(String message)? onSessionEnded;

  static const _timeout = Duration(seconds: 12);
  static const _sessionCodes = {'token_expired', 'invalid_token', 'token_revoked', 'not_authenticated'};

  Future<dynamic> _request(
    String method,
    String path, {
    Object? body,
    Map<String, String?>? query,
    bool auth = true,
  }) async {
    final params = <String, String>{};
    query?.forEach((k, v) {
      if (v != null && v.isNotEmpty) params[k] = v;
    });
    var uri = Uri.parse('$baseUrl$path');
    if (params.isNotEmpty) uri = uri.replace(queryParameters: params);

    final request = http.Request(method, uri)..headers['Accept'] = 'application/json';
    if (body != null) {
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode(body);
    }
    if (auth) {
      final token = await tokens.read();
      if (token != null) request.headers['Authorization'] = 'Bearer $token';
    }

    late final http.Response res;
    try {
      // Without a timeout a dead connection can leave a spinner up for minutes.
      final streamed = await _http.send(request).timeout(_timeout);
      res = await http.Response.fromStream(streamed).timeout(_timeout);
    } on TimeoutException {
      throw ApiException('The server took too long to respond. Please try again.', code: 'network');
    } on IOException {
      throw ApiException('No internet connection. Check your network and try again.', code: 'network');
    } on http.ClientException {
      throw ApiException("Can't reach the server. Check your connection and try again.", code: 'network');
    }

    if (res.statusCode == 204) return null;

    dynamic data;
    if (res.body.isNotEmpty) {
      try {
        data = jsonDecode(res.body);
      } on FormatException {
        data = null; // not JSON (e.g. a proxy error page)
      }
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      final err = (data is Map && data['error'] is Map) ? data['error'] as Map : const {};
      final fields = <String, String>{};
      if (err['fields'] is Map) {
        (err['fields'] as Map).forEach((k, v) => fields['$k'] = '$v');
      }
      final code = (err['code'] as String?) ?? 'error';
      final message = (err['message'] as String?) ??
          (fields.isNotEmpty ? 'Please fix the highlighted fields.' : 'Something went wrong (${res.statusCode}).');

      if (auth && res.statusCode == 401 && _sessionCodes.contains(code)) {
        final friendly = code == 'not_authenticated'
            ? 'Please log in to continue.'
            : 'Your session has expired. Please log in again.';
        onSessionEnded?.call(friendly);
        throw ApiException(friendly, status: 401, code: code);
      }
      throw ApiException(message, status: res.statusCode, code: code, fields: fields);
    }
    return data;
  }

  List<T> _list<T>(dynamic data, T Function(Map<String, dynamic>) parse) =>
      (data as List).map((e) => parse(e as Map<String, dynamic>)).toList();

  // ---------- auth ----------
  Future<AuthResult> login(String email, String password) async => AuthResult.fromJson(
      await _request('POST', '/api/auth/login', body: {'email': email, 'password': password}, auth: false));

  Future<AuthResult> register(String fullName, String email, String password) async =>
      AuthResult.fromJson(await _request('POST', '/api/auth/register',
          body: {'full_name': fullName, 'email': email, 'password': password}, auth: false));

  Future<void> logout() => _request('POST', '/api/auth/logout');

  Future<AppUser> me() async => AppUser.fromJson(await _request('GET', '/api/auth/me'));

  // ---------- dashboard ----------
  Future<DashboardStats> dashboard() async => DashboardStats.fromJson(await _request('GET', '/api/dashboard'));

  // ---------- projects ----------
  Future<List<Project>> listProjects({String? search, String? status}) async => _list(
      await _request('GET', '/api/projects', query: {'search': search, 'status': status}), Project.fromJson);

  Future<Project> getProject(int id) async => Project.fromJson(await _request('GET', '/api/projects/$id'));

  Future<Project> createProject(Map<String, dynamic> body) async =>
      Project.fromJson(await _request('POST', '/api/projects', body: body));

  Future<Project> updateProject(int id, Map<String, dynamic> body) async =>
      Project.fromJson(await _request('PATCH', '/api/projects/$id', body: body));

  Future<void> deleteProject(int id) => _request('DELETE', '/api/projects/$id');

  // ---------- tasks ----------
  Future<List<Task>> listTasks(int projectId, {String? search, String? status, String? priority}) async => _list(
      await _request('GET', '/api/projects/$projectId/tasks',
          query: {'search': search, 'status': status, 'priority': priority}),
      Task.fromJson);

  Future<List<Task>> listAllTasks() async => _list(await _request('GET', '/api/tasks'), Task.fromJson);

  Future<Task> createTask(int projectId, Map<String, dynamic> body) async =>
      Task.fromJson(await _request('POST', '/api/projects/$projectId/tasks', body: body));

  Future<Task> updateTask(int id, Map<String, dynamic> body) async =>
      Task.fromJson(await _request('PATCH', '/api/tasks/$id', body: body));

  Future<void> deleteTask(int id) => _request('DELETE', '/api/tasks/$id');
}
