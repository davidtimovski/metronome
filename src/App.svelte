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

	let selectedTempoBpm = data.current.bpm;

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

	function normalizeBpm(bpm: number) {
		if (bpm < 30) {
			return 30;
		} 
		
		if (bpm > 300) {
			return 300;
		}

		if (bpm % 1 !== 0) {
			return Math.floor(bpm);
		}

		return bpm;
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
		selectedTempoBpm = data.current.bpm;

		currentTempoChanged();
	}

	function incrementTempo(bpm: number) {
		selectedTempoBpm = normalizeBpm(selectedTempoBpm + bpm);
		source.loopEnd = 1 / (selectedTempoBpm / 60);
	}

	function decrementTempo(bpm: number) {
		selectedTempoBpm = normalizeBpm(selectedTempoBpm - bpm);
		source.loopEnd = 1 / (selectedTempoBpm / 60);
	}

	function currentTempoChanged() {
		selectedTempoBpm = normalizeBpm(selectedTempoBpm);

		source.loopEnd = 1 / (selectedTempoBpm / 60);

		saveData();
	}

	function saveCurrentTempo() {
		data.current.bpm = selectedTempoBpm;
		saveData();
	}

	function undoCurrentTempoChange() {
		selectedTempoBpm = data.current.bpm;
		source.loopEnd = 1 / (data.current.bpm / 60);
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
		<div class="changed-tempo-alert" class:visible="{selectedTempoBpm !== data.current.bpm}">
			<div class="changed-tempo-alert-text">{selectedTempoBpm > data.current.bpm ? 'Increased' : 'Decreased'} by {Math.abs(selectedTempoBpm - data.current.bpm)} bpm.</div>
			<button type="button" on:click={saveCurrentTempo}>Save</button>
			<button type="button" on:click={undoCurrentTempoChange}>Undo</button>
		</div>

		<div class="tempo-wrap">
			<div class="tempo-actions tempo-actions-left">
				<button type="button" on:click={() => decrementTempo(1)} class="tempo-action-button tempo-action-top fas fa-minus"></button>
				<button type="button" on:click={() => decrementTempo(5)} class="tempo-action-button tempo-action-text">- 5</button>
			</div>
			<input type="number" bind:value={selectedTempoBpm} on:change={() => currentTempoChanged()} class="bpm-input" class:changed-up="{selectedTempoBpm > data.current.bpm}" class:changed-down="{selectedTempoBpm < data.current.bpm}" min="30" max="300" />
			<div class="tempo-actions tempo-actions-right">
				<button type="button" on:click={() => incrementTempo(1)} class="tempo-action-button tempo-action-top fas fa-plus"></button>
				<button type="button" on:click={() => incrementTempo(5)} class="tempo-action-button tempo-action-text">+ 5</button>
			</div>
		</div>

		<div class="start-stop-button-wrap">
			<button on:click={toggleStartStop} class:running="{isRunning}">{isRunning ? 'Stop' : 'Start'}</button>
		</div>

		<div class="tempos" bind:this={temposContainer} class:multiple="{data.tempos.length > 1}">
			{#each data.tempos as tempo}
				<div class="tempo" class:selected="{tempo.name === data.current.name}">
					<button type="button" on:click={moveCurrentTempoDown} class="down-button fas fa-long-arrow-alt-down" title="Move down" aria-label="Move down"></button>
					<div on:click={() => selectTempo(tempo.name)} class="current-tempo-name">{tempo.name}</div>
					<button type="button" on:click={moveCurrentTempoUp} class="up-button fas fa-long-arrow-alt-up" title="Move up" aria-label="Move up"></button>
				</div>
			{/each}
		</div>
		
		{#if editingNewTempo}
			<form class="new-tempo-form" on:submit|preventDefault={saveNewTempo}>
				<div class="new-tempo-form-title">Add a new tempo</div>

				<div class="new-tempo-form-inputs">
					<input type="text" bind:value={newTempoName} bind:this={newTempoNameInput} class="new-tempo-name-input" maxlength="30" placeholder="Name" />
					<input type="number" bind:value={newTempoBpm} class="new-tempo-bpm-input" min="30" max="300" placeholder="BPM" />
				</div>
				<div class="new-tempo-form-actions">
					<button>Save</button>
					<button on:click={cancelAddingNewTempo}>Cancel</button>
				</div>
			</form>
		{:else}
			<div class="tempos-actions">
				{#if data.tempos.length > 1}
					<button on:click={removeCurrentTempo} class="fas fa-minus" title="Remove tempo" aria-label="Remove tempo"></button>
				{/if}

				<button on:click={addNewTempo} class="fas fa-plus" title="Add tempo" aria-label="Add tempo"></button>
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

	.changed-tempo-alert {
		visibility: hidden;
		display: flex;
		border: 1px solid #ccd;
		padding: 5px;
		margin-bottom: 30px;
		opacity: 0;
		transition: opacity 300ms;

		&.visible {
			visibility: visible;
			opacity: 1;
		}

		&-text {
			flex: 1;
			background: #eef;
			padding: 8px 12px;
			text-align: left;
		}

		button {
			background: #88a;
			border: none;
			outline: none;
			padding: 8px 10px;
			margin-left: 5px;
			color: white;
			cursor: pointer;
		}
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

			.tempo-action-button {
				flex: 1;
				border: none;
				outline: none;
				font-size: 18px;
				cursor: pointer;

				&.tempo-action-text {
					font-size: 20px;
				}
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

			&.changed-up {
				background: #efffef;
			}
			&.changed-down {
				background: #ffefef;
			}
		}
	}

	.start-stop-button-wrap {
		margin-top: 15px;
		text-align: center;

		button {
			width: 140px;
			background: green;
			border: none;
			outline: none;
			padding: 10px;
			font-size: 32px;
			color: white;
			cursor: pointer;

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
			margin-top: 8px;
			text-align: center;
			cursor: pointer;
			user-select: none;

			button {
				display: none;
				width: 34px;
				background: #dedede;
				border: none;
				outline: none;
				cursor: pointer;

				&.down-button {
					margin-right: 8px;
				}
				&.up-button {
					margin-left: 8px;
				}
			}

			.current-tempo-name {
				flex: 1;
				background: #eee;
				padding: 8px 15px;
			}

			
			&.selected .current-tempo-name {
				background: blue;
				color: white;
			}

			&:hover:not(.selected) .current-tempo-name {
				background: #ddd;
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
		border: 1px solid #ccd;
		padding: 5px;
		margin-top: 30px;

		&-title {
			background: #eef;
			padding: 8px;
			margin-bottom: 8px;
		}

		&-inputs {
			display: flex;

			.new-tempo-name-input {
				flex: 1;
				padding: 3px 5px;
			}

			.new-tempo-bpm-input {
				width: 70px;
				padding: 3px 5px;
				margin-left: 8px;
				text-align: center;
			}
		}

		&-actions {
			display: flex;
			margin-top: 8px;

			button {
				flex: 1;
				border: none;
				outline: none;
				padding: 8px 0;
				cursor: pointer;

				&:first-child {
					margin-right: 8px;
				}
			}
		}
	}

	.tempos-actions {
		margin-top: 20px;
		text-align: center;

		button {
			width: 40px;
			border: none;
			outline: none;
			padding: 10px 0;
			cursor: pointer;
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