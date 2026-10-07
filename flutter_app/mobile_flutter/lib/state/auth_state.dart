import 'package:flutter/foundation.dart';

import '../api/api_client.dart';
import '../models/models.dart';

enum AuthStatus { booting, bootError, signedOut, signedIn }

class AuthState extends ChangeNotifier {
  AuthState(this.api, {this.onSignedOut}) {
    api.onSessionEnded = (message) => _endSession(message);
  }

  final ApiClient api;
  final VoidCallback? onSignedOut; // used to close any open screens/sheets

  AuthStatus status = AuthStatus.booting;
  AppUser? user;
  ApiException? bootError;
  String notice = ''; // shown on the login screen, e.g. "Your session has expired..."

  Future<void> restore() async {
    status = AuthStatus.booting;
    bootError = null;
    notifyListeners();
    try {
      if (await api.tokens.read() == null) {
        status = AuthStatus.signedOut;
      } else {
        user = await api.me(); // proves the stored token still works
        status = AuthStatus.signedIn;
      }
    } on ApiException catch (e) {
      if (e.status == 401) {
        status = AuthStatus.signedOut; // _endSession already ran and set the notice
      } else {
        // Offline at startup must NOT log the user out; offer a retry instead.
        bootError = e;
        status = AuthStatus.bootError;
      }
    }
    notifyListeners();
  }

  Future<void> login(String email, String password) async => _finish(await api.login(email, password));

  Future<void> register(String fullName, String email, String password) async =>
      _finish(await api.register(fullName, email, password));

  Future<void> logout() async {
    try {
      await api.logout();
    } on ApiException {
      // Even offline, always log out locally.
    }
    await _endSession('');
  }

  Future<void> _finish(AuthResult result) async {
    await api.tokens.write(result.token);
    user = result.user;
    notice = '';
    status = AuthStatus.signedIn;
    notifyListeners();
  }

  Future<void> _endSession(String message) async {
    await api.tokens.clear();
    final wasSignedIn = status == AuthStatus.signedIn;
    user = null;
    notice = message;
    status = AuthStatus.signedOut;
    notifyListeners();
    if (wasSignedIn) onSignedOut?.call();
  }
}
