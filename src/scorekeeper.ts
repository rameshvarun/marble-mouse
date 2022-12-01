import log from "loglevel";

export default class ScoreKeeper {
  parTime: number;
  parDeaths: number;
  constructor(parTime: number, parDeaths: number) {
    this.parTime = parTime;
    this.parDeaths = parDeaths;
  }

  deaths: number = 0;
  playTime: number = 0;

  coinsCollected: number = 0;
  totalCoins: number = 0;

  starsCollected: number = 0;
  totalStars: number = 0;

  incrementDeaths() {
    this.deaths++;
    log.debug(`Deaths increased to ${this.deaths}.`);
  }

  addPlayTime(time: number) {
    this.playTime += time;
    log.debug(`Play time increased by ${time} to ${this.playTime}.`);
  }

  reportCoins(collected: number, total: number) {
    this.coinsCollected += collected;
    this.totalCoins += total;
    log.debug(`${collected} / ${total} coins collected.`);
  }

  reportStars(collected: number, total: number) {
    this.starsCollected += collected;
    this.totalStars += total;
    log.debug(`${collected} / ${total} stars collected.`);
  }

  formatPlayTime() {
    let minutes = Math.floor(this.playTime / 60);
    let seconds = Math.floor(this.playTime - minutes * 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  calculateTimeBonus() {
    return Math.ceil(Math.max(this.parTime - this.playTime, 0));
  }
  calculateDeathsBonus() {
    return 10 * Math.max(this.parDeaths - this.deaths, 0);
  }
  calculateCoinBonus() {
    return 5 * this.coinsCollected;
  }
  calculateStarsBonus() {
    return 20 * this.starsCollected;
  }

  calculateScore() {
    return (
      this.calculateTimeBonus() +
      this.calculateDeathsBonus() +
      this.calculateCoinBonus()
    );
  }
}
