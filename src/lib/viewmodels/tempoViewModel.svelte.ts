import Tempo from '$lib/models/tempo';

export default class TempoViewModel {
	public name: string = $state('');
	public bpm: number = $state(120);

	constructor(
		name: string,
		bpm: number | null,
		public goalBpm: number,
		public order: number
	) {
		this.name = name;

		if (bpm === null) {
			this.bpm = Math.floor(goalBpm * 0.75);
		} else {
			this.bpm = bpm;
		}
	}

	toTempo(): Tempo {
		return new Tempo(this.name, this.bpm, this.goalBpm, this.order);
	}
}
