/**
 * Vector Clock implementation for distributed time synchronization
 * Used to arbitrate and resolve conflicts in distributed peer-to-peer systems
 */
export class VectorClock {
  private clock: Map<string, number>;

  constructor(initialClock?: Map<string, number>) {
    this.clock = initialClock ? new Map(initialClock) : new Map();
  }

  /**
   * Increment the clock for a specific peer
   */
  increment(peerId: string): void {
    const current = this.clock.get(peerId) || 0;
    this.clock.set(peerId, current + 1);
  }

  /**
   * Update the clock by merging with another vector clock
   */
  merge(other: VectorClock): void {
    for (const [peerId, timestamp] of other.clock.entries()) {
      const currentTimestamp = this.clock.get(peerId) || 0;
      this.clock.set(peerId, Math.max(currentTimestamp, timestamp));
    }
  }

  /**
   * Compare this clock with another clock
   * Returns:
   *  1 if this clock happens after the other (this > other)
   *  -1 if this clock happens before the other (this < other)
   *  0 if they are concurrent (neither happens before the other)
   */
  compare(other: VectorClock): number {
    let thisGreater = false;
    let otherGreater = false;

    const allPeerIds = new Set([
      ...this.clock.keys(),
      ...other.clock.keys()
    ]);

    for (const peerId of allPeerIds) {
      const thisTime = this.clock.get(peerId) || 0;
      const otherTime = other.clock.get(peerId) || 0;

      if (thisTime > otherTime) {
        thisGreater = true;
      } else if (thisTime < otherTime) {
        otherGreater = true;
      }
    }

    if (thisGreater && !otherGreater) {
      return 1; // This happens after other
    } else if (otherGreater && !thisGreater) {
      return -1; // This happens before other
    } else {
      return 0; // Concurrent
    }
  }

  /**
   * Check if this clock happens before another clock
   */
  happensBefore(other: VectorClock): boolean {
    return this.compare(other) === -1;
  }

  /**
   * Check if this clock happens after another clock
   */
  happensAfter(other: VectorClock): boolean {
    return this.compare(other) === 1;
  }

  /**
   * Check if this clock is concurrent with another clock
   */
  isConcurrent(other: VectorClock): boolean {
    return this.compare(other) === 0;
  }

  /**
   * Get the timestamp for a specific peer
   */
  get(peerId: string): number {
    return this.clock.get(peerId) || 0;
  }

  /**
   * Set the timestamp for a specific peer
   */
  set(peerId: string, timestamp: number): void {
    this.clock.set(peerId, timestamp);
  }

  /**
   * Create a copy of this vector clock
   */
  clone(): VectorClock {
    return new VectorClock(new Map(this.clock));
  }

  /**
   * Convert the clock to a plain object for serialization
   */
  toJSON(): Record<string, number> {
    const obj: Record<string, number> = {};
    for (const [peerId, timestamp] of this.clock.entries()) {
      obj[peerId] = timestamp;
    }
    return obj;
  }

  /**
   * Create a VectorClock from a plain object
   */
  static fromJSON(obj: Record<string, number>): VectorClock {
    const clock = new Map<string, number>();
    for (const [peerId, timestamp] of Object.entries(obj)) {
      clock.set(peerId, timestamp);
    }
    return new VectorClock(clock);
  }

  /**
   * Get all peer IDs tracked by this clock
   */
  getPeerIds(): string[] {
    return Array.from(this.clock.keys());
  }

  /**
   * Get the size of the clock (number of peers tracked)
   */
  size(): number {
    return this.clock.size;
  }
}
