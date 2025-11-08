import { describe, it, expect, beforeEach } from 'vitest';
import { VectorClock } from '../VectorClock';

describe('VectorClock', () => {
  let clock1: VectorClock;
  let clock2: VectorClock;

  beforeEach(() => {
    clock1 = new VectorClock();
    clock2 = new VectorClock();
  });

  describe('increment', () => {
    it('should increment the clock for a peer', () => {
      clock1.increment('peer1');
      expect(clock1.get('peer1')).toBe(1);
      
      clock1.increment('peer1');
      expect(clock1.get('peer1')).toBe(2);
    });

    it('should start from 0 for new peers', () => {
      expect(clock1.get('peer1')).toBe(0);
    });
  });

  describe('merge', () => {
    it('should merge two clocks by taking maximum values', () => {
      clock1.increment('peer1');
      clock1.increment('peer1');
      clock2.increment('peer1');
      clock2.increment('peer2');

      clock1.merge(clock2);

      expect(clock1.get('peer1')).toBe(2); // max(2, 1) = 2
      expect(clock1.get('peer2')).toBe(1); // max(0, 1) = 1
    });

    it('should handle empty clocks', () => {
      const emptyClock = new VectorClock();
      clock1.increment('peer1');
      clock1.merge(emptyClock);

      expect(clock1.get('peer1')).toBe(1);
    });
  });

  describe('compare', () => {
    it('should return 0 for concurrent clocks', () => {
      clock1.increment('peer1');
      clock2.increment('peer2');

      expect(clock1.compare(clock2)).toBe(0);
    });

    it('should return 1 when first clock happens after', () => {
      clock1.increment('peer1');
      clock2.increment('peer1');
      clock1.increment('peer1');

      expect(clock1.compare(clock2)).toBe(1);
    });

    it('should return -1 when first clock happens before', () => {
      clock1.increment('peer1');
      clock2.increment('peer1');
      clock2.increment('peer1');

      expect(clock1.compare(clock2)).toBe(-1);
    });

    it('should return 0 for identical clocks', () => {
      clock1.increment('peer1');
      clock2.increment('peer1');

      expect(clock1.compare(clock2)).toBe(0);
    });
  });

  describe('happensBefore', () => {
    it('should return true when clock happens before another', () => {
      clock1.increment('peer1');
      clock2.increment('peer1');
      clock2.increment('peer1');

      expect(clock1.happensBefore(clock2)).toBe(true);
      expect(clock2.happensBefore(clock1)).toBe(false);
    });
  });

  describe('happensAfter', () => {
    it('should return true when clock happens after another', () => {
      clock1.increment('peer1');
      clock1.increment('peer1');
      clock2.increment('peer1');

      expect(clock1.happensAfter(clock2)).toBe(true);
      expect(clock2.happensAfter(clock1)).toBe(false);
    });
  });

  describe('isConcurrent', () => {
    it('should return true for concurrent events', () => {
      clock1.increment('peer1');
      clock2.increment('peer2');

      expect(clock1.isConcurrent(clock2)).toBe(true);
    });

    it('should return false for non-concurrent events', () => {
      clock1.increment('peer1');
      clock2.increment('peer1');
      clock2.increment('peer1');

      expect(clock1.isConcurrent(clock2)).toBe(false);
    });
  });

  describe('set and get', () => {
    it('should set and get timestamp for a peer', () => {
      clock1.set('peer1', 5);
      expect(clock1.get('peer1')).toBe(5);
    });
  });

  describe('clone', () => {
    it('should create an independent copy', () => {
      clock1.increment('peer1');
      const cloned = clock1.clone();
      
      cloned.increment('peer1');

      expect(clock1.get('peer1')).toBe(1);
      expect(cloned.get('peer1')).toBe(2);
    });
  });

  describe('toJSON and fromJSON', () => {
    it('should serialize and deserialize correctly', () => {
      clock1.increment('peer1');
      clock1.increment('peer2');
      clock1.increment('peer2');

      const json = clock1.toJSON();
      const restored = VectorClock.fromJSON(json);

      expect(restored.get('peer1')).toBe(1);
      expect(restored.get('peer2')).toBe(2);
      expect(restored.compare(clock1)).toBe(0);
    });
  });
});
