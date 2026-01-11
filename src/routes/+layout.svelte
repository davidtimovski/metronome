<script lang="ts">
	import './css/modern-normalize.css';
	import './css/global.css';

	import Footer from '../lib/components/Footer.svelte';
</script>

<div class="app">
	<main>
		<div></div>
		<div>
			<slot />

			<Footer />
		</div>
		<div></div>
	</main>
</div>
