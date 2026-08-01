import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../format_money.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../services/product_packs.dart';
import '../theme/umkm_theme.dart';
import '../timeline.dart';
import '../widgets/ui.dart';
import '../widgets/feature_data_transfer.dart';

String _todayDate() {
  final now = DateTime.now();
  final m = now.month.toString().padLeft(2, '0');
  final d = now.day.toString().padLeft(2, '0');
  return '${now.year}-$m-$d';
}

Product? _productById(List<Product> products, String productId) {
  for (final p in products) {
    if (p.id == productId) return p;
  }
  return null;
}

class WarehouseScreen extends StatefulWidget {
  const WarehouseScreen({super.key});

  @override
  State<WarehouseScreen> createState() => _WarehouseScreenState();
}

class _WarehouseScreenState extends State<WarehouseScreen> {
  List<WarehouseRestock> items = [];
  List<WarehouseSale> sales = [];
  List<Product> products = [];
  String? error;
  bool loading = true;
  bool _dataSyncOpen = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final hasData =
        items.isNotEmpty || sales.isNotEmpty || products.isNotEmpty;
    setState(() {
      // Keep previous lists visible while refreshing.
      loading = !hasData;
      error = null;
    });
    try {
      final api = context.read<ApiService>();
      final results = await Future.wait([
        api.listWarehouseRestocks(),
        api.listWarehouseSales(),
        api.listProducts(),
      ]);
      if (!mounted) return;
      setState(() {
        items = results[0] as List<WarehouseRestock>;
        sales = results[1] as List<WarehouseSale>;
        products = results[2] as List<Product>;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => error = e.toString());
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
      firstDate: AppTimeline.firstDate,
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
    final packsCtrl = TextEditingController(text: '1');
    final notesCtrl = TextEditingController();
    String restockDate = _todayDate();
    var entryByPack = false;

    void syncFromProduct(Product p, void Function(VoidCallback) setLocal) {
      final pack = getActivePack(p);
      entryByPack = pack != null && pack.size > 1;
      if (entryByPack && pack != null) {
        packsCtrl.text = '1';
        qtyCtrl.text = qtyFromPackCount(1, pack.size).toString();
      } else {
        qtyCtrl.text = '1';
        packsCtrl.text =
            pack != null ? (packsOnHand(1, pack) ?? 1).toString() : '1';
      }
      setLocal(() {});
    }

    final initial = products.firstWhere((p) => p.id == productId);
    final initialPack = getActivePack(initial);
    entryByPack = initialPack != null && initialPack.size > 1;
    if (entryByPack && initialPack != null) {
      packsCtrl.text = '1';
      qtyCtrl.text = qtyFromPackCount(1, initialPack.size).toString();
    }

    final saved = await showAppFormSheet<bool>(
      context: context,
      title: 'Add restock',
      body: (context, setLocal) {
        final product = products.firstWhere((p) => p.id == productId);
        final pack = getActivePack(product);
        final packModeAvailable = pack != null && pack.size > 1;
        final qty = double.tryParse(qtyCtrl.text) ?? 0;
        final packs = double.tryParse(packsCtrl.text) ?? 0;
        final packsNow = formatPacksOnHand(product.stockQty, pack);
        final packsAfter = formatPacksOnHand(product.stockQty + qty, pack);
        final packsAddedLabel = formatPacksOnHand(qty, pack);

        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            FormSection(
              title: 'Restock',
              description: pack != null
                  ? 'Active pack ${pack.sizeLabel}. Add by pack count or unit qty.'
                  : 'Add stock for a product in your catalog.',
              child: Column(
                children: [
                  DropdownButtonFormField<String>(
                    value: productId,
                    items: products.map((p) {
                      final pPack = getActivePack(p);
                      return DropdownMenuItem(
                        value: p.id,
                        child: Text(
                          pPack != null
                              ? '${p.name} (${formatCompactQty(p.stockQty)} ${p.unit.toLowerCase()} · ${pPack.sizeLabel})'
                              : '${p.name} (${formatCompactQty(p.stockQty)} ${p.unit.toLowerCase()})',
                        ),
                      );
                    }).toList(),
                    onChanged: (v) {
                      final nextId = v ?? productId;
                      productId = nextId;
                      final next = products.firstWhere((p) => p.id == nextId);
                      syncFromProduct(next, setLocal);
                    },
                    decoration: const InputDecoration(labelText: 'Product'),
                  ),
                  if (pack != null) ...[
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: StatusChip(
                        label: 'Pack ${pack.sizeLabel}',
                        tone: StatusTone.brand,
                      ),
                    ),
                  ],
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
                  if (packModeAvailable) ...[
                    const SizedBox(height: 8),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text('Enter by pack (${pack!.sizeLabel})'),
                      value: entryByPack,
                      onChanged: (v) {
                        setLocal(() {
                          entryByPack = v;
                          if (v) {
                            if ((double.tryParse(packsCtrl.text) ?? 0) <= 0) {
                              packsCtrl.text = '1';
                            }
                            qtyCtrl.text = qtyFromPackCount(
                              double.tryParse(packsCtrl.text) ?? 1,
                              pack.size,
                            ).toString();
                          } else {
                            packsCtrl.text =
                                (packsOnHand(qty, pack) ?? 0).toString();
                          }
                        });
                      },
                    ),
                  ],
                  const SizedBox(height: 8),
                  if (entryByPack && packModeAvailable)
                    TextField(
                      controller: packsCtrl,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'Packs to add (${pack!.sizeLabel})',
                      ),
                      onChanged: (v) {
                        final pCount = double.tryParse(v) ?? 0;
                        qtyCtrl.text =
                            qtyFromPackCount(pCount, pack.size).toString();
                        setLocal(() {});
                      },
                    )
                  else
                    TextField(
                      controller: qtyCtrl,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText:
                            'Qty to add (${product.unit.toLowerCase()})',
                      ),
                      onChanged: (v) {
                        if (pack != null) {
                          final nextQty = double.tryParse(v) ?? 0;
                          packsCtrl.text =
                              (packsOnHand(nextQty, pack) ?? 0).toString();
                        }
                        setLocal(() {});
                      },
                    ),
                  if (entryByPack && packModeAvailable) ...[
                    const SizedBox(height: 6),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        '= ${formatCompactQty(qty)} ${product.unit.toLowerCase()}',
                        style: const TextStyle(color: Colors.black54),
                      ),
                    ),
                  ] else if (pack != null && packs > 0) ...[
                    const SizedBox(height: 6),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        '${formatCompactQty(packs)} × ${pack.sizeLabel}',
                        style: const TextStyle(color: Colors.black54),
                      ),
                    ),
                  ],
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
                    'Stock ${formatCompactQty(product.stockQty)} → ${formatCompactQty(product.stockQty + qty)} ${product.unit.toLowerCase()}',
                  ),
                  if (packsNow != null || packsAfter != null)
                    Text(
                      'Packs ${packsNow ?? '—'} → ${packsAfter ?? '—'}'
                      '${packsAddedLabel != null ? ' (+$packsAddedLabel)' : ''}',
                    ),
                  Text(
                    'Sell value now: ${formatMoney(product.potentialRevenue)}',
                  ),
                  Text(
                    product.potentialCost != null
                        ? 'Cost value now: ${formatMoney(product.potentialCost!)}'
                        : 'Cost value now: —',
                  ),
                  Text(
                    product.potentialProfit != null
                        ? 'Profit value now: ${formatMoney(product.potentialProfit!)}'
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
    final pack = getActivePack(product);
    final packsLabel = formatPacksOnHand(product.stockQty, pack);
    await showAppViewSheet<void>(
      context: context,
      title: product.name,
      subtitle: 'Stock on hand and inventory value for this product.',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DetailRow(label: 'Unit', value: product.unit),
          DetailRow(
            label: 'Pack',
            value: pack != null ? pack.sizeLabel : 'No pack',
          ),
          DetailRow(
            label: 'Stock',
            value:
                '${formatCompactQty(product.stockQty)} ${product.unit.toLowerCase()}',
          ),
          DetailRow(
            label: 'Packs in stock',
            value: packsLabel ?? '—',
          ),
          if (pack != null) ...[
            DetailRow(
              label: 'Pack sell',
              value: formatMoney(pack.price),
            ),
            DetailRow(
              label: 'Pack cost',
              value: pack.cost != null ? formatMoney(pack.cost!) : '—',
            ),
            DetailRow(
              label: 'Pack profit',
              value: pack.cost != null
                  ? formatMoney(pack.price - pack.cost!)
                  : '—',
            ),
          ],
          DetailRow(
            label: 'Unit sell',
            value: formatMoney(product.pricePerUnit),
          ),
          DetailRow(
            label: 'Unit cost',
            value: product.costPerUnit != null
                ? formatMoney(product.costPerUnit!)
                : '—',
          ),
          DetailRow(
            label: 'Unit profit',
            value: product.unitProfit != null
                ? formatMoney(product.unitProfit!)
                : '—',
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
            value: product.potentialCost != null
                ? formatMoney(product.potentialCost!)
                : '—',
          ),
          DetailRow(
            label: 'Profit value',
            value: product.potentialProfit != null
                ? formatMoney(product.potentialProfit!)
                : '—',
          ),
        ],
      ),
    );
  }

  Future<void> _openViewRestock(WarehouseRestock restock) async {
    final product = _productById(products, restock.productId);
    final pack = product != null ? getActivePack(product) : null;
    final u = (restock.unitSnapshot ?? product?.unit ?? '').toLowerCase();
    final packsAdded = formatPacksOnHand(restock.qtyAdded, pack);
    final packsBefore = formatPacksOnHand(restock.stockBefore, pack);
    final packsAfter = formatPacksOnHand(restock.stockAfter, pack);
    await showAppViewSheet<void>(
      context: context,
      title: restock.productName ?? restock.productId,
      subtitle: 'Restock movement and stock snapshots.',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DetailRow(label: 'Restock date', value: restock.restockDate),
          DetailRow(
            label: 'Pack',
            value: pack != null ? pack.sizeLabel : '—',
          ),
          DetailRow(
            label: 'Qty added',
            value: '+${formatCompactQty(restock.qtyAdded)} $u'
                '${packsAdded != null ? ' · $packsAdded' : ''}',
          ),
          DetailRow(
            label: 'Before → after',
            value:
                '${formatCompactQty(restock.stockBefore)} → ${formatCompactQty(restock.stockAfter)}'
                '${packsBefore != null || packsAfter != null ? ' (${packsBefore ?? '—'} → ${packsAfter ?? '—'})' : ''}',
          ),
          DetailRow(
            label: 'Notes',
            value: restock.notes.isEmpty ? '—' : restock.notes,
          ),
        ],
      ),
    );
  }

  Future<void> _openViewSale(WarehouseSale sale) async {
    final product = _productById(products, sale.productId);
    final pack = product != null ? getActivePack(product) : null;
    final u = (sale.unitSnapshot ?? product?.unit ?? '').toLowerCase();
    final packsSold = formatPacksOnHand(sale.qtySold, pack);
    final packsBefore = formatPacksOnHand(sale.stockBefore, pack);
    final packsAfter = formatPacksOnHand(sale.stockAfter, pack);
    await showAppViewSheet<void>(
      context: context,
      title: sale.productName ?? sale.productId,
      subtitle: sale.orderRef?.isNotEmpty == true
          ? 'Stock drawn by order ${sale.orderRef}.'
          : 'Stock drawn when this order line was fulfilled.',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DetailRow(label: 'Sold date', value: sale.soldDate),
          DetailRow(
            label: 'Order',
            value: sale.orderRef?.isNotEmpty == true
                ? sale.orderRef!
                : sale.orderId,
          ),
          DetailRow(
            label: 'Pack',
            value: pack != null ? pack.sizeLabel : '—',
          ),
          DetailRow(
            label: 'Qty sold',
            value: '−${formatCompactQty(sale.qtySold)} $u'
                '${packsSold != null ? ' · $packsSold' : ''}',
          ),
          DetailRow(
            label: 'Before → after',
            value:
                '${formatCompactQty(sale.stockBefore)} → ${formatCompactQty(sale.stockAfter)}'
                '${packsBefore != null || packsAfter != null ? ' (${packsBefore ?? '—'} → ${packsAfter ?? '—'})' : ''}',
          ),
          DetailRow(
            label: 'Notes',
            value: sale.notes.isEmpty ? '—' : sale.notes,
          ),
        ],
      ),
    );
  }

  Widget _buildDataSyncSection() {
    return FeatureDataSyncSection(
      open: _dataSyncOpen,
      onToggle: () => setState(() => _dataSyncOpen = !_dataSyncOpen),
      entity: FeatureExportEntity.warehouse,
      label: 'Warehouse',
      onImported: _load,
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
                  'Stock by pack, inventory value, restock and sold history.',
            ),
            _buildDataSyncSection(),
            const SectionLabel(
              'Inventory',
              subtitle: 'Stock, active pack, and inventory value from catalog rates.',
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                UmkmSpace.md,
                0,
                UmkmSpace.md,
                UmkmSpace.sm,
              ),
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
                      const SizedBox(width: UmkmSpace.sm),
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
                  const SizedBox(height: UmkmSpace.sm),
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
                      const SizedBox(width: UmkmSpace.sm),
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
            const SizedBox(height: UmkmSpace.xxs),
            if (products.isEmpty)
              const EmptyHint(
                title: 'No inventory yet',
                message: 'Create products first, then restock here.',
              )
            else
              ...products.map((p) {
                final pack = getActivePack(p);
                final packsLabel = formatPacksOnHand(p.stockQty, pack);
                return EntityCard(
                  title: p.name,
                  chips: [
                    StatusChip(label: p.unit, tone: StatusTone.neutral),
                    StatusChip(
                      label: pack != null ? 'Pack ${pack.sizeLabel}' : 'No pack',
                      tone: pack != null ? StatusTone.brand : StatusTone.neutral,
                    ),
                    if (p.profitMarginPercent != null)
                      StatusChip(
                        label: '${p.profitMarginPercent}%',
                        tone: StatusTone.brand,
                      ),
                  ],
                  details: [
                    'Stock ${formatMoney(p.stockQty)} ${p.unit.toLowerCase()}',
                    if (packsLabel != null) 'Packs in stock · $packsLabel',
                  ],
                  metrics: [
                    ('Sell', formatMoney(p.potentialRevenue)),
                    (
                      'Cost',
                      p.potentialCost != null ? formatMoney(p.potentialCost!) : '—',
                    ),
                    (
                      'Profit',
                      p.potentialProfit != null
                          ? formatMoney(p.potentialProfit!)
                          : '—',
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
                );
              }),
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
              ...items.map((r) {
                final product = _productById(products, r.productId);
                final pack = product != null ? getActivePack(product) : null;
                final packsAdded = formatPacksOnHand(r.qtyAdded, pack);
                final packsBefore = formatPacksOnHand(r.stockBefore, pack);
                final packsAfter = formatPacksOnHand(r.stockAfter, pack);
                final u = (r.unitSnapshot ?? product?.unit ?? '').toLowerCase();
                return EntityCard(
                  title: r.productName ?? r.productId,
                  chips: [
                    StatusChip(
                      label: '+${formatCompactQty(r.qtyAdded)} $u',
                      tone: StatusTone.brand,
                    ),
                    if (pack != null)
                      StatusChip(
                        label: 'Pack ${pack.sizeLabel}',
                        tone: StatusTone.neutral,
                      ),
                  ],
                  details: [
                    if (r.restockDate.isNotEmpty) r.restockDate,
                    if (packsAdded != null) 'Added $packsAdded',
                    if (r.notes.isNotEmpty) r.notes,
                  ],
                  metrics: [
                    (
                      'Before',
                      packsBefore != null
                          ? '${formatCompactQty(r.stockBefore)} · $packsBefore'
                          : formatCompactQty(r.stockBefore),
                    ),
                    (
                      'After',
                      packsAfter != null
                          ? '${formatCompactQty(r.stockAfter)} · $packsAfter'
                          : formatCompactQty(r.stockAfter),
                    ),
                  ],
                  onTap: () => _openViewRestock(r),
                );
              }),
            const SectionLabel(
              'Sold history',
              subtitle:
                  'Review stock drawn by orders, including quantity before and after each sale.',
            ),
            if (sales.isEmpty)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('No sales recorded yet.'),
              )
            else
              ...sales.map((s) {
                final product = _productById(products, s.productId);
                final pack = product != null ? getActivePack(product) : null;
                final packsSold = formatPacksOnHand(s.qtySold, pack);
                final packsBefore = formatPacksOnHand(s.stockBefore, pack);
                final packsAfter = formatPacksOnHand(s.stockAfter, pack);
                final u = (s.unitSnapshot ?? product?.unit ?? '').toLowerCase();
                return EntityCard(
                  title: s.productName ?? s.productId,
                  chips: [
                    StatusChip(
                      label: '−${formatCompactQty(s.qtySold)} $u',
                      tone: StatusTone.danger,
                    ),
                    if (pack != null)
                      StatusChip(
                        label: 'Pack ${pack.sizeLabel}',
                        tone: StatusTone.neutral,
                      ),
                  ],
                  details: [
                    if (s.soldDate.isNotEmpty) s.soldDate,
                    if (packsSold != null) 'Sold $packsSold',
                    if (s.orderRef != null && s.orderRef!.isNotEmpty)
                      s.orderRef!,
                    else if (s.notes.isNotEmpty)
                      s.notes,
                  ],
                  metrics: [
                    (
                      'Before',
                      packsBefore != null
                          ? '${formatCompactQty(s.stockBefore)} · $packsBefore'
                          : formatCompactQty(s.stockBefore),
                    ),
                    (
                      'After',
                      packsAfter != null
                          ? '${formatCompactQty(s.stockAfter)} · $packsAfter'
                          : formatCompactQty(s.stockAfter),
                    ),
                  ],
                  onTap: () => _openViewSale(s),
                );
              }),
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
