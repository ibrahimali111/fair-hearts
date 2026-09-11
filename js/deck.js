/**
 * deck.js - Card, Deck, and Hand representations for Fair Hearts
 * Namespace: window.Hearts
 */
(function() {
  window.Hearts = window.Hearts || {};
  const Hearts = window.Hearts;

  const SUITS = ['C', 'D', 'S', 'H']; // Clubs, Diamonds, Spades, Hearts
  const SUIT_SYMBOLS = { C: '♣', D: '♦', S: '♠', H: '♥' };
  const SUIT_NAMES = { C: 'Clubs', D: 'Diamonds', S: 'Spades', H: 'Hearts' };
  const SUIT_COLORS = { C: 'black', D: 'red', S: 'black', H: 'red' };
  
  const RANK_NAMES = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A'
  };

  class Card {
    constructor(suit, rank) {
      this.suit = suit;     // 'C', 'D', 'S', 'H'
      this.rank = rank;     // 2 through 14 (Ace = 14)
      this.id = `${RANK_NAMES[rank]}${suit}`;
    }

    get points() {
      if (this.suit === 'H') return 1;
      if (this.suit === 'S' && this.rank === 12) return 13; // Queen of Spades
      return 0;
    }

    get isHeart() {
      return this.suit === 'H';
    }

    get isQueenOfSpades() {
      return this.suit === 'S' && this.rank === 12;
    }

    get isTwoOfClubs() {
      return this.suit === 'C' && this.rank === 2;
    }

    get symbol() {
      return SUIT_SYMBOLS[this.suit];
    }

    get color() {
      return SUIT_COLORS[this.suit];
    }

    get rankName() {
      return RANK_NAMES[this.rank];
    }

    get fullName() {
      const rankWords = {
        2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
        11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace'
      };
      return `${rankWords[this.rank]} of ${SUIT_NAMES[this.suit]}`;
    }

    equals(other) {
      return other && this.suit === other.suit && this.rank === other.rank;
    }

    toString() {
      return `${this.rankName}${this.symbol}`;
    }
  }

  class Deck {
    constructor() {
      this.cards = [];
      this.reset();
    }

    reset() {
      this.cards = [];
      for (const suit of SUITS) {
        for (let rank = 2; rank <= 14; rank++) {
          this.cards.push(new Card(suit, rank));
        }
      }
    }

    shuffle() {
      // Cryptographically sound Fisher-Yates shuffle
      for (let i = this.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
      }
    }

    deal() {
      this.reset();
      this.shuffle();
      const hands = [[], [], [], []];
      for (let i = 0; i < 52; i++) {
        hands[i % 4].push(this.cards[i]);
      }
      return hands.map(cards => new Hand(cards));
    }
  }

  class Hand {
    constructor(cards = []) {
      this.cards = [...cards];
      this.sort();
    }

    sort() {
      // Standard card sorting order: Clubs, Diamonds, Spades, Hearts
      const suitOrder = { C: 0, D: 1, S: 2, H: 3 };
      this.cards.sort((a, b) => {
        if (suitOrder[a.suit] !== suitOrder[b.suit]) {
          return suitOrder[a.suit] - suitOrder[b.suit];
        }
        return a.rank - b.rank;
      });
    }

    addCard(card) {
      this.cards.push(card);
      this.sort();
    }

    addCards(cards) {
      this.cards.push(...cards);
      this.sort();
    }

    removeCard(card) {
      const idx = this.cards.findIndex(c => c.equals(card));
      if (idx !== -1) {
        return this.cards.splice(idx, 1)[0];
      }
      return null;
    }

    removeCards(cards) {
      return cards.map(c => this.removeCard(c)).filter(Boolean);
    }

    hasSuit(suit) {
      return this.cards.some(c => c.suit === suit);
    }

    getSuit(suit) {
      return this.cards.filter(c => c.suit === suit);
    }

    hasCard(card) {
      return this.cards.some(c => c.equals(card));
    }

    get count() {
      return this.cards.length;
    }

    get points() {
      return this.cards.reduce((sum, c) => sum + c.points, 0);
    }

    clone() {
      return new Hand(this.cards.map(c => new Card(c.suit, c.rank)));
    }
  }

  Hearts.SUITS = SUITS;
  Hearts.SUIT_SYMBOLS = SUIT_SYMBOLS;
  Hearts.SUIT_NAMES = SUIT_NAMES;
  Hearts.SUIT_COLORS = SUIT_COLORS;
  Hearts.RANK_NAMES = RANK_NAMES;
  Hearts.Card = Card;
  Hearts.Deck = Deck;
  Hearts.Hand = Hand;
})();
