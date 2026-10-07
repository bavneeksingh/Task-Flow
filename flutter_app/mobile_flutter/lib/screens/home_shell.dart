import 'package:flutter/material.dart';

import 'calendar_screen.dart';
import 'dashboard_screen.dart';
import 'projects_screen.dart';

/// Bottom navigation, matching the website's sidebar: Dashboard, Projects, Calendar.
/// Each tab is rebuilt when selected, so it always shows fresh data.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: switch (_index) {
        0 => const DashboardScreen(),
        1 => const ProjectsScreen(),
        _ => const CalendarScreen(),
      },
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.grid_view_outlined), selectedIcon: Icon(Icons.grid_view_rounded), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.folder_outlined), selectedIcon: Icon(Icons.folder_rounded), label: 'Projects'),
          NavigationDestination(icon: Icon(Icons.calendar_month_outlined), selectedIcon: Icon(Icons.calendar_month_rounded), label: 'Calendar'),
        ],
      ),
    );
  }
}
