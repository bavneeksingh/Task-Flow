# TaskFlow — Flutter mobile app

A Flutter version of the TaskFlow website. It talks to the **same Node/Express backend**
(`backend-node/`) and the same Postgres database, so an account and its data are shared with the web app.

## What maps to what

| Website page / feature            | Flutter                                                                 |
|-----------------------------------|-------------------------------------------------------------------------|
| Login / Register                  | `AuthScreen` (same validation rules and messages)                       |
| Sidebar: Dashboard, Projects, Calendar | Bottom navigation bar (`HomeShell`); account + log out under the avatar |
| Dashboard (Today, To do, In progress, Projects, Activity chart) | `DashboardScreen`, plus an **Overview** card with the 5 numbers the assignment requires |
| `/tasks?status=…`                 | `TaskListScreen` (opened from the To do / In progress cards)           |
| Projects list, search, status filter, New project | `ProjectsScreen` + `project_form_sheet.dart`               |
| Project detail, progress, tasks, search, status/priority filters, edit/delete | `ProjectDetailScreen` + `task_form_sheet.dart` |
| Calendar month view + day list    | `CalendarScreen`                                                        |
| Pastel palette, Plus Jakarta Sans | `theme.dart` (same colours as `styles.css`)                             |

Mobile-specific requirements:

- The token lives in **flutter_secure_storage**: the Android Keystore on Android and the Keychain on iOS.
- When the token is rejected, every open screen closes and Login shows *"Your session has expired. Please log in again."*
- With no network you get a clear *"You seem to be offline"* message and a Try again button, never a crash or blank screen.
  Requests time out after 12 seconds.
- Every list has **pull-to-refresh**, and screens reload when you come back to them.

## Setup

You need Flutter 3.27 or newer (`flutter --version`). This folder contains `lib/`, `test/`, `assets/` and
`pubspec.yaml`. Generate the Android and iOS project files once:

```bash
cd mobile_flutter
flutter create . --project-name taskflow --org com.taskflow --platforms android,ios
flutter pub get
```

`flutter create .` only adds missing files. It won't overwrite `lib/`, `pubspec.yaml` or the tests.

### Two Android edits (required)

Open `android/app/src/main/AndroidManifest.xml` and make these changes:

```xml
<manifest ...>
    <!-- 1. Release builds have no network access without this line. -->
    <uses-permission android:name="android.permission.INTERNET"/>

    <!-- 2. Allows plain http:// to your dev backend. Remove it once the API is on https://. -->
    <application
        android:usesCleartextTraffic="true"
        ...>
```

Recommended: also add `android:allowBackup="false"` on `<application>`. Android backups can restore the
encrypted token without the Keystore key that encrypted it. The app recovers from that by logging you out, but
it's cleaner to avoid it.

## Run

Start the backend first (`cd backend-node && npm run dev`, which listens on port 8000). Then:

```bash
# Android emulator (10.0.2.2 is the emulator's address for your computer)
flutter run --dart-define=API_URL=http://10.0.2.2:8000

# Physical phone on the same Wi-Fi: use your computer's LAN IP
flutter run --dart-define=API_URL=http://192.168.1.20:8000

# Tests
flutter test
```

If login suddenly returns "Too many requests", that's the backend's rate limit: 10 login/register attempts
per 15 minutes per IP. The emulator and your browser share your computer's IP.

## Project layout

```
lib/
  main.dart                 app start, providers, chooses Login vs app
  config.dart               API_URL (--dart-define)
  theme.dart                colours/typography from the website
  api/api_client.dart       all HTTP calls, error mapping, secure token storage
  models/models.dart        User, Project, Task, DashboardStats
  state/auth_state.dart     login / register / logout / session restore
  utils/format.dart         local-date helpers + validators
  widgets/                  badges, progress ribbon, states, chart, date field
  screens/                  one file per screen / form sheet
test/widget_test.dart       unit tests (dates, validation, parsing, API errors)
```

## Design notes

- **Dates are local calendar dates.** `isoDate()` builds `YYYY-MM-DD` from the phone's local date. Converting to
  UTC first, as `toISOString()` does, shifts dates by a day in India (UTC+5:30).
- **Newest request wins.** Every screen numbers its requests and ignores older responses. While you type in
  search, a slow earlier result can't overwrite a newer one.
- **Offline doesn't log you out.** Only a 401 from the server ends the session. Starting the app offline shows a
  retry screen and keeps the token.
