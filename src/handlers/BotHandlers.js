const GameService = require('../services/GameService');
const KeyboardService = require('../services/KeyboardService');
const logger = require('../utils/logger');
const config = require('../config');
const { 
  USER_STATES, 
  MESSAGES, 
  CALLBACK_DATA,
  KEYBOARD_LABELS 
} = require('../constants');

class BotHandlers {
  constructor() {
    this.gameService = new GameService();
  }

  /**
   * Handle /start command
   */
  async handleStart(ctx) {
    try {
      const userId = ctx.from.id;
      const message = ctx.message.text;
      const user = this.gameService.userService.getOrCreateUser(userId, ctx.from.first_name);

      if (message.length > 36 && user.isAvailable()) {
        const lobbyId = message.slice(7);
        return await this.handleJoinByLink(ctx, userId, lobbyId);
      }

      if (user.isAvailable()) {
        await ctx.reply(MESSAGES.WELCOME(user.nickname), {
          reply_markup: KeyboardService.getMainMenuKeyboard()
        });
      }
    } catch (error) {
      logger.error('Error in handleStart:', error);
      await ctx.reply(MESSAGES.ERROR_START);
    }
  }

  /**
   * Handle joining lobby by link
   */
  async handleJoinByLink(ctx, userId, lobbyId) {
    try {
      const result = this.gameService.joinLobby(userId, lobbyId);
      
      if (result.success) {
        const lobby = result.lobby;
        
        if (lobby.isFull()) {
          for (const player of lobby.players) {
            if (player.id !== 0) {
              await ctx.telegram.sendMessage(player.id, MESSAGES.SET_SECRET_NUMBER, {
                reply_markup: KeyboardService.getInLobbyKeyboard()
              });
            }
          }
        }
      } else {
        await ctx.reply(result.message);
      }
    } catch (error) {
      logger.error('Error in handleJoinByLink:', error);
      await ctx.reply('Не вдалося приєднатися до гри');
    }
  }

  /**
   * Handle callback queries (inline keyboard buttons)
   */
  async handleCallbackQuery(ctx) {
    try {
      const userId = ctx.from.id;
      const data = ctx.callbackQuery.data;
      const user = this.gameService.userService.getOrCreateUser(userId, ctx.from.first_name || 'Guest');

      if (data === CALLBACK_DATA.LEAVE_LOBBY) {
        await this.handleLeaveLobbyCallback(ctx, userId);
        await ctx.answerCbQuery();
        return;
      }
      
      if (!user.isAvailable()) {
        await ctx.answerCbQuery();
        return;
      }


      switch (data) {
        case CALLBACK_DATA.MENU:
          await this.handleMenuCallback(ctx, user);
          break;
        case CALLBACK_DATA.INVITE_TO_LOBBY:
          await this.handleInviteCallback(ctx, userId);
          break;
        case CALLBACK_DATA.JOIN_RANDOM_LOBBY:
          await this.handleJoinRandomCallback(ctx);
          break;
        case CALLBACK_DATA.TRY_START_PRACTICE:
          await this.handleTryPracticeCallback(ctx);
          break;
        case CALLBACK_DATA.START_PRACTICE:
          await this.handleStartPracticeCallback(ctx, userId);
          break;
        default:
          await this.handleNotImplementedCallback(ctx);
      }

      await ctx.answerCbQuery();
    } catch (error) {
      logger.error('Error in handleCallbackQuery:', error);
      await ctx.answerCbQuery();
    }
  }

  /**
   * Handle leave lobby callback
   */
  async handleLeaveLobbyCallback(ctx, userId) {
    const result = this.gameService.leaveLobby(userId);

    await ctx.editMessageText(result.message);
    
    if (result.success) {
      await ctx.reply(MESSAGES.CHOOSE_BUTTON(this.gameService.userService.getUser(userId)?.nickname || 'Гравець'), {
        reply_markup: KeyboardService.getMainMenuKeyboard()
      });
    }

    if (result.success && result.opponentId) {
      try {
        const opponent = this.gameService.userService.getUser(result.opponentId);
        await ctx.telegram.sendMessage(result.opponentId, 'Ваш опонент покинув лобі.', {
            reply_markup: KeyboardService.getMainMenuKeyboard()
        });
      } catch (error) {
        logger.error(`Не вдалося сповістити опонента ${result.opponentId}`, error);
      }
    }
  }

