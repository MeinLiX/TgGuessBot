const User = require('../models/User');
const logger = require('../utils/logger');

class UserService {
  constructor() {
    this.users = new Map();
  }

  /**
   * Get or create user
   */
  getOrCreateUser(userId, firstName = 'Guest') {
    if (!this.users.has(userId)) {
      const user = new User(userId, firstName);
      this.users.set(userId, user);
      logger.info(`New user created: ${userId} (${firstName})`);
    }
    return this.users.get(userId);
  }

  /**
   * Get user by ID
   */
  getUser(userId) {
    return this.users.get(userId);
  }

  /**
   * Update user nickname
   */
  updateUserNickname(userId, nickname) {
    const user = this.getUser(userId);
    if (user) {
      user.setNickname(nickname);
      logger.info(`User ${userId} changed nickname to: ${nickname}`);
      return true;
    }
    return false;
  }

  /**
   * Set user lobby
   */
  setUserLobby(userId, lobbyId, password = 0) {
    const user = this.getUser(userId);
    if (user) {
      user.setLobby(lobbyId, password);
      return true;
    }
    return false;
  }

  /**
   * Remove user from lobby
   */
  removeUserFromLobby(userId) {
    const user = this.getUser(userId);
    if (user) {
      user.leaveLobby();
      return true;
    }
    return false;
  }

  /**
   * Update user state
   */
  updateUserState(userId, state) {
    const user = this.getUser(userId);
    if (user) {
      user.setState(state);
      return true;
    }
    return false;
  }

  /**
   * Check if user exists
   */
  userExists(userId) {
    return this.users.has(userId);
  }

  /**
   * Get all users
   */
  getAllUsers() {
    return Array.from(this.users.values());
  }

  /**
   * Get users count
   */
  getUsersCount() {
    return this.users.size;
  }

  /**
   * Reset user to default state
   */
  resetUser(userId) {
    const user = this.getUser(userId);
    if (user) {
      user.leaveLobby();
      logger.info(`User ${userId} reset to default state`);
      return true;
    }
    return false;
  }
}

module.exports = UserService;