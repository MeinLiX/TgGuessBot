const { KEYBOARD_LABELS, CALLBACK_DATA } = require('../constants');
const config = require('../config');

class KeyboardService {
  /**
   * Main menu keyboard
   */
  static getMainMenuKeyboard() {
    return {
      inline_keyboard: [
        [
          {
            text: KEYBOARD_LABELS.JOIN_RANDOM,
            callback_data: CALLBACK_DATA.JOIN_RANDOM_LOBBY
          }
        ],
        [
          {
            text: KEYBOARD_LABELS.INVITE,
            callback_data: CALLBACK_DATA.INVITE_TO_LOBBY
          }
        ],
        [
          {
            text: KEYBOARD_LABELS.START_PRACTICE,
            callback_data: CALLBACK_DATA.TRY_START_PRACTICE
          }
        ],
        [{
          text: '🎮 Відкрити гру',
          web_app: {
            url: process.env.WEBAPP_URL
          }
        }]
      ]
    };
  }

  /**
   * Practice confirmation keyboard
   */
  static getPracticeConfirmKeyboard() {
    return {
      inline_keyboard: [
        [
          {
            text: KEYBOARD_LABELS.START,
            callback_data: CALLBACK_DATA.START_PRACTICE
          }
        ],
        [
          {
            text: KEYBOARD_LABELS.BACK,
            callback_data: CALLBACK_DATA.MENU
          }
        ]
      ]
    };
  }

  /**
   * Back to menu keyboard
   */
  static getBackToMenuKeyboard() {
    return {
      inline_keyboard: [
        [
          {
            text: KEYBOARD_LABELS.BACK,
            callback_data: CALLBACK_DATA.MENU
          }
        ]
      ]
    };
  }

  /**
   * Go to menu keyboard (for game end)
   */
  static getGoToMenuKeyboard() {
    return {
      inline_keyboard: [
        [
          {
            text: KEYBOARD_LABELS.GO_TO_MENU,
            callback_data: CALLBACK_DATA.MENU
          }
        ]
      ]
    };
  }

  /**
   * Invite keyboard with lobby link
   */
  static getInviteKeyboard(lobbyId) {
    return {
      inline_keyboard: [
        [
          {
            text: KEYBOARD_LABELS.JOIN_TO_GAME,
            url: `https://t.me/${config.bot.username}?start=${lobbyId}`
          }
        ]
      ]
    };
  }

  /**
   * Accept invitation keyboard
   */
  static getAcceptInviteKeyboard(lobbyId) {
    return {
      inline_keyboard: [
        [
          {
            text: KEYBOARD_LABELS.ACCEPT_INVITATION,
            url: `https://t.me/${config.bot.username}?start=${lobbyId}`
          }
        ]
      ]
    };
  }

  /**
   * Not released feature keyboard
   */
  static getNotReleasedKeyboard() {
    return {
      inline_keyboard: [
        [
          {
            text: KEYBOARD_LABELS.BACK,
            callback_data: CALLBACK_DATA.MENU
          }
        ]
      ]
    };
  }

  /**
   * Remove keyboard
   */
  static getRemoveKeyboard() {
    return {
      remove_keyboard: true
    };
  }

  /**
   * Keyboard for a player in a lobby
   */
  static getInLobbyKeyboard() {
    return {
      inline_keyboard: [
        [
          {
            text: KEYBOARD_LABELS.LEAVE_LOBBY,
            callback_data: CALLBACK_DATA.LEAVE_LOBBY,
          },
        ],
      ],
    };
  }
}

module.exports = KeyboardService;