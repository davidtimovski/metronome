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

	function incrementTempo(bpm: number) {
		data.current.bpm += bpm;
		currentTempoChanged();
	}

	function decrementTempo(bpm: number) {
		data.current.bpm -= bpm;
		currentTempoChanged();
	}

	function currentTempoChanged() {
		data.current.bpm = normalizeBpm();

		source.loopEnd = 1 / (data.current.bpm / 60);

		saveData();
	}

	function moveCurrentTempoDown() {
		const currentTempoIndex = data.tempos.findIndex(x => x.name === data.current.name);
		if (currentTempoIndex === data.tempos.length - 1) {
			return;
		}

		const nextTempoIndex = currentTempoIndex + 1;
		const nextTempo = data.tempos[nextTempoIndex];

		data.tempos[nextTempoIndex] = data.current;
		data.tempos[currentTempoIndex] = nextTempo;

		saveData();
	}

	function moveCurrentTempoUp() {
		const currentTempoIndex = data.tempos.findIndex(x => x.name === data.current.name);
		if (currentTempoIndex === 0) {
			return;
		}

		const previousTempoIndex = currentTempoIndex - 1;
		const previousTempo = data.tempos[previousTempoIndex];

		data.tempos[previousTempoIndex] = data.current;
		data.tempos[currentTempoIndex] = previousTempo;

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
</script>

<main>
	<div class="container">
		<div class="tempo-wrap">
			<div class="tempo-actions tempo-actions-left">
				<button type="button" on:click={() => decrementTempo(1)} class="tempo-action tempo-action-top">-</button>
				<button type="button" on:click={() => decrementTempo(5)} class="tempo-action">- 5</button>
			</div>
			<input type="number" bind:value={data.current.bpm} on:change={() => currentTempoChanged()} class="bpm-input" min="30" max="300" />
			<div class="tempo-actions tempo-actions-right">
				<button type="button" on:click={() => incrementTempo(1)} class="tempo-action tempo-action-top">+</button>
				<button type="button" on:click={() => incrementTempo(5)} class="tempo-action">+ 5</button>
			</div>
		</div>

		<div class="button-wrap">
			<button on:click={toggleStartStop} class:running="{isRunning}">{isRunning ? 'Stop' : 'Start'}</button>
		</div>

		<div class="tempos" bind:this={temposContainer} class:multiple="{data.tempos.length > 1}">
			{#each data.tempos as tempo}
				<div class="tempo" class:selected="{tempo.name === data.current.name}">
					<button type="button" on:click={moveCurrentTempoDown} class="down-button">D</button>
					<div on:click={() => selectTempo(tempo.name)} class="current-tempo-name">{tempo.name}</div>
					<button type="button" on:click={moveCurrentTempoUp} class="up-button">U</button>
				</div>
			{/each}
		</div>
		
		{#if editingNewTempo}
			<form class="new-tempo-form" on:submit|preventDefault={saveNewTempo}>
				<input type="text" bind:value={newTempoName} bind:this={newTempoNameInput} class="new-tempo-name" maxlength="30" placeholder="Name" />
				<input type="number" bind:value={newTempoBpm} class="new-tempo-bpm" min="30" max="300" placeholder="BPM" />
				<button>Save</button>
				<button on:click={cancelAddingNewTempo}>Cancel</button>
			</form>
		{:else}
			<div class="tempos-actions">
				{#if data.tempos.length > 1}
					<button on:click={removeCurrentTempo} title="Remove" aria-label="Remove">-</button>
				{/if}

				<button on:click={addNewTempo} title="Add" aria-label="Add">+</button>
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
		padding: 0 20px;
		text-align: center;
	}

	.tempo-wrap {
		display: inline-flex;

		.tempo-actions {
			display: flex;
			flex-direction: column;
			min-width: 60px;
			
			&.tempo-actions-left {
				padding-right: 10px;
			}
			&.tempo-actions-right {
				padding-left: 10px;
			}

			.tempo-action {
				flex: 1;
			}
			.tempo-action-top {
				margin-bottom: 10px;
			}
		}

		.bpm-input {
			width: 100%;
			padding: 5px 10px;
			font-size: 70px;
			text-align: center;
			color: inherit;
		}
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

		.tempo {
			display: flex;
			justify-content: space-between;
			margin-top: 3px;
			text-align: center;
			cursor: pointer;
			user-select: none;

			button {
				display: none;
				width: 30px;
			}

			.down-button {
				margin-right: 8px;
			}
			.up-button {
				margin-left: 8px;
			}

			&.selected .current-tempo-name {
				background: #eee;
			}

			.current-tempo-name {
				flex: 1;
				padding: 8px 15px;
			}
		}

		&.multiple {
			.tempo.selected button {
				display: inline-block;
			}
		}
	}
	/* Hide scrollbar for Chrome, Safari and Opera */
	.tempos::-webkit-scrollbar {
		display: none;
	}

	.new-tempo-form {
		display: flex;
		padding: 0 10px;
		margin-top: 20px;

		.new-tempo-name {
			width: 180px;
			padding: 3px 5px;
		}

		.new-tempo-bpm {
			width: 70px;
			padding: 3px 5px;
			margin-left: 5px;
			text-align: center;
		}

		button {
			padding: 3px 10px;
			margin-left: 5px;
		}
	}

	.tempos-actions {
		margin-top: 20px;
		text-align: center;

		button {
			width: 40px;
			padding: 3px 0;
		}
	}

	@media screen and (min-width: 768px) {
		.container {
			padding: 0;
		}

		.tempo-wrap .bpm-input {
			width: 250px;
		}
	}
</style>