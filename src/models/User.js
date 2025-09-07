const { USER_STATES } = require('../constants');

class User {
  constructor(id, firstName = 'Guest') {
    this.id = id;
    this.nickname = firstName;
    this.lobbyId = '';
    this.password = 0;
    this.state = USER_STATES.DEFAULT;
    this.lastWebAppQueryId = null;
  }

  /**
   * Update user state
   */
  setState(newState) {
    this.state = newState;
  }

  /**
   * Set user lobby
   */
  setLobby(lobbyId, password = 0) {
    this.lobbyId = lobbyId;
    this.password = password;
  }

  /**
   * Remove user from lobby
   */
  leaveLobby() {
    this.lobbyId = '';
    this.password = 0;
    this.state = USER_STATES.DEFAULT;
  }

  /**
   * Check if user is in a lobby
   */
  isInLobby() {
    return this.lobbyId !== '';
  }

  /**
   * Check if user is available for new games
   */
  isAvailable() {
    return this.state === USER_STATES.DEFAULT;
  }

  /**
   * Update nickname
   */
  setNickname(nickname) {
    this.nickname = nickname;
  }

  /**
   * Get user info as plain object
   */
  toJSON() {
    return {
      id: this.id,
      nickname: this.nickname,
      lobbyId: this.lobbyId,
      password: this.password,
      state: this.state,
    };
  }

  /**
   * Create user from plain object
   */
  static fromJSON(data) {
    const user = new User(data.id, data.nickname);
    user.lobbyId = data.lobbyId || '';
    user.password = data.password || 0;
    user.state = data.state || USER_STATES.DEFAULT;
    return user;
  }
}

module.exports = User;