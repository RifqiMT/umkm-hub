class AuthSession {
  AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.profileId,
    required this.profileName,
  });

  final String accessToken;
  final String refreshToken;
  final String profileId;
  final String profileName;

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    final profile = json['profile'] as Map<String, dynamic>;
    return AuthSession(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      profileId: profile['id'] as String,
      profileName: profile['profileName'] as String,
    );
  }
}

class Product {
  Product({
    required this.id,
    required this.name,
    required this.unit,
    required this.stockQty,
    required this.pricePerUnit,
    required this.details,
    this.productId = '',
    this.price1,
    this.price5,
    this.price10,
    this.price25,
    this.price50,
    this.price100,
    this.price250,
    this.price500,
    this.price1000,
    this.priceCustom,
    this.costPerUnit,
    this.cost1,
    this.cost5,
    this.cost10,
    this.cost25,
    this.cost50,
    this.cost100,
    this.cost250,
    this.cost500,
    this.cost1000,
    this.costCustom,
    this.customSize,
    this.potentialRevenue = 0,
    this.potentialCost,
    this.unitProfit,
    this.potentialProfit,
    this.profitMarginPercent,
  });

  final String id;
  final String productId;
  final String name;
  final String unit;
  final double stockQty;
  final double pricePerUnit;
  final String details;
  final double? price1;
  final double? price5;
  final double? price10;
  final double? price25;
  final double? price50;
  final double? price100;
  final double? price250;
  final double? price500;
  final double? price1000;
  final double? priceCustom;
  final double? costPerUnit;
  final double? cost1;
  final double? cost5;
  final double? cost10;
  final double? cost25;
  final double? cost50;
  final double? cost100;
  final double? cost250;
  final double? cost500;
  final double? cost1000;
  final double? costCustom;
  final double? customSize;
  final double potentialRevenue;
  final double? potentialCost;
  final double? unitProfit;
  final double? potentialProfit;
  final double? profitMarginPercent;

  String get displayId => productId.isNotEmpty ? productId : id;

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: json['id'] as String,
        productId: (json['productId'] as String?) ??
            (json['sku'] as String?) ??
            '',
        name: json['name'] as String,
        unit: (json['unit'] as String?) ?? 'PCS',
        stockQty: (json['stockQty'] as num).toDouble(),
        pricePerUnit: (json['pricePerUnit'] as num).toDouble(),
        details: (json['details'] as String?) ?? '',
        price1: (json['price1'] as num?)?.toDouble(),
        price5: (json['price5'] as num?)?.toDouble(),
        price10: (json['price10'] as num?)?.toDouble(),
        price25: (json['price25'] as num?)?.toDouble(),
        price50: (json['price50'] as num?)?.toDouble(),
        price100: (json['price100'] as num?)?.toDouble(),
        price250: (json['price250'] as num?)?.toDouble(),
        price500: (json['price500'] as num?)?.toDouble(),
        price1000: (json['price1000'] as num?)?.toDouble(),
        priceCustom: (json['priceCustom'] as num?)?.toDouble(),
        costPerUnit: (json['costPerUnit'] as num?)?.toDouble(),
        cost1: (json['cost1'] as num?)?.toDouble(),
        cost5: (json['cost5'] as num?)?.toDouble(),
        cost10: (json['cost10'] as num?)?.toDouble(),
        cost25: (json['cost25'] as num?)?.toDouble(),
        cost50: (json['cost50'] as num?)?.toDouble(),
        cost100: (json['cost100'] as num?)?.toDouble(),
        cost250: (json['cost250'] as num?)?.toDouble(),
        cost500: (json['cost500'] as num?)?.toDouble(),
        cost1000: (json['cost1000'] as num?)?.toDouble(),
        costCustom: (json['costCustom'] as num?)?.toDouble(),
        customSize: (json['customSize'] as num?)?.toDouble(),
        potentialRevenue: (json['potentialRevenue'] as num?)?.toDouble() ?? 0,
        potentialCost: (json['potentialCost'] as num?)?.toDouble(),
        unitProfit: (json['unitProfit'] as num?)?.toDouble(),
        potentialProfit: (json['potentialProfit'] as num?)?.toDouble(),
        profitMarginPercent: (json['profitMarginPercent'] as num?)?.toDouble(),
      );

  Map<String, dynamic> toJson() => {
        'name': name,
        'unit': unit,
        'stockQty': stockQty,
        'pricePerUnit': pricePerUnit,
        'details': details,
        'price1': price1,
        'price5': price5,
        'price10': price10,
        'price25': price25,
        'price50': price50,
        'price100': price100,
        'price250': price250,
        'price500': price500,
        'price1000': price1000,
        'priceCustom': priceCustom,
        'costPerUnit': costPerUnit,
        'cost1': cost1,
        'cost5': cost5,
        'cost10': cost10,
        'cost25': cost25,
        'cost50': cost50,
        'cost100': cost100,
        'cost250': cost250,
        'cost500': cost500,
        'cost1000': cost1000,
        'costCustom': costCustom,
        'customSize': customSize,
      };
}

class Customer {
  Customer({
    required this.id,
    required this.name,
    required this.title,
    required this.companyName,
    required this.companyType,
    this.customerId = '',
    this.npwp = '',
    this.email = '',
    this.phone = '',
    this.address = '',
    this.additionalAddress = '',
    this.postalCode = '',
    this.city = '',
    this.province = '',
    this.country = '',
    this.partnershipStage,
    this.status,
    this.customerNeeds = '',
    this.desiredStandards = '',
    required this.promiseAnnualBonus,
    required this.promiseOnTimeDelivery,
    required this.promisePackagingBox,
    this.relationshipLevel,
    required this.approvalPercentage,
    this.remarks = '',
  });

  final String id;
  final String customerId;
  final String name;
  final String title;
  final String companyName;
  final String companyType;
  final String npwp;
  final String email;
  final String phone;
  final String address;
  final String additionalAddress;
  final String postalCode;
  final String city;
  final String province;
  final String country;
  final String? partnershipStage;
  final String? status;
  final String customerNeeds;
  final String desiredStandards;
  final bool promiseAnnualBonus;
  final bool promiseOnTimeDelivery;
  final bool promisePackagingBox;
  final String? relationshipLevel;
  final int approvalPercentage;
  final String remarks;

