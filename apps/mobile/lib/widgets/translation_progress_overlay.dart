import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/translate_service.dart';
import '../theme/umkm_theme.dart';

/// Top progress bar while mobile UI strings are being translated.
class TranslationProgressOverlay extends StatelessWidget {
  const TranslationProgressOverlay({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<TranslateService>(
      builder: (context, translate, _) {
        if (!translate.isActive || translate.isComplete) {
          return const SizedBox.shrink();
        }

        final percent = translate.progressPercent;
        return IgnorePointer(
          child: Material(
            elevation: 2,
            color: Colors.transparent,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                LinearProgressIndicator(
                  value: translate.loading ? translate.progress : null,
                  minHeight: 3,
                  backgroundColor: UmkmColors.brandSoft.withValues(alpha: 0.45),
                  color: UmkmColors.brandDeep,
                ),
                Container(
                  color: UmkmColors.surface.withValues(alpha: 0.96),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 6,
                  ),
                  child: Text(
                    translate.loading
                        ? 'Translating workspace… $percent%'
                        : 'Finalizing translation…',
                    textAlign: TextAlign.center,
                    style: UmkmType.label(
                      size: 11,
                      weight: FontWeight.w700,
                      color: UmkmColors.brandDeep,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
