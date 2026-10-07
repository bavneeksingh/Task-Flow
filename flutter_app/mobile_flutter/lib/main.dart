import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'api/api_client.dart';
import 'config.dart';
import 'screens/auth_screen.dart';
import 'screens/home_shell.dart';
import 'state/auth_state.dart';
import 'theme.dart';
import 'widgets/common.dart';

/// Lets us close every open screen and sheet when the session ends.
final navigatorKey = GlobalKey<NavigatorState>();

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final api = ApiClient(baseUrl: apiBaseUrl);

  runApp(
    MultiProvider(
      providers: [
        Provider<ApiClient>.value(value: api),
        ChangeNotifierProvider<AuthState>(
          create: (_) => AuthState(
            api,
            onSignedOut: () => navigatorKey.currentState?.popUntil((route) => route.isFirst),
          )..restore(),
        ),
      ],
      child: const TaskFlowApp(),
    ),
  );
}

class TaskFlowApp extends StatelessWidget {
  const TaskFlowApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'TaskFlow',
        debugShowCheckedModeBanner: false,
        navigatorKey: navigatorKey,
        theme: buildTheme(),
        home: const RootGate(),
      );
}

/// Chooses the top-level screen from the auth state.
class RootGate extends StatelessWidget {
  const RootGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    return switch (auth.status) {
      AuthStatus.booting => const Scaffold(body: LoadingView(label: 'Restoring your session')),
      AuthStatus.bootError => Scaffold(
          body: SafeArea(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: ErrorView(error: auth.bootError!, onRetry: auth.restore),
              ),
            ),
          ),
        ),
      AuthStatus.signedOut => const AuthScreen(),
      AuthStatus.signedIn => const HomeShell(),
    };
  }
}
