/**
 * game.js - Master Game Controller & State Machine for Fair Hearts
 * Namespace: window.Hearts
 */
(function() {
  window.Hearts = window.Hearts || {};
  const Hearts = window.Hearts;

  const PASS_DIRECTIONS = ['none', 'left', 'right', 'across'];
  // Round 1 (1): Left, Round 2 (2): Right, Round 3 (3): Across, Round 4 (0): None

  class GameController {
    constructor() {
      this.deck = new Hearts.Deck();
      this.scorer = new Hearts.Scorer();
      this.hands = [];
      this.currentTrick = null;
      this.completedTricks = [];
      this.gameMemory = new Hearts.GameMemory();
      
      this.difficulty = 'normal'; // 'easy', 'normal', 'hard'
      this.botDelayMs = 1250;      // Configurable bot thinking delay (1.25s default)
      this.currentTurn = 0;        // Player index (0: Human South, 1: West, 2: North, 3: East)
      this.roundNumber = 0;
      this.trickNumber = 0;
      this.currentRoundPoints = [0, 0, 0, 0]; // Points taken in current round tricks
      this.isWaitingForHuman = false;
      this.humanPassedCards = [];
      this.passPhaseActive = false;

      // Lifetime player statistics
      this.stats = {
        matchesPlayed: 0,
        matchesWon: 0,
        roundsPlayed: 0,
        bestScore: null
      };

      // Event listeners
      this.callbacks = {
        onHandUpdated: null,
        onCardPlayed: null,
        onTrickComplete: null,
        onRoundComplete: null,
        onGameOver: null,
        onTurnChange: null,
        onPassPhaseStart: null,
        onPassPhaseComplete: null,
        onHeartsBroken: null,
        onMessage: null
      };
    }

    setCallback(event, fn) {
      this.callbacks[event] = fn;
    }

    trigger(event, ...args) {
      if (typeof this.callbacks[event] === 'function') {
        this.callbacks[event](...args);
      }
    }

    getPassDirection() {
      const cycle = this.roundNumber % 4;
      if (cycle === 1) return 'left';
      if (cycle === 2) return 'right';
      if (cycle === 3) return 'across';
      return 'none';
    }

    getPassTarget(playerIndex, direction) {
      if (direction === 'left') return (playerIndex + 1) % 4;
      if (direction === 'right') return (playerIndex + 3) % 4;
      if (direction === 'across') return (playerIndex + 2) % 4;
      return playerIndex;
    }

    startNewGame(difficulty = 'normal') {
      this.difficulty = difficulty;
      this.scorer.reset();
      this.roundNumber = 0;
      this.currentRoundPoints = [0, 0, 0, 0];
      this.saveToStorage();
      this.startNewRound();
    }

    startNewRound() {
      this.roundNumber++;
      this.currentRoundPoints = [0, 0, 0, 0];
      this.trickNumber = 0;
      this.completedTricks = [];
      this.gameMemory = new Hearts.GameMemory();
      this.currentTrick = null;
      this.isWaitingForHuman = false;
      this.humanPassedCards = [];

      this.saveToStorage();

      const passDir = this.getPassDirection();
      this.passPhaseActive = (passDir !== 'none');

      // Deal 13 cards to each player
      this.hands = this.deck.deal();
      this.trigger('onHandUpdated', this.hands);

      if (this.passPhaseActive) {
        // Start passing phase
        this.trigger('onPassPhaseStart', {
          direction: passDir,
          roundNumber: this.roundNumber
        });
      } else {
        // "Keep" round - no passing
        this.trigger('onMessage', 'Round 4: No passing! Hold your cards.');
        this.startFirstTrick();
      }
    }

    /**
     * Called when human submits 3 cards to pass
     */
    executePass(humanCardIds) {
      if (!this.passPhaseActive) return;
      const passDir = this.getPassDirection();
      if (passDir === 'none') return;

      const humanSelectedCards = this.hands[0].cards.filter(c => humanCardIds.includes(c.id));
      if (humanSelectedCards.length !== 3) {
        throw new Error('Must select exactly 3 cards to pass.');
      }

      // Collect passes from all 4 players
      const passes = [
        humanSelectedCards,
        Hearts.selectCardsToPass(this.hands[1]),
        Hearts.selectCardsToPass(this.hands[2]),
        Hearts.selectCardsToPass(this.hands[3])
      ];

      // Remove passed cards from original hands
      for (let p = 0; p < 4; p++) {
        this.hands[p].removeCards(passes[p]);
      }

      // Deliver cards to target players
      const receivedCardsByPlayer = [[], [], [], []];
      for (let p = 0; p < 4; p++) {
        const target = this.getPassTarget(p, passDir);
        this.hands[target].addCards(passes[p]);
        receivedCardsByPlayer[target] = passes[p];
      }

      this.passPhaseActive = false;
      this.trigger('onPassPhaseComplete', {
        passed: passes[0],
        received: receivedCardsByPlayer[0],
        direction: passDir
      });
      this.trigger('onHandUpdated', this.hands);

      // Small pause before opening trick
      setTimeout(() => {
        this.startFirstTrick();
      }, 1000);
    }

    startFirstTrick() {
      // Find player holding 2 of Clubs
      let leader = 0;
      for (let p = 0; p < 4; p++) {
        if (this.hands[p].cards.some(c => c.isTwoOfClubs)) {
          leader = p;
          break;
        }
      }

      this.trickNumber = 1;
      this.currentTrick = new Hearts.Trick(leader);
      this.currentTurn = leader;
      this.processTurn();
    }

    processTurn() {
      if (this.currentTrick.isComplete) {
        this.finishTrick();
        return;
      }

      const p = this.currentTurn;
      const isFirstTrick = (this.trickNumber === 1);
      const legalPlays = Hearts.getLegalPlays(
        this.hands[p],
        this.currentTrick,
        this.gameMemory.heartsBroken,
        isFirstTrick
      );

      if (p === 0) {
        // Human's turn: wait for UI click
        this.isWaitingForHuman = true;
      } else {
        // Bot's turn
        this.isWaitingForHuman = false;
      }

      this.trigger('onTurnChange', {
        player: p,
        trickNumber: this.trickNumber,
        legalPlays: (p === 0) ? legalPlays : []
      });

      if (p !== 0) {
        setTimeout(() => {
          this.executeBotTurn(p, legalPlays, isFirstTrick);
        }, this.botDelayMs);
      }
    }

    executeBotTurn(p, legalPlays, isFirstTrick) {
      if (!this.hands[p] || this.hands[p].count === 0) return;
      if (!this.currentTrick || this.currentTrick.isComplete) return;
      if (this.currentTurn !== p) return;

      let chosenCard;
      if (this.difficulty === 'easy') {
        chosenCard = Hearts.chooseCardEasy(
          p, this.hands[p], this.currentTrick, this.gameMemory, this.scorer.cumulativeScores, isFirstTrick
        );
      } else if (this.difficulty === 'hard') {
        chosenCard = Hearts.chooseCardHard(
          p, this.hands[p], this.currentTrick, this.gameMemory, this.scorer.cumulativeScores, isFirstTrick
        );
      } else {
        // Default: normal
        chosenCard = Hearts.chooseCardNormal(
          p, this.hands[p], this.currentTrick, this.gameMemory, this.scorer.cumulativeScores, isFirstTrick
        );
      }

      if (!chosenCard) {
        const fallbacks = Hearts.getLegalPlays(this.hands[p], this.currentTrick, this.gameMemory.heartsBroken, isFirstTrick);
        chosenCard = fallbacks[0] || this.hands[p].cards[0];
      }

      if (chosenCard) {
        this.playCard(p, chosenCard);
      }
    }

    humanPlayCard(cardId) {
      if (!this.isWaitingForHuman || this.currentTurn !== 0) return false;

      const card = this.hands[0].cards.find(c => c.id === cardId);
      if (!card) return false;

      const isFirstTrick = (this.trickNumber === 1);
      const legalPlays = Hearts.getLegalPlays(
        this.hands[0],
        this.currentTrick,
        this.gameMemory.heartsBroken,
        isFirstTrick
      );

      const isLegal = legalPlays.some(c => c.equals(card));
      if (!isLegal) return false;

      this.isWaitingForHuman = false;
      this.playCard(0, card);
      return true;
    }

    playCard(playerIndex, card) {
      if (!card || !this.hands[playerIndex]) return;
      if (!this.currentTrick || this.currentTrick.isComplete) return;

      // Remove from player's hand
      this.hands[playerIndex].removeCard(card);

      const wasBrokenBefore = this.gameMemory.heartsBroken;
      // Record play in trick and memory
      this.currentTrick.addPlay(playerIndex, card);
      this.gameMemory.recordPlay(playerIndex, card, this.currentTrick);

      // Check if hearts just got broken
      if (!wasBrokenBefore && this.gameMemory.heartsBroken) {
        this.trigger('onHeartsBroken');
      }

      this.trigger('onCardPlayed', {
        player: playerIndex,
        card: card,
        trick: this.currentTrick
      });
      this.trigger('onHandUpdated', this.hands);

      // Advance turn clockwise
      this.currentTurn = (playerIndex + 1) % 4;

      if (this.currentTrick.isComplete) {
        setTimeout(() => {
          this.finishTrick();
        }, this.botDelayMs * 1.5);
      } else {
        this.processTurn();
      }
    }

    finishTrick() {
      const winner = this.currentTrick.winner;
      const points = this.currentTrick.points;
      this.currentRoundPoints[winner] = (this.currentRoundPoints[winner] || 0) + points;
      this.gameMemory.recordTrickComplete(this.currentTrick);
      this.completedTricks.push(this.currentTrick);

      this.trigger('onTrickComplete', {
        trick: this.currentTrick,
        winner: winner,
        points: points,
        currentRoundPoints: [...this.currentRoundPoints]
      });

      if (this.completedTricks.length === 13) {
        // Round complete!
        setTimeout(() => {
          this.finishRound();
        }, 1200);
      } else {
        // Start next trick
        this.trickNumber++;
        this.currentTrick = new Hearts.Trick(winner);
        this.currentTurn = winner;
        setTimeout(() => {
          this.processTurn();
        }, 800);
      }
    }

    finishRound() {
      const summary = this.scorer.calculateRoundScores(this.completedTricks);
      this.currentRoundPoints = [0, 0, 0, 0];
      this.stats.roundsPlayed = (this.stats.roundsPlayed || 0) + 1;

      if (summary.isGameOver) {
        this.stats.matchesPlayed = (this.stats.matchesPlayed || 0) + 1;
        const winner = this.scorer.getWinner();
        if (winner && winner.winner === 0) {
          this.stats.matchesWon = (this.stats.matchesWon || 0) + 1;
        }
        const southScore = this.scorer.cumulativeScores[0];
        if (this.stats.bestScore === null || southScore < this.stats.bestScore) {
          this.stats.bestScore = southScore;
        }
        this.saveToStorage();
        this.trigger('onRoundComplete', summary);
        this.trigger('onGameOver', winner);
      } else {
        this.saveToStorage();
        this.trigger('onRoundComplete', summary);
      }
    }

    // ==========================================
    // PERSISTENT STORAGE & MEMORY MANAGEMENT
    // ==========================================
    saveToStorage() {
      try {
        const payload = {
          cumulativeScores: this.scorer.cumulativeScores,
          roundNumber: this.roundNumber,
          roundHistory: this.scorer.roundHistory,
          difficulty: this.difficulty,
          stats: this.stats
        };
        localStorage.setItem('fair_hearts_save_v1', JSON.stringify(payload));
      } catch (e) {
        console.warn('Fair Hearts storage save failed:', e);
      }
    }

    loadFromStorage() {
      try {
        const raw = localStorage.getItem('fair_hearts_save_v1');
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.cumulativeScores) && data.cumulativeScores.length === 4) {
          this.scorer.cumulativeScores = [...data.cumulativeScores];
          this.scorer.roundHistory = data.roundHistory || [];
          this.roundNumber = data.roundNumber || 0;
          this.difficulty = data.difficulty || 'normal';
          if (data.stats) this.stats = { ...this.stats, ...data.stats };
          return true;
        }
      } catch (e) {
        console.warn('Fair Hearts storage load failed:', e);
      }
      return false;
    }

    initialize() {
      const hasSave = this.loadFromStorage();
      if (hasSave && (this.scorer.cumulativeScores.some(s => s > 0) || this.roundNumber > 1)) {
        if (this.scorer.checkGameOver()) {
          // Prior match ended at 100+ points; start fresh match but keep lifetime stats
          this.startNewGame(this.difficulty);
        } else {
          // Resume ongoing match without losing match scores:
          // Adjust roundNumber down by 1 so startNewRound() increments to current round
          this.roundNumber = Math.max(0, this.roundNumber - 1);
          this.startNewRound();
        }
      } else {
        this.startNewGame(this.difficulty || 'normal');
      }
    }

    resetMemory() {
      try {
        localStorage.removeItem('fair_hearts_save_v1');
      } catch (e) {}
      this.stats = {
        matchesPlayed: 0,
        matchesWon: 0,
        roundsPlayed: 0,
        bestScore: null
      };
      this.scorer.reset();
      this.roundNumber = 0;
      this.currentRoundPoints = [0, 0, 0, 0];
      this.completedTricks = [];
      this.saveToStorage();
      this.startNewRound();
    }

    setDifficulty(difficulty) {
      this.difficulty = difficulty;
      this.saveToStorage();
    }
  }

  Hearts.GameController = GameController;
})();
