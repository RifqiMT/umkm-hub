import '../format_money.dart';
import '../models/models.dart';

const gramLiterPackSizes = [1, 5, 10, 25, 50, 100, 250, 500, 1000];

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

double? _packPrice(Product product, int size) {
  switch (size) {
    case 1:
      return product.price1;
    case 5:
      return product.price5;
    case 10:
      return product.price10;
    case 25:
      return product.price25;
    case 50:
      return product.price50;
    case 100:
      return product.price100;
    case 250:
      return product.price250;
    case 500:
      return product.price500;
    case 1000:
      return product.price1000;
    default:
      return null;
  }
}

double? _packCost(Product product, int size) {
  switch (size) {
    case 1:
      return product.cost1;
    case 5:
      return product.cost5;
    case 10:
      return product.cost10;
    case 25:
      return product.cost25;
    case 50:
      return product.cost50;
    case 100:
      return product.cost100;
    case 250:
      return product.cost250;
    case 500:
      return product.cost500;
    case 1000:
      return product.cost1000;
    default:
      return null;
  }
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

  for (final size in gramLiterPackSizes) {
    final price = _packPrice(product, size);
    if (price != null) {
      return ActivePack(
        sizeLabel: '${_fmtSize(size)} $short',
        size: size.toDouble(),
        price: price,
        cost: _packCost(product, size),
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
  for (final size in gramLiterPackSizes) {
    final price = _packPrice(product, size);
    if (price != null) {
      packs.add(
        ProductPack(
          key: '$size',
          size: size.toDouble(),
          price: price,
          label: '${size.toStringAsFixed(size % 1 == 0 ? 0 : 2)}$short · $price',
        ),
      );
    }
  }

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
