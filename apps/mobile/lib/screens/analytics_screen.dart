import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../chart_domain.dart';
import '../format_money.dart';
import '../models/models.dart';
import '../period_growth.dart';
import '../rank_axis_label.dart';
import '../services/api_service.dart';
import '../theme/umkm_theme.dart';
import '../timeline.dart';
import '../widgets/ui.dart';

enum _Granularity { weekly, monthly, quarterly, annual }

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  /// Null = all timelines.
  int? _year;
  _Granularity _granularity = _Granularity.monthly;
  _ChartView _chartView = _ChartView.graph;
  AnalyticsOverview? _data;
  String? _error;
  bool _loading = true;
  bool _tablesLoading = false;
  final Set<_Granularity> _loadedSeries = <_Granularity>{};
  final _FsDeck _fsDeck = _FsDeck();
  /// Non-null while chart/table immersive fullscreen is open.
  int? _fsIndex;

  @override
  void initState() {
    super.initState();
    _year = DateTime.now().toUtc().year;
    _load();
  }

  String get _granularityQuery => switch (_granularity) {
        _Granularity.weekly => 'weekly',
        _Granularity.monthly => 'monthly',
        _Granularity.quarterly => 'quarterly',
        _Granularity.annual => 'annual',
      };

  List<int> get _yearOptions => AppTimeline.yearOptions();

  String get _scopeLabel => _year == null ? 'All timelines' : '$_year';

  String get _periodAxisLabel => switch (_granularity) {
        _Granularity.weekly => 'Week',
        _Granularity.monthly => 'Month',
        _Granularity.quarterly => 'Quarter',
        _Granularity.annual => 'Year',
      };

  String get _annualWindowLabel =>
      _year == null ? 'All timelines' : AppTimeline.annualWindowLabel(_year!);

  String get _periodDescription {
    if (_year == null) {
      switch (_granularity) {
        case _Granularity.weekly:
          return 'Charts show every ISO week across all timelines.';
        case _Granularity.monthly:
          return 'Charts show every month across all timelines.';
        case _Granularity.quarterly:
          return 'Charts show every quarter across all timelines.';
        case _Granularity.annual:
          return 'Charts show every year in the app timeline.';
      }
    }
    switch (_granularity) {
      case _Granularity.weekly:
        return 'Break $_year into ISO weeks.';
      case _Granularity.monthly:
        return 'Break $_year into months.';
      case _Granularity.quarterly:
        return 'Break $_year into quarters.';
      case _Granularity.annual:
        return 'Annual uses the ${AppTimeline.annualWindow}-year window ending $_year ($_annualWindowLabel).';
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _tablesLoading = true;
      _error = null;
      _loadedSeries.clear();
    });
    final api = context.read<ApiService>();
    final years = _year == null ? 'all' : '$_year';
    try {
      final coreRaw = await api.request(
        'GET',
        '/analytics',
        query: {
          'years': years,
          'include': 'summary,series',
          'granularity': _granularityQuery,
        },
      );
      if (!mounted) return;
      final core =
          AnalyticsOverview.fromJson(coreRaw as Map<String, dynamic>);
      _loadedSeries.add(_granularity);
      setState(() {
        _data = core;
        _loading = false;
      });

      final tablesRaw = await api.request(
        'GET',
        '/analytics',
        query: {
          'years': years,
          'include': 'products,customers',
        },
      );
      if (!mounted) return;
      final tables =
          AnalyticsOverview.fromJson(tablesRaw as Map<String, dynamic>);
      setState(() {
        _data = (_data ?? core).mergeWith(tables, mode: 'tables');
        _tablesLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _data = null;
        _loading = false;
        _tablesLoading = false;
      });
    }
  }

  Future<void> _ensureSeriesLoaded() async {
    if (_loading || _loadedSeries.contains(_granularity)) return;
    final years = _year == null ? 'all' : '$_year';
    try {
      final raw = await context.read<ApiService>().request(
            'GET',
            '/analytics',
            query: {
              'years': years,
              'include': 'series',
              'granularity': _granularityQuery,
            },
          );
      if (!mounted) return;
      final partial =
          AnalyticsOverview.fromJson(raw as Map<String, dynamic>);
      _loadedSeries.add(_granularity);
      setState(() {
        _data = (_data ?? partial).mergeWith(partial, mode: 'series');
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  String _fmtMoney(double v) => formatMoney(v);
  String _fmtQty(double v) => formatCompactQty(v);

  /// Chart periods with at least one order (empty timeline slots are omitted).
  List<AnalyticsWeekPoint> _activeWeeks(AnalyticsOverview? data) {
    if (data == null) return const [];
    return data.weekly.where((w) => w.orderCount > 0).toList();
  }

  List<AnalyticsMonthPoint> _activeMonths(AnalyticsOverview? data) {
    if (data == null) return const [];
    return data.monthly.where((m) => m.orderCount > 0).toList();
  }

  List<AnalyticsQuarterPoint> _activeQuarters(AnalyticsOverview? data) {
    if (data == null) return const [];
    return data.quarterly.where((q) => q.orderCount > 0).toList();
  }

  List<AnalyticsYearPoint> _activeYears(AnalyticsOverview? data) {
    if (data == null) return const [];
    return data.annual.where((y) => y.orderCount > 0).toList();
  }

  List<({String label, AnalyticsMixShares mix})> _statusMixRows(
    AnalyticsOverview? data,
  ) {
    if (data == null) return const [];
    switch (_granularity) {
      case _Granularity.weekly:
        return data.weekly
            .where((w) => w.mix.statusOrderCount > 0)
            .map((w) => (label: w.label, mix: w.mix))
            .toList();
      case _Granularity.monthly:
        return data.monthly
            .where((m) => m.mix.statusOrderCount > 0)
            .map((m) => (label: m.label, mix: m.mix))
            .toList();
      case _Granularity.quarterly:
        return data.quarterly
            .where((q) => q.mix.statusOrderCount > 0)
            .map((q) => (label: q.label, mix: q.mix))
            .toList();
      case _Granularity.annual:
        return data.annual
            .where((y) => y.mix.statusOrderCount > 0)
            .map((y) => (label: '${y.year}', mix: y.mix))
            .toList();
    }
  }

  List<({String label, AnalyticsMixShares mix})> _paymentMixRows(
    AnalyticsOverview? data,
  ) {
    if (data == null) return const [];
    switch (_granularity) {
      case _Granularity.weekly:
        return data.weekly
            .where((w) => w.mix.paymentOrderCount > 0)
            .map((w) => (label: w.label, mix: w.mix))
            .toList();
      case _Granularity.monthly:
        return data.monthly
            .where((m) => m.mix.paymentOrderCount > 0)
            .map((m) => (label: m.label, mix: m.mix))
            .toList();
      case _Granularity.quarterly:
        return data.quarterly
            .where((q) => q.mix.paymentOrderCount > 0)
            .map((q) => (label: q.label, mix: q.mix))
            .toList();
      case _Granularity.annual:
        return data.annual
            .where((y) => y.mix.paymentOrderCount > 0)
            .map((y) => (label: '${y.year}', mix: y.mix))
            .toList();
    }
  }

  List<double> _revenues(AnalyticsOverview? data) {
    switch (_granularity) {
      case _Granularity.weekly:
        return _activeWeeks(data).map((m) => m.revenue).toList();
      case _Granularity.monthly:
        return _activeMonths(data).map((m) => m.revenue).toList();
      case _Granularity.quarterly:
        return _activeQuarters(data).map((q) => q.revenue).toList();
      case _Granularity.annual:
        return _activeYears(data).map((y) => y.revenue).toList();
    }
  }

  List<double?> _targets(AnalyticsOverview? data) {
    switch (_granularity) {
      case _Granularity.weekly:
        return _activeWeeks(data).map((w) => w.target).toList();
      case _Granularity.monthly:
        return _activeMonths(data).map((m) => m.target).toList();
      case _Granularity.quarterly:
        return _activeQuarters(data).map((q) => q.target).toList();
      case _Granularity.annual:
        return _activeYears(data).map((y) => y.target).toList();
    }
  }

  List<double> _orders(AnalyticsOverview? data) {
    switch (_granularity) {
      case _Granularity.weekly:
        return _activeWeeks(data).map((m) => m.orderCount.toDouble()).toList();
      case _Granularity.monthly:
        return _activeMonths(data).map((m) => m.orderCount.toDouble()).toList();
      case _Granularity.quarterly:
        return _activeQuarters(data).map((q) => q.orderCount.toDouble()).toList();
      case _Granularity.annual:
        return _activeYears(data).map((y) => y.orderCount.toDouble()).toList();
    }
  }

  List<double?> _mapMetric(
    AnalyticsOverview? data, {
    required double? Function(AnalyticsWeekPoint w) weekly,
    required double? Function(AnalyticsMonthPoint m) monthly,
    required double? Function(AnalyticsQuarterPoint q) quarterly,
    required double? Function(AnalyticsYearPoint y) annual,
  }) {
    switch (_granularity) {
      case _Granularity.weekly:
        return _activeWeeks(data).map(weekly).toList();
      case _Granularity.monthly:
        return _activeMonths(data).map(monthly).toList();
      case _Granularity.quarterly:
        return _activeQuarters(data).map(quarterly).toList();
      case _Granularity.annual:
        return _activeYears(data).map(annual).toList();
    }
  }

  List<String> _labels(AnalyticsOverview? data) {
    switch (_granularity) {
      case _Granularity.weekly:
        return _activeWeeks(data).map((m) => m.label).toList();
      case _Granularity.monthly:
        return _activeMonths(data).map((m) => m.label).toList();
      case _Granularity.quarterly:
        return _activeQuarters(data).map((q) => q.label).toList();
      case _Granularity.annual:
        return _activeYears(data).map((y) => '${y.year}').toList();
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = _data;
    final hasTarget = switch (_granularity) {
      _Granularity.weekly => _activeWeeks(data).any((w) => w.target != null),
      _Granularity.monthly => _activeMonths(data).any((m) => m.target != null),
      _Granularity.quarterly =>
        _activeQuarters(data).any((q) => q.target != null),
      _Granularity.annual => _activeYears(data).any((y) => y.target != null),
    };

    final revenues = _revenues(data);
    final targets = _targets(data);
    final orders = _orders(data);
    final aovValues = _mapMetric(
      data,
      weekly: (w) => w.avgOrderValue,
      monthly: (m) => m.avgOrderValue,
      quarterly: (q) => q.avgOrderValue,
      annual: (y) => y.avgOrderValue,
    );
    final basketValues = _mapMetric(
      data,
      weekly: (w) => w.avgBasketSize,
      monthly: (m) => m.avgBasketSize,
      quarterly: (q) => q.avgBasketSize,
      annual: (y) => y.avgBasketSize,
    );
    final frequencyValues = _mapMetric(
      data,
      weekly: (w) => w.avgPurchaseFrequency,
      monthly: (m) => m.avgPurchaseFrequency,
      quarterly: (q) => q.avgPurchaseFrequency,
      annual: (y) => y.avgPurchaseFrequency,
    );
    final ltvValues = _mapMetric(
      data,
      weekly: (w) => w.avgLtv,
      monthly: (m) => m.avgLtv,
      quarterly: (q) => q.avgLtv,
      annual: (y) => y.avgLtv,
    );
    final productRevenueValues = _mapMetric(
      data,
      weekly: (w) => w.avgProductRevenue,
      monthly: (m) => m.avgProductRevenue,
      quarterly: (q) => q.avgProductRevenue,
      annual: (y) => y.avgProductRevenue,
    );
    final rankedCustomers =
        (data?.customers ?? const []).where((c) => c.revenue > 0).toList();
    final rankedProducts =
        (data?.products ?? const []).where((p) => p.revenue > 0).toList();
    final topLtvCustomers = rankedCustomers.take(5).toList();
    final bottomLtvCustomers = _takeBottomRank(rankedCustomers, 5);
    final topProducts = rankedProducts.take(5).toList();
    final bottomProducts = _takeBottomRank(rankedProducts, 5);
    final attainments = _mapMetric(
      data,
      weekly: (w) => w.attainmentPercent,
      monthly: (m) => m.attainmentPercent,
      quarterly: (q) => q.attainmentPercent,
      annual: (y) => y.attainmentPercent,
    );
    final margins = _mapMetric(
      data,
      weekly: (w) => w.marginPercent,
      monthly: (m) => m.marginPercent,
      quarterly: (q) => q.marginPercent,
      annual: (y) => y.marginPercent,
    );
    final shipmentDays = _mapMetric(
      data,
      weekly: (w) => w.avgShipmentDays,
      monthly: (m) => m.avgShipmentDays,
      quarterly: (q) => q.avgShipmentDays,
      annual: (y) => y.avgShipmentDays,
    );
    final invoiceDays = _mapMetric(
      data,
      weekly: (w) => w.avgInvoiceDays,
      monthly: (m) => m.avgInvoiceDays,
      quarterly: (q) => q.avgInvoiceDays,
      annual: (y) => y.avgInvoiceDays,
    );
    final firstPaymentDays = _mapMetric(
      data,
      weekly: (w) => w.avgFirstPaymentDays,
      monthly: (m) => m.avgFirstPaymentDays,
      quarterly: (q) => q.avgFirstPaymentDays,
      annual: (y) => y.avgFirstPaymentDays,
    );
    final paymentDays = _mapMetric(
      data,
      weekly: (w) => w.avgPaymentDays,
      monthly: (m) => m.avgPaymentDays,
      quarterly: (q) => q.avgPaymentDays,
      annual: (y) => y.avgPaymentDays,
    );
    final labels = _labels(data);
    final hasAov = aovValues.any((v) => v != null);
    final hasBasket = basketValues.any((v) => v != null);
    final hasFrequency = frequencyValues.any((v) => v != null);
    final hasLtv = ltvValues.any((v) => v != null);
    final hasTopLtv = topLtvCustomers.isNotEmpty;
    final hasBottomLtv = bottomLtvCustomers.isNotEmpty;
    final hasProductRevenue = productRevenueValues.any((v) => v != null);
    final hasTopProducts = topProducts.isNotEmpty;
    final hasBottomProducts = bottomProducts.isNotEmpty;
    final hasAttainment = attainments.any((v) => v != null);
    final hasMargin = margins.any((v) => v != null);
    final hasShipment = shipmentDays.any((v) => v != null);
    final hasInvoice = invoiceDays.any((v) => v != null);
    final hasFirstPayment = firstPaymentDays.any((v) => v != null);
    final hasPayment = paymentDays.any((v) => v != null);
    final statusMixRows = _statusMixRows(data);
    final paymentMixRows = _paymentMixRows(data);
    final hasStatusMix = statusMixRows.isNotEmpty;
    final hasPaymentMix = paymentMixRows.isNotEmpty;

    final empty = !_loading &&
        _error == null &&
        revenues.every((v) => v <= 0) &&
        orders.every((v) => v <= 0);

    _fsDeck.begin();

    return SoftSurface(
      child: PopScope(
        canPop: _fsIndex == null,
        onPopInvokedWithResult: (didPop, _) {
          if (didPop || _fsIndex == null) return;
          setState(() => _fsIndex = null);
        },
        child: Stack(
        children: [
          Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          title: const Text('Analytics'),
        ),
        body: _FsDeckScope(
          deck: _fsDeck,
          openFullscreen: (index) {
            setState(() => _fsIndex = index);
          },
          child: ListView(
          padding: listChromePadding(context).copyWith(top: 8),
          children: [
            const PageIntro(
              subtitle:
                  'Trends for revenue, targets, margins, and fulfillment lead times.',
            ),
            if (_error != null) ErrorBanner(message: _error!),
            const SectionLabel(
              'Period',
              subtitle: 'Pick Weekly, Monthly, or Annual, then choose the timeline.',
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: FormSection(
                title: 'Chart focus',
                description: _periodDescription,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    ExpandableFilters(
                      title: 'Period',
                      idleHint: switch (_granularity) {
                        _Granularity.weekly => 'Weekly',
                        _Granularity.monthly => 'Monthly',
                        _Granularity.quarterly => 'Quarterly',
                        _Granularity.annual => 'Annual',
                      },
                      activeCount: (_granularity != _Granularity.monthly
                              ? 1
                              : 0) +
                          (_year != DateTime.now().toUtc().year ? 1 : 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'View',
                            style: Theme.of(context)
                                .textTheme
                                .labelLarge
                                ?.copyWith(
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
                              _ensureSeriesLoaded();
                            },
                            options: const [
                              ChoiceOption(
                                value: _Granularity.weekly,
                                label: 'Weekly',
                              ),
                              ChoiceOption(
                                value: _Granularity.monthly,
                                label: 'Monthly',
                              ),
                              ChoiceOption(
                                value: _Granularity.quarterly,
                                label: 'Quarterly',
                              ),
                              ChoiceOption(
                                value: _Granularity.annual,
                                label: 'Annual',
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Text(
                            'Timeline',
                            style: Theme.of(context)
                                .textTheme
                                .labelLarge
                                ?.copyWith(
                                  color: UmkmColors.muted,
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                          const SizedBox(height: 8),
                          DropdownButtonFormField<int?>(
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
                            items: [
                              const DropdownMenuItem<int?>(
                                value: null,
                                child: Text('All timelines'),
                              ),
                              ..._yearOptions.map(
                                (y) => DropdownMenuItem<int?>(
                                  value: y,
                                  child: Text('$y'),
                                ),
                              ),
                            ],
                            onChanged: (v) {
                              setState(() => _year = v);
                              _load();
                            },
                          ),
                          if (_granularity == _Granularity.annual &&
                              _year != null) ...[
                            const SizedBox(height: 12),
                            Container(
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
                                'Window $_annualWindowLabel',
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  color: UmkmColors.brandDeep,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 15,
                                  letterSpacing: -0.2,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      'Display',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: UmkmColors.muted,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 8),
                    ChoiceChipGroup<_ChartView>(
                      value: _chartView,
                      onChanged: (v) {
                        if (v == null) return;
                        setState(() => _chartView = v);
                      },
                      options: const [
                        ChoiceOption(
                          value: _ChartView.graph,
                          label: 'Graph',
                        ),
                        ChoiceOption(
                          value: _ChartView.table,
                          label: 'Table',
                        ),
                      ],
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
                          label: 'Net revenue',
                          value: data == null ? '—' : _fmtMoney(data.revenue),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: MetricTile(
                          label: 'Orders',
                          value: data == null
                              ? '—'
                              : _fmtQty(data.orderCount.toDouble()),
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
                          label: 'UPT',
                          value: data?.avgBasketSize == null
                              ? '—'
                              : _fmtQty(data!.avgBasketSize!),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: MetricTile(
                          label: 'APF',
                          value: data?.avgPurchaseFrequency == null
                              ? '—'
                              : _fmtQty(data!.avgPurchaseFrequency!),
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Expanded(child: SizedBox.shrink()),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: MetricTile(
                          label: 'Sales target rate',
                          value: data?.attainmentPercent == null
                              ? '—'
                              : '${data!.attainmentPercent!.toStringAsFixed(1)}%',
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: MetricTile(
                          label: 'Margin',
                          value: data?.marginPercent == null
                              ? '—'
                              : '${data!.marginPercent!.toStringAsFixed(1)}%',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: MetricTile(
                          label: 'Avg ship',
                          value: data?.avgShipmentDays == null
                              ? '—'
                              : '${data!.avgShipmentDays!.toStringAsFixed(1)} d',
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: MetricTile(
                          label: 'Avg invoice',
                          value: data?.avgInvoiceDays == null
                              ? '—'
                              : '${data!.avgInvoiceDays!.toStringAsFixed(1)} d',
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
                      const Expanded(child: SizedBox.shrink()),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: MetricTile(
                          label: 'LTV buyers',
                          value: data == null
                              ? '—'
                              : '${data.ltvCustomerCount}',
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: MetricTile(
                          label: 'Avg product',
                          value: data?.avgProductRevenue == null
                              ? '—'
                              : _fmtMoney(data!.avgProductRevenue!),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: MetricTile(
                          label: 'Products sold',
                          value: data == null
                              ? '—'
                              : '${data.productSaleCount}',
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Expanded(child: SizedBox.shrink()),
                    ],
                  ),
                ],
              ),
            ),
            SectionLabel(
              switch (_granularity) {
                _Granularity.weekly => 'Weekly charts',
                _Granularity.monthly => 'Monthly charts',
                _Granularity.quarterly => 'Quarterly charts',
                _Granularity.annual => 'Annual charts',
              },
              subtitle: hasTarget
                  ? 'Net revenue (teal) vs target (amber). Rates and lead times follow.'
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
                subtitle:
                    'Net revenue (after discount), order volume, ticket size, and units per transaction.',
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'Net revenue',
                  view: _chartView,
                  child: _RevenueChart(
                    labels: labels,
                    revenues: revenues,
                    targets: hasTarget ? targets : null,
                  ),
                  table: _MetricTable(
                    columns: [
                      _periodAxisLabel,
                      'Net revenue',
                      if (hasTarget) 'Target',
                    ],
                    rows: [
                      for (var i = 0; i < labels.length; i++)
                        [
                          labels[i],
                          _fmtMoney(revenues[i]),
                          if (hasTarget) _fmtNullableMoney(targets[i]),
                        ],
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'Orders',
                  view: _chartView,
                  child: _OrdersChart(labels: labels, orders: orders),
                  table: _periodValueTable(
                    periodLabel: _periodAxisLabel,
                    labels: labels,
                    valueLabel: 'Orders',
                    values: [
                      for (final o in orders) formatCompactQty(o),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'Average order value',
                  view: _chartView,
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
                  table: hasAov
                      ? _periodValueTable(
                          periodLabel: _periodAxisLabel,
                          labels: labels,
                          valueLabel: 'AOV',
                          values: [
                            for (final v in aovValues) _fmtNullableMoney(v),
                          ],
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
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'Units Per Transaction',
                  view: _chartView,
                  child: hasBasket
                      ? _RateChart(
                          labels: labels,
                          values: basketValues,
                          color: const Color(0xFF6B9140),
                          unit: 'qty',
                        )
                      : const Center(
                          child: Text(
                            'Create orders to see units per transaction',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                  table: hasBasket
                      ? _periodValueTable(
                          periodLabel: _periodAxisLabel,
                          labels: labels,
                          valueLabel: 'UPT',
                          values: [
                            for (final v in basketValues) _fmtNullableQty(v),
                          ],
                        )
                      : const Center(
                          child: Text(
                            'Create orders to see units per transaction',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'Average purchase frequency',
                  view: _chartView,
                  child: hasFrequency
                      ? _RateChart(
                          labels: labels,
                          values: frequencyValues,
                          color: const Color(0xFF8B5E3C),
                          unit: 'qty',
                        )
                      : const Center(
                          child: Text(
                            'Link customers on orders to see purchase frequency',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                  table: hasFrequency
                      ? _periodValueTable(
                          periodLabel: _periodAxisLabel,
                          labels: labels,
                          valueLabel: 'APF',
                          values: [
                            for (final v in frequencyValues)
                              _fmtNullableQty(v),
                          ],
                        )
                      : const Center(
                          child: Text(
                            'Link customers on orders to see purchase frequency',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                ),
              ),
              const SectionLabel(
                'Rates',
                subtitle:
                    'How much of the revenue target you’ve reached, plus profit margin.',
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: '% of revenue target',
                  view: _chartView,
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
                            'Set Targets to see how revenue tracks against plan',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                  table: hasAttainment
                      ? _periodValueTable(
                          periodLabel: _periodAxisLabel,
                          labels: labels,
                          valueLabel: '% of target',
                          values: [
                            for (final v in attainments) _fmtNullablePct(v),
                          ],
                        )
                      : const Center(
                          child: Text(
                            'Set Targets to see how revenue tracks against plan',
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
                  view: _chartView,
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
                  table: hasMargin
                      ? _periodValueTable(
                          periodLabel: _periodAxisLabel,
                          labels: labels,
                          valueLabel: 'Margin',
                          values: [
                            for (final v in margins) _fmtNullablePct(v),
                          ],
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
                'Order mix',
                subtitle:
                    'Share of orders by status (includes cancelled) and payment mode (active orders).',
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'Order status mix',
                  view: _chartView,
                  height: 260,
                  child: hasStatusMix
                      ? _StackedMixChart(
                          labels:
                              statusMixRows.map((r) => r.label).toList(),
                          series: _statusMixSeries,
                          valuesFor: (i) => [
                            for (final s in _statusMixSeries)
                              statusMixRows[i].mix.statusShares[s.key] ?? 0,
                          ],
                        )
                      : const Center(
                          child: Text(
                            'No orders in this period',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                  table: hasStatusMix
                      ? _MetricTable(
                          columns: [
                            _periodAxisLabel,
                            for (final s in _statusMixSeries) s.label,
                            'Orders',
                          ],
                          rows: [
                            for (final row in statusMixRows)
                              [
                                row.label,
                                for (final s in _statusMixSeries)
                                  _fmtNullablePct(
                                    row.mix.statusShares[s.key],
                                  ),
                                formatCompactQty(row.mix.statusOrderCount),
                              ],
                          ],
                        )
                      : const Center(
                          child: Text(
                            'No orders in this period',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'Payment mode mix',
                  view: _chartView,
                  height: 260,
                  child: hasPaymentMix
                      ? _StackedMixChart(
                          labels:
                              paymentMixRows.map((r) => r.label).toList(),
                          series: _paymentMixSeries,
                          valuesFor: (i) => [
                            for (final s in _paymentMixSeries)
                              paymentMixRows[i].mix.paymentShares[s.key] ?? 0,
                          ],
                        )
                      : const Center(
                          child: Text(
                            'No active orders in this period',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                  table: hasPaymentMix
                      ? _MetricTable(
                          columns: [
                            _periodAxisLabel,
                            for (final s in _paymentMixSeries) s.label,
                            'Orders',
                          ],
                          rows: [
                            for (final row in paymentMixRows)
                              [
                                row.label,
                                for (final s in _paymentMixSeries)
                                  _fmtNullablePct(
                                    row.mix.paymentShares[s.key],
                                  ),
                                formatCompactQty(row.mix.paymentOrderCount),
                              ],
                          ],
                        )
                      : const Center(
                          child: Text(
                            'No active orders in this period',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                ),
              ),
              const SectionLabel(
                'Lead times',
                subtitle:
                    'Average days to ship, invoice, first payment, and last payment.',
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'Shipment duration',
                  view: _chartView,
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
                  table: hasShipment
                      ? _periodValueTable(
                          periodLabel: _periodAxisLabel,
                          labels: labels,
                          valueLabel: 'Avg days',
                          values: [
                            for (final v in shipmentDays) _fmtNullableDays(v),
                          ],
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
                  title: 'Invoice duration',
                  view: _chartView,
                  child: hasInvoice
                      ? _RateChart(
                          labels: labels,
                          values: invoiceDays,
                          color: const Color(0xFF5C7A6E),
                          unit: 'd',
                        )
                      : const Center(
                          child: Text(
                            'Set invoice dates on orders to see lead time',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                  table: hasInvoice
                      ? _periodValueTable(
                          periodLabel: _periodAxisLabel,
                          labels: labels,
                          valueLabel: 'Avg days',
                          values: [
                            for (final v in invoiceDays) _fmtNullableDays(v),
                          ],
                        )
                      : const Center(
                          child: Text(
                            'Set invoice dates on orders to see lead time',
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
                  view: _chartView,
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
                  table: hasFirstPayment
                      ? _periodValueTable(
                          periodLabel: _periodAxisLabel,
                          labels: labels,
                          valueLabel: 'Avg days',
                          values: [
                            for (final v in firstPaymentDays)
                              _fmtNullableDays(v),
                          ],
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
                  view: _chartView,
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
                  table: hasPayment
                      ? _periodValueTable(
                          periodLabel: _periodAxisLabel,
                          labels: labels,
                          valueLabel: 'Avg days',
                          values: [
                            for (final v in paymentDays) _fmtNullableDays(v),
                          ],
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
                    'Avg LTV is linked revenue ÷ active customers; Top 5 and Bottom 5 use year revenue.',
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'Average LTV',
                  view: _chartView,
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
                  table: hasLtv
                      ? _periodValueTable(
                          periodLabel: _periodAxisLabel,
                          labels: labels,
                          valueLabel: 'Avg LTV',
                          values: [
                            for (final v in ltvValues) _fmtNullableMoney(v),
                          ],
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
                  title: 'Top 5 customers by LTV',
                  view: _chartView,
                  height: _rankChartHeight(topLtvCustomers.length),
                  child: hasTopLtv
                      ? _RankLtvList(customers: topLtvCustomers)
                      : const Center(
                          child: Text(
                            'Assign customers on orders to see the ranking',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                  table: _customerRankTable(topLtvCustomers),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'Bottom 5 customers by LTV',
                  view: _chartView,
                  height: _rankChartHeight(bottomLtvCustomers.length),
                  child: hasBottomLtv
                      ? _RankLtvList(
                          customers: bottomLtvCustomers,
                          barColor: const Color(0xFF6B8499),
                        )
                      : const Center(
                          child: Text(
                            'Assign customers on orders to see the ranking',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                  table: _customerRankTable(bottomLtvCustomers),
                ),
              ),
            ],
            if (!_loading) ...[
              const SectionLabel(
                'Product value',
                subtitle:
                    'Avg product revenue is net sales ÷ products sold; Top 5 and Bottom 5 use year revenue.',
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'Average product revenue',
                  view: _chartView,
                  child: hasProductRevenue
                      ? _RateChart(
                          labels: labels,
                          values: productRevenueValues,
                          color: const Color(0xFF1F7A66),
                          unit: 'money',
                        )
                      : const Center(
                          child: Text(
                            'Orders unlock average product revenue trends',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                  table: hasProductRevenue
                      ? _periodValueTable(
                          periodLabel: _periodAxisLabel,
                          labels: labels,
                          valueLabel: 'Avg product revenue',
                          values: [
                            for (final v in productRevenueValues)
                              _fmtNullableMoney(v),
                          ],
                        )
                      : const Center(
                          child: Text(
                            'Orders unlock average product revenue trends',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'Top 5 products by revenue',
                  view: _chartView,
                  height: _rankChartHeight(topProducts.length),
                  child: hasTopProducts
                      ? _RankProductList(products: topProducts)
                      : const Center(
                          child: Text(
                            'No product ranking yet for this year',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                  table: _productRankTable(topProducts),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: _ChartCard(
                  title: 'Bottom 5 products by revenue',
                  view: _chartView,
                  height: _rankChartHeight(bottomProducts.length),
                  child: hasBottomProducts
                      ? _RankProductList(
                          products: bottomProducts,
                          barColor: const Color(0xFF6A9084),
                        )
                      : const Center(
                          child: Text(
                            'No product ranking yet for this year',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: UmkmColors.muted),
                          ),
                        ),
                  table: _productRankTable(bottomProducts),
                ),
              ),
              SectionLabel(
                'Products · $_scopeLabel',
                subtitle:
                    'Revenue shows gross (primary) and net (subline). Rates are shares of gross revenue.',
              ),
              if (_tablesLoading)
                const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (data == null || data.products.isEmpty)
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 0, 16, 24),
                  child: EmptyHint(
                    title: 'No product sales yet',
                    message:
                        'Orders in this year will appear here with gross revenue, net revenue, discount, cost, and margin.',
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
                        '${_fmtQty(p.orderCount.toDouble())} orders · ${_fmtQty(p.packsSold)} packs',
                      ],
                      metrics: [
                        (
                          'Revenue',
                          '${_fmtMoney(p.grossRevenue)}\nGross · Net ${_fmtMoney(p.revenue)}',
                        ),
                        (
                          'Discount',
                          p.discount > 0
                              ? p.discountPercent != null
                                  ? '${_fmtMoney(p.discount)} · ${p.discountPercent!.toStringAsFixed(1)}%'
                                  : _fmtMoney(p.discount)
                              : '—',
                        ),
                        if (p.avgOrderValue != null)
                          ('AOV', _fmtMoney(p.avgOrderValue!)),
                        (
                          'Repeat',
                          _formatRepeatDays(
                            first: p.firstRepeatOrderDays,
                            avg: p.avgRepeatOrderDays,
                          ),
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
                'Customers · $_scopeLabel',
                subtitle:
                    'Same metrics as products, grouped by CRM customer on each order.',
              ),
              if (_tablesLoading)
                const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (data == null || data.customers.isEmpty)
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 0, 16, 24),
                  child: EmptyHint(
                    title: 'No customer sales yet',
                    message:
                        'Assign a customer on orders to see gross revenue, net revenue, discount, cost, and profit here.',
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
                        '${_fmtQty(c.orderCount.toDouble())} orders · ${_fmtQty(c.packsSold)} packs',
                      ],
                      metrics: [
                        (
                          'Revenue',
                          '${_fmtMoney(c.grossRevenue)}\nGross · Net ${_fmtMoney(c.revenue)}',
                        ),
                        (
                          'Discount',
                          c.discount > 0
                              ? c.discountPercent != null
                                  ? '${_fmtMoney(c.discount)} · ${c.discountPercent!.toStringAsFixed(1)}%'
                                  : _fmtMoney(c.discount)
                              : '—',
                        ),
                        if (c.avgOrderValue != null)
                          ('AOV', _fmtMoney(c.avgOrderValue!)),
                        (
                          'Repeat',
                          _formatRepeatDays(
                            first: c.firstRepeatOrderDays,
                            avg: c.avgRepeatOrderDays,
                          ),
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
      ),
          if (_fsIndex != null)
            Positioned.fill(
              child: _ImmersiveFullscreenChart(
                slides: _fsDeck.snapshot(),
                initialIndex: _fsIndex!,
                granularity: _granularity,
                chartView: _chartView,
                onGranularityChanged: (v) {
                  setState(() => _granularity = v);
                  _ensureSeriesLoaded();
                },
                onChartViewChanged: (v) {
                  setState(() => _chartView = v);
                },
                onClose: () => setState(() => _fsIndex = null),
              ),
            ),
        ],
      ),
      ),
    );
  }
}

/// Compact height for top/bottom-5 ranking lists (shrinks when fewer rows).
double _rankChartHeight(int count) {
  final n = count.clamp(1, 5);
  // Abbreviation + muted full name + bar.
  return 52.0 * n + 28.0;
}

/// `rows` must already be sorted highest-first.
List<T> _takeBottomRank<T>(List<T> rows, int n) {
  if (rows.isEmpty) return <T>[];
  final slice = rows.length <= n ? rows : rows.sublist(rows.length - n);
  return slice.reversed.toList();
}

String _rankDetailLine({
  required int orderCount,
  required double packsSold,
  required double? avgOrderValue,
}) {
  final upt = orderCount > 0 ? packsSold / orderCount : null;
  final parts = <String>[
    '${formatCompactQty(orderCount)} orders',
    '${formatCompactQty(packsSold)} packs',
    if (avgOrderValue != null) 'AOV ${formatMoney(avgOrderValue)}',
    if (upt != null) 'UPT ${formatCompactQty(upt)}',
  ];
  return parts.join(' · ');
}

String _formatRepeatDays({
  required double? first,
  required double? avg,
}) {
  if (first == null && avg == null) return '—';
  final firstLabel =
      first == null ? '—' : '${first.toStringAsFixed(first % 1 == 0 ? 0 : 1)} d';
  if (avg == null) return firstLabel;
  final avgLabel = '${avg.toStringAsFixed(avg % 1 == 0 ? 0 : 1)} d';
  return '$firstLabel · avg $avgLabel';
}

enum _ChartView { graph, table }

class _FsSlide {
  const _FsSlide({required this.title, required this.builder});

  final String title;
  /// Builds a fresh chart/table instance for the immersive deck (avoids
  /// sharing one element between the list card and the fullscreen route).
  final Widget Function() builder;
}

class _FsDeck {
  final List<_FsSlide> slides = <_FsSlide>[];

  void begin() => slides.clear();

  int add(_FsSlide slide) {
    slides.add(slide);
    return slides.length - 1;
  }

  List<_FsSlide> snapshot() => List<_FsSlide>.from(slides);
}

class _FsDeckScope extends InheritedWidget {
  const _FsDeckScope({
    required this.deck,
    required this.openFullscreen,
    required super.child,
  });

  final _FsDeck deck;
  final void Function(int index) openFullscreen;

  static _FsDeckScope? maybeOf(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<_FsDeckScope>();
  }

  @override
  bool updateShouldNotify(_FsDeckScope oldWidget) =>
      deck != oldWidget.deck || openFullscreen != oldWidget.openFullscreen;
}

/// Edge-to-edge immersive chart/table view (hides system bars).
class _ImmersiveFullscreenChart extends StatefulWidget {
  const _ImmersiveFullscreenChart({
    required this.slides,
    required this.initialIndex,
    required this.granularity,
    required this.chartView,
    required this.onGranularityChanged,
    required this.onChartViewChanged,
    required this.onClose,
  });

  final List<_FsSlide> slides;
  final int initialIndex;
  final _Granularity granularity;
  final _ChartView chartView;
  final ValueChanged<_Granularity> onGranularityChanged;
  final ValueChanged<_ChartView> onChartViewChanged;
  final VoidCallback onClose;

  @override
  State<_ImmersiveFullscreenChart> createState() =>
      _ImmersiveFullscreenChartState();
}

class _ImmersiveFullscreenChartState extends State<_ImmersiveFullscreenChart> {
  late final PageController _pageController;
  late int _index;

  @override
  void initState() {
    super.initState();
    _index = widget.slides.isEmpty
        ? 0
        : widget.initialIndex.clamp(0, widget.slides.length - 1);
    _pageController = PageController(initialPage: _index);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  @override
  void didUpdateWidget(covariant _ImmersiveFullscreenChart oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.slides.isEmpty) return;
    final next = _index.clamp(0, widget.slides.length - 1);
    if (next != _index) {
      _index = next;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted || !_pageController.hasClients) return;
        _pageController.jumpToPage(_index);
      });
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    SystemChrome.setEnabledSystemUIMode(
      SystemUiMode.edgeToEdge,
      overlays: SystemUiOverlay.values,
    );
    super.dispose();
  }

  void _goRelative(int delta) {
    final count = widget.slides.length;
    if (count < 2) return;
    final target = (_index + delta + count) % count;
    _pageController.animateToPage(
      target,
      duration: const Duration(milliseconds: 240),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final topInset = MediaQuery.paddingOf(context).top;
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    final count = widget.slides.length;
    if (count == 0) {
      return Material(
        color: UmkmColors.bg,
        child: Center(
          child: TextButton(
            onPressed: widget.onClose,
            child: const Text('Close'),
          ),
        ),
      );
    }
    final safeIndex = _index.clamp(0, count - 1);
    final slide = widget.slides[safeIndex];
    final prev = count > 1
        ? widget.slides[(_index - 1 + count) % count]
        : null;
    final next = count > 1 ? widget.slides[(_index + 1) % count] : null;
    final prevIndex = count > 1 ? (_index - 1 + count) % count : null;
    final nextIndex = count > 1 ? (_index + 1) % count : null;

    final progress = count > 0 ? (_index + 1) / count : 0.0;

    return Material(
      color: UmkmColors.bg,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(height: topInset > 0 ? topInset * 0.35 : 0),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 4, 14, 0),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(99),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 3,
                backgroundColor: UmkmColors.brandDeep.withValues(alpha: 0.1),
                color: UmkmColors.brand,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: UmkmColors.brandSoft,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                color: UmkmColors.brand.withValues(alpha: 0.22),
                              ),
                            ),
                            child: Text(
                              '${_index + 1} / $count',
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.5,
                                color: UmkmColors.brandDeep,
                                fontFeatures: [FontFeature.tabularFigures()],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        slide.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.35,
                          height: 1.15,
                          color: UmkmColors.brandDeep,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Exit fullscreen',
                  icon: const Icon(Icons.close_rounded),
                  color: UmkmColors.brandDeep,
                  onPressed: widget.onClose,
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ChoiceChipGroup<_Granularity>(
                  value: widget.granularity,
                  onChanged: (v) {
                    if (v == null) return;
                    widget.onGranularityChanged(v);
                  },
                  options: const [
                    ChoiceOption(
                      value: _Granularity.weekly,
                      label: 'Weekly',
                    ),
                    ChoiceOption(
                      value: _Granularity.monthly,
                      label: 'Monthly',
                    ),
                    ChoiceOption(
                      value: _Granularity.quarterly,
                      label: 'Quarterly',
                    ),
                    ChoiceOption(
                      value: _Granularity.annual,
                      label: 'Annual',
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ChoiceChipGroup<_ChartView>(
                  value: widget.chartView,
                  onChanged: (v) {
                    if (v == null) return;
                    widget.onChartViewChanged(v);
                  },
                  options: const [
                    ChoiceOption(
                      value: _ChartView.graph,
                      label: 'Graph',
                    ),
                    ChoiceOption(
                      value: _ChartView.table,
                      label: 'Table',
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: PageView.builder(
              controller: _pageController,
              itemCount: count,
              allowImplicitScrolling: false,
              onPageChanged: (value) => setState(() => _index = value),
              itemBuilder: (context, i) {
                return Padding(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
                  child: KeyedSubtree(
                    key: ValueKey<String>(
                      'fs-${widget.slides[i].title}-$i-${widget.granularity.name}-${widget.chartView.name}',
                    ),
                    child: SizedBox.expand(
                      child: widget.slides[i].builder(),
                    ),
                  ),
                );
              },
            ),
          ),
          if (count > 1) ...[
            const Divider(height: 1),
            Padding(
              padding: EdgeInsets.fromLTRB(12, 12, 12, 10 + bottomInset * 0.4),
              child: Column(
                children: [
                  Row(
                    children: [
                      if (prev != null && prevIndex != null)
                        Expanded(
                          child: _FsNeighborButton(
                            kicker: 'Previous',
                            title: prev.title,
                            indexLabel: '${prevIndex + 1}/$count',
                            leading: true,
                            onTap: () => _goRelative(-1),
                          ),
                        ),
                      if (prev != null && next != null)
                        const SizedBox(width: 8),
                      if (next != null && nextIndex != null)
                        Expanded(
                          child: _FsNeighborButton(
                            kicker: 'Next',
                            title: next.title,
                            indexLabel: '${nextIndex + 1}/$count',
                            leading: false,
                            onTap: () => _goRelative(1),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        for (var i = 0; i < count; i++) ...[
                          if (i > 0) const SizedBox(width: 6),
                          GestureDetector(
                            onTap: () {
                              _pageController.animateToPage(
                                i,
                                duration: const Duration(milliseconds: 240),
                                curve: Curves.easeOutCubic,
                              );
                            },
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 180),
                              width: i == _index ? 18 : 7,
                              height: 7,
                              decoration: BoxDecoration(
                                color: i == _index
                                    ? UmkmColors.brand
                                    : UmkmColors.brandDeep.withValues(
                                        alpha: 0.18,
                                      ),
                                borderRadius: BorderRadius.circular(99),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _FsNeighborButton extends StatelessWidget {
  const _FsNeighborButton({
    required this.kicker,
    required this.title,
    required this.indexLabel,
    required this.leading,
    required this.onTap,
  });

  final String kicker;
  final String title;
  final String indexLabel;
  final bool leading;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final arrow = Icon(
      leading ? Icons.chevron_left_rounded : Icons.chevron_right_rounded,
      color: UmkmColors.brand,
      size: 22,
    );
    final copy = Expanded(
      child: Column(
        crossAxisAlignment:
            leading ? CrossAxisAlignment.start : CrossAxisAlignment.end,
        children: [
          Text(
            kicker.toUpperCase(),
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.7,
              color: UmkmColors.muted,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            textAlign: leading ? TextAlign.left : TextAlign.right,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              height: 1.2,
              color: UmkmColors.brandDeep,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            indexLabel,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: UmkmColors.muted,
              fontFeatures: [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );

    return Material(
      color: UmkmColors.surface,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.fromLTRB(8, 10, 8, 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: UmkmColors.line.withValues(alpha: 0.9)),
          ),
          child: Row(
            children: leading ? [arrow, copy] : [copy, arrow],
          ),
        ),
      ),
    );
  }
}

class _ChartCard extends StatelessWidget {
  const _ChartCard({
    required this.title,
    required this.child,
    required this.view,
    this.table,
    this.height = 220,
  });

  final String title;
  final Widget child;
  /// Controlled by the Analytics Period → Display Graph | Table toggle.
  final _ChartView view;
  /// Shown when [view] is table (falls back to [child] if omitted).
  final Widget? table;
  final double height;

  @override
  Widget build(BuildContext context) {
    final showTable = table != null && view == _ChartView.table;
    final content = showTable ? table! : child;
    final bodyHeight = showTable ? (height < 240 ? 240.0 : height) : height;
    final scope = _FsDeckScope.maybeOf(context);
    final index = scope?.deck.add(
          _FsSlide(
            title: title,
            builder: () => showTable ? table! : child,
          ),
        ) ??
        0;

    return FormSection(
      title: title,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Align(
            alignment: Alignment.centerRight,
            child: IconButton(
              tooltip: 'Fullscreen',
              visualDensity: VisualDensity.compact,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
              icon: const Icon(Icons.fullscreen_rounded),
              color: UmkmColors.brand,
              onPressed: scope == null
                  ? null
                  : () => scope.openFullscreen(index),
            ),
          ),
          SizedBox(
            height: bodyHeight,
            child: showTable
                ? content
                : _ViewportLazy(
                    height: bodyHeight,
                    child: content,
                  ),
          ),
        ],
      ),
    );
  }
}

/// Builds heavy fl_chart trees only when near the scroll viewport.
class _ViewportLazy extends StatefulWidget {
  const _ViewportLazy({
    required this.child,
    required this.height,
  });

  final Widget child;
  final double height;

  @override
  State<_ViewportLazy> createState() => _ViewportLazyState();
}

class _ViewportLazyState extends State<_ViewportLazy> {
  bool _ready = false;
  ScrollPosition? _position;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final scrollable = Scrollable.maybeOf(context);
    final next = scrollable?.position;
    if (!identical(_position, next)) {
      _position?.removeListener(_onScroll);
      _position = next;
      _position?.addListener(_onScroll);
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _onScroll());
  }

  @override
  void dispose() {
    _position?.removeListener(_onScroll);
    super.dispose();
  }

  void _onScroll() {
    if (!mounted || _ready) return;
    final box = context.findRenderObject();
    if (box is! RenderBox || !box.hasSize) return;
    final offset = box.localToGlobal(Offset.zero);
    final screenH = MediaQuery.sizeOf(context).height;
    final top = offset.dy;
    final bottom = top + box.size.height;
    // Mount when within ~1.25 screens of the visible area.
    final near = bottom > -screenH * 0.25 && top < screenH * 1.25;
    if (!near) return;
    setState(() => _ready = true);
    _position?.removeListener(_onScroll);
    _position = null;
  }

  @override
  Widget build(BuildContext context) {
    if (_ready) return widget.child;
    return SizedBox(
      height: widget.height,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: UmkmColors.surface.withOpacity(0.72),
          borderRadius: BorderRadius.circular(10),
        ),
      ),
    );
  }
}

class _MetricTable extends StatelessWidget {
  const _MetricTable({
    required this.columns,
    required this.rows,
    this.emptyMessage = 'No data for this period',
  });

  final List<String> columns;
  final List<List<String>> rows;
  final String emptyMessage;

  @override
  Widget build(BuildContext context) {
    if (rows.isEmpty) {
      return Center(
        child: Text(
          emptyMessage,
          textAlign: TextAlign.center,
          style: const TextStyle(color: UmkmColors.muted),
        ),
      );
    }

    final width = MediaQuery.sizeOf(context).width;
    final useCards = width < 600 && columns.length >= 3;

    if (useCards) {
      return ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: rows.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          final row = rows[index];
          final title = row.isNotEmpty ? row.first : '—';
          return DecoratedBox(
            decoration: BoxDecoration(
              color: UmkmColors.surface,
              borderRadius: BorderRadius.circular(UmkmSpace.radiusSm),
              border: Border.all(color: UmkmColors.line.withOpacity(0.75)),
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    title,
                    style: UmkmType.body(
                      size: 14.5,
                      weight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  for (var c = 1; c < columns.length; c++) ...[
                    if (c > 1) const SizedBox(height: 6),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            columns[c],
                            style: UmkmType.label(size: 10),
                          ),
                        ),
                        Flexible(
                          child: Text(
                            c < row.length ? row[c] : '—',
                            textAlign: TextAlign.right,
                            style: UmkmType.body(
                              size: 13,
                              weight: FontWeight.w700,
                              color: UmkmColors.brandDeep,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      );
    }

    return Scrollbar(
      child: SingleChildScrollView(
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            headingRowHeight: 36,
            dataRowMinHeight: 36,
            dataRowMaxHeight: 42,
            columnSpacing: 18,
            horizontalMargin: 10,
            columns: [
              for (final column in columns)
                DataColumn(
                  label: Text(
                    column,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: UmkmColors.muted,
                    ),
                  ),
                ),
            ],
            rows: [
              for (final row in rows)
                DataRow(
                  cells: [
                    for (final cell in row)
                      DataCell(
                        Text(cell, style: const TextStyle(fontSize: 12.5)),
                      ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}

Widget _periodValueTable({
  required String periodLabel,
  required List<String> labels,
  required String valueLabel,
  required List<String> values,
  String emptyMessage = 'No data for this period',
}) {
  final n = labels.length < values.length ? labels.length : values.length;
  return _MetricTable(
    columns: [periodLabel, valueLabel],
    emptyMessage: emptyMessage,
    rows: [
      for (var i = 0; i < n; i++) [labels[i], values[i]],
    ],
  );
}

String _fmtNullableMoney(double? value) =>
    value == null ? '—' : formatMoney(value);

String _fmtNullableQty(double? value) =>
    value == null ? '—' : formatCompactQty(value);

String _fmtNullablePct(double? value) {
  if (value == null) return '—';
  final digits = value % 1 == 0 ? 0 : 1;
  return '${value.toStringAsFixed(digits)}%';
}

String _fmtNullableDays(double? value) {
  if (value == null) return '—';
  final digits = value % 1 == 0 ? 0 : 1;
  return '${value.toStringAsFixed(digits)} d';
}

Widget _customerRankTable(List<AnalyticsCustomerRow> customers) {
  return _MetricTable(
    columns: const ['Customer', 'LTV', 'Orders', 'Packs', 'AOV', 'UPT'],
    emptyMessage: 'Assign customers on orders to see the ranking',
    rows: [
      for (final c in customers)
        [
          c.name,
          formatMoney(c.revenue),
          formatCompactQty(c.orderCount),
          formatCompactQty(c.packsSold),
          _fmtNullableMoney(c.avgOrderValue),
          c.orderCount <= 0
              ? '—'
              : formatCompactQty(c.packsSold / c.orderCount),
        ],
    ],
  );
}

Widget _productRankTable(List<AnalyticsProductRow> products) {
  return _MetricTable(
    columns: const ['Product', 'Revenue', 'Orders', 'Packs', 'AOV', 'UPT'],
    emptyMessage: 'No product ranking yet for this year',
    rows: [
      for (final p in products)
        [
          p.name,
          formatMoney(p.revenue),
          formatCompactQty(p.orderCount),
          formatCompactQty(p.packsSold),
          _fmtNullableMoney(p.avgOrderValue),
          p.orderCount <= 0
              ? '—'
              : formatCompactQty(p.packsSold / p.orderCount),
        ],
    ],
  );
}

class _MixSeriesDef {
  const _MixSeriesDef({
    required this.key,
    required this.label,
    required this.color,
  });

  final String key;
  final String label;
  final Color color;
}

const _statusMixSeries = [
  _MixSeriesDef(key: 'PENDING', label: 'Pending', color: Color(0xFF8A9B94)),
  _MixSeriesDef(key: 'CONFIRMED', label: 'Confirmed', color: Color(0xFF3D6B8F)),
  _MixSeriesDef(key: 'SHIPPED', label: 'Shipped', color: Color(0xFF7A6540)),
  _MixSeriesDef(key: 'DELIVERED', label: 'Delivered', color: Color(0xFF0B6B58)),
  _MixSeriesDef(key: 'CANCELLED', label: 'Cancelled', color: Color(0xFF9A4F3A)),
];

const _paymentMixSeries = [
  _MixSeriesDef(key: 'CASH', label: 'Cash', color: Color(0xFF0B6B58)),
  _MixSeriesDef(
    key: 'CONSIGNMENT',
    label: 'Consignment',
    color: Color(0xFFD97706),
  ),
  _MixSeriesDef(
    key: 'DELAYED_PAYMENT',
    label: 'Delayed',
    color: Color(0xFF3D6B8F),
  ),
  _MixSeriesDef(
    key: 'KONTRA_BON',
    label: 'Kontra bon',
    color: Color(0xFF7A4F8F),
  ),
];

class _StackedMixChart extends StatelessWidget {
  const _StackedMixChart({
    required this.labels,
    required this.series,
    required this.valuesFor,
  });

  final List<String> labels;
  final List<_MixSeriesDef> series;
  final List<double> Function(int index) valuesFor;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: BarChart(
            BarChartData(
              minY: 0,
              maxY: 100,
              gridData: FlGridData(
                show: true,
                drawVerticalLine: false,
                getDrawingHorizontalLine: (v) => FlLine(
                  color: UmkmColors.line.withOpacity(0.7),
                  strokeWidth: 1,
                  dashArray: const [4, 4],
                ),
              ),
              borderData: FlBorderData(show: false),
              titlesData: FlTitlesData(
                topTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                rightTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 36,
                    interval: 25,
                    getTitlesWidget: (value, meta) {
                      if (value != 0 &&
                          value != 25 &&
                          value != 50 &&
                          value != 75 &&
                          value != 100) {
                        return const SizedBox.shrink();
                      }
                      return Text(
                        '${value.toInt()}%',
                        style: const TextStyle(
                          fontSize: 10,
                          color: UmkmColors.muted,
                        ),
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
                for (var i = 0; i < labels.length; i++)
                  BarChartGroupData(
                    x: i,
                    barRods: [
                      BarChartRodData(
                        toY: 100,
                        width: labels.length > 8 ? 10 : 14,
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(4),
                        ),
                        rodStackItems: _stackItems(valuesFor(i)),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 10,
          runSpacing: 4,
          children: [
            for (final s in series)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: s.color,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    s.label,
                    style: const TextStyle(
                      fontSize: 11,
                      color: UmkmColors.muted,
                    ),
                  ),
                ],
              ),
          ],
        ),
      ],
    );
  }

  List<BarChartRodStackItem> _stackItems(List<double> values) {
    final items = <BarChartRodStackItem>[];
    var from = 0.0;
    for (var i = 0; i < series.length; i++) {
      final share = values[i].clamp(0.0, 100.0).toDouble();
      final to = (from + share).clamp(0.0, 100.0).toDouble();
      if (to > from) {
        items.add(BarChartRodStackItem(from, to, series[i].color));
      }
      from = to;
    }
    // Fill remainder so the rod always reaches 100% visually when rounding drifts.
    if (from < 100 && items.isNotEmpty) {
      final last = items.removeLast();
      items.add(BarChartRodStackItem(last.fromY, 100, last.color));
    }
    return items;
  }
}

class _RankLtvList extends StatelessWidget {
  const _RankLtvList({
    required this.customers,
    this.barColor = const Color(0xFF5C6BC0),
  });

  final List<AnalyticsCustomerRow> customers;
  final Color barColor;

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
        final short = abbreviateCustomerAxisLabel(c.name);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        short,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                      if (short != c.name)
                        Text(
                          c.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 11,
                            color: UmkmColors.muted,
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  formatMoney(c.revenue),
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                    color: barColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              _rankDetailLine(
                orderCount: c.orderCount,
                packsSold: c.packsSold,
                avgOrderValue: c.avgOrderValue,
              ),
              style: const TextStyle(
                fontSize: 11,
                color: UmkmColors.muted,
              ),
            ),
            const SizedBox(height: 4),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: fraction,
                minHeight: 6,
                backgroundColor: UmkmColors.line.withOpacity(0.45),
                color: barColor,
              ),
            ),
          ],
        );
      },
    );
  }
}

class _RankProductList extends StatelessWidget {
  const _RankProductList({
    required this.products,
    this.barColor = const Color(0xFF1F7A66),
  });

  final List<AnalyticsProductRow> products;
  final Color barColor;

  @override
  Widget build(BuildContext context) {
    final maxRevenue = products
        .map((p) => p.revenue)
        .fold<double>(0, (a, b) => a > b ? a : b);
    final denom = maxRevenue <= 0 ? 1.0 : maxRevenue;

    return ListView.separated(
      physics: const NeverScrollableScrollPhysics(),
      itemCount: products.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final p = products[index];
        final fraction = (p.revenue / denom).clamp(0.0, 1.0);
        final short = abbreviateProductAxisLabel(p.name);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        short,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                      if (short != p.name)
                        Text(
                          p.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 11,
                            color: UmkmColors.muted,
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  formatMoney(p.revenue),
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                    color: barColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              _rankDetailLine(
                orderCount: p.orderCount,
                packsSold: p.packsSold,
                avgOrderValue: p.avgOrderValue,
              ),
              style: const TextStyle(
                fontSize: 11,
                color: UmkmColors.muted,
              ),
            ),
            const SizedBox(height: 4),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: fraction,
                minHeight: 6,
                backgroundColor: UmkmColors.line.withOpacity(0.45),
                color: barColor,
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
    final valuesForDomain = [
      ...revenues,
      if (targets != null) ...targets!.whereType<double>(),
    ];
    final (minY, maxY) = paddedDomain(valuesForDomain, nonNegative: true);

    return BarChart(
      BarChartData(
        minY: minY,
        maxY: maxY,
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
        barTouchData: BarTouchData(
          enabled: true,
          touchTooltipData: BarTouchTooltipData(
            getTooltipItem: (group, groupIndex, rod, rodIndex) {
              final i = group.x;
              if (i < 0 || i >= labels.length) return null;
              final isTarget = targets != null && rodIndex == 1;
              final series = isTarget ? 'Target' : 'Revenue';
              final growth = isTarget
                  ? growthLabelAt(
                      targets!,
                      i,
                      mode: GrowthMode.pct,
                    )
                  : growthLabelAtDoubles(
                      revenues,
                      i,
                      mode: GrowthMode.pct,
                    );
              final value = formatMoney(rod.toY);
              final growthText = growth == null ? '' : ' ($growth)';
              return BarTooltipItem(
                '${labels[i]}\n$series $value$growthText',
                const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
              );
            },
          ),
        ),
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
                  gradient: const LinearGradient(
                    colors: [Color(0xFF1A9A7E), Color(0xFF0B6B58)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
                if (targets != null)
                  BarChartRodData(
                    toY: targets![i] ?? 0,
                    width: labels.length > 8 ? 8 : 12,
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(5),
                    ),
                    color: const Color(0xFFD97706),
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
    final (minY, maxY) = paddedDomain(orders, nonNegative: true);

    return BarChart(
      BarChartData(
        minY: minY,
        maxY: maxY,
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
        barTouchData: BarTouchData(
          enabled: true,
          touchTooltipData: BarTouchTooltipData(
            getTooltipItem: (group, groupIndex, rod, rodIndex) {
              final i = group.x;
              if (i < 0 || i >= labels.length) return null;
              final growth = growthLabelAtDoubles(orders, i);
              final growthText = growth == null ? '' : ' ($growth)';
              return BarTooltipItem(
                '${labels[i]}\nOrders ${formatCompactQty(rod.toY)}$growthText',
                const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
              );
            },
          ),
        ),
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
    final domainValues = <double?>[
      ...known,
      if (reference != null) reference,
    ];
    final (bottom, top) = paddedDomain(
      domainValues,
      nonNegative: unit != '%' || (known.isEmpty || known.every((v) => v >= 0)),
    );

    final spots = <FlSpot>[
      for (var i = 0; i < values.length; i++)
        if (values[i] != null) FlSpot(i.toDouble(), values[i]!),
    ];

    String axisLabel(double value) {
      if (unit == '%') return '${value.toStringAsFixed(0)}%';
      if (unit == 'money') return formatMoney(value);
      if (unit == 'qty') return formatCompactQty(value);
      return '${value.toStringAsFixed(0)}$unit';
    }

    final growthMode = unit == '%' ? GrowthMode.bps : GrowthMode.pct;

    String valueLabel(double value) {
      if (unit == '%') return '${value.toStringAsFixed(1)}%';
      if (unit == 'money') return formatMoney(value);
      if (unit == 'qty') return formatCompactQty(value);
      if (unit == 'd') return '${value.toStringAsFixed(1)} d';
      return axisLabel(value);
    }

    return LineChart(
      LineChartData(
        minY: bottom,
        maxY: top,
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
        lineTouchData: LineTouchData(
          enabled: true,
          touchTooltipData: LineTouchTooltipData(
            getTooltipItems: (touchedSpots) {
              return [
                for (final spot in touchedSpots)
                  () {
                    final i = spot.x.toInt();
                    if (i < 0 || i >= labels.length) return null;
                    final growth = growthLabelAt(
                      values,
                      i,
                      mode: growthMode,
                    );
                    final growthText = growth == null ? '' : ' ($growth)';
                    return LineTooltipItem(
                      '${labels[i]}\n${valueLabel(spot.y)}$growthText',
                      const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    );
                  }(),
              ];
            },
          ),
        ),
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
