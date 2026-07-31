import '../format_money.dart';
import '../models/models.dart';

class ProductPack {
  ProductPack({
    required this.key,
    required this.size,
    required this.price,
    required this.label,
  });

  final String key;
  final double size;
  final double price;
  final String label;
}

/// Catalog selling pack used for warehouse / pricing display.
class ActivePack {
  ActivePack({
    required this.sizeLabel,
    required this.size,
    required this.price,
    required this.shortUnit,
    this.cost,
  });

  final String sizeLabel;
  final double size;
  final double price;
  final double? cost;
  final String shortUnit;
}

String unitShort(String? unit) {
  switch (unit) {
    case 'GRAM':
      return 'g';
    case 'LITER':
      return 'L';
    default:
      return 'pcs';
  }
}

String _fmtSize(num value) {
  return formatCompactQty(value);
}

/// Active selling pack for a catalog product (pcs or single gram/liter pack).
ActivePack? getActivePack(Product product) {
  final short = unitShort(product.unit);
  if (product.unit == 'PCS') {
    return ActivePack(
      sizeLabel: '1 pcs',
      size: 1,
      price: product.pricePerUnit,
      cost: product.costPerUnit,
      shortUnit: 'pcs',
    );
  }

  final fixed = <(double, double?, double?)>[
    (50, product.price50, product.cost50),
    (100, product.price100, product.cost100),
    (250, product.price250, product.cost250),
    (500, product.price500, product.cost500),
    (1000, product.price1000, product.cost1000),
  ];
  for (final (size, price, cost) in fixed) {
    if (price != null) {
      return ActivePack(
        sizeLabel: '${_fmtSize(size)} $short',
        size: size,
        price: price,
        cost: cost,
        shortUnit: short,
      );
    }
  }
  if (product.priceCustom != null && product.customSize != null) {
    return ActivePack(
      sizeLabel: '${_fmtSize(product.customSize!)} $short',
      size: product.customSize!,
      price: product.priceCustom!,
      cost: product.costCustom,
      shortUnit: short,
    );
  }
  return null;
}

/// How many active packs fit in stock (null if no pack / size).
double? packsOnHand(double stockQty, ActivePack? pack) {
  if (pack == null || !(pack.size > 0)) return null;
  return ((stockQty / pack.size) * 10000).round() / 10000;
}

double qtyFromPackCount(double packCount, double packSize) {
  if (!(packSize > 0) || !(packCount >= 0)) return 0;
  return ((packCount * packSize) * 10000).round() / 10000;
}

String? formatPacksOnHand(double stockQty, ActivePack? pack) {
  final count = packsOnHand(stockQty, pack);
  if (count == null || pack == null) return null;
  if (pack.size == 1 && pack.shortUnit == 'pcs') {
    return '${formatCompactQty(count)} pcs';
  }
  return '${formatCompactQty(count)} packs (${pack.sizeLabel})';
}

List<ProductPack> listProductPacks(Product product) {
  if (product.unit == 'PCS') {
    return [
      ProductPack(
        key: 'PCS',
        size: 1,
        price: product.pricePerUnit,
        label: 'Per pcs · ${product.pricePerUnit}',
      ),
    ];
  }

  final short = product.unit == 'LITER' ? 'L' : 'g';
  final packs = <ProductPack>[];
  void addFixed(String key, double size, double? price) {
    if (price != null) {
      packs.add(
        ProductPack(
          key: key,
          size: size,
          price: price,
          label: '${size.toStringAsFixed(size % 1 == 0 ? 0 : 2)}$short · $price',
        ),
      );
    }
  }

  addFixed('50', 50, product.price50);
  addFixed('100', 100, product.price100);
  addFixed('250', 250, product.price250);
  addFixed('500', 500, product.price500);
  addFixed('1000', 1000, product.price1000);

  if (product.priceCustom != null &&
      product.customSize != null &&
      product.customSize! > 0) {
    packs.add(
      ProductPack(
        key: 'CUSTOM',
        size: product.customSize!,
        price: product.priceCustom!,
        label:
            '${product.customSize}$short (custom) · ${product.priceCustom}',
      ),
    );
  }
  return packs;
}
