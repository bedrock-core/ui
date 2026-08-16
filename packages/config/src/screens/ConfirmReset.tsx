/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Form, theme } from '@bedrock-core/ore-styled';
import { Panel, Text, type JSX } from '@bedrock-core/ui-runtime';
import { useCore, usePlayer } from '../context';
import { useTranslation } from '../i18n';
import { filterScope, getScopedSchema, schemaDefaultsPatch } from '../config/schema';
import { patchScope } from '../config/values';
import type { AppScreen } from '../navigation/routes';
import { FormHeader } from './FormHeader';
import { Missing } from './Missing';

const { spacing, fontColor } = theme.tokens;

/**
 * The step in front of a reset. The reset button used to patch on the press, which put the one
 * irreversible action in this UI a single mis-tap away — and next to a row whose other press
 * merely opens a screen.
 *
 * A `<Form>` rather than a card of buttons, because the confirmation IS the modal's own shape:
 * the native modal's two controls are its submit and its dismiss, which is exactly a
 * confirm/cancel pair, and it opens over the screen that asked for it instead of replacing it.
 * The patch is built here rather than passed in as a param — a route param crosses no process
 * boundary, but a schema read a screen earlier could be a schema that has since replicated
 * again, and this is the one place where sending a stale default set is unrecoverable.
 */
export function ConfirmReset({ navigation, route }: AppScreen<'ConfirmReset'>): JSX.Element {
  const core = useCore();
  const player = usePlayer();
  const { t } = useTranslation();
  const { addonId, scope, entityId, target, breadcrumb } = route.params;
  const accessor = core.config.of(addonId, { actorId: player.id });

  if (!accessor) { return <Missing navigation={navigation} addonId={addonId} />; }

  const configAccessor = accessor;

  function handleConfirm(): void {
    patchScope(configAccessor, scope, entityId, schemaDefaultsPatch(filterScope(getScopedSchema(configAccessor), scope)));
    navigation.goBack();
  }

  return (
    <Form onSubmit={handleConfirm} onCancel={(): void => navigation.goBack()}>
      {/* One card for the whole modal, header and actions included — see `Config`. */}
      <Card variant={'raised'} flexDirection={'column'} gap={0} padding={0}>
        <FormHeader title={breadcrumb} />
        <Panel flexDirection={'column'} gap={spacing.md} padding={spacing.sm}>
          <Text wordBreak={'break-word'}>{t($ => $.reset.question, { target })}</Text>
          <Text wordBreak={'break-word'}>{`${fontColor.muted}${t($ => $.reset.warning)}`}</Text>
          {/* The destructive action is the submit, so it wears `danger` rather than the default
              primary face — the two buttons must not read as equally routine. Back keeps the
              width and the wording every other screen in this stack gives its dismiss. */}
          <Panel flexDirection={'row'} gap={spacing.sm}>
            <Form.Button type={'submit'} label={t($ => $.action.reset)} variant={'danger'} flex={2} />
            <Form.Button type={'exit'} label={t($ => $.action.back)} variant={'contrast'} flex={1} />
          </Panel>
        </Panel>
      </Card>
    </Form>
  );
}
