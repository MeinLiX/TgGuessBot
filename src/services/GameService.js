const LobbyService = require('./LobbyService');
const UserService = require('./UserService');
const GameUtils = require('../utils/gameUtils');
const logger = require('../utils/logger');
const { USER_STATES, GAME_MODES, MESSAGES } = require('../constants');

class GameService {
  constructor() {
    this.lobbyService = new LobbyService();
    this.userService = new UserService();
  }

  /**
   * Create practice game
   */
  createPracticeGame(userId) {
    try {
      const user = this.userService.getUser(userId);
      if (!user || !user.isAvailable()) {
        return { success: false, message: 'User not available for game' };
      }

      const lobbyResult = this.lobbyService.createLobby({
        password: GameUtils.getRandomInt(1, 999999),
        gameMode: GAME_MODES.PRACTICE,
      });

      if (!lobbyResult.success) {
        return lobbyResult; 
      }

      const lobby = lobbyResult.lobby; 
      const joinResult = this.lobbyService.addPlayerToLobby({
        lobbyId: lobby.id,
        userId: userId,
        password: lobby.settings.password
      });
      
      if (!joinResult.success) {
        this.lobbyService.destroyLobby(lobby.id);
        return joinResult;
      }

      this.userService.setUserLobby(userId, lobby.id, lobby.settings.password);
      this.userService.updateUserState(userId, USER_STATES.PRACTICE_MODE);

      logger.info(`Practice game created for user ${userId}`);
      
      return {
        success: true,
        lobby,
        message: MESSAGES.TRY_GUESS
      };
    } catch (error) {
      logger.error('Error creating practice game:', error);
      return { success: false, message: 'Failed to create practice game' };
    }
  }

  /**
   * Create online lobby
   */
  createOnlineLobby(userId, password = 0) {
    try {
      const user = this.userService.getUser(userId);
      if (!user || !user.isAvailable()) {
        return { success: false, message: 'User not available for game' };
      }

      const lobbyResult = this.lobbyService.createLobby({
        password,
        gameMode: GAME_MODES.ONLINE,
        creatorId: userId,
      });
      
      if (!lobbyResult.success) {
        return lobbyResult; 
      }

      const lobby = lobbyResult.lobby;

      this.userService.setUserLobby(userId, lobby.id, password);
      this.userService.updateUserState(userId, USER_STATES.WAITING_FOR_PLAYER);

      logger.info(`Online lobby created by user ${userId}`);
      
      return {
        success: true,
        lobby,
        message: 'Lobby created! Share the invite link with your friend.'
      };
    } catch (error) {
      logger.error('Error creating online lobby:', error);
      return { success: false, message: 'Failed to create lobby' };
    }
  }

  /**
   * Join lobby by ID
   */
  joinLobby(userId, lobbyId, password = 0) {
    try {
      const user = this.userService.getOrCreateUser(userId, 'Guest');
      if (!user || !user.isAvailable()) {
        return { success: false, message: 'User not available for game' };
      }

      const joinResult = this.lobbyService.addPlayerToLobby({
        lobbyId: lobbyId,
        userId: userId,
        password: password
      });
      
      if (!joinResult.success) {
        return joinResult;
      }

      this.userService.setUserLobby(userId, lobbyId, password);
      this.userService.updateUserState(userId, USER_STATES.SETTING_SECRET_NUMBER);

      const lobby = joinResult.lobby;
      
      if (lobby.isFull()) {
        for (const player of lobby.players) {
          if (player.id !== 0) {
            this.userService.updateUserState(player.id, USER_STATES.SETTING_SECRET_NUMBER);
          }
        }
      }

      logger.info(`User ${userId} joined lobby ${lobbyId}`);
      
      return {
        success: true,
        lobby,
        message: MESSAGES.SET_SECRET_NUMBER
      };
    } catch (error) {
      logger.error('Error joining lobby:', error);
      return { success: false, message: 'Failed to join lobby' };
    }
  }

  /**
   * Set secret number for player
   */
  setSecretNumber(userId, secretNumber) {
  try {
    const user = this.userService.getUser(userId);
    if (!user || !user.isInLobby()) {
      return { success: false, message: 'User not in lobby' };
    }

    const lobby = this.lobbyService.getLobby(user.lobbyId);
    if (!lobby) {
      return { success: false, message: 'Lobby not found' };
    }

    const result = lobby.setPlayerSecretNumber(userId, secretNumber);
    
    if (result.success) {
      if (lobby.allPlayersReady() && lobby.isFull()) {
        if (!lobby.gameStarted) {
          lobby.startGame();
        }
        
        for (const player of lobby.players) {
          if (player.id !== 0) {
            this.userService.updateUserState(player.id, 
              lobby.settings.isComputer ? USER_STATES.PRACTICE_MODE : USER_STATES.ONLINE_GAME
            );
          }
        }
        
        return {
          success: true,
          message: result.message,
          gameReady: true
        };
      }
    }

    return result;
  } catch (error) {
    logger.error('Error setting secret number:', error);
    return { success: false, message: 'Failed to set secret number' };
  }
}

