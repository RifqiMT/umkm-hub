import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/translate_service.dart';

/// Static UI label that auto-translates when a profile language is set.
class Tr extends StatefulWidget {
  const Tr(
    this.data, {
    super.key,
    this.style,
    this.maxLines,
    this.overflow,
    this.textAlign,
  });

  final String data;
  final TextStyle? style;
  final int? maxLines;
  final TextOverflow? overflow;
  final TextAlign? textAlign;

  @override
  State<Tr> createState() => _TrState();
}

class _TrState extends State<Tr> {
  late String _display;

  @override
  void initState() {
    super.initState();
    _display = widget.data;
    _resolve();
  }

  @override
  void didUpdateWidget(covariant Tr oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.data != widget.data) {
      _display = widget.data;
      _resolve();
    }
  }

  Future<void> _resolve() async {
    final svc = context.read<TranslateService>();
    if (!svc.isActive) {
      if (mounted) setState(() => _display = widget.data);
      return;
    }
    final sync = svc.text(widget.data);
    if (sync != widget.data || svc.hasCached(widget.data)) {
      if (mounted) setState(() => _display = sync);
      return;
    }
    final translated = await svc.translate(widget.data);
    if (mounted) setState(() => _display = translated);
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<TranslateService>(
      builder: (context, svc, _) {
        if (!svc.isActive) {
          return Text(
            widget.data,
            style: widget.style,
            maxLines: widget.maxLines,
            overflow: widget.overflow,
            textAlign: widget.textAlign,
          );
        }
        final label = svc.hasCached(widget.data)
            ? svc.text(widget.data)
            : _display;
        return Text(
          label,
          style: widget.style,
          maxLines: widget.maxLines,
          overflow: widget.overflow,
          textAlign: widget.textAlign,
        );
      },
    );
  }
}

/// Input decoration with a translatable label (and optional hint).
InputDecoration trInput(
  String label, {
  String? hint,
  Widget? suffixIcon,
  Widget? prefixIcon,
}) {
  return InputDecoration(
    label: Tr(label),
    hintText: hint,
    suffixIcon: suffixIcon,
    prefixIcon: prefixIcon,
  );
}
