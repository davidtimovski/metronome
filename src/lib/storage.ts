import Data from '$lib/models/data';
import Tempo from '$lib/models/tempo';

export default class Storage {
	constructor(window: Window) {
		let dataItem = window.localStorage.getItem('data');
		if (!dataItem) {
			const defaultTempo = new Tempo('Default', 90, 120, 1);
			const data = new Data(defaultTempo.name!, [defaultTempo]);
			this.save(data);
		}
	}

	get(): Data {
		const dataItem = window.localStorage.getItem('data');
		return JSON.parse(dataItem!);
	}

	save(data: Data) {
		const stringified = JSON.stringify(data);
		window.localStorage.setItem('data', stringified);
	}
}
