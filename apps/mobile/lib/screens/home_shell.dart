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

  @override
  Widget build(BuildContext context) {
    _tabAt(index);

    return Consumer<TranslateService>(
      builder: (context, translate, _) {
        final titles = [
          translate.text('Products'),
          translate.text('Warehouse'),
          translate.text('Customers'),
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
            body: IndexedStack(
              index: index,
              children: List<Widget>.generate(5, (i) {
                if (_tabCache.containsKey(i)) return _tabCache[i]!;
                return const SizedBox.shrink();
              }),
            ),
            bottomNavigationBar: Material(
              color: UmkmColors.surface.withOpacity(0.97),
              elevation: 0,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  border: Border(
                    top: BorderSide(color: UmkmColors.line.withOpacity(0.85)),
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
                      label: translate.text('Products'),
                    ),
                    NavigationDestination(
                      icon: const Icon(Icons.warehouse_outlined),
                      selectedIcon: const Icon(Icons.warehouse),
                      label: translate.text('Stock'),
                    ),
                    NavigationDestination(
                      icon: const Icon(Icons.people_outline),
                      selectedIcon: const Icon(Icons.people),
                      label: translate.text('CRM'),
                    ),
                    NavigationDestination(
                      icon: const Icon(Icons.receipt_long_outlined),
                      selectedIcon: const Icon(Icons.receipt_long),
                      label: translate.text('Orders'),
                    ),
                    NavigationDestination(
                      icon: const Icon(Icons.person_outline),
                      selectedIcon: const Icon(Icons.person),
                      label: translate.text('Profile'),
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
