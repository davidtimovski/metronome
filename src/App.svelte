<script lang="ts">
	import Storage from "./lib/storage";
	import Metronome from "./lib/metronome";
	import Footer from './Footer.svelte';

	const storage = new Storage();
	let currentTempo = storage.data.tempos.find((x) => x.name === storage.data.currentName);
	let selectedTempoBpm = currentTempo.bpm;

	const metronome = new Metronome('/audio/click.mp3', selectedTempoBpm);

	let isRunning = false;

	let editingNewTempo = false;
	let newTempoNameInput: HTMLInputElement;
	let newTempoName = '';
	let newTempoBpm: number = null;
	let temposContainer: HTMLDivElement;

	function toggleStartStop() {
		if (isRunning) {
			metronome.stop();
		} else {
			metronome.start();
		}

		isRunning = !isRunning;
	}

	function selectTempo(tempoName: string) {
		storage.data.currentName = tempoName;
		currentTempo = storage.data.tempos.find((x) => x.name === tempoName);
		selectedTempoBpm = currentTempo.bpm;

		currentChanged();
	}

	function incrementTempo(bpm: number) {
		selectedTempoBpm = metronome.normalizeBpm(selectedTempoBpm + bpm);
		metronome.setTempo(selectedTempoBpm);
	}

	function decrementTempo(bpm: number) {
		selectedTempoBpm = metronome.normalizeBpm(selectedTempoBpm - bpm);
		metronome.setTempo(selectedTempoBpm);
	}

	function currentChanged() {
		selectedTempoBpm = metronome.normalizeBpm(selectedTempoBpm);

		metronome.setTempo(selectedTempoBpm);

		storage.save();
	}

	function saveCurrent() {
		currentTempo.bpm = selectedTempoBpm;
		storage.save();
	}

	function undoCurrentChange() {
		selectedTempoBpm = currentTempo.bpm;
		metronome.setTempo(currentTempo.bpm);
	}

	function moveCurrentDown() {
		const currentIndex = storage.data.tempos.findIndex(x => x.name === currentTempo.name);
		if (currentIndex === storage.data.tempos.length - 1) {
			return;
		}

		const nextTempoIndex = currentIndex + 1;
		const nextTempo = storage.data.tempos[nextTempoIndex];

		storage.data.tempos[nextTempoIndex] = currentTempo;
		storage.data.tempos[currentIndex] = nextTempo;

		storage.save();
	}

	function moveCurrentUp() {
		const currentIndex = storage.data.tempos.findIndex(x => x.name === currentTempo.name);
		if (currentIndex === 0) {
			return;
		}

		const previousTempoIndex = currentIndex - 1;
		const previousTempo = storage.data.tempos[previousTempoIndex];

		storage.data.tempos[previousTempoIndex] = currentTempo;
		storage.data.tempos[currentIndex] = previousTempo;

		storage.save();
	}

	function addNewTempo() {
		editingNewTempo = true;
		window.setTimeout(() => {
			newTempoNameInput.focus();
		}, 0);
	}

	function removeCurrent() {
		const currentName = currentTempo.name;
		const currentIndex = storage.data.tempos.findIndex(x => x.name === currentName);
		const nextTempoIndex = currentIndex === 0 ? 1 : currentIndex - 1;
		const nextTempo = storage.data.tempos[nextTempoIndex];

		selectTempo(nextTempo.name);

		storage.data.tempos = storage.data.tempos.filter(x => x.name !== currentName);

		storage.save();
	}

	function saveNewTempo() {
		if (newTempoName.trim() === '') {
			return;
		}

		if (storage.data.tempos.some(x => x.name.toUpperCase() === newTempoName.trim().toUpperCase())) {
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
			order: storage.data.tempos.length + 1
		};
		storage.data.tempos = [...storage.data.tempos, newTempo];
		
		selectTempo(newTempo.name);

		// Scroll to bottom
		window.setTimeout(() => {
			temposContainer.scrollTop = temposContainer.scrollHeight;
		}, 0);		

		storage.save();

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
		<div class="changed-tempo-alert" class:visible="{selectedTempoBpm !== currentTempo.bpm}">
			<div class="changed-tempo-alert-text">{selectedTempoBpm > currentTempo.bpm ? 'Increased' : 'Decreased'} by {Math.abs(selectedTempoBpm - currentTempo.bpm)} bpm.</div>
			<button type="button" on:click={saveCurrent}>Save</button>
			<button type="button" on:click={undoCurrentChange}>Undo</button>
		</div>

		<div class="tempo-wrap">
			<div class="tempo-actions tempo-actions-left">
				<button type="button" on:click={() => decrementTempo(1)} disabled={selectedTempoBpm === 30} class="tempo-action-button tempo-action-top fas fa-minus"></button>
				<button type="button" on:click={() => decrementTempo(5)} disabled={selectedTempoBpm === 30} class="tempo-action-button tempo-action-text">- 5</button>
			</div>
			<input type="number" bind:value={selectedTempoBpm} on:change={() => currentChanged()} class="bpm-input" class:changed-up="{selectedTempoBpm > currentTempo.bpm}" class:changed-down="{selectedTempoBpm < currentTempo.bpm}" min="30" max="300" />
			<div class="tempo-actions tempo-actions-right">
				<button type="button" on:click={() => incrementTempo(1)} disabled={selectedTempoBpm === 300} class="tempo-action-button tempo-action-top fas fa-plus"></button>
				<button type="button" on:click={() => incrementTempo(5)} disabled={selectedTempoBpm === 300} class="tempo-action-button tempo-action-text">+ 5</button>
			</div>
		</div>

		<div class="start-stop-button-wrap">
			<button on:click={toggleStartStop} class:running="{isRunning}">{isRunning ? 'Stop' : 'Start'}</button>
		</div>

		<div class="tempos" bind:this={temposContainer} class:multiple="{storage.data.tempos.length > 1}">
			{#each storage.data.tempos as tempo}
				<div class="tempo" class:selected="{tempo.name === currentTempo.name}">
					<button type="button" on:click={moveCurrentDown} class="down-button fas fa-long-arrow-alt-down" title="Move down" aria-label="Move down"></button>
					<div on:click={() => selectTempo(tempo.name)} class="current-tempo-name">{tempo.name}</div>
					<button type="button" on:click={moveCurrentUp} class="up-button fas fa-long-arrow-alt-up" title="Move up" aria-label="Move up"></button>
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
				{#if storage.data.tempos.length > 1}
					<button on:click={removeCurrent} class="fas fa-minus" title="Remove tempo" aria-label="Remove tempo"></button>
				{/if}

				<button on:click={addNewTempo} class="fas fa-plus" title="Add tempo" aria-label="Add tempo"></button>
			</div>
		{/if}
	</div>
</main>

<Footer />

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
		height: 90%;
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
			transition: background 300ms;

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