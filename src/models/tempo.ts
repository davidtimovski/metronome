export default class Tempo {
  bpm: number;

  constructor(public name: string, public goalBpm: number, public order: number) {
    if (this.goalBpm <= 45) {
      this.bpm = 30;
    } else {
      this.bpm = Math.floor(goalBpm * 0.75);
    }
  }
}