  /**
   * Handle menu callback
   */
  async handleMenuCallback(ctx, user) {
    await ctx.editMessageText(MESSAGES.CHOOSE_BUTTON(user.nickname), {
      reply_markup: KeyboardService.getMainMenuKeyboard()
    });
  }

  /**
   * Handle invite callback
   */
   async handleInviteCallback(ctx, userId) {
    const result = this.gameService.createOnlineLobby(userId);
    
    if (result.success) {
      await ctx.reply(MESSAGES.INVITE_TO_GAME, {
        reply_markup: KeyboardService.getInviteKeyboard(result.lobby.id)
      });
      await ctx.telegram.sendMessage(userId, 'Ви чекаєте на опонента...', {
        reply_markup: KeyboardService.getInLobbyKeyboard()
      });
    } else {
      await ctx.reply(result.message);
    }
  }

  /**
   * Handle join random callback
   */
  async handleJoinRandomCallback(ctx) {
    await ctx.editMessageText(MESSAGES.NOT_RELEASED, {
      reply_markup: KeyboardService.getNotReleasedKeyboard()
    });
  }

  /**
   * Handle try practice callback
   */
  async handleTryPracticeCallback(ctx) {
    await ctx.editMessageText(MESSAGES.ARE_YOU_READY, {
      reply_markup: KeyboardService.getPracticeConfirmKeyboard()
    });
  }

  /**
   * Handle start practice callback
   */
  async handleStartPracticeCallback(ctx, userId) {
    await ctx.editMessageText(MESSAGES.COMPUTER_CALCULATING);
    
    const result = this.gameService.createPracticeGame(userId);
    
    if (result.success) {
      await ctx.editMessageText(MESSAGES.COMPUTER_PICKED);
      await ctx.reply(result.message);
    } else {
      await ctx.editMessageText(result.message || 'Failed to start practice game', {
        reply_markup: KeyboardService.getBackToMenuKeyboard()
      });
    }
  }

  /**
   * Handle not implemented features
   */
  async handleNotImplementedCallback(ctx) {
    await ctx.editMessageText(MESSAGES.NOT_RELEASED, {
      reply_markup: KeyboardService.getNotReleasedKeyboard()
    });
  }

  /**
   * Handle text messages
   */
  async handleTextMessage(ctx) {
    try {
      const userId = ctx.from.id;
      const message = ctx.message.text;
      const user = this.gameService.userService.getOrCreateUser(userId, ctx.from.first_name);

      if (message.startsWith('/')) {
        return await this.handleCommands(ctx, userId, message, user);
      }

      switch (user.state) {
        case USER_STATES.CHANGING_NAME:
          await this.handleNameChange(ctx, userId, message);
          break;
        case USER_STATES.WAITING_FOR_PLAYER:
          await ctx.reply(MESSAGES.WAIT_ENEMY);
          break;
        case USER_STATES.SETTING_SECRET_NUMBER:
          await this.handleSecretNumberSetting(ctx, userId, message);
          break;
        case USER_STATES.PRACTICE_MODE:
          await this.handlePracticeGuess(ctx, userId, message);
          break;
        case USER_STATES.ONLINE_GAME:
          await this.handleOnlineGuess(ctx, userId, message);
          break;
        default:
          break;
      }
    } catch (error) {
      logger.error('Error in handleTextMessage:', error);
      await ctx.reply(MESSAGES.ERROR_START);
    }
  }

  /**
   * Handle commands
   */
  async handleCommands(ctx, userId, message, user) {
    const command = message.split(' ')[0];

    switch (command) {
      case '/cheat':
        if (user.state === USER_STATES.PRACTICE_MODE) {
          const result = this.gameService.getCheat(userId);
          await ctx.reply(result.message);
        }
        break;
      case '/surrender':
        if (user.state !== USER_STATES.DEFAULT) {
          const result = this.gameService.surrenderGame(userId);
          if (result.success) {
            await ctx.reply(result.message, {
              reply_markup: KeyboardService.getGoToMenuKeyboard()
            });
          }
        }
        break;
      case '/change_name':
        if (user.isAvailable()) {
          this.gameService.userService.updateUserState(userId, USER_STATES.CHANGING_NAME);
          await ctx.reply(MESSAGES.NICKNAME_CHANGE);
        }
        break;
      case '/help':
        await this.handleHelp(ctx, userId, message);
        break;
      case '/test':
        if (userId === config.bot.adminId) {
          const stats = this.gameService.getStatistics();
          await ctx.reply(`Statistics:\nUsers: ${stats.totalUsers}\nActive lobbies: ${stats.activeLobbies}`);
        }
        break;
    }
  }

