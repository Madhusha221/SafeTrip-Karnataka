
import 'package:flutter_test/flutter_test.dart';
import 'package:safetrip_karnataka_mobile/main.dart';

void main() {
  test('SafeTrip Karnataka app can be created', () {
    const app = SafeTripApp();

    expect(app, isA<SafeTripApp>());
  });
}
