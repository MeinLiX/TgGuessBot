const { v4: uuidv4 } = require('uuid');
const GameUtils = require('../utils/gameUtils');
const config = require('../config');
const { GAME_MODES, LOBBY_TYPES } = require('../constants');

class Player {
  constructor(userId) {
    this.id = userId;
    this.secretNumber = '';
    this.currentGuess = '';
  }

  setSecretNumber(number) {
    this.secretNumber = number;
  }

  setCurrentGuess(guess) {
    this.currentGuess = guess;
  }

  clearCurrentGuess() {
    this.currentGuess = '';
  }

  hasSecretNumber() {
    return this.secretNumber !== '';
  }
}

class Lobby {
  constructor(password = 0, gameMode = GAME_MODES.ONLINE) {
    this.id = uuidv4();
    this.gameMode = gameMode;
    this.settings = {
      isComputer: gameMode === GAME_MODES.PRACTICE,
      isPrivate: password !== 0,
      password: password,
      type: password === 0 ? LOBBY_TYPES.PUBLIC : LOBBY_TYPES.PRIVATE,
    };
    this.players = [];
    this.maxPlayers = config.game.maxLobbySize;
    this.createdAt = new Date();

    if (this.settings.isComputer) {
      this.addComputerPlayer();
    }
  }

  /**
   * Add computer player for practice mode
   */
  addComputerPlayer() {
    const computerPlayer = new Player(0);
    computerPlayer.setSecretNumber(GameUtils.generateSecretNumber());
    this.players.push(computerPlayer);
  }

  /**
   * Add user to lobby
   */
  addPlayer(userId, password = 0) {
    if (!this.canJoin(userId, password)) {
      return false;
    }

    const player = new Player(userId);
    this.players.push(player);
    return true;
  }

  /**
   * Check if user can join lobby
   */
  canJoin(userId, password = 0) {
    if (password !== this.settings.password) return false;
    if (this.players.some(p => p.id === userId)) return false;
    if (this.players.length >= this.maxPlayers) return false;
    return true;
  }

  /**
   * Check if lobby is full
   */
  isFull() {
    return this.players.length >= this.maxPlayers;
  }

  /**
   * Check if all players have set their secret numbers
   */
  allPlayersReady() {
    return this.players.every(p => p.hasSecretNumber());
  }

  /**
   * Get player by ID
   */
  getPlayer(userId) {
    return this.players.find(p => p.id === userId);
  }

  /**
   * Get opponent player
   */
  getOpponent(userId) {
    return this.players.find(p => p.id !== userId);
  }

  /**
   * Set secret number for player
   */
  setPlayerSecretNumber(userId, secretNumber) {
    if (!GameUtils.isValidSecretNumber(secretNumber)) {
      return {
        success: false,
        message: "Incorrect entry!\nTry again!",
      };
    }

    const player = this.getPlayer(userId);
    if (!player) {
      return {
        success: false,
        message: "Player not found!",
      };
    }

    player.setSecretNumber(secretNumber);
    
    return {
      success: true,
      message: `If you would like to change your number, please send it to me again\nYour secret number: ${secretNumber}\n\nWait enemy...`,
    };
  }

  /**
   * Process player's guess
   */
  processGuess(userId, guess) {
    if (!GameUtils.isValidSecretNumber(guess)) {
      return {
        success: false,
        message: "Incorrect entry!\nTry again!",
        opponent: "",
      };
    }

    if (this.settings.isComputer) {
      return this.processPracticeGuess(userId, guess);
    } else {
      return this.processOnlineGuess(userId, guess);
    }
  }

  /**
   * Process guess in practice mode
   */
  processPracticeGuess(userId, guess) {
    const player = this.getPlayer(userId);
    const computerPlayer = this.players[0];
    
    player.setCurrentGuess(guess);
    const audit = GameUtils.auditNumber(guess, computerPlayer.secretNumber);
    const resultMessage = GameUtils.formatGameResult(guess, audit);

    if (GameUtils.isWinningGuess(audit)) {
      return {
        success: true,
        message: resultMessage + "Very good, you won!",
        opponent: "",
        gameEnded: true,
      };
    } else {
      return {
        success: true,
        message: resultMessage + "Try again!",
        opponent: "",
        gameEnded: false,
      };
    }
  }

  /**
   * Process guess in online mode
   */
  processOnlineGuess(userId, guess) {
    if (!this.allPlayersReady()) {
      return {
        success: false,
        message: "Wait..your opponent's move",
        opponent: "",
      };
    }

    const player = this.getPlayer(userId);
    const opponent = this.getOpponent(userId);

    if (player.currentGuess !== '') {
      return {
        success: false,
        message: "Wait, enemy move!",
        opponent: "",
      };
    }

    player.setCurrentGuess(guess);
    const audit = GameUtils.auditNumber(guess, opponent.secretNumber);
    const resultMessage = GameUtils.formatGameResult(guess, audit);

    opponent.clearCurrentGuess();

    if (GameUtils.isWinningGuess(audit)) {
      return {
        success: true,
        message: resultMessage + "Very good, you won!",
        opponent: "Your opponent guessed the number!",
        gameEnded: true,
      };
    } else {
      return {
        success: true,
        message: resultMessage + "Try again!\nIf your opponent doesn't guess your number c:",
        opponent: "The time has come!\nGuess the number.",
        gameEnded: false,
      };
    }
  }

  /**
   * Get lobby info
   */
  getInfo() {
    return {
      id: this.id,
      playersCount: this.players.length,
      maxPlayers: this.maxPlayers,
      gameMode: this.gameMode,
      settings: this.settings,
      createdAt: this.createdAt,
    };
  }
}

module.exports = Lobby;