  /**
   * Handle name change
   */
  async handleNameChange(ctx, userId, newName) {
    this.gameService.userService.updateUserNickname(userId, newName);
    this.gameService.userService.updateUserState(userId, USER_STATES.DEFAULT);
    
    await ctx.reply(MESSAGES.NICKNAME_CHANGED(newName), {
      reply_markup: KeyboardService.getGoToMenuKeyboard()
    });
  }

  /**
   * Handle secret number setting
   */
  async handleSecretNumberSetting(ctx, userId, secretNumber) {
    const result = this.gameService.setSecretNumber(userId, secretNumber);
    
    if (result.success) {
      await ctx.reply(result.message);
      
      if (result.gameReady) {
        const user = this.gameService.userService.getUser(userId);
        const lobby = this.gameService.lobbyService.getLobby(user.lobbyId);
        
        const players = lobby.players.filter(p => p.id !== 0);
        for (let i = 0; i < players.length; i++) {
          const player = players[i];
          const isFirstPlayer = i === 0;
          
          await ctx.telegram.sendMessage(
            player.id, 
            isFirstPlayer ? MESSAGES.GAME_START : MESSAGES.ENEMY_MOVE
          );
        }
      }
    } else {
      await ctx.reply(result.message);
    }
  }

  /**
   * Handle practice mode guess
   */
async handlePracticeGuess(ctx, userId, guess) {
    const result = this.gameService.processGuess(userId, guess);
    
    if (result.success) {
      if (result.gameEnded) {
        await ctx.reply(result.message, {
          reply_markup: KeyboardService.getGoToMenuKeyboard()
        });
        const user = this.gameService.userService.getUser(userId);
        if (user && user.lobbyId) {
            this.gameService.endGame(user.lobbyId);
        }
      } else {
        await ctx.reply(result.message);
      }
    } else {
      await ctx.reply(result.message);
    }
  }

  /**
   * Handle online game guess
   */
  async handleOnlineGuess(ctx, userId, guess) {
    const result = this.gameService.processGuess(userId, guess);
    
    if (result.success) {
      const user = this.gameService.userService.getUser(userId);
      const lobby = this.gameService.lobbyService.getLobby(user.lobbyId);
      
      if (!lobby) {
        await ctx.reply(result.message || 'Помилка: гру не знайдено.');
        return;
      }

      const opponent = lobby.getOpponent(userId);
      
      if (result.gameEnded) {
        await ctx.reply(result.message, {
          reply_markup: KeyboardService.getGoToMenuKeyboard()
        });
        
        if (opponent && result.opponent) {
          await ctx.telegram.sendMessage(opponent.id, result.opponent, {
            reply_markup: KeyboardService.getGoToMenuKeyboard()
          });
        }
        this.gameService.endGame(user.lobbyId);
      } else {
        await ctx.reply(result.message);
        
        if (opponent && result.opponent) {
          await ctx.telegram.sendMessage(opponent.id, result.opponent);
        }
      }
    } else {
      await ctx.reply(result.message);
    }
  }

  /**
   * Handle help command
   */
  async handleHelp(ctx, userId, message) {
    if (message.length > 5 && userId !== config.bot.adminId) {
      const userMessage = message.slice(5).trim();
      await ctx.telegram.sendMessage(
        config.bot.adminId, 
        `${userMessage}\n\nUser (id): ${userId}`
      );
      await ctx.reply(MESSAGES.THANKS_FOR_CONTACT(userMessage));
    } else if (userId === config.bot.adminId && message.length > 15) {
      const parts = message.slice(6).split(' ');
      const targetUserId = parts[0];
      const response = parts.slice(1).join(' ');
      
      try {
        await ctx.telegram.sendMessage(targetUserId, response);
        await ctx.reply(MESSAGES.ADMIN_RESPONSE(response, targetUserId));
      } catch (error) {
        await ctx.reply('Failed to send message to user');
      }
    } else if (userId === config.bot.adminId && message.length < 16) {
      await ctx.reply('Invalid format for admin response');
    } else {
      await ctx.reply(MESSAGES.HELP_REQUEST);
    }
  }