  String get displayId => customerId.isNotEmpty ? customerId : id;

  factory Customer.fromJson(Map<String, dynamic> json) => Customer(
        id: json['id'] as String,
        customerId: (json['customerId'] as String?) ??
            (json['sku'] as String?) ??
            '',
        name: json['name'] as String,
        title: (json['title'] as String?) ?? '',
        companyName: json['companyName'] as String,
        companyType: json['companyType'] as String,
        npwp: (json['npwp'] as String?) ?? '',
        email: (json['email'] as String?) ?? '',
        phone: (json['phone'] as String?) ?? '',
        address: (json['address'] as String?) ?? '',
        additionalAddress: (json['additionalAddress'] as String?) ?? '',
        postalCode: (json['postalCode'] as String?) ?? '',
        city: (json['city'] as String?) ?? '',
        province: (json['province'] as String?) ?? '',
        country: (json['country'] as String?) ?? '',
        partnershipStage: json['partnershipStage'] as String?,
        status: json['status'] as String?,
        customerNeeds: (json['customerNeeds'] as String?) ?? '',
        desiredStandards: (json['desiredStandards'] as String?) ?? '',
        promiseAnnualBonus: json['promiseAnnualBonus'] as bool? ?? false,
        promiseOnTimeDelivery: json['promiseOnTimeDelivery'] as bool? ?? false,
        promisePackagingBox: json['promisePackagingBox'] as bool? ?? false,
        relationshipLevel: json['relationshipLevel'] as String?,
        approvalPercentage: json['approvalPercentage'] as int? ?? 0,
        remarks: (json['remarks'] as String?) ?? '',
      );

  Map<String, dynamic> toJson() => {
        'name': name,
        'title': title,
        'companyName': companyName,
        'companyType': companyType,
        'npwp': npwp,
        'email': email,
        'phone': phone,
        'address': address,
        'additionalAddress': additionalAddress,
        'postalCode': postalCode,
        'city': city,
        'province': province,
        'country': country,
        'partnershipStage': partnershipStage,
        'status': status,
        'customerNeeds': customerNeeds,
        'desiredStandards': desiredStandards,
        'promiseAnnualBonus': promiseAnnualBonus,
        'promiseOnTimeDelivery': promiseOnTimeDelivery,
        'promisePackagingBox': promisePackagingBox,
        'relationshipLevel': relationshipLevel,
        'approvalPercentage': approvalPercentage,
        'remarks': remarks,
      };
}

class OrderInstallment {
  OrderInstallment({
    required this.amount,
    required this.installmentDate,
    this.id,
  });

  final String? id;
  final double amount;
  final String installmentDate;

  factory OrderInstallment.fromJson(Map<String, dynamic> json) =>
      OrderInstallment(
        id: json['id'] as String?,
        amount: (json['amount'] as num?)?.toDouble() ?? 0,
        installmentDate: (json['installmentDate'] as String?) ?? '',
      );

  Map<String, dynamic> toJson() => {
        'amount': amount,
        'installmentDate': installmentDate,
      };
}

class OrderLineItem {
  OrderLineItem({
    required this.productId,
    required this.productQty,
    required this.lineTotal,
    this.id,
    this.productName,
    this.packSizeSnapshot,
    this.packPriceSnapshot,
    this.packCount,
    this.unit,
    this.sortOrder,
  });

  final String? id;
  final String productId;
  final String? productName;
  final double? packSizeSnapshot;
  final double? packPriceSnapshot;
  final double? packCount;
  final double productQty;
  final double lineTotal;
  final String? unit;
  final int? sortOrder;

  factory OrderLineItem.fromJson(Map<String, dynamic> json) {
    final product = json['product'] as Map<String, dynamic>?;
    return OrderLineItem(
      id: json['id'] as String?,
      productId: json['productId'] as String,
      productName: product?['name'] as String?,
      packSizeSnapshot: (json['packSizeSnapshot'] as num?)?.toDouble(),
      packPriceSnapshot: (json['packPriceSnapshot'] as num?)?.toDouble() ??
          (json['price'] as num?)?.toDouble(),
      packCount: (json['packCount'] as num?)?.toDouble(),
      productQty: (json['productQty'] as num?)?.toDouble() ??
          (json['qty'] as num?)?.toDouble() ??
          0,
      lineTotal: (json['lineTotal'] as num?)?.toDouble() ?? 0,
      unit: (json['unit'] as String?) ??
          (json['unitSnapshot'] as String?) ??
          (product?['unit'] as String?),
      sortOrder: json['sortOrder'] as int?,
    );
  }
}

class OrderItem {
  OrderItem({
    required this.id,
    this.orderId = '',
    this.customerId,
    this.customerName,
    this.customerCompany,
    required this.productId,
    required this.productQty,
    required this.lineTotal,
    required this.discountType,
    required this.discountValue,
    required this.totalOrderValue,
    required this.paymentStatus,
    required this.status,
    required this.orderDate,
    this.shipmentDate,
    this.price,
    this.packSizeSnapshot,
    this.packPriceSnapshot,
    this.packCount,
    this.productName,
    this.unitSnapshot,
    this.billStatus = 'CREATED',
    this.billDate,
    this.invoiceStatus = 'CREATED',
    this.invoiceDate,
    this.paymentDueDate,
    this.lines = const [],
    this.lineCount = 1,
    this.installments = const [],
    this.paidAmount = 0,
    required this.remainingAmount,
    this.amountDue,
  });

  final String id;
  final String orderId;
  final String? customerId;
  final String? customerName;
  final String? customerCompany;
  final String productId;
  final double productQty;
  final double lineTotal;
  final String discountType;
  final double discountValue;
  final double totalOrderValue;
  final String paymentStatus;
  final String status;
  final String orderDate;
  final String? shipmentDate;
  final double? price;
  final double? packSizeSnapshot;
  final double? packPriceSnapshot;
  final double? packCount;
  final String? productName;
  final String? unitSnapshot;
  final String billStatus;
  final String? billDate;
  final String invoiceStatus;
  final String? invoiceDate;
  final String? paymentDueDate;
  final List<OrderLineItem> lines;
  final int lineCount;
  final List<OrderInstallment> installments;
  final double paidAmount;
  final double remainingAmount;
  final double? amountDue;

