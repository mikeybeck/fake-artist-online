<template>
	<ul class="player-list-votes">
		<li v-for="u in users" :key="'0' + u.name">
			<span :style="{ color: color(u) }">{{ u.votes }} : {{ u.name }}</span>
		</li>
	</ul>
</template>

<script>
import Store from './state';
import { UserIcon, WifiOffIcon } from 'vue-feather-icons';
export default {
	name: 'PlayerListVotes',
	props: {
		users: {
			type: Array,
		},
	},
	methods: {
		color(user) {
			return Store.state.gameState.getUserColor(user.name);
		},
	},
};
</script>
