/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Header, MenuRow, theme } from '@bedrock-core/ore-styled';
import { Fragment, Panel, Scroll, Text, useExit, type JSX } from '@bedrock-core/ui-runtime';
import { splitBreadcrumb } from './breadcrumbs';
import { useCore, usePlayer } from '../context';
import { useTranslation } from '../i18n';
import {
  buildSectionTree,
  filterScope,
  filterScopeGroups,
  findSection,
  getScopedGroups,
  getScopedSchema,
  listEntries,
  type SectionNode,
} from '../config/schema';
import { openList, openSection } from '../navigation/openConfig';
import type { AppScreen } from '../navigation/routes';
import { Missing } from './Missing';

const { spacing, fontColor } = theme.tokens;

/**
 * A level of the config tree that holds sections and no settings of its own: one button per
 * child, and nothing to submit.
 *
 * This screen exists because a native modal form cannot be navigated. Its only two controls are
 * the submit and the dismiss, so a form has no way to offer a third — "open this sub-section".
 * A level with settings on it therefore HAS to be the form, and can only draw its children
 * inline; a level with none is free to be a plain screen of rows, which is what keeps a deep
 * schema reachable instead of collapsing into one enormous dialog.
 *
 * Nothing is fetched here. Values are only needed by the form at the bottom of the walk, and
 * `openSection` pushes this screen without a round trip — the fetch happens on the press that
 * finally opens a form.
 */
export function ConfigSection({ navigation, route }: AppScreen<'ConfigSection'>): JSX.Element {
  const core = useCore();
  const player = usePlayer();
  const exit = useExit();
  const { t, display } = useTranslation();
  const { addonId, scope, entityId, path, breadcrumb } = route.params;
  const accessor = core.config.of(addonId, { actorId: player.id });

  if (!accessor) { return <Missing navigation={navigation} addonId={addonId} />; }

  const configAccessor = accessor;
  const root = buildSectionTree(
    filterScope(getScopedSchema(configAccessor), scope),
    filterScopeGroups(getScopedGroups(configAccessor), scope),
  );
  const section = findSection(root, path);

  // The schema is replicated: the addon can redefine it while this screen is open, and the
  // section this route names may simply no longer exist. Treat it as an empty level rather
  // than throwing — the player still has a working Back button.
  const children = section?.children ?? [];
  // Lists live on this screen rather than in a form, which is the whole reason they are
  // editable at all — see `isPureSection`.
  const lists = section === undefined ? [] : listEntries(section);
  const rowCount = children.length + lists.length;

  return (
    <Card flexDirection={'column'} padding={0} gap={0}>
      <Header {...splitBreadcrumb(breadcrumb)} onBack={(): void => navigation.goBack()} onClose={exit} />
      <Panel flexGrow={1} padding={spacing.sm}>
        <Scroll>
          <Panel flexDirection={'column'} gap={spacing.xs}>
            {rowCount > 0
              ? (
                  <Fragment>
                    <Fragment>
                      {children.map(child => (
                        <SectionRow
                          child={child}
                          onPress={(): Promise<void> => openSection(navigation, configAccessor, {
                            addonId,
                            scope,
                            entityId,
                            section: child,
                            breadcrumb: `${breadcrumb} > ${display(child.label)}`,
                          })}
                        />
                      ))}
                    </Fragment>
                    <Fragment>
                      {lists.map(([key, entry]) => (
                        // The description, not the current items — this screen holds no values
                        // by design, and fetching a whole scope just to count a list would be a
                        // round trip per row. The editor shows what is actually in there.
                        <MenuRow
                          title={entry.label}
                          {...(entry.description !== undefined ? { subtitle: entry.description } : {})}
                          onPress={(): Promise<void> => openList(navigation, configAccessor, {
                            addonId,
                            scope,
                            entityId,
                            key,
                            breadcrumb: `${breadcrumb} > ${display(entry.label)}`,
                          })}
                        />
                      ))}
                    </Fragment>
                  </Fragment>
                )
              : (
                  <Panel flexGrow={1} justifyContent={'center'} alignItems={'center'}>
                    <Text wordBreak={'break-word'}>{`${fontColor.muted}${t($ => $.config.empty)}`}</Text>
                  </Panel>
                )}
          </Panel>
        </Scroll>
      </Panel>
    </Card>
  );
}

/**
 * One child section as a row. The chevron is unconditional: every row here leads somewhere,
 * whether that is another level of rows or the form at the end of the branch.
 *
 * Title and subtitle go in unresolved — `MenuRow` asks the active resolver itself, and a
 * §-prefixed or pre-resolved string would stop being recognizable as a `.lang` key.
 */
function SectionRow({ child, onPress }: {
  child: SectionNode;
  onPress: () => Promise<void>;
}): JSX.Element {
  return (
    <MenuRow
      title={child.label}
      {...(child.description !== undefined ? { subtitle: child.description } : {})}
      onPress={onPress}
    />
  );
}