  /**
   * Process player guess
   */
  processGuess(userId, guess) {
  try {
    const user = this.userService.getUser(userId);
    if (!user || !user.isInLobby()) {
      return { success: false, message: 'User not in game' };
    }

    const lobby = this.lobbyService.getLobby(user.lobbyId);
    if (!lobby) {
      return { success: false, message: 'Game not found' };
    }

    if (!lobby.gameStarted) {
      return { success: false, message: 'Game not started yet' };
    }

    const result = lobby.processGuess(userId, guess);

    logger.info(`Guess processed for user ${userId}: ${guess}, result: ${JSON.stringify(result)}`);

    return result;
  } catch (error) {
    logger.error('Error processing guess:', error);
    return { success: false, message: 'Failed to process guess' };
  }
}

  /**
   * Surrender game
   */
  surrenderGame(userId) {
    try {
      const user = this.userService.getUser(userId);
      if (!user || !user.isInLobby()) {
        return { success: false, message: 'User not in game' };
      }

      const lobby = this.lobbyService.getLobby(user.lobbyId);
      if (!lobby) {
        return { success: false, message: 'Game not found' };
      }
      
      const opponent = lobby.getOpponent(userId);
      const secretNumber = opponent ? opponent.secretNumber : '';

      lobby.gameEnded = true;
      lobby.winnerId = opponent ? opponent.id : null;
      lobby.endGameMessage = `You surrendered. \nSecret number enemy: ${secretNumber}`;

      return {
        success: true,
        message: MESSAGES.SURRENDER(secretNumber),
        lobby: lobby,
      };
    } catch (error) {
      logger.error('Error surrendering game:', error);
      return { success: false, message: 'Failed to surrender' };
    }
  }

  /**
   * Get cheat (secret number) for practice mode
   */
  getCheat(userId) {
    try {
      const user = this.userService.getUser(userId);
      if (!user || user.state !== USER_STATES.PRACTICE_MODE) {
        return { success: false, message: 'Cheat only available in practice mode' };
      }

      const lobby = this.lobbyService.getLobby(user.lobbyId);
      if (!lobby || !lobby.settings.isComputer) {
        return { success: false, message: 'Not in practice mode' };
      }

      const computerPlayer = lobby.players.find(p => p.id === 0);
      const secretNumber = computerPlayer ? computerPlayer.secretNumber : '';

      return {
        success: true,
        message: MESSAGES.CHEAT_RESPONSE(secretNumber)
      };
    } catch (error) {
      logger.error('Error getting cheat:', error);
      return { success: false, message: 'Failed to get cheat' };
    }
  }

  /**
   * End game and cleanup
   */
  endGame(lobbyId) {
    try {
      const lobby = this.lobbyService.getLobby(lobbyId);
      if (!lobby) return;

      for (const player of lobby.players) {
        if (player.id !== 0) { 
          this.userService.removeUserFromLobby(player.id);
        }
      }

      this.lobbyService.destroyLobby(lobbyId);
      
      logger.info(`Game ended and lobby ${lobbyId} destroyed`);
    } catch (error) {
      logger.error('Error ending game:', error);
    }
  }

  /**
   * Get game statistics
   */
  getStatistics() {
    return {
      totalUsers: this.userService.getUsersCount(),
      activeLobbies: this.lobbyService.getLobbiesCount(),
      publicLobbies: this.lobbyService.getPublicLobbies().length,
    };
  }

  /**
   * Cleanup old games
   */
  cleanupOldGames() {
    return this.lobbyService.cleanupOldLobbies();
  }

  leaveLobby(userId) {
    try {
      const user = this.userService.getUser(userId);
      if (!user || !user.isInLobby()) {
        return { success: false, message: 'Ви не в лобі.' };
      }

      const lobbyId = user.lobbyId;
      const lobby = this.lobbyService.getLobby(lobbyId);
      let opponentId = null;

      if (lobby) {
        const opponent = lobby.getOpponent(userId);
        if (opponent && opponent.id !== 0) {
          opponentId = opponent.id;
        }
        this.endGame(lobbyId);
      } else {
        this.userService.removeUserFromLobby(userId);
      }

      logger.info(`User ${userId} left lobby ${lobbyId}`);
      
      return {
        success: true,
        message: 'Ви покинули лобі.',
        opponentId: opponentId,
      };
    } catch (error) {
      logger.error('Error leaving lobby:', error);
      return { success: false, message: 'Не вдалося покинути лобі.' };
    }
  }

}

module.exports = GameService;