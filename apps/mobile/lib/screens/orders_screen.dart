import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../filter_catalog.dart';
import '../models/models.dart';
import '../format_id.dart';
import '../format_money.dart';
import '../services/api_service.dart';
import '../services/order_math.dart';
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

String _defaultPaymentDueDate(String orderDate, {int days = 30}) {
  final day = orderDate.length >= 10 ? orderDate.substring(0, 10) : orderDate;
  final parsed = DateTime.tryParse('${day}T00:00:00.000');
  if (parsed == null) return day;
  final due = parsed.add(Duration(days: days));
  final m = due.month.toString().padLeft(2, '0');
  final d = due.day.toString().padLeft(2, '0');
  return '${due.year}-$m-$d';
}

bool _isPaymentOverdue(OrderItem order) {
  final due = order.paymentDueDate;
  if (due == null || due.isEmpty) return false;
  if (order.invoiceStatus == 'FULLY_PAID') return false;
  return due.substring(0, 10).compareTo(_todayDate()) < 0;
}

String _invoiceStatusLabel(String status) {
  switch (status) {
    case 'SENT':
      return 'Sent';
    case 'PARTIALLY_PAID':
      return 'Partially paid';
    case 'FULLY_PAID':
      return 'Fully paid';
    case 'CREATED':
    default:
      return 'Created';
  }
}

String _billStatusLabel(String status) {
  switch (status) {
    case 'SENT':
      return 'Sent';
    case 'CREATED':
    default:
      return 'Created';
  }
}

double _remainingFromInstallments(
  double total,
  Iterable<double> installmentAmounts,
) {
  final paid =
      installmentAmounts.fold<double>(0, (sum, amount) => sum + amount);
  return (total - paid).clamp(0, double.infinity);
}

class _InstallmentProgress {
  const _InstallmentProgress({
    required this.seq,
    required this.amount,
    required this.date,
    required this.remaining,
    required this.remainingPct,
  });

  final int seq;
  final double amount;
  final String date;
  final double remaining;
  final double remainingPct;
}

List<_InstallmentProgress> _installmentProgressRows({
  required double total,
  required List<OrderInstallment> installments,
}) {
  final ordered = [...installments]
    ..sort((a, b) => a.installmentDate.compareTo(b.installmentDate));
  var paid = 0.0;
  final rows = <_InstallmentProgress>[];
  for (var i = 0; i < ordered.length; i++) {
    paid += ordered[i].amount;
    final remaining = (total - paid).clamp(0.0, double.infinity);
    final remainingPct = total > 0 ? (remaining / total) * 100 : 0.0;
    rows.add(
      _InstallmentProgress(
        seq: i + 1,
        amount: ordered[i].amount,
        date: ordered[i].installmentDate.substring(0, 10),
        remaining: remaining,
        remainingPct: remainingPct,
      ),
    );
  }
  return rows;
}

class _InstallmentFormRow {
  _InstallmentFormRow({
    double amount = 0,
    double percent = 0,
    String date = '',
    this.entryMode = 'AMOUNT',
  })  : amountCtrl = TextEditingController(
          text: amount == 0 ? '' : amount.toString(),
        ),
        percentCtrl = TextEditingController(
          text: percent == 0 ? '' : percent.toString(),
        ),
        installmentDate = date.isNotEmpty ? date : _todayDate();

  final TextEditingController amountCtrl;
  final TextEditingController percentCtrl;
  String installmentDate;
  String entryMode;

  double get amount => double.tryParse(amountCtrl.text) ?? 0;
  double get percentValue => double.tryParse(percentCtrl.text) ?? 0;

  double resolvedAmount(double total) {
    if (entryMode == 'PERCENTAGE') {
      return ((percentValue * total) / 100);
    }
    return amount;
  }

  void dispose() {
    amountCtrl.dispose();
    percentCtrl.dispose();
  }
}

class _OrderLineFormRow {
  _OrderLineFormRow({
    required this.productId,
    required this.packKey,
    double packCount = 1,
  }) : packCountCtrl = TextEditingController(
          text: packCount == 0 ? '' : packCount.toString(),
        );

  String productId;
  String packKey;
  final TextEditingController packCountCtrl;

  double get packCount => double.tryParse(packCountCtrl.text) ?? 0;

