<script lang="ts">
  import Storage from "./lib/storage";
  import Metronome from "./lib/metronome";
  import WakeLockService from "./lib/wakeLockService";
  import ProgressBar from "./ProgressBar.svelte";
  import Footer from "./Footer.svelte";
  import Tempo from "./models/tempo";
  import { bpm, goalBpm } from "./lib/stores";

  const storage = new Storage();
  let data = storage.get();
  let currentTempo = data.tempos.find((x) => x.name === data.currentName);
  bpm.update(() => currentTempo.bpm);
  goalBpm.update(() => currentTempo.goalBpm);

  const metronome = new Metronome("/audio/click.mp3", $bpm);

  let isRunning = false;

  let editingNewTempo = false;
  let newTempoNameInput: HTMLInputElement;
  let newTempoName = "";
  let newTempoGoalBpm: number = null;
  let newTempoForm: HTMLFormElement;

  const wakeLockService = new WakeLockService();

  // Re-lock screen if document was out of focus and then
  // came into focus while metronome is running
  document.addEventListener("visibilitychange", async () => {
    if (wakeLockService.lock !== null && document.visibilityState === "visible" && isRunning) {
      await wakeLockService.requestWakeLock();
    }
  });

  async function toggleStartStop() {
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
    data.currentName = tempoName;
    currentTempo = data.tempos.find((x) => x.name === tempoName);
    bpm.update(() => currentTempo.bpm);
    goalBpm.update(() => currentTempo.goalBpm);

    currentChanged();
  }

  function incrementTempo(value: number) {
    bpm.update((x) => metronome.normalizeBpm(x + value));
    metronome.setTempo($bpm);
  }

  function decrementTempo(value: number) {
    bpm.update((x) => metronome.normalizeBpm(x - value));
    metronome.setTempo($bpm);
  }

  function currentChanged() {
    bpm.update(() => metronome.normalizeBpm($bpm));
    metronome.setTempo($bpm);

    storage.save(data);
  }

  function saveCurrent() {
    currentTempo.bpm = $bpm;
    storage.save(data);
    data = storage.get();
  }

  function undoCurrentChange() {
    bpm.update(() => currentTempo.bpm);
    metronome.setTempo(currentTempo.bpm);
  }

  function moveCurrentDown() {
    const currentIndex = data.tempos.findIndex((x) => x.name === currentTempo.name);
    if (currentIndex === data.tempos.length - 1) {
      return;
    }

    const nextTempoIndex = currentIndex + 1;
    const nextTempo = data.tempos[nextTempoIndex];

    data.tempos[nextTempoIndex] = currentTempo;
    data.tempos[currentIndex] = nextTempo;

    storage.save(data);
  }

  function moveCurrentUp() {
    const currentIndex = data.tempos.findIndex((x) => x.name === currentTempo.name);
    if (currentIndex === 0) {
      return;
    }

    const previousTempoIndex = currentIndex - 1;
    const previousTempo = data.tempos[previousTempoIndex];

    data.tempos[previousTempoIndex] = currentTempo;
    data.tempos[currentIndex] = previousTempo;

    storage.save(data);
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
    const currentIndex = data.tempos.findIndex((x) => x.name === currentName);
    const nextTempoIndex = currentIndex === 0 ? 1 : currentIndex - 1;
    const nextTempo = data.tempos[nextTempoIndex];

    selectTempo(nextTempo.name);

    data.tempos = data.tempos.filter((x) => x.name !== currentName);

    storage.save(data);
  }

  function saveNewTempo() {
    if (newTempoName.trim() === "") {
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

    const newTempo = new Tempo(newTempoName.trim(), newTempoGoalBpm, data.tempos.length + 1);

    const currentIndex = data.tempos.findIndex((x) => x.name === currentTempo.name);
    const beforeNewTempo = data.tempos.slice(0, currentIndex + 1);
    const afterNewTempo = data.tempos.slice(currentIndex + 1);
    data.tempos = [...beforeNewTempo, newTempo, ...afterNewTempo];

    selectTempo(newTempo.name);

    storage.save(data);

    hideNewTempoForm();
  }

  function hideNewTempoForm() {
    editingNewTempo = false;
    newTempoName = "";
    newTempoGoalBpm = null;
  }
</script>

<main>
  <div class="container">
    <div class="changed-tempo-alert" class:visible={$bpm !== currentTempo.bpm}>
      <div class="changed-tempo-alert-text">
        {$bpm > currentTempo.bpm ? "+" : "-"}{Math.abs($bpm - currentTempo.bpm)} bpm
      </div>
      <button type="button" on:click={saveCurrent}>Save</button>
      <button type="button" on:click={undoCurrentChange}>Undo</button>
    </div>

    <ProgressBar />

    <div class="tempo-wrap">
      <div class="tempo-actions tempo-actions-left">
        <button
          type="button"
          on:click={() => decrementTempo(1)}
          disabled={$bpm === 30}
          class="tempo-action-button tempo-action-top fas fa-minus"
          aria-label="Decrease tempo by 1"
        />
        <button
          type="button"
          on:click={() => decrementTempo(5)}
          disabled={$bpm === 30}
          class="tempo-action-button tempo-action-text"
          aria-label="Decrease tempo by 5">- 5</button
        >
      </div>

      <input
        type="number"
        bind:value={$bpm}
        on:change={() => currentChanged()}
        class="bpm-input"
        class:changed-up={$bpm > currentTempo.bpm}
        class:changed-down={$bpm < currentTempo.bpm}
        min="30"
        max="300"
        aria-label="Tempo (bpm)"
      />

      <div class="tempo-actions tempo-actions-right">
        <button
          type="button"
          on:click={() => incrementTempo(1)}
          disabled={$bpm === 300}
          class="tempo-action-button tempo-action-top fas fa-plus"
          aria-label="Increase tempo by 1"
        />
        <button
          type="button"
          on:click={() => incrementTempo(5)}
          disabled={$bpm === 300}
          class="tempo-action-button tempo-action-text"
          aria-label="Increase tempo by 5">+ 5</button
        >
      </div>
    </div>

    <div class="start-stop-button-wrap">
      <button
        on:click={async () => {
          await toggleStartStop();
        }}
        class:running={isRunning}>{isRunning ? "Stop" : "Start"}</button
      >
    </div>

    <div class="tempos" class:multiple={data.tempos.length > 1}>
      {#each data.tempos as tempo}
        <div class="tempo" class:selected={tempo.name === currentTempo.name}>
          <button
            type="button"
            on:click={moveCurrentDown}
            class="down-button fas fa-long-arrow-alt-down"
            title="Move down"
            aria-label="Move down"
          />
          <div class="tempo-name">
            <button type="button" on:click={() => selectTempo(tempo.name)} class:achieved={tempo.bpm >= tempo.goalBpm}
              >{tempo.name}</button
            >
          </div>
          <button
            type="button"
            on:click={moveCurrentUp}
            class="up-button fas fa-long-arrow-alt-up"
            title="Move up"
            aria-label="Move up"
          />
        </div>
      {/each}
    </div>

    <div class="tempos-actions">
      {#if data.tempos.length > 1}
        <button
          on:click={removeCurrent}
          disabled={editingNewTempo}
          class="fas fa-minus"
          title="Remove tempo"
          aria-label="Remove tempo"
        />
      {/if}

      <button
        on:click={addNewTempo}
        disabled={editingNewTempo}
        class="fas fa-plus"
        title="Add tempo"
        aria-label="Add tempo"
      />
    </div>

    <form
      class="new-tempo-form"
      bind:this={newTempoForm}
      on:submit|preventDefault={saveNewTempo}
      class:visible={editingNewTempo}
    >
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
        <button on:click={hideNewTempoForm}>Cancel</button>
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
  input[type="number"] {
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
    .container {
      max-width: 450px;
    }

    .tempos {
      max-height: 350px;
    }
  }
</style>
