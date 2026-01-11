import type Tempo from '../models/tempo';

export default class Data {
	constructor(
		public currentName: string,
		public tempos: Tempo[]
	) {}
}
