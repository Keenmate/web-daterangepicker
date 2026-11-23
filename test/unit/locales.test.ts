import { describe, expect, it } from 'vitest';
import { DEFAULT_LABELS } from '../../src/date-picker-locales';

describe('DEFAULT_LABELS', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(DEFAULT_LABELS)).toBe(true);
  });

  it('uses flat <elementType>.<name> keys', () => {
    for (const key of Object.keys(DEFAULT_LABELS)) {
      expect(key, key).toMatch(/^(buttons|ariaLabels|labels|headers|errors)\.[a-zA-Z]+$/);
    }
  });

  it('count labels read the context, never a bare {count}', () => {
    for (const key of ['labels.days', 'labels.nights', 'labels.selectionCount'] as const) {
      expect(DEFAULT_LABELS[key], key).toContain('{ctx.count}');
    }
    for (const [key, text] of Object.entries(DEFAULT_LABELS)) {
      expect(text, key).not.toMatch(/\{count\}/);
    }
  });

  it('every visible label is non-empty (the fullscreen header may be blank)', () => {
    for (const [key, text] of Object.entries(DEFAULT_LABELS)) {
      if (key === 'headers.fullscreen') continue;
      expect(text.trim(), key).not.toBe('');
    }
  });
});
