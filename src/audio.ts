/** Tiny synthesized cues; no audio files, tracking, network or autoplay. */
export class AudioCues {
  private context: AudioContext | null = null;
  enabled = false;
  async unlock(): Promise<void> {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') await this.context.resume();
    } catch { this.enabled = false; }
  }
  play(kind: 'correct' | 'wrong' | 'ready' | 'finish'): void {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const frequencies = kind === 'correct' ? [523, 784] : kind === 'wrong' ? [180, 130] : kind === 'finish' ? [392, 523, 784] : [660];
    const now = this.context.currentTime;
    for (const [i, frequency] of frequencies.entries()) {
      const oscillator = this.context.createOscillator(), gain = this.context.createGain();
      const start = now + i * .075;
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.07, start + .01);
      gain.gain.exponentialRampToValueAtTime(.001, start + .11);
      oscillator.connect(gain); gain.connect(this.context.destination);
      oscillator.start(start); oscillator.stop(start + .12);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    }
  }
  dispose(): void { void this.context?.close().catch(() => undefined); this.context = null; }
}