  double get invoiceAmountDue => amountDue ?? totalOrderValue;

  String get displayId => orderId.isNotEmpty ? orderId : id;

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    final product = json['product'] as Map<String, dynamic>?;
    final totalOrderValue = (json['totalOrderValue'] as num).toDouble();
    final productId = json['productId'] as String;
    final productQty = (json['productQty'] as num).toDouble();
    final lineTotal = (json['lineTotal'] as num).toDouble();
    final packSizeSnapshot = (json['packSizeSnapshot'] as num?)?.toDouble();
    final packPriceSnapshot = (json['packPriceSnapshot'] as num?)?.toDouble();
    final packCount = (json['packCount'] as num?)?.toDouble();
    final productName = product?['name'] as String?;
    final unitSnapshot = (json['unit'] as String?) ??
        (json['unitSnapshot'] as String?) ??
        (product?['unit'] as String?);
    final rawLines = json['lines'];
    final parsedLines = rawLines is List
        ? rawLines
            .whereType<Map>()
            .map((e) => OrderLineItem.fromJson(Map<String, dynamic>.from(e)))
            .toList()
        : <OrderLineItem>[];
    final lines = parsedLines.isNotEmpty
        ? parsedLines
        : [
            OrderLineItem(
              productId: productId,
              productName: productName,
              packSizeSnapshot: packSizeSnapshot,
              packPriceSnapshot: packPriceSnapshot ??
                  (json['price'] as num?)?.toDouble(),
              packCount: packCount,
              productQty: productQty,
              lineTotal: lineTotal,
              unit: unitSnapshot,
              sortOrder: 0,
            ),
          ];
    final rawInstallments = json['installments'];
    final installments = rawInstallments is List
        ? rawInstallments
            .whereType<Map>()
            .map((e) => OrderInstallment.fromJson(
                  Map<String, dynamic>.from(e),
                ))
            .toList()
        : <OrderInstallment>[];
    final paidFromInstallments = installments.fold<double>(
      0,
      (sum, row) => sum + row.amount,
    );
    final invoiceDateRaw = json['invoiceDate'] as String?;
    final billDateRaw = json['billDate'] as String?;
    final customer = json['customer'] as Map<String, dynamic>?;
    return OrderItem(
      id: json['id'] as String,
      orderId: (json['orderId'] as String?) ??
          (json['sku'] as String?) ??
          '',
      customerId: (json['customerId'] as String?) ??
          (customer?['id'] as String?),
      customerName: customer?['name'] as String?,
      customerCompany: customer?['companyName'] as String?,
      productId: productId,
      productQty: productQty,
      lineTotal: lineTotal,
      discountType: json['discountType'] as String,
      discountValue: (json['discountValue'] as num).toDouble(),
      totalOrderValue: totalOrderValue,
      paymentStatus: json['paymentStatus'] as String,
      status: (json['status'] as String?) ?? 'PENDING',
      orderDate: (json['orderDate'] as String?) ?? '',
      shipmentDate: json['shipmentDate'] as String?,
      price: packPriceSnapshot ??
          (json['price'] as num?)?.toDouble() ??
          (json['unitPriceSnapshot'] as num?)?.toDouble(),
      packSizeSnapshot: packSizeSnapshot,
      packPriceSnapshot: packPriceSnapshot,
      packCount: packCount,
      productName: productName,
      unitSnapshot: unitSnapshot,
      billStatus: (json['billStatus'] as String?) ?? 'CREATED',
      billDate: billDateRaw != null && billDateRaw.length >= 10
          ? billDateRaw.substring(0, 10)
          : billDateRaw,
      invoiceStatus: (json['invoiceStatus'] as String?) ?? 'CREATED',
      invoiceDate: invoiceDateRaw != null && invoiceDateRaw.length >= 10
          ? invoiceDateRaw.substring(0, 10)
          : invoiceDateRaw,
      paymentDueDate: () {
        final raw = json['paymentDueDate'] as String?;
        if (raw == null || raw.isEmpty) return null;
        return raw.length >= 10 ? raw.substring(0, 10) : raw;
      }(),
      lines: lines,
      lineCount: (json['lineCount'] as int?) ?? lines.length,
      installments: installments,
      paidAmount: (json['paidAmount'] as num?)?.toDouble() ??
          (paidFromInstallments > 0 ? paidFromInstallments : 0),
      remainingAmount: (json['remainingAmount'] as num?)?.toDouble() ??
          ((totalOrderValue - paidFromInstallments).clamp(0, double.infinity)),
      amountDue: (json['amountDue'] as num?)?.toDouble(),
    );
  }
}

class PaginatedOrders {
  PaginatedOrders({
    required this.items,
    required this.total,
    required this.page,
    required this.limit,
    required this.totalPages,
  });

  final List<OrderItem> items;
  final int total;
  final int page;
  final int limit;
  final int totalPages;

  bool get hasMore => page < totalPages;

  factory PaginatedOrders.fromJson(Map<String, dynamic> json) {
    final meta = (json['meta'] as Map<String, dynamic>?) ?? const {};
    final rawItems = json['items'] as List<dynamic>? ?? const [];
    return PaginatedOrders(
      items: rawItems
          .map((e) => OrderItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: (meta['total'] as num?)?.toInt() ?? rawItems.length,
      page: (meta['page'] as num?)?.toInt() ?? 1,
      limit: (meta['limit'] as num?)?.toInt() ?? 50,
      totalPages: (meta['totalPages'] as num?)?.toInt() ?? 1,
    );
  }
}

class OrderSummary {
  OrderSummary({
    required this.earliestOrderDate,
    required this.latestOrderDate,
    required this.orderCount,
    required this.productsSold,
    required this.totalRevenue,
    this.cancellationRate,
    this.profitMarginRate,
    this.discountRate,
    this.fullPaymentRate,
  });

