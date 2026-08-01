import 'package:flutter/material.dart';
import '../data/countries.dart';
import '../theme/umkm_theme.dart';
import 'auto_translate_text.dart';

export 'auto_translate_text.dart' show Tr;

/// Subtitle-only intro under the shell AppBar (avoids duplicate titles).
class PageIntro extends StatelessWidget {
  const PageIntro({
    super.key,
    required this.subtitle,
    this.metrics = const [],
  });

  final String subtitle;
  /// Optional compact pulse metrics under the subtitle (FeatureStage-lite).
  final List<(String label, String value)> metrics;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final cols = metrics.isEmpty
        ? 0
        : metrics.length == 1
            ? 1
            : width >= 520
                ? metrics.length.clamp(1, 4)
                : 2;

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        UmkmSpace.md,
        UmkmSpace.xxs,
        UmkmSpace.md,
        UmkmSpace.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Tr(
            subtitle,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: UmkmColors.muted,
                  height: 1.4,
                ),
          ),
          if (metrics.isNotEmpty) ...[
            const SizedBox(height: UmkmSpace.sm),
            DecoratedBox(
              decoration: BoxDecoration(
                color: UmkmColors.surface.withOpacity(0.9),
                borderRadius: BorderRadius.circular(UmkmSpace.radiusMd),
                border: Border.all(color: UmkmColors.line.withOpacity(0.65)),
              ),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                child: Wrap(
                  spacing: 0,
                  runSpacing: 8,
                  children: [
                    for (var i = 0; i < metrics.length; i++)
                      SizedBox(
                        width: cols <= 1
                            ? double.infinity
                            : (width - UmkmSpace.md * 2 - 26) / cols,
                        child: Padding(
                          padding: EdgeInsets.only(
                            left: cols > 1 && i % cols != 0 ? 10 : 0,
                            right: cols > 1 && i % cols != cols - 1 ? 10 : 0,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Tr(
                                metrics[i].$1.toUpperCase(),
                                style: UmkmType.label(size: 10),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                metrics[i].$2,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: UmkmType.body(
                                  size: 15,
                                  weight: FontWeight.w700,
                                  color: UmkmColors.brandDeep,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class EmptyHint extends StatelessWidget {
  const EmptyHint({
    super.key,
    required this.title,
    required this.message,
  });

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: UmkmColors.surface.withOpacity(0.72),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: UmkmColors.line.withOpacity(0.85),
              style: BorderStyle.solid,
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(22, 28, 22, 28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Tr(
                  title,
                  textAlign: TextAlign.center,
                  style: UmkmType.display(
                    size: 20,
                    weight: FontWeight.w700,
                    color: UmkmColors.ink,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 8),
                Tr(
                  message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: UmkmColors.muted,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class ErrorBanner extends StatelessWidget {
  const ErrorBanner({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8E8E8),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFEFC4C4)),
      ),
      child: Text(
        message,
        style: const TextStyle(color: UmkmColors.danger),
      ),
    );
  }
}

class SuccessBanner extends StatelessWidget {
  const SuccessBanner({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFE8F5EE),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFB8DEC8)),
      ),
      child: Text(
        message,
        style: const TextStyle(color: UmkmColors.brandDeep),
      ),
    );
  }
}

class SoftSurface extends StatelessWidget {
  const SoftSurface({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFFF3F9F6),
            Color(0xFFEEF5F1),
            Color(0xFFE4EDE8),
          ],
          stops: [0.0, 0.45, 1.0],
        ),
      ),
      child: child,
    );
  }
}

class MetricTile extends StatelessWidget {
  const MetricTile({
    super.key,
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
        horizontal: UmkmSpace.sm + 2,
        vertical: UmkmSpace.sm,
      ),
      decoration: BoxDecoration(
        color: UmkmColors.surface,
        borderRadius: BorderRadius.circular(UmkmSpace.radiusSm + 2),
        border: Border.all(color: UmkmColors.line.withOpacity(0.9)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A14241E),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Tr(
            label.toUpperCase(),
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.06,
              color: UmkmColors.muted,
            ),
          ),
          const SizedBox(height: UmkmSpace.xxs + 2),
          Text(
            value,
            style: UmkmType.display(
              size: 22,
              weight: FontWeight.w700,
              color: UmkmColors.brandDeep,
              letterSpacing: -0.4,
              height: 1.1,
            ),
          ),
        ],
      ),
    );
  }
}

enum StatusTone { brand, neutral, danger }

class StatusChip extends StatelessWidget {
  const StatusChip({
    super.key,
    required this.label,
    this.tone = StatusTone.neutral,
  });

