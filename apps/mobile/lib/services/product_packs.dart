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
