import GAME_PHASE from '../common/game-phase.js';
import MESSAGE from '../common/message.js';
import User from '../common/user.js';
import debugLog from './debug-log.js';
import GameError from './game-error.js';
import GamePrecond from './game-precond';
import { ClientAdapter } from './game-room.js';
import * as Lobby from './lobby.js';
import * as Schema from './schema.js';

function handleSockets(io) {
	io.on('connection', function(sock) {
		debugLog('Socket connected: ' + sock.id);
		Object.keys(MessageHandlers).forEach((messageName) => {
			sock.on(messageName, function(data) {
				try {
					Schema.validateMessageFromClient(messageName, data);
					MessageHandlers[messageName](io, sock, data);
				} catch (e) {
					// REMEMBER, any code/mutations inside the try before the error do still execute
					if (e.name === GameError.name) {
						sock.emit(messageName, {
							err: e.clientMessage,
						});
					} else {
						throw e;
					}
				}
			});
		});
	});
	return Lobby;
}

const MessageHandlers = {
	[MESSAGE.CREATE_ROOM](io, sock, data) {
		GamePrecond.sockDoesNotHaveUser(sock);
		GamePrecond.lobbyIsNotFull();

		let user = login(sock, data.username);
		let newRoom = Lobby.createRoom();

		joinRoom(user, newRoom, false, true);

		io.in(newRoom.roomCode).emit(MESSAGE.CREATE_ROOM, {
			username: user.name,
			roomState: ClientAdapter.generateStateJson(newRoom),
		});
	},

	[MESSAGE.JOIN_ROOM](io, sock, data) {
		let roomToJoin = Lobby.getRoomByCode(data.roomCode);

		GamePrecond.sockDoesNotHaveUser(sock);
		GamePrecond.roomExists(data.roomCode);

		let user;
		const userData = roomToJoin.findUser(data.username);
		const nameExistsInRoom = userData !== undefined;

		if (nameExistsInRoom && !userData.connected) {
			// rejoin
			GamePrecond.nameIsTakenInRoom(data.username, roomToJoin);
			GamePrecond.gameInProgress(roomToJoin);
			user = login(sock, data.username, roomToJoin);
			joinRoom(user, roomToJoin, true, false);
		} else {
			// join for first time
			GamePrecond.roomIsNotFull(roomToJoin);
			GamePrecond.nameIsNotTakenInRoom(data.username, roomToJoin);
			GamePrecond.gameNotInProgress(roomToJoin);
			user = login(sock, data.username);
			joinRoom(user, roomToJoin, false, false);
		}
		broadcastRoomState(io, roomToJoin, MESSAGE.JOIN_ROOM);
	},

	[MESSAGE.LEAVE_ROOM](io, sock, data) {
		GamePrecond.sockHasUser(sock);
		GamePrecond.userIsInARoom(sock.user);
		let user = sock.user;
		let room = user.gameRoom;
		logout(sock);

		sock.emit(MESSAGE.LEAVE_ROOM, {});
		// also, tell other players in room that this player has left
		broadcastRoomState(io, room, MESSAGE.USER_LEFT, (res) => {
			res.username = user.name;
			return res;
		});
	},

	[MESSAGE.START_GAME](io, sock, data) {
		GamePrecond.sockHasUser(sock);
		GamePrecond.userIsInARoom(sock.user);
		let rm = sock.user.gameRoom;
		rm.startNewRound();
		broadcastRoomState(io, rm, MESSAGE.START_GAME);
	},
	[MESSAGE.NEXT_ROUND](io, sock, data) {
		GamePrecond.sockHasUser(sock);
		GamePrecond.userIsInARoom(sock.user);
		let rm = sock.user.gameRoom;
		rm.startNewRound();
		broadcastRoomState(io, rm, MESSAGE.START_GAME);
	},

	[MESSAGE.SUBMIT_STROKE](io, sock, data) {
		GamePrecond.sockHasUser(sock);
		GamePrecond.userIsInARoom(sock.user);
		GamePrecond.gameInProgress(sock.user.gameRoom);
		GamePrecond.isUsersTurn(sock.user);
		let rm = sock.user.gameRoom;
		rm.addStroke(sock.user.name, data.points);
		rm.nextTurn();

		broadcastRoomState(io, rm, MESSAGE.NEW_TURN);
	},

	[MESSAGE.SUBMIT_VOTE](io, sock, data) {
		GamePrecond.sockHasUser(sock);
		GamePrecond.userIsInARoom(sock.user);
		GamePrecond.gameInProgress(sock.user.gameRoom);
		let rm = sock.user.gameRoom;
		rm.addVote(sock.user.name, data.username);
		const isEveryoneVoted = rm.isEveryoneVoted();

		console.log('Add Vote', sock.user.name, data.username);

		if (isEveryoneVoted) {
			console.log('Everyone voted');
			broadcastRoomState(io, rm, MESSAGE.EVERYONE_VOTED);
		}
	},

	[MESSAGE.RETURN_TO_SETUP](io, sock, data) {
		GamePrecond.sockHasUser(sock);
		GamePrecond.userIsInARoom(sock.user);
		let rm = sock.user.gameRoom;
		rm.invokeSetup();
		broadcastRoomState(io, rm, MESSAGE.RETURN_TO_SETUP);
	},

	disconnect(io, sock, data) {
		let user = sock.user;
		if (user) {
			let room = user.gameRoom;
			logout(sock);
			if (room) {
				console.log(`Rm${room.roomCode} Disconnect: ${user.logName}`);
				broadcastRoomState(io, room, MESSAGE.USER_LEFT, (res) => {
					res.username = user.name;
					return res;
				});
			}
		}
	},
};

