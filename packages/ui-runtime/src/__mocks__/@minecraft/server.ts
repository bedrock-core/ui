/**
 * Mock for @minecraft/server
 * Provides minimal implementation for testing purposes
 */

export class Player {
  private constructor() {
    // Mock player instance - private constructor to match real API
  }
}

class World {
  getAllPlayers(): Player[] {
    // Return a single mock player for testing
    return [Reflect.construct(Player, [])];
  }
}

export const world = new World();
