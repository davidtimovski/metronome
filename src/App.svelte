<script lang="ts">
	import Data from "./models/data";

	const click = new Audio('/audio/click.mp3?v=5');
	click.load();
	
	const worker = new Worker('worker.js');
	worker.onmessage = () => {
		click.currentTime = 0;
	    click.play();
	}

	let data = new Data(null, []);
	let isRunning = false;
	let msPerBeat = 500;

	let temposContainer: HTMLDivElement;

	let editingNewTempo = false;
	let newTempoNameInput: HTMLInputElement;
	let newTempoName = '';
	let newTempoBpm: number = null;

	const dataItem = window.localStorage.getItem('data');
	if (dataItem) {
		const dataObj = JSON.parse(dataItem);
		
		data.tempos = dataObj.tempos;
		data.current = dataObj.current;
		msPerBeat = getMsPerBeat();
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

	function saveData() {
		const stringified = JSON.stringify(data);
		window.localStorage.setItem('data', stringified);
	}

	function getMsPerBeat() {
		if (data.current.bpm < 30) {
			data.current.bpm = 30;
		} else if (data.current.bpm > 300) {
			data.current.bpm = 300;
		}

		if (data.current.bpm % 1 !== 0) {
			data.current.bpm = Math.floor(data.current.bpm);
		}

		return (60 / data.current.bpm) * 1000;
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

	function selectTempo(tempoName: string) {
		data.current = data.tempos.find(x => x.name === tempoName);
		msPerBeat = getMsPerBeat();
		
		worker.postMessage({ action: 'tempoChange', msPerBeat: msPerBeat });
	}

	function currentTempoChanged() {
		msPerBeat = getMsPerBeat();
		worker.postMessage({ action: 'tempoChange', msPerBeat: msPerBeat });
		saveData();
	}

	function toggleStartStop() {
		worker.postMessage({ action: 'toggleStartStop', msPerBeat: msPerBeat });
		isRunning = !isRunning;
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
			<div class="new-tempo-form">
				<input type="text" bind:value={newTempoName} bind:this={newTempoNameInput} class="new-tempo-name" placeholder="New tempo name" />
				<input type="number" bind:value={newTempoBpm} class="new-tempo-bpm" min="30" max="300" placeholder="BPM" />
				<button on:click={saveNewTempo}>Save</button>
				<button on:click={cancelAddingNewTempo}>Cancel</button>
			</div>
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