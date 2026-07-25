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
    this.sku = '',
    this.price50,
    this.price100,
    this.price250,
    this.price500,
    this.price1000,
    this.priceCustom,
    this.costPerUnit,
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
  final String sku;
  final String name;
  final String unit;
  final double stockQty;
  final double pricePerUnit;
  final String details;
  final double? price50;
  final double? price100;
  final double? price250;
  final double? price500;
  final double? price1000;
  final double? priceCustom;
  final double? costPerUnit;
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

  String get displayId => sku.isNotEmpty ? sku : id;

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: json['id'] as String,
        sku: (json['sku'] as String?) ?? '',
        name: json['name'] as String,
        unit: (json['unit'] as String?) ?? 'PCS',
        stockQty: (json['stockQty'] as num).toDouble(),
        pricePerUnit: (json['pricePerUnit'] as num).toDouble(),
        details: (json['details'] as String?) ?? '',
        price50: (json['price50'] as num?)?.toDouble(),
        price100: (json['price100'] as num?)?.toDouble(),
        price250: (json['price250'] as num?)?.toDouble(),
        price500: (json['price500'] as num?)?.toDouble(),
        price1000: (json['price1000'] as num?)?.toDouble(),
        priceCustom: (json['priceCustom'] as num?)?.toDouble(),
        costPerUnit: (json['costPerUnit'] as num?)?.toDouble(),
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
        'price50': price50,
        'price100': price100,
        'price250': price250,
        'price500': price500,
        'price1000': price1000,
        'priceCustom': priceCustom,
        'costPerUnit': costPerUnit,
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
    this.sku = '',
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
  final String sku;
  final String name;
  final String title;
  final String companyName;
  final String companyType;
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

  String get displayId => sku.isNotEmpty ? sku : id;

  factory Customer.fromJson(Map<String, dynamic> json) => Customer(
        id: json['id'] as String,
        sku: (json['sku'] as String?) ?? '',
        name: json['name'] as String,
        title: (json['title'] as String?) ?? '',
        companyName: json['companyName'] as String,
        companyType: json['companyType'] as String,
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
    this.sku = '',
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
    this.invoiceStatus = 'CREATED',
    this.invoiceDate,
    this.lines = const [],
    this.lineCount = 1,
    this.installments = const [],
    this.paidAmount = 0,
    required this.remainingAmount,
  });

  final String id;
  final String sku;
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
  final String invoiceStatus;
  final String? invoiceDate;
  final List<OrderLineItem> lines;
  final int lineCount;
  final List<OrderInstallment> installments;
  final double paidAmount;
  final double remainingAmount;

  String get displayId => sku.isNotEmpty ? sku : id;

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
    final customer = json['customer'] as Map<String, dynamic>?;
    return OrderItem(
      id: json['id'] as String,
      sku: (json['sku'] as String?) ?? '',
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
      invoiceStatus: (json['invoiceStatus'] as String?) ?? 'CREATED',
      invoiceDate: invoiceDateRaw != null && invoiceDateRaw.length >= 10
          ? invoiceDateRaw.substring(0, 10)
          : invoiceDateRaw,
      lines: lines,
      lineCount: (json['lineCount'] as int?) ?? lines.length,
      installments: installments,
      paidAmount: (json['paidAmount'] as num?)?.toDouble() ??
          (paidFromInstallments > 0 ? paidFromInstallments : 0),
      remainingAmount: (json['remainingAmount'] as num?)?.toDouble() ??
          (totalOrderValue - paidFromInstallments).clamp(0, double.infinity),
    );
  }
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
    this.avgFirstPaymentDays,
    this.firstPaymentSampleSize = 0,
    this.avgPaymentDays,
    this.paymentSampleSize = 0,
    this.avgLtv,
  });

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
  final double? avgFirstPaymentDays;
  final int firstPaymentSampleSize;
  final double? avgPaymentDays;
  final int paymentSampleSize;
  final double? avgLtv;

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
      avgFirstPaymentDays: (json['avgFirstPaymentDays'] as num?)?.toDouble(),
      firstPaymentSampleSize: (json['firstPaymentSampleSize'] as int?) ?? 0,
      avgPaymentDays: (json['avgPaymentDays'] as num?)?.toDouble(),
      paymentSampleSize: (json['paymentSampleSize'] as int?) ?? 0,
      avgLtv: (json['avgLtv'] as num?)?.toDouble(),
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
    this.avgFirstPaymentDays,
    this.firstPaymentSampleSize = 0,
    this.avgPaymentDays,
    this.paymentSampleSize = 0,
    this.avgLtv,
  });

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
  final double? avgFirstPaymentDays;
  final int firstPaymentSampleSize;
  final double? avgPaymentDays;
  final int paymentSampleSize;
  final double? avgLtv;

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
      avgFirstPaymentDays: (json['avgFirstPaymentDays'] as num?)?.toDouble(),
      firstPaymentSampleSize: (json['firstPaymentSampleSize'] as int?) ?? 0,
      avgPaymentDays: (json['avgPaymentDays'] as num?)?.toDouble(),
      paymentSampleSize: (json['paymentSampleSize'] as int?) ?? 0,
      avgLtv: (json['avgLtv'] as num?)?.toDouble(),
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
    required this.revenue,
    this.avgOrderValue,
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
  final double revenue;
  final double? avgOrderValue;
  final double discount;
  final double? discountPercent;
  final double? cost;
  final double? costPercent;
  final double? profit;
  final double? marginPercent;

  factory AnalyticsProductRow.fromJson(Map<String, dynamic> json) {
    return AnalyticsProductRow(
      productId: json['productId'] as String,
      name: json['name'] as String,
      unit: json['unit'] as String,
      orderCount: json['orderCount'] as int,
      qtySold: (json['qtySold'] as num).toDouble(),
      revenue: (json['revenue'] as num).toDouble(),
      avgOrderValue: (json['avgOrderValue'] as num?)?.toDouble(),
      discount: (json['discount'] as num?)?.toDouble() ?? 0,
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
    required this.revenue,
    this.avgOrderValue,
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
  final double revenue;
  final double? avgOrderValue;
  final double discount;
  final double? discountPercent;
  final double? cost;
  final double? costPercent;
  final double? profit;
  final double? marginPercent;

  factory AnalyticsCustomerRow.fromJson(Map<String, dynamic> json) {
    return AnalyticsCustomerRow(
      customerId: json['customerId'] as String,
      name: json['name'] as String,
      companyName: (json['companyName'] as String?) ?? '',
      companyType: (json['companyType'] as String?) ?? '',
      orderCount: json['orderCount'] as int,
      revenue: (json['revenue'] as num).toDouble(),
      avgOrderValue: (json['avgOrderValue'] as num?)?.toDouble(),
      discount: (json['discount'] as num?)?.toDouble() ?? 0,
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
    this.avgFirstPaymentDays,
    this.avgPaymentDays,
    this.avgLtv,
    this.ltvCustomerCount = 0,
    required this.monthly,
    required this.annual,
    required this.products,
    required this.customers,
  });

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
  final double? avgFirstPaymentDays;
  final double? avgPaymentDays;
  final double? avgLtv;
  final int ltvCustomerCount;
  final List<AnalyticsMonthPoint> monthly;
  final List<AnalyticsYearPoint> annual;
  final List<AnalyticsProductRow> products;
  final List<AnalyticsCustomerRow> customers;

  factory AnalyticsOverview.fromJson(Map<String, dynamic> json) {
    final summary = json['summary'] as Map<String, dynamic>;
    return AnalyticsOverview(
      year: json['year'] as int,
      revenue: (summary['revenue'] as num).toDouble(),
      orderCount: summary['orderCount'] as int,
      avgOrderValue: (summary['avgOrderValue'] as num?)?.toDouble(),
      target: (summary['target'] as num?)?.toDouble(),
      attainmentPercent: (summary['attainmentPercent'] as num?)?.toDouble(),
      cost: (summary['cost'] as num?)?.toDouble(),
      profit: (summary['profit'] as num?)?.toDouble(),
      marginPercent: (summary['marginPercent'] as num?)?.toDouble(),
      avgShipmentDays: (summary['avgShipmentDays'] as num?)?.toDouble(),
      avgFirstPaymentDays: (summary['avgFirstPaymentDays'] as num?)?.toDouble(),
      avgPaymentDays: (summary['avgPaymentDays'] as num?)?.toDouble(),
      avgLtv: (summary['avgLtv'] as num?)?.toDouble(),
      ltvCustomerCount: (summary['ltvCustomerCount'] as int?) ?? 0,
      monthly: (json['monthly'] as List<dynamic>)
          .map((e) => AnalyticsMonthPoint.fromJson(e as Map<String, dynamic>))
          .toList(),
      annual: (json['annual'] as List<dynamic>)
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
}
