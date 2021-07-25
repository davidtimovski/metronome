export default class Metronome {
  private readonly minBpm = 30;
  private readonly maxBpm = 300;
  private source: AudioBufferSourceNode;

  public audioContext: AudioContext;

  constructor(public soundFileUrl: string, bpm: number) {
    this.audioContext = new AudioContext();
    this.audioContext.suspend();
    this.source = this.audioContext.createBufferSource();

    fetch(soundFileUrl)
      .then((response) => response.arrayBuffer())
      .then((buffer) => this.audioContext.decodeAudioData(buffer))
      .then((buffer) => {
        this.source.buffer = buffer;
        this.source.loop = true;
        this.source.loopEnd = 1 / (bpm / 60);

        this.source.connect(this.audioContext.destination);
        this.source.start(0);
      });
  }

  public start() {
    this.audioContext.resume();
  }

  public stop() {
    this.audioContext.suspend();
  }

  public setTempo(bpm: number) {
    this.source.loopEnd = 1 / (bpm / 60);
  }

  public normalizeBpm(bpm: number) {
    if (bpm < this.minBpm) {
      return this.minBpm;
    }

    if (bpm > this.maxBpm) {
      return this.maxBpm;
    }

    if (bpm % 1 !== 0) {
      return Math.floor(bpm);
    }

    return bpm;
  }
}
