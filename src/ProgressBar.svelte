<script lang="ts">
  import { onDestroy } from "svelte";
  import { bpm, goalBpm } from "./lib/stores";

  let progress = 0;
  setProgress($bpm, $goalBpm);

  const unsubscribe = bpm.subscribe((x) => {
    setProgress(x, $goalBpm);
  });

  const unsubscribe2 = goalBpm.subscribe((x) => {
    setProgress($bpm, x);
  });

  function setProgress(bpm: number, goalBpm: number) {
    const newProgress = (bpm / goalBpm) * 100;
    progress = newProgress > 100 ? 100 : newProgress;
  }

  onDestroy(() => {
    unsubscribe();
    unsubscribe2();
  });
</script>

<div class="goal">
  <span>0</span>
  <span>{$goalBpm}</span>
</div>

<div class="progress-bar">
  <div class="progress-bar-line" style="width: {progress}%;" />
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