  void dispose() {
    packCountCtrl.dispose();
  }
}

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<OrderItem> items = [];
  List<Product> products = [];
  OrderSummary? summary;
  String? error;
  bool loading = true;
  bool loadingMore = false;
  bool _dataSyncOpen = false;
  int page = 1;
  int totalOrders = 0;
  int totalPages = 1;

  final _searchCtrl = TextEditingController();
  Timer? _searchDebounce;
  String _search = '';
  List<String> _statusFilters = [];
  List<String> _paymentFilters = [];
  List<String> _billFilters = [];
  List<String> _invoiceFilters = [];
  String? _orderDateFrom;
  String? _orderDateTo;
  String? _shipmentDateFrom;
  String? _shipmentDateTo;
  String? _invoiceDateFrom;
  String? _invoiceDateTo;

  bool get hasMore => page < totalPages;

  bool get _filtersActive =>
      _search.trim().isNotEmpty ||
      _statusFilters.isNotEmpty ||
      _paymentFilters.isNotEmpty ||
      _billFilters.isNotEmpty ||
      _invoiceFilters.isNotEmpty ||
      (_orderDateFrom?.isNotEmpty ?? false) ||
      (_orderDateTo?.isNotEmpty ?? false) ||
      (_shipmentDateFrom?.isNotEmpty ?? false) ||
      (_shipmentDateTo?.isNotEmpty ?? false) ||
      (_invoiceDateFrom?.isNotEmpty ?? false) ||
      (_invoiceDateTo?.isNotEmpty ?? false);

  int get _filterActiveCount =>
      (_statusFilters.isNotEmpty ? 1 : 0) +
      (_paymentFilters.isNotEmpty ? 1 : 0) +
      (_billFilters.isNotEmpty ? 1 : 0) +
      (_invoiceFilters.isNotEmpty ? 1 : 0) +
      ((_orderDateFrom?.isNotEmpty ?? false) ||
              (_orderDateTo?.isNotEmpty ?? false)
          ? 1
          : 0) +
      ((_shipmentDateFrom?.isNotEmpty ?? false) ||
              (_shipmentDateTo?.isNotEmpty ?? false)
          ? 1
          : 0) +
      ((_invoiceDateFrom?.isNotEmpty ?? false) ||
              (_invoiceDateTo?.isNotEmpty ?? false)
          ? 1
          : 0);

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
    setState(() {});
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
      page = 1;
    });
    try {
      final api = context.read<ApiService>();
      final results = await Future.wait([
        api.listOrders(
          page: 1,
          search: _search.isEmpty ? null : _search,
          status: _statusFilters,
          paymentStatus: _paymentFilters,
          billStatus: _billFilters,
          invoiceStatus: _invoiceFilters,
          orderDateFrom: _orderDateFrom,
          orderDateTo: _orderDateTo,
          shipmentDateFrom: _shipmentDateFrom,
          shipmentDateTo: _shipmentDateTo,
          invoiceDateFrom: _invoiceDateFrom,
          invoiceDateTo: _invoiceDateTo,
        ),
        api.listProducts(),
        api.getOrderSummary(
          search: _search.isEmpty ? null : _search,
          status: _statusFilters,
          paymentStatus: _paymentFilters,
          billStatus: _billFilters,
          invoiceStatus: _invoiceFilters,
          orderDateFrom: _orderDateFrom,
          orderDateTo: _orderDateTo,
          shipmentDateFrom: _shipmentDateFrom,
          shipmentDateTo: _shipmentDateTo,
          invoiceDateFrom: _invoiceDateFrom,
          invoiceDateTo: _invoiceDateTo,
        ),
      ]);
      final orders = results[0] as PaginatedOrders;
      items = orders.items;
      page = orders.page;
      totalOrders = orders.total;
      totalPages = orders.totalPages;
      products = results[1] as List<Product>;
      summary = results[2] as OrderSummary;
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _loadMore() async {
    if (loadingMore || !hasMore) return;
    setState(() => loadingMore = true);
    try {
      final api = context.read<ApiService>();
      final next = await api.listOrders(
        page: page + 1,
        search: _search.isEmpty ? null : _search,
        status: _statusFilters,
        paymentStatus: _paymentFilters,
        billStatus: _billFilters,
        invoiceStatus: _invoiceFilters,
        orderDateFrom: _orderDateFrom,
        orderDateTo: _orderDateTo,
        shipmentDateFrom: _shipmentDateFrom,
        shipmentDateTo: _shipmentDateTo,
        invoiceDateFrom: _invoiceDateFrom,
        invoiceDateTo: _invoiceDateTo,
      );
      if (!mounted) return;
      setState(() {
        items = [...items, ...next.items];
        page = next.page;
        totalOrders = next.total;
        totalPages = next.totalPages;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not load more orders: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => loadingMore = false);
    }
  }

  Future<void> _pickFilterDate({
    required String? initial,
    required void Function(String) onPicked,
  }) async {
    final parts = (initial ?? '').split('-');
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
    );
    if (picked == null) return;
    final m = picked.month.toString().padLeft(2, '0');
    final d = picked.day.toString().padLeft(2, '0');
    onPicked('${picked.year}-$m-$d');
  }

  Widget _buildFilters() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        FilterSearchField(
          controller: _searchCtrl,
          onChanged: _onSearchChanged,
          hintText: 'Product, status, payment, date…',
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
                  label: 'Status',
                  selected: _statusFilters,
                  options: [
                    for (final o in orderStatusOptions)
                      ChoiceOption(value: o.value, label: o.label),
                  ],
                  onChanged: (next) {
                    setState(() => _statusFilters = next);
                    _load();
                  },
                ),
                const SizedBox(height: UmkmSpace.sm),
                MultiSelectChipGroup(
                  label: 'Payment',
                  selected: _paymentFilters,
                  options: [
                    for (final o in paymentStatusOptions)
                      ChoiceOption(value: o.value, label: o.label),
                  ],
                  onChanged: (next) {
                    setState(() => _paymentFilters = next);
                    _load();
                  },
                ),
                const SizedBox(height: UmkmSpace.sm),
                MultiSelectChipGroup(
                  label: 'Customer bill',
                  selected: _billFilters,
                  options: [
                    for (final o in billStatusOptions)
                      ChoiceOption(value: o.value, label: o.label),
                  ],
                  onChanged: (next) {
                    setState(() => _billFilters = next);
                    _load();
                  },
                ),
                const SizedBox(height: UmkmSpace.sm),
                MultiSelectChipGroup(
                  label: 'Collection',
                  selected: _invoiceFilters,
                  options: [
                    for (final o in invoiceStatusOptions)
                      ChoiceOption(value: o.value, label: o.label),
                  ],
                  onChanged: (next) {
                    setState(() => _invoiceFilters = next);
                    _load();
                  },
                ),
                const SizedBox(height: UmkmSpace.sm),
                DateRangeFilterField(
                  label: 'Order date',
                  from: _orderDateFrom,
                  to: _orderDateTo,
                  onPickFrom: () => _pickFilterDate(
                    initial: _orderDateFrom,
                    onPicked: (v) {
                      setState(() => _orderDateFrom = v);
                      _load();
                    },
                  ),
                  onPickTo: () => _pickFilterDate(
                    initial: _orderDateTo,
                    onPicked: (v) {
                      setState(() => _orderDateTo = v);
                      _load();
                    },
                  ),
                  onClear: () {
                    setState(() {
                      _orderDateFrom = null;
                      _orderDateTo = null;
                    });
                    _load();
                  },
                ),
                const SizedBox(height: UmkmSpace.sm),
                DateRangeFilterField(
                  label: 'Shipment date',
                  from: _shipmentDateFrom,
                  to: _shipmentDateTo,
                  onPickFrom: () => _pickFilterDate(
                    initial: _shipmentDateFrom,
                    onPicked: (v) {
                      setState(() => _shipmentDateFrom = v);
                      _load();
                    },
                  ),
                  onPickTo: () => _pickFilterDate(
                    initial: _shipmentDateTo,
                    onPicked: (v) {
                      setState(() => _shipmentDateTo = v);
                      _load();
                    },
                  ),
                  onClear: () {
                    setState(() {
                      _shipmentDateFrom = null;
                      _shipmentDateTo = null;
                    });
                    _load();
                  },
                ),
                const SizedBox(height: UmkmSpace.sm),
                DateRangeFilterField(
                  label: 'Invoice date',
                  from: _invoiceDateFrom,
                  to: _invoiceDateTo,
                  onPickFrom: () => _pickFilterDate(
                    initial: _invoiceDateFrom,
                    onPicked: (v) {
                      setState(() => _invoiceDateFrom = v);
                      _load();
                    },
                  ),
                  onPickTo: () => _pickFilterDate(
                    initial: _invoiceDateTo,
                    onPicked: (v) {
                      setState(() => _invoiceDateTo = v);
                      _load();
                    },
                  ),
                  onClear: () {
                    setState(() {
                      _invoiceDateFrom = null;
                      _invoiceDateTo = null;
                    });
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

  Future<void> _pickDate({
    required String label,
    required String initial,
    required void Function(String) onPicked,
    String? minDate,
  }) async {
    DateTime parse(String value) {
      final parts = value.split('-');
      return parts.length == 3
          ? DateTime(
              int.tryParse(parts[0]) ?? DateTime.now().year,
              int.tryParse(parts[1]) ?? DateTime.now().month,
              int.tryParse(parts[2]) ?? DateTime.now().day,
            )
          : DateTime.now();
    }

    final first = minDate != null ? parse(minDate) : AppTimeline.firstDate;
    var initialDate = parse(initial);
    if (initialDate.isBefore(first)) initialDate = first;
    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: first,
      lastDate: DateTime(2100),
      helpText: label,
    );
    if (picked != null) {
      final m = picked.month.toString().padLeft(2, '0');
      final d = picked.day.toString().padLeft(2, '0');
      onPicked('${picked.year}-$m-$d');
    }
  }

  void _cascadeInstallmentDates(
    List<_InstallmentFormRow> rows, {
    required int fromIndex,
  }) {
    for (var i = fromIndex < 1 ? 1 : fromIndex; i < rows.length; i++) {
      final minDate = rows[i - 1].installmentDate;
      if (rows[i].installmentDate.compareTo(minDate) < 0) {
        rows[i].installmentDate = minDate;
      }
    }
  }

  _OrderLineFormRow _newLineRow({
    String? productId,
    String? packKey,
    double packCount = 1,
    double? packSizeSnapshot,
  }) {
    final pid = productId ?? products.first.id;
    final product = products.firstWhere(
      (p) => p.id == pid,
      orElse: () => products.first,
    );
    final packs = listProductPacks(product);
    var key = packKey ?? (packs.isNotEmpty ? packs.first.key : '');
    if (packSizeSnapshot != null && packs.isNotEmpty) {
      final match = packs.where(
        (p) => (p.size - packSizeSnapshot).abs() < 0.0001,
      );
      if (match.isNotEmpty) key = match.first.key;
    }
    return _OrderLineFormRow(
      productId: product.id,
      packKey: key,
      packCount: packCount,
    );
  }

  OrderLineAmount? _lineAmountFor(_OrderLineFormRow row) {
    final product = products.cast<Product?>().firstWhere(
          (p) => p?.id == row.productId,
          orElse: () => null,
        );
    if (product == null) return null;
    final packs = listProductPacks(product);
    if (packs.isEmpty) return null;
    final packCount = row.packCount;
    if (packCount <= 0) return null;
    final pack = packs.cast<ProductPack?>().firstWhere(
          (p) => p?.key == row.packKey,
          orElse: () => packs.first,
        )!;
    final packSize = pack.size;
    final packPrice = pack.price;
    final stockQty = packSize * packCount;
    final unitPrice = packSize > 0 ? packPrice / packSize : 0.0;
    return OrderLineAmount(
      unitPrice: unitPrice.toDouble(),
      productQty: stockQty.toDouble(),
    );
  }

  Map<String, ({double available, double demand, bool ok})> _stockStatusFor(
    List<_OrderLineFormRow> lineRows, {
    OrderItem? existing,
  }) {
    final credit = <String, double>{};
    if (existing != null && existing.status != 'CANCELLED') {
      final prior = existing.lines.isNotEmpty ? existing.lines : null;
      if (prior != null) {
        for (final line in prior) {
          credit[line.productId] =
              (credit[line.productId] ?? 0) + line.productQty;
        }
      } else {
        credit[existing.productId] =
            (credit[existing.productId] ?? 0) + existing.productQty;
      }
    }

    final demand = <String, double>{};
    for (final row in lineRows) {
      final amount = _lineAmountFor(row);
      if (amount == null) continue;
      demand[row.productId] =
          (demand[row.productId] ?? 0) + amount.productQty;
    }

    final status = <String, ({double available, double demand, bool ok})>{};
    for (final entry in demand.entries) {
      final product = products.cast<Product?>().firstWhere(
            (p) => p?.id == entry.key,
            orElse: () => null,
          );
      if (product == null) continue;
      final available = product.stockQty + (credit[entry.key] ?? 0);
      status[entry.key] = (
        available: available,
        demand: entry.value,
        ok: entry.value <= available + 1e-9,
      );
    }
    return status;
  }

  Future<void> _openForm({OrderItem? existing}) async {
    if (products.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add a product before creating orders')),
      );
      return;
    }

    OrderItem? fullExisting = existing;
    if (existing != null) {
      try {
        fullExisting = await _fetchFullOrder(existing.id);
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not load order for edit: $e')),
        );
        return;
      }
      if (!mounted) return;
    }

    List<Customer> customers = const [];
    try {
      customers = await context.read<ApiService>().listCustomers();
    } catch (_) {
      customers = const [];
    }

    final sourceLines = fullExisting?.lines.isNotEmpty == true
        ? fullExisting!.lines
        : fullExisting != null
            ? [
                OrderLineItem(
                  productId: fullExisting.productId,
                  productName: fullExisting.productName,
                  packSizeSnapshot: fullExisting.packSizeSnapshot,
                  packPriceSnapshot: fullExisting.packPriceSnapshot,
                  packCount: fullExisting.packCount,
                  productQty: fullExisting.productQty,
                  lineTotal: fullExisting.lineTotal,
                  unit: fullExisting.unitSnapshot,
                ),
              ]
            : <OrderLineItem>[];

    final lineRows = sourceLines.isNotEmpty
        ? sourceLines
            .map(
              (line) => _newLineRow(
                productId: line.productId,
                packSizeSnapshot: line.packSizeSnapshot,
                packCount: line.packCount ?? 1,
              ),
            )
            .toList()
        : [_newLineRow()];

    String orderDate = (fullExisting?.orderDate.isNotEmpty == true)
        ? fullExisting!.orderDate.substring(0, 10)
        : _todayDate();
    String shipmentDate = fullExisting?.shipmentDate?.substring(0, 10) ?? '';
    String? customerId = fullExisting?.customerId;
    String status = fullExisting?.status ?? 'PENDING';
    String discountType = fullExisting?.discountType ?? 'PERCENTAGE';
    final discountSeed = fullExisting?.discountValue ?? 0;
    final discountCtrl = TextEditingController(
      text: discountSeed == 0 ? '' : discountSeed.toString(),
    );
    String payment = fullExisting?.paymentStatus ?? 'CASH';
    String billStatus = fullExisting?.billStatus ?? 'CREATED';
    String billDate =
        fullExisting?.billDate?.substring(0, 10) ?? _todayDate();
    String invoiceDate =
        fullExisting?.invoiceDate?.substring(0, 10) ?? _todayDate();
    String paymentDueDate = fullExisting?.paymentDueDate ?? '';
    final installmentRows = (fullExisting?.installments ?? [])
        .map(
          (row) => _InstallmentFormRow(
            amount: row.amount,
            date: row.installmentDate.substring(0, 10),
          ),
        )
        .toList();
    _cascadeInstallmentDates(installmentRows, fromIndex: 0);

    final saved = await showAppFormSheet<bool>(
      context: context,
      title: fullExisting == null ? 'Create order' : 'Modify order',
      body: (context, setLocal) {
        final amounts = <OrderLineAmount>[];
        for (final row in lineRows) {
          final amount = _lineAmountFor(row);
          if (amount != null) {
            amounts.add(amount);
          }
        }
        final discount = double.tryParse(discountCtrl.text) ?? 0;
        final totals = amounts.isEmpty
            ? const OrderTotals(lineTotal: 0, totalOrderValue: 0)
            : calculateMultiLineOrderTotals(
                lines: amounts,
                discountType: discountType,
                discountValue: discount,
              );
        final total = totals.totalOrderValue;
        final paid = installmentRows.fold<double>(
          0,
          (sum, row) => sum + row.resolvedAmount(total),
        );
        final remaining = _remainingFromInstallments(
          total,
          installmentRows.map((row) => row.resolvedAmount(total)),
        );
        final stockStatus = _stockStatusFor(lineRows, existing: fullExisting);
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
              decoration: BoxDecoration(
                color: UmkmColors.brandSoft.withOpacity(0.45),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: UmkmColors.brand.withOpacity(0.25),
                ),
              ),
              child: Builder(
                builder: (context) {
                  // On create with no payments yet, Paid/Remaining only repeat Total.
                  final showCollection = fullExisting != null ||
                      installmentRows.isNotEmpty ||
                      paid > 0;
                  return Row(
                    children: [
                      Expanded(
                        child: _OrderSummaryCell(
                          label: 'Total',
                          value: formatMoney(total),
                        ),
                      ),
                      if (showCollection) ...[
                        Expanded(
                          child: _OrderSummaryCell(
                            label: 'Paid',
                            value: formatMoney(paid),
                          ),
                        ),
                        Expanded(
                          child: _OrderSummaryCell(
                            label: 'Remaining',
                            value: formatMoney(remaining),
                            emphasize: true,
                          ),
                        ),
                      ],
                    ],
                  );
                },
              ),
            ),
            const SizedBox(height: 12),
            FormSection(
              title: 'Products',
              child: Column(
                children: [
                  for (var i = 0; i < lineRows.length; i++)
                    () {
                      final row = lineRows[i];
                      final product = products.firstWhere(
                        (p) => p.id == row.productId,
                        orElse: () => products.first,
                      );
                      final packs = listProductPacks(product);
                      final pack = packs.cast<ProductPack?>().firstWhere(
                            (p) => p?.key == row.packKey,
                            orElse: () => packs.isEmpty ? null : packs.first,
                          );
                      final packPrice = pack?.price ?? 0;
                      final packSize = pack?.size ?? 1;
                      final showSizePicker =
                          product.unit != 'PCS' && packs.length > 1;
                      final unitSuffix = product.unit == 'PCS'
                          ? ''
                          : product.unit == 'LITER'
                              ? 'L'
                              : 'g';
                      final stock = stockStatus[product.id];
                      final stockShort = stock != null && !stock.ok;
                      final maxPacks = pack != null &&
                              pack.size > 0 &&
                              stock != null
                          ? (stock.available / pack.size).floor()
                          : null;
                      final stockAvailable =
                          stock?.available ?? product.stockQty;
                      final sheetNarrow =
                          MediaQuery.sizeOf(context).width < 400;
                      Widget qtyAmount({bool fullWidth = false}) {
                        final field = TextField(
                          controller: row.packCountCtrl,
                          keyboardType: TextInputType.number,
                          textAlign: TextAlign.center,
                          decoration: InputDecoration(
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 10,
                            ),
                            enabledBorder: stockShort
                                ? OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    borderSide: const BorderSide(
                                      color: UmkmColors.danger,
                                    ),
                                  )
                                : null,
                            focusedBorder: stockShort
                                ? OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    borderSide: const BorderSide(
                                      color: UmkmColors.danger,
                                      width: 1.4,
                                    ),
                                  )
                                : null,
                          ),
                          onChanged: (_) => setLocal(() {}),
                        );
                        final amount = Text(
                          formatMoney(packPrice * row.packCount),
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                            color: UmkmColors.brandDeep,
                          ),
                        );
                        return Row(
                          children: [
                            const Text(
                              'QTY',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 10,
                                letterSpacing: 0.6,
                                color: UmkmColors.muted,
                              ),
                            ),
                            const SizedBox(width: 8),
                            if (fullWidth)
                              Expanded(child: field)
                            else
                              SizedBox(width: 88, child: field),
                            const SizedBox(width: 10),
                            if (fullWidth)
                              amount
                            else
                              Flexible(child: amount),
                          ],
                        );
                      }
                      Widget productMeta({bool warn = false}) {
                        if (packs.isEmpty || warn) {
                          return const Text(
                            'No pack prices on this product.',
                            style: TextStyle(
                              color: UmkmColors.danger,
                              fontSize: 12,
                            ),
                          );
                        }
                        final facts =
                            <({String label, String value, String? unit, bool price})>[
                          if (product.unit != 'PCS')
                            (
                              label: 'Pack',
                              value:
                                  '${packSize % 1 == 0 ? packSize.toStringAsFixed(0) : packSize.toStringAsFixed(2)}$unitSuffix',
                              unit: null,
                              price: false,
                            ),
                          (
                            label: 'Price',
                            value: formatMoney(packPrice),
                            unit: 'each',
                            price: true,
                          ),
                          (
                            label: 'Stock',
                            value:
                                '${stockAvailable % 1 == 0 ? stockAvailable.toStringAsFixed(0) : stockAvailable.toStringAsFixed(2)}',
                            unit: unitSuffix.isEmpty ? null : unitSuffix,
                            price: false,
                          ),
                        ];
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                for (var f = 0; f < facts.length; f++) ...[
                                  if (f > 0)
                                    Container(
                                      width: 1,
                                      height: 30,
                                      margin: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                      ),
                                      color: UmkmColors.line.withOpacity(0.7),
                                    ),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          facts[f].label.toUpperCase(),
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w700,
                                            letterSpacing: 0.8,
                                            color:
                                                facts[f].label == 'Stock' &&
                                                        stockShort
                                                    ? UmkmColors.danger
                                                    : UmkmColors.muted,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text.rich(
                                          TextSpan(
                                            text: facts[f].value,
                                            style: TextStyle(
                                              fontSize: 13,
                                              fontWeight: facts[f].price
                                                  ? FontWeight.w700
                                                  : FontWeight.w600,
                                              color: facts[f].price
                                                  ? UmkmColors.brandDeep
                                                  : (facts[f].label ==
                                                              'Stock' &&
                                                          stockShort
                                                      ? UmkmColors.danger
                                                      : UmkmColors.ink),
                                            ),
                                            children: facts[f].unit == null
                                                ? null
                                                : [
                                                    TextSpan(
                                                      text:
                                                          ' ${facts[f].unit}',
                                                      style: TextStyle(
                                                        fontWeight:
                                                            FontWeight.w500,
                                                        color: stockShort &&
                                                                facts[f]
                                                                        .label ==
                                                                    'Stock'
                                                            ? UmkmColors.danger
                                                            : UmkmColors.muted,
                                                        fontSize: 12,
                                                      ),
                                                    ),
                                                  ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            if (stockShort && stock != null) ...[
                              const SizedBox(height: 6),
                              Text(
                                'Not enough stock — need ${stock.demand % 1 == 0 ? stock.demand.toStringAsFixed(0) : stock.demand.toStringAsFixed(2)}$unitSuffix but only ${stock.available % 1 == 0 ? stock.available.toStringAsFixed(0) : stock.available.toStringAsFixed(2)}$unitSuffix available${maxPacks != null ? ' (max qty $maxPacks)' : ''}.',
                                style: const TextStyle(
                                  color: UmkmColors.danger,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  height: 1.35,
                                ),
                              ),
                            ],
                          ],
                        );
                      }
                      return Container(
                        margin: EdgeInsets.only(
                          bottom: i == lineRows.length - 1 ? 0 : 8,
                        ),
                        padding: EdgeInsets.symmetric(
                          vertical: 8,
                          horizontal: stockShort ? 8 : 0,
                        ),
                        decoration: BoxDecoration(
                          color: stockShort
                              ? UmkmColors.danger.withOpacity(0.06)
                              : null,
                          borderRadius: stockShort
                              ? BorderRadius.circular(10)
                              : null,
                          border: stockShort
                              ? Border.all(
                                  color: UmkmColors.danger.withOpacity(0.35),
                                )
                              : (i == lineRows.length - 1
                                  ? null
                                  : Border(
                                      bottom: BorderSide(
                                        color: UmkmColors.line.withOpacity(0.55),
                                      ),
                                    )),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Padding(
                                  padding: const EdgeInsets.only(top: 8),
                                  child: Container(
                                    width: 24,
                                    height: 24,
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      color: UmkmColors.brandSoft,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      '${i + 1}',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 11,
                                        color: UmkmColors.brandDeep,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: DropdownButtonFormField<String>(
                                    value: products.any(
                                      (p) => p.id == row.productId,
                                    )
                                        ? row.productId
                                        : products.first.id,
                                    items: products
                                        .map(
                                          (p) => DropdownMenuItem(
                                            value: p.id,
                                            child: Text(p.name),
                                          ),
                                        )
                                        .toList(),
                                    onChanged: (v) => setLocal(() {
                                      row.productId = v ?? row.productId;
                                      final next = products.firstWhere(
                                        (p) => p.id == row.productId,
                                      );
                                      final nextPacks =
                                          listProductPacks(next);
                                      row.packKey = nextPacks.isNotEmpty
                                          ? nextPacks.first.key
                                          : '';
                                      row.packCountCtrl.text = '1';
                                    }),
                                    decoration: const InputDecoration(
                                      border: InputBorder.none,
                                      isDense: true,
                                      contentPadding: EdgeInsets.symmetric(
                                        vertical: 8,
                                      ),
                                    ),
                                    isExpanded: true,
                                  ),
                                ),
                                if (packs.isNotEmpty &&
                                    !showSizePicker &&
                                    !sheetNarrow) ...[
                                  const SizedBox(width: 8),
                                  Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: qtyAmount(),
                                  ),
                                ],
                                if (lineRows.length > 1)
                                  IconButton(
                                    icon: const Icon(
                                      Icons.delete_outline,
                                      size: 20,
                                    ),
                                    color: UmkmColors.danger,
                                    tooltip: 'Remove product',
                                    visualDensity: VisualDensity.compact,
                                    onPressed: () => setLocal(() {
                                      lineRows[i].dispose();
                                      lineRows.removeAt(i);
                                    }),
                                  ),
                              ],
                            ),
                            if (packs.isNotEmpty &&
                                !showSizePicker &&
                                sheetNarrow) ...[
                              const SizedBox(height: 8),
                              qtyAmount(fullWidth: true),
                            ],
                            if (showSizePicker && packs.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              if (sheetNarrow)
                                Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    Wrap(
                                      spacing: 6,
                                      runSpacing: 6,
                                      children: [
                                        for (final p in packs)
                                          ChoiceChip(
                                            label: Text(
                                              '${p.size % 1 == 0 ? p.size.toStringAsFixed(0) : p.size.toStringAsFixed(2)}$unitSuffix',
                                            ),
                                            selected: row.packKey == p.key,
                                            onSelected: (_) => setLocal(
                                              () => row.packKey = p.key,
                                            ),
                                            visualDensity:
                                                VisualDensity.compact,
                                          ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    qtyAmount(fullWidth: true),
                                  ],
                                )
                              else
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(
                                      child: Wrap(
                                        spacing: 6,
                                        runSpacing: 6,
                                        children: [
                                          for (final p in packs)
                                            ChoiceChip(
                                              label: Text(
                                                '${p.size % 1 == 0 ? p.size.toStringAsFixed(0) : p.size.toStringAsFixed(2)}$unitSuffix',
                                              ),
                                              selected: row.packKey == p.key,
                                              onSelected: (_) => setLocal(
                                                () => row.packKey = p.key,
                                              ),
                                              visualDensity:
                                                  VisualDensity.compact,
                                            ),
                                        ],
                                      ),
                                    ),
                                    qtyAmount(),
                                  ],
                                ),
                            ],
                            const SizedBox(height: 8),
                            Padding(
                              padding: const EdgeInsets.only(left: 32),
                              child: productMeta(warn: packs.isEmpty),
                            ),
                          ],
                        ),
                      );
                    }(),
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton.icon(
                      onPressed: () => setLocal(() {
                        lineRows.add(_newLineRow());
                      }),
                      icon: const Icon(Icons.add, size: 18),
                      label: const Text('Add product'),
                    ),
                  ),
                ],
              ),
            ),
            FormSection(
              title: 'Fulfillment',
              child: Column(
                children: [
                  DropdownButtonFormField<String?>(
                    value: customerId,
                    decoration: const InputDecoration(labelText: 'Customer'),
                    items: [
                      const DropdownMenuItem<String?>(
                        value: null,
                        child: Text('No customer'),
                      ),
                      ...customers.map(
                        (c) => DropdownMenuItem<String?>(
                          value: c.id,
                          child: Text(
                            c.companyName.isNotEmpty
                                ? '${c.name} · ${c.companyName}'
                                : c.name,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ),
                    ],
                    onChanged: (v) => setLocal(() => customerId = v),
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Order date'),
                    subtitle: Text(orderDate),
                    trailing: const Icon(Icons.calendar_today),
                    onTap: () => _pickDate(
                      label: 'Order date',
                      initial: orderDate,
                      onPicked: (v) => setLocal(() => orderDate = v),
                    ),
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Shipment date'),
                    subtitle: Text(
                        shipmentDate.isEmpty ? 'Optional' : shipmentDate),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (shipmentDate.isNotEmpty)
                          IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () =>
                                setLocal(() => shipmentDate = ''),
                          ),
                        const Icon(Icons.calendar_today),
                      ],
                    ),
                    onTap: () => _pickDate(
                      label: 'Shipment date',
                      initial:
                          shipmentDate.isEmpty ? orderDate : shipmentDate,
                      onPicked: (v) => setLocal(() => shipmentDate = v),
                    ),
                  ),
                  const SizedBox(height: 8),
                  OptionDropdown<String>(
                    labelText: 'Status',
                    value: status,
                    onChanged: (v) => setLocal(() => status = v ?? status),
                    options: const [
                      ChoiceOption(value: 'PENDING', label: 'Pending'),
                      ChoiceOption(value: 'CONFIRMED', label: 'Confirmed'),
                      ChoiceOption(value: 'SHIPPED', label: 'Shipped'),
                      ChoiceOption(value: 'DELIVERED', label: 'Delivered'),
                      ChoiceOption(value: 'CANCELLED', label: 'Cancelled'),
                    ],
                  ),
                ],
              ),
            ),
            FormSection(
              title: 'Pricing',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  OptionDropdown<String>(
                    labelText: 'Discount type',
                    value: discountType,
                    onChanged: (v) =>
                        setLocal(() => discountType = v ?? discountType),
                    options: const [
                      ChoiceOption(value: 'PERCENTAGE', label: 'Percentage'),
                      ChoiceOption(value: 'AMOUNT', label: 'Amount'),
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: discountCtrl,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: discountType == 'PERCENTAGE'
                          ? 'Discount %'
                          : 'Discount amount',
                    ),
                    onChanged: (_) => setLocal(() {}),
                  ),
                  const SizedBox(height: 12),
                  OptionDropdown<String>(
                    labelText: 'Payment mode',
                    value: payment,
                    onChanged: (v) => setLocal(() {
                      payment = v ?? payment;
                      if (payment == 'DELAYED_PAYMENT' &&
                          paymentDueDate.isEmpty) {
                        paymentDueDate = _defaultPaymentDueDate(orderDate);
                      } else if (payment != 'DELAYED_PAYMENT') {
                        paymentDueDate = '';
                      }
                    }),
                    options: const [
                      ChoiceOption(value: 'CASH', label: 'Cash'),
                      ChoiceOption(
                        value: 'CONSIGNMENT',
                        label: 'Consignment',
                      ),
                      ChoiceOption(
                        value: 'DELAYED_PAYMENT',
                        label: 'Delayed payment',
                      ),
                    ],
                  ),
                  if (payment == 'DELAYED_PAYMENT') ...[
                    const SizedBox(height: 8),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Payment due date'),
                      subtitle: Text(
                        paymentDueDate.isEmpty ? 'Required' : paymentDueDate,
                      ),
                      trailing: const Icon(Icons.calendar_today),
                      onTap: () => _pickDate(
                        label: 'Payment due date',
                        initial: paymentDueDate.isEmpty
                            ? _defaultPaymentDueDate(orderDate)
                            : paymentDueDate,
                        onPicked: (v) =>
                            setLocal(() => paymentDueDate = v),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            FormSection(
              title: 'Bill, invoice & payments',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  OptionDropdown<String>(
                    labelText: 'Bill status',
                    value: billStatus,
                    onChanged: (v) =>
                        setLocal(() => billStatus = v ?? billStatus),
                    options: const [
                      ChoiceOption(value: 'CREATED', label: 'Created'),
                      ChoiceOption(value: 'SENT', label: 'Sent'),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Bill date'),
                    subtitle: Text(billDate),
                    trailing: const Icon(Icons.calendar_today),
                    onTap: () => _pickDate(
                      label: 'Bill date',
                      initial: billDate,
                      onPicked: (v) => setLocal(() => billDate = v),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Invoice status',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: UmkmColors.muted,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _invoiceStatusLabel(
                      deriveInvoiceStatusFromPayments(
                        amountDue: total,
                        paidAmount: paid,
                        billStatus: billStatus,
                      ),
                    ),
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    'Derived from installments and bill status on save.',
                    style: TextStyle(
                      fontSize: 12,
                      color: UmkmColors.muted.withOpacity(0.9),
                    ),
                  ),
                  const SizedBox(height: 8),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Invoice date'),
                    subtitle: Text(invoiceDate),
                    trailing: const Icon(Icons.calendar_today),
                    onTap: () => _pickDate(
                      label: 'Invoice date',
                      initial: invoiceDate,
                      onPicked: (v) => setLocal(() => invoiceDate = v),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Expanded(
                        child: Text(
                          'Installments',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                      TextButton.icon(
                        onPressed: () => setLocal(() {
                          final last = installmentRows.isEmpty
                              ? null
                              : installmentRows.last.installmentDate;
                          final today = _todayDate();
                          final date = last == null
                              ? today
                              : (today.compareTo(last) > 0 ? today : last);
                          installmentRows.add(_InstallmentFormRow(date: date));
                        }),
                        icon: const Icon(Icons.add, size: 18),
                        label: const Text('Add'),
                      ),
                    ],
                  ),
                  if (installmentRows.isEmpty)
                    const Text(
                      'No payments yet. Remaining equals the order total.',
                      style: TextStyle(color: UmkmColors.muted),
                    ),
                  for (var i = 0; i < installmentRows.length; i++)
                    () {
                      final row = installmentRows[i];
                      final isPct = row.entryMode == 'PERCENTAGE';
                      final resolved = row.resolvedAmount(total);
                      final paidBefore = installmentRows
                          .take(i)
                          .fold<double>(
                            0,
                            (sum, r) => sum + r.resolvedAmount(total),
                          );
                      final paidAfter = paidBefore + resolved;
                      final remaining =
                          (total - paidAfter).clamp(0.0, double.infinity);
                      final remainingPct =
                          total > 0 ? (remaining / total) * 100 : 0.0;
                      final sharePct =
                          total > 0 ? (resolved / total) * 100 : 0.0;
                      final paidPct = total > 0
                          ? (paidAfter / total).clamp(0.0, 1.0)
                          : 0.0;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.fromLTRB(12, 12, 10, 12),
                        decoration: BoxDecoration(
                          color: UmkmColors.surface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: UmkmColors.line.withOpacity(0.9),
                          ),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x0814241E),
                              blurRadius: 10,
                              offset: Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 30,
                                  height: 30,
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: UmkmColors.brandSoft,
                                    borderRadius: BorderRadius.circular(9),
                                  ),
                                  child: Text(
                                    '${i + 1}',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      color: UmkmColors.brandDeep,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Payment ${i + 1}',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                          color: UmkmColors.brandDeep,
                                        ),
                                      ),
                                      Text(
                                        isPct
                                            ? 'Percent of total'
                                            : 'Fixed amount',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: UmkmColors.muted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.close, size: 20),
                                  color: UmkmColors.muted,
                                  onPressed: () => setLocal(() {
                                    installmentRows[i].dispose();
                                    installmentRows.removeAt(i);
                                  }),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            ChoiceChipGroup<String>(
                              value: row.entryMode,
                              onChanged: (mode) => setLocal(() {
                                if (mode == null) return;
                                if (mode == 'PERCENTAGE') {
                                  final pct = total > 0
                                      ? (row.amount / total) * 100
                                      : row.percentValue;
                                  row.percentCtrl.text = pct == 0
                                      ? ''
                                      : pct.toStringAsFixed(2);
                                } else {
                                  final amt = row.resolvedAmount(total);
                                  row.amountCtrl.text = amt == 0
                                      ? ''
                                      : amt.toStringAsFixed(2);
                                }
                                row.entryMode = mode;
                              }),
                              options: const [
                                ChoiceOption(
                                  value: 'AMOUNT',
                                  label: 'Amount',
                                ),
                                ChoiceOption(
                                  value: 'PERCENTAGE',
                                  label: 'Percent',
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            TextField(
                              controller: isPct
                                  ? row.percentCtrl
                                  : row.amountCtrl,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                decimal: true,
                              ),
                              decoration: InputDecoration(
                                labelText:
                                    isPct ? 'Percent of total' : 'Amount',
                                suffixText: isPct ? '%' : null,
                              ),
                              onChanged: (_) => setLocal(() {}),
                            ),
                            const SizedBox(height: 8),
                            Material(
                              color: const Color(0xFFF3F6F4),
                              borderRadius: BorderRadius.circular(12),
                              child: ListTile(
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  side: BorderSide(
                                    color: UmkmColors.line.withOpacity(0.85),
                                  ),
                                ),
                                title: const Text(
                                  'Date',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: UmkmColors.muted,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                subtitle: Text(
                                  row.installmentDate,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: UmkmColors.ink,
                                  ),
                                ),
                                trailing: const Icon(Icons.calendar_today),
                                onTap: () => _pickDate(
                                  label: 'Installment date',
                                  initial: row.installmentDate,
                                  minDate: i > 0
                                      ? installmentRows[i - 1]
                                          .installmentDate
                                      : null,
                                  onPicked: (v) => setLocal(() {
                                    row.installmentDate = v;
                                    _cascadeInstallmentDates(
                                      installmentRows,
                                      fromIndex: i,
                                    );
                                  }),
                                ),
                              ),
                            ),
                            if (resolved > 0) ...[
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'PAYS',
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w700,
                                            letterSpacing: 0.06,
                                            color: UmkmColors.muted,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '${formatMoney(resolved)}  ${sharePct.toStringAsFixed(1)}%',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                            color: UmkmColors.brandDeep,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'LEFT',
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w700,
                                            letterSpacing: 0.06,
                                            color: UmkmColors.muted,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '${formatMoney(remaining)}  ${remainingPct.toStringAsFixed(1)}%',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                            color: UmkmColors.brandDeep,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(99),
                                child: LinearProgressIndicator(
                                  value: paidPct,
                                  minHeight: 6,
                                  backgroundColor:
                                      UmkmColors.line.withOpacity(0.45),
                                  color: UmkmColors.brand,
                                ),
                              ),
                            ],
                          ],
                        ),
                      );
                    }(),
                ],
              ),
            ),
          ],
        );
      },
      actions: (context, setLocal) {
        final canSave = lineRows.isNotEmpty &&
            lineRows.every((row) => _lineAmountFor(row) != null) &&
            !_stockStatusFor(lineRows, existing: fullExisting)
                .values
                .any((s) => !s.ok);
        return [
          OutlinedButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: canSave ? () => Navigator.pop(context, true) : null,
            child: const Text('Save'),
          ),
        ];
      },
    );

    if (saved != true || !mounted) {
      for (final row in installmentRows) {
        row.dispose();
      }
      for (final row in lineRows) {
        row.dispose();
      }
      discountCtrl.dispose();
      return;
    }

    final stockStatus = _stockStatusFor(lineRows, existing: fullExisting);
    if (stockStatus.values.any((s) => !s.ok)) {
      for (final row in installmentRows) {
        row.dispose();
      }
      for (final row in lineRows) {
        row.dispose();
      }
      discountCtrl.dispose();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Not enough stock for one or more products. Reduce quantity on the highlighted rows.',
            ),
          ),
        );
      }
      return;
    }

    final amounts = <OrderLineAmount>[];
    final linesPayload = <Map<String, dynamic>>[];
    for (final row in lineRows) {
      final amount = _lineAmountFor(row);
      if (amount == null) {
        for (final r in installmentRows) {
          r.dispose();
        }
        for (final r in lineRows) {
          r.dispose();
        }
        discountCtrl.dispose();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Each line needs a valid product pack')),
          );
        }
        return;
      }
      amounts.add(amount);
      final product = products.firstWhere((p) => p.id == row.productId);
      final packs = listProductPacks(product);
      final pack = packs.firstWhere(
        (p) => p.key == row.packKey,
        orElse: () => packs.first,
      );
      linesPayload.add({
        'productId': row.productId,
        if (product.unit != 'PCS') 'packSize': pack.size,
        'packCount': row.packCount,
      });
    }

    final discountValue = double.tryParse(discountCtrl.text) ?? 0;
    final totals = calculateMultiLineOrderTotals(
      lines: amounts,
      discountType: discountType,
      discountValue: discountValue,
    );
    final total = totals.totalOrderValue;
    final installmentsPayload = installmentRows
        .map(
          (row) => {
            'amount': row.resolvedAmount(total),
            'installmentDate': row.installmentDate,
          },
        )
        .where(
          (row) =>
              (row['amount'] as double) > 0 &&
              (row['installmentDate'] as String).isNotEmpty,
        )
        .toList();

    for (final row in installmentRows) {
      row.dispose();
    }
    for (final row in lineRows) {
      row.dispose();
    }
    discountCtrl.dispose();

    final body = {
      'lines': linesPayload,
      'customerId': customerId,
      'orderDate': orderDate,
      'shipmentDate': shipmentDate.isEmpty ? null : shipmentDate,
      'status': status,
      'discountType': discountType,
      'discountValue': discountValue,
      'paymentStatus': payment,
      'billStatus': billStatus,
      'billDate': billDate,
      'invoiceDate': invoiceDate,
      if (payment == 'DELAYED_PAYMENT' && paymentDueDate.isNotEmpty)
        'paymentDueDate': paymentDueDate,
      'installments': installmentsPayload,
    };

    try {
      final api = context.read<ApiService>();
      if (fullExisting == null) {
        await api.request('POST', '/orders', body: body);
      } else {
        await api.request('PATCH', '/orders/${fullExisting.id}', body: body);
      }
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<OrderItem> _fetchFullOrder(String id) async {
    final raw = await context.read<ApiService>().request(
          'GET',
          '/orders/$id',
        );
    return OrderItem.fromJson(raw as Map<String, dynamic>);
  }

  Future<void> _openView(OrderItem listed) async {
    OrderItem order = listed;
    try {
      order = await _fetchFullOrder(listed.id);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not load order details: $e')),
      );
      return;
    }
    if (!mounted) return;

    final due = order.invoiceAmountDue;
    final paidPct = due > 0
        ? (order.paidAmount / due).clamp(0.0, 1.0)
        : 0.0;
    final action = await showAppViewSheet<String>(
      context: context,
      title: order.productName ?? order.productId,
      subtitle: 'Fulfillment, invoice, and payment progress for this order.',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    StatusChip(label: order.status, tone: StatusTone.brand),
                    StatusChip(label: order.paymentStatus),
                    StatusChip(
                      label: 'Bill · ${_billStatusLabel(order.billStatus)}',
                    ),
                    StatusChip(
                      label:
                          'Invoice · ${_invoiceStatusLabel(order.invoiceStatus)}',
                    ),
                    if (order.lineCount > 1)
                      StatusChip(
                        label: '+${order.lineCount - 1} more',
                        tone: StatusTone.neutral,
                      ),
                    if (_isPaymentOverdue(order))
                      const StatusChip(
                        label: 'Payment overdue',
                        tone: StatusTone.danger,
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                MetricTile(
                  label: 'Remaining to pay',
                  value: formatMoney(order.remainingAmount),
                ),
                const SizedBox(height: 10),
                Text(
                  '${(paidPct * 100).toStringAsFixed(0)}% paid · ${formatMoney(order.paidAmount)} of ${formatMoney(due)}',
                  style: const TextStyle(
                    color: UmkmColors.muted,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: paidPct,
                    minHeight: 8,
                    backgroundColor: UmkmColors.line.withOpacity(0.5),
                    color: UmkmColors.brand,
                  ),
                ),
                const SizedBox(height: 16),
                DetailRow(label: 'Order ID', value: order.displayId),
                if (order.customerName != null &&
                    order.customerName!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  const Text(
                    'Customer',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 6),
                  DetailRow(label: 'Name', value: order.customerName!),
                  DetailRow(
                    label: 'Company',
                    value: order.customerCompany?.isNotEmpty == true
                        ? order.customerCompany!
                        : '—',
                  ),
                ],
                const SizedBox(height: 8),
                const Text(
                  'Products',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                for (var i = 0; i < order.lines.length; i++)
                  () {
                    final line = order.lines[i];
                    final name = line.productName ?? line.productId;
                    final packSize = line.packSizeSnapshot;
                    final packCount = line.packCount ?? 1;
                    final packLabel = packSize == null
                        ? '—'
                        : '${packSize % 1 == 0 ? packSize.toStringAsFixed(0) : packSize.toStringAsFixed(2)} × $packCount';
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: UmkmColors.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: UmkmColors.line.withOpacity(0.9),
                          ),
                        ),
                        child: IntrinsicHeight(
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Container(
                                width: 28,
                                height: 28,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: UmkmColors.brandSoft,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  '${i + 1}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    color: UmkmColors.brandDeep,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      name,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        color: UmkmColors.brandDeep,
                                      ),
                                    ),
                                    Text(
                                      packLabel,
                                      style: const TextStyle(
                                        color: UmkmColors.muted,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                width: 1,
                                margin: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 2,
                                ),
                                color: UmkmColors.line.withOpacity(0.65),
                              ),
                              ConstrainedBox(
                                constraints: const BoxConstraints(minWidth: 88),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      formatMoney(line.lineTotal),
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        color: UmkmColors.ink,
                                      ),
                                    ),
                                    const Text(
                                      'Subtotal',
                                      style: TextStyle(
                                        color: UmkmColors.muted,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }(),
                DetailRow(label: 'Ordered', value: order.orderDate),
                DetailRow(
                  label: 'Shipment',
                  value: order.shipmentDate ?? '—',
                ),
                DetailRow(
                  label: 'Bill date',
                  value: order.billDate ?? '—',
                ),
                DetailRow(
                  label: 'Invoice date',
                  value: order.invoiceDate ?? '—',
                ),
                if (order.paymentDueDate?.isNotEmpty == true)
                  DetailRow(
                    label: 'Payment due',
                    value: order.paymentDueDate!,
                  ),
                DetailRow(
                  label: 'Subtotal',
                  value: formatMoney(order.lineTotal),
                ),
                DetailRow(
                  label: () {
                    final off = (order.lineTotal - order.totalOrderValue)
                        .clamp(0, double.infinity);
                    if (off <= 0 && order.discountValue <= 0) {
                      return 'Discount';
                    }
                    if (order.discountType == 'PERCENTAGE') {
                      final pct = order.discountValue % 1 == 0
                          ? order.discountValue.toStringAsFixed(0)
                          : order.discountValue.toStringAsFixed(2);
                      return 'Discount ($pct%)';
                    }
                    return 'Discount (fixed)';
                  }(),
                  value: () {
                    final off = (order.lineTotal - order.totalOrderValue)
                        .clamp(0, double.infinity);
                    return off > 0
                        ? '−${formatMoney(off)}'
                        : formatMoney(0);
                  }(),
                ),
                DetailRow(
                  label: 'Order total',
                  value: formatMoney(order.totalOrderValue),
                ),
                if (order.installments.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  const Text(
                    'Installments',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Each payment shows balance left after it clears.',
                    style: TextStyle(color: UmkmColors.muted, fontSize: 12.5),
                  ),
                  const SizedBox(height: 8),
                  for (final row in _installmentProgressRows(
                    total: due,
                    installments: order.installments,
                  ))
                    Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: UmkmColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: UmkmColors.line.withOpacity(0.9),
                        ),
                      ),
                      child: IntrinsicHeight(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Container(
                              width: 28,
                              height: 28,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: UmkmColors.brandSoft,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '${row.seq}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: UmkmColors.brandDeep,
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    formatMoney(row.amount),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      color: UmkmColors.brandDeep,
                                    ),
                                  ),
                                  Text(
                                    '${row.date} · ${due > 0 ? ((row.amount / due) * 100).toStringAsFixed(1) : '0.0'}% of total',
                                    style: const TextStyle(
                                      color: UmkmColors.muted,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              width: 1,
                              margin: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 2,
                              ),
                              color: UmkmColors.line.withOpacity(0.65),
                            ),
                            ConstrainedBox(
                              constraints: const BoxConstraints(minWidth: 88),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    formatMoney(row.remaining),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      color: UmkmColors.ink,
                                    ),
                                  ),
                                  Text(
                                    '${row.remainingPct.toStringAsFixed(1)}% remaining',
                                    style: const TextStyle(
                                      color: UmkmColors.muted,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Tr('Close'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context, 'edit'),
          child: const Tr('Edit'),
        ),
      ],
    );
    if (!mounted) return;
    if (action == 'edit') await _openForm(existing: order);
  }

  Widget _buildSummarySection() {
    final s = summary;
    final revenue = s == null ? null : formatMoneyParts(s.totalRevenue);
    final packs = s == null ? null : formatCompactQtyParts(s.productsSold);
    final fromLabel =
        s == null ? '···' : formatDateLabel(s.earliestOrderDate);
    final toLabel = s == null ? '···' : formatDateLabel(s.latestOrderDate);
    final ordersLabel = s == null
        ? '···'
        : NumberFormat.decimalPattern('en_US').format(s.orderCount);
    final isPulseLoading = s == null;
    final mutedValue = UmkmColors.muted.withValues(alpha: 0.55);

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        UmkmSpace.md,
        0,
        UmkmSpace.md,
        UmkmSpace.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SectionLabel(
            'Order pulse',
            subtitle: 'Volume, health rates, and active date span.',
            padded: false,
          ),
          const SizedBox(height: UmkmSpace.xs),
          Container(
            padding: const EdgeInsets.fromLTRB(
              UmkmSpace.md,
              UmkmSpace.sm + 2,
              UmkmSpace.md,
              UmkmSpace.sm + 2,
            ),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(UmkmSpace.radiusMd),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  UmkmColors.brandSoft.withValues(alpha: 0.55),
                  Colors.white.withValues(alpha: 0.94),
                  UmkmColors.surface,
                ],
              ),
              border: Border.all(
                color: UmkmColors.brand.withValues(alpha: 0.18),
              ),
              boxShadow: [
                BoxShadow(
                  color: UmkmColors.brandDeep.withValues(alpha: 0.05),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'TOTAL REVENUE',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.08,
                    color: UmkmColors.muted,
                  ),
                ),
                const SizedBox(height: UmkmSpace.xxs + 2),
                _PulseMagnitude(
                  figure: revenue?.figure ?? '···',
                  unit: revenue?.unit,
                  figureSize: 30,
                  loading: isPulseLoading,
                  mutedValue: mutedValue,
                ),
                const SizedBox(height: UmkmSpace.xxs),
                const Text(
                  'After discounts · non-cancelled',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: UmkmColors.muted,
                  ),
                ),
                const SizedBox(height: UmkmSpace.md),
                Container(
                  height: 1,
                  color: UmkmColors.line.withValues(alpha: 0.75),
                ),
                const SizedBox(height: UmkmSpace.sm + 2),
                Row(
                  children: [
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(right: UmkmSpace.sm),
                        child: _PulseMetric(
                          label: 'Orders',
                          child: Text(
                            ordersLabel,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.3,
                              color: isPulseLoading
                                  ? mutedValue
                                  : UmkmColors.brandDeep,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Container(
                      width: 1,
                      height: 44,
                      color: UmkmColors.line.withValues(alpha: 0.85),
                    ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(left: UmkmSpace.sm + 2),
                        child: _PulseMetric(
                          label: 'Packs sold',
                          child: _PulseMagnitude(
                            figure: packs?.figure ?? '···',
                            unit: packs?.unit,
                            figureSize: 18,
                            unitCompact: true,
                            loading: isPulseLoading,
                            mutedValue: mutedValue,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: UmkmSpace.md),
                Container(
                  height: 1,
                  color: UmkmColors.line.withValues(alpha: 0.75),
                ),
                const SizedBox(height: UmkmSpace.sm + 2),
                _PulseRateGrid(
                  loading: isPulseLoading,
                  mutedValue: mutedValue,
                  cancellation: s?.cancellationRate,
                  margin: s?.profitMarginRate,
                  discount: s?.discountRate,
                  fullPayment: s?.fullPaymentRate,
                ),
                const SizedBox(height: UmkmSpace.md),
                Container(
                  height: 1,
                  color: UmkmColors.line.withValues(alpha: 0.75),
                ),
                const SizedBox(height: UmkmSpace.sm + 2),
                Row(
                  children: [
                    Text(
                      'SPAN',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.08,
                        color: UmkmColors.muted,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      fromLabel,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: isPulseLoading
                            ? mutedValue
                            : UmkmColors.brandDeep,
                      ),
                    ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            Container(
                              height: 2,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(99),
                                gradient: LinearGradient(
                                  colors: [
                                    UmkmColors.brand.withValues(alpha: 0.35),
                                    UmkmColors.brand,
                                    UmkmColors.brandDeep,
                                  ],
                                ),
                              ),
                            ),
                            const Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _PulseDot(color: UmkmColors.brand),
                                _PulseDot(color: UmkmColors.brandDeep),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    Text(
                      toLabel,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: isPulseLoading
                            ? mutedValue
                            : UmkmColors.brandDeep,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDataSyncSection() {
    return FeatureDataSyncSection(
      open: _dataSyncOpen,
      onToggle: () => setState(() => _dataSyncOpen = !_dataSyncOpen),
      entity: FeatureExportEntity.orders,
      label: 'Orders',
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
                  const PageIntro(
                    subtitle: 'Pack-based orders with locked product prices.',
                  ),
                  _buildFilters(),
                  _buildDataSyncSection(),
                  if (loading)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else ...[
                    _buildSummarySection(),
                    const SectionLabel(
                      'Fulfillment',
                      subtitle: 'Orders with locked pack prices.',
                    ),
                    const SizedBox(height: 8),
                    EmptyHint(
                      title: _filtersActive ? 'No matches' : 'No orders yet',
                      message: _filtersActive
                          ? 'Try clearing filters or search.'
                          : 'Tap + to create your first order.',
                    ),
                  ],
                ],
              )
            : ListView.builder(
                padding: listChromePadding(context),
                itemCount: items.length + 2,
                itemBuilder: (context, i) {
                  if (i == 0) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const PageIntro(
                          subtitle:
                              'Pack-based orders with locked product prices.',
                        ),
                        _buildFilters(),
                        _buildDataSyncSection(),
                        _buildSummarySection(),
                        SectionLabel(
                          'Fulfillment',
                          subtitle: totalOrders <= items.length
                              ? '${items.length} orders with locked pack prices.'
                              : 'Showing ${items.length} of $totalOrders orders.',
                        ),
                      ],
                    );
                  }
                  if (i == items.length + 1) {
                    if (!hasMore) {
                      return const SizedBox(height: 24);
                    }
                    return Padding(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
                      child: OutlinedButton(
                        onPressed: loadingMore ? null : _loadMore,
                        child: Text(
                          loadingMore ? 'Loading…' : 'Load more orders',
                        ),
                      ),
                    );
                  }
                  final o = items[i - 1];
                  final extraLines = o.lineCount > 1 ? o.lineCount - 1 : 0;
                  final packMeta =
                      '${o.packSizeSnapshot ?? '-'} × ${o.packCount ?? 1}';
                  final metaParts = <String>[
                    packMeta,
                    if (extraLines > 0) '+$extraLines more',
                  ];
                  return EntityCard(
                    title: o.productName ?? o.productId,
                    subtitle: metaParts.join(' · '),
                    chips: [
                      StatusChip(label: o.status, tone: StatusTone.brand),
                    ],
                    details: [
                      o.orderId.isNotEmpty
                          ? compactLiteralId(o.orderId)
                          : entityIdLabel(o.id),
                      if (o.orderDate.isNotEmpty) o.orderDate,
                    ],
                    metrics: [
                      ('Total', formatMoney(o.totalOrderValue)),
                      ('Payment', o.paymentStatus),
                      if (o.installments.isNotEmpty || o.paidAmount > 0)
                        ('Left', formatMoney(o.remainingAmount)),
                      if (o.billStatus.isNotEmpty)
                        ('Bill', _billStatusLabel(o.billStatus)),
                      if (o.invoiceStatus.isNotEmpty)
                        ('Invoice', _invoiceStatusLabel(o.invoiceStatus)),
                    ],
                    onTap: () => _openView(o),
                    actions: [
                      CardActionButton(
                        icon: Icons.visibility_outlined,
                        label: 'View',
                        onPressed: () => _openView(o),
                      ),
                      CardActionButton(
                        icon: Icons.edit_outlined,
                        label: 'Edit',
                        onPressed: () => _openForm(existing: o),
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

class _OrderSummaryCell extends StatelessWidget {
  const _OrderSummaryCell({
    required this.label,
    required this.value,
    this.emphasize = false,
  });

  final String label;
  final String value;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: const TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.06,
            color: UmkmColors.muted,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: emphasize ? UmkmColors.brandDeep : UmkmColors.ink,
          ),
        ),
      ],
    );
  }
}

class _PulseDot extends StatelessWidget {
  const _PulseDot({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.28),
            blurRadius: 0,
            spreadRadius: 3,
          ),
        ],
      ),
    );
  }
}

class _PulseMetric extends StatelessWidget {
  const _PulseMetric({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: const TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.08,
            color: UmkmColors.muted,
          ),
        ),
        const SizedBox(height: 4),
        child,
      ],
    );
  }
}