  final String? earliestOrderDate;
  final String? latestOrderDate;
  final int orderCount;
  final double productsSold;
  final double totalRevenue;
  final double? cancellationRate;
  final double? profitMarginRate;
  final double? discountRate;
  final double? fullPaymentRate;

  factory OrderSummary.fromJson(Map<String, dynamic> json) => OrderSummary(
        earliestOrderDate: json['earliestOrderDate'] as String?,
        latestOrderDate: json['latestOrderDate'] as String?,
        orderCount: (json['orderCount'] as num?)?.toInt() ?? 0,
        productsSold: (json['productsSold'] as num?)?.toDouble() ?? 0,
        totalRevenue: (json['totalRevenue'] as num?)?.toDouble() ?? 0,
        cancellationRate: (json['cancellationRate'] as num?)?.toDouble(),
        profitMarginRate: (json['profitMarginRate'] as num?)?.toDouble(),
        discountRate: (json['discountRate'] as num?)?.toDouble(),
        fullPaymentRate: (json['fullPaymentRate'] as num?)?.toDouble(),
      );
}

class WarehouseRestock {
  WarehouseRestock({
    required this.id,
    required this.productId,
    required this.qtyAdded,
    required this.restockDate,
    required this.stockBefore,
    required this.stockAfter,
    this.notes = '',
    this.productName,
    this.unitSnapshot,
  });

  final String id;
  final String productId;
  final double qtyAdded;
  final String restockDate;
  final double stockBefore;
  final double stockAfter;
  final String notes;
  final String? productName;
  final String? unitSnapshot;

  factory WarehouseRestock.fromJson(Map<String, dynamic> json) {
    final product = json['product'] as Map<String, dynamic>?;
    return WarehouseRestock(
      id: json['id'] as String,
      productId: json['productId'] as String,
      qtyAdded: (json['qtyAdded'] as num).toDouble(),
      restockDate: (json['restockDate'] as String?) ?? '',
      stockBefore: (json['stockBefore'] as num).toDouble(),
      stockAfter: (json['stockAfter'] as num).toDouble(),
      notes: (json['notes'] as String?) ?? '',
      productName: product?['name'] as String?,
      unitSnapshot: (json['unit'] as String?) ??
          (json['unitSnapshot'] as String?) ??
          (product?['unit'] as String?),
    );
  }
}

class WarehouseSale {
  WarehouseSale({
    required this.id,
    required this.productId,
    required this.orderId,
    required this.qtySold,
    required this.soldDate,
    required this.stockBefore,
    required this.stockAfter,
    this.notes = '',
    this.productName,
    this.unitSnapshot,
    this.orderRef,
  });

  final String id;
  final String productId;
  final String orderId;
  final double qtySold;
  final String soldDate;
  final double stockBefore;
  final double stockAfter;
  final String notes;
  final String? productName;
  final String? unitSnapshot;
  final String? orderRef;

  factory WarehouseSale.fromJson(Map<String, dynamic> json) {
    final product = json['product'] as Map<String, dynamic>?;
    final order = json['order'] as Map<String, dynamic>?;
    return WarehouseSale(
      id: json['id'] as String,
      productId: json['productId'] as String,
      orderId: json['orderId'] as String,
      qtySold: (json['qtySold'] as num).toDouble(),
      soldDate: (json['soldDate'] as String?) ?? '',
      stockBefore: (json['stockBefore'] as num).toDouble(),
      stockAfter: (json['stockAfter'] as num).toDouble(),
      notes: (json['notes'] as String?) ?? '',
      productName: product?['name'] as String?,
      unitSnapshot: (json['unit'] as String?) ??
          (json['unitSnapshot'] as String?) ??
          (product?['unit'] as String?),
      orderRef: (json['orderRef'] as String?) ??
          (order?['orderId'] as String?),
    );
  }
}

/// % distribution of orders by status / payment mode on Analytics timeline points.
class AnalyticsMixShares {
  AnalyticsMixShares({
    required this.statusShares,
    required this.statusOrderCount,
    required this.paymentShares,
    required this.paymentOrderCount,
  });

  final Map<String, double> statusShares;
  final int statusOrderCount;
  final Map<String, double> paymentShares;
  final int paymentOrderCount;

  static AnalyticsMixShares empty() => AnalyticsMixShares(
        statusShares: const {
          'PENDING': 0,
          'CONFIRMED': 0,
          'SHIPPED': 0,
          'DELIVERED': 0,
          'CANCELLED': 0,
        },
        statusOrderCount: 0,
        paymentShares: const {
          'CASH': 0,
          'CONSIGNMENT': 0,
          'DELAYED_PAYMENT': 0,
          'KONTRA_BON': 0,
        },
        paymentOrderCount: 0,
      );

  factory AnalyticsMixShares.fromJson(Map<String, dynamic> json) {
    Map<String, double> readShares(String key, Map<String, double> fallback) {
      final raw = json[key];
      if (raw is! Map) return Map<String, double>.from(fallback);
      final out = Map<String, double>.from(fallback);
      raw.forEach((k, v) {
        if (v is num) out[k.toString()] = v.toDouble();
      });
      return out;
    }

    final defaults = AnalyticsMixShares.empty();
    return AnalyticsMixShares(
      statusShares: readShares('statusShares', defaults.statusShares),
      statusOrderCount: (json['statusOrderCount'] as num?)?.toInt() ?? 0,
      paymentShares: readShares('paymentShares', defaults.paymentShares),
      paymentOrderCount: (json['paymentOrderCount'] as num?)?.toInt() ?? 0,
    );
  }
}

class AnalyticsWeekPoint {
  AnalyticsWeekPoint({
    required this.isoYear,
    required this.week,
    required this.label,
    required this.revenue,
    required this.orderCount,
    this.avgOrderValue,
    this.target,
    this.attainmentPercent,
    this.cost,
    this.profit,
    this.marginPercent,
    this.avgShipmentDays,
    this.avgInvoiceDays,
    this.avgFirstPaymentDays,
    this.avgPaymentDays,
    this.avgLtv,
    this.avgProductRevenue,
    this.avgBasketSize,
    this.avgPurchaseFrequency,
    AnalyticsMixShares? mix,
  }) : mix = mix ?? AnalyticsMixShares.empty();

