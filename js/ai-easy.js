/**
 * ai-easy.js - Tier 1 "Casual" Heuristic Hearts AI
 * Namespace: window.Hearts
 * 
 * DESIGN:
 * - Pure heuristic / rule of thumb.
 * - Zero memory of past cards; looks only at current hand and current trick.
 * - Symmetrical self-interest: seeks only to minimize points taken on this trick.
 */
(function() {
  window.Hearts = window.Hearts || {};
  const Hearts = window.Hearts;

  function chooseCardEasy(playerIndex, hand, trick, gameMemory, allScores, isFirstTrick) {
    const legalPlays = Hearts.getLegalPlays(hand, trick, gameMemory.heartsBroken, isFirstTrick);
    if (legalPlays.length === 1) return legalPlays[0];

    // CASE 1: LEADING THE TRICK
    if (!trick || trick.count === 0) {
      // Must play 2 of Clubs on trick 1 (handled by legalPlays)
      // On normal leads: play the lowest non-heart card
      const nonHearts = legalPlays.filter(c => !c.isHeart);
      if (nonHearts.length > 0) {
        // Sort ascending by rank, pick lowest
        nonHearts.sort((a, b) => a.rank - b.rank);
        return nonHearts[0];
      }
      // Only hearts available (or broken)
      legalPlays.sort((a, b) => a.rank - b.rank);
      return legalPlays[0];
    }

    // CASE 2: FOLLOWING SUIT
    const leadSuit = trick.leadSuit;
    const following = legalPlays.filter(c => c.suit === leadSuit);

    if (following.length > 0) {
      const winningPlay = trick.winningPlay;
      const currentHighestRank = winningPlay ? winningPlay.card.rank : 0;
      const trickHasPoints = trick.points > 0;

      // Cards that can duck below current winner
      const duckingCards = following.filter(c => c.rank < currentHighestRank);

      if (duckingCards.length > 0) {
        // Duck with the highest safe card to shed high cards safely
        duckingCards.sort((a, b) => b.rank - a.rank);
        return duckingCards[0];
      } else {
        // Cannot duck - forced to win or play higher. Play lowest to minimize damage.
        following.sort((a, b) => a.rank - b.rank);
        return following[0];
      }
    }

    // CASE 3: VOID IN LEAD SUIT (SLOUGHING / DUMPING)
    if (isFirstTrick) {
      // Cannot play points on trick 1: dump highest safe card
      const safeCards = legalPlays.filter(c => c.points === 0);
      safeCards.sort((a, b) => b.rank - a.rank);
      return safeCards[0] || legalPlays[0];
    }

    // Dump Queen of Spades immediately if held!
    const queenSpades = legalPlays.find(c => c.isQueenOfSpades);
    if (queenSpades) return queenSpades;

    // Dump highest Heart
    const hearts = legalPlays.filter(c => c.isHeart).sort((a, b) => b.rank - a.rank);
    if (hearts.length > 0) return hearts[0];

    // Dump highest card overall
    legalPlays.sort((a, b) => b.rank - a.rank);
    return legalPlays[0];
  }

  Hearts.chooseCardEasy = chooseCardEasy;
})();
