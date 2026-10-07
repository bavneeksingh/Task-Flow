/// Backend address, set at build/run time:
///   flutter run --dart-define=API_URL=http://192.168.1.20:8000
/// Default 10.0.2.2 is how the Android emulator reaches the host computer.
const String apiBaseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://10.0.2.2:8000',
);
