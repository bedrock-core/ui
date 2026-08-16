---
'@bedrock-core/ore-styled': minor
---

`MenuRow` and `Header` take the unified text model: titles, subtitles and breadcrumb segments are `DisplayText` (`string | RawMessage`, from `@bedrock-core/i18n`) — a string that resolves as a key localizes client-side, anything else paints literally, and `MenuRow` only auto-colors literal strings. The `TextSource`, `MenuRowText` and `BreadcrumbSegment` unions are removed in its favor.
