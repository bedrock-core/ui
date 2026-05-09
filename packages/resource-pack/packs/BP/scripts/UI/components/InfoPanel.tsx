import { JSX, Panel, Text, FunctionComponent, usePlayer, useEffect, useState } from '@bedrock-core/ui';
import { system } from '@minecraft/server';

interface PlayerInfo {
  health: string;
  gamemode: string;
  dimension: string;
  level: number;
}

/**
 * InfoPanel - Displays player information using useState + useEffect
 * Grid Position: Row 3, Column 1
 * Renders loading text until player data is available
 */
export const InfoPanel: FunctionComponent = (): JSX.Element => {
  const player = usePlayer();
  const [info, setInfo] = useState<PlayerInfo | null>(null);

  // Update player info periodically using Minecraft's system.runInterval
  useEffect(() => {
    const updatePlayerInfo = (): void => {
      try {
        const healthComp = player.getComponent('minecraft:health');
        const dimensionId = player.dimension.id.split(':')[1] || player.dimension.id;

        const newInfo = {
          health: healthComp ? `${Math.floor(healthComp.currentValue)}/${healthComp.effectiveMax}` : '?',
          gamemode: player.getGameMode(),
          dimension: dimensionId,
          level: player.level,
        };

        setInfo(newInfo);
      } catch (error) {
        console.warn('[InfoPanel] Error getting player info:', error);
      }
    };

    updatePlayerInfo();

    // Update every 40 ticks (2 seconds at 20 TPS)
    const intervalId = system.runInterval(updatePlayerInfo, 40);

    return (): void => system.clearRun(intervalId);
  }, [player]);

  const loadingPanel = (
    <Panel flexDirection={'column'} padding={6} gap={4}>
      <Text>{'§6Player Info'}</Text>
      <Text>{'§7Loading player data...'}</Text>
    </Panel>
  );

  if (!info) {
    return loadingPanel;
  }

  return (
    <Panel flexDirection={'column'} padding={6} gap={3}>
      <Text>{'§6Player Info'}</Text>
      <Text>{`§eName: §f${player.name}`}</Text>
      <Text>{`§cHealth: §f${info.health}`}</Text>
      <Text>{`§bMode: §f${info.gamemode}`}</Text>
      <Text>{`§dDim: §f${info.dimension}`}</Text>
      <Text>{`§aLevel: §f${info.level}`}</Text>
      <Text>{'§7Updates every 2s'}</Text>
    </Panel>
  );
};
