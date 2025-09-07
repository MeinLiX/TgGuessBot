const { Telegraf } = require('telegraf');
const config = require('./config');
const BotHandlers = require('./handlers/BotHandlers');
const logger = require('./utils/logger');

const bot = new Telegraf(config.bot.token);
const handlers = new BotHandlers();

bot.catch((err, ctx) => handlers.handleError(err, ctx));

bot.use((ctx, next) => {
  const userId = ctx.message?.chat?.id || ctx.from?.id;
  
  if (ctx.message) {
    logger.info(`Message from ${userId}: ${ctx.message.text || 'media'}`);
  } else if (ctx.editedMessage) {
    logger.info(`Edited message from ${userId}`);
    return handlers.handleEditedMessage(ctx);
  } else if (ctx.callbackQuery) {
    logger.info(`Callback from ${userId}: ${ctx.callbackQuery.data}`);
  }
  
  if (userId) {
    const firstName = ctx.message?.from?.first_name || ctx.from?.first_name || 'Guest';
    handlers.gameService.userService.getOrCreateUser(userId, firstName);
  }
  
  return next();
});

bot.start((ctx) => handlers.handleStart(ctx));
bot.help((ctx) => handlers.handleHelp(ctx, ctx.from.id, ctx.message.text));
bot.command('change_name', (ctx) => handlers.handleCommands(ctx, ctx.from.id, ctx.message.text, handlers.gameService.userService.getUser(ctx.from.id)));
bot.command('cheat', (ctx) => handlers.handleCommands(ctx, ctx.from.id, ctx.message.text, handlers.gameService.userService.getUser(ctx.from.id)));
bot.command('surrender', (ctx) => handlers.handleCommands(ctx, ctx.from.id, ctx.message.text, handlers.gameService.userService.getUser(ctx.from.id)));
bot.command('test', (ctx) => handlers.handleCommands(ctx, ctx.from.id, ctx.message.text, handlers.gameService.userService.getUser(ctx.from.id)));

bot.on('callback_query', (ctx) => handlers.handleCallbackQuery(ctx));

bot.on('inline_query', (ctx) => handlers.handleInlineQuery(ctx));

bot.on(['audio', 'document', 'photo', 'sticker', 'video', 'voice'], (ctx) => handlers.handleMediaMessage(ctx));

bot.on('text', (ctx) => handlers.handleTextMessage(ctx));

handlers.setupCleanupJob();

process.once('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  bot.stop('SIGINT');
  process.exit(0);
});

process.once('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  bot.stop('SIGTERM');
  process.exit(0);
});

bot.launch()
  .then(() => {
    logger.info('Bot started successfully');
    logger.info(`Bot username: @${bot.botInfo.username}`);
  })
  .catch((error) => {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));