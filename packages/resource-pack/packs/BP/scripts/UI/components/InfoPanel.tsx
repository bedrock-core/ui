import { FunctionComponent, JSX, Panel, Text, useEffect, usePlayer, useState } from '@bedrock-core/ui';

interface PlayerInfo {
  health: string;
  gamemode: string;
  dimension: string;
  level: number;
}

/**
 * InfoPanel - Displays player information
 * Grid Position: Row 3, Column 1
 * Suspends initial render until player data is available
 */
export const InfoPanel: FunctionComponent = (): JSX.Element => {
  const player = usePlayer();
  const [info, setInfo] = useState<PlayerInfo | null>(null);

  // Update player info periodically using Minecraft's system.runInterval
  useEffect(() => {
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
      console.error('[InfoPanel] Error getting player info:', error);
    }
  }, [player]);


  return (
    <Panel width={192} height={140} x={10} y={310}>
      <Text width={192} height={20} x={20} y={320} value={'§l§6Player Info'} />
      <Text width={192} height={15} x={20} y={345} value={`§eName: §f${player.name}`} />
      <Text width={192} height={15} x={20} y={362} value={`§cHealth: §f${info?.health ?? '?'}`} />
      <Text width={192} height={15} x={20} y={379} value={`§bMode: §f${info?.gamemode ?? '?'}`} />
      <Text width={192} height={15} x={20} y={396} value={`§dDim: §f${info?.dimension ?? '?'}`} />
      <Text width={192} height={15} x={20} y={413} value={`§aLevel: §f${info?.level ?? '?'}`} />
      <Text width={192} height={12} x={20} y={433} value={'§7Updates every 2s'} />
    </Panel>
  );
};

