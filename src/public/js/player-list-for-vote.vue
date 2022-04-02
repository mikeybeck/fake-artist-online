<template>
	<select ref="selectRef" class="player-list-for-vote" :required="true" @change="changeVote">
		<option :selected="true">Select a player</option>
		<option v-for="option in users" v-bind:key="'0' + option.name" v-bind:value="option.name">{{
			option.name
		}}</option>
	</select>
</template>

<script>
import Store from './state';
export default {
	name: 'PlayerListForVote',
	props: {
		users: {
			type: Array,
		},
		votedUsername: {
			type: String,
		},
	},
	watch: {
		votedUsername: function(newVal, oldVal) {
			this.$refs.selectRef.value = newVal;
		},
	},
	methods: {
		changeVote(ev) {
			this.$emit('changeVote', ev.target.value);
		},
	},
};
</script>
