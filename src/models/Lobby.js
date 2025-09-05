const { v4: uuidv4 } = require('uuid');
const GameUtils = require('../utils/gameUtils');
const config = require('../config');
const { GAME_MODES, LOBBY_TYPES } = require('../constants');

class Player {
  constructor(userId) {
    this.id = userId;
    this.secretNumber = '';
    this.currentGuess = '';
    this.isMyTurn = false;
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

  setTurn(isMyTurn) {
    this.isMyTurn = isMyTurn;
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
    this.gameStarted = false;
    this.currentPlayerIndex = 0;

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
   * Start the game and set initial turn order
   */
  startGame() {
    if (!this.allPlayersReady() || this.gameStarted) {
      return false;
    }

    this.gameStarted = true;
    
    if (!this.settings.isComputer) {
      const humanPlayers = this.players.filter(p => p.id !== 0);
      if (humanPlayers.length >= 2) {
        humanPlayers[0].setTurn(true);
        humanPlayers[1].setTurn(false);
        this.currentPlayerIndex = 0;
      }
    } else {
      const humanPlayer = this.players.find(p => p.id !== 0);
      if (humanPlayer) {
        humanPlayer.setTurn(true);
      }
    }

    return true;
  }

  /**
   * Switch turn to next player
   */
  switchTurn() {
    if (this.settings.isComputer) {
      return;
    }

    const humanPlayers = this.players.filter(p => p.id !== 0);
    if (humanPlayers.length < 2) return;

    humanPlayers.forEach(p => p.setTurn(false));
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % humanPlayers.length;
    humanPlayers[this.currentPlayerIndex].setTurn(true);
  }

  /**
   * Check if it's player's turn
   */
  isPlayerTurn(userId) {
    if (this.settings.isComputer) {
      return true;
    }

    const player = this.getPlayer(userId);
    return player ? player.isMyTurn : false;
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
    
    if (this.allPlayersReady() && this.isFull() && !this.gameStarted) {
      this.startGame();
    }
    
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

    if (!this.gameStarted) {
      return {
        success: false,
        message: "Game not started yet!",
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
    
    if (!player || !computerPlayer) {
      return {
        success: false,
        message: "Game error!",
        opponent: "",
      };
    }
    
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

    if (!this.isPlayerTurn(userId)) {
      return {
        success: false,
        message: "Wait, it's not your turn!",
        opponent: "",
      };
    }

    const player = this.getPlayer(userId);
    const opponent = this.getOpponent(userId);

    if (!player || !opponent) {
      return {
        success: false,
        message: "Game error!",
        opponent: "",
      };
    }

    player.setCurrentGuess(guess);
    const audit = GameUtils.auditNumber(guess, opponent.secretNumber);
    const resultMessage = GameUtils.formatGameResult(guess, audit);

    if (GameUtils.isWinningGuess(audit)) {
      return {
        success: true,
        message: resultMessage + "Very good, you won!",
        opponent: "Your opponent guessed the number!",
        gameEnded: true,
      };
    } else {
      this.switchTurn();
      
      return {
        success: true,
        message: resultMessage + "Try again!",
        opponent: "The time has come!\nGuess the number.",
        gameEnded: false,
      };
    }
  }

  /**
   * Get current player turn info
   */
  getCurrentTurnInfo() {
    if (this.settings.isComputer) {
      const humanPlayer = this.players.find(p => p.id !== 0);
      return {
        currentPlayerId: humanPlayer ? humanPlayer.id : null,
        isGameStarted: this.gameStarted
      };
    }

    const humanPlayers = this.players.filter(p => p.id !== 0);
    const currentPlayer = humanPlayers.find(p => p.isMyTurn);
    
    return {
      currentPlayerId: currentPlayer ? currentPlayer.id : null,
      isGameStarted: this.gameStarted,
      currentPlayerIndex: this.currentPlayerIndex
    };
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
      gameStarted: this.gameStarted,
      currentTurn: this.getCurrentTurnInfo()
    };
  }
}

module.exports = Lobby;