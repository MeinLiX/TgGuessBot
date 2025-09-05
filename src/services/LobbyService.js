const Lobby = require('../models/Lobby');
const GameUtils = require('../utils/gameUtils');
const logger = require('../utils/logger');
const { GAME_MODES, LOBBY_TYPES } = require('../constants');

class LobbyService {
  constructor() {
    this.lobbies = new Map();
    this.userToLobbyMap = new Map();
    this.cleanupInterval = null;
    this.setupAutomaticCleanup();
  }

  /**
   * Create new lobby with enhanced validation and options
   * @param {Object} options - Lobby creation options
   * @param {number} options.password - Lobby password (0 for public)
   * @param {string} options.gameMode - Game mode (practice/online)
   * @param {number} options.creatorId - ID of lobby creator
   * @param {number} options.maxPlayers - Maximum players allowed
   * @param {Object} options.gameSettings - Additional game settings
   * @returns {Object} Result object with success status and lobby/error info
   */
  createLobby({
    password = 0,
    gameMode = GAME_MODES.ONLINE,
    creatorId = null,
    maxPlayers = 2,
    gameSettings = {}
  } = {}) {
    try {
      if (creatorId && gameMode !== GAME_MODES.PRACTICE && this.isUserInLobby(creatorId)) {
        return {
          success: false,
          error: 'USER_ALREADY_IN_LOBBY',
          message: 'You are already in a lobby'
        };
      }

      const lobby = new Lobby(password, gameMode);
      lobby.maxPlayers = maxPlayers;
      lobby.creatorId = creatorId;
      lobby.gameSettings = { ...lobby.gameSettings, ...gameSettings };

      this.lobbies.set(lobby.id, lobby);
      
      if (gameMode !== GAME_MODES.PRACTICE && creatorId) {
        const joinResult = this.addPlayerToLobby({
          lobbyId: lobby.id,
          userId: creatorId,
          password: password
        });

        if (!joinResult.success) {
          this.destroyLobby(lobby.id);
          return joinResult;
        }
      }

      logger.info(`Lobby created: ${lobby.id}, mode: ${gameMode}, creator: ${creatorId}`);
      
      return {
        success: true,
        lobby,
        message: 'Lobby created successfully'
      };
    } catch (error) {
      logger.error('Error creating lobby:', error);
      return {
        success: false,
        error: 'CREATION_FAILED',
        message: 'Failed to create lobby'
      };
    }
  }

  /**
   * Get lobby by ID with existence validation
   * @param {string} lobbyId - Lobby ID
   * @returns {Lobby|null} Lobby object or null if not found
   */
  getLobby(lobbyId) {
    if (!lobbyId || typeof lobbyId !== 'string') {
      return null;
    }
    return this.lobbies.get(lobbyId) || null;
  }

  /**
   * Add player to lobby with comprehensive validation
   * @param {Object} options - Join options
   * @param {string} options.lobbyId - Lobby ID to join
   * @param {number} options.userId - User ID joining
   * @param {number} options.password - Lobby password
   * @returns {Object} Result object with success status and info
   */
  addPlayerToLobby({ lobbyId, userId, password = 0 }) {
    try {
      if (!lobbyId || !userId) {
        return {
          success: false,
          error: 'INVALID_PARAMETERS',
          message: 'Invalid lobby ID or user ID'
        };
      }

      if (this.isUserInLobby(userId)) {
        const currentLobby = this.getUserLobby(userId);
        if (currentLobby?.id === lobbyId) {
          return {
            success: false,
            error: 'ALREADY_IN_LOBBY',
            message: 'You are already in this lobby'
          };
        }
        return {
          success: false,
          error: 'USER_IN_DIFFERENT_LOBBY',
          message: 'You are already in another lobby'
        };
      }

      const lobby = this.getLobby(lobbyId);
      if (!lobby) {
        return {
          success: false,
          error: 'LOBBY_NOT_FOUND',
          message: 'Lobby does not exist'
        };
      }

      const joinValidation = this.validateJoinConditions(lobby, userId, password);
      if (!joinValidation.canJoin) {
        return {
          success: false,
          error: joinValidation.error,
          message: joinValidation.message
        };
      }

      const addResult = lobby.addPlayer(userId, password);
      if (!addResult) {
        return {
          success: false,
          error: 'JOIN_FAILED',
          message: 'Failed to join lobby'
        };
      }

      this.userToLobbyMap.set(userId, lobbyId);

      logger.info(`Player ${userId} joined lobby ${lobbyId}`);
      
      return {
        success: true,
        lobby,
        message: 'Successfully joined lobby',
        isLobbyFull: lobby.isFull()
      };
    } catch (error) {
      logger.error('Error adding player to lobby:', error);
      return {
        success: false,
        error: 'JOIN_ERROR',
        message: 'Failed to join lobby'
      };
    }
  }

