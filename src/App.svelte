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
	let newTempoForm: HTMLFormElement;

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
			newTempoForm.scrollTop = newTempoForm.scrollHeight;

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

		const currentIndex = storage.data.tempos.findIndex(x => x.name === currentTempo.name);
		const beforeNewTempo = storage.data.tempos.slice(0, currentIndex + 1);
		const afterNewTempo = storage.data.tempos.slice(currentIndex + 1);
		storage.data.tempos = [...beforeNewTempo, newTempo, ...afterNewTempo];
		
		selectTempo(newTempo.name);

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
			<div class="changed-tempo-alert-text">{selectedTempoBpm > currentTempo.bpm ? '+' : '-'}{Math.abs(selectedTempoBpm - currentTempo.bpm)} bpm</div>
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

		<div class="tempos" class:multiple="{storage.data.tempos.length > 1}">
			{#each storage.data.tempos as tempo}
				<div class="tempo" class:selected="{tempo.name === currentTempo.name}">
					<button type="button" on:click={moveCurrentDown} class="down-button fas fa-long-arrow-alt-down" title="Move down" aria-label="Move down"></button>
					<div class="tempo-name">
						<button type="button" on:click={() => selectTempo(tempo.name)}>{tempo.name}</button>
					</div>
					<button type="button" on:click={moveCurrentUp} class="up-button fas fa-long-arrow-alt-up" title="Move up" aria-label="Move up"></button>
				</div>
			{/each}
		</div>

		<div class="tempos-actions">
			{#if storage.data.tempos.length > 1}
				<button on:click={removeCurrent} disabled={editingNewTempo} class="fas fa-minus" title="Remove tempo" aria-label="Remove tempo"></button>
			{/if}

			<button on:click={addNewTempo} disabled={editingNewTempo} class="fas fa-plus" title="Add tempo" aria-label="Add tempo"></button>
		</div>

		<form class="new-tempo-form" bind:this={newTempoForm} on:submit|preventDefault={saveNewTempo} class:visible="{editingNewTempo}">
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
		justify-content: center;
		min-height: 90%;
	}

	.container {
		padding: 40px 20px;
	}

	.changed-tempo-alert {
		visibility: hidden;
		display: flex;
		border: 2px solid var(--gray-color);
		padding: 5px;
		margin-bottom: 20px;
		opacity: 0;
		transition: opacity 300ms;

		&.visible {
			visibility: visible;
			opacity: 1;
		}

		&-text {
			flex: 1;
			background: var(--light-blue-color);
			padding: 8px;
			text-align: center;
		}

		button {
			padding: 8px 10px;
			margin-left: 5px;
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
			font-size: 72px;
			text-align: center;
			color: inherit;
			transition: background 300ms;

			&.changed-up {
				background: #ddffe6;
			}
			&.changed-down {
				background: #ffeaea;
			}
		}
	}

	.start-stop-button-wrap {
		margin-top: 25px;
		text-align: center;

		button {
			width: 200px;
			background: #4dbb76;
			padding: 15px;
			font-size: 38px;

			&.running {
				background: #dd4d4d;
			}
		}
	}

	.tempos {
		max-height: 250px;
		padding: 0 20px;
		margin: 30px auto 0;
		overflow-y: auto;

		.tempo {
			margin-top: 8px;
			text-align: center;
			cursor: pointer;
			user-select: none;

			.down-button, .up-button {
				display: none;
				width: 34px;
			}

			.down-button {
				margin-right: 8px;
			}
			.up-button {
				margin-left: 8px;
			}

			.tempo-name button {
				width: 100%;
				background: var(--light-blue-color);
				padding: 10px;
				color: var(--gray-color);
			}
			
			&.selected {
				display: flex;
				justify-content: space-between;

				.tempo-name {
					flex: 1;
					border: 2px solid var(--gray-color);
					padding: 3px;
					
					button {
						background: var(--gray-color);
						padding: 5px 10px;
						color: #fff;
					}
				}
			}

			&:hover:not(.selected) .tempo-name button {
				background: #d2e2f2;
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
		display: none;
		border: 2px solid var(--gray-color);
		padding: 5px;
		margin-top: 20px;

		&.visible {
			display: block;
		}

		&-title {
			background: var(--light-blue-color);
			padding: 8px;
			margin-bottom: 8px;
			text-align: center;
		}

		&-inputs {
			display: flex;

			.new-tempo-name-input {
				flex: 1;
				padding: 5px 8px;
			}

			.new-tempo-bpm-input {
				width: 70px;
				padding: 5px;
				margin-left: 8px;
				text-align: center;
			}
		}

		&-actions {
			display: flex;
			margin-top: 8px;

			button {
				flex: 1;
				padding: 8px 0;

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
			padding: 10px 0;
		}
	}

	@media screen and (min-width: 600px) {
		.container {
			max-width: 450px;
		}

		.tempos {
			max-height: 350px;
		}
	}
</style>