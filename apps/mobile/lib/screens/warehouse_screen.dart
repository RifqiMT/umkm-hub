import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../format_money.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../widgets/ui.dart';

String _todayDate() {
  final now = DateTime.now();
  final m = now.month.toString().padLeft(2, '0');
  final d = now.day.toString().padLeft(2, '0');
  return '${now.year}-$m-$d';
}

class WarehouseScreen extends StatefulWidget {
  const WarehouseScreen({super.key});

  @override
  State<WarehouseScreen> createState() => _WarehouseScreenState();
}

class _WarehouseScreenState extends State<WarehouseScreen> {
  List<WarehouseRestock> items = [];
  List<Product> products = [];
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
      final api = context.read<ApiService>();
      items = await api.listWarehouseRestocks();
      products = await api.listProducts();
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  double get totalPotentialRevenue =>
      products.fold<double>(0, (sum, p) => sum + p.potentialRevenue);

  double get totalPotentialCost => products.fold<double>(
        0,
        (sum, p) => sum + (p.potentialCost ?? 0),
      );

  double get totalPotentialProfit => products.fold<double>(
        0,
        (sum, p) => sum + (p.potentialProfit ?? 0),
      );

  double? get inventoryMarginPercent {
    final priced = products.where((p) => p.potentialCost != null);
    if (priced.isEmpty) return null;
    final revenue =
        priced.fold<double>(0, (sum, p) => sum + p.potentialRevenue);
    final profit =
        priced.fold<double>(0, (sum, p) => sum + (p.potentialProfit ?? 0));
    if (revenue <= 0) return null;
    return ((profit / revenue) * 10000).round() / 100;
  }

  bool get hasAnyCost => products.any((p) => p.potentialCost != null);

