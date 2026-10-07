import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme.dart';

/// The semicircle "Activity" chart from the web dashboard:
/// done (mint) drawn over done+in-progress (purple) over a grey track.
class HalfDonut extends StatelessWidget {
  const HalfDonut({super.key, required this.done, required this.inProgress, required this.total});

  final int done;
  final int inProgress;
  final int total;

  @override
  Widget build(BuildContext context) => Semantics(
        label: '$done of $total tasks done, $inProgress in progress',
        child: CustomPaint(
          size: const Size(200, 100),
          painter: _HalfDonutPainter(done, inProgress, total),
        ),
      );
}

class _HalfDonutPainter extends CustomPainter {
  _HalfDonutPainter(this.done, this.inProgress, this.total);

  final int done;
  final int inProgress;
  final int total;

  @override
  void paint(Canvas canvas, Size size) {
    const stroke = 16.0;
    final radius = math.min(size.width / 2, size.height) - stroke / 2;
    final rect = Rect.fromCircle(center: Offset(size.width / 2, size.height), radius: radius);

    Paint p(Color c) => Paint()
      ..color = c
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke;

    // Angles run clockwise from the right; start at the left (pi) and sweep over the top.
    canvas.drawArc(rect, math.pi, math.pi, false, p(AppColors.todoBg));
    if (total > 0) {
      final doneSweep = math.pi * done / total;
      final doingSweep = math.pi * inProgress / total;
      if (doneSweep + doingSweep > 0) canvas.drawArc(rect, math.pi, doneSweep + doingSweep, false, p(AppColors.doing));
      if (doneSweep > 0) canvas.drawArc(rect, math.pi, doneSweep, false, p(AppColors.done));
    }
  }

  @override
  bool shouldRepaint(_HalfDonutPainter old) =>
      old.done != done || old.inProgress != inProgress || old.total != total;
}