  /**
   * Handle inline queries
   */
  async handleInlineQuery(ctx) {
    try {
      const query = ctx.inlineQuery.query;
      const userId = ctx.from.id;
      const user = this.gameService.userService.getUser(userId);

      if (query === 'invite' && user && user.isAvailable()) {
        const result = this.gameService.createOnlineLobby(userId);
        
        if (result.success) {
          return await ctx.answerInlineQuery([
            {
              type: 'article',
              id: ctx.inlineQuery.id,
              title: 'Create and invite to the lobby',
              description: 'Invite a friend to play against each other.',
              input_message_content: {
                message_text: MESSAGES.INVITE_TO_GAME
              },
              reply_markup: KeyboardService.getAcceptInviteKeyboard(result.lobby.id)
            }
          ], {
            cache_time: 0,
            is_personal: true
          });
        }
      }

      await ctx.answerInlineQuery();
    } catch (error) {
      logger.error('Error in handleInlineQuery:', error);
      await ctx.answerInlineQuery();
    }
  }

  /**
   * Handle music and stickers
   */
  async handleMediaMessage(ctx) {
    await ctx.reply(':3');
  }

  /**
   * Handle edited messages
   */
  async handleEditedMessage(ctx) {
    await ctx.reply(MESSAGES.STOP_EDITING);
  }

  /**
   * Handle bot errors
   */
  async handleError(err, ctx) {
    const userId = ctx?.message?.chat?.id || ctx?.from?.id;
    
    if (userId) {
      await ctx.reply(MESSAGES.ERROR_START);
      this.gameService.userService.resetUser(userId);
    }
    
    logger.error('Bot error:', err);
  }

  /**
   * Cleanup old games periodically
   */
  setupCleanupJob() {
    setInterval(() => {
      try {
        const cleaned = this.gameService.cleanupOldGames();
        if (cleaned > 0) {
          logger.info(`Cleanup job completed: ${cleaned} old lobbies removed`);
        }
      } catch (error) {
        logger.error('Error in cleanup job:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  async handleWebAppData(ctx) {
  try {
    const webAppData = ctx.message.web_app_data;
    if (!webAppData) return;

    const data = JSON.parse(webAppData.data);
    const userId = ctx.from.id;

    logger.info(`WebApp action from user ${userId}:`, data);

    switch (data.action) {
      case 'create_lobby':
        await this.handleWebAppCreateLobby(ctx, userId, data);
        break;
      case 'join_lobby':
        await this.handleWebAppJoinLobby(ctx, userId, data);
        break;
      case 'start_practice':
        await this.handleWebAppStartPractice(ctx, userId, data);
        break;
      case 'set_secret':
        await this.handleWebAppSetSecret(ctx, userId, data);
        break;
      case 'make_guess':
        await this.handleWebAppMakeGuess(ctx, userId, data);
        break;
      case 'surrender':
        await this.handleWebAppSurrender(ctx, userId, data);
        break;
      case 'leave_lobby':
        await this.handleWebAppLeaveLobby(ctx, userId, data);
        break;
      default:
        logger.warn(`Unknown WebApp action: ${data.action}`);
    }
  } catch (error) {
    logger.error('Error handling Web App data:', error);
    await ctx.reply('❌ Помилка обробки даних з гри');
  }
}
async handleWebAppCreateLobby(ctx, userId, data) {
  const result = this.gameService.createOnlineLobby(userId);
  
  if (result.success) {
    await ctx.reply(`🎯 Кімнату створено!\n\n📋 Код кімнати: \`${result.lobby.id}\`\n\nПередайте цей код другу для приєднання до гри.`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '📱 Відкрити гру',
              web_app: {
                url: process.env.WEBAPP_URL
              }
            }
          ]
        ]
      }
    });
  } else {
    await ctx.reply(`❌ ${result.message}`);
  }
}
async handleWebAppJoinLobby(ctx, userId, data) {
  const result = this.gameService.joinLobby(userId, data.lobbyId);
  
  if (result.success) {
    await ctx.reply('✅ Ви приєднались до кімнати! Встановіть секретне число в грі.');
    
    const lobby = result.lobby;
    const creator = lobby.players.find(p => p.id !== userId && p.id !== 0);
    if (creator) {
      try {
        await ctx.telegram.sendMessage(creator.id, '👤 Гравець приєднався до вашої кімнати! Встановіть секретне число.');
      } catch (error) {
        logger.error(`Failed to notify lobby creator ${creator.id}:`, error);
      }
    }
  } else {
    await ctx.reply(`❌ ${result.message}`);
  }
}