  final String label;
  final StatusTone tone;

  @override
  Widget build(BuildContext context) {
    final (Color bg, Color fg) = switch (tone) {
      StatusTone.brand => (UmkmColors.brandSoft, UmkmColors.brandDeep),
      StatusTone.danger => (const Color(0xFFF8E8E8), UmkmColors.danger),
      StatusTone.neutral => (const Color(0xFFE8F0EC), UmkmColors.muted),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Tr(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: fg,
        ),
      ),
    );
  }
}

class DetailRow extends StatelessWidget {
  const DetailRow({
    super.key,
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Tr(
            label.toUpperCase(),
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.06,
              color: UmkmColors.muted,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value.isEmpty ? '—' : value,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: UmkmColors.ink,
              height: 1.35,
            ),
          ),
        ],
      ),
    );
  }
}



class SectionLabel extends StatelessWidget {
  const SectionLabel(
    this.text, {
    super.key,
    this.subtitle,
    /// When false, only vertical padding is applied (parent supplies horizontal inset).
    this.padded = true,
  });

  final String text;
  final String? subtitle;
  final bool padded;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        padded ? UmkmSpace.md : 0,
        UmkmSpace.sm + 2,
        padded ? UmkmSpace.md : 0,
        UmkmSpace.xs,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Tr(
            text,
            style: UmkmType.title(size: 18),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: UmkmSpace.xs),
            Tr(
              subtitle!,
              style: const TextStyle(
                color: UmkmColors.muted,
                fontSize: 13,
                height: 1.5,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Compact list card for phones — content on top, actions in a footer row.
class EntityCard extends StatelessWidget {
  const EntityCard({
    super.key,
    required this.title,
    this.subtitle,
    this.details = const [],
    this.chips = const [],
    this.metrics = const [],
    this.onTap,
    this.actions = const [],
  });

  final String title;
  final String? subtitle;
  /// Stacked secondary lines (email, phone, dates) — prefer over a long subtitle.
  final List<String> details;
  final List<Widget> chips;
  final List<(String label, String value)> metrics;
  final VoidCallback? onTap;
  final List<Widget> actions;

  Widget _metricTile((String label, String value) m, {required bool last}) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(0, 2, last ? 0 : 10, 2),
      decoration: last
          ? null
          : BoxDecoration(
              border: Border(
                right: BorderSide(
                  color: UmkmColors.line.withOpacity(0.55),
                ),
              ),
            ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Tr(
            m.$1.toUpperCase(),
            style: UmkmType.label(size: 10),
          ),
          const SizedBox(height: 3),
          Text(
            m.$2,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: UmkmType.body(
              size: 14.5,
              weight: FontWeight.w700,
              color: UmkmColors.brandDeep,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final narrow = width < 380;
    final columns = metrics.length <= 1
        ? 1
        : narrow
            ? 1
            : metrics.length == 3 && width >= 420
                ? 3
                : 2;

    final metricRows = <Widget>[];
    for (var i = 0; i < metrics.length; i += columns) {
      final slice = metrics.skip(i).take(columns).toList(growable: false);
      metricRows.add(
        Padding(
          padding: EdgeInsets.only(bottom: i + columns < metrics.length ? 10 : 0),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (var j = 0; j < columns; j++) ...[
                if (j > 0) const SizedBox(width: 8),
                Expanded(
                  child: j < slice.length
                      ? _metricTile(
                          slice[j],
                          last: j == columns - 1 || j == slice.length - 1,
                        )
                      : const SizedBox.shrink(),
                ),
              ],
            ],
          ),
        ),
      );
    }

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
      elevation: 0,
      color: UmkmColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: UmkmColors.line.withOpacity(0.72)),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        splashColor: UmkmColors.brandSoft.withOpacity(0.55),
        highlightColor: UmkmColors.brandSoft.withOpacity(0.28),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(15, 15, 15, 13),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                title,
                style: UmkmType.body(
                  size: 16.5,
                  weight: FontWeight.w700,
                ),
              ),
              if (subtitle != null && subtitle!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  subtitle!,
                  style: UmkmType.body(
                    size: 13,
                    weight: FontWeight.w600,
                    color: UmkmColors.muted,
                  ),
                ),
              ],
              if (chips.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(spacing: 6, runSpacing: 6, children: chips),
              ],
              if (details.isNotEmpty) ...[
                SizedBox(
                  height: chips.isNotEmpty ||
                          (subtitle != null && subtitle!.isNotEmpty)
                      ? 6
                      : 8,
                ),
                ...details.map(
                  (line) => Padding(
                    padding: const EdgeInsets.only(bottom: 2),
                    child: Text(
                      line,
                      style: UmkmType.body(
                        size: 12.5,
                        color: UmkmColors.muted,
                      ),
                    ),
                  ),
                ),
              ],
              if (metrics.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.only(top: 10),
                  decoration: BoxDecoration(
                    border: Border(
                      top: BorderSide(
                        color: UmkmColors.line.withOpacity(0.55),
                      ),
                    ),
                  ),
                  child: Column(children: metricRows),
                ),
              ],
              if (actions.isNotEmpty) ...[
                const SizedBox(height: 10),
                Container(
                  margin: const EdgeInsets.only(top: 2),
                  padding: const EdgeInsets.fromLTRB(2, 10, 2, 2),
                  decoration: BoxDecoration(
                    border: Border(
                      top: BorderSide(
                        color: UmkmColors.line.withOpacity(0.7),
                      ),
                    ),
                  ),
                  child: Row(
                    children: actions
                        .map((a) => Expanded(child: a))
                        .toList(growable: false),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Equal-width labeled action for [EntityCard] footers.
class CardActionButton extends StatelessWidget {
  const CardActionButton({
    super.key,
    required this.icon,
    required this.label,
    required this.onPressed,
    this.danger = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onPressed;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final color = danger ? UmkmColors.danger : UmkmColors.brandDeep;
    return Material(
      color: UmkmColors.bg.withOpacity(0.55),
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 22, color: color),
              const SizedBox(height: 4),
              Tr(
                label.toUpperCase(),
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.04,
                  color: color.withOpacity(0.85),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Bottom inset so list rows clear FAB + nested chrome.
EdgeInsets listChromePadding(BuildContext context) {
  final safe = MediaQuery.paddingOf(context).bottom;
  return EdgeInsets.fromLTRB(0, 0, 0, 96 + safe);
}

/// Full-height bottom sheet for create/edit forms (keyboard-safe).
/// Title, body, and actions scroll together — no pinned header/footer.
Future<T?> showAppFormSheet<T>({
  required BuildContext context,
  required String title,
  required Widget Function(BuildContext context, StateSetter setLocal) body,
  required List<Widget> Function(BuildContext context, StateSetter setLocal)
      actions,
}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    backgroundColor: UmkmColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius:
          BorderRadius.vertical(top: Radius.circular(UmkmSpace.radiusLg)),
    ),
    builder: (ctx) {
      return StatefulBuilder(
        builder: (context, setLocal) {
          final viewInsets = MediaQuery.viewInsetsOf(context);
          final maxH = MediaQuery.sizeOf(context).height * 0.92;
          final actionWidgets = actions(context, setLocal);
          return Padding(
            padding: EdgeInsets.only(bottom: viewInsets.bottom),
            child: ConstrainedBox(
              constraints: BoxConstraints(maxHeight: maxH),
              child: SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(
                  UmkmSpace.md,
                  0,
                  UmkmSpace.md,
                  UmkmSpace.md + MediaQuery.paddingOf(context).bottom,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Tr(
                      title,
                      style: UmkmType.display(
                        size: 22,
                        weight: FontWeight.w700,
                        letterSpacing: -0.35,
                      ),
                    ),
                    const SizedBox(height: UmkmSpace.sm),
                    body(context, setLocal),
                    const SizedBox(height: UmkmSpace.lg),
                    Row(
                      children: [
                        for (var i = 0; i < actionWidgets.length; i++) ...[
                          if (i > 0) const SizedBox(width: 10),
                          Expanded(child: actionWidgets[i]),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      );
    },
  );
}

/// Scrollable view sheet for entity details.
/// Title, body, and actions scroll together — no pinned header/footer.
Future<T?> showAppViewSheet<T>({
  required BuildContext context,
  required String title,
  String? subtitle,
  required Widget body,
  List<Widget>? actions,
}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    backgroundColor: UmkmColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius:
          BorderRadius.vertical(top: Radius.circular(UmkmSpace.radiusLg)),
    ),
    builder: (ctx) {
      final maxH = MediaQuery.sizeOf(ctx).height * 0.92;
      final actionWidgets = actions ??
          [
            FilledButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Tr('Close'),
            ),
          ];
      return ConstrainedBox(
        constraints: BoxConstraints(maxHeight: maxH),
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(
            UmkmSpace.md,
            0,
            UmkmSpace.md,
            UmkmSpace.md + MediaQuery.paddingOf(ctx).bottom,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Tr(
                title,
                style: UmkmType.display(
                  size: 22,
                  weight: FontWeight.w700,
                  letterSpacing: -0.35,
                ),
              ),
              if (subtitle != null && subtitle.isNotEmpty) ...[
                const SizedBox(height: 4),
                Tr(
                  subtitle,
                  style: UmkmType.body(
                    size: 13.5,
                    color: UmkmColors.muted,
                  ),
                ),
              ],
              const SizedBox(height: UmkmSpace.sm),
              body,
              const SizedBox(height: UmkmSpace.lg),
              if (actionWidgets.length == 1)
                SizedBox(
                  width: double.infinity,
                  child: actionWidgets.first,
                )
              else
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  alignment: WrapAlignment.end,
                  children: actionWidgets
                      .map(
                        (w) => ConstrainedBox(
                          constraints: BoxConstraints(
                            minWidth: MediaQuery.sizeOf(ctx).width < 380
                                ? (MediaQuery.sizeOf(ctx).width - 48) / 2
                                : 108,
                            minHeight: UmkmSpace.touchMin,
                          ),
                          child: w,
                        ),
                      )
                      .toList(growable: false),
                ),
            ],
          ),
        ),
      );
    },
  );
}

/// Searchable country combobox for customer address forms.
class CountryField extends StatelessWidget {
  const CountryField({
    super.key,
    required this.controller,
    this.labelText = 'Country',
  });

  final TextEditingController controller;
  final String labelText;

  @override
  Widget build(BuildContext context) {
    return Autocomplete<String>(
      initialValue: TextEditingValue(text: controller.text),
      optionsBuilder: (TextEditingValue value) {
        return filterCountries(value.text, limit: 12);
      },
      displayStringForOption: (option) => option,
      onSelected: (selection) {
        controller.text = selection;
        controller.selection = TextSelection.collapsed(
          offset: selection.length,
        );
      },
      optionsViewBuilder: (context, onSelected, options) {
        return Align(
          alignment: Alignment.topLeft,
          child: Material(
            elevation: 6,
            color: UmkmColors.surface,
            borderRadius: BorderRadius.circular(12),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 240, maxWidth: 420),
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(vertical: 6),
                shrinkWrap: true,
                itemCount: options.length,
                itemBuilder: (context, index) {
                  final option = options.elementAt(index);
                  return ListTile(
                    dense: true,
                    title: Text(option),
                    onTap: () => onSelected(option),
                  );
                },
              ),
            ),
          ),
        );
      },
      fieldViewBuilder: (
        context,
        textController,
        focusNode,
        onFieldSubmitted,
      ) {
        if (textController.text != controller.text &&
            textController.text.isEmpty &&
            controller.text.isNotEmpty) {
          textController.text = controller.text;
        }
        return TextField(
          controller: textController,
          focusNode: focusNode,
          textInputAction: TextInputAction.next,
          decoration: InputDecoration(
            labelText: labelText,
            hintText: 'Search country…',
            suffixIcon: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (textController.text.isNotEmpty)
                  IconButton(
                    tooltip: 'Clear',
                    icon: const Icon(Icons.close, size: 18),
                    onPressed: () {
                      textController.clear();
                      controller.clear();
                    },
                  ),
                const Icon(Icons.expand_more, color: UmkmColors.muted),
                const SizedBox(width: 6),
              ],
            ),
          ),
          onChanged: (value) {
            controller.text = value;
          },
          onSubmitted: (_) => onFieldSubmitted(),
        );
      },
    );
  }
}

/// Nested block inside dialogs / forms (Basics, Pack, Address, …).
class FormSection extends StatelessWidget {
  const FormSection({
    super.key,
    required this.title,
    this.description,
    required this.child,
  });

  final String title;
  final String? description;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
      decoration: BoxDecoration(
        color: UmkmColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: UmkmColors.line.withOpacity(0.9)),
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
          Tr(
            title,
            style: UmkmType.title(size: 16),
          ),
          if (description != null) ...[
            const SizedBox(height: 8),
            Tr(
              description!,
              style: const TextStyle(
                color: UmkmColors.muted,
                fontSize: 12.5,
                height: 1.5,
              ),
            ),
          ],
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class ChoiceOption<T> {
  const ChoiceOption({
    required this.value,
    required this.label,
    this.enabled = true,
  });

  final T value;
  final String label;
  final bool enabled;
}

/// Segmented chip group for short enum / filter choices.
class ChoiceChipGroup<T> extends StatelessWidget {
  const ChoiceChipGroup({
    super.key,
    required this.value,
    required this.options,
    required this.onChanged,
    this.allowEmpty = false,
    this.emptyLabel = 'None',
    this.emptyValue,
  });

  final T? value;
  final List<ChoiceOption<T>> options;
  final ValueChanged<T?> onChanged;
  final bool allowEmpty;
  final String emptyLabel;
  final T? emptyValue;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F6F4),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: UmkmColors.line.withOpacity(0.85)),
      ),
      child: Wrap(
        spacing: 6,
        runSpacing: 6,
        children: [
          if (allowEmpty)
            _ChoiceChipButton(
              label: emptyLabel,
              selected: value == emptyValue || value == null,
              onTap: () => onChanged(emptyValue),
            ),
          for (final opt in options)
            _ChoiceChipButton(
              label: opt.label,
              selected: value == opt.value,
              enabled: opt.enabled,
              onTap: opt.enabled ? () => onChanged(opt.value) : null,
            ),
        ],
      ),
    );
  }
}

