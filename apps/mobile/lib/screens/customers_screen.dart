import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../format_id.dart';
import '../services/api_service.dart';
import '../theme/umkm_theme.dart';
import '../widgets/ui.dart';
import '../widgets/feature_data_transfer.dart';

String _partnershipLabel(String? stage) {
  switch (stage) {
    case 'WHATSAPP':
      return 'WhatsApp';
    case 'EMAIL':
      return 'Email';
    case 'DIRECT_VISIT':
      return 'Direct visit';
    default:
      return stage?.isNotEmpty == true ? stage! : '—';
  }
}

String _promiseLabels(Customer customer) {
  final tags = <String>[
    if (customer.promiseAnnualBonus) 'Annual bonus',
    if (customer.promiseOnTimeDelivery) 'On-time delivery',
    if (customer.promisePackagingBox) 'Packaging box',
  ];
  return tags.isEmpty ? '—' : tags.join(', ');
}

class CustomersScreen extends StatefulWidget {
  const CustomersScreen({super.key});

  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  List<Customer> items = [];
  String? error;
  bool loading = true;
  bool _dataSyncOpen = false;

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
      items = await context.read<ApiService>().listCustomers();
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _openForm({Customer? existing}) async {
    final name = TextEditingController(text: existing?.name ?? '');
    final title = TextEditingController(text: existing?.title ?? '');
    final company = TextEditingController(text: existing?.companyName ?? '');
    final email = TextEditingController(text: existing?.email ?? '');
    final phone = TextEditingController(text: existing?.phone ?? '');
    final npwp = TextEditingController(text: existing?.npwp ?? '');
    final address = TextEditingController(text: existing?.address ?? '');
    final additionalAddress =
        TextEditingController(text: existing?.additionalAddress ?? '');
    final postalCode = TextEditingController(text: existing?.postalCode ?? '');
    final city = TextEditingController(text: existing?.city ?? '');
    final province = TextEditingController(text: existing?.province ?? '');
    final country = TextEditingController(text: existing?.country ?? '');
    final needs = TextEditingController(text: existing?.customerNeeds ?? '');
    final standards =
        TextEditingController(text: existing?.desiredStandards ?? '');
    final remarks = TextEditingController(text: existing?.remarks ?? '');
    String companyType = existing?.companyType ?? 'RESTAURANT';
    String? partnership = existing?.partnershipStage;
    String? status = existing?.status;
    String? relationship = existing?.relationshipLevel;
    int approval = existing?.approvalPercentage ?? 0;
    bool bonus = existing?.promiseAnnualBonus ?? false;
    bool onTime = existing?.promiseOnTimeDelivery ?? false;
    bool packing = existing?.promisePackagingBox ?? false;

    final approvalCtrl =
        TextEditingController(text: approval.toString());

    final saved = await showAppFormSheet<bool>(
      context: context,
      title: existing == null ? 'Add customer' : 'Edit customer',
      body: (context, setLocal) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FormSection(
            title: 'Contact',
            description: 'Name, title, and company are required.',
            child: Column(
              children: [
                TextField(
                  controller: name,
                  decoration: const InputDecoration(labelText: 'Name *'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: title,
                  decoration: const InputDecoration(labelText: 'Title *'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: company,
                  decoration: const InputDecoration(labelText: 'Company *'),
                ),
                const SizedBox(height: 8),
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Company type *',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: UmkmColors.muted,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                ChoiceChipGroup<String>(
                  value: companyType,
                  onChanged: (v) =>
                      setLocal(() => companyType = v ?? companyType),
                  options: const [
                    ChoiceOption(value: 'RESTAURANT', label: 'Restaurant'),
                    ChoiceOption(value: 'HOTEL', label: 'Hotel'),
                    ChoiceOption(value: 'STORE', label: 'Store'),
                  ],
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: email,
                  decoration:
                      const InputDecoration(labelText: 'Email (optional)'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: phone,
                  decoration:
                      const InputDecoration(labelText: 'Phone (optional)'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: npwp,
                  decoration: const InputDecoration(
                    labelText: 'NPWP (buyer)',
                    helperText: 'Optional — for B2B invoices & e-Faktur',
                  ),
                ),
              ],
            ),
          ),
          FormSection(
            title: 'Address',
            description:
                'Enter postal code and country first — address, city, and province fill in when found.',
            child: _CustomerAddressFields(
              postalCode: postalCode,
              country: country,
              address: address,
              additionalAddress: additionalAddress,
              city: city,
              province: province,
              onChanged: () => setLocal(() {}),
            ),
          ),
          FormSection(
            title: 'Pipeline',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Partnership stage',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: UmkmColors.muted,
                  ),
                ),
                const SizedBox(height: 6),
                ChoiceChipGroup<String>(
                  value: partnership,
                  allowEmpty: true,
                  emptyLabel: 'None',
                  onChanged: (v) => setLocal(() => partnership = v),
                  options: const [
                    ChoiceOption(value: 'WHATSAPP', label: 'WhatsApp'),
                    ChoiceOption(value: 'EMAIL', label: 'Email'),
                    ChoiceOption(value: 'DIRECT_VISIT', label: 'Direct visit'),
                  ],
                ),
                const SizedBox(height: 12),
                const Text(
                  'Status',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: UmkmColors.muted,
                  ),
                ),
                const SizedBox(height: 6),
                ChoiceChipGroup<String>(
                  value: status,
                  allowEmpty: true,
                  emptyLabel: 'None',
                  onChanged: (v) => setLocal(() => status = v),
                  options: const [
                    ChoiceOption(
                      value: 'NOT_INTERESTED',
                      label: 'Not interested',
                    ),
                    ChoiceOption(value: 'DOUBTFUL', label: 'Doubtful'),
                    ChoiceOption(value: 'INTERESTED', label: 'Interested'),
                    ChoiceOption(value: 'OTHERS', label: 'Others'),
                  ],
                ),
                const SizedBox(height: 12),
                const Text(
                  'Relationship',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: UmkmColors.muted,
                  ),
                ),
                const SizedBox(height: 6),
                ChoiceChipGroup<String>(
                  value: relationship,
                  allowEmpty: true,
                  emptyLabel: 'None',
                  onChanged: (v) => setLocal(() => relationship = v),
                  options: const [
                    ChoiceOption(value: 'NEGOTIATION', label: 'Negotiation'),
                    ChoiceOption(
                      value: 'REQUEST_SAMPLE',
                      label: 'Request sample',
                    ),
                    ChoiceOption(
                      value: 'CLOSING_FIRST_ORDER',
                      label: 'Closing first order',
                    ),
                    ChoiceOption(value: 'WILL_CONTACT', label: 'Will contact'),
                    ChoiceOption(
                      value: 'INITIAL_APPROACH',
                      label: 'Initial approach',
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: approvalCtrl,
                  decoration: const InputDecoration(labelText: 'Approval %'),
                  keyboardType: TextInputType.number,
                  onChanged: (v) => approval = int.tryParse(v) ?? 0,
                ),
              ],
            ),
          ),
          FormSection(
            title: 'Notes & promises',
            child: Column(
              children: [
                TextField(
                  controller: needs,
                  decoration: const InputDecoration(labelText: 'Needs'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: standards,
                  decoration: const InputDecoration(labelText: 'Standards'),
                ),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: bonus,
                  onChanged: (v) => setLocal(() => bonus = v ?? false),
                  title: const Text('Annual bonus promise'),
                ),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: onTime,
                  onChanged: (v) => setLocal(() => onTime = v ?? false),
                  title: const Text('On-time delivery'),
                ),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: packing,
                  onChanged: (v) => setLocal(() => packing = v ?? false),
                  title: const Text('Packaging box'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: remarks,
                  decoration: const InputDecoration(labelText: 'Remarks'),
                ),
              ],
            ),
          ),
        ],
      ),
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
    if (name.text.trim().isEmpty ||
        title.text.trim().isEmpty ||
        company.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Name, title, and company name are required'),
        ),
      );
      return;
    }
    final body = <String, dynamic>{
      'name': name.text.trim(),
      'title': title.text.trim(),
      'companyName': company.text.trim(),
      'companyType': companyType,
      'promiseAnnualBonus': bonus,
      'promiseOnTimeDelivery': onTime,
      'promisePackagingBox': packing,
      'approvalPercentage': approval,
    };
    final emailValue = email.text.trim();
    final phoneValue = phone.text.trim();
    final npwpValue = npwp.text.trim();
    final addressValue = address.text.trim();
    final additionalAddressValue = additionalAddress.text.trim();
    final postalCodeValue = postalCode.text.trim();
    final cityValue = city.text.trim();
    final provinceValue = province.text.trim();
    final countryValue = country.text.trim();
    final needsValue = needs.text.trim();
    final standardsValue = standards.text.trim();
    final remarksValue = remarks.text.trim();
    if (emailValue.isNotEmpty) body['email'] = emailValue;
    if (phoneValue.isNotEmpty) body['phone'] = phoneValue;
    if (npwpValue.isNotEmpty) body['npwp'] = npwpValue;
    if (addressValue.isNotEmpty) body['address'] = addressValue;
    if (additionalAddressValue.isNotEmpty) {
      body['additionalAddress'] = additionalAddressValue;
    }
    if (postalCodeValue.isNotEmpty) body['postalCode'] = postalCodeValue;
    if (cityValue.isNotEmpty) body['city'] = cityValue;
    if (provinceValue.isNotEmpty) body['province'] = provinceValue;
    if (countryValue.isNotEmpty) body['country'] = countryValue;
    if (partnership != null) body['partnershipStage'] = partnership;
    if (status != null) body['status'] = status;
    if (needsValue.isNotEmpty) body['customerNeeds'] = needsValue;
    if (standardsValue.isNotEmpty) body['desiredStandards'] = standardsValue;
    if (relationship != null) body['relationshipLevel'] = relationship;
    if (remarksValue.isNotEmpty) body['remarks'] = remarksValue;
    try {
      final api = context.read<ApiService>();
      if (existing == null) {
        await api.request('POST', '/customers', body: body);
      } else {
        await api.request('PATCH', '/customers/${existing.id}', body: body);
      }
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _delete(Customer customer) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete customer?'),
        content: Text(
          'Delete "${customer.name}"?\n\nThis cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: UmkmColors.danger,
              foregroundColor: const Color(0xFFF4FFFB),
            ),
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
          .request('DELETE', '/customers/${customer.id}');
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _openView(Customer customer) async {
    final action = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(customer.name),
        content: SizedBox(
          width: 420,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                DetailRow(label: 'Customer ID', value: customer.displayId),
                DetailRow(label: 'Title', value: customer.title),
                DetailRow(label: 'Company', value: customer.companyName),
                DetailRow(label: 'Company type', value: customer.companyType),
                DetailRow(
                  label: 'NPWP',
                  value: customer.npwp.isNotEmpty ? customer.npwp : '—',
                ),
                DetailRow(
                  label: 'Email',
                  value: customer.email.isNotEmpty ? customer.email : '—',
                ),
                DetailRow(
                  label: 'Phone',
                  value: customer.phone.isNotEmpty ? customer.phone : '—',
                ),
                DetailRow(
                  label: 'Address',
                  value: customer.address.isNotEmpty ? customer.address : '—',
                ),
                DetailRow(
                  label: 'Additional address',
                  value: customer.additionalAddress.isNotEmpty
                      ? customer.additionalAddress
                      : '—',
                ),
                DetailRow(
                  label: 'Postal code',
                  value: customer.postalCode.isNotEmpty
                      ? customer.postalCode
                      : '—',
                ),
                DetailRow(
                  label: 'City',
                  value: customer.city.isNotEmpty ? customer.city : '—',
                ),
                DetailRow(
                  label: 'Province',
                  value: customer.province.isNotEmpty ? customer.province : '—',
                ),
                DetailRow(
                  label: 'Country',
                  value: customer.country.isNotEmpty ? customer.country : '—',
                ),
                DetailRow(
                  label: 'Partnership stage',
                  value: _partnershipLabel(customer.partnershipStage),
                ),
                DetailRow(
                  label: 'Status',
                  value: customer.status ?? '—',
                ),
                DetailRow(
                  label: 'Relationship',
                  value: customer.relationshipLevel ?? '—',
                ),
                DetailRow(
                  label: 'Approval',
                  value: '${customer.approvalPercentage}%',
                ),
                DetailRow(
                  label: 'Needs',
                  value: customer.customerNeeds.isNotEmpty
                      ? customer.customerNeeds
                      : '—',
                ),
                DetailRow(
                  label: 'Standards',
                  value: customer.desiredStandards.isNotEmpty
                      ? customer.desiredStandards
                      : '—',
                ),
                DetailRow(
                  label: 'Promises',
                  value: _promiseLabels(customer),
                ),
                DetailRow(
                  label: 'Remarks',
                  value: customer.remarks.isNotEmpty ? customer.remarks : '—',
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
          TextButton(
            onPressed: () => Navigator.pop(context, 'delete'),
            child: const Text('Delete'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, 'edit'),
            child: const Text('Edit'),
          ),
        ],
      ),
    );
    if (!mounted) return;
    if (action == 'edit') await _openForm(existing: customer);
    if (action == 'delete') await _delete(customer);
  }

  Widget _buildDataSyncSection() {
    return FeatureDataSyncSection(
      open: _dataSyncOpen,
      onToggle: () => setState(() => _dataSyncOpen = !_dataSyncOpen),
      entity: FeatureExportEntity.customers,
      label: 'Customers',
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
        child: items.isEmpty
            ? ListView(
                children: [
                  const PageIntro(
                    subtitle: 'CRM contacts and partnership pipeline.',
                  ),
                  _buildDataSyncSection(),
                  const SectionLabel(
                    'Directory',
                    subtitle: 'Companies and contacts in your pipeline.',
                  ),
                  SizedBox(height: 8),
                  EmptyHint(
                    title: 'No customers yet',
                    message: 'Tap + to add your first customer.',
                  ),
                ],
              )
            : ListView.builder(
                padding: listChromePadding(context),
                itemCount: items.length + 1,
                itemBuilder: (context, i) {
                  if (i == 0) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const PageIntro(
                          subtitle: 'CRM contacts and partnership pipeline.',
                        ),
                        _buildDataSyncSection(),
                        const SectionLabel(
                          'Directory',
                          subtitle: 'Companies and contacts in your pipeline.',
                        ),
                      ],
                    );
                  }
                  final c = items[i - 1];
                  return EntityCard(
                    title: c.name,
                    subtitle: [
                      c.companyName,
                      if (c.city.isNotEmpty) c.city,
                    ].where((s) => s.isNotEmpty).join(' · '),
                    details: [
                      if (c.email.isNotEmpty) c.email,
                      if (c.phone.isNotEmpty) c.phone,
                    ],
                    chips: [
                      StatusChip(
                        label: c.customerId.isNotEmpty ? c.customerId : entityIdLabel(c.id),
                        tone: StatusTone.neutral,
                      ),
                      if (c.status != null)
                        StatusChip(
                          label: c.status!,
                          tone: StatusTone.brand,
                        ),
                    ],
                    metrics: [
                      if (c.relationshipLevel != null)
                        ('Relationship', c.relationshipLevel!),
                      ('Approval', '${c.approvalPercentage}%'),
                    ],
                    onTap: () => _openView(c),
                    actions: [
                      CardActionButton(
                        icon: Icons.visibility_outlined,
                        label: 'View',
                        onPressed: () => _openView(c),
                      ),
                      CardActionButton(
                        icon: Icons.edit_outlined,
                        label: 'Edit',
                        onPressed: () => _openForm(existing: c),
                      ),
                      CardActionButton(
                        icon: Icons.delete_outline,
                        label: 'Delete',
                        danger: true,
                        onPressed: () => _delete(c),
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

class _CustomerAddressFields extends StatefulWidget {
  const _CustomerAddressFields({
    required this.postalCode,
    required this.country,
    required this.address,
    required this.additionalAddress,
    required this.city,
    required this.province,
    required this.onChanged,
  });

  final TextEditingController postalCode;
  final TextEditingController country;
  final TextEditingController address;
  final TextEditingController additionalAddress;
  final TextEditingController city;
  final TextEditingController province;
  final VoidCallback onChanged;

  @override
  State<_CustomerAddressFields> createState() => _CustomerAddressFieldsState();
}

class _CustomerAddressFieldsState extends State<_CustomerAddressFields> {
  Timer? _debounce;
  String _status = 'idle';
  String _autoAddress = '';
  String _autoCity = '';
  String _autoProvince = '';
  int _requestId = 0;

  @override
  void initState() {
    super.initState();
    widget.postalCode.addListener(_scheduleLookup);
    widget.country.addListener(_scheduleLookup);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    widget.postalCode.removeListener(_scheduleLookup);
    widget.country.removeListener(_scheduleLookup);
    super.dispose();
  }

  void _scheduleLookup() {
    _debounce?.cancel();
    final country = widget.country.text.trim();
    final postal = widget.postalCode.text.trim();
    if (country.isEmpty || postal.length < 3) {
      if (_status != 'idle') setState(() => _status = 'idle');
      return;
    }
    setState(() => _status = 'loading');
    _debounce = Timer(const Duration(milliseconds: 450), _lookup);
  }

  Future<void> _lookup() async {
    final country = widget.country.text.trim();
    final postal = widget.postalCode.text.trim();
    if (country.isEmpty || postal.length < 3 || !mounted) return;

    final id = ++_requestId;
    try {
      final result = await context.read<ApiService>().lookupPostal(
            country: country,
            postalCode: postal,
          );
      if (!mounted || id != _requestId) return;

      final found = result['found'] == true;
      if (!found) {
        setState(() => _status = 'miss');
        return;
      }

      final nextAddress = (result['address'] as String?)?.trim() ?? '';
      final nextCity = (result['city'] as String?)?.trim() ?? '';
      final nextProvince = (result['province'] as String?)?.trim() ?? '';

      void apply(TextEditingController ctrl, String value, String autoValue) {
        if (value.isEmpty) return;
        final current = ctrl.text.trim();
        if (current.isEmpty || current == autoValue) {
          ctrl.text = value;
        }
      }

      apply(widget.address, nextAddress, _autoAddress);
      apply(widget.city, nextCity, _autoCity);
      apply(widget.province, nextProvince, _autoProvince);

      _autoAddress = widget.address.text;
      _autoCity = widget.city.text;
      _autoProvince = widget.province.text;

      setState(() => _status = 'filled');
      widget.onChanged();
    } catch (_) {
      if (!mounted || id != _requestId) return;
      setState(() => _status = 'miss');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: widget.postalCode,
          decoration: const InputDecoration(labelText: 'Postal code'),
          keyboardType: TextInputType.text,
        ),
        const SizedBox(height: 8),
        CountryField(controller: widget.country),
        if (_status == 'loading') ...[
          const SizedBox(height: 8),
          const Text(
            'Looking up location from postal code…',
            style: TextStyle(color: UmkmColors.muted, fontSize: 12.5),
          ),
        ],
        if (_status == 'filled') ...[
          const SizedBox(height: 8),
          const Text(
            'Address fields updated from postal code.',
            style: TextStyle(color: UmkmColors.muted, fontSize: 12.5),
          ),
        ],
        if (_status == 'miss') ...[
          const SizedBox(height: 8),
          const Text(
            'No match yet — fill address fields manually.',
            style: TextStyle(color: UmkmColors.muted, fontSize: 12.5),
          ),
        ],
        const SizedBox(height: 8),
        TextField(
          controller: widget.address,
          decoration: const InputDecoration(labelText: 'Address'),
          onChanged: (_) => _autoAddress = '',
        ),
        const SizedBox(height: 8),
        TextField(
          controller: widget.additionalAddress,
          decoration: const InputDecoration(labelText: 'Additional address'),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: widget.city,
          decoration: const InputDecoration(labelText: 'City'),
          onChanged: (_) => _autoCity = '',
        ),
        const SizedBox(height: 8),
        TextField(
          controller: widget.province,
          decoration: const InputDecoration(labelText: 'Province'),
          onChanged: (_) => _autoProvince = '',
        ),
      ],
    );
  }
}
