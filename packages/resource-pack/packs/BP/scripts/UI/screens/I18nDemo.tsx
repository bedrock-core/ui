/** @jsxImportSource @bedrock-core/ui-runtime */
/**
 * Exercises every feature of `@bedrock-core/i18n` in one screen:
 *
 * - `t()` — selector AND dot-string form, interpolation, `$t()` nesting
 *   (flattened at build time), vanilla strings composed into arguments.
 * - Plurals — `stock_one`/`stock_other` collapsed into one leaf; the count
 *   buttons walk it through both forms (switch your client to Czech or Russian
 *   and the CLDR few/many rules kick in — no Intl involved).
 * - `key()` — client-resolved `.lang` keys as `Text` children, measured
 *   server-side from the bundle: the long string wraps correctly. The vanilla
 *   key resolves on the client without ever being in this RP.
 * - `raw()` — a translate/with message straight to chat, arguments in the
 *   build-recorded order (es_ES reorders the sentence, slots stay right).
 * - Locale chain — resolved locale shown live; override persists in a dynamic
 *   property (survives rejoin) and re-renders this screen on the spot;
 *   `forLocale` pins a locale regardless of the player.
 */
import { Panel, Text, usePlayer, useState, useTranslation, type JSX } from '@bedrock-core/ui';
import { Button, Card, Divider, theme } from '@bedrock-core/ore-styled';
import { i18n } from '../i18n';

const { fontColor, spacing } = theme.tokens;

// key() needs no player for non-plural leaves — module level is fine.
const { key } = i18n;

export function I18nDemo(): JSX.Element {
  const player = usePlayer();
  // setLocale/clearLocale write a dynamic property rather than component state,
  // but nothing has to force an update: every press rebuilds and re-presents,
  // and render() re-derives the resolver on each build pass.
  const [count, setCount] = useState(1);

  const { t, raw, locale } = useTranslation(i18n);

  return (
    <Card flexDirection={'column'} padding={12} gap={spacing.sm}>
      <Text font={'minecraftTen'} scale={2}>{t($ => $.ui.demo.title)}</Text>
      <Text>{`${fontColor.muted}${t($ => $.ui.demo.intro)}`}</Text>

      <Divider />

      {/* ── t(): server-resolved strings ────────────────────────────────── */}
      <Text shadow={true}>{`§e${t($ => $.ui.demo.section.server)}`}</Text>
      {/* Selector form, interpolating a vanilla string t() resolved first. */}
      <Text>{t($ => $.ui.demo.bought, { item: t($ => $.vanilla.item.apple.name), price: 64 })}</Text>
      {/* Dot-string form — typed identically to the selector. */}
      <Text>{`${fontColor.muted}${t('ui.demo.apple', { name: t('vanilla.item.apple.name') })}`}</Text>

      <Divider />

      {/* ── Plurals ─────────────────────────────────────────────────────── */}
      <Text shadow={true}>{`§e${t($ => $.ui.demo.section.plurals)}`}</Text>
      <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.sm}>
        <Button variant={'secondary'} onPress={(): void => { setCount(n => Math.max(0, n - 1)); }}>{'§0-1'}</Button>
        <Text>{t($ => $.ui.demo.stock, { count })}</Text>
        <Button variant={'secondary'} onPress={(): void => { setCount(n => n + 1); }}>{'§0+1'}</Button>
      </Panel>

      <Divider />

      {/* ── key() / raw(): client-resolved ──────────────────────────────── */}
      <Text shadow={true}>{`§e${t($ => $.ui.demo.section.client)}`}</Text>
      {/* Own key: painted from .lang per player, wrapped from bundle metrics. */}
      <Text wordBreak={'break-word'} maxLines={2} overflow={'ellipsis'}>{key($ => $.ui.test.long)}</Text>
      {/* Vanilla key: resolves on the client, never shipped in this RP. */}
      <Text>{key($ => $.vanilla.item.apple.name)}</Text>
      {/* raw() without arguments ≡ the bare key — still client-resolved. */}
      <Text>{raw($ => $.vanilla.item.apple.name)}</Text>
      {/* raw() WITH arguments: .lang labels have no `with` channel on the
          client, so the framework resolves + fills this server-side in the
          player's language — es_ES override reorders the sentence correctly. */}
      <Text>{raw($ => $.ui.demo.bought, { item: 'Apple', price: 9 })}</Text>
      <Text>{raw($ => $.vanilla.multiplayer.player.joined, [player.name])}</Text>
      {/* Nested translate as an argument — painted: filled server-side too. */}
      <Text>{raw($ => $.ui.demo.bought, { item: raw($ => $.vanilla.item.apple.name), price: 2 })}</Text>
      <Button onPress={(): void => { player.sendMessage(raw($ => $.ui.demo.bought, { item: 'Apple', price: 5 })); }}>
        {`§a${t($ => $.ui.demo.action.sendRaw)}`}
      </Button>
      {/* Vanilla key straight to chat — the client resolves "%s joined the game"
          in ITS OWN language, from a key this RP never ships. */}
      <Button onPress={(): void => { player.sendMessage(raw($ => $.vanilla.multiplayer.player.joined, [player.name])); }}>
        {`§a${t($ => $.ui.demo.action.sendRawVanilla)}`}
      </Button>
      {/* Plural over raw(): the suffix is chosen server-side for this player's
          locale, then the suffixed key + count travel to the client. */}
      <Button onPress={(): void => { player.sendMessage(raw($ => $.ui.demo.stock, { count })); }}>
        {`§a${t($ => $.ui.demo.action.sendRawPlural, { count })}`}
      </Button>
      {/* Nested rawtext argument: the item name is itself a translate — the
          WHOLE sentence composes on the client, every part in the client's
          own language, no matter what the server thinks the locale is. */}
      <Button onPress={(): void => { player.sendMessage(raw($ => $.ui.demo.bought, { item: raw($ => $.vanilla.item.apple.name), price: 3 })); }}>
        {`§a${t($ => $.ui.demo.action.sendRawNested)}`}
      </Button>

      <Divider />

      {/* ── Locale chain & override ─────────────────────────────────────── */}
      <Text shadow={true}>{`§e${t($ => $.ui.demo.section.locale)}`}</Text>
      <Text>{t($ => $.ui.demo.locale, { locale })}</Text>
      <Text>{`${fontColor.muted}${t($ => $.ui.demo.pinned, { value: i18n.forLocale('es_ES').t($ => $.ui.demo.title) })}`}</Text>
      <Panel flexDirection={'row'} gap={spacing.sm}>
        <Button variant={'secondary'} onPress={(): void => { i18n.setLocale(player, 'es_ES'); }}>
          {`§0${t($ => $.ui.demo.action.overrideEs)}`}
        </Button>
        <Button variant={'contrast'} onPress={(): void => { i18n.clearLocale(player); }}>
          {t($ => $.ui.demo.action.clearOverride)}
        </Button>
      </Panel>
    </Card>
  );
}
