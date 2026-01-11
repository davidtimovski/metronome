export default class Tempo {
	public bpm: number;

	constructor(
		public name: string,
		bpm: number | null,
		public goalBpm: number,
		public order: number
	) {
		if (bpm === null) {
			this.bpm = Math.floor(goalBpm * 0.75);
		} else {
			this.bpm = bpm;
		}
	}
}
