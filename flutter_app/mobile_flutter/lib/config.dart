/// Backend address, set at build/run time:
///   flutter run --dart-define=API_URL=http://192.168.1.20:8000
/// When using a physical device connected via USB, run:
///   adb reverse tcp:8000 tcp:8000
const String apiBaseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://127.0.0.1:8000',
);
