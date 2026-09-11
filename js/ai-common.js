/**
 * ai-common.js - Shared utilities, passing heuristics, and memory tracking for Fair Hearts AI
 * Namespace: window.Hearts
 * 
 * CORE FAIRNESS GUARANTEE:
 * All bots strictly observe "No-Peeking":
 * - They ONLY see their own hand and publicly played cards.
 * - They NEVER access opponents' hidden hands or check if a player is Human.
 * - All opponents are evaluated symmetrically based purely on match scoreboard and observed plays.
 */
(function() {
  window.Hearts = window.Hearts || {};
  const Hearts = window.Hearts;

  /**
   * Tracks public game information that any attentive human player would know:
   * 1. Cards that have already been played.
   * 2. Which players have shown voids in which suits.
   * 3. Current round score accumulated by each player so far.
   */
  class GameMemory {
    constructor() {
      this.playedCards = new Set();
      // voidSuits[playerIndex][suit] = true if player is confirmed void in suit
      this.voidSuits = [
        { C: false, D: false, S: false, H: false },
        { C: false, D: false, S: false, H: false },
        { C: false, D: false, S: false, H: false },
        { C: false, D: false, S: false, H: false }
      ];
      this.heartsBroken = false;
      this.queenOfSpadesPlayed = false;
      this.roundPointsTaken = [0, 0, 0, 0];
      this.completedTricks = [];
    }

    recordPlay(playerIndex, card, trick) {
      this.playedCards.add(card.id);
      if (card.isHeart) this.heartsBroken = true;
      if (card.isQueenOfSpades) {
        this.heartsBroken = true; // In standard Hearts, playing ♠Q breaks hearts
        this.queenOfSpadesPlayed = true;
      }

      // Check for void: if trick has lead suit and player didn't follow it
      if (trick && trick.count > 0) {
        const leadSuit = trick.leadSuit;
        if (card.suit !== leadSuit) {
          this.voidSuits[playerIndex][leadSuit] = true;
        }
      }
    }

    recordTrickComplete(trick) {
      this.completedTricks.push(trick);
      const winner = trick.winner;
      if (winner !== null && winner !== undefined) {
        this.roundPointsTaken[winner] += trick.points;
      }
    }

    isCardPlayed(card) {
      return this.playedCards.has(card.id);
    }

    isPlayerVoidIn(playerIndex, suit) {
      return this.voidSuits[playerIndex][suit] === true;
    }

    getRemainingUnseenCards(myHand) {
      const myCardIds = new Set(myHand.cards.map(c => c.id));
      const unseen = [];
      for (const suit of Hearts.SUITS) {
        for (let r = 2; r <= 14; r++) {
          const id = `${Hearts.RANK_NAMES[r]}${suit}`;
          if (!this.playedCards.has(id) && !myCardIds.has(id)) {
            unseen.push(new Hearts.Card(suit, r));
          }
        }
      }
      return unseen;
    }

    clone() {
      const copy = new GameMemory();
      copy.playedCards = new Set(this.playedCards);
      copy.voidSuits = this.voidSuits.map(v => ({ ...v }));
      copy.heartsBroken = this.heartsBroken;
      copy.queenOfSpadesPlayed = this.queenOfSpadesPlayed;
      copy.roundPointsTaken = [...this.roundPointsTaken];
      copy.completedTricks = [...this.completedTricks];
      return copy;
    }
  }

  /**
   * Universal, unbiased 3-card passing logic.
   * Prioritizes shedding high-risk cards:
   * 1. ♠A or ♠K (dangerous magnets for ♠Q if not holding ♠Q)
   * 2. ♠Q (if holding fewer than 4 spades to protect it)
   * 3. High Hearts (A♥, K♥, Q♥)
   * 4. High cards from short suits to create voids
   */
  function selectCardsToPass(hand) {
    const cards = [...hand.cards];
    const spades = cards.filter(c => c.suit === 'S');
    const hearts = cards.filter(c => c.suit === 'H');
    const diamonds = cards.filter(c => c.suit === 'D');
    const clubs = cards.filter(c => c.suit === 'C');

    const passCandidates = [];

    // 1. Danger Spades: A♠, K♠ are deadly if someone dumps Q♠ on you
    const aceSpades = spades.find(c => c.rank === 14);
    const kingSpades = spades.find(c => c.rank === 13);
    const queenSpades = spades.find(c => c.rank === 12);

    // If holding Queen of Spades with fewer than 4 total spades, pass it away
    if (queenSpades && spades.length < 4) {
      passCandidates.push(queenSpades);
    }
    if (aceSpades && !passCandidates.includes(aceSpades)) passCandidates.push(aceSpades);
    if (kingSpades && !passCandidates.includes(kingSpades)) passCandidates.push(kingSpades);

    // 2. High Hearts (A♥, K♥, Q♥)
    const highHearts = hearts.filter(c => c.rank >= 12).sort((a, b) => b.rank - a.rank);
    for (const h of highHearts) {
      if (passCandidates.length < 3 && !passCandidates.includes(h)) {
        passCandidates.push(h);
      }
    }

    // 3. Create voids by passing highest cards of short suits (length 1 or 2)
    const shortSuits = [
      { suit: 'D', cards: diamonds },
      { suit: 'C', cards: clubs }
    ].sort((a, b) => a.cards.length - b.cards.length);

    for (const entry of shortSuits) {
      const sorted = [...entry.cards].sort((a, b) => b.rank - a.rank);
      for (const card of sorted) {
        if (card.rank >= 10 && passCandidates.length < 3 && !passCandidates.includes(card)) {
          passCandidates.push(card);
        }
      }
    }

    // 4. Fill remaining slots with absolute highest cards
    const remaining = cards
      .filter(c => !passCandidates.includes(c) && !c.isTwoOfClubs)
      .sort((a, b) => b.rank - a.rank);

    while (passCandidates.length < 3 && remaining.length > 0) {
      passCandidates.push(remaining.shift());
    }

    return passCandidates.slice(0, 3);
  }

  Hearts.GameMemory = GameMemory;
  Hearts.selectCardsToPass = selectCardsToPass;
})();