async handleWebAppStartPractice(ctx, userId, data) {
  const result = this.gameService.createPracticeGame(userId);
  
  if (result.success) {
    await ctx.reply('🤖 Тренування розпочато! Комп\'ютер вже загадав число. Вгадуйте в грі!');
  } else {
    await ctx.reply(`❌ ${result.message}`);
  }
}

async handleWebAppSetSecret(ctx, userId, data) {
  const result = this.gameService.setSecretNumber(userId, data.secretNumber);
  
  if (result.success) {
    await ctx.reply(`🔒 Секретне число встановлено: ${data.secretNumber}`);
    
    if (result.gameReady) {
      const user = this.gameService.userService.getUser(userId);
      const lobby = this.gameService.lobbyService.getLobby(user.lobbyId);
      
      if (lobby && lobby.gameStarted) {
        const turnInfo = lobby.getCurrentTurnInfo();
        const players = lobby.players.filter(p => p.id !== 0);
        
        for (let i = 0; i < players.length; i++) {
          const player = players[i];
          const isCurrentPlayer = player.id === turnInfo.currentPlayerId;
          
          await ctx.telegram.sendMessage(
            player.id, 
            isCurrentPlayer ? 
              '🎮 Гра почалася! Ваш хід - вгадуйте число в грі!' : 
              '🎮 Гра почалася! Хід опонента.'
          );
        }
      }
    }
  } else {
    await ctx.reply(`❌ ${result.message}`);
  }
}

async handleWebAppMakeGuess(ctx, userId, data) {
  const user = this.gameService.userService.getUser(userId);
  if (!user || !user.isInLobby()) {
    await ctx.reply('❌ Ви не в грі');
    return;
  }

  const lobby = this.gameService.lobbyService.getLobby(user.lobbyId);
  if (!lobby) {
    await ctx.reply('❌ Гру не знайдено');
    return;
  }

  if (!lobby.settings.isComputer && !lobby.isPlayerTurn(userId)) {
    await ctx.reply('❌ Зараз не ваш хід!');
    return;
  }

  const result = this.gameService.processGuess(userId, data.guess);
  
  if (result.success) {
    await ctx.reply(`🎯 Хід: ${data.guess}\n${result.message}`);
    
    if (result.gameEnded) {
      const user = this.gameService.userService.getUser(userId);
      if (user && user.lobbyId) {
        this.gameService.endGame(user.lobbyId);
      }
    } else {
      if (!lobby.settings.isComputer && result.opponent) {
        const opponent = lobby.getOpponent(userId);
        if (opponent && opponent.id !== 0) {
          try {
            await ctx.telegram.sendMessage(opponent.id, `🎮 ${result.opponent}`);
          } catch (error) {
            logger.error(`Failed to notify opponent ${opponent.id}:`, error);
          }
        }
      }
    }
  } else {
    await ctx.reply(`❌ ${result.message}`);
  }
}

async handleWebAppSurrender(ctx, userId, data) {
  const result = this.gameService.surrenderGame(userId);
  
  if (result.success) {
    await ctx.reply(`🏳️ ${result.message}`);
    
    const user = this.gameService.userService.getUser(userId);
    if (user && user.lobbyId) {
      const lobby = this.gameService.lobbyService.getLobby(user.lobbyId);
      if (lobby && !lobby.settings.isComputer) {
        const opponent = lobby.getOpponent(userId);
        if (opponent && opponent.id !== 0) {
          try {
            await ctx.telegram.sendMessage(opponent.id, '🏆 Ваш опонент здався! Ви перемогли!');
          } catch (error) {
            logger.error(`Failed to notify opponent ${opponent.id}:`, error);
          }
        }
      }
      
      this.gameService.endGame(user.lobbyId);
    }
  } else {
    await ctx.reply(`❌ ${result.message}`);
  }
}

async handleWebAppLeaveLobby(ctx, userId, data) {
  const result = this.gameService.leaveLobby(userId);
  
  if (result.success) {
    await ctx.reply('🚪 Ви покинули кімнату.');
    
    if (result.opponentId) {
      try {
        await ctx.telegram.sendMessage(result.opponentId, '👋 Ваш опонент покинув кімнату.');
      } catch (error) {
        logger.error(`Failed to notify opponent ${result.opponentId}:`, error);
      }
    }
  }
}

}

module.exports = BotHandlers;