  /**
   * Validate conditions for joining a lobby
   * @param {Lobby} lobby - Lobby to join
   * @param {number} userId - User attempting to join
   * @param {number} password - Provided password
   * @returns {Object} Validation result
   */
  validateJoinConditions(lobby, userId, password) {
    if (lobby.settings.password !== password) {
      return {
        canJoin: false,
        error: 'INVALID_PASSWORD',
        message: 'Invalid lobby password'
      };
    }

    if (lobby.isFull()) {
      return {
        canJoin: false,
        error: 'LOBBY_FULL',
        message: 'Lobby is full'
      };
    }

    if (lobby.players.some(p => p.id === userId)) {
      return {
        canJoin: false,
        error: 'ALREADY_IN_LOBBY',
        message: 'Already in this lobby'
      };
    }

    if (lobby.isMarkedForDeletion) {
      return {
        canJoin: false,
        error: 'LOBBY_CLOSING',
        message: 'Lobby is closing'
      };
    }

    return { canJoin: true };
  }

  /**
   * Remove player from lobby with cleanup
   * @param {string} lobbyId - Lobby ID
   * @param {number} userId - User ID to remove
   * @returns {Object} Result object
   */
  removePlayerFromLobby(lobbyId, userId) {
    try {
      const lobby = this.getLobby(lobbyId);
      if (!lobby) {
        return {
          success: false,
          error: 'LOBBY_NOT_FOUND',
          message: 'Lobby not found'
        };
      }

      const initialPlayerCount = lobby.players.length;
      lobby.players = lobby.players.filter(p => p.id !== userId);
      
      const playerRemoved = lobby.players.length < initialPlayerCount;
      
      if (playerRemoved) {
        this.userToLobbyMap.delete(userId);
        
        logger.info(`Player ${userId} left lobby ${lobbyId}`);
        
        this.handleLobbyAfterPlayerLeave(lobby, userId);
      }
      
      return {
        success: playerRemoved,
        message: playerRemoved ? 'Player removed successfully' : 'Player not found in lobby',
        remainingPlayers: lobby.players.length
      };
    } catch (error) {
      logger.error('Error removing player from lobby:', error);
      return {
        success: false,
        error: 'REMOVAL_ERROR',
        message: 'Failed to remove player'
      };
    }
  }

  /**
   * Handle lobby state after a player leaves
   * @param {Lobby} lobby - The lobby
   * @param {number} leftUserId - ID of user who left
   */
  handleLobbyAfterPlayerLeave(lobby, leftUserId) {
    if (lobby.players.length === 0) {
      this.destroyLobby(lobby.id);
      return;
    }

    if (lobby.creatorId === leftUserId && lobby.players.length > 0) {
      const newCreator = lobby.players.find(p => p.id !== 0);
      if (newCreator) {
        lobby.creatorId = newCreator.id;
        logger.info(`Lobby ${lobby.id} creator changed to ${newCreator.id}`);
      }
    }

    if (lobby.settings.isComputer && lobby.players.length === 1 && lobby.players[0].id === 0) {
      this.destroyLobby(lobby.id);
    }
  }

