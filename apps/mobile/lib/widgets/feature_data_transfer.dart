import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/api_service.dart';
import '../theme/umkm_theme.dart';
import '../utils/file_download.dart';
import 'auto_translate_text.dart';

enum FeatureExportEntity { products, customers, orders, warehouse, targets }

extension FeatureExportEntityApi on FeatureExportEntity {
  String get apiValue => name;
}

class FeatureDataTransferToggle extends StatelessWidget {
  const FeatureDataTransferToggle({
    super.key,
    required this.open,
    required this.onPressed,
  });

  final bool open;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = MediaQuery.sizeOf(context).width < 380;
        final label = compact ? null : 'Backup & sync';

        return OutlinedButton.icon(
          onPressed: onPressed,
          style: OutlinedButton.styleFrom(
            foregroundColor: UmkmColors.brandDeep,
            backgroundColor: open
                ? UmkmColors.brandSoft.withValues(alpha: 0.58)
                : Colors.white.withValues(alpha: 0.94),
            side: BorderSide(
              color: open
                  ? UmkmColors.brand.withValues(alpha: 0.34)
                  : UmkmColors.line.withValues(alpha: 0.85),
            ),
            padding: EdgeInsets.symmetric(
              horizontal: compact ? 10 : 12,
              vertical: 8,
            ),
            minimumSize: Size(compact ? 40 : 0, 38),
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          icon: Icon(
            Icons.sync_rounded,
            size: 16,
            color: open ? UmkmColors.brandDeep : UmkmColors.brand,
          ),
          label: label == null
              ? const SizedBox.shrink()
              : Tr(
                  label,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
        );
      },
    );
  }
}

/// Header row with toggle — place directly under [PageIntro].
class FeatureDataSyncHeader extends StatelessWidget {
  const FeatureDataSyncHeader({
    super.key,
    required this.open,
    required this.onToggle,
  });

  final bool open;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 6),
      child: Row(
        children: [
          const Spacer(),
          FeatureDataTransferToggle(open: open, onPressed: onToggle),
        ],
      ),
    );
  }
}

class FeatureDataTransferPanel extends StatefulWidget {
  const FeatureDataTransferPanel({
    super.key,
    required this.entity,
    required this.label,
    this.onImported,
  });

  final FeatureExportEntity entity;
  final String label;
  final Future<void> Function()? onImported;

  @override
  State<FeatureDataTransferPanel> createState() =>
      _FeatureDataTransferPanelState();
}

class _FeatureDataTransferPanelState extends State<FeatureDataTransferPanel> {
  String format = 'json';
  String? busy;
  String? feedback;
  bool feedbackError = false;

  String get _formatLabel => format == 'json' ? 'JSON' : 'CSV';

  Future<void> _export() async {
    setState(() {
      busy = 'export';
      feedback = null;
    });
    try {
      final api = context.read<ApiService>();
      final file = await api.downloadFeatureExport(
        entity: widget.entity.apiValue,
        format: format,
      );
      final mime = format == 'json' ? 'application/json' : 'text/csv';
      downloadBytes(file.bytes, file.filename, mime);
      if (mounted) {
        setState(() {
          feedback = '${widget.label} $_formatLabel downloaded.';
          feedbackError = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          feedback = e.toString();
          feedbackError = true;
        });
      }
    } finally {
      if (mounted) setState(() => busy = null);
    }
  }

  Future<void> _import() async {
    final picked = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: format == 'json' ? ['json'] : ['csv'],
      withData: true,
    );
    final file = picked?.files.first;
    if (file?.bytes == null) return;

