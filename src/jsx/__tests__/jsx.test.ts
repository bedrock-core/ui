import { describe, expect, it } from 'vitest';
import { Example } from './example';

describe('tsx-test', (): void => {
  it('should log the component structure via renderDev', (): void => {
    const component = Example();

    // Verify the structure 
    expect(component).toHaveProperty('type', 'panel');
    expect(component).toHaveProperty('props');
    expect(component.props).toMatchObject({
      width: 384,
      height: 256,
      x: 48,
      y: 48,
    });

    // Verify children don't exist in serialized format (they're flattened)
    expect(component.props.children).toBeUndefined();

    // Log the full structure for manual inspection
    console.log('\n📦 Component Structure:\n', JSON.stringify(component, null, 2));
  });
});
