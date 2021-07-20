<script lang="ts">
	import Data from "./models/data";

	let data = new Data(null, []);

	const dataItem = window.localStorage.getItem('data');
	if (dataItem) {
		const dataObj = JSON.parse(dataItem);
		
		data.tempos = dataObj.tempos;
		data.current = dataObj.current;
	} else {
		const defaultTempo = {
			name: 'Default',
			bpm: 120,
			order: 1
		};

		data.tempos.push(defaultTempo);
		data.current = defaultTempo;

		saveData();
	}

	const audioContext = new AudioContext();
	audioContext.suspend();
	const source = audioContext.createBufferSource();

	fetch('/audio/click.mp3?v=5')
		.then(response => response.arrayBuffer())
		.then(buffer => audioContext.decodeAudioData(buffer))
		.then(buffer => {
			source.buffer = buffer;
			source.loop = true;
			source.loopEnd = 1 / (data.current.bpm / 60);

			source.connect(audioContext.destination);
			source.start(0);
		});

	let isRunning = false;

	let editingNewTempo = false;
	let newTempoNameInput: HTMLInputElement;
	let newTempoName = '';
	let newTempoBpm: number = null;
	let temposContainer: HTMLDivElement;

	function saveData() {
		const stringified = JSON.stringify(data);
		window.localStorage.setItem('data', stringified);
	}

	function normalizeBpm() {
		if (data.current.bpm < 30) {
			return 30;
		} 
		
		if (data.current.bpm > 300) {
			return 300;
		}

		if (data.current.bpm % 1 !== 0) {
			return Math.floor(data.current.bpm);
		}

		return data.current.bpm;
	}

	function toggleStartStop() {
		if (isRunning) {
			audioContext.suspend();
		} else {
			audioContext.resume();
		}

		isRunning = !isRunning;
	}

	function selectTempo(tempoName: string) {
		data.current = data.tempos.find(x => x.name === tempoName);

		currentTempoChanged();
	}

	function currentTempoChanged() {
		data.current.bpm = normalizeBpm();

		source.loopEnd = 1 / (data.current.bpm / 60);

		saveData();
	}

	function addNewTempo() {
		editingNewTempo = true;
		window.setTimeout(() => {
			newTempoNameInput.focus();
		}, 0);
	}

	function removeCurrentTempo() {
		const currentTempoName = data.current.name;
		const currentTempoIndex = data.tempos.findIndex(x => x.name === data.current.name);
		const nextTempoIndex = currentTempoIndex === 0 ? 1 : currentTempoIndex - 1;
		const nextTempo = data.tempos[nextTempoIndex];

		selectTempo(nextTempo.name);

		data.tempos = data.tempos.filter(x => x.name !== currentTempoName);

		saveData();
	}

	function saveNewTempo() {
		if (newTempoName.trim() === '') {
			return;
		}

		if (data.tempos.some(x => x.name === newTempoName.trim())) {
			return;
		}

		if (newTempoBpm === null) {
			return;
		} else if (newTempoBpm < 30) {
			newTempoBpm = 30;
		} else if (newTempoBpm > 300) {
			newTempoBpm = 300;
		}
		
		if (newTempoBpm % 1 !== 0) {
			newTempoBpm = Math.floor(newTempoBpm);
		}

		const newTempo = {
			name: newTempoName.trim(),
			bpm: newTempoBpm,
			order: data.tempos.length + 1
		};
		data.tempos = [...data.tempos, newTempo];
		
		selectTempo(newTempo.name);

		// Scroll to bottom
		window.setTimeout(() => {
			temposContainer.scrollTop = temposContainer.scrollHeight;
		}, 0);		

		saveData();

		cancelAddingNewTempo();
	}

	function cancelAddingNewTempo() {
		editingNewTempo = false;
		newTempoName = '';
		newTempoBpm = null;
	}

	document.addEventListener('keyup', (e) => {
		if (e.code === 'Space') {
        	toggleStartStop();
    	}
	}, false);
</script>

<main>
	<div class="container">
		<input type="number" bind:value={data.current.bpm} on:change={() => currentTempoChanged()} class="bpm" min="30" max="300" />

		<div class="button-wrap">
			<button on:click={toggleStartStop} class:running="{isRunning}">{isRunning ? 'Stop' : 'Start'}</button>
		</div>

		<div class="tempos" bind:this={temposContainer}>
			{#each data.tempos as tempo}
				<div on:click={() => selectTempo(tempo.name)} class="tempo" class:selected="{tempo.name === data.current.name}">{tempo.name}</div>
			{/each}
		</div>
		
		{#if editingNewTempo}
			<form class="new-tempo-form" on:submit|preventDefault={saveNewTempo}>
				<input type="text" bind:value={newTempoName} bind:this={newTempoNameInput} class="new-tempo-name" placeholder="New tempo name" />
				<input type="number" bind:value={newTempoBpm} class="new-tempo-bpm" min="30" max="300" placeholder="BPM" />
				<button>Save</button>
				<button on:click={cancelAddingNewTempo}>Cancel</button>
			</form>
		{:else}
			<div class="tempos-actions">
				<button on:click={addNewTempo} title="Add" aria-label="Add">+</button>

				{#if data.tempos.length > 1}
					<button on:click={removeCurrentTempo} title="Remove" aria-label="Remove">-</button>
				{/if}
			</div>
		{/if}
	</div>
</main>

<style lang="scss">
	/* Chrome, Safari, Edge, Opera */
	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	/* Firefox */
	input[type=number] {
		-moz-appearance: textfield;
	}

	main {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
	}

	.container {
		text-align: center;
	}

	.bpm {
		width: 300px;
		padding: 5px 10px;
		font-size: 70px;
		text-align: center;
		color: inherit;
	}

	.button-wrap {
		margin-top: 15px;
		text-align: center;

		button {
			width: 140px;
			background: green;
			padding: 10px;
			font-size: 32px;

			&.running {
				background: red;
			}
		}
	}

	.tempos {
		max-height: 200px;
		margin-top: 30px;
		overflow-y: scroll;

		/* Hide scrollbar for IE, Edge and Firefox */
		-ms-overflow-style: none;  /* IE and Edge */
		scrollbar-width: none;  /* Firefox */
	}
	/* Hide scrollbar for Chrome, Safari and Opera */
	.tempos::-webkit-scrollbar {
		display: none;
	}

	.tempo {
		padding: 8px 15px;
		margin-top: 3px;
		text-align: center;
		cursor: pointer;
		user-select: none;
	}
	.tempo.selected {
		background: #eee;
	}

	.new-tempo-form {
		display: flex;
		padding: 0 10px;
		margin-top: 20px;
	}

	.new-tempo-name {
		width: 100%;
	}

	.new-tempo-bpm {
		width: 70px;
		margin-left: 5px;
		text-align: center;
	}

	.new-tempo-form button {
		padding: 3px 10px;
		margin-left: 5px;
	}

	.tempos-actions {
		margin-top: 20px;
		text-align: center;
	}
	.tempos-actions button {
		width: 40px;
		padding: 3px 0;
	}
</style>