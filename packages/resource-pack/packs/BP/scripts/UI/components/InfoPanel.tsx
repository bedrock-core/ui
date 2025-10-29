import { JSX, Panel, Text, FunctionComponent, usePlayer, useEffect, useSuspendedState, Suspense } from '@bedrock-core/ui';
import { system } from '@minecraft/server';

interface PlayerInfo {
  health: string;
  gamemode: string;
  dimension: string;
  level: number;
}

/**
 * InfoPanel - Displays player information using Suspense + useSuspendedState
 * Grid Position: Row 3, Column 1
 * Suspends initial render until player data is available
 */
export const InfoPanel: FunctionComponent = (): JSX.Element => {
  const player = usePlayer();
  const [info, setInfo] = useSuspendedState<PlayerInfo | null>(null);

  console.log(`[InfoPanel] Rendering - info is:`, info);

  // Update player info periodically using Minecraft's system.runInterval
  useEffect(() => {
    console.log(`[InfoPanel] useEffect running`);

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

        console.log(`[InfoPanel] updatePlayerInfo - calling setInfo with:`, newInfo);
        setInfo(newInfo);
      } catch (error) {
        console.warn('[InfoPanel] Error getting player info:', error);
      }
    };

    updatePlayerInfo();

    // Update every 40 ticks (2 seconds at 20 TPS)
    const intervalId = system.runInterval(updatePlayerInfo, 40);

    return () => system.clearRun(intervalId);
  }, [player]);

  const loadingPanel = (
    <Panel width={192} height={140} x={10} y={310}>
      <Text width={192} height={20} x={20} y={320} value={'§l§6Player Info'} />
      <Text width={192} height={15} x={20} y={345} value={'§7Loading player data...'} />
    </Panel>
  );

  return (
    <Suspense fallback={loadingPanel}>
      {!info ? loadingPanel : (
        <Panel width={192} height={140} x={10} y={310}>
          <Text width={192} height={20} x={20} y={320} value={'§l§6Player Info'} />
          <Text width={192} height={15} x={20} y={345} value={`§eName: §f${player.name}`} />
          <Text width={192} height={15} x={20} y={362} value={`§cHealth: §f${info.health}`} />
          <Text width={192} height={15} x={20} y={379} value={`§bMode: §f${info.gamemode}`} />
          <Text width={192} height={15} x={20} y={396} value={`§dDim: §f${info.dimension}`} />
          <Text width={192} height={15} x={20} y={413} value={`§aLevel: §f${info.level}`} />
          <Text width={192} height={12} x={20} y={433} value={'§7Updates every 2s'} />
        </Panel>
      )}
    </Suspense>
  );
};