    setState(() {
      busy = 'import';
      feedback = null;
    });
    try {
      if (!mounted) return;
      final api = context.read<ApiService>();
      final result = await api.uploadFeatureImport(
        entity: widget.entity.apiValue,
        format: format,
        bytes: file!.bytes!,
        filename: file.name,
      );
      final merged = result['merged'] as Map<String, dynamic>? ?? {};
      var created = 0;
      var updated = 0;
      for (final row in merged.values) {
        if (row is Map) {
          created += (row['created'] as num?)?.toInt() ?? 0;
          updated += (row['updated'] as num?)?.toInt() ?? 0;
        }
      }
      await widget.onImported?.call();
      if (mounted) {
        setState(() {
          feedback =
              'Merged ${created + updated} rows ($created new, $updated updated).';
          feedbackError = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          feedback = e.toString();
          feedbackError = true;
        });
      }
    } finally {
      if (mounted) setState(() => busy = null);
    }
  }

  Widget _formatSegment({required bool compact}) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.88),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: UmkmColors.line.withValues(alpha: 0.82)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(3),
        child: Row(
          children: [
            for (final entry in const [
              ('json', 'JSON'),
              ('csv-unified', 'CSV'),
            ])
              Expanded(
                child: _FormatChip(
                  label: entry.$2,
                  selected: format == entry.$1,
                  enabled: busy == null,
                  onTap: () => setState(() => format = entry.$1),
                ),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final working = busy != null;
    final width = MediaQuery.sizeOf(context).width;
    final compact = width < 640;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: UmkmColors.brand.withValues(alpha: 0.14),
          ),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              UmkmColors.brandSoft.withValues(alpha: 0.28),
              UmkmColors.surface.withValues(alpha: 0.98),
            ],
          ),
          boxShadow: [
            BoxShadow(
              color: UmkmColors.ink.withValues(alpha: 0.04),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'DATA',
                      style: TextStyle(
                        color: UmkmColors.brand,
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.09,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        Tr(
                          'Backup & sync',
                          style: UmkmType.display(
                            size: compact ? 15 : 16,
                            weight: FontWeight.w700,
                            color: UmkmColors.ink,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: UmkmColors.brandSoft.withValues(alpha: 0.55),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(
                              color: UmkmColors.brand.withValues(alpha: 0.22),
                            ),
                          ),
                          child: Text(
                            widget.label.toUpperCase(),
                            style: const TextStyle(
                              color: UmkmColors.brandDeep,
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.05,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Export or import ${widget.label.toLowerCase()} as $_formatLabel. Records merge by ID.',
                      style: TextStyle(
                        color: UmkmColors.muted,
                        fontSize: compact ? 11.5 : 12,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.58),
                  border: Border(
                    top: BorderSide(
                      color: UmkmColors.line.withValues(alpha: 0.72),
                    ),
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                  child: compact
                      ? Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _formatSegment(compact: true),
                            const SizedBox(height: 8),
                            _ActionButtons(
                              working: working,
                              busy: busy,
                              onExport: _export,
                              onImport: _import,
                            ),
                          ],
                        )
                      : Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            SizedBox(
                              width: 132,
                              child: _formatSegment(compact: false),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _ActionButtons(
                                working: working,
                                busy: busy,
                                onExport: _export,
                                onImport: _import,
                              ),
                            ),
                          ],
                        ),
                ),
              ),
              if (feedback != null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 9,
                  ),
                  decoration: BoxDecoration(
                    color: feedbackError
                        ? const Color(0xFFF8E8E8)
                        : UmkmColors.brandSoft.withValues(alpha: 0.45),
                    border: Border(
                      top: BorderSide(
                        color: feedbackError
                            ? const Color(0xFFEFC4C4)
                            : UmkmColors.brand.withValues(alpha: 0.18),
                      ),
                    ),
                  ),
                  child: Text(
                    feedback!,
                    style: TextStyle(
                      color: feedbackError
                          ? UmkmColors.danger
                          : UmkmColors.brandDeep,
                      fontSize: 12,
                      height: 1.4,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FormatChip extends StatelessWidget {
  const _FormatChip({
    required this.label,
    required this.selected,
    required this.enabled,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? UmkmColors.brandDeep : Colors.transparent,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : UmkmColors.muted,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}

class _ActionButtons extends StatelessWidget {
  const _ActionButtons({
    required this.working,
    required this.busy,
    required this.onExport,
    required this.onImport,
  });

  final bool working;
  final String? busy;
  final VoidCallback onExport;
  final VoidCallback onImport;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: working ? null : onExport,
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(0, 42),
              padding: const EdgeInsets.symmetric(horizontal: 10),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999),
              ),
              side: BorderSide(
                color: UmkmColors.line.withValues(alpha: 0.85),
              ),
            ),
            icon: const Icon(Icons.download_outlined, size: 17),
            label: FittedBox(
              fit: BoxFit.scaleDown,
              child: Tr(busy == 'export' ? 'Exporting…' : 'Export'),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: FilledButton.icon(
            onPressed: working ? null : onImport,
            style: FilledButton.styleFrom(
              minimumSize: const Size(0, 42),
              padding: const EdgeInsets.symmetric(horizontal: 10),
              backgroundColor: UmkmColors.brandDeep,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            icon: const Icon(Icons.upload_outlined, size: 17),
            label: FittedBox(
              fit: BoxFit.scaleDown,
              child: Tr(busy == 'import' ? 'Importing…' : 'Import'),
            ),
          ),
        ),
      ],
    );
  }
}

/// Animated expand/collapse wrapper for [FeatureDataTransferPanel].
class FeatureDataSyncSection extends StatelessWidget {
  const FeatureDataSyncSection({
    super.key,
    required this.open,
    required this.onToggle,
    required this.entity,
    required this.label,
    this.onImported,
    this.showHeader = true,
  });

  final bool open;
  final VoidCallback onToggle;
  final FeatureExportEntity entity;
  final String label;
  final Future<void> Function()? onImported;
  final bool showHeader;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (showHeader)
          FeatureDataSyncHeader(open: open, onToggle: onToggle),
        AnimatedSize(
          duration: const Duration(milliseconds: 260),
          curve: Curves.easeOutCubic,
          alignment: Alignment.topCenter,
          child: open
              ? FeatureDataTransferPanel(
                  entity: entity,
                  label: label,
                  onImported: onImported,
                )
              : const SizedBox.shrink(),
        ),
      ],
    );
  }
}
