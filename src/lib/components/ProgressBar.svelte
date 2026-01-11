<script lang="ts">
	let { bpm, goalBpm }: { bpm: number; goalBpm: number } = $props();

	let progressPercent = $derived.by(() => {
		let newProgress = (bpm / goalBpm) * 100;
		return newProgress > 100 ? 100 : newProgress;
	});
</script>

<div class="goal">
	<span>0</span>
	<span>{goalBpm}</span>
</div>

<div class="progress-bar">
	<div class="progress-bar-line" style="width: {progressPercent}%;"></div>
</div>

<style lang="scss">
	.goal {
		display: flex;
		justify-content: space-between;
		margin-bottom: 10px;
		text-align: center;
		font-size: 28px;
	}

	.progress-bar {
		height: 8px;
		background: #eee;
		margin-bottom: 25px;

		&-line {
			height: 8px;
			background: var(--green-color);
		}
	}
</style>
