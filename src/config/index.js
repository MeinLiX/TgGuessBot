require('dotenv').config();

const config = {
  bot: {
    token: process.env.BOT_TOKEN,
    username: process.env.BOT_USERNAME,
    adminId: parseInt(process.env.ADMIN_ID) || 319877134,
  },
  
  app: {
    env: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
  },
  
  game: {
    maxLobbySize: parseInt(process.env.MAX_LOBBY_SIZE) || 2,
    computerDifficulty: process.env.DEFAULT_COMPUTER_DIFFICULTY || 'normal',
    secretNumberLength: 4,
    minNumber: 1023,
    maxNumber: 9876,
  },
  
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY,
    sessionSecret: process.env.SESSION_SECRET,
  }
};

if (!config.bot.token) {
  throw new Error('BOT_TOKEN is required');
}

module.exports = config;