  Future<void> _pickDate({
    required String initial,
    required void Function(String) onPicked,
  }) async {
    final parts = initial.split('-');
    final initialDate = parts.length == 3
        ? DateTime(
            int.tryParse(parts[0]) ?? DateTime.now().year,
            int.tryParse(parts[1]) ?? DateTime.now().month,
            int.tryParse(parts[2]) ?? DateTime.now().day,
          )
        : DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
      helpText: 'Restock date',
    );
    if (picked != null) {
      final m = picked.month.toString().padLeft(2, '0');
      final d = picked.day.toString().padLeft(2, '0');
      onPicked('${picked.year}-$m-$d');
    }
  }

  Future<void> _openForm({Product? product}) async {
    if (products.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add a product before restocking')),
      );
      return;
    }

    String productId = product?.id ?? products.first.id;
    final qtyCtrl = TextEditingController(text: '1');
    final notesCtrl = TextEditingController();
    String restockDate = _todayDate();

    final saved = await showAppFormSheet<bool>(
      context: context,
      title: 'Add restock',
      body: (context, setLocal) {
        final product = products.firstWhere((p) => p.id == productId);
        final qty = double.tryParse(qtyCtrl.text) ?? 0;
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            FormSection(
              title: 'Restock',
              description: 'Add stock for a product in your catalog.',
              child: Column(
                children: [
                  DropdownButtonFormField<String>(
                    value: productId,
                    items: products
                        .map(
                          (p) => DropdownMenuItem(
                            value: p.id,
                            child: Text(
                              '${p.name} (${p.stockQty} ${p.unit.toLowerCase()})',
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: (v) =>
                        setLocal(() => productId = v ?? productId),
                    decoration: const InputDecoration(labelText: 'Product'),
                  ),
                  const SizedBox(height: 8),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Restock date'),
                    subtitle: Text(restockDate),
                    trailing: const Icon(Icons.calendar_today),
                    onTap: () => _pickDate(
                      initial: restockDate,
                      onPicked: (v) => setLocal(() => restockDate = v),
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: qtyCtrl,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: 'Qty to add (${product.unit.toLowerCase()})',
                    ),
                    onChanged: (_) => setLocal(() {}),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: notesCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Notes (optional)',
                    ),
                  ),
                ],
              ),
            ),
            FormSection(
              title: 'Impact preview',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Stock ${product.stockQty} → ${product.stockQty + qty} ${product.unit.toLowerCase()}',
                  ),
                  Text('Sell value now: ${formatMoney(product.potentialRevenue)}'),
                  Text(
                    product.potentialCost != null
                        ? 'Cost value now: ${product.potentialCost}'
                        : 'Cost value now: —',
                  ),
                  Text(
                    product.potentialProfit != null
                        ? 'Profit value now: ${product.potentialProfit}'
                        : 'Profit value now: —',
                  ),
                  Text(
                    product.profitMarginPercent != null
                        ? 'Margin now: ${product.profitMarginPercent}%'
                        : 'Margin now: —',
                  ),
                ],
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
    final body = {
      'productId': productId,
      'qtyAdded': double.tryParse(qtyCtrl.text) ?? 1,
      'restockDate': restockDate,
      if (notesCtrl.text.trim().isNotEmpty) 'notes': notesCtrl.text.trim(),
    };
    try {
      await context
          .read<ApiService>()
          .request('POST', '/warehouse', body: body);
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _openViewProduct(Product product) async {
    await showDialog<void>(
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
                DetailRow(label: 'Unit', value: product.unit),
                DetailRow(
                  label: 'Stock',
                  value: '${product.stockQty} ${product.unit.toLowerCase()}',
                ),
                DetailRow(label: 'Unit sell', value: formatMoney(product.pricePerUnit)),
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
                  label: 'Sell value',
                  value: formatMoney(product.potentialRevenue),
                ),
                DetailRow(
                  label: 'Cost value',
                  value: product.potentialCost != null ? formatMoney(product.potentialCost!) : '—',
                ),
                DetailRow(
                  label: 'Profit value',
                  value: product.potentialProfit != null ? formatMoney(product.potentialProfit!) : '—',
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
        ],
      ),
    );
  }

  Future<void> _openViewRestock(WarehouseRestock restock) async {
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(restock.productName ?? restock.productId),
        content: SizedBox(
          width: 420,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                DetailRow(label: 'Restock date', value: restock.restockDate),
                DetailRow(
                  label: 'Qty added',
                  value:
                      '+${restock.qtyAdded} ${(restock.unitSnapshot ?? '').toLowerCase()}',
                ),
                DetailRow(
                  label: 'Before → after',
                  value: '${restock.stockBefore} → ${restock.stockAfter}',
                ),
                DetailRow(
                  label: 'Notes',
                  value: restock.notes.isEmpty ? '—' : restock.notes,
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
        ],
      ),
    );
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
        child: ListView(
          padding: listChromePadding(context),
          children: [
            const PageIntro(
              subtitle:
                  'Stock levels, sell, cost, profit, margin, and restock history.',
            ),
            const SectionLabel(
              'Inventory',
              subtitle: 'Stock on hand with sell, cost, profit, and margin.',
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: MetricTile(
                          label: 'Sell value',
                          value: formatMoney(totalPotentialRevenue),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: MetricTile(
                          label: 'Cost value',
                          value: hasAnyCost
                              ? formatMoney(totalPotentialCost)
                              : '—',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: MetricTile(
                          label: 'Profit',
                          value: hasAnyCost
                              ? formatMoney(totalPotentialProfit)
                              : '—',
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: MetricTile(
                          label: 'Margin',
                          value: inventoryMarginPercent != null
                              ? '${inventoryMarginPercent}%'
                              : '—',
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 4),
            if (products.isEmpty)
              const EmptyHint(
                title: 'No inventory yet',
                message: 'Create products first, then restock here.',
              )
            else
              ...products.map(
                (p) => EntityCard(
                  title: p.name,
                  chips: [
                    StatusChip(label: p.unit, tone: StatusTone.neutral),
                    if (p.profitMarginPercent != null)
                      StatusChip(
                        label: '${p.profitMarginPercent}%',
                        tone: StatusTone.brand,
                      ),
                  ],
                  details: [
                    'Stock ${p.stockQty} ${p.unit.toLowerCase()}',
                  ],
                  metrics: [
                    ('Sell', formatMoney(p.potentialRevenue)),
                    (
                      'Cost',
                      p.potentialCost != null ? formatMoney(p.potentialCost!) : '—',
                    ),
                    (
                      'Profit',
                      p.potentialProfit != null ? formatMoney(p.potentialProfit!) : '—',
                    ),
                    if (p.profitMarginPercent != null)
                      ('Margin', '${p.profitMarginPercent}%'),
                  ],
                  onTap: () => _openViewProduct(p),
                  actions: [
                    CardActionButton(
                      icon: Icons.visibility_outlined,
                      label: 'View',
                      onPressed: () => _openViewProduct(p),
                    ),
                    CardActionButton(
                      icon: Icons.add_box_outlined,
                      label: 'Restock',
                      onPressed: () => _openForm(product: p),
                    ),
                  ],
                ),
              ),
            const SectionLabel(
              'Restock history',
              subtitle: 'Every stock addition with before and after quantities.',
            ),
            if (items.isEmpty)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('No restocks yet.'),
              )
            else
              ...items.map(
                (r) => EntityCard(
                  title: r.productName ?? r.productId,
                  chips: [
                    StatusChip(
                      label:
                          '+${r.qtyAdded} ${(r.unitSnapshot ?? '').toLowerCase()}',
                      tone: StatusTone.brand,
                    ),
                  ],
                  details: [
                    if (r.restockDate.isNotEmpty) r.restockDate,
                    if (r.notes.isNotEmpty) r.notes,
                  ],
                  metrics: [
                    ('Before', '${r.stockBefore}'),
                    ('After', '${r.stockAfter}'),
                  ],
                  onTap: () => _openViewRestock(r),
                ),
              ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openForm,
        icon: const Icon(Icons.add),
        label: const Text('Restock'),
      ),
    );
  }
}
