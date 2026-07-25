import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../format_money.dart';
import '../models/models.dart';
import '../format_id.dart';
import '../services/api_service.dart';
import '../theme/umkm_theme.dart';
import '../widgets/ui.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  List<Product> items = [];
  String? error;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      items = await context.read<ApiService>().listProducts();
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _openForm({Product? existing}) async {
    final nameCtrl = TextEditingController(text: existing?.name ?? '');
    final priceCtrl =
        TextEditingController(text: (existing?.pricePerUnit ?? 0).toString());
    final costCtrl =
        TextEditingController(text: existing?.costPerUnit?.toString() ?? '');
    final detailsCtrl = TextEditingController(text: existing?.details ?? '');
    final packPrice = TextEditingController();
    final packCost = TextEditingController();
    final customSize = TextEditingController();
    String unit = existing?.unit ?? 'PCS';
    String packSize = '100';

    if (existing != null && existing.unit != 'PCS') {
      if (existing.price50 != null) {
        packSize = '50';
        packPrice.text = existing.price50!.toString();
        if (existing.cost50 != null) packCost.text = existing.cost50!.toString();
      } else if (existing.price100 != null) {
        packSize = '100';
        packPrice.text = existing.price100!.toString();
        if (existing.cost100 != null) {
          packCost.text = existing.cost100!.toString();
        }
      } else if (existing.price250 != null) {
        packSize = '250';
        packPrice.text = existing.price250!.toString();
        if (existing.cost250 != null) {
          packCost.text = existing.cost250!.toString();
        }
      } else if (existing.price500 != null) {
        packSize = '500';
        packPrice.text = existing.price500!.toString();
        if (existing.cost500 != null) {
          packCost.text = existing.cost500!.toString();
        }
      } else if (existing.price1000 != null) {
        packSize = '1000';
        packPrice.text = existing.price1000!.toString();
        if (existing.cost1000 != null) {
          packCost.text = existing.cost1000!.toString();
        }
      } else if (existing.priceCustom != null) {
        packSize = 'CUSTOM';
        packPrice.text = existing.priceCustom!.toString();
        if (existing.customSize != null) {
          customSize.text = existing.customSize!.toString();
        }
        if (existing.costCustom != null) {
          packCost.text = existing.costCustom!.toString();
        }
      }
    }

    double? parseOpt(TextEditingController c) {
      if (c.text.trim().isEmpty) return null;
      return double.tryParse(c.text);
    }

    final saved = await showAppFormSheet<bool>(
      context: context,
      title: existing == null ? 'Add product' : 'Edit product',
      body: (context, setLocal) {
        final isPcs = unit == 'PCS';
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            FormSection(
              title: 'Basics',
              description: 'Name and unit define pricing rules.',
              child: Column(
                children: [
                  TextField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(labelText: 'Name'),
                  ),
                  const SizedBox(height: 8),
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      'Unit',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: UmkmColors.muted,
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  ChoiceChipGroup<String>(
                    value: unit,
                    onChanged: (v) => setLocal(() => unit = v ?? unit),
                    options: const [
                      ChoiceOption(value: 'PCS', label: 'Pcs'),
                      ChoiceOption(value: 'GRAM', label: 'Gram'),
                      ChoiceOption(value: 'LITER', label: 'Liter'),
                    ],
                  ),
                ],
              ),
            ),
            if (isPcs)
              FormSection(
                title: 'Price & cost',
                description: 'One selling price per piece, optional cost.',
                child: Column(
                  children: [
                    TextField(
                      controller: priceCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Selling price / pcs',
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: costCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Cost / pcs (optional)',
                      ),
                    ),
                  ],
                ),
              )
            else
              FormSection(
                title: 'Pack',
                description:
                    'Exactly one pack: size, sell price, optional cost.',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Pack size',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: UmkmColors.muted,
                      ),
                    ),
                    const SizedBox(height: 6),
                    ChoiceChipGroup<String>(
                      value: packSize,
                      onChanged: (v) =>
                          setLocal(() => packSize = v ?? packSize),
                      options: const [
                        ChoiceOption(value: '50', label: '50'),
                        ChoiceOption(value: '100', label: '100'),
                        ChoiceOption(value: '250', label: '250'),
                        ChoiceOption(value: '500', label: '500'),
                        ChoiceOption(value: '1000', label: '1000'),
                        ChoiceOption(value: 'CUSTOM', label: 'Custom'),
                      ],
                    ),
                    if (packSize == 'CUSTOM') ...[
                      const SizedBox(height: 8),
                      TextField(
                        controller: customSize,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Custom size',
                        ),
                      ),
                    ],
                    const SizedBox(height: 8),
                    TextField(
                      controller: packPrice,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Selling price',
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: packCost,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Cost (optional)',
                      ),
                    ),
                  ],
                ),
              ),
            FormSection(
              title: 'Notes',
              description: 'Optional details for your team.',
              child: TextField(
                controller: detailsCtrl,
                decoration: const InputDecoration(labelText: 'Details'),
              ),
            ),
          ],
        );
      },
      actions: (context, setLocal) => [
        OutlinedButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context, true),
          child: const Text('Save'),
        ),
      ],
    );

    if (saved != true || !mounted) return;
    final Map<String, dynamic> body = {
      'name': nameCtrl.text.trim(),
      'unit': unit,
      'details': detailsCtrl.text.trim(),
    };
    if (unit == 'PCS') {
      body['pricePerUnit'] = double.tryParse(priceCtrl.text) ?? 0;
      body['costPerUnit'] = parseOpt(costCtrl);
    } else {
      // Clear every pack slot so only one remains (API enforces single pack).
      body['price50'] = null;
      body['price100'] = null;
      body['price250'] = null;
      body['price500'] = null;
      body['price1000'] = null;
      body['priceCustom'] = null;
      body['customSize'] = null;
      body['cost50'] = null;
      body['cost100'] = null;
      body['cost250'] = null;
      body['cost500'] = null;
      body['cost1000'] = null;
      body['costCustom'] = null;

      final price = parseOpt(packPrice);
      final cost = parseOpt(packCost);
      if (packSize == 'CUSTOM') {
        body['customSize'] = parseOpt(customSize);
        body['priceCustom'] = price;
        body['costCustom'] = cost;
      } else {
        body['price$packSize'] = price;
        body['cost$packSize'] = cost;
      }
    }
    try {
      final api = context.read<ApiService>();
      if (existing == null) {
        await api.request('POST', '/products', body: body);
      } else {
        await api.request('PATCH', '/products/${existing.id}', body: body);
      }
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _openView(Product product) async {
    final action = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(product.name),
        content: SizedBox(
          width: 420,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                DetailRow(label: 'Product ID', value: product.displayId),
                DetailRow(label: 'Unit', value: product.unit),
                DetailRow(
                  label: 'Stock',
                  value: '${product.stockQty} ${product.unit.toLowerCase()}',
                ),
                DetailRow(
                  label: 'Unit sell',
                  value: formatMoney(product.pricePerUnit),
                ),
                DetailRow(
                  label: 'Unit cost',
                  value: product.costPerUnit != null ? formatMoney(product.costPerUnit!) : '—',
                ),
                DetailRow(
                  label: 'Unit profit',
                  value: product.unitProfit != null ? formatMoney(product.unitProfit!) : '—',
                ),
                DetailRow(
                  label: 'Margin',
                  value: product.profitMarginPercent != null
                      ? '${product.profitMarginPercent}%'
                      : '—',
                ),
                DetailRow(
                  label: 'Details',
                  value: product.details.isEmpty ? '—' : product.details,
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, 'delete'),
            child: const Text('Delete'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, 'edit'),
            child: const Text('Edit'),
          ),
        ],
      ),
    );
    if (!mounted) return;
    if (action == 'edit') await _openForm(existing: product);
    if (action == 'delete') await _delete(product);
  }

  Future<void> _delete(Product product) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete product?'),
        content: Text(
          'Delete "${product.name}"?\n\nThis cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await context
          .read<ApiService>()
          .request('DELETE', '/products/${product.id}');
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator());
    if (error != null) {
      return Column(
        children: [
          ErrorBanner(message: error!),
          TextButton(onPressed: _load, child: const Text('Retry')),
        ],
      );
    }
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: RefreshIndicator(
        onRefresh: _load,
        child: items.isEmpty
            ? ListView(
                children: const [
                  PageIntro(
                    subtitle:
                        'Catalog items and pricing. Stock lives in Warehouse.',
                  ),
                  SectionLabel(
                    'Catalog',
                    subtitle: 'Products in this workspace.',
                  ),
                  SizedBox(height: 8),
                  EmptyHint(
                    title: 'No products yet',
                    message: 'Tap + to add your first product.',
                  ),
                ],
              )
            : ListView.builder(
                padding: listChromePadding(context),
                itemCount: items.length + 1,
                itemBuilder: (context, i) {
                  if (i == 0) {
                    return const Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        PageIntro(
                          subtitle:
                              'Catalog items and pricing. Stock lives in Warehouse.',
                        ),
                        SectionLabel(
                          'Catalog',
                          subtitle: 'Products in this workspace.',
                        ),
                      ],
                    );
                  }
                  final p = items[i - 1];
                  return EntityCard(
                    title: p.name,
                    subtitle: p.unit,
                    details: [
                      p.sku.isNotEmpty
                          ? compactLiteralId(p.sku)
                          : entityIdLabel(p.id),
                      if (p.unit == 'PCS')
                        'Sell ${formatMoney(p.pricePerUnit)}'
                            '${p.costPerUnit != null ? ' · cost ${formatMoney(p.costPerUnit!)}' : ''}'
                      else
                        'Rate ${formatMoney(p.pricePerUnit)}/${p.unit.toLowerCase()}',
                    ],
                    metrics: [
                      ('Stock', formatQty(p.stockQty)),
                      if (p.unitProfit != null)
                        ('Profit', formatMoney(p.unitProfit!)),
                      if (p.profitMarginPercent != null)
                        ('Margin', '${p.profitMarginPercent}%'),
                    ],
                    onTap: () => _openView(p),
                    actions: [
                      CardActionButton(
                        icon: Icons.visibility_outlined,
                        label: 'View',
                        onPressed: () => _openView(p),
                      ),
                      CardActionButton(
                        icon: Icons.edit_outlined,
                        label: 'Edit',
                        onPressed: () => _openForm(existing: p),
                      ),
                      CardActionButton(
                        icon: Icons.delete_outline,
                        label: 'Delete',
                        danger: true,
                        onPressed: () => _delete(p),
                      ),
                    ],
                  );
                },
              ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openForm(),
        icon: const Icon(Icons.add),
        label: const Text('Add'),
      ),
    );
  }
}
