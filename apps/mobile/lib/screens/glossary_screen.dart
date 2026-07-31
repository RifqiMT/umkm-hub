import 'package:flutter/material.dart';

import '../glossary/glossary_catalog.dart';
import '../theme/umkm_theme.dart';
import '../widgets/ui.dart';

class GlossaryScreen extends StatefulWidget {
  const GlossaryScreen({super.key});

  @override
  State<GlossaryScreen> createState() => _GlossaryScreenState();
}

class _GlossaryScreenState extends State<GlossaryScreen> {
  final _searchCtrl = TextEditingController();
  GlossaryFeature? _feature;
  /// Accordion: one open term so the title never separates from its formula.
  String? _openId;

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _selectFeature(GlossaryFeature? next) {
    setState(() {
      _feature = next;
      _syncOpenId(searchGlossary(_searchCtrl.text, feature: next));
    });
  }

  void _onSearchChanged(String _) {
    setState(() {
      _syncOpenId(searchGlossary(_searchCtrl.text, feature: _feature));
    });
  }

  void _syncOpenId(List<GlossaryEntry> entries) {
    final q = _searchCtrl.text.trim();
    _openId = q.isEmpty || entries.isEmpty ? null : entries.first.id;
  }

  void _toggle(String id) {
    setState(() {
      _openId = _openId == id ? null : id;
    });
  }

  void _clearFilters() {
    setState(() {
      _searchCtrl.clear();
      _feature = null;
      _openId = null;
    });
  }

  Map<GlossaryFeature?, int> _counts(List<GlossaryEntry> allMatches) {
    final counts = <GlossaryFeature?, int>{null: allMatches.length};
    for (final f in GlossaryFeature.values) {
      counts[f] = allMatches.where((e) => e.features.contains(f)).length;
    }
    return counts;
  }

  List<GlossaryEntry> _sorted(List<GlossaryEntry> entries) {
    final copy = [...entries];
    copy.sort(
      (a, b) => a.label.toLowerCase().compareTo(b.label.toLowerCase()),
    );
    return copy;
  }

  @override
  Widget build(BuildContext context) {
    final query = _searchCtrl.text;
    final queryActive = query.trim().isNotEmpty;
    final allMatches = searchGlossary(query);
    final entries = _sorted(searchGlossary(query, feature: _feature));
    final groups = queryActive
        ? const <({GlossaryFeature feature, List<GlossaryEntry> entries})>[]
        : groupGlossaryByFeature(entries)
            .map(
              (g) => (
                feature: g.feature,
                entries: _sorted(g.entries),
              ),
            )
            .toList();
    final counts = _counts(allMatches);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dictionary'),
      ),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 28),
        children: [
          PageIntro(subtitle: glossaryPageIntro),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                labelText: 'Search terms',
                hintText: 'Try margin, LTV, paid, stock…',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: query.isEmpty
                    ? null
                    : IconButton(
                        tooltip: 'Clear search',
                        onPressed: () {
                          _searchCtrl.clear();
                          _onSearchChanged('');
                        },
                        icon: const Icon(Icons.close),
                      ),
              ),
              onChanged: _onSearchChanged,
            ),
          ),
          SizedBox(
            height: 44,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text('All · ${counts[null] ?? 0}'),
                    selected: _feature == null,
                    onSelected: (_) => _selectFeature(null),
                  ),
                ),
                ...GlossaryFeature.values.map((f) {
                  final count = counts[f] ?? 0;
                  final selected = _feature == f;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text('${f.label} · $count'),
                      selected: selected,
                      onSelected: count == 0 && !selected
                          ? null
                          : (_) => _selectFeature(f),
                    ),
                  );
                }),
              ],
            ),
          ),
          if (queryActive || _feature != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  if (queryActive)
                    InputChip(
                      label: Text('Search “${query.trim()}”'),
                      onDeleted: () {
                        _searchCtrl.clear();
                        _onSearchChanged('');
                      },
                    ),
                  if (_feature != null)
                    InputChip(
                      label: Text(_feature!.label),
                      onDeleted: () => _selectFeature(null),
                    ),
                ],
              ),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Text(
              _feature == null
                  ? queryActive
                      ? '${entries.length} terms matching'
                      : '${entries.length} terms across all features'
                  : '${entries.length} terms in ${_feature!.label}',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: UmkmColors.muted,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ),
          if (entries.isEmpty)
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  const EmptyHint(
                    title: 'No matches',
                    message:
                        'Try another word or clear filters. Search looks at names, meanings, formulas, and feature tags.',
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: _clearFilters,
                    child: const Text('Clear search & filters'),
                  ),
                ],
              ),
            )
          else if (queryActive || _feature != null) ...[
            _SectionIntro(
              title: queryActive ? 'Search results' : _feature!.label,
              body: queryActive
                  ? 'Unique terms matching your search${_feature != null ? ' in ${_feature!.label}' : ''}.'
                  : _feature!.intro,
              trailing: Text(
                '${entries.length}',
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: UmkmColors.muted,
                    ),
              ),
            ),
            ...entries.map(
              (entry) => _GlossaryTermTile(
                entry: entry,
                open: _openId == entry.id,
                onToggle: () => _toggle(entry.id),
                activeFeature: _feature,
                query: query,
              ),
            ),
          ] else
            ...groups.expand(
              (group) => [
                _SectionIntro(
                  title: group.feature.label,
                  body: group.feature.intro,
                  trailing: TextButton(
                    onPressed: () => _selectFeature(group.feature),
                    child: Text('Only ${group.feature.label}'),
                  ),
                ),
                ...group.entries.map(
                  (entry) => _GlossaryTermTile(
                    entry: entry,
                    open: _openId == '${group.feature.name}:${entry.id}',
                    onToggle: () =>
                        _toggle('${group.feature.name}:${entry.id}'),
                    activeFeature: group.feature,
                    query: query,
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _SectionIntro extends StatelessWidget {
  const _SectionIntro({
    required this.title,
    required this.body,
    this.trailing,
  });

  final String title;
  final String body;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: UmkmType.title(size: 18),
                ),
              ),
              if (trailing != null) trailing!,
            ],
          ),
          const SizedBox(height: 8),
          Text(
            body,
            style: UmkmType.body(size: 13, color: UmkmColors.muted),
          ),
        ],
      ),
    );
  }
}

