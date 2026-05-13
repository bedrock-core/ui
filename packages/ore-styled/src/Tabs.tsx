import { Button, Fragment, Image, Panel, Text, createContext, useContext, useState } from '@bedrock-core/ui';
import type { ControlProps, JSX } from '@bedrock-core/ui';

import { SPACING, TEXTURES, SIZE } from './tokens';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue>({
  activeTab: '',
  setActiveTab: () => {},
});

export interface TabsProps extends ControlProps {
  defaultTab?: string;
  activeTab?: string;
  onChange?: (id: string) => void;
  children: JSX.Node;
}

export function Tabs({ defaultTab = '', activeTab, onChange, children, ...layout }: TabsProps): JSX.Element {
  const [internal, setInternal] = useState(defaultTab);
  const current = activeTab ?? internal;

  function setTab(id: string): void {
    setInternal(id);
    onChange?.(id);
  }

  return (
    <TabsContext value={{ activeTab: current, setActiveTab: setTab }}>
      <Panel flexDirection={'column'} {...layout}>
        {children}
      </Panel>
    </TabsContext>
  );
}

export interface TabListProps extends ControlProps {
  children: JSX.Node;
}

export function TabList({ children, ...layout }: TabListProps): JSX.Element {
  return (
    <Panel flexDirection={'row'} {...layout}>
      {children}
    </Panel>
  );
}

export interface TabProps extends ControlProps {
  id: string;
  label: string;
}

export function Tab({ id, label, ...layout }: TabProps): JSX.Element {
  const ctx = useContext(TabsContext);
  const isActive = ctx.activeTab === id;

  return (
    <Button
      onPress={() => ctx.setActiveTab(id)}
      height={SIZE.tab.height}
      paddingLeft={SPACING.md}
      paddingRight={SPACING.md}
      paddingTop={SPACING.xs}
      paddingBottom={SPACING.xs}
      {...layout}
    >
      <Fragment>
        <Image texture={isActive ? TEXTURES.tabs.active : TEXTURES.tabs.inactive} />
        <Text>{label}</Text>
      </Fragment>
    </Button>
  );
}

export interface TabPanelProps extends ControlProps {
  id: string;
  children: JSX.Node;
}

export function TabPanel({ id, children, ...layout }: TabPanelProps): JSX.Element {
  const ctx = useContext(TabsContext);

  return (
    <Panel visible={ctx.activeTab === id} {...layout}>
      {children}
    </Panel>
  );
}
