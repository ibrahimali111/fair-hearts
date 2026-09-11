/**
 * scoring.js - Scoring calculations and Shoot the Moon rules
 * Namespace: window.Hearts
 */
(function() {
  window.Hearts = window.Hearts || {};
  const Hearts = window.Hearts;

  const TOTAL_ROUND_POINTS = 26; // 13 Hearts (1 pt each) + Queen of Spades (13 pts)
  const DEFAULT_TARGET_SCORE = 100;

  class Scorer {
    constructor(targetScore = DEFAULT_TARGET_SCORE) {
      this.targetScore = targetScore;
      this.cumulativeScores = [0, 0, 0, 0];
      this.roundHistory = [];
    }

    /**
     * Calculates points for completed round from all 13 completed tricks.
     * @param {Array<Trick>} tricks - Array of 13 completed tricks
     * @returns {Object} Round score summary
     */
    calculateRoundScores(tricks) {
      const capturedPoints = [0, 0, 0, 0];
      const capturedCards = [[], [], [], []];

      for (const trick of tricks) {
        const winner = trick.winner;
        if (winner !== null && winner !== undefined) {
          for (const play of trick.plays) {
            capturedCards[winner].push(play.card);
            capturedPoints[winner] += play.card.points;
          }
        }
      }

      // Check for Shoot the Moon
      let moonShooter = -1;
      for (let i = 0; i < 4; i++) {
        if (capturedPoints[i] === TOTAL_ROUND_POINTS) {
          moonShooter = i;
          break;
        }
      }

      const finalRoundPoints = [0, 0, 0, 0];
      if (moonShooter !== -1) {
        // Moon shot successful! Shooter gets 0, everyone else gets +26
        for (let i = 0; i < 4; i++) {
          finalRoundPoints[i] = (i === moonShooter) ? 0 : 26;
        }
      } else {
        // Normal scoring
        for (let i = 0; i < 4; i++) {
          finalRoundPoints[i] = capturedPoints[i];
        }
      }

      // Update cumulative totals
      for (let i = 0; i < 4; i++) {
        this.cumulativeScores[i] += finalRoundPoints[i];
      }

      const roundSummary = {
        roundNumber: this.roundHistory.length + 1,
        capturedPoints,
        finalRoundPoints,
        cumulativeScores: [...this.cumulativeScores],
        shotTheMoon: moonShooter !== -1,
        moonShooter,
        isGameOver: this.checkGameOver()
      };

      this.roundHistory.push(roundSummary);
      return roundSummary;
    }

    checkGameOver() {
      return this.cumulativeScores.some(score => score >= this.targetScore);
    }

    getWinner() {
      if (!this.checkGameOver()) return null;
      let minScore = Infinity;
      let winner = 0;
      for (let i = 0; i < 4; i++) {
        if (this.cumulativeScores[i] < minScore) {
          minScore = this.cumulativeScores[i];
          winner = i;
        }
      }
      return { winner, score: minScore, scores: [...this.cumulativeScores] };
    }

    getRankings() {
      return [0, 1, 2, 3]
        .map(i => ({ player: i, score: this.cumulativeScores[i] }))
        .sort((a, b) => a.score - b.score);
    }

    reset() {
      this.cumulativeScores = [0, 0, 0, 0];
      this.roundHistory = [];
    }
  }

  Hearts.TOTAL_ROUND_POINTS = TOTAL_ROUND_POINTS;
  Hearts.Scorer = Scorer;
})();
