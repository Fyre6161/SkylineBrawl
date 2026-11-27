export class SoundSynth {
  private ctx: AudioContext | null = null;
  private muted = false;

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
  }

  private ready(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) this.unlock();
    if (!this.ctx || this.ctx.state !== 'running') return null;
    return this.ctx;
  }

  private pitchVar(base: number, pct = 0.08): number {
    return base * (1 + (Math.random() * 2 - 1) * pct);
  }

  public playJump(isDouble = false): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isDouble ? 'triangle' : 'sine';
    const startFreq = this.pitchVar(isDouble ? 320 : 210);
    const endFreq = startFreq * 1.9;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.11);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playLand(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.pitchVar(120), now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.07);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playSwing(isHeavy = false): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(this.pitchVar(isHeavy ? 260 : 380), now);
    osc.frequency.exponentialRampToValueAtTime(isHeavy ? 95 : 150, now + 0.11);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playHit(heavy: boolean, targetDamage: number): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Punchy low thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = heavy ? 'sawtooth' : 'square';
    const base = heavy ? 160 : 220;
    osc.frequency.setValueAtTime(this.pitchVar(base + Math.min(90, targetDamage * 0.4)), now);
    osc.frequency.exponentialRampToValueAtTime(42, now + (heavy ? 0.19 : 0.1));
    gain.gain.setValueAtTime(heavy ? 0.22 : 0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.2 : 0.11));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (heavy ? 0.21 : 0.12));

    // Crisp transient snap for heavy smash hits
    if (heavy) {
      const snap = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snap.type = 'triangle';
      snap.frequency.setValueAtTime(this.pitchVar(760), now);
      snap.frequency.exponentialRampToValueAtTime(190, now + 0.08);
      snapGain.gain.setValueAtTime(0.16, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      snap.connect(snapGain);
      snapGain.connect(ctx.destination);
      snap.start(now);
      snap.stop(now + 0.09);
    }
  }

  public playShieldBlock(broken = false): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(broken ? 680 : this.pitchVar(520), now);
    osc.frequency.exponentialRampToValueAtTime(broken ? 110 : 780, now + (broken ? 0.3 : 0.09));
    gain.gain.setValueAtTime(broken ? 0.2 : 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (broken ? 0.32 : 0.1));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (broken ? 0.33 : 0.11));
  }

  public playBlastKo(isFinal = false): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Thunderous sub-bass blast boom
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(24, now + 0.55);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);

    // Filtered noise firework burst
    const len = Math.floor(ctx.sampleRate * 0.34);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.28));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + 0.32);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.24, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);

    // Dramatic brassy fanfare sparkle
    const notes = isFinal ? [392, 523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const t = now + 0.04 + idx * 0.048;
      const chime = ctx.createOscillator();
      const cGain = ctx.createGain();
      chime.type = 'triangle';
      chime.frequency.setValueAtTime(freq, t);
      cGain.gain.setValueAtTime(isFinal ? 0.13 : 0.1, t);
      cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      chime.connect(cGain);
      cGain.connect(ctx.destination);
      chime.start(t);
      chime.stop(t + 0.3);
    });
  }

  public playCountdown(isGo: boolean): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
    gain.gain.setValueAtTime(isGo ? 0.16 : 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.28 : 0.14));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (isGo ? 0.3 : 0.15));
  }

  public playVictory(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const t = now + i * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.34);
    });
  }

  public playHazardTelegraph(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.35);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playHazardErupt(isWind: boolean): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isWind ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(isWind ? 260 : 185, now);
    osc.frequency.exponentialRampToValueAtTime(isWind ? 520 : 58, now + 0.28);
    gain.gain.setValueAtTime(isWind ? 0.08 : 0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playLedgeGrab(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(this.pitchVar(460), now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.06);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }
}