function login(sock, username, roomToRejoin) {
	username = username.trim();
	let user;
	if (roomToRejoin) {
		debugLog(`Attempt reconnect: <${username}>`);
		user = roomToRejoin.findUser(username);
		user.socket = sock;
	} else {
		user = new User(sock, username);
	}
	sock.user = user;
	debugLog(`Login: ${user.logName}`);
	return user;
}
function logout(sock) {
	let user = sock.user;
	if (user) {
		sock.user = undefined;
		user.socket = undefined;

		let room = user.gameRoom;
		if (room) {
			sock.leave(room.roomCode);
			if (room.phase === GAME_PHASE.SETUP) {
				// if room has no game yet, remove the user from the room completely
				room.dropUser(user);
				debugLog(`Rm${room.roomCode} Left room: ${user.logName}`);
			} else {
				debugLog(`Logout ${user.logName}`);
			}
			if (room.isDead()) {
				console.log(`Rm${room.roomCode} Triggering delayed room teardown`);
				Lobby.triggerDelayedRoomTeardown(room);
			}
		}
	}
}

function joinRoom(user, room, rejoin, isHost = false) {
	if (rejoin) {
		room.readdUser(user);
		console.log(`Rm${room.roomCode} Rejoin: ${user.logName}`);
	} else {
		room.addUser(user, isHost);
		console.log(`Rm${room.roomCode} Join: ${user.logName}. Room users = ${room.users.length}`);
	}
	user.socket.join(room.roomCode);
	user.setGameRoom(room);
	return room;
}

// send roomstate update to all users, accounting for different roles (i.e., faker vs artist)
function broadcastRoomState(io, room, messageName, addtlProcessFn) {
	let state = ClientAdapter.generateStateJson(room);
	if (addtlProcessFn) {
		state = addtlProcessFn(state);
	}

	if (room.phase === GAME_PHASE.SETUP) {
		io.in(room.roomCode).emit(messageName, {
			roomState: state,
		});
		return;
	}

	let artistView = ClientAdapter.hideFaker(state);
	let fakerView = ClientAdapter.hideKeyword(state);

	for (let u of room.users) {
		let s = u.socket;
		if (u.socket === undefined) {
			// disconnected user, skip
			continue;
		}

		let res;
		if (
			room.phase === GAME_PHASE.PLAY ||
			room.phase === GAME_PHASE.VOTE ||
			room.phase === GAME_PHASE.END
		) {
			res = {
				roomState: room.faker && room.faker.name === u.name ? fakerView : artistView,
			};
		} else {
			res = {
				roomState: state,
			};
		}

		s.emit(messageName, res);
	}
}

export default handleSockets;
