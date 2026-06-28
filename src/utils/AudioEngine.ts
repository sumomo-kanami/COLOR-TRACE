/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private mainVolumeNode: GainNode | null = null;
  private sequencerTimer: any = null;
  private currentBpm = 120;
  private currentSongId = "";
  private stepNumber = 0;
  private isInstrumentPlaying = false;

  constructor() {
    // Initialized lazily upon user interaction to comply with Web Audio autoplay policies
    if (typeof window !== "undefined") {
      const handleGesture = () => {
        this.resume();
      };
      window.addEventListener("click", handleGesture, { passive: true });
      window.addEventListener("pointerdown", handleGesture, { passive: true });
      window.addEventListener("keydown", handleGesture, { passive: true });
    }
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.mainVolumeNode = this.ctx.createGain();
      this.mainVolumeNode.gain.setValueAtTime(0.4, this.ctx.currentTime); // default comfortable volume
      this.mainVolumeNode.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Failed to initialize Web Audio API", e);
    }
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch((err) => {
        console.warn("Failed to resume AudioContext asynchronously:", err);
      });
    }
  }

  setVolume(normalizedValue: number) {
    this.resume();
    if (this.mainVolumeNode && this.ctx) {
      this.mainVolumeNode.gain.linearRampToValueAtTime(
        normalizedValue * 0.5,
        this.ctx.currentTime + 0.1
      );
    }
  }

  // Plays a beautiful chord / bass pattern in beat with the BPM
  startSong(songId: string, bpm: number) {
    this.resume();
    this.stopSong();
    this.currentSongId = songId;
    this.currentBpm = bpm;
    this.stepNumber = 0;
    this.isInstrumentPlaying = true;

    if (!this.ctx) return;

    const stepDuration = 60 / bpm / 2; // eighth notes
    let nextNoteTime = this.ctx.currentTime;

    const scheduleNextBeats = () => {
      if (!this.ctx || !this.isInstrumentPlaying) return;
      
      // If the scheduler has fallen behind (due to autoplay blocks, suspended states, or background idling),
      // we must realign the note trigger pointer to the current clock time.
      if (nextNoteTime < this.ctx.currentTime) {
        nextNoteTime = this.ctx.currentTime;
      }

      while (this.ctx && nextNoteTime < this.ctx.currentTime + 0.3) {
        this.playBeatStep(this.currentSongId, nextNoteTime, this.stepNumber);
        nextNoteTime += stepDuration;
        this.stepNumber = (this.stepNumber + 1) % 16;
      }
      this.sequencerTimer = setTimeout(scheduleNextBeats, 100);
    };

    scheduleNextBeats();
  }

  stopSong() {
    this.isInstrumentPlaying = false;
    if (this.sequencerTimer) {
      clearTimeout(this.sequencerTimer);
      this.sequencerTimer = null;
    }
  }

  // Generates different music loops based on song themes
  private playBeatStep(songId: string, time: number, step: number) {
    if (!this.ctx || !this.mainVolumeNode || !this.isInstrumentPlaying) return;

    // A subtle retro-cyber drums & synth sequencer
    try {
      // 1. Kick Drum (Triggered on step 0, 4, 8, 12 for 4x4 pump)
      if (step % 4 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.mainVolumeNode);

        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);

        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

        osc.start(time);
        osc.stop(time + 0.16);
      }

      // 2. Hi-Hat (Triggered on off-beats: 2, 6, 10, 14)
      if (step % 4 === 2) {
        // High-pass filtered noise style hihat
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(8000, time);
        osc.connect(gain);
        gain.connect(this.mainVolumeNode);

        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

        osc.start(time);
        osc.stop(time + 0.06);
      }

      // 3. Melodic Synths customized by song ID
      switch (songId) {
        case "kotaete": { // "こたえて" - Playful synth pop
          // Cute pentatonic arpeggio that scales upward.
          const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
          const curNote = notes[(step * 3) % notes.length];
          if (step % 2 === 0) {
            this.triggerSynth(curNote, "sine", 0.08, time, 0.1);
          }
          break;
        }
        case "after_curtain": { // "アフター・ザ・カーテン" - Ambient slow pads
          const slowChords = [196.00, 220.00, 130.81, 146.83]; // G3, A3, C3, D3
          const baseFreq = slowChords[Math.floor(step / 4) % slowChords.length];
          if (step % 4 === 0) {
            // Warm sub bass or soft organ
            this.triggerSynth(baseFreq, "triangle", 0.12, time, 0.4);
            this.triggerSynth(baseFreq * 1.5, "sine", 0.06, time, 0.35); // Fifth
          }
          break;
        }
        case "shutter_chance": { // "シャッターチャンス" - Retro swing beat
          const notes = [293.66, 349.23, 392.00, 440.00, 523.25]; // Dm pentatonic
          const noteFreq = notes[step % notes.length];
          if (step % 3 === 0) {
            this.triggerSynth(noteFreq, "triangle", 0.08, time, 0.12);
          }
          break;
        }
        case "band_of_world": { // "世界最後の音楽隊" - Star constellation wind
          const notes = [329.63, 392.00, 440.00, 523.25, 587.33, 783.99, 880.00];
          const noteFreq = notes[(step * 5) % notes.length];
          if (step % 2 === 1) {
            this.triggerSynth(noteFreq, "sine", 0.06, time, 0.15);
          }
          break;
        }
        case "trichology": { // "トリツクロジー" - Glitchy, binary arpeggios
          const frequencies = [440, 415.3, 440, 554.37, 659.25, 783.99];
          const noteFreq = frequencies[step % frequencies.length];
          if (step % 2 === 0) {
            this.triggerSynth(noteFreq, "sawtooth", 0.04, time, 0.08);
          }
          break;
        }
        case "takeover": { // "TAKEOVER" - Hyper electric trance
          const synthLine = [146.83, 146.83, 293.66, 220.00, 164.81, 196.00, 293.66, 440.00];
          const noteFreq = synthLine[step % synthLine.length];
          // Heavy pulsing sawtooth bass
          this.triggerSynth(noteFreq, "sawtooth", 0.07, time, 0.07);
          break;
        }
        default:
          break;
      }
    } catch (e) {
      // Audio node failure isolation
    }
  }

  private triggerSynth(frequency: number, type: OscillatorType, volume: number, time: number, duration: number) {
    if (!this.ctx || !this.mainVolumeNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);

    osc.connect(gain);
    gain.connect(this.mainVolumeNode);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  // Synthesizes individual capturing sound effects customized by track themes!
  playHit(theme: string, isFake?: boolean) {
    this.resume();
    if (!this.ctx || !this.mainVolumeNode) return;

    const time = this.ctx.currentTime;

    // Handle fake glitch hits immediately
    if (isFake) {
      // Create a harsh detuned glitch buzz
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(110, time);
      osc.frequency.linearRampToValueAtTime(55, time + 0.25);

      osc.connect(gain);
      gain.connect(this.mainVolumeNode);

      gain.gain.setValueAtTime(0.35, time);
      gain.gain.linearRampToValueAtTime(0.001, time + 0.25);

      osc.start(time);
      osc.stop(time + 0.27);
      return;
    }

    // Interactive theme triggers
    if (theme.includes("色")) {
      // Splatter Sound - Pluck chord (C_maj7)
      const freqs = [523.25, 659.25, 783.99, 987.77]; // C5, E5, G5, B5
      freqs.forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, time + idx * 0.02);

        osc.connect(gain);
        gain.connect(this.mainVolumeNode!);

        gain.gain.setValueAtTime(0.12, time + idx * 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3 + idx * 0.02);

        osc.start(time + idx * 0.02);
        osc.stop(time + 0.4 + idx * 0.02);
      });
    } else if (theme.includes("余韻")) {
      // Echo chimes - Delay feedback effect simulation
      const baseFreq = 880; // A5
      for (let i = 0; i < 4; i++) {
        const tapTime = time + i * 0.12;
        const vol = 0.15 * Math.pow(0.5, i);

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(baseFreq * (1 + i * 0.05), tapTime);

        osc.connect(gain);
        gain.connect(this.mainVolumeNode);

        gain.gain.setValueAtTime(vol, tapTime);
        gain.gain.exponentialRampToValueAtTime(0.001, tapTime + 0.3);

        osc.start(tapTime);
        osc.stop(tapTime + 0.35);
      }
    } else if (theme.includes("写真")) {
      // Shutter Click - Noise burst + short high-freq click
      // Noise buffer synthesis
      try {
        const bufferSize = this.ctx.sampleRate * 0.08; // 80ms
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(1000, time);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.mainVolumeNode);

        noise.start(time);
        noise.stop(time + 0.09);

        // Quick mechanical click
        const osc = this.ctx.createOscillator();
        const clickGain = this.ctx.createGain();
        osc.frequency.setValueAtTime(300, time);
        osc.frequency.setValueAtTime(2000, time + 0.04);
        osc.connect(clickGain);
        clickGain.connect(this.mainVolumeNode);

        clickGain.gain.setValueAtTime(0.2, time);
        clickGain.gain.setValueAtTime(0.2, time + 0.04);
        clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

        osc.start(time);
        osc.stop(time + 0.07);
      } catch (e) {
        // Fallback tone click if Buffer fails
        this.triggerSynth(1800, "sine", 0.2, time, 0.05);
      }
    } else if (theme.includes("未来と音楽")) {
      // Star constellation - Soaring glass chime
      const freqs = [783.99, 1046.5, 1318.51, 1567.98]; // G5, C6, E6, G6
      freqs.forEach((freq, idx) => {
        const t = time + idx * 0.03;
        this.triggerSynth(freq, "sine", 0.08, t, 0.4);
      });
    } else if (theme.includes("本当")) {
      // True chime
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.frequency.setValueAtTime(523.25, time); // C5
      osc2.frequency.setValueAtTime(587.33, time); // D5

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.mainVolumeNode);

      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + 0.35);
      osc2.stop(time + 0.35);
    } else if (theme.includes("エネルギー")) {
      // Lightning Laser rise
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, time);
      osc.frequency.exponentialRampToValueAtTime(2800, time + 0.15);

      osc.connect(gain);
      gain.connect(this.mainVolumeNode);

      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

      osc.start(time);
      osc.stop(time + 0.16);
    } else {
      // Fallback
      this.triggerSynth(880, "sine", 0.1, time, 0.15);
    }
  }

  // Plays a mild retro damage/thud effect
  playDamage() {
    this.resume();
    if (!this.ctx || !this.mainVolumeNode) return;
    const time = this.ctx.currentTime;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.linearRampToValueAtTime(30, time + 0.15);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(350, time);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.mainVolumeNode);

      gain.gain.setValueAtTime(0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

      osc.start(time);
      osc.stop(time + 0.16);
    } catch (e) {
      // safe fallback
    }
  }
}

export const GlobalAudio = new AudioEngine();
