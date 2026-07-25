/// First 8 hex chars of a UUID (or any id), for compact list display.
String shortEntityId(String id) {
  final compact = id.replaceAll('-', '');
  if (compact.length >= 8) {
    return compact.substring(0, 8).toLowerCase();
  }
  if (id.length >= 8) return id.substring(0, 8);
  return id;
}

String entityIdLabel(String id) => 'ID ${shortEntityId(id)}';

/// Shorten long literal SKUs like `2026_07_25_{uuid}` for dense lists.
String compactLiteralId(String sku) {
  final orderMatch = RegExp(
    r'^(\d{4}_\d{2}_\d{2}_)([0-9a-f-]{32,36})$',
    caseSensitive: false,
  ).firstMatch(sku);
  if (orderMatch != null) {
    final hex = orderMatch.group(2)!.replaceAll('-', '');
    final prefix = orderMatch.group(1)!;
    final short = hex.length >= 8 ? hex.substring(0, 8) : hex;
    return '$prefix$short…';
  }
  final uuidMatch = RegExp(
    r'^(.+_)([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$',
    caseSensitive: false,
  ).firstMatch(sku);
  if (uuidMatch != null) {
    final hex = uuidMatch.group(2)!.replaceAll('-', '');
    final prefix = uuidMatch.group(1)!;
    final short = hex.length >= 8 ? hex.substring(0, 8) : hex;
    return '$prefix$short…';
  }
  final hexTail = RegExp(
    r'^([A-Za-z0-9]+(?:_[A-Za-z0-9]+){1,3}_)([0-9a-f]{12,})$',
    caseSensitive: false,
  ).firstMatch(sku);
  if (hexTail != null) {
    final prefix = hexTail.group(1)!;
    final hex = hexTail.group(2)!;
    final short = hex.length >= 8 ? hex.substring(0, 8) : hex;
    return '$prefix$short…';
  }
  if (sku.length > 22) return '${sku.substring(0, 18)}…';
  return sku;
}