  /**
   * Destroy lobby and cleanup all references
   * @param {string} lobbyId - Lobby ID to destroy
   * @returns {boolean} Success status
   */
  destroyLobby(lobbyId) {
    try {
      const lobby = this.lobbies.get(lobbyId);
      if (!lobby) {
        return false;
      }

      for (const player of lobby.players) {
        if (player.id !== 0) {
          this.userToLobbyMap.delete(player.id);
        }
      }

      this.lobbies.delete(lobbyId);
      
      logger.info(`Lobby destroyed: ${lobbyId}`);
      return true;
    } catch (error) {
      logger.error('Error destroying lobby:', error);
      return false;
    }
  }

  /**
   * Check if user is currently in any lobby
   * @param {number} userId - User ID to check
   * @returns {boolean} True if user is in a lobby
   */
  isUserInLobby(userId) {
    return this.userToLobbyMap.has(userId);
  }

  /**
   * Get lobby that user is currently in
   * @param {number} userId - User ID
   * @returns {Lobby|null} User's current lobby or null
   */
  getUserLobby(userId) {
    const lobbyId = this.userToLobbyMap.get(userId);
    return lobbyId ? this.getLobby(lobbyId) : null;
  }

  /**
   * Get all lobbies with optional filtering
   * @param {Object} filters - Filter options
   * @param {boolean} filters.publicOnly - Only public lobbies
   * @param {string} filters.gameMode - Specific game mode
   * @param {boolean} filters.availableOnly - Only lobbies with space
   * @returns {Array<Lobby>} Filtered lobbies array
   */
  getLobbies(filters = {}) {
    let lobbies = Array.from(this.lobbies.values());

    if (filters.publicOnly) {
      lobbies = lobbies.filter(lobby => !lobby.settings.isPrivate);
    }

    if (filters.gameMode) {
      lobbies = lobbies.filter(lobby => lobby.gameMode === filters.gameMode);
    }

    if (filters.availableOnly) {
      lobbies = lobbies.filter(lobby => !lobby.isFull());
    }

    return lobbies;
  }

  /**
   * Get public lobbies that are available to join
   * @returns {Array<Lobby>} Available public lobbies
   */
  getAvailablePublicLobbies() {
    return this.getLobbies({
      publicOnly: true,
      availableOnly: true
    }).filter(lobby => !lobby.settings.isComputer);
  }

