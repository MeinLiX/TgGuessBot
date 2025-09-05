const config = require('../config');

class GameUtils {
  /**
   * Generate random integer between min and max (inclusive)
   */
  static getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate random secret number with unique digits
   */
  static generateSecretNumber() {
    const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    let result = '';

    for (let i = 0; i < config.game.secretNumberLength; i++) {
      let randomIndex;
      if (i === 0) {
        randomIndex = this.getRandomInt(1, digits.length - 1);
      } else {
        randomIndex = this.getRandomInt(0, digits.length - 1);
      }
      
      result += digits[randomIndex];
      digits.splice(randomIndex, 1);
    }

    return result;
  }

  /**
   * Check if input is a valid number
   */
  static isNumber(input) {
    return /^\d+$/.test(input) ? parseInt(input, 10) : 0;
  }

  /**
   * Validate if number is a valid secret number (4 unique digits, not starting with 0)
   */
  static isValidSecretNumber(input) {
    if (!input || typeof input !== 'string') return false;
    
    const num = this.isNumber(input);
    if (num === 0) return false;
    
    const numStr = num.toString();
    if (numStr.length !== config.game.secretNumberLength) return false;
    
    const uniqueDigits = new Set(numStr.split(''));
    return uniqueDigits.size === config.game.secretNumberLength;
  }

  /**
   * Audit guessed number against secret number
   */
  static auditNumber(guessedNumber, secretNumber) {
    const guess = this.isNumber(guessedNumber).toString();
    const secret = this.isNumber(secretNumber).toString();
    
    let sameDigits = 0;
    let samePositions = 0;

    for (let i = 0; i < config.game.secretNumberLength; i++) {
      if (guess[i] === secret[i]) {
        samePositions++;
      }
    }

    for (let i = 0; i < config.game.secretNumberLength; i++) {
      for (let j = 0; j < config.game.secretNumberLength; j++) {
        if (guess[i] === secret[j]) {
          sameDigits++;
          break;
        }
      }
    }

    return {
      sameDigits,
      samePositions,
    };
  }

  /**
   * Check if player won the game
   */
  static isWinningGuess(audit) {
    return audit.sameDigits === config.game.secretNumberLength && 
           audit.samePositions === config.game.secretNumberLength;
  }

  /**
   * Sleep function for delays
   */
  static sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  /**
   * Format game result message
   */
  static formatGameResult(guessedNumber, audit) {
    return `Your number: ${guessedNumber}\nSame digits: ${audit.sameDigits}\nCorrect positions: ${audit.samePositions}\n\n`;
  }
}

module.exports = GameUtils;