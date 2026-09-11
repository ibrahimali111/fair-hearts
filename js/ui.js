/**
 * ui.js - User Interface Controller, DOM Rendering & Audio Synthesis for Fair Hearts
 * Namespace: window.Hearts
 */
(function() {
  window.Hearts = window.Hearts || {};
  const Hearts = window.Hearts;

  const PLAYER_NAMES = ['You (South)', 'West (Bot 1)', 'North (Bot 2)', 'East (Bot 3)'];
  const PLAYER_POSITIONS = ['south', 'west', 'north', 'east'];

  // ==========================================
  // WEB AUDIO API SOUND SYNTHESIZER
  // (Zero external mp3 files required!)
  // ==========================================
  class SoundManager {
    constructor() {
      this.ctx = null;
      this.enabled = true;
    }

    init() {
      if (!this.ctx && typeof AudioContext !== 'undefined') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
    }

    playCardSnap() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    }

    playTrickSweep() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(480, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    }

    playHeartsBroken() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const notes = [440, 415, 370]; // Ominous descent
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.12);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.12 + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + idx * 0.12);
        osc.stop(this.ctx.currentTime + idx * 0.12 + 0.25);
      });
    }

    playChime() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + idx * 0.08);
        osc.stop(this.ctx.currentTime + idx * 0.08 + 0.35);
      });
    }
  }

  // ==========================================
  // DOM UI MANAGER
  // ==========================================
  class UIManager {
    constructor(game) {
      this.game = game;
      this.sound = new SoundManager();
      this.selectedCardsForPass = new Set();
      this.currentLegalPlays = [];

      this.initDomReferences();
      this.bindGameEvents();
      this.bindUserInteractions();
    }

    initDomReferences() {
      // Containers
      this.humanHandEl = document.getElementById('human-hand');
      this.trickSlots = {
        0: document.getElementById('slot-south'),
        1: document.getElementById('slot-west'),
        2: document.getElementById('slot-north'),
        3: document.getElementById('slot-east')
      };
      this.playerTags = {
        0: document.getElementById('tag-south'),
        1: document.getElementById('tag-west'),
        2: document.getElementById('tag-north'),
        3: document.getElementById('tag-east')
      };
      this.botCardCounts = {
        1: document.getElementById('count-west'),
        2: document.getElementById('count-north'),
        3: document.getElementById('count-east')
      };

      // Header & Badges
      this.roundBadge = document.getElementById('badge-round');
      this.passDirBadge = document.getElementById('badge-pass-dir');
      this.heartsStatusBadge = document.getElementById('badge-hearts-status');
      this.tableToast = document.getElementById('table-toast');

      // Scoreboard cells
      this.scoreboardPoints = {
        0: document.getElementById('score-south'),
        1: document.getElementById('score-west'),
        2: document.getElementById('score-north'),
        3: document.getElementById('score-east')
      };

      // Pass control panel
      this.passPanel = document.getElementById('pass-control-panel');
      this.passInstruction = document.getElementById('pass-instruction');
      this.btnConfirmPass = document.getElementById('btn-confirm-pass');
      this.btnAutoPass = document.getElementById('btn-auto-pass');

      // Modals
      this.roundModal = document.getElementById('modal-round-end');
      this.roundScoreTbody = document.getElementById('round-score-tbody');
      this.btnNextRound = document.getElementById('btn-next-round');

      this.gameOverModal = document.getElementById('modal-game-over');
      this.gameOverTbody = document.getElementById('game-over-tbody');
      this.btnPlayAgain = document.getElementById('btn-play-again');

      this.settingsModal = document.getElementById('modal-settings');
      this.btnSettings = document.getElementById('btn-settings');
      this.btnCloseSettings = document.getElementById('btn-close-settings');
      this.difficultySelect = document.getElementById('select-difficulty');
      this.speedSelect = document.getElementById('select-speed');
      this.soundCheckbox = document.getElementById('checkbox-sound');

      this.proofModal = document.getElementById('modal-proof');
      this.btnProof = document.getElementById('btn-proof');
      this.btnCloseProof = document.getElementById('btn-close-proof');
    }

    bindGameEvents() {
      this.game.setCallback('onHandUpdated', (hands) => {
        this.renderHumanHand(hands[0]);
        this.updateBotCardCounts(hands);
      });

      this.game.setCallback('onTurnChange', ({ player, trickNumber, legalPlays }) => {
        this.highlightActiveTurn(player);
        this.currentLegalPlays = legalPlays || [];
        this.updateCardLegalStates();
      });

      this.game.setCallback('onCardPlayed', ({ player, card, trick }) => {
        this.sound.playCardSnap();
        this.renderTrickCard(player, card);
      });

      this.game.setCallback('onTrickComplete', ({ trick, winner, points }) => {
        const winnerName = PLAYER_NAMES[winner];
        const ptsText = points > 0 ? ` (+${points} pts)` : '';
        this.showToast(`${winnerName} takes the trick${ptsText}!`);

        setTimeout(() => {
          this.sweepTrick(winner);
          this.sound.playTrickSweep();
        }, 500);
      });

      this.game.setCallback('onHeartsBroken', () => {
        this.sound.playHeartsBroken();
        this.heartsStatusBadge.textContent = '♥ Broken!';
        this.heartsStatusBadge.className = 'status-chip hearts-broken';
        this.showToast('Hearts have been broken! ♥');
        document.body.classList.add('hearts-broken-alert');
        setTimeout(() => document.body.classList.remove('hearts-broken-alert'), 1000);
      });

      this.game.setCallback('onPassPhaseStart', ({ direction, roundNumber }) => {
        this.selectedCardsForPass.clear();
        this.updatePassButtonState();
        this.passInstruction.textContent = `Select 3 cards to pass ${direction.toUpperCase()}`;
        this.passPanel.classList.add('visible');
        this.passDirBadge.textContent = `Pass ${direction}`;
        this.roundBadge.textContent = `Round ${roundNumber}`;
      });

      this.game.setCallback('onPassPhaseComplete', ({ passed, received, direction }) => {
        this.passPanel.classList.remove('visible');
        const rList = received.map(c => c.toString()).join(', ');
        this.showToast(`Received from ${direction}: ${rList}`);
        this.sound.playChime();
      });

      this.game.setCallback('onRoundComplete', (summary) => {
        this.renderRoundSummary(summary);
      });

      this.game.setCallback('onGameOver', (winnerInfo) => {
        this.renderGameOver(winnerInfo);
      });

      this.game.setCallback('onMessage', (msg) => {
        this.showToast(msg);
      });
    }

    bindUserInteractions() {
      // Confirm pass click
      this.btnConfirmPass.addEventListener('click', () => {
        if (this.selectedCardsForPass.size === 3) {
          this.game.executePass(Array.from(this.selectedCardsForPass));
        }
      });

      // Auto-pick safe pass click
      this.btnAutoPass.addEventListener('click', () => {
        const autoPicks = Hearts.selectCardsToPass(this.game.hands[0]);
        this.selectedCardsForPass.clear();
        autoPicks.forEach(c => this.selectedCardsForPass.add(c.id));
        this.updateHumanCardSelectionClasses();
        this.updatePassButtonState();
      });

      // Next round click
      this.btnNextRound.addEventListener('click', () => {
        this.roundModal.classList.remove('open');
        this.resetTableForNewRound();
        this.game.startNewRound();
      });

      // Rematch / Play Again
      this.btnPlayAgain.addEventListener('click', () => {
        this.gameOverModal.classList.remove('open');
        this.resetTableForNewRound();
        this.game.startNewGame(this.difficultySelect.value);
      });

      // Settings Modal
      this.btnSettings.addEventListener('click', () => {
        this.settingsModal.classList.add('open');
      });
      this.btnCloseSettings.addEventListener('click', () => {
        this.settingsModal.classList.remove('open');
      });

      // Proof / Zero Bias Modal
      this.btnProof.addEventListener('click', () => {
        this.proofModal.classList.add('open');
      });
      this.btnCloseProof.addEventListener('click', () => {
        this.proofModal.classList.remove('open');
      });

      // Difficulty change
      this.difficultySelect.addEventListener('change', (e) => {
        this.game.difficulty = e.target.value;
        this.showToast(`AI Difficulty set to: ${e.target.value.toUpperCase()}`);
      });

      // Speed change
      this.speedSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'fast') this.game.botDelayMs = 280;
        else if (val === 'relaxed') this.game.botDelayMs = 1100;
        else this.game.botDelayMs = 600;
      });

      // Sound toggle
      this.soundCheckbox.addEventListener('change', (e) => {
        this.sound.enabled = e.target.checked;
      });
    }

    // ==========================================
    // RENDERING HELPERS
    // ==========================================
    createCardDom(card, isFaceDown = false) {
      const el = document.createElement('div');
      el.className = `card suit-${card.suit}`;
      el.dataset.id = card.id;

      if (isFaceDown) {
        el.classList.add('face-down');
        return el;
      }

      if (card.isQueenOfSpades) el.classList.add('is-queen-spades');
      if (card.isHeart) el.classList.add('is-heart');

      // Top-Left Corner
      const cornerTL = document.createElement('div');
      cornerTL.className = 'card-corner top-left';
      cornerTL.innerHTML = `<span class="card-rank">${card.rankName}</span><span class="card-suit-small">${card.symbol}</span>`;

      // Center
      const center = document.createElement('div');
      center.className = 'card-center';
      center.innerHTML = `<span class="suit-symbol">${card.symbol}</span>`;

      // Bottom-Right Corner (Rotated 180deg)
      const cornerBR = document.createElement('div');
      cornerBR.className = 'card-corner bottom-right';
      cornerBR.innerHTML = `<span class="card-rank">${card.rankName}</span><span class="card-suit-small">${card.symbol}</span>`;

      el.appendChild(cornerTL);
      el.appendChild(center);
      el.appendChild(cornerBR);

      return el;
    }

    renderHumanHand(hand) {
      this.humanHandEl.innerHTML = '';
      if (!hand || !hand.cards) return;

      hand.cards.forEach((card, index) => {
        const cardEl = this.createCardDom(card);
        cardEl.classList.add('interactive', 'anim-deal');
        cardEl.style.zIndex = index + 1;

        cardEl.addEventListener('click', () => {
          this.handleHumanCardClick(card);
        });

        this.humanHandEl.appendChild(cardEl);
      });

      this.updateCardLegalStates();
      this.updateHumanCardSelectionClasses();
    }

    handleHumanCardClick(card) {
      if (this.game.passPhaseActive) {
        // Toggle selection for passing
        if (this.selectedCardsForPass.has(card.id)) {
          this.selectedCardsForPass.delete(card.id);
        } else {
          if (this.selectedCardsForPass.size < 3) {
            this.selectedCardsForPass.add(card.id);
          }
        }
        this.updateHumanCardSelectionClasses();
        this.updatePassButtonState();
        return;
      }

      // Playing phase
      if (this.game.isWaitingForHuman) {
        this.game.humanPlayCard(card.id);
      }
    }

    updateCardLegalStates() {
      const cardEls = this.humanHandEl.querySelectorAll('.card');
      const isMyTurn = (this.game.currentTurn === 0 && this.game.isWaitingForHuman && !this.game.passPhaseActive);

      cardEls.forEach(el => {
        const id = el.dataset.id;
        el.classList.remove('is-legal', 'is-illegal');

        if (isMyTurn) {
          const isLegal = this.currentLegalPlays.some(c => c.id === id);
          if (isLegal) {
            el.classList.add('is-legal');
          } else {
            el.classList.add('is-illegal');
          }
        }
      });
    }

    updateHumanCardSelectionClasses() {
      const cardEls = this.humanHandEl.querySelectorAll('.card');
      cardEls.forEach(el => {
        if (this.selectedCardsForPass.has(el.dataset.id)) {
          el.classList.add('is-selected');
        } else {
          el.classList.remove('is-selected');
        }
      });
    }

    updatePassButtonState() {
      const count = this.selectedCardsForPass.size;
      this.btnConfirmPass.disabled = (count !== 3);
      this.btnConfirmPass.textContent = count === 3 ? 'Confirm Pass (3)' : `Select 3 cards (${count}/3)`;
    }

    updateBotCardCounts(hands) {
      for (let p = 1; p <= 3; p++) {
        if (this.botCardCounts[p] && hands[p]) {
          this.botCardCounts[p].textContent = `${hands[p].count} cards`;
        }
      }
    }

    highlightActiveTurn(playerIndex) {
      for (let p = 0; p < 4; p++) {
        if (this.playerTags[p]) {
          if (p === playerIndex) {
            this.playerTags[p].classList.add('is-active-turn');
          } else {
            this.playerTags[p].classList.remove('is-active-turn');
          }
        }
      }
    }

    renderTrickCard(playerIndex, card) {
      const slot = this.trickSlots[playerIndex];
      if (!slot) return;
      slot.innerHTML = '';
      const cardEl = this.createCardDom(card);
      cardEl.classList.add('anim-played');
      slot.appendChild(cardEl);
    }

    sweepTrick(winnerIndex) {
      for (let p = 0; p < 4; p++) {
        const slot = this.trickSlots[p];
        if (slot && slot.firstElementChild) {
          slot.firstElementChild.className = `card sweep-to-${winnerIndex}`;
        }
      }

      setTimeout(() => {
        for (let p = 0; p < 4; p++) {
          if (this.trickSlots[p]) this.trickSlots[p].innerHTML = '';
        }
        this.updateScoreboard();
      }, 480);
    }

    updateScoreboard() {
      const scores = this.game.scorer.cumulativeScores;
      let minScore = Math.min(...scores);

      for (let p = 0; p < 4; p++) {
        if (this.scoreboardPoints[p]) {
          this.scoreboardPoints[p].textContent = scores[p];
          const cell = this.scoreboardPoints[p].closest('.score-cell');
          if (cell) {
            if (scores[p] === minScore) cell.classList.add('is-leader');
            else cell.classList.remove('is-leader');
          }
        }
      }
    }

    showToast(message) {
      this.tableToast.textContent = message;
      this.tableToast.classList.add('visible');
      clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => {
        this.tableToast.classList.remove('visible');
      }, 2400);
    }

    resetTableForNewRound() {
      for (let p = 0; p < 4; p++) {
        if (this.trickSlots[p]) this.trickSlots[p].innerHTML = '';
      }
      this.heartsStatusBadge.textContent = '♥ Locked';
      this.heartsStatusBadge.className = 'status-chip hearts-locked';
      this.updateScoreboard();
    }

    renderRoundSummary(summary) {
      this.roundScoreTbody.innerHTML = '';

      PLAYER_NAMES.forEach((name, idx) => {
        const tr = document.createElement('tr');
        const captured = summary.capturedPoints[idx];
        const finalPts = summary.finalRoundPoints[idx];
        const total = summary.cumulativeScores[idx];

        tr.innerHTML = `
          <td>${name}</td>
          <td>${captured}</td>
          <td class="highlight">+${finalPts}</td>
          <td><strong>${total}</strong></td>
        `;
        this.roundScoreTbody.appendChild(tr);
      });

      if (summary.shotTheMoon) {
        this.sound.playChime();
        this.showToast(`🚀 ${PLAYER_NAMES[summary.moonShooter]} SHOT THE MOON! +26 to all others!`);
      }

      if (summary.isGameOver) {
        this.btnNextRound.style.display = 'none';
      } else {
        this.btnNextRound.style.display = 'block';
        this.roundModal.classList.add('open');
      }
    }

    renderGameOver(winnerInfo) {
      this.roundModal.classList.remove('open');
      this.gameOverTbody.innerHTML = '';

      const rankings = this.game.scorer.getRankings();
      rankings.forEach((entry, rank) => {
        const tr = document.createElement('tr');
        const medal = rank === 0 ? '🥇 1st' : (rank === 1 ? '🥈 2nd' : (rank === 2 ? '🥉 3rd' : '4th'));
        tr.innerHTML = `
          <td><strong>${medal}</strong></td>
          <td>${PLAYER_NAMES[entry.player]}</td>
          <td class="highlight"><strong>${entry.score} pts</strong></td>
        `;
        this.gameOverTbody.appendChild(tr);
      });

      this.sound.playChime();
      this.gameOverModal.classList.add('open');
    }
  }

  Hearts.UIManager = UIManager;
})();