  final int isoYear;
  final int week;
  final String label;
  final double revenue;
  final int orderCount;
  final double? avgOrderValue;
  final double? target;
  final double? attainmentPercent;
  final double? cost;
  final double? profit;
  final double? marginPercent;
  final double? avgShipmentDays;
  final double? avgInvoiceDays;
  final double? avgFirstPaymentDays;
  final double? avgPaymentDays;
  final double? avgLtv;
  final double? avgProductRevenue;
  final double? avgBasketSize;
  final double? avgPurchaseFrequency;
  final AnalyticsMixShares mix;

  factory AnalyticsWeekPoint.fromJson(Map<String, dynamic> json) {
    return AnalyticsWeekPoint(
      isoYear: json['isoYear'] as int,
      week: json['week'] as int,
      label: json['label'] as String,
      revenue: (json['revenue'] as num).toDouble(),
      orderCount: json['orderCount'] as int,
      avgOrderValue: (json['avgOrderValue'] as num?)?.toDouble(),
      target: (json['target'] as num?)?.toDouble(),
      attainmentPercent: (json['attainmentPercent'] as num?)?.toDouble(),
      cost: (json['cost'] as num?)?.toDouble(),
      profit: (json['profit'] as num?)?.toDouble(),
      marginPercent: (json['marginPercent'] as num?)?.toDouble(),
      avgShipmentDays: (json['avgShipmentDays'] as num?)?.toDouble(),
      avgInvoiceDays: (json['avgInvoiceDays'] as num?)?.toDouble(),
      avgFirstPaymentDays: (json['avgFirstPaymentDays'] as num?)?.toDouble(),
      avgPaymentDays: (json['avgPaymentDays'] as num?)?.toDouble(),
      avgLtv: (json['avgLtv'] as num?)?.toDouble(),
      avgProductRevenue: (json['avgProductRevenue'] as num?)?.toDouble(),
      avgBasketSize: (json['avgBasketSize'] as num?)?.toDouble(),
      avgPurchaseFrequency: (json['avgPurchaseFrequency'] as num?)?.toDouble(),
      mix: AnalyticsMixShares.fromJson(json),
    );
  }
}

class AnalyticsMonthPoint {
  AnalyticsMonthPoint({
    required this.month,
    required this.label,
    required this.revenue,
    required this.orderCount,
    this.avgOrderValue,
    this.target,
    this.attainmentPercent,
    this.cost,
    this.profit,
    this.marginPercent,
    this.avgShipmentDays,
    this.shipmentSampleSize = 0,
    this.avgInvoiceDays,
    this.invoiceSampleSize = 0,
    this.avgFirstPaymentDays,
    this.firstPaymentSampleSize = 0,
    this.avgPaymentDays,
    this.paymentSampleSize = 0,
    this.avgLtv,
    this.avgProductRevenue,
    this.avgBasketSize,
    this.avgPurchaseFrequency,
    AnalyticsMixShares? mix,
  }) : mix = mix ?? AnalyticsMixShares.empty();

  final int month;
  final String label;
  final double revenue;
  final int orderCount;
  final double? avgOrderValue;
  final double? target;
  final double? attainmentPercent;
  final double? cost;
  final double? profit;
  final double? marginPercent;
  final double? avgShipmentDays;
  final int shipmentSampleSize;
  final double? avgInvoiceDays;
  final int invoiceSampleSize;
  final double? avgFirstPaymentDays;
  final int firstPaymentSampleSize;
  final double? avgPaymentDays;
  final int paymentSampleSize;
  final double? avgLtv;
  final double? avgProductRevenue;
  final double? avgBasketSize;
  final double? avgPurchaseFrequency;
  final AnalyticsMixShares mix;

  factory AnalyticsMonthPoint.fromJson(Map<String, dynamic> json) {
    return AnalyticsMonthPoint(
      month: json['month'] as int,
      label: json['label'] as String,
      revenue: (json['revenue'] as num).toDouble(),
      orderCount: json['orderCount'] as int,
      avgOrderValue: (json['avgOrderValue'] as num?)?.toDouble(),
      target: (json['target'] as num?)?.toDouble(),
      attainmentPercent: (json['attainmentPercent'] as num?)?.toDouble(),
      cost: (json['cost'] as num?)?.toDouble(),
      profit: (json['profit'] as num?)?.toDouble(),
      marginPercent: (json['marginPercent'] as num?)?.toDouble(),
      avgShipmentDays: (json['avgShipmentDays'] as num?)?.toDouble(),
      shipmentSampleSize: (json['shipmentSampleSize'] as int?) ?? 0,
      avgInvoiceDays: (json['avgInvoiceDays'] as num?)?.toDouble(),
      invoiceSampleSize: (json['invoiceSampleSize'] as int?) ?? 0,
      avgFirstPaymentDays: (json['avgFirstPaymentDays'] as num?)?.toDouble(),
      firstPaymentSampleSize: (json['firstPaymentSampleSize'] as int?) ?? 0,
      avgPaymentDays: (json['avgPaymentDays'] as num?)?.toDouble(),
      paymentSampleSize: (json['paymentSampleSize'] as int?) ?? 0,
      avgLtv: (json['avgLtv'] as num?)?.toDouble(),
      avgProductRevenue: (json['avgProductRevenue'] as num?)?.toDouble(),
      avgBasketSize: (json['avgBasketSize'] as num?)?.toDouble(),
      avgPurchaseFrequency: (json['avgPurchaseFrequency'] as num?)?.toDouble(),
      mix: AnalyticsMixShares.fromJson(json),
    );
  }
}

class AnalyticsQuarterPoint {
  AnalyticsQuarterPoint({
    required this.year,
    required this.quarter,
    required this.label,
    required this.revenue,
    required this.orderCount,
    this.avgOrderValue,
    this.target,
    this.attainmentPercent,
    this.cost,
    this.profit,
    this.marginPercent,
    this.avgShipmentDays,
    this.shipmentSampleSize = 0,
    this.avgInvoiceDays,
    this.invoiceSampleSize = 0,
    this.avgFirstPaymentDays,
    this.firstPaymentSampleSize = 0,
    this.avgPaymentDays,
    this.paymentSampleSize = 0,
    this.avgLtv,
    this.avgProductRevenue,
    this.avgBasketSize,
    this.avgPurchaseFrequency,
    AnalyticsMixShares? mix,
  }) : mix = mix ?? AnalyticsMixShares.empty();

