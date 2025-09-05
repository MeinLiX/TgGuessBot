const USER_STATES = {
  DEFAULT: 0,
  CHANGING_NAME: 401,
  WAITING_FOR_PLAYER: 604,
  SETTING_SECRET_NUMBER: 605,
  PRACTICE_MODE: 505,
  ONLINE_GAME: 606,
};

const GAME_MODES = {
  PRACTICE: 'practice',
  ONLINE: 'online',
};

const LOBBY_TYPES = {
  PUBLIC: 'public',
  PRIVATE: 'private',
};

const MESSAGES = {
  WELCOME: (nickname) => `Welcome, ${nickname}.`,
  CHOOSE_BUTTON: (nickname) => `${nickname}, choose the button what you need..`,
  ERROR_START: "Error! Write /start",
  STOP_EDITING: "Stop editing message!",
  LOADING: "Loading.. 🔑🔑➖➖➖➖🔒",
  LOADING_COMPLETE: "Loading.. Complete... 🔓",
  COMPUTER_CALCULATING: "Computer Calculate..!",
  COMPUTER_PICKED: "Computer picked the number!",
  TRY_GUESS: "Try to guess the number!",
  INCORRECT_ENTRY: "Incorrect entry!\nTry again!",
  WAIT_ENEMY: "Wait, your enemy don't join to the lobby..",
  SECRET_NUMBER_SET: (num) => `If you would like to change your number, please send it to me again\nYour secret number: ${num}\n\nWait enemy...`,
  GAME_START: "Start game!\nGuess the enemy number!",
  ENEMY_MOVE: "Enemy move!",
  YOUR_MOVE: "The time has come!\nGuess the number.",
  WAIT_OPPONENT: "Wait..your opponent's move",
  GAME_RESULT: (num, same, samePos) => `Your num: ${num}\nSame: ${same}\nWith same position: ${samePos}\n\n`,
  WIN: "Very good, you won!",
  TRY_AGAIN: "Try again!",
  OPPONENT_WON: "Your opponent guessed the number!",
  SURRENDER: (secretNum) => `You surrendered. \nSecret number enemy: ${secretNum}`,
  NICKNAME_CHANGE: "Enter Your new nickname:",
  NICKNAME_CHANGED: (nickname) => `Now your nickname: ${nickname}!\nGood Luck!`,
  NOT_RELEASED: "Not release...",
  ARE_YOU_READY: "Are you ready?",
  HELP_REQUEST: 'If you have questions or suggestions, write them in this form:\n\n/help "Your question"',
  THANKS_FOR_CONTACT: (msg) => `Thank you for contacting!\n\nYour message looks like:\n${msg}`,
  ADMIN_RESPONSE: (msg, id) => `Given response:\n${msg}\nTo user (id): ${id}`,
  CHEAT_RESPONSE: (secretNum) => `Secret number: ${secretNum}`,
  LOBBY_FULL: "Lobby is full.",
  LOBBY_NOT_EXIST: "Lobby does not exist",
  ALREADY_IN_LOBBY: "You already in the lobby",
  INVITE_TO_GAME: "Want to play a game with me?",
  SET_SECRET_NUMBER: "Write your secret number. [1023-9876]",
};

const KEYBOARD_LABELS = {
  MENU: 'menu',
  JOIN_RANDOM: '❌Join to Random lobby❌',
  CREATE_LOBBY: '❌Create lobby❌',
  LIST_LOBBIES: '❌List lobby\'s❌',
  INVITE: 'Invite',
  START_PRACTICE: '✅Start Practice✅',
  START: 'Start',
  BACK: 'Back',
  GO_TO_MENU: 'Go to menu',
  JOIN_TO_GAME: 'Join to game',
  ACCEPT_INVITATION: 'Accept the invitation',
  LEAVE_LOBBY: 'Leave lobby',
};

const CALLBACK_DATA = {
  MENU: 'menu',
  JOIN_RANDOM_LOBBY: 'Join_to_random_lobby',
  CREATE_LOBBY: 'Create_lobby',
  LIST_LOBBIES: 'List_lobbys',
  INVITE_TO_LOBBY: 'Invite_to_lobby',
  TRY_START_PRACTICE: 'Try_start_practic',
  START_PRACTICE: 'Start_practic',
  LEAVE_LOBBY: 'Leave_lobby',
};

module.exports = {
  USER_STATES,
  GAME_MODES,
  LOBBY_TYPES,
  MESSAGES,
  KEYBOARD_LABELS,
  CALLBACK_DATA,
};