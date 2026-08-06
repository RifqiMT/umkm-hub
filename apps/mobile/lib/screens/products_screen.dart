import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../filter_catalog.dart';
import '../format_money.dart';
import '../models/models.dart';
import '../format_id.dart';
import '../services/api_service.dart';
import '../services/product_packs.dart';
import '../theme/umkm_theme.dart';
import '../widgets/ui.dart';
import '../widgets/feature_data_transfer.dart';

String _formatPackMargin(double? margin) {
  if (margin == null) return '—';
  return '${margin.toStringAsFixed(1)}%';
}

List<Widget> _productEconomicsRows(ActivePack? pack) {
  if (pack == null) {
    return [
      const DetailRow(label: 'Active pack', value: 'No pack price set'),
    ];
  }
  final cost = pack.cost;
  final profit = cost != null ? pack.price - cost : null;
  final margin =
      profit != null && pack.price > 0 ? (profit / pack.price) * 100 : null;
  return [
    DetailRow(label: 'Active pack', value: pack.sizeLabel),
    DetailRow(label: 'Pack sell', value: formatMoney(pack.price)),
    DetailRow(
      label: 'Pack cost',
      value: cost != null ? formatMoney(cost) : '—',
    ),
    DetailRow(
      label: 'Pack profit',
      value: profit != null ? formatMoney(profit) : '—',
    ),
    DetailRow(label: 'Margin', value: _formatPackMargin(margin)),
  ];
}

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  List<Product> items = [];
  String? error;
  bool loading = true;
  bool _dataSyncOpen = false;

  final _searchCtrl = TextEditingController();
  Timer? _searchDebounce;
  String _search = '';
  List<String> _unitFilters = [];
  List<String> _costSetFilters = [];
  List<String> _packReadyFilters = [];
  List<String> _stockStatusFilters = [];

  bool get _filtersActive =>
      _search.trim().isNotEmpty ||
      _unitFilters.isNotEmpty ||
      _costSetFilters.isNotEmpty ||
      _packReadyFilters.isNotEmpty ||
      _stockStatusFilters.isNotEmpty;

  int get _filterActiveCount =>
      (_unitFilters.isNotEmpty ? 1 : 0) +
      (_costSetFilters.isNotEmpty ? 1 : 0) +
      (_packReadyFilters.isNotEmpty ? 1 : 0) +
      (_stockStatusFilters.isNotEmpty ? 1 : 0);

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    setState(() {}); // refresh clear icon
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 320), () {
      if (!mounted) return;
      setState(() => _search = value.trim());
      _load();
    });
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      items = await context.read<ApiService>().listProducts(
            search: _search.isEmpty ? null : _search,
            unit: _unitFilters,
            costSet: _costSetFilters,
            packReady: _packReadyFilters,
            stockStatus: _stockStatusFilters,
          );
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Widget _buildFilters() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        FilterSearchField(
          controller: _searchCtrl,
          onChanged: _onSearchChanged,
          hintText: 'Search by product name…',
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(
            UmkmSpace.md,
            0,
            UmkmSpace.md,
            UmkmSpace.sm,
          ),
          child: ExpandableFilters(
            activeCount: _filterActiveCount,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                MultiSelectChipGroup(
                  label: 'Unit',
                  selected: _unitFilters,
                  options: [
                    for (final o in productUnitOptions)
                      ChoiceOption(value: o.value, label: o.label),
                  ],
                  onChanged: (next) {
                    setState(() => _unitFilters = next);
                    _load();
                  },
                ),
                const SizedBox(height: UmkmSpace.sm),
                MultiSelectChipGroup(
                  label: 'Cost set',
                  selected: _costSetFilters,
                  options: [
                    for (final o in costSetOptions)
                      ChoiceOption(value: o.value, label: o.label),
                  ],
                  onChanged: (next) {
                    setState(() => _costSetFilters = next);
                    _load();
                  },
                ),
                const SizedBox(height: UmkmSpace.sm),
                MultiSelectChipGroup(
                  label: 'Pack ready',
                  selected: _packReadyFilters,
                  options: [
                    for (final o in packReadyOptions)
                      ChoiceOption(value: o.value, label: o.label),
                  ],
                  onChanged: (next) {
                    setState(() => _packReadyFilters = next);
                    _load();
                  },
                ),
                const SizedBox(height: UmkmSpace.sm),
                MultiSelectChipGroup(
                  label: 'Stock',
                  selected: _stockStatusFilters,
                  options: [
                    for (final o in stockStatusOptions)
                      ChoiceOption(value: o.value, label: o.label),
                  ],
                  onChanged: (next) {
                    setState(() => _stockStatusFilters = next);
                    _load();
                  },
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _openForm({Product? existing}) async {
    final nameCtrl = TextEditingController(text: existing?.name ?? '');
    final priceCtrl = TextEditingController(
      text: existing == null || (existing.pricePerUnit == 0)
          ? ''
          : existing.pricePerUnit.toString(),
    );
    final costCtrl =
        TextEditingController(text: existing?.costPerUnit?.toString() ?? '');
    final detailsCtrl = TextEditingController(text: existing?.details ?? '');
    final packPrice = TextEditingController();
    final packCost = TextEditingController();
    final customSize = TextEditingController();
    String unit = existing?.unit ?? 'PCS';
    String packSize = '100';

    if (existing != null && existing.unit != 'PCS') {
      const packSizes = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
      var matched = false;
      for (final size in packSizes) {
        final price = switch (size) {
          1 => existing.price1,
          5 => existing.price5,
          10 => existing.price10,
          25 => existing.price25,
          50 => existing.price50,
          100 => existing.price100,
          250 => existing.price250,
          500 => existing.price500,
          1000 => existing.price1000,
          _ => null,
        };
        if (price != null) {
          packSize = '$size';
          packPrice.text = price.toString();
          final cost = switch (size) {
            1 => existing.cost1,
            5 => existing.cost5,
            10 => existing.cost10,
            25 => existing.cost25,
            50 => existing.cost50,
            100 => existing.cost100,
            250 => existing.cost250,
            500 => existing.cost500,
            1000 => existing.cost1000,
            _ => null,
          };
          if (cost != null) packCost.text = cost.toString();
          matched = true;
          break;
        }
      }
      if (!matched && existing.priceCustom != null) {
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
                  OptionDropdown<String>(
                    labelText: 'Unit',
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
                    OptionDropdown<String>(
                      labelText: 'Pack size',
                      value: packSize,
                      onChanged: (v) =>
                          setLocal(() => packSize = v ?? packSize),
                      options: const [
                        ChoiceOption(value: '1', label: '1'),
                        ChoiceOption(value: '5', label: '5'),
                        ChoiceOption(value: '10', label: '10'),
                        ChoiceOption(value: '25', label: '25'),
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
      body['price1'] = null;
      body['price5'] = null;
      body['price10'] = null;
      body['price25'] = null;
      body['price50'] = null;
      body['price100'] = null;
      body['price250'] = null;
      body['price500'] = null;
      body['price1000'] = null;
      body['priceCustom'] = null;
      body['customSize'] = null;
      body['cost1'] = null;
      body['cost5'] = null;
      body['cost10'] = null;
      body['cost25'] = null;
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
    final pack = getActivePack(product);
    final action = await showAppViewSheet<String>(
      context: context,
      title: product.name,
      subtitle: 'Catalog pricing and warehouse stock snapshot.',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DetailRow(label: 'Product ID', value: product.displayId),
          DetailRow(label: 'Unit', value: product.unit),
          DetailRow(
            label: 'Stock',
            value: '${product.stockQty} ${product.unit.toLowerCase()}',
          ),
          ..._productEconomicsRows(pack),
          DetailRow(
            label: 'Details',
            value: product.details.isEmpty ? '—' : product.details,
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Tr('Close'),
        ),
        TextButton(
          onPressed: () => Navigator.pop(context, 'delete'),
          child: const Tr('Delete'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context, 'edit'),
          child: const Tr('Edit'),
        ),
      ],
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

  Widget _buildDataSyncSection() {
    return FeatureDataSyncSection(
      open: _dataSyncOpen,
      onToggle: () => setState(() => _dataSyncOpen = !_dataSyncOpen),
      entity: FeatureExportEntity.products,
      label: 'Products',
      onImported: _load,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (error != null && items.isEmpty && !loading) {
      return Column(
        children: [
          ErrorBanner(message: error!),
          TextButton(onPressed: _load, child: const Text('Retry')),
          _buildFilters(),
        ],
      );
    }
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: RefreshIndicator(
        onRefresh: _load,
        child: items.isEmpty
            ? ListView(
                children: [
                  PageIntro(
                    subtitle:
                        'Catalog items and pricing. Stock lives in Warehouse.',
                    metrics: [
                      ('SKUs', loading ? '…' : '0'),
                    ],
                  ),
                  _buildFilters(),
                  _buildDataSyncSection(),
                  if (loading)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else ...[
                    const SectionLabel(
                      'Catalog',
                      subtitle: 'Products in this workspace.',
                    ),
                    const SizedBox(height: 8),
                    EmptyHint(
                      title: _filtersActive ? 'No matches' : 'No products yet',
                      message: _filtersActive
                          ? 'Try clearing filters or search.'
                          : 'Tap + to add your first product.',
                    ),
                  ],
                ],
              )
            : ListView.builder(
                padding: listChromePadding(context),
                itemCount: items.length + 1,
                itemBuilder: (context, i) {
                  if (i == 0) {
                    final stocked = items.where((p) => p.stockQty > 0).length;
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        PageIntro(
                          subtitle:
                              'Catalog items and pricing. Stock lives in Warehouse.',
                          metrics: [
                            ('SKUs', '${items.length}'),
                            ('In stock', '$stocked'),
                          ],
                        ),
                        _buildFilters(),
                        _buildDataSyncSection(),
                        const SectionLabel(
                          'Catalog',
                          subtitle: 'Products in this workspace.',
                        ),
                      ],
                    );
                  }
                  final p = items[i - 1];
                  final pack = getActivePack(p);
                  return EntityCard(
                    title: p.name,
                    subtitle: p.unit,
                    details: [
                      p.productId.isNotEmpty
                          ? compactLiteralId(p.productId)
                          : entityIdLabel(p.id),
                      if (p.unit == 'PCS')
                        'Sell ${formatMoney(p.pricePerUnit)}'
                            '${p.costPerUnit != null ? ' · cost ${formatMoney(p.costPerUnit!)}' : ''}'
                      else if (pack != null)
                        'Pack ${pack.sizeLabel} · ${formatMoney(pack.price)}'
                            '${pack.cost != null ? ' · cost ${formatMoney(pack.cost!)}' : ''}'
                      else
                        'No pack price',
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
