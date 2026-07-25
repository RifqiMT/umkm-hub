import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../format_money.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../theme/umkm_theme.dart';
import '../widgets/ui.dart';

enum _Granularity { monthly, annual }

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  late int _year;
  _Granularity _granularity = _Granularity.monthly;
  AnalyticsOverview? _data;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _year = DateTime.now().toUtc().year;
    _load();
  }

  List<int> get _yearOptions {
    final now = DateTime.now().toUtc().year;
    return List.generate(7, (i) => now + 1 - i);
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final raw = await context.read<ApiService>().request(
            'GET',
            '/analytics',
            query: {'year': '$_year'},
          );
      if (!mounted) return;
      setState(() {
        _data = AnalyticsOverview.fromJson(raw as Map<String, dynamic>);
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _data = null;
        _loading = false;
      });
    }
  }

  String _fmtMoney(double v) => formatMoney(v);
  String _fmtQty(double v) => formatQty(v);

  @override
  Widget build(BuildContext context) {
    final data = _data;
    final hasTarget = data == null
        ? false
        : _granularity == _Granularity.monthly
            ? data.monthly.any((m) => m.target != null)
            : data.annual.any((y) => y.target != null);

    final revenues = _granularity == _Granularity.monthly
        ? (data?.monthly.map((m) => m.revenue).toList() ?? const <double>[])
        : (data?.annual.map((y) => y.revenue).toList() ?? const <double>[]);
    final targets = _granularity == _Granularity.monthly
        ? (data?.monthly.map((m) => m.target).toList() ?? const <double?>[])
        : (data?.annual.map((y) => y.target).toList() ?? const <double?>[]);
    final orders = _granularity == _Granularity.monthly
        ? (data?.monthly.map((m) => m.orderCount.toDouble()).toList() ??
            const <double>[])
        : (data?.annual.map((y) => y.orderCount.toDouble()).toList() ??
            const <double>[]);
    final aovValues = _granularity == _Granularity.monthly
        ? (data?.monthly.map((m) => m.avgOrderValue).toList() ??
            const <double?>[])
        : (data?.annual.map((y) => y.avgOrderValue).toList() ??
            const <double?>[]);
    final ltvValues = _granularity == _Granularity.monthly
        ? (data?.monthly.map((m) => m.avgLtv).toList() ?? const <double?>[])
        : (data?.annual.map((y) => y.avgLtv).toList() ?? const <double?>[]);
    final topLtvCustomers = (data?.customers ?? const [])
        .where((c) => c.revenue > 0)
        .take(8)
        .toList();
    final attainments = _granularity == _Granularity.monthly
        ? (data?.monthly.map((m) => m.attainmentPercent).toList() ??
            const <double?>[])
        : (data?.annual.map((y) => y.attainmentPercent).toList() ??
            const <double?>[]);
    final margins = _granularity == _Granularity.monthly
        ? (data?.monthly.map((m) => m.marginPercent).toList() ??
            const <double?>[])
        : (data?.annual.map((y) => y.marginPercent).toList() ??
            const <double?>[]);
    final shipmentDays = _granularity == _Granularity.monthly
        ? (data?.monthly.map((m) => m.avgShipmentDays).toList() ??
            const <double?>[])
        : (data?.annual.map((y) => y.avgShipmentDays).toList() ??
            const <double?>[]);
    final firstPaymentDays = _granularity == _Granularity.monthly
        ? (data?.monthly.map((m) => m.avgFirstPaymentDays).toList() ??
            const <double?>[])
        : (data?.annual.map((y) => y.avgFirstPaymentDays).toList() ??
            const <double?>[]);
    final paymentDays = _granularity == _Granularity.monthly
        ? (data?.monthly.map((m) => m.avgPaymentDays).toList() ??
            const <double?>[])
        : (data?.annual.map((y) => y.avgPaymentDays).toList() ??
            const <double?>[]);
    final labels = _granularity == _Granularity.monthly
        ? (data?.monthly.map((m) => m.label).toList() ?? const <String>[])
        : (data?.annual.map((y) => '${y.year}').toList() ?? const <String>[]);

    final hasAov = aovValues.any((v) => v != null);
    final hasLtv = ltvValues.any((v) => v != null);
    final hasTopLtv = topLtvCustomers.isNotEmpty;
    final hasAttainment = attainments.any((v) => v != null);
    final hasMargin = margins.any((v) => v != null);
    final hasShipment = shipmentDays.any((v) => v != null);
    final hasFirstPayment = firstPaymentDays.any((v) => v != null);
    final hasPayment = paymentDays.any((v) => v != null);

    final empty = !_loading &&
        _error == null &&
        revenues.every((v) => v <= 0) &&
        orders.every((v) => v <= 0);

    return SoftSurface(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          title: const Text('Analytics'),
        ),
        body: ListView(
          padding: listChromePadding(context).copyWith(top: 8),
          children: [
            const PageIntro(
              subtitle:
                  'Trends for revenue, targets, margins, and fulfillment lead times.',
            ),
            if (_error != null) ErrorBanner(message: _error!),
            const SectionLabel(
              'Period',
              subtitle: 'Pick Monthly or Annual, then a year when needed.',
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: FormSection(
                title: 'Chart focus',
                description: _granularity == _Granularity.monthly
                    ? 'Year appears for monthly breakdowns.'
                    : 'Annual uses the five-year window ending $_year.',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'View',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: UmkmColors.muted,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 8),
                    ChoiceChipGroup<_Granularity>(
                      value: _granularity,
                      onChanged: (v) {
                        if (v == null) return;
                        setState(() => _granularity = v);
                      },
                      options: const [
                        ChoiceOption(
                          value: _Granularity.monthly,
                          label: 'Monthly',
                        ),
                        ChoiceOption(
                          value: _Granularity.annual,
                          label: 'Annual',
                        ),
                      ],
                    ),
                    AnimatedSize(
                      duration: const Duration(milliseconds: 240),
                      curve: Curves.easeOutCubic,
                      alignment: Alignment.topCenter,
                      child: _granularity == _Granularity.monthly
                          ? Column(
                              key: const ValueKey('year'),
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                const SizedBox(height: 14),
                                Text(
                                  'Year',
                                  style: Theme.of(context)
                                      .textTheme
                                      .labelLarge
                                      ?.copyWith(
                                        color: UmkmColors.muted,
                                        fontWeight: FontWeight.w700,
                                      ),
                                ),
                                const SizedBox(height: 8),
                                DropdownButtonFormField<int>(
                                  value: _year,
                                  decoration: InputDecoration(
                                    filled: true,
                                    fillColor: UmkmColors.surface,
                                    contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 14,
                                      vertical: 14,
                                    ),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(14),
                                      borderSide: BorderSide(
                                        color: UmkmColors.line.withOpacity(0.9),
                                      ),
                                    ),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(14),
                                      borderSide: BorderSide(
                                        color: UmkmColors.line.withOpacity(0.9),
                                      ),
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(14),
                                      borderSide: const BorderSide(
                                        color: UmkmColors.brand,
                                        width: 1.5,
                                      ),
                                    ),
                                  ),
                                  icon: const Icon(
                                    Icons.keyboard_arrow_down_rounded,
                                    color: UmkmColors.brand,
                                  ),
                                  borderRadius: BorderRadius.circular(14),
                                  dropdownColor: UmkmColors.surface,
                                  style: const TextStyle(
                                    color: UmkmColors.brandDeep,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 16,
                                    letterSpacing: -0.2,
                                  ),
                                  items: _yearOptions
                                      .map(
                                        (y) => DropdownMenuItem(
                                          value: y,
                                          child: Text('$y'),
                                        ),
                                      )
                                      .toList(),
                                  onChanged: (v) {
                                    if (v == null) return;
                                    setState(() => _year = v);
                                    _load();
                                  },
                                ),
                              ],
                            )
                          : Padding(
                              key: const ValueKey('window'),
                              padding: const EdgeInsets.only(top: 14),
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 14,
                                ),
                                decoration: BoxDecoration(
                                  color: UmkmColors.brandSoft.withOpacity(0.45),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                    color: UmkmColors.brand.withOpacity(0.28),
                                  ),
                                ),
                                child: Text(
                                  'Window ${_year - 4}–$_year',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    color: UmkmColors.brandDeep,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 15,
                                    letterSpacing: -0.2,
                                  ),
                                ),
                              ),
                            ),
                    ),
                  ],
                ),
              ),
            ),
            const SectionLabel(
              'Snapshot',
              subtitle: 'Totals for the selected year.',
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: MetricTile(
                          label: 'Revenue',
                          value: data == null ? '—' : _fmtMoney(data.revenue),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: MetricTile(
                          label: 'Orders',
                          value: data == null ? '—' : '${data.orderCount}',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: MetricTile(
                          label: 'Avg order',
                          value: data?.avgOrderValue == null
                              ? '—'
                              : _fmtMoney(data!.avgOrderValue!),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: MetricTile(
                          label: 'Attainment',
                          value: data?.attainmentPercent == null
                              ? '—'
                              : '${data!.attainmentPercent!.toStringAsFixed(1)}%',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: MetricTile(
                          label: 'Margin',
                          value: data?.marginPercent == null
                              ? '—'
                              : '${data!.marginPercent!.toStringAsFixed(1)}%',
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: MetricTile(
                          label: 'Avg ship',
                          value: data?.avgShipmentDays == null
                              ? '—'
                              : '${data!.avgShipmentDays!.toStringAsFixed(1)} d',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: MetricTile(
                          label: 'First pay',
                          value: data?.avgFirstPaymentDays == null
                              ? '—'
                              : '${data!.avgFirstPaymentDays!.toStringAsFixed(1)} d',
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: MetricTile(
                          label: 'Last pay',
                          value: data?.avgPaymentDays == null
                              ? '—'
                              : '${data!.avgPaymentDays!.toStringAsFixed(1)} d',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: MetricTile(
                          label: 'Avg LTV',
                          value: data?.avgLtv == null
                              ? '—'
                              : _fmtMoney(data!.avgLtv!),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: MetricTile(
                          label: 'LTV buyers',
                          value: data == null
                              ? '—'
                              : '${data.ltvCustomerCount}',
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            SectionLabel(
              _granularity == _Granularity.monthly
                  ? 'Monthly charts'
                  : 'Annual charts',
              subtitle: hasTarget
                  ? 'Revenue, rates, and lead times. Muted bars are targets when set.'
                  : 'Revenue, rates, and lead times when shipment dates or installments exist.',
            ),
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (empty)
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: EmptyHint(
                  title: 'No order activity yet',
                  message:
                      'Create orders in this period to see revenue and order graphs.',
                ),
              )
            else ...[
              const SectionLabel(
                'Performance',
                subtitle: 'Revenue, order volume, and average order value.',
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'Revenue',
                  child: _RevenueChart(
                    labels: labels,
                    revenues: revenues,
                    targets: hasTarget ? targets : null,
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'Orders',
                  child: _OrdersChart(labels: labels, orders: orders),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'Average order value',
                  child: hasAov
                      ? _RateChart(
                          labels: labels,
                          values: aovValues,
                          color: const Color(0xFF3D7A5C),
                          unit: 'money',
                        )
                      : const Center(
                          child: Text(
                            'Create orders to see average order value',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                ),
              ),
              const SectionLabel(
                'Rates',
                subtitle: 'Attainment versus target and profit margin.',
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'Attainment rate',
                  child: hasAttainment
                      ? _RateChart(
                          labels: labels,
                          values: attainments,
                          color: UmkmColors.brand,
                          reference: 100,
                          unit: '%',
                        )
                      : const Center(
                          child: Text(
                            'Set Targets to see attainment over time',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'Profit margin rate',
                  child: hasMargin
                      ? _RateChart(
                          labels: labels,
                          values: margins,
                          color: const Color(0xFF2F6F8F),
                          unit: '%',
                        )
                      : const Center(
                          child: Text(
                            'Add product costs to see margin over time',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                ),
              ),
              const SectionLabel(
                'Lead times',
                subtitle:
                    'Average days to ship, first payment, and last payment.',
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'Shipment duration',
                  child: hasShipment
                      ? _RateChart(
                          labels: labels,
                          values: shipmentDays,
                          color: const Color(0xFF6B5B3E),
                          unit: 'd',
                        )
                      : const Center(
                          child: Text(
                            'Set shipment dates on orders to see lead time',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'First payment duration',
                  child: hasFirstPayment
                      ? _RateChart(
                          labels: labels,
                          values: firstPaymentDays,
                          color: const Color(0xFFA67C52),
                          unit: 'd',
                        )
                      : const Center(
                          child: Text(
                            'Add installments to see first payment lead time',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'Last payment duration',
                  child: hasPayment
                      ? _RateChart(
                          labels: labels,
                          values: paymentDays,
                          color: const Color(0xFF8A4F3D),
                          unit: 'd',
                        )
                      : const Center(
                          child: Text(
                            'Add installments to see payment lead time',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                ),
              ),
              const SectionLabel(
                'Lifetime value',
                subtitle:
                    'Avg LTV is linked revenue ÷ active customers; ranking uses year revenue.',
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'Average LTV',
                  child: hasLtv
                      ? _RateChart(
                          labels: labels,
                          values: ltvValues,
                          color: const Color(0xFF5C6BC0),
                          unit: 'money',
                        )
                      : const Center(
                          child: Text(
                            'Assign customers on orders to see average LTV',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'Top customers by LTV',
                  height: 280,
                  child: hasTopLtv
                      ? _TopLtvList(customers: topLtvCustomers)
                      : const Center(
                          child: Text(
                            'Assign customers on orders to see the ranking',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                ),
              ),
            ],
            if (!_loading) ...[
              SectionLabel(
                'Products · $_year',
                subtitle:
                    'Revenue after discount. Rates are shares of the pre-discount total.',
              ),
              if (data == null || data.products.isEmpty)
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 0, 16, 24),
                  child: EmptyHint(
                    title: 'No product sales yet',
                    message:
                        'Orders in this year will appear here with revenue, discount, cost, and margin.',
                  ),
                )
              else
                ...data.products.map(
                  (p) => Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                    child: EntityCard(
                      title: p.name,
                      subtitle: p.unit,
                      details: [
                        '${p.orderCount} orders · Qty ${_fmtQty(p.qtySold)}',
                      ],
                      metrics: [
                        ('Revenue', _fmtMoney(p.revenue)),
                        if (p.avgOrderValue != null)
                          ('AOV', _fmtMoney(p.avgOrderValue!)),
                        (
                          'Discount',
                          p.discount > 0
                              ? p.discountPercent != null
                                  ? '${_fmtMoney(p.discount)} · ${p.discountPercent!.toStringAsFixed(1)}%'
                                  : _fmtMoney(p.discount)
                              : '—',
                        ),
                        (
                          'Cost',
                          p.cost != null
                              ? p.costPercent != null
                                  ? '${_fmtMoney(p.cost!)} · ${p.costPercent!.toStringAsFixed(1)}%'
                                  : _fmtMoney(p.cost!)
                              : '—',
                        ),
                        (
                          'Profit',
                          p.profit != null
                              ? p.marginPercent != null
                                  ? '${_fmtMoney(p.profit!)} · ${p.marginPercent!.toStringAsFixed(1)}%'
                                  : _fmtMoney(p.profit!)
                              : '—',
                        ),
                      ],
                    ),
                  ),
                ),
            ],
            if (!_loading) ...[
              SectionLabel(
                'Customers · $_year',
                subtitle:
                    'Same metrics as products, grouped by CRM customer on each order.',
              ),
              if (data == null || data.customers.isEmpty)
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 0, 16, 24),
                  child: EmptyHint(
                    title: 'No customer sales yet',
                    message:
                        'Assign a customer on orders to see revenue, discount, cost, and profit here.',
                  ),
                )
              else
                ...data.customers.map(
                  (c) => Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                    child: EntityCard(
                      title: c.name,
                      subtitle: c.companyType.isNotEmpty
                          ? c.companyType
                          : null,
                      details: [
                        if (c.companyName.isNotEmpty) c.companyName,
                        '${c.orderCount} orders',
                      ],
                      metrics: [
                        ('Revenue', _fmtMoney(c.revenue)),
                        if (c.avgOrderValue != null)
                          ('AOV', _fmtMoney(c.avgOrderValue!)),
                        (
                          'Discount',
                          c.discount > 0
                              ? c.discountPercent != null
                                  ? '${_fmtMoney(c.discount)} · ${c.discountPercent!.toStringAsFixed(1)}%'
                                  : _fmtMoney(c.discount)
                              : '—',
                        ),
                        (
                          'Cost',
                          c.cost != null
                              ? c.costPercent != null
                                  ? '${_fmtMoney(c.cost!)} · ${c.costPercent!.toStringAsFixed(1)}%'
                                  : _fmtMoney(c.cost!)
                              : '—',
                        ),
                        (
                          'Profit',
                          c.profit != null
                              ? c.marginPercent != null
                                  ? '${_fmtMoney(c.profit!)} · ${c.marginPercent!.toStringAsFixed(1)}%'
                                  : _fmtMoney(c.profit!)
                              : '—',
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ChartCard extends StatelessWidget {
  const _ChartCard({
    required this.title,
    required this.child,
    this.height = 220,
  });

  final String title;
  final Widget child;
  final double height;

  @override
  Widget build(BuildContext context) {
    return FormSection(
      title: title,
      child: SizedBox(height: height, child: child),
    );
  }
}

class _TopLtvList extends StatelessWidget {
  const _TopLtvList({required this.customers});

  final List<AnalyticsCustomerRow> customers;

  @override
  Widget build(BuildContext context) {
    final maxRevenue = customers
        .map((c) => c.revenue)
        .fold<double>(0, (a, b) => a > b ? a : b);
    final denom = maxRevenue <= 0 ? 1.0 : maxRevenue;

    return ListView.separated(
      physics: const NeverScrollableScrollPhysics(),
      itemCount: customers.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final c = customers[index];
        final fraction = (c.revenue / denom).clamp(0.0, 1.0);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    c.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  formatMoney(c.revenue),
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                    color: Color(0xFF5C6BC0),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: fraction,
                minHeight: 6,
                backgroundColor: UmkmColors.line.withOpacity(0.45),
                color: const Color(0xFF5C6BC0),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _RevenueChart extends StatelessWidget {
  const _RevenueChart({
    required this.labels,
    required this.revenues,
    this.targets,
  });

  final List<String> labels;
  final List<double> revenues;
  final List<double?>? targets;

  @override
  Widget build(BuildContext context) {
    final maxY = [
      ...revenues,
      if (targets != null) ...targets!.whereType<double>(),
      1.0,
    ].reduce((a, b) => a > b ? a : b);

    return BarChart(
      BarChartData(
        maxY: maxY * 1.15,
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          getDrawingHorizontalLine: (v) => FlLine(
            color: UmkmColors.line.withOpacity(0.7),
            strokeWidth: 1,
            dashArray: [4, 4],
          ),
        ),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 40,
              getTitlesWidget: (value, meta) {
                if (value == 0 || value == meta.max) {
                  return const SizedBox.shrink();
                }
                final label = formatMoney(value);
                return Text(
                  label,
                  style: const TextStyle(fontSize: 10, color: UmkmColors.muted),
                );
              },
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                final i = value.toInt();
                if (i < 0 || i >= labels.length) {
                  return const SizedBox.shrink();
                }
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    labels[i],
                    style: const TextStyle(
                      fontSize: 10,
                      color: UmkmColors.muted,
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        barGroups: [
          for (var i = 0; i < revenues.length; i++)
            BarChartGroupData(
              x: i,
              barsSpace: 3,
              barRods: [
                BarChartRodData(
                  toY: revenues[i],
                  width: labels.length > 8 ? 8 : 12,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(5),
                  ),
                  color: UmkmColors.brand,
                ),
                if (targets != null)
                  BarChartRodData(
                    toY: targets![i] ?? 0,
                    width: labels.length > 8 ? 8 : 12,
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(5),
                    ),
                    color: UmkmColors.muted.withOpacity(0.45),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

class _OrdersChart extends StatelessWidget {
  const _OrdersChart({required this.labels, required this.orders});

  final List<String> labels;
  final List<double> orders;

  @override
  Widget build(BuildContext context) {
    final maxY = [...orders, 1.0].reduce((a, b) => a > b ? a : b);

    return BarChart(
      BarChartData(
        maxY: maxY * 1.2,
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          getDrawingHorizontalLine: (v) => FlLine(
            color: UmkmColors.line.withOpacity(0.7),
            strokeWidth: 1,
            dashArray: [4, 4],
          ),
        ),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 28,
              getTitlesWidget: (value, meta) {
                if (value % 1 != 0) return const SizedBox.shrink();
                return Text(
                  value.toInt().toString(),
                  style: const TextStyle(fontSize: 10, color: UmkmColors.muted),
                );
              },
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                final i = value.toInt();
                if (i < 0 || i >= labels.length) {
                  return const SizedBox.shrink();
                }
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    labels[i],
                    style: const TextStyle(
                      fontSize: 10,
                      color: UmkmColors.muted,
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        barGroups: [
          for (var i = 0; i < orders.length; i++)
            BarChartGroupData(
              x: i,
              barRods: [
                BarChartRodData(
                  toY: orders[i],
                  width: labels.length > 8 ? 10 : 16,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(5),
                  ),
                  color: const Color(0xFFC4783A),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _RateChart extends StatelessWidget {
  const _RateChart({
    required this.labels,
    required this.values,
    required this.color,
    this.reference,
    this.unit = '%',
  });

  final List<String> labels;
  final List<double?> values;
  final Color color;
  final double? reference;
  final String unit;

  @override
  Widget build(BuildContext context) {
    final known = values.whereType<double>().toList();
    final maxKnown = known.isEmpty ? 100.0 : known.reduce((a, b) => a > b ? a : b);
    final minKnown = known.isEmpty ? 0.0 : known.reduce((a, b) => a < b ? a : b);
    final top = [
      maxKnown,
      if (reference != null) reference!,
      10.0,
    ].reduce((a, b) => a > b ? a : b);
    final bottom = minKnown < 0 ? minKnown * 1.1 : 0.0;

    final spots = <FlSpot>[
      for (var i = 0; i < values.length; i++)
        if (values[i] != null) FlSpot(i.toDouble(), values[i]!),
    ];

    String axisLabel(double value) {
      if (unit == '%') return '${value.toStringAsFixed(0)}%';
      if (unit == 'money') return formatMoney(value);
      return '${value.toStringAsFixed(0)}$unit';
    }

    return LineChart(
      LineChartData(
        minY: bottom,
        maxY: top * 1.15,
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          getDrawingHorizontalLine: (v) => FlLine(
            color: UmkmColors.line.withOpacity(0.7),
            strokeWidth: 1,
            dashArray: [4, 4],
          ),
        ),
        borderData: FlBorderData(show: false),
        extraLinesData: reference == null
            ? null
            : ExtraLinesData(
                horizontalLines: [
                  HorizontalLine(
                    y: reference!,
                    color: UmkmColors.muted.withOpacity(0.55),
                    strokeWidth: 1.2,
                    dashArray: [6, 4],
                    label: HorizontalLineLabel(
                      show: true,
                      alignment: Alignment.topRight,
                      style: const TextStyle(
                        fontSize: 10,
                        color: UmkmColors.muted,
                      ),
                      labelResolver: (_) => axisLabel(reference!),
                    ),
                  ),
                ],
              ),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 36,
              getTitlesWidget: (value, meta) {
                return Text(
                  axisLabel(value),
                  style: const TextStyle(fontSize: 10, color: UmkmColors.muted),
                );
              },
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                final i = value.toInt();
                if (i < 0 || i >= labels.length || value != i.toDouble()) {
                  return const SizedBox.shrink();
                }
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    labels[i],
                    style: const TextStyle(
                      fontSize: 10,
                      color: UmkmColors.muted,
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            color: color,
            barWidth: 2.5,
            isStrokeCapRound: true,
            dotData: FlDotData(
              show: true,
              getDotPainter: (spot, percent, bar, index) => FlDotCirclePainter(
                radius: 3.2,
                color: color,
                strokeWidth: 0,
              ),
            ),
            belowBarData: BarAreaData(
              show: true,
              color: color.withOpacity(0.1),
            ),
          ),
        ],
      ),
    );
  }
}
