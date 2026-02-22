export class SeededRNG {
  private state: number;
  private readonly originalSeed: string | number;
  private calls: number;

  constructor(seed: string | number) {
    this.originalSeed = seed;
    this.calls = 0;

    if (typeof seed === 'number') {
      this.state = seed | 0;
    } else {
      this.state = SeededRNG.hashString(seed);
    }

    // Ensure state is never 0 (mulberry32 needs nonzero state)
    if (this.state === 0) this.state = 1;
  }

  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return hash === 0 ? 1 : hash;
  }

  next(): number {
    this.calls++;
    this.state = (this.state + 0x6D2B79F5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), this.state | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  }

  nextInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  getState(): { seed: string | number; callCount: number } {
    return { seed: this.originalSeed, callCount: this.calls };
  }

  static fromState(state: { seed: string | number; callCount: number }): SeededRNG {
    const rng = new SeededRNG(state.seed);
    for (let i = 0; i < state.callCount; i++) {
      rng.next();
    }
    return rng;
  }
}
