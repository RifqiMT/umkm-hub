import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'customers_screen.dart';
import 'orders_screen.dart';
import 'products_screen.dart';
import 'profile_screen.dart';
import 'warehouse_screen.dart';
import '../services/translate_service.dart';
import '../theme/umkm_theme.dart';
import '../widgets/ui.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int index = 0;

  /// Lazily created tab bodies — once visited, kept alive (no remount/refetch).
  final Map<int, Widget> _tabCache = {};

  Widget _tabAt(int i) {
    return _tabCache.putIfAbsent(i, () {
      switch (i) {
        case 0:
          return const ProductsScreen();
        case 1:
          return const WarehouseScreen();
        case 2:
          return const CustomersScreen();
        case 3:
          return const OrdersScreen();
        case 4:
          return const ProfileScreen();
        default:
          return const SizedBox.shrink();
      }
    });
  }

  void _selectTab(int value) {
    if (value == index) return;
    HapticFeedback.selectionClick();
    setState(() => index = value);
  }

  Widget _stackBody() {
    return IndexedStack(
      index: index,
      children: List<Widget>.generate(5, (i) {
        if (_tabCache.containsKey(i)) return _tabCache[i]!;
        return const SizedBox.shrink();
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    _tabAt(index);
    final wide = MediaQuery.sizeOf(context).width >= UmkmSpace.tablet;

    return Consumer<TranslateService>(
      builder: (context, translate, _) {
        final titles = [
          translate.text('Products'),
          translate.text('Warehouse'),
          translate.text('Customers'),
          translate.text('Orders'),
          translate.text('Profile'),
        ];
        final shortLabels = [
          translate.text('Products'),
          translate.text('Stock'),
          translate.text('CRM'),
          translate.text('Orders'),
          translate.text('Profile'),
        ];

        return SoftSurface(
          child: Scaffold(
            backgroundColor: Colors.transparent,
            appBar: AppBar(
              backgroundColor: UmkmColors.surface.withOpacity(0.92),
              surfaceTintColor: Colors.transparent,
              title: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    translate.text('UMKM Hub'),
                    style: UmkmType.label(
                      size: 11,
                      weight: FontWeight.w700,
                      color: UmkmColors.brand,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(titles[index]),
                ],
              ),
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(1),
                child: Container(
                  height: 1,
                  color: UmkmColors.line.withOpacity(0.55),
                ),
              ),
            ),
            body: wide
                ? Row(
                    children: [
                      NavigationRail(
                        selectedIndex: index,
                        onDestinationSelected: _selectTab,
                        backgroundColor:
                            UmkmColors.surface.withOpacity(0.72),
                        indicatorColor: UmkmColors.brandSoft,
                        labelType: NavigationRailLabelType.all,
                        selectedIconTheme: const IconThemeData(
                          color: UmkmColors.brandDeep,
                          size: 24,
                        ),
                        unselectedIconTheme: const IconThemeData(
                          color: UmkmColors.muted,
                          size: 22,
                        ),
                        selectedLabelTextStyle: UmkmType.body(
                          size: 12,
                          weight: FontWeight.w700,
                          color: UmkmColors.brandDeep,
                        ),
                        unselectedLabelTextStyle: UmkmType.body(
                          size: 12,
                          weight: FontWeight.w500,
                          color: UmkmColors.muted,
                        ),
                        destinations: [
                          NavigationRailDestination(
                            icon: const Icon(Icons.inventory_2_outlined),
                            selectedIcon: const Icon(Icons.inventory_2),
                            label: Text(shortLabels[0]),
                          ),
                          NavigationRailDestination(
                            icon: const Icon(Icons.warehouse_outlined),
                            selectedIcon: const Icon(Icons.warehouse),
                            label: Text(shortLabels[1]),
                          ),
                          NavigationRailDestination(
                            icon: const Icon(Icons.people_outline),
                            selectedIcon: const Icon(Icons.people),
                            label: Text(shortLabels[2]),
                          ),
                          NavigationRailDestination(
                            icon: const Icon(Icons.receipt_long_outlined),
                            selectedIcon: const Icon(Icons.receipt_long),
                            label: Text(shortLabels[3]),
                          ),
                          NavigationRailDestination(
                            icon: const Icon(Icons.person_outline),
                            selectedIcon: const Icon(Icons.person),
                            label: Text(shortLabels[4]),
                          ),
                        ],
                      ),
                      VerticalDivider(
                        width: 1,
                        thickness: 1,
                        color: UmkmColors.line.withOpacity(0.7),
                      ),
                      Expanded(
                        child: Align(
                          alignment: Alignment.topCenter,
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 920),
                            child: _stackBody(),
                          ),
                        ),
                      ),
                    ],
                  )
                : _stackBody(),
            bottomNavigationBar: wide
                ? null
                : Material(
                    color: UmkmColors.surface.withOpacity(0.97),
                    elevation: 0,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        border: Border(
                          top: BorderSide(
                            color: UmkmColors.line.withOpacity(0.85),
                          ),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: UmkmColors.ink.withOpacity(0.05),
                            blurRadius: 18,
                            offset: const Offset(0, -4),
                          ),
                        ],
                      ),
                      child: NavigationBar(
                        selectedIndex: index,
                        onDestinationSelected: _selectTab,
                        destinations: [
                          NavigationDestination(
                            icon: const Icon(Icons.inventory_2_outlined),
                            selectedIcon: const Icon(Icons.inventory_2),
                            label: shortLabels[0],
                          ),
                          NavigationDestination(
                            icon: const Icon(Icons.warehouse_outlined),
                            selectedIcon: const Icon(Icons.warehouse),
                            label: shortLabels[1],
                          ),
                          NavigationDestination(
                            icon: const Icon(Icons.people_outline),
                            selectedIcon: const Icon(Icons.people),
                            label: shortLabels[2],
                          ),
                          NavigationDestination(
                            icon: const Icon(Icons.receipt_long_outlined),
                            selectedIcon: const Icon(Icons.receipt_long),
                            label: shortLabels[3],
                          ),
                          NavigationDestination(
                            icon: const Icon(Icons.person_outline),
                            selectedIcon: const Icon(Icons.person),
                            label: shortLabels[4],
                          ),
                        ],
                      ),
                    ),
                  ),
          ),
        );
      },
    );
  }
}
