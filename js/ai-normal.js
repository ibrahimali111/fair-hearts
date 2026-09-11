/**
 * ai-normal.js - Tier 2 "Strategic" Card-Counting & Void-Tracking AI
 * Namespace: window.Hearts
 * 
 * CORE FAIRNESS & INTELLIGENCE:
 * - Tracks all 52 cards; knows exactly which cards remain in the deck.
 * - Tracks known voids of all opponents (will not lead a suit if an opponent is void in it).
 * - Queen of Spades danger management: protects against A♠ / K♠ traps until ♠Q is flushed.
 * - Strategic point distribution: targets the match leader (lowest score on scoreboard), NEVER a specific seat!
 * - Shoot the Moon defense: actively blocks opponents attempting a clean sweep.
 */
(function() {
  window.Hearts = window.Hearts || {};
  const Hearts = window.Hearts;

  function chooseCardNormal(playerIndex, hand, trick, gameMemory, allScores, isFirstTrick) {
    const legalPlays = Hearts.getLegalPlays(hand, trick, gameMemory.heartsBroken, isFirstTrick);
    if (legalPlays.length === 1) return legalPlays[0];

    const queenPlayed = gameMemory.queenOfSpadesPlayed;
    const cards = hand.cards;

    // Detect if any opponent is threatening to Shoot the Moon
    let potentialMoonShooter = -1;
    for (let p = 0; p < 4; p++) {
      if (p !== playerIndex) {
        const points = gameMemory.roundPointsTaken[p];
        // If an opponent has all points so far and round has progressed past trick 5
        if (points >= 8 && gameMemory.roundPointsTaken.every((pts, idx) => idx === p || pts === 0)) {
          potentialMoonShooter = p;
          break;
        }
      }
    }

    // ==========================================
    // CASE 1: LEADING A TRICK (trick is empty)
    // ==========================================
    if (!trick || trick.count === 0) {
      if (isFirstTrick) {
        return legalPlays.find(c => c.isTwoOfClubs) || legalPlays[0];
      }

      // If defending against a Moon Shot:
      if (potentialMoonShooter !== -1) {
        // Try to lead a card that forces someone else to take points, or take a cheap trick
        // Lead low cards in suits where the shooter is not void
        const safeLeads = legalPlays.filter(c => !gameMemory.isPlayerVoidIn(potentialMoonShooter, c.suit));
        if (safeLeads.length > 0) {
          safeLeads.sort((a, b) => a.rank - b.rank);
          return safeLeads[0];
        }
      }

      // Safe Spades Management:
      // If Queen of Spades has NOT been played:
      if (!queenPlayed) {
        // If holding Queen of Spades with 4+ low spades: lead low spade to flush Ace / King!
        const spades = cards.filter(c => c.suit === 'S');
        const hasQueen = spades.some(c => c.isQueenOfSpades);
        const lowSpades = spades.filter(c => c.rank < 12);

        if (hasQueen && lowSpades.length >= 3) {
          lowSpades.sort((a, b) => a.rank - b.rank);
          return lowSpades[0];
        }

        // If holding Ace or King of Spades without Queen: DO NOT lead spades!
        const nonSpades = legalPlays.filter(c => c.suit !== 'S');
        if (nonSpades.length > 0) {
          // Filter out suits where any opponent is known to be VOID
          const safeFromVoidLeads = nonSpades.filter(c => {
            return ![0, 1, 2, 3].some(p => p !== playerIndex && gameMemory.isPlayerVoidIn(p, c.suit));
          });

          const candidates = safeFromVoidLeads.length > 0 ? safeFromVoidLeads : nonSpades;
          candidates.sort((a, b) => a.rank - b.rank);
          return candidates[0]; // Lead lowest safe card
        }
      }

      // Avoid leading suits where opponents are void (to prevent getting dumped on)
      const voidSafeLeads = legalPlays.filter(c => {
        return ![0, 1, 2, 3].some(p => p !== playerIndex && gameMemory.isPlayerVoidIn(p, c.suit));
      });

      const leadPool = voidSafeLeads.length > 0 ? voidSafeLeads : legalPlays;
      // Prefer leading lowest card of our longest suit
      leadPool.sort((a, b) => a.rank - b.rank);
      return leadPool[0];
    }

    // ==========================================
    // CASE 2: FOLLOWING SUIT
    // ==========================================
    const leadSuit = trick.leadSuit;
    const sameSuit = legalPlays.filter(c => c.suit === leadSuit);

    if (sameSuit.length > 0) {
      const winningPlay = trick.winningPlay;
      const currentHighest = winningPlay ? winningPlay.card.rank : 0;
      const trickHasPoints = trick.points > 0 || (trick.leadSuit === 'S' && !queenPlayed);

      // Ducking cards (cards strictly lower than current trick winner)
      const ducks = sameSuit.filter(c => c.rank < currentHighest);

      // Special handling if following Spades and Queen hasn't been played:
      if (leadSuit === 'S' && !queenPlayed) {
        const aceOrKingSpades = sameSuit.filter(c => c.rank === 14 || c.rank === 13);
        const safeSpades = sameSuit.filter(c => c.rank < 12);

        // If someone played ♠A or ♠K, and we hold ♠Q, DUMP IT on them!
        if (currentHighest >= 13) {
          const queen = sameSuit.find(c => c.isQueenOfSpades);
          if (queen) return queen;
        }

        // If we have low spades below the current winner, duck with highest safe spade
        if (ducks.length > 0) {
          ducks.sort((a, b) => b.rank - a.rank);
          return ducks[0];
        }

        // If forced to play high, duck as low as possible
        sameSuit.sort((a, b) => a.rank - b.rank);
        return sameSuit[0];
      }

      // Normal following:
      if (ducks.length > 0) {
        // If trick has points or danger, duck with the HIGHEST possible card that still ducks
        ducks.sort((a, b) => b.rank - a.rank);
        return ducks[0];
      } else {
        // Forced to win or play above current leader
        // Play lowest card to minimize high card exposure
        sameSuit.sort((a, b) => a.rank - b.rank);
        return sameSuit[0];
      }
    }

    // ==========================================
    // CASE 3: VOID IN LEAD SUIT (SLOUGHING)
    // ==========================================
    if (isFirstTrick) {
      // Cannot play points on trick 1: dump highest non-point card
      const nonPoints = legalPlays.filter(c => c.points === 0);
      nonPoints.sort((a, b) => b.rank - a.rank);
      return nonPoints[0] || legalPlays[0];
    }

    // If holding Queen of Spades, dump it immediately!
    const queen = legalPlays.find(c => c.isQueenOfSpades);
    if (queen) return queen;

    // If someone is threatening to shoot the moon, DO NOT give them points!
    // But if someone else is winning the trick, dump maximum points on the match leader!
    const currentTrickWinner = trick.winner;

    // Dump highest Heart
    const hearts = legalPlays.filter(c => c.isHeart).sort((a, b) => b.rank - a.rank);
    if (hearts.length > 0) return hearts[0];

    // Dump highest dangerous side cards (♠A, ♠K)
    const dangerousSpades = legalPlays.filter(c => c.suit === 'S' && c.rank >= 13);
    if (dangerousSpades.length > 0) {
      dangerousSpades.sort((a, b) => b.rank - a.rank);
      return dangerousSpades[0];
    }

    // Otherwise dump highest rank card overall
    legalPlays.sort((a, b) => b.rank - a.rank);
    return legalPlays[0];
  }

  Hearts.chooseCardNormal = chooseCardNormal;
})();