  final int year;
  final int quarter;
  final String label;
  final double revenue;
  final int orderCount;
  final double? avgOrderValue;
  final double? target;
  final double? attainmentPercent;
  final double? cost;
  final double? profit;
  final double? marginPercent;
  final double? avgShipmentDays;
  final int shipmentSampleSize;
  final double? avgInvoiceDays;
  final int invoiceSampleSize;
  final double? avgFirstPaymentDays;
  final int firstPaymentSampleSize;
  final double? avgPaymentDays;
  final int paymentSampleSize;
  final double? avgLtv;
  final double? avgProductRevenue;
  final double? avgBasketSize;
  final double? avgPurchaseFrequency;
  final AnalyticsMixShares mix;

  factory AnalyticsQuarterPoint.fromJson(Map<String, dynamic> json) {
    return AnalyticsQuarterPoint(
      year: json['year'] as int,
      quarter: json['quarter'] as int,
      label: json['label'] as String,
      revenue: (json['revenue'] as num).toDouble(),
      orderCount: json['orderCount'] as int,
      avgOrderValue: (json['avgOrderValue'] as num?)?.toDouble(),
      target: (json['target'] as num?)?.toDouble(),
      attainmentPercent: (json['attainmentPercent'] as num?)?.toDouble(),
      cost: (json['cost'] as num?)?.toDouble(),
      profit: (json['profit'] as num?)?.toDouble(),
      marginPercent: (json['marginPercent'] as num?)?.toDouble(),
      avgShipmentDays: (json['avgShipmentDays'] as num?)?.toDouble(),
      shipmentSampleSize: (json['shipmentSampleSize'] as int?) ?? 0,
      avgInvoiceDays: (json['avgInvoiceDays'] as num?)?.toDouble(),
      invoiceSampleSize: (json['invoiceSampleSize'] as int?) ?? 0,
      avgFirstPaymentDays: (json['avgFirstPaymentDays'] as num?)?.toDouble(),
      firstPaymentSampleSize: (json['firstPaymentSampleSize'] as int?) ?? 0,
      avgPaymentDays: (json['avgPaymentDays'] as num?)?.toDouble(),
      paymentSampleSize: (json['paymentSampleSize'] as int?) ?? 0,
      avgLtv: (json['avgLtv'] as num?)?.toDouble(),
      avgProductRevenue: (json['avgProductRevenue'] as num?)?.toDouble(),
      avgBasketSize: (json['avgBasketSize'] as num?)?.toDouble(),
      avgPurchaseFrequency: (json['avgPurchaseFrequency'] as num?)?.toDouble(),
      mix: AnalyticsMixShares.fromJson(json),
    );
  }
}

class AnalyticsYearPoint {
  AnalyticsYearPoint({
    required this.year,
    required this.revenue,
    required this.orderCount,
    this.avgOrderValue,
    this.target,
    this.attainmentPercent,
    this.cost,
    this.profit,
    this.marginPercent,
    this.avgShipmentDays,
    this.shipmentSampleSize = 0,
    this.avgInvoiceDays,
    this.invoiceSampleSize = 0,
    this.avgFirstPaymentDays,
    this.firstPaymentSampleSize = 0,
    this.avgPaymentDays,
    this.paymentSampleSize = 0,
    this.avgLtv,
    this.avgProductRevenue,
    this.avgBasketSize,
    this.avgPurchaseFrequency,
    AnalyticsMixShares? mix,
  }) : mix = mix ?? AnalyticsMixShares.empty();

  final int year;
  final double revenue;
  final int orderCount;
  final double? avgOrderValue;
  final double? target;
  final double? attainmentPercent;
  final double? cost;
  final double? profit;
  final double? marginPercent;
  final double? avgShipmentDays;
  final int shipmentSampleSize;
  final double? avgInvoiceDays;
  final int invoiceSampleSize;
  final double? avgFirstPaymentDays;
  final int firstPaymentSampleSize;
  final double? avgPaymentDays;
  final int paymentSampleSize;
  final double? avgLtv;
  final double? avgProductRevenue;
  final double? avgBasketSize;
  final double? avgPurchaseFrequency;
  final AnalyticsMixShares mix;

  factory AnalyticsYearPoint.fromJson(Map<String, dynamic> json) {
    return AnalyticsYearPoint(
      year: json['year'] as int,
      revenue: (json['revenue'] as num).toDouble(),
      orderCount: json['orderCount'] as int,
      avgOrderValue: (json['avgOrderValue'] as num?)?.toDouble(),
      target: (json['target'] as num?)?.toDouble(),
      attainmentPercent: (json['attainmentPercent'] as num?)?.toDouble(),
      cost: (json['cost'] as num?)?.toDouble(),
      profit: (json['profit'] as num?)?.toDouble(),
      marginPercent: (json['marginPercent'] as num?)?.toDouble(),
      avgShipmentDays: (json['avgShipmentDays'] as num?)?.toDouble(),
      shipmentSampleSize: (json['shipmentSampleSize'] as int?) ?? 0,
      avgInvoiceDays: (json['avgInvoiceDays'] as num?)?.toDouble(),
      invoiceSampleSize: (json['invoiceSampleSize'] as int?) ?? 0,
      avgFirstPaymentDays: (json['avgFirstPaymentDays'] as num?)?.toDouble(),
      firstPaymentSampleSize: (json['firstPaymentSampleSize'] as int?) ?? 0,
      avgPaymentDays: (json['avgPaymentDays'] as num?)?.toDouble(),
      paymentSampleSize: (json['paymentSampleSize'] as int?) ?? 0,
      avgLtv: (json['avgLtv'] as num?)?.toDouble(),
      avgProductRevenue: (json['avgProductRevenue'] as num?)?.toDouble(),
      avgBasketSize: (json['avgBasketSize'] as num?)?.toDouble(),
      avgPurchaseFrequency: (json['avgPurchaseFrequency'] as num?)?.toDouble(),
      mix: AnalyticsMixShares.fromJson(json),
    );
  }
}

class AnalyticsProductRow {
  AnalyticsProductRow({
    required this.productId,
    required this.name,
    required this.unit,
    required this.orderCount,
    required this.qtySold,
    required this.packsSold,
    required this.grossRevenue,
    required this.revenue,
    this.avgOrderValue,
    this.firstRepeatOrderDays,
    this.avgRepeatOrderDays,
    required this.discount,
    this.discountPercent,
    this.cost,
    this.costPercent,
    this.profit,
    this.marginPercent,
  });