class _PulseMagnitude extends StatelessWidget {
  const _PulseMagnitude({
    required this.figure,
    required this.unit,
    required this.figureSize,
    required this.loading,
    required this.mutedValue,
    this.unitCompact = false,
  });

  final String figure;
  final String? unit;
  final double figureSize;
  final bool loading;
  final Color mutedValue;
  final bool unitCompact;

  @override
  Widget build(BuildContext context) {
    final ink = loading ? mutedValue : UmkmColors.brandDeep;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        Flexible(
          child: Text(
            figure,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: figureSize,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.8,
              height: 1.05,
              color: ink,
            ),
          ),
        ),
        if (unit != null) ...[
          const SizedBox(width: 6),
          Container(
            padding: EdgeInsets.symmetric(
              horizontal: unitCompact ? 5 : 7,
              vertical: unitCompact ? 2 : 3,
            ),
            decoration: BoxDecoration(
              color: UmkmColors.brandSoft.withValues(alpha: 0.75),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(
                color: UmkmColors.brand.withValues(alpha: 0.18),
              ),
            ),
            child: Text(
              unit!,
              style: TextStyle(
                fontSize: unitCompact ? 10 : 12,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.04,
                color: UmkmColors.brand,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _PulseRateGrid extends StatelessWidget {
  const _PulseRateGrid({
    required this.loading,
    required this.mutedValue,
    required this.cancellation,
    required this.margin,
    required this.discount,
    required this.fullPayment,
  });

  final bool loading;
  final Color mutedValue;
  final double? cancellation;
  final double? margin;
  final double? discount;
  final double? fullPayment;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _PulseRateMeter(
                label: 'Cancellation',
                value: cancellation,
                loading: loading,
                mutedValue: mutedValue,
                color: const Color(0xFF9A5B3C),
              ),
            ),
            const SizedBox(width: UmkmSpace.sm),
            Expanded(
              child: _PulseRateMeter(
                label: 'Profit margin',
                value: margin,
                loading: loading,
                mutedValue: mutedValue,
                color: UmkmColors.brand,
              ),
            ),
          ],
        ),
        const SizedBox(height: UmkmSpace.sm),
        Row(
          children: [
            Expanded(
              child: _PulseRateMeter(
                label: 'Discount',
                value: discount,
                loading: loading,
                mutedValue: mutedValue,
                color: const Color(0xFF2F6F8F),
              ),
            ),
            const SizedBox(width: UmkmSpace.sm),
            Expanded(
              child: _PulseRateMeter(
                label: 'Full payment',
                value: fullPayment,
                loading: loading,
                mutedValue: mutedValue,
                color: UmkmColors.brandDeep,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _PulseRateMeter extends StatelessWidget {
  const _PulseRateMeter({
    required this.label,
    required this.value,
    required this.loading,
    required this.mutedValue,
    required this.color,
  });

  final String label;
  final double? value;
  final bool loading;
  final Color mutedValue;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final ratio = value == null || !value!.isFinite
        ? 0.0
        : (value!.clamp(0, 100) / 100);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                label.toUpperCase(),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.08,
                  color: UmkmColors.muted,
                ),
              ),
            ),
            Text(
              loading ? '···' : formatRatePercent(value),
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.2,
                color: loading ? mutedValue : UmkmColors.brandDeep,
              ),
            ),
          ],
        ),
        const SizedBox(height: UmkmSpace.xxs + 2),
        ClipRRect(
          borderRadius: BorderRadius.circular(99),
          child: SizedBox(
            height: 5,
            child: Stack(
              fit: StackFit.expand,
              children: [
                ColoredBox(color: UmkmColors.line.withValues(alpha: 0.55)),
                FractionallySizedBox(
                  alignment: Alignment.centerLeft,
                  widthFactor: ratio,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          color.withValues(alpha: 0.45),
                          color,
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
