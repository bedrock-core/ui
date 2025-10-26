import { describe, expect, it, vi } from 'vitest';
import { serialize } from '../../serializer';
import { SerializationContext } from '../../types';
import { Button } from '../../components/Button';
import { ActionFormData } from '@minecraft/server-ui';

describe('Button callbacks', () => {
  it('should register button callbacks in context', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const callback3 = vi.fn();

    const context: SerializationContext = {
      buttonCallbacks: new Map(),
      buttonIndex: 0,
    };

    const form = new ActionFormData();

    // Create buttons with callbacks
    const button1 = Button({
      width: 100,
      height: 40,
      x: 0,
      y: 0,
      onPress: callback1,
      children: undefined,
    });

    const button2 = Button({
      width: 100,
      height: 40,
      x: 0,
      y: 50,
      onPress: callback2,
      children: undefined,
    });

    const button3 = Button({
      width: 100,
      height: 40,
      x: 0,
      y: 100,
      onPress: callback3,
      children: undefined,
    });

    // Serialize buttons
    serialize(button1, form, context);
    serialize(button2, form, context);
    serialize(button3, form, context);

    // Verify callbacks are registered with correct indices
    expect(context.buttonCallbacks.size).toBe(3);
    expect(context.buttonCallbacks.get(0)).toBe(callback1);
    expect(context.buttonCallbacks.get(1)).toBe(callback2);
    expect(context.buttonCallbacks.get(2)).toBe(callback3);
    expect(context.buttonIndex).toBe(3);
  });

  it('should handle buttons without callbacks', () => {
    const callback = vi.fn();

    const context: SerializationContext = {
      buttonCallbacks: new Map(),
      buttonIndex: 0,
    };

    const form = new ActionFormData();

    // Button without callback (will have default empty function)
    const button1 = Button({
      width: 100,
      height: 40,
      x: 0,
      y: 0,
    });

    // Button with callback
    const button2 = Button({
      width: 100,
      height: 40,
      x: 0,
      y: 50,
      onPress: callback,
    });

    // Button without callback (will have default empty function)
    const button3 = Button({
      width: 100,
      height: 40,
      x: 0,
      y: 100,
    });

    serialize(button1, form, context);
    serialize(button2, form, context);
    serialize(button3, form, context);

    // All buttons have callbacks (buttons 1 and 3 have default empty functions)
    expect(context.buttonCallbacks.size).toBe(3);
    expect(context.buttonCallbacks.get(1)).toBe(callback);
    expect(context.buttonIndex).toBe(3);
  });

  it('should not serialize onPress function', () => {
    const callback = vi.fn();

    const context: SerializationContext = {
      buttonCallbacks: new Map(),
      buttonIndex: 0,
    };

    const form = new ActionFormData();

    const button = Button({
      width: 100,
      height: 40,
      x: 0,
      y: 0,
      onPress: callback,
    });

    // This should not throw a serialization error about functions
    expect(() => serialize(button, form, context)).not.toThrow();
  });

  it('should execute correct callback when button is pressed', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const context: SerializationContext = {
      buttonCallbacks: new Map(),
      buttonIndex: 0,
    };

    const form = new ActionFormData();

    const button1 = Button({
      width: 100,
      height: 40,
      x: 0,
      y: 0,
      onPress: callback1,
    });

    const button2 = Button({
      width: 100,
      height: 40,
      x: 0,
      y: 50,
      onPress: callback2,
    });

    serialize(button1, form, context);
    serialize(button2, form, context);

    // Simulate button press (index 1 = second button)
    const selectedCallback = context.buttonCallbacks.get(1);
    expect(selectedCallback).toBeDefined();

    selectedCallback?.();

    // Only callback2 should be called
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledTimes(1);
  });
});
