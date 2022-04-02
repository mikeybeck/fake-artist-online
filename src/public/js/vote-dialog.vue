<template>
	<dialog-component id="vote-dialog">
		<div v-show="!isTurnEnd">
			<h2>Vote for the Fake Artist:</h2>
		</div>
		<div v-show="isTurnEnd">
			<h2>Results:</h2>
		</div>
		<div v-show="!isTurnEnd">
			<PlayerListForVote
				:users="usersWithoutAdmin"
				v-on:changeVote="setVotedUsername"
				:votedUsername="votedUsername"
			/>
		</div>
		<div v-show="isTurnEnd">
			<PlayerListVotes :users="usersWithoutAdmin" />
		</div>

		<template #actions>
			<div>
				<button
					v-show="!isTurnEnd"
					class="btn secondary"
					:disabled="!isValidUsername"
					@click="submit()"
				>
					Vote
				</button>
				<button v-show="isTurnEnd" class="btn secondary" @click="$emit('close')">
					Close
				</button>
			</div>
		</template>
	</dialog-component>
</template>

<script>
import Store from './state';
import VIEW from './view';
import DialogComponent from './dialog';
import PlayerListForVote from './player-list-for-vote';
import PlayerListVotes from './player-list-votes';
export default {
	name: 'VoteDialog',
	components: {
		DialogComponent,
		PlayerListForVote,
		PlayerListVotes,
	},
	props: {
		users: {
			type: Array,
		},
		usersWithoutAdmin: {
			type: Array,
		},
		isTurnEnd: {
			type: Boolean,
		},
	},
	data() {
		return {
			votedUsername: null,
		};
	},
	computed: {
		isValidUsername() {
			return Store.state.gameState.findUser(this.votedUsername);
		},
	},
	methods: {
		submit(username) {
			this.$emit('vote', this.votedUsername);
			this.votedUsername = 'Choose a player';
			this.$emit('close');
		},
		setVotedUsername(username) {
			this.votedUsername = username;
		},
	},
    mounted() {
        console.log('this.users');
        console.log(this.users);
        console.log('this.usersWithoutAdmin');
        console.log(this.usersWithoutAdmin);
    }
};
</script>