  final String productId;
  final String name;
  final String unit;
  final int orderCount;
  final double qtySold;
  final double packsSold;
  final double grossRevenue;
  final double revenue;
  final double? avgOrderValue;
  final double? firstRepeatOrderDays;
  final double? avgRepeatOrderDays;
  final double discount;
  final double? discountPercent;
  final double? cost;
  final double? costPercent;
  final double? profit;
  final double? marginPercent;

  factory AnalyticsProductRow.fromJson(Map<String, dynamic> json) {
    final revenue = (json['revenue'] as num).toDouble();
    final discount = (json['discount'] as num?)?.toDouble() ?? 0;
    return AnalyticsProductRow(
      productId: json['productId'] as String,
      name: json['name'] as String,
      unit: json['unit'] as String,
      orderCount: json['orderCount'] as int,
      qtySold: (json['qtySold'] as num).toDouble(),
      packsSold: (json['packsSold'] as num?)?.toDouble() ?? 0,
      grossRevenue: (json['grossRevenue'] as num?)?.toDouble() ??
          (revenue + discount),
      revenue: revenue,
      avgOrderValue: (json['avgOrderValue'] as num?)?.toDouble(),
      firstRepeatOrderDays: (json['firstRepeatOrderDays'] as num?)?.toDouble(),
      avgRepeatOrderDays: (json['avgRepeatOrderDays'] as num?)?.toDouble(),
      discount: discount,
      discountPercent: (json['discountPercent'] as num?)?.toDouble(),
      cost: (json['cost'] as num?)?.toDouble(),
      costPercent: (json['costPercent'] as num?)?.toDouble(),
      profit: (json['profit'] as num?)?.toDouble(),
      marginPercent: (json['marginPercent'] as num?)?.toDouble(),
    );
  }
}

class AnalyticsCustomerRow {
  AnalyticsCustomerRow({
    required this.customerId,
    required this.name,
    required this.companyName,
    required this.companyType,
    required this.orderCount,
    required this.packsSold,
    required this.grossRevenue,
    required this.revenue,
    this.avgOrderValue,
    this.firstRepeatOrderDays,
    this.avgRepeatOrderDays,
    required this.discount,
    this.discountPercent,
    this.cost,
    this.costPercent,
    this.profit,
    this.marginPercent,
  });

  final String customerId;
  final String name;
  final String companyName;
  final String companyType;
  final int orderCount;
  final double packsSold;
  final double grossRevenue;
  final double revenue;
  final double? avgOrderValue;
  final double? firstRepeatOrderDays;
  final double? avgRepeatOrderDays;
  final double discount;
  final double? discountPercent;
  final double? cost;
  final double? costPercent;
  final double? profit;
  final double? marginPercent;

  factory AnalyticsCustomerRow.fromJson(Map<String, dynamic> json) {
    final revenue = (json['revenue'] as num).toDouble();
    final discount = (json['discount'] as num?)?.toDouble() ?? 0;
    return AnalyticsCustomerRow(
      customerId: json['customerId'] as String,
      name: json['name'] as String,
      companyName: (json['companyName'] as String?) ?? '',
      companyType: (json['companyType'] as String?) ?? '',
      orderCount: json['orderCount'] as int,
      packsSold: (json['packsSold'] as num?)?.toDouble() ?? 0,
      grossRevenue: (json['grossRevenue'] as num?)?.toDouble() ??
          (revenue + discount),
      revenue: revenue,
      avgOrderValue: (json['avgOrderValue'] as num?)?.toDouble(),
      firstRepeatOrderDays: (json['firstRepeatOrderDays'] as num?)?.toDouble(),
      avgRepeatOrderDays: (json['avgRepeatOrderDays'] as num?)?.toDouble(),
      discount: discount,
      discountPercent: (json['discountPercent'] as num?)?.toDouble(),
      cost: (json['cost'] as num?)?.toDouble(),
      costPercent: (json['costPercent'] as num?)?.toDouble(),
      profit: (json['profit'] as num?)?.toDouble(),
      marginPercent: (json['marginPercent'] as num?)?.toDouble(),
    );
  }
}

class AnalyticsOverview {
  AnalyticsOverview({
    this.year,
    this.years,
    this.scope = 'year',
    required this.revenue,
    required this.orderCount,
    this.avgOrderValue,
    this.target,
    this.attainmentPercent,
    this.cost,
    this.profit,
    this.marginPercent,
    this.avgShipmentDays,
    this.avgInvoiceDays,
    this.avgFirstPaymentDays,
    this.avgPaymentDays,
    this.avgLtv,
    this.ltvCustomerCount = 0,
    this.avgProductRevenue,
    this.productSaleCount = 0,
    this.avgBasketSize,
    this.avgPurchaseFrequency,
    required this.weekly,
    required this.monthly,
    required this.quarterly,
    required this.annual,
    required this.products,
    required this.customers,
  });