String _previewText(String description, {int max = 100}) {
  final text = description.trim().replaceAll(RegExp(r'\s+'), ' ');
  if (text.length <= max) return text;
  final cut = text.substring(0, max);
  final space = cut.lastIndexOf(' ');
  final clipped = space > 64 ? cut.substring(0, space) : cut;
  return '${clipped.trim()}…';
}

List<GlossaryFeature> _alsoOn(
  GlossaryEntry entry,
  GlossaryFeature? active,
) {
  if (active == null) {
    return entry.features.length > 1 ? entry.features : const [];
  }
  return entry.features.where((f) => f != active).toList();
}

List<InlineSpan> _highlight(String text, String query, TextStyle? style) {
  final q = query.trim();
  if (q.isEmpty) {
    return [TextSpan(text: text, style: style)];
  }
  final lower = text.toLowerCase();
  final needle = q.toLowerCase();
  final spans = <InlineSpan>[];
  var cursor = 0;
  var matchAt = lower.indexOf(needle, cursor);
  final markStyle = style?.copyWith(
    backgroundColor: UmkmColors.brandSoft.withValues(alpha: 0.85),
    fontWeight: FontWeight.w700,
  );
  while (matchAt != -1) {
    if (matchAt > cursor) {
      spans.add(TextSpan(text: text.substring(cursor, matchAt), style: style));
    }
    spans.add(
      TextSpan(
        text: text.substring(matchAt, matchAt + needle.length),
        style: markStyle,
      ),
    );
    cursor = matchAt + needle.length;
    matchAt = lower.indexOf(needle, cursor);
  }
  if (cursor < text.length) {
    spans.add(TextSpan(text: text.substring(cursor), style: style));
  }
  return spans;
}

class _GlossaryTermTile extends StatelessWidget {
  const _GlossaryTermTile({
    required this.entry,
    required this.open,
    required this.onToggle,
    required this.activeFeature,
    required this.query,
  });

  final GlossaryEntry entry;
  final bool open;
  final VoidCallback onToggle;
  final GlossaryFeature? activeFeature;
  final String query;

  @override
  Widget build(BuildContext context) {
    final alsoOn = _alsoOn(entry, activeFeature);
    final labelStyle = Theme.of(context).textTheme.titleMedium?.copyWith(
          color: UmkmColors.brandDeep,
          fontWeight: FontWeight.w600,
        );

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      child: Material(
        color: open
            ? UmkmColors.brandSoft.withValues(alpha: 0.22)
            : UmkmColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: open
                ? UmkmColors.brand.withValues(alpha: 0.28)
                : UmkmColors.line.withValues(alpha: 0.7),
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onToggle,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 10, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            crossAxisAlignment: WrapCrossAlignment.center,
                            spacing: 8,
                            runSpacing: 4,
                            children: [
                              Text.rich(
                                TextSpan(
                                  children: _highlight(
                                    entry.label,
                                    query,
                                    labelStyle,
                                  ),
                                ),
                              ),
                              if (entry.formula != null)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 7,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: UmkmColors.brandSoft.withValues(
                                      alpha: 0.7,
                                    ),
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    'FORMULA',
                                    style: Theme.of(context)
                                        .textTheme
                                        .labelSmall
                                        ?.copyWith(
                                          color: UmkmColors.brand,
                                          fontWeight: FontWeight.w700,
                                          letterSpacing: 0.5,
                                          fontSize: 10,
                                        ),
                                  ),
                                ),
                            ],
                          ),
                          if (!open) ...[
                            const SizedBox(height: 4),
                            Text(
                              _previewText(entry.description),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(color: UmkmColors.muted),
                            ),
                          ],
                        ],
                      ),
                    ),
                    AnimatedRotation(
                      turns: open ? 0.5 : 0,
                      duration: const Duration(milliseconds: 200),
                      child: const Icon(
                        Icons.expand_more,
                        color: UmkmColors.brandDeep,
                      ),
                    ),
                  ],
                ),
                if (open) ...[
                  const SizedBox(height: 10),
                  Text.rich(
                    TextSpan(
                      children: _highlight(
                        entry.description,
                        query,
                        Theme.of(context).textTheme.bodyMedium,
                      ),
                    ),
                  ),
                  if (entry.formula != null) ...[
                    const SizedBox(height: 10),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                      decoration: BoxDecoration(
                        color: UmkmColors.bg,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: UmkmColors.line.withValues(alpha: 0.6),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'HOW IT IS CALCULATED',
                            style: Theme.of(context)
                                .textTheme
                                .labelSmall
                                ?.copyWith(
                                  color: UmkmColors.brandDeep,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.6,
                                ),
                          ),
                          const SizedBox(height: 2),
                          Text.rich(
                            TextSpan(
                              children: _highlight(
                                entry.formula!,
                                query,
                                Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(color: UmkmColors.muted),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  if (alsoOn.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Also on  ${alsoOn.map((f) => f.label).join(' · ')}',
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: UmkmColors.muted),
                    ),
                  ],
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
