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
      this.botDelayMs = 600;       // Configurable bot thinking delay
      this.currentTurn = 0;        // Player index (0: Human South, 1: West, 2: North, 3: East)
      this.roundNumber = 0;
      this.trickNumber = 0;
      this.isWaitingForHuman = false;
      this.humanPassedCards = [];
      this.passPhaseActive = false;

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
      this.startNewRound();
    }

    startNewRound() {
      this.roundNumber++;
      this.trickNumber = 0;
      this.completedTricks = [];
      this.gameMemory = new Hearts.GameMemory();
      this.currentTrick = null;
      this.isWaitingForHuman = false;
      this.humanPassedCards = [];

      // Deal 13 cards to each player
      this.hands = this.deck.deal();
      this.trigger('onHandUpdated', this.hands);

      const passDir = this.getPassDirection();
      if (passDir !== 'none') {
        // Start passing phase
        this.passPhaseActive = true;
        this.trigger('onPassPhaseStart', {
          direction: passDir,
          roundNumber: this.roundNumber
        });
      } else {
        // "Keep" round - no passing
        this.passPhaseActive = false;
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

      this.trigger('onTurnChange', {
        player: p,
        trickNumber: this.trickNumber,
        legalPlays: (p === 0) ? legalPlays : []
      });

      if (p === 0) {
        // Human's turn: wait for UI click
        this.isWaitingForHuman = true;
      } else {
        // Bot's turn
        this.isWaitingForHuman = false;
        setTimeout(() => {
          this.executeBotTurn(p, legalPlays, isFirstTrick);
        }, this.botDelayMs);
      }
    }

    executeBotTurn(p, legalPlays, isFirstTrick) {
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

      this.playCard(p, chosenCard);
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
      this.gameMemory.recordTrickComplete(this.currentTrick);
      this.completedTricks.push(this.currentTrick);

      this.trigger('onTrickComplete', {
        trick: this.currentTrick,
        winner: winner,
        points: points
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
      this.trigger('onRoundComplete', summary);

      if (summary.isGameOver) {
        const winner = this.scorer.getWinner();
        this.trigger('onGameOver', winner);
      }
    }
  }

  Hearts.GameController = GameController;
})();
