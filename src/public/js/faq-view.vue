<template>
	<div id="faq" class="view">
		<div class="view-container">
			<div class="stripe">
				<div id="faq-content" class="stripe-content normal-text">
					<div class="align-left">
						<h2>About / FAQ</h2>
					</div>
					<div class="align-left">
						<div class="qa">
							<h3>
								I accidentally quit my browser. How do I rejoin an in-progress game?
							</h3>
							<p>Join the room again with your username exactly as it was.</p>
						</div>
						<div class="qa">
							<h3>Misc. about</h3>
							<p>FAO is not affiliated with Oink Games.</p>
							<p>
								Notification SFX from
								<a href="https://material.io/design/sound/sound-resources.html"></a>
								(<a href="https://creativecommons.org/licenses/by/4.0/">CC-BY 4.0</a
								>)
							</p>
							<p>
								This project is a fork of <a href="https://github.com/kcgidw/fao">FAO</a> and was a
                                one-time labour of love for the awesome peeps of Team Phoenix.
                                It's unlikely to receive any further updates.
							</p>
							<p>
								Also, this should go without saying, but please play with a modern
								browser!
							</p>
						</div>
					</div>
					<div class="align-right">
						<button class="btn secondary" @click="back()">OK</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import Store from './state';
import VIEW from './view';
export default {
	name: 'FaqView',
	methods: {
		back() {
			Store.setView(Store.state.previousView);
		},
	},
};
</script>
