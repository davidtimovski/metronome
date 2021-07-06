<script lang="ts">
	const click = new Audio('/audio/click.mp3?v=5');
	click.load();

	let data = {
		tempo: 120
	};

	let msPerBeat = 500;

	const dataItem = window.localStorage.getItem('data');
	if (dataItem) {
		const dataObj = JSON.parse(dataItem);

		data.tempo = dataObj.tempo;
		msPerBeat = getMsPerBeat();
	} else {
		saveData();
	}

	let started = false;
	let intervalId: number;

	function saveData() {
		const stringified = JSON.stringify(data);
		window.localStorage.setItem('data', stringified);
	}

	function getMsPerBeat() {
		return (60 / data.tempo) * 1000;
	}

	function tempoChanged() {
		msPerBeat = getMsPerBeat();

		if (started) {
			stop();
			start(false);
		}

		saveData();
	}

	function toggleStartStop() {
		if (started) {
			stop();
		} else {
			start();
		}
	}

	function stop() {
		window.clearInterval(intervalId);
		started = false;
	}

	function start(initialClick = true) {
		if (initialClick) {
			click.currentTime = 0;
			click.play();
		}		

		intervalId = window.setInterval(() => {
			click.currentTime = 0;
			click.play();
		}, msPerBeat);

		started = true;
	}

	document.addEventListener('keyup', (e) => {
		if (e.code === 'Space') {
        	toggleStartStop();
    	}
	}, false);
</script>

<main>
	<div>
		<input type="number" bind:value={data.tempo} on:change={() => tempoChanged()} min="30" max="300" />

		<div class="button-wrap">
			<button on:click={toggleStartStop} class:started>{started ? 'Stop' : 'Start'}</button>
		</div>
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

	input[type="number"] {
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

			&.started {
				background: red;
			}
		}
	}
</style>