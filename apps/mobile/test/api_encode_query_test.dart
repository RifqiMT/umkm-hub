import 'package:flutter_test/flutter_test.dart';
import 'package:umkm_hub/services/api_service.dart';

void main() {
  group('ApiService.encodeQuery', () {
    test('joins list filters as comma-separated values', () {
      final q = ApiService.encodeQuery({
        'limit': '100',
        'search': 'kopi',
        'unit': ['PCS', 'GRAM'],
        'status': <String>[],
        'empty': '',
        'skip': null,
      });
      expect(q, {
        'limit': '100',
        'search': 'kopi',
        'unit': 'PCS,GRAM',
      });
    });
  });
}
