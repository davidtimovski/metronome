<script lang="ts">
	import { onMount } from 'svelte';
	import Storage from '$lib/storage';
	import Metronome from '$lib/metronome';
	import WakeLockService from '$lib/wakeLockService';

	import TempoViewModel from '$lib/viewmodels/tempoViewModel.svelte';

	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import type Data from '$lib/models/data';
	import Tempo from '$lib/models/tempo';

	let storage: Storage | null = $state(null);
	let data: Data | null = $state(null);
	let currentTempoVm: TempoViewModel | null = $state(null);
	let metronome: Metronome | null = $state(null);

	let isRunning = $state(false);

	let editingNewTempo = $state(false);
	let newTempoNameInput: HTMLInputElement | null = $state(null);
	let newTempoName = $state('');
	let newTempoGoalBpm: number | null = $state(null);
	let newTempoForm: HTMLFormElement | null = $state(null);

	const wakeLockService = new WakeLockService();

	async function toggleStartStop() {
		if (metronome === null) {
			throw new Error('Data not initialized');
		}

		if (isRunning) {
			metronome.stop();

			wakeLockService.releaseWakeLock();
		} else {
			metronome.start();

			await wakeLockService.requestWakeLock();
		}

		isRunning = !isRunning;
	}

	function selectTempo(tempoName: string) {
		if (data === null) {
			throw new Error('Data not initialized');
		}

		data.currentName = tempoName;
		const current = data.tempos.find((x: Tempo) => x.name === tempoName)!;
		currentTempoVm = new TempoViewModel(current.name, current.bpm, current.goalBpm, current.order);

		currentChanged();
	}

	function incrementTempo(value: number) {
		if (metronome === null || currentTempoVm === null) {
			throw new Error('Data not initialized');
		}

		currentTempoVm.bpm = metronome.normalizeBpm(currentTempoVm.bpm + value);
		metronome.setTempo(currentTempoVm.bpm);
	}

	function decrementTempo(value: number) {
		if (metronome === null || currentTempoVm === null) {
			throw new Error('Data not initialized');
		}

		currentTempoVm.bpm = metronome.normalizeBpm(currentTempoVm.bpm - value);
		metronome.setTempo(currentTempoVm.bpm);
	}

	function currentChanged() {
		if (metronome === null || storage === null || data === null || currentTempoVm === null) {
			throw new Error('Data not initialized');
		}

		currentTempoVm.bpm = metronome.normalizeBpm(currentTempoVm.bpm);
		metronome.setTempo(currentTempoVm.bpm);

		storage.save(data);
	}

	function saveCurrent() {
		if (storage === null || data === null) {
			throw new Error('Data not initialized');
		}

		storage.save(data);
		data = storage.get();
	}

	function undoCurrentChange() {
		if (metronome === null || currentTempoVm === null) {
			throw new Error('Data not initialized');
		}

		metronome.setTempo(currentTempoVm.bpm);
	}

	function moveCurrentDown() {
		if (storage === null || data === null || currentTempoVm === null) {
			throw new Error('Data not initialized');
		}

		const currentIndex = data.tempos.findIndex((x) => x.name === currentTempoVm!.name);
		if (currentIndex === data.tempos.length - 1) {
			return;
		}

		const nextTempoIndex = currentIndex + 1;
		const nextTempo = data.tempos[nextTempoIndex];

		data.tempos[nextTempoIndex] = currentTempoVm;
		data.tempos[currentIndex] = nextTempo;

		storage.save(data);
	}

	function moveCurrentUp() {
		if (storage === null || data === null || currentTempoVm === null) {
			throw new Error('Data not initialized');
		}

		const currentIndex = data.tempos.findIndex((x) => x.name === currentTempoVm!.name);
		if (currentIndex === 0) {
			return;
		}

		const previousTempoIndex = currentIndex - 1;
		const previousTempo = data.tempos[previousTempoIndex];

		data.tempos[previousTempoIndex] = currentTempoVm;
		data.tempos[currentIndex] = previousTempo;

		storage.save(data);
	}

	function addNewTempo() {
		editingNewTempo = true;

		window.setTimeout(() => {
			if (newTempoForm !== null) {
				newTempoForm.scrollTop = newTempoForm.scrollHeight;
			}

			newTempoNameInput?.focus();
		}, 0);
	}

	function removeCurrent() {
		if (storage === null || data === null || currentTempoVm === null) {
			throw new Error('Data not initialized');
		}

		const currentName = currentTempoVm.name;
		const currentIndex = data.tempos.findIndex((x) => x.name === currentName);
		const nextTempoIndex = currentIndex === 0 ? 1 : currentIndex - 1;
		const nextTempo = data.tempos[nextTempoIndex];

		selectTempo(nextTempo.name);

		data.tempos = data.tempos.filter((x) => x.name !== currentName);

		storage.save(data);
	}

	function saveNewTempo(event: Event) {
		if (storage === null || data === null || currentTempoVm === null) {
			throw new Error('Data not initialized');
		}

		event.preventDefault();

		if (newTempoName.trim() === '') {
			return;
		}

		if (data.tempos.some((x) => x.name.toUpperCase() === newTempoName.trim().toUpperCase())) {
			return;
		}

		if (newTempoGoalBpm === null) {
			return;
		} else if (newTempoGoalBpm < 30) {
			newTempoGoalBpm = 30;
		} else if (newTempoGoalBpm > 300) {
			newTempoGoalBpm = 300;
		}

		if (newTempoGoalBpm % 1 !== 0) {
			newTempoGoalBpm = Math.floor(newTempoGoalBpm);
		}

		const newTempo = new Tempo(newTempoName.trim(), null, newTempoGoalBpm, data.tempos.length + 1);

		const currentIndex = data.tempos.findIndex((x) => x.name === currentTempoVm!.name);
		const beforeNewTempo = data.tempos.slice(0, currentIndex + 1);
		const afterNewTempo = data.tempos.slice(currentIndex + 1);
		data.tempos = [...beforeNewTempo, newTempo, ...afterNewTempo];

		selectTempo(newTempo.name);

		storage.save(data);

		hideNewTempoForm();
	}

	function hideNewTempoForm() {
		editingNewTempo = false;
		newTempoName = '';
		newTempoGoalBpm = null;
	}

	onMount(() => {
		storage = new Storage(window);
		data = storage.get()!;
		const current = data.tempos.find((x) => x.name === data!.currentName)!;
		currentTempoVm = new TempoViewModel(current.name, current.bpm, current.goalBpm, current.order);
		metronome = new Metronome('/audio/click.mp3', currentTempoVm.bpm);

		// Re-lock screen if document was out of focus and then
		// came into focus while metronome is running
		document.addEventListener('visibilitychange', async () => {
			if (wakeLockService.lock !== null && document.visibilityState === 'visible' && isRunning) {
				await wakeLockService.requestWakeLock();
			}
		});
	});