  final int? year;
  final List<int>? years;
  final String scope;
  final double revenue;
  final int orderCount;
  final double? avgOrderValue;
  final double? target;
  final double? attainmentPercent;
  final double? cost;
  final double? profit;
  final double? marginPercent;
  final double? avgShipmentDays;
  final double? avgInvoiceDays;
  final double? avgFirstPaymentDays;
  final double? avgPaymentDays;
  final double? avgLtv;
  final int ltvCustomerCount;
  final double? avgProductRevenue;
  final int productSaleCount;
  final double? avgBasketSize;
  final double? avgPurchaseFrequency;
  final List<AnalyticsWeekPoint> weekly;
  final List<AnalyticsMonthPoint> monthly;
  final List<AnalyticsQuarterPoint> quarterly;
  final List<AnalyticsYearPoint> annual;
  final List<AnalyticsProductRow> products;
  final List<AnalyticsCustomerRow> customers;

  factory AnalyticsOverview.fromJson(Map<String, dynamic> json) {
    final summary = json['summary'] as Map<String, dynamic>;
    return AnalyticsOverview(
      year: json['year'] as int?,
      years: (json['years'] as List<dynamic>?)
          ?.map((e) => (e as num).toInt())
          .toList(),
      scope: (json['scope'] as String?) ??
          ((json['year'] == null) ? 'all' : 'year'),
      revenue: (summary['revenue'] as num).toDouble(),
      orderCount: summary['orderCount'] as int,
      avgOrderValue: (summary['avgOrderValue'] as num?)?.toDouble(),
      target: (summary['target'] as num?)?.toDouble(),
      attainmentPercent: (summary['attainmentPercent'] as num?)?.toDouble(),
      cost: (summary['cost'] as num?)?.toDouble(),
      profit: (summary['profit'] as num?)?.toDouble(),
      marginPercent: (summary['marginPercent'] as num?)?.toDouble(),
      avgShipmentDays: (summary['avgShipmentDays'] as num?)?.toDouble(),
      avgInvoiceDays: (summary['avgInvoiceDays'] as num?)?.toDouble(),
      avgFirstPaymentDays: (summary['avgFirstPaymentDays'] as num?)?.toDouble(),
      avgPaymentDays: (summary['avgPaymentDays'] as num?)?.toDouble(),
      avgLtv: (summary['avgLtv'] as num?)?.toDouble(),
      ltvCustomerCount: (summary['ltvCustomerCount'] as int?) ?? 0,
      avgProductRevenue: (summary['avgProductRevenue'] as num?)?.toDouble(),
      productSaleCount: (summary['productSaleCount'] as int?) ?? 0,
      avgBasketSize: (summary['avgBasketSize'] as num?)?.toDouble(),
      avgPurchaseFrequency: (summary['avgPurchaseFrequency'] as num?)?.toDouble(),
      weekly: (json['weekly'] as List<dynamic>? ?? const [])
          .map((e) => AnalyticsWeekPoint.fromJson(e as Map<String, dynamic>))
          .toList(),
      monthly: (json['monthly'] as List<dynamic>? ?? const [])
          .map((e) => AnalyticsMonthPoint.fromJson(e as Map<String, dynamic>))
          .toList(),
      quarterly: (json['quarterly'] as List<dynamic>? ?? const [])
          .map((e) => AnalyticsQuarterPoint.fromJson(e as Map<String, dynamic>))
          .toList(),
      annual: (json['annual'] as List<dynamic>? ?? const [])
          .map((e) => AnalyticsYearPoint.fromJson(e as Map<String, dynamic>))
          .toList(),
      products: (json['products'] as List<dynamic>? ?? const [])
          .map((e) => AnalyticsProductRow.fromJson(e as Map<String, dynamic>))
          .toList(),
      customers: (json['customers'] as List<dynamic>? ?? const [])
          .map((e) => AnalyticsCustomerRow.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  /// Merge progressive `/analytics` responses (core / series / tables).
  AnalyticsOverview mergeWith(
    AnalyticsOverview next, {
    required String mode,
  }) {
    if (mode == 'tables') {
      return AnalyticsOverview(
        year: year,
        years: years,
        scope: scope,
        revenue: revenue,
        orderCount: orderCount,
        avgOrderValue: avgOrderValue,
        target: target,
        attainmentPercent: attainmentPercent,
        cost: cost,
        profit: profit,
        marginPercent: marginPercent,
        avgShipmentDays: avgShipmentDays,
        avgInvoiceDays: avgInvoiceDays,
        avgFirstPaymentDays: avgFirstPaymentDays,
        avgPaymentDays: avgPaymentDays,
        avgLtv: avgLtv,
        ltvCustomerCount: ltvCustomerCount,
        avgProductRevenue: avgProductRevenue,
        productSaleCount: productSaleCount,
        avgBasketSize: avgBasketSize,
        avgPurchaseFrequency: avgPurchaseFrequency,
        weekly: weekly,
        monthly: monthly,
        quarterly: quarterly,
        annual: annual,
        products: next.products,
        customers: next.customers,
      );
    }
    if (mode == 'series') {
      return AnalyticsOverview(
        year: year,
        years: years,
        scope: scope,
        revenue: revenue,
        orderCount: orderCount,
        avgOrderValue: avgOrderValue,
        target: target,
        attainmentPercent: attainmentPercent,
        cost: cost,
        profit: profit,
        marginPercent: marginPercent,
        avgShipmentDays: avgShipmentDays,
        avgInvoiceDays: avgInvoiceDays,
        avgFirstPaymentDays: avgFirstPaymentDays,
        avgPaymentDays: avgPaymentDays,
        avgLtv: avgLtv,
        ltvCustomerCount: ltvCustomerCount,
        avgProductRevenue: avgProductRevenue,
        productSaleCount: productSaleCount,
        avgBasketSize: avgBasketSize,
        avgPurchaseFrequency: avgPurchaseFrequency,
        weekly: next.weekly.isNotEmpty ? next.weekly : weekly,
        monthly: next.monthly.isNotEmpty ? next.monthly : monthly,
        quarterly: next.quarterly.isNotEmpty ? next.quarterly : quarterly,
        annual: next.annual.isNotEmpty ? next.annual : annual,
        products: products,
        customers: customers,
      );
    }
    return next;
  }
}
