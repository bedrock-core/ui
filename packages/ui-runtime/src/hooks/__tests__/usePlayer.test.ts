import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { usePlayer } from '../usePlayer';
import { fiberRegistry } from '../../core/fiber';
import { ComponentInstance } from '@bedrock-core/ui/core/types';
import { Fragment } from '../../components/Fragment';
import { world } from '@minecraft/server';

describe('usePlayer Hook', () => {
  let instance: ComponentInstance;

  beforeEach(() => {
    instance = {
      id: 'test-component',
      player: world.getAllPlayers()[0],
      componentType: Fragment,
      props: {},
      hooks: [],
      hookIndex: 0,
      mounted: false,
      dirty: false,
    };
    fiberRegistry.pushInstance(instance);
  });

  afterEach(() => {
    fiberRegistry.popInstance();
  });

  describe('Core Functionality', () => {
    it('should return player instance from fiber', () => {
      const player = usePlayer();

      expect(player).toBe(instance.player);
    });

    it('should maintain stable player reference', () => {
      // First call
      const player1 = usePlayer();

      // Second call (same render)
      const player2 = usePlayer();

      // Simulate re-render
      instance.hookIndex = 0;
      const player3 = usePlayer();

      // All should be the same reference
      expect(player1).toBe(player2);
      expect(player1).toBe(player3);
      expect(player2).toBe(player3);
    });

    it('should persist player across form close and re-open', () => {
      // Initial render
      const player1 = usePlayer();
      expect(player1).toBe(instance.player);

      // Simulate form close (instance stays in registry, just reset for next render)
      instance.hookIndex = 0;
      instance.dirty = false;

      // Re-open form (re-render)
      const player2 = usePlayer();
      expect(player2).toBe(player1);
      expect(player2).toBe(instance.player);
    });
  });

  describe('Multiple Instances', () => {
    it('should support different players for different instances', () => {
      // First instance with first player
      const player1 = usePlayer();
      expect(player1).toBe(instance.player);

      fiberRegistry.popInstance();

      // Create second player (mock)
      const allPlayers = world.getAllPlayers();
      const secondPlayer = allPlayers.length > 1 ? allPlayers[1] : allPlayers[0];

      // Second instance with different player
      const instance2: ComponentInstance = {
        id: 'test-component-2',
        player: secondPlayer,
        componentType: Fragment,
        props: {},
        hooks: [],
        hookIndex: 0,
        mounted: false,
        dirty: false,
      };
      fiberRegistry.pushInstance(instance2);

      const player2 = usePlayer();
      expect(player2).toBe(instance2.player);
      expect(player2).toBe(secondPlayer);

      // Players should be tied to their respective instances
      expect(player1).toBe(instance.player);
      expect(player2).toBe(instance2.player);

      fiberRegistry.popInstance();
      fiberRegistry.pushInstance(instance); // Restore original
    });
  });

  describe('Error Cases', () => {
    it('should throw error when called outside component context', () => {
      fiberRegistry.popInstance();

      expect(() => {
        usePlayer();
      }).toThrow('usePlayer can only be called from within a component');
    });
  });
});
