/**
 * trick.js - Trick management and Hearts legal play rules
 * Namespace: window.Hearts
 */
(function() {
  window.Hearts = window.Hearts || {};
  const Hearts = window.Hearts;

  class Trick {
    constructor(leader) {
      this.leader = leader; // Player index (0-3) who led the trick
      this.plays = [];      // Array of { player: number, card: Card }
    }

    addPlay(player, card) {
      this.plays.push({ player, card });
    }

    get count() {
      return this.plays.length;
    }

    get isComplete() {
      return this.plays.length === 4;
    }

    get leadSuit() {
      return this.plays.length > 0 ? this.plays[0].card.suit : null;
    }

    get leadCard() {
      return this.plays.length > 0 ? this.plays[0].card : null;
    }

    get points() {
      return this.plays.reduce((sum, p) => sum + p.card.points, 0);
    }

    get containsHearts() {
      return this.plays.some(p => p.card.isHeart);
    }

    get containsQueenOfSpades() {
      return this.plays.some(p => p.card.isQueenOfSpades);
    }

    get winningPlay() {
      if (this.plays.length === 0) return null;
      const lead = this.leadSuit;
      let highest = this.plays[0];

      for (let i = 1; i < this.plays.length; i++) {
        const p = this.plays[i];
        if (p.card.suit === lead && p.card.rank > highest.card.rank) {
          highest = p;
        }
      }
      return highest;
    }

    get winner() {
      const w = this.winningPlay;
      return w ? w.player : null;
    }

    getCardForPlayer(playerIndex) {
      const p = this.plays.find(play => play.player === playerIndex);
      return p ? p.card : null;
    }
  }

  /**
   * Returns an array of Card objects that are legal to play.
   * Enforces all official Hearts rules:
   * 1. First trick lead must be 2 of Clubs.
   * 2. First trick: no points (Hearts or ♠Q) can be sloughed unless player has only points.
   * 3. Following: must follow lead suit if possible.
   * 4. Leading: Hearts cannot be led until broken, unless player has only Hearts.
   */
  function getLegalPlays(hand, trick, heartsBroken, isFirstTrick) {
    const cards = hand.cards || hand; // Support Hand instance or Card[]

    if (!trick || trick.count === 0) {
      // LEADING
      if (isFirstTrick) {
        // Must lead 2 of Clubs
        const twoClubs = cards.find(c => c.isTwoOfClubs);
        return twoClubs ? [twoClubs] : [...cards];
      }

      if (heartsBroken) {
        return [...cards];
      }

      // Hearts NOT broken: cannot lead Hearts unless player has only Hearts
      const nonHearts = cards.filter(c => !c.isHeart);
      if (nonHearts.length > 0) {
        return nonHearts;
      }
      // Player only has Hearts: hearts are broken by necessity
      return [...cards];
    }

    // FOLLOWING
    const leadSuit = trick.leadSuit;
    const sameSuitCards = cards.filter(c => c.suit === leadSuit);

    if (sameSuitCards.length > 0) {
      // Must follow suit
      return sameSuitCards;
    }

    // Player is VOID in lead suit - can slough any card, subject to first trick restriction
    if (isFirstTrick) {
      // Blood rule: Cannot play points on the first trick
      const nonPoints = cards.filter(c => c.points === 0);
      if (nonPoints.length > 0) {
        return nonPoints;
      }
      // Rare edge-case: player holds only points on trick 1
      return [...cards];
    }

    // Normal void: can play any card!
    return [...cards];
  }

  Hearts.Trick = Trick;
  Hearts.getLegalPlays = getLegalPlays;
})();
