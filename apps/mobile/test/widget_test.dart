import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:umkm_hub/main.dart';

void main() {
  testWidgets('UMKM Hub app builds', (WidgetTester tester) async {
    await tester.pumpWidget(const UmkmHubApp());
    await tester.pump();

    expect(find.byType(MaterialApp), findsOneWidget);
    expect(find.text('UMKM Hub'), findsWidgets);
  });
}