  /**
   * Find best available lobby for quick join
   * @param {number} userId - User looking for lobby
   * @returns {Lobby|null} Best available lobby or null
   */
  findBestAvailableLobby(userId) {
    const availableLobbies = this.getAvailablePublicLobbies();
    
    if (availableLobbies.length === 0) {
      return null;
    }

    const lobbiesWithPlayers = availableLobbies.filter(lobby => lobby.players.length > 0);
    if (lobbiesWithPlayers.length > 0) {
      return lobbiesWithPlayers[0];
    }

    return availableLobbies[0];
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStatistics() {
    const allLobbies = Array.from(this.lobbies.values());
    const publicLobbies = allLobbies.filter(lobby => !lobby.settings.isPrivate);
    const activeGames = allLobbies.filter(lobby => lobby.isFull());
    const practiceGames = allLobbies.filter(lobby => lobby.settings.isComputer);

    return {
      totalLobbies: this.lobbies.size,
      publicLobbies: publicLobbies.length,
      privateLobbies: allLobbies.length - publicLobbies.length,
      activeGames: activeGames.length,
      practiceGames: practiceGames.length,
      waitingLobbies: allLobbies.length - activeGames.length,
      totalActivePlayers: this.userToLobbyMap.size,
      averagePlayersPerLobby: allLobbies.length > 0 ? 
        allLobbies.reduce((sum, lobby) => sum + lobby.players.filter(p => p.id !== 0).length, 0) / allLobbies.length : 0
    };
  }

  /**
   * Clean up old and empty lobbies
   * @param {number} maxAgeMinutes - Maximum age for empty lobbies
   * @param {number} maxIdleMinutes - Maximum idle time for lobbies with players
   * @returns {Object} Cleanup results
   */
  cleanupOldLobbies(maxAgeMinutes = 60, maxIdleMinutes = 120) {
    const now = new Date();
    const emptyCutoffTime = new Date(now.getTime() - maxAgeMinutes * 60 * 1000);
    const idleCutoffTime = new Date(now.getTime() - maxIdleMinutes * 60 * 1000);
    
    let cleanedEmpty = 0;
    let cleanedIdle = 0;
    let cleanedOrphaned = 0;

    for (const [lobbyId, lobby] of this.lobbies) {
      let shouldCleanup = false;
      let reason = '';

      if (lobby.players.length === 0 && lobby.createdAt < emptyCutoffTime) {
        shouldCleanup = true;
        reason = 'empty';
        cleanedEmpty++;
      }
      else if (lobby.lastActivity && lobby.lastActivity < idleCutoffTime) {
        shouldCleanup = true;
        reason = 'idle';
        cleanedIdle++;
      }
      else if (lobby.players.length === 1 && lobby.players[0].id === 0) {
        shouldCleanup = true;
        reason = 'orphaned';
        cleanedOrphaned++;
      }

      if (shouldCleanup) {
        this.destroyLobby(lobbyId);
        logger.debug(`Cleaned up ${reason} lobby: ${lobbyId}`);
      }
    }

    const totalCleaned = cleanedEmpty + cleanedIdle + cleanedOrphaned;
    
    if (totalCleaned > 0) {
      logger.info(`Cleanup completed: ${totalCleaned} lobbies removed (${cleanedEmpty} empty, ${cleanedIdle} idle, ${cleanedOrphaned} orphaned)`);
    }

    return {
      totalCleaned,
      cleanedEmpty,
      cleanedIdle,
      cleanedOrphaned
    };
  }

  /**
   * Setup automatic cleanup job
   * @param {number} intervalMinutes - Cleanup interval in minutes
   */
  setupAutomaticCleanup(intervalMinutes = 30) {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      try {
        this.cleanupOldLobbies();
        this.cleanupOrphanedUserMappings();
      } catch (error) {
        logger.error('Error in automatic cleanup:', error);
      }
    }, intervalMinutes * 60 * 1000);

    logger.info(`Automatic cleanup scheduled every ${intervalMinutes} minutes`);
  }

  /**
   * Clean up orphaned user-to-lobby mappings
   */
  cleanupOrphanedUserMappings() {
    let cleanedMappings = 0;
    
    for (const [userId, lobbyId] of this.userToLobbyMap) {
      const lobby = this.getLobby(lobbyId);
      if (!lobby || !lobby.players.some(p => p.id === userId)) {
        this.userToLobbyMap.delete(userId);
        cleanedMappings++;
      }
    }

    if (cleanedMappings > 0) {
      logger.debug(`Cleaned up ${cleanedMappings} orphaned user mappings`);
    }
  }

  /**
   * Gracefully shutdown the service
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.cleanupOldLobbies(0, 0);
    
    logger.info('LobbyService shutdown completed');
  }

  /**
   * Reset service (for testing or maintenance)
   */
  reset() {
    this.lobbies.clear();
    this.userToLobbyMap.clear();
    logger.info('LobbyService reset completed');
  }

  /**
   * Export service state (for backup/debugging)
   * @returns {Object} Service state
   */
  exportState() {
    return {
      lobbies: Array.from(this.lobbies.entries()).map(([id, lobby]) => ({
        id,
        ...lobby.getInfo(),
        players: lobby.players.map(p => ({ id: p.id, hasSecret: p.hasSecretNumber() }))
      })),
      userMappings: Array.from(this.userToLobbyMap.entries()),
      statistics: this.getStatistics(),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = LobbyService;