</script>

<div class="container">
	{#if data && currentTempoVm}
		<div class="changed-tempo-alert" class:visible={currentTempoVm.bpm !== currentTempoVm.bpm}>
			<div class="changed-tempo-alert-text">
				{currentTempoVm.bpm > currentTempoVm.bpm ? '+' : '-'}{Math.abs(currentTempoVm.bpm - currentTempoVm.bpm)} bpm
			</div>
			<button type="button" onclick={saveCurrent}>Save</button>
			<button type="button" onclick={undoCurrentChange}>Undo</button>
		</div>

		<ProgressBar bpm={currentTempoVm.bpm} goalBpm={currentTempoVm.goalBpm} />

		<div class="tempo-wrap">
			<div class="tempo-actions tempo-actions-left">
				<button
					type="button"
					onclick={() => decrementTempo(1)}
					disabled={currentTempoVm.bpm === 30}
					class="tempo-action-button tempo-action-top fas fa-minus"
					aria-label="Decrease tempo by 1"
				></button>
				<button
					type="button"
					onclick={() => decrementTempo(5)}
					disabled={currentTempoVm.bpm === 30}
					class="tempo-action-button tempo-action-text"
					aria-label="Decrease tempo by 5">- 5</button
				>
			</div>

			<input
				type="number"
				bind:value={currentTempoVm.bpm}
				onchange={() => currentChanged()}
				class="bpm-input"
				class:changed-up={currentTempoVm.bpm > currentTempoVm.bpm}
				class:changed-down={currentTempoVm.bpm < currentTempoVm.bpm}
				min="30"
				max="300"
				aria-label="Tempo (bpm)"
			/>

			<div class="tempo-actions tempo-actions-right">
				<button
					type="button"
					onclick={() => incrementTempo(1)}
					disabled={currentTempoVm.bpm === 300}
					class="tempo-action-button tempo-action-top fas fa-plus"
					aria-label="Increase tempo by 1"
				></button>
				<button
					type="button"
					onclick={() => incrementTempo(5)}
					disabled={currentTempoVm.bpm === 300}
					class="tempo-action-button tempo-action-text"
					aria-label="Increase tempo by 5">+ 5</button
				>
			</div>
		</div>

		<div class="start-stop-button-wrap">
			<button onclick={toggleStartStop} class:running={isRunning}>{isRunning ? 'Stop' : 'Start'}</button>
		</div>

		<div class="tempos" class:multiple={data.tempos.length > 1}>
			{#each data.tempos as tempo}
				<div class="tempo" class:selected={tempo.name === currentTempoVm.name}>
					<button
						type="button"
						onclick={moveCurrentDown}
						class="down-button fas fa-long-arrow-alt-down"
						title="Move down"
						aria-label="Move down"
					></button>
					<div class="tempo-name">
						<button type="button" onclick={() => selectTempo(tempo.name)} class:achieved={tempo.bpm >= tempo.goalBpm}
							>{tempo.name}</button
						>
					</div>
					<button
						type="button"
						onclick={moveCurrentUp}
						class="up-button fas fa-long-arrow-alt-up"
						title="Move up"
						aria-label="Move up"
					></button>
				</div>
			{/each}
		</div>

		<div class="tempos-actions">
			{#if data.tempos.length > 1}
				<button
					onclick={removeCurrent}
					disabled={editingNewTempo}
					class="fas fa-minus"
					title="Remove tempo"
					aria-label="Remove tempo"
				></button>
			{/if}

			<button
				onclick={addNewTempo}
				disabled={editingNewTempo}
				class="fas fa-plus"
				title="Add tempo"
				aria-label="Add tempo"
			></button>
		</div>

		<form class="new-tempo-form" bind:this={newTempoForm} onsubmit={saveNewTempo} class:visible={editingNewTempo}>
			<div class="new-tempo-form-title">Add a new tempo</div>

			<div class="new-tempo-form-inputs">
				<input
					type="text"
					bind:value={newTempoName}
					bind:this={newTempoNameInput}
					class="new-tempo-name-input"
					maxlength="30"
					placeholder="Name"
				/>
				<input
					type="number"
					bind:value={newTempoGoalBpm}
					class="new-tempo-bpm-input"
					min="30"
					max="300"
					placeholder="BPM"
				/>
			</div>
			<div class="new-tempo-form-actions">
				<button>Save</button>
				<button onclick={hideNewTempoForm}>Cancel</button>
			</div>
		</form>
	{/if}
</div>

<style lang="scss">
	/* Chrome, Safari, Edge, Opera */
	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	/* Firefox */
	input[type='number'] {
		-moz-appearance: textfield;
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
		display: flex;

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
				background: var(--light-green-color);
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
			background: var(--green-color);
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

			.down-button,
			.up-button {
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

				&.achieved {
					background: var(--light-green-color);
					color: var(--green-text-color);
				}
			}

			&.selected {
				display: flex;
				justify-content: space-between;

				.tempo-name {
					flex: 1;
					border: 2px solid var(--gray-color);
					padding: 3px;

					button {
						padding: 5px 10px;
					}
				}
			}

			&:hover:not(.selected) .tempo-name button:not(.achieved) {
				background: #cfdfef;
			}
			&:hover:not(.selected) .tempo-name button.achieved {
				background: #cdefd6;
				color: var(--green-text-color);
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
					background: var(--green-color);
					margin-right: 8px;
				}
			}
		}
	}

	.tempos-actions {
		margin-top: 20px;
		text-align: center;
		font-size: 0;

		button {
			width: 40px;
			padding: 10px 0;
			font-size: 18px;

			&:first-child {
				margin-right: 10px;
			}
		}
	}

	@media screen and (min-width: 600px) {
		.tempos {
			max-height: 350px;
		}
	}
</style>
