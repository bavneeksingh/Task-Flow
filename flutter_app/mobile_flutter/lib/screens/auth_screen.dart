import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../state/auth_state.dart';
import '../theme.dart';
import '../utils/format.dart';
import '../widgets/common.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool _register = false;
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  Map<String, String> _errors = {};
  String _formError = '';
  bool _busy = false;
  bool _showPassword = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  void _toggleMode() => setState(() {
        _register = !_register;
        _errors = {};
        _formError = '';
      });

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    final errors = _register
        ? validateRegister(_name.text, _email.text, _password.text)
        : validateLogin(_email.text, _password.text);
    setState(() {
      _errors = errors;
      _formError = '';
    });
    if (errors.isNotEmpty) return;

    setState(() => _busy = true);
    final auth = context.read<AuthState>();
    try {
      if (_register) {
        await auth.register(_name.text.trim(), _email.text.trim(), _password.text);
      } else {
        await auth.login(_email.text.trim(), _password.text);
      }
      // On success the root swaps this screen for the app; nothing else to do.
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        if (e.fields.isNotEmpty) {
          _errors = e.fields;
        } else {
          _formError = e.message;
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _formError = 'Error: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final notice = context.watch<AuthState>().notice;
    final text = Theme.of(context).textTheme;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          children: [
            Row(children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: Image.asset('assets/logo.jpg', width: 52, height: 52, semanticLabel: 'TaskFlow logo'),
              ),
              const SizedBox(width: 12),
              Text('TaskFlow', style: text.headlineMedium?.copyWith(fontWeight: FontWeight.w800)),
            ]),
            const SizedBox(height: 10),
            const Text(
              'Manage projects and tasks with ease. Stay in sync across web and mobile.',
              style: TextStyle(color: AppColors.inkMuted, fontSize: 15),
            ),
            const SizedBox(height: 32),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(kRadius)),
              child: AutofillGroup(
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Text(_register ? 'Create your account' : 'Welcome back',
                      style: text.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text(
                    _register ? 'Get started with TaskFlow for free.' : 'Log in to continue managing your projects.',
                    style: const TextStyle(color: AppColors.inkMuted),
                  ),
                  const SizedBox(height: 20),
                  if (!_register) FormBanner(message: notice, isNotice: true),
                  FormBanner(message: _formError),
                  if (_register) ...[
                    TextField(
                      controller: _name,
                      textCapitalization: TextCapitalization.words,
                      textInputAction: TextInputAction.next,
                      autofillHints: const [AutofillHints.name],
                      decoration: InputDecoration(labelText: 'Full name', hintText: 'John Doe', errorText: _errors['full_name']),
                    ),
                    const SizedBox(height: 14),
                  ],
                  TextField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    autocorrect: false,
                    textInputAction: TextInputAction.next,
                    autofillHints: const [AutofillHints.email],
                    decoration: InputDecoration(
                        labelText: 'Email address', hintText: 'you@example.com', errorText: _errors['email']),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _password,
                    obscureText: !_showPassword,
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => _submit(),
                    autofillHints: [_register ? AutofillHints.newPassword : AutofillHints.password],
                    decoration: InputDecoration(
                      labelText: 'Password',
                      errorText: _errors['password'],
                      helperText: _register ? 'At least 8 characters.' : null,
                      suffixIcon: IconButton(
                        tooltip: _showPassword ? 'Hide password' : 'Show password',
                        icon: Icon(_showPassword ? Icons.visibility_off_rounded : Icons.visibility_rounded),
                        onPressed: () => setState(() => _showPassword = !_showPassword),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: _busy ? null : _submit,
                    child: _busy
                        ? const SizedBox(
                            width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                        : Text(_register ? 'Create account' : 'Log in'),
                  ),
                ]),
              ),
            ),
            const SizedBox(height: 16),
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text(_register ? 'Already have an account?' : 'New here?',
                  style: const TextStyle(color: AppColors.inkMuted)),
              TextButton(
                onPressed: _busy ? null : _toggleMode,
                child: Text(_register ? 'Log in' : 'Create an account',
                    style: const TextStyle(fontWeight: FontWeight.w800)),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}