/// Collapsible filter chrome — collapsed by default on phones/tablets.
class ExpandableFilters extends StatefulWidget {
  const ExpandableFilters({
    super.key,
    required this.child,
    this.title = 'Filters',
    this.activeCount = 0,
    this.idleHint = 'All',
    this.initiallyExpanded = false,
  });

  final Widget child;
  final String title;
  final int activeCount;
  final String idleHint;
  final bool initiallyExpanded;

  @override
  State<ExpandableFilters> createState() => _ExpandableFiltersState();
}

class _ExpandableFiltersState extends State<ExpandableFilters> {
  late bool _open = widget.initiallyExpanded;

  @override
  Widget build(BuildContext context) {
    final active = widget.activeCount > 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Material(
          color: active
              ? Color.lerp(UmkmColors.brandSoft, Colors.white, 0.45)
              : UmkmColors.surface,
          borderRadius: BorderRadius.circular(14),
          child: InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: () => setState(() => _open = !_open),
            child: Container(
              constraints: const BoxConstraints(minHeight: 48),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: active
                      ? UmkmColors.brand.withOpacity(0.35)
                      : UmkmColors.line.withOpacity(0.85),
                ),
              ),
              child: Row(
                children: [
                  Tr(
                    widget.title,
                    style: UmkmType.body(
                      size: 14.5,
                      weight: FontWeight.w700,
                      color: UmkmColors.brandDeep,
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (active)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: UmkmColors.brandSoft,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        '${widget.activeCount} active',
                        style: UmkmType.label(
                          size: 11,
                          weight: FontWeight.w700,
                          color: UmkmColors.brandDeep,
                        ),
                      ),
                    )
                  else
                    Tr(
                      widget.idleHint,
                      style: UmkmType.body(
                        size: 13,
                        weight: FontWeight.w600,
                        color: UmkmColors.muted,
                      ),
                    ),
                  const Spacer(),
                  AnimatedRotation(
                    turns: _open ? 0.5 : 0,
                    duration: const Duration(milliseconds: 180),
                    child: const Icon(
                      Icons.keyboard_arrow_down_rounded,
                      color: UmkmColors.muted,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        AnimatedCrossFade(
          firstChild: const SizedBox(width: double.infinity, height: 0),
          secondChild: Padding(
            padding: const EdgeInsets.only(top: 10),
            child: widget.child,
          ),
          crossFadeState:
              _open ? CrossFadeState.showSecond : CrossFadeState.showFirst,
          duration: const Duration(milliseconds: 200),
          sizeCurve: Curves.easeOutCubic,
        ),
      ],
    );
  }
}

class _ChoiceChipButton extends StatelessWidget {
  const _ChoiceChipButton({
    required this.label,
    required this.selected,
    this.enabled = true,
    this.onTap,
  });

  final String label;
  final bool selected;
  final bool enabled;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? UmkmColors.surface : Colors.transparent,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(10),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: selected
                  ? UmkmColors.brand.withOpacity(0.35)
                  : Colors.transparent,
            ),
            boxShadow: selected
                ? const [
                    BoxShadow(
                      color: Color(0x0A14241E),
                      blurRadius: 4,
                      offset: Offset(0, 1),
                    ),
                  ]
                : null,
          ),
          child: Tr(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: !enabled
                  ? UmkmColors.muted.withOpacity(0.5)
                  : selected
                      ? UmkmColors.brandDeep
                      : UmkmColors.muted,
            ),
          ),
        ),
      ),
    );
  }
}
