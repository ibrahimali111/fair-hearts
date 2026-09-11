/**
 * ui.js - User Interface Controller, Vector SVG Cards & Authentic Audio for Fair Hearts
 * Namespace: window.Hearts
 */
(function() {
  window.Hearts = window.Hearts || {};
  const Hearts = window.Hearts;

  const PLAYER_NAMES = ['You (South)', 'West (Bot 1)', 'North (Bot 2)', 'East (Bot 3)'];
  const PLAYER_POSITIONS = ['south', 'west', 'north', 'east'];

  // ==========================================
  // AUTHENTIC CARD SOUND MANAGER
  // (Uses Kenney Casino Audio pack with fallbacks)
  // ==========================================
  class SoundManager {
    constructor() {
      this.enabled = true;
      this.audioPool = {};
      this.preloadAudio();
    }

    preloadAudio() {
      const files = [
        'card-place-1.ogg', 'card-place-2.ogg', 'card-place-3.ogg', 'card-place-4.ogg',
        'card-slide-1.ogg', 'card-slide-2.ogg', 'card-slide-3.ogg',
        'card-shove-1.ogg', 'card-shove-2.ogg', 'card-shove-3.ogg',
        'card-shuffle.ogg'
      ];
      files.forEach(f => {
        try {
          const a = new Audio(`assets/audio/${f}`);
          a.preload = 'auto';
          this.audioPool[f] = a;
        } catch (e) {}
      });
    }

    playRandom(list, volume = 0.6) {
      if (!this.enabled) return;
      try {
        const pick = list[Math.floor(Math.random() * list.length)];
        let audio = this.audioPool[pick];
        if (!audio) {
          audio = new Audio(`assets/audio/${pick}`);
          this.audioPool[pick] = audio;
        }
        audio.currentTime = 0;
        audio.volume = volume;
        audio.play().catch(() => {});
      } catch (e) {}
    }

    playCardSnap() {
      this.playRandom(['card-place-1.ogg', 'card-place-2.ogg', 'card-place-3.ogg', 'card-place-4.ogg'], 0.7);
    }

    playCardSlide() {
      this.playRandom(['card-slide-1.ogg', 'card-slide-2.ogg', 'card-slide-3.ogg'], 0.5);
    }

    playTrickSweep() {
      this.playRandom(['card-shove-1.ogg', 'card-shove-2.ogg', 'card-shove-3.ogg'], 0.65);
    }

    playShuffle() {
      if (!this.enabled) return;
      try {
        const audio = this.audioPool['card-shuffle.ogg'] || new Audio('assets/audio/card-shuffle.ogg');
        audio.currentTime = 0;
        audio.volume = 0.55;
        audio.play().catch(() => {});
      } catch (e) {}
    }

    playHeartsBroken() {
      if (!this.enabled) return;
      // Synthesize dramatic bell chime for hearts broken
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const notes = [440, 415, 370];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
          gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.1);
          osc.stop(ctx.currentTime + idx * 0.1 + 0.3);
        });
      } catch (e) {}
    }

    playChime() {
      if (!this.enabled) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.08 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.35);
        });
      } catch (e) {}
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

      // Player station score badges (next to name tags)
      this.playerScoreBadges = {
        0: document.getElementById('badge-score-south'),
        1: document.getElementById('badge-score-west'),
        2: document.getElementById('badge-score-north'),
        3: document.getElementById('badge-score-east')
      };

      // Pass control panel
      this.passPanel = document.getElementById('pass-control-panel');
      this.passInstruction = document.getElementById('pass-instruction');
      this.passDirIcon = document.getElementById('pass-dir-icon');
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

      // Memory & Reset buttons and stats
      this.btnResetMatch = document.getElementById('btn-reset-match');
      this.btnResetRecords = document.getElementById('btn-reset-records');
      this.statMatchesPlayed = document.getElementById('stat-matches-played');
      this.statMatchesWon = document.getElementById('stat-matches-won');
      this.statRoundsPlayed = document.getElementById('stat-rounds-played');
      this.statBestScore = document.getElementById('stat-best-score');

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
        this.sound.playShuffle();
        this.selectedCardsForPass.clear();
        this.updatePassButtonState();
        this.updateCardLegalStates();
        let dirArrow = '◀';
        if (direction === 'right') dirArrow = '▶';
        else if (direction === 'across') dirArrow = '▲';
        else if (direction === 'none') dirArrow = '—';
        if (this.passDirIcon) this.passDirIcon.textContent = dirArrow;
        this.passInstruction.innerHTML = `<span class="pass-dir-icon">${dirArrow}</span> Pass 3 cards ${direction.toUpperCase()}`;
        this.passPanel.classList.add('visible');
        this.passDirBadge.textContent = `Pass ${direction}`;
        this.roundBadge.textContent = `Round ${roundNumber}`;
      });

      this.game.setCallback('onPassPhaseComplete', ({ passed, received, direction }) => {
        this.passPanel.classList.remove('visible');
        const rList = received.map(c => c.toString()).join(', ');
        this.showToast(`Received from ${direction}: ${rList}`);
        this.sound.playCardSlide();
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
      this.btnConfirmPass.addEventListener('click', () => {
        if (this.selectedCardsForPass.size === 3) {
          this.sound.playCardSlide();
          this.game.executePass(Array.from(this.selectedCardsForPass));
        }
      });

      this.btnAutoPass.addEventListener('click', () => {
        const autoPicks = Hearts.selectCardsToPass(this.game.hands[0]);
        this.selectedCardsForPass.clear();
        autoPicks.forEach(c => this.selectedCardsForPass.add(c.id));
        this.updateHumanCardSelectionClasses();
        this.updatePassButtonState();
        this.sound.playCardSlide();
      });

      this.btnNextRound.addEventListener('click', () => {
        this.roundModal.classList.remove('open');
        this.resetTableForNewRound();
        this.game.startNewRound();
      });

      this.btnPlayAgain.addEventListener('click', () => {
        this.gameOverModal.classList.remove('open');
        this.resetTableForNewRound();
        this.game.startNewGame(this.difficultySelect.value);
      });

      this.btnSettings.addEventListener('click', () => {
        this.updateStatsModal();
        this.settingsModal.classList.add('open');
      });
      this.btnCloseSettings.addEventListener('click', () => {
        this.settingsModal.classList.remove('open');
      });

      this.btnProof.addEventListener('click', () => {
        this.proofModal.classList.add('open');
      });
      this.btnCloseProof.addEventListener('click', () => {
        this.proofModal.classList.remove('open');
      });

      // Synchronize settings from saved game data
      if (this.difficultySelect) {
        this.difficultySelect.value = this.game.difficulty || 'normal';
      }
      const savedSound = localStorage.getItem('fair_hearts_sound');
      if (savedSound !== null) {
        this.sound.enabled = (savedSound === 'true');
        if (this.soundCheckbox) this.soundCheckbox.checked = this.sound.enabled;
      }

      this.difficultySelect.addEventListener('change', (e) => {
        this.game.setDifficulty(e.target.value);
        this.showToast(`AI Difficulty set to: ${e.target.value.toUpperCase()}`);
      });

      // Synchronize speed setting from saved game data
      const savedSpeed = localStorage.getItem('fair_hearts_speed') || 'normal';
      if (this.speedSelect) {
        this.speedSelect.value = savedSpeed;
        if (savedSpeed === 'fast') this.game.botDelayMs = 650;
        else if (savedSpeed === 'relaxed') this.game.botDelayMs = 1800;
        else this.game.botDelayMs = 1250;
      }

      this.speedSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        localStorage.setItem('fair_hearts_speed', val);
        if (val === 'fast') {
          this.game.botDelayMs = 650;
          this.showToast('Speed: Fast (0.65s per move)');
        } else if (val === 'relaxed') {
          this.game.botDelayMs = 1800;
          this.showToast('Speed: Relaxed (1.8s per move)');
        } else {
          this.game.botDelayMs = 1250;
          this.showToast('Speed: Normal (1.25s per move)');
        }
      });

      this.soundCheckbox.addEventListener('change', (e) => {
        this.sound.enabled = e.target.checked;
        localStorage.setItem('fair_hearts_sound', e.target.checked);
      });

      if (this.btnResetMatch) {
        this.btnResetMatch.addEventListener('click', () => this.handleResetRequest());
      }
      if (this.btnResetRecords) {
        this.btnResetRecords.addEventListener('click', () => this.handleResetRequest());
      }

      const vibeBadge = document.getElementById('badge-vibe-coding');
      if (vibeBadge) {
        vibeBadge.addEventListener('click', () => {
          this.showToast('🚀 100% Original Idea • Vibe Coded with AI!');
          this.sound.playChime();
        });
      }
    }

    // ==========================================
    // VECTOR SVG CARD RENDERING
    // ==========================================
    createCardDom(card, isFaceDown = false) {
      const el = document.createElement('div');
      el.className = 'card';
      el.dataset.id = card ? card.id : '';

      const img = document.createElement('img');
      img.className = 'card-img';
      img.draggable = false;

      if (isFaceDown || !card) {
        el.classList.add('face-down');
        img.src = 'assets/cards/back.svg';
        img.alt = 'Card Back';
      } else {
        img.src = card.svgPath;
        img.alt = card.fullName;

        // Visual point badge helper
        if (card.isQueenOfSpades) {
          const badge = document.createElement('span');
          badge.className = 'card-point-badge badge-queen';
          badge.textContent = '13 pts';
          el.appendChild(badge);
        } else if (card.isHeart) {
          const badge = document.createElement('span');
          badge.className = 'card-point-badge badge-heart';
          badge.textContent = '1 pt';
          el.appendChild(badge);
        }
      }

      el.appendChild(img);
      return el;
    }

    renderHumanHand(hand) {
      this.humanHandEl.innerHTML = '';
      if (!hand || !hand.cards) return;

      const totalCards = hand.cards.length;
      // Staggered two-tier layout (matching mobile card game UI: e.g. 6 top, 7 bottom)
      if (totalCards > 6) {
        const splitIndex = Math.floor(totalCards / 2);
        const topCards = hand.cards.slice(0, splitIndex);
        const bottomCards = hand.cards.slice(splitIndex);

        const rowTop = document.createElement('div');
        rowTop.className = 'hand-row row-top';

        const rowBottom = document.createElement('div');
        rowBottom.className = 'hand-row row-bottom';

        topCards.forEach((card, index) => {
          const cardEl = this.createCardDom(card);
          cardEl.classList.add('anim-deal', 'in-row-top');
          cardEl.style.zIndex = index + 1;
          cardEl.addEventListener('click', () => {
            this.handleHumanCardClick(card);
          });
          rowTop.appendChild(cardEl);
        });

        bottomCards.forEach((card, index) => {
          const cardEl = this.createCardDom(card);
          cardEl.classList.add('anim-deal', 'in-row-bottom');
          cardEl.style.zIndex = index + 15;
          cardEl.addEventListener('click', () => {
            this.handleHumanCardClick(card);
          });
          rowBottom.appendChild(cardEl);
        });

        this.humanHandEl.appendChild(rowTop);
        this.humanHandEl.appendChild(rowBottom);
      } else {
        // 6 or fewer cards - centered single row
        const rowSingle = document.createElement('div');
        rowSingle.className = 'hand-row row-single';

        hand.cards.forEach((card, index) => {
          const cardEl = this.createCardDom(card);
          cardEl.classList.add('anim-deal', 'in-row-bottom');
          cardEl.style.zIndex = index + 1;
          cardEl.addEventListener('click', () => {
            this.handleHumanCardClick(card);
          });
          rowSingle.appendChild(cardEl);
        });

        this.humanHandEl.appendChild(rowSingle);
      }

      this.updateCardLegalStates();
      this.updateHumanCardSelectionClasses();
    }

    handleHumanCardClick(card) {
      if (this.game.passPhaseActive) {
        if (this.selectedCardsForPass.has(card.id)) {
          this.selectedCardsForPass.delete(card.id);
        } else {
          if (this.selectedCardsForPass.size < 3) {
            this.selectedCardsForPass.add(card.id);
          }
        }
        this.sound.playCardSnap();
        this.updateHumanCardSelectionClasses();
        this.updatePassButtonState();
        return;
      }

      if (this.game.isWaitingForHuman) {
        const played = this.game.humanPlayCard(card.id);
        if (played) {
          this.updateCardLegalStates();
        }
      }
    }

    updateCardLegalStates() {
      const cardEls = this.humanHandEl.querySelectorAll('.card');
      const isMyTurn = (this.game.currentTurn === 0 && !this.game.passPhaseActive);

      // Fallback calculation if legal plays array is not cached
      let legalList = this.currentLegalPlays;
      if (isMyTurn && (!legalList || legalList.length === 0) && this.game.hands[0]) {
        legalList = Hearts.getLegalPlays(
          this.game.hands[0],
          this.game.currentTrick,
          this.game.gameMemory.heartsBroken,
          this.game.trickNumber === 1
        );
        this.currentLegalPlays = legalList;
      }

      cardEls.forEach(el => {
        const id = el.dataset.id;
        el.classList.remove('is-legal', 'is-illegal', 'waiting-turn');

        if (this.game.passPhaseActive) {
          // In passing phase, all cards are selectable
          el.classList.remove('is-illegal', 'waiting-turn');
        } else if (isMyTurn && legalList && legalList.length > 0) {
          const isLegal = legalList.some(c => c.id === id);
          if (isLegal) {
            el.classList.add('is-legal');
          } else {
            el.classList.add('is-illegal'); // GRAYED OUT & DARKENED
          }
        } else {
          // Waiting for other bots to play
          el.classList.add('waiting-turn');
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
      this.btnConfirmPass.innerHTML = count === 3
        ? '<span class="btn-text-desktop">Confirm Pass (3)</span><span class="btn-text-mobile">Pass (3)</span>'
        : `<span class="btn-text-desktop">Select 3 cards (${count}/3)</span><span class="btn-text-mobile">Pass (${count}/3)</span>`;
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
          const station = this.playerTags[p].closest('.player-station');
          if (p === playerIndex) {
            this.playerTags[p].classList.add('is-active-turn');
            if (station) station.classList.add('is-active-turn');
          } else {
            this.playerTags[p].classList.remove('is-active-turn');
            if (station) station.classList.remove('is-active-turn');
          }
        }
      }
    }

    renderTrickCard(playerIndex, card) {
      const slot = this.trickSlots[playerIndex];
      if (!slot) return;
      slot.innerHTML = '';
      const cardEl = this.createCardDom(card);
      cardEl.classList.add('anim-played', `toss-from-${playerIndex}`);
      slot.appendChild(cardEl);
    }

    sweepTrick(winnerIndex) {
      for (let p = 0; p < 4; p++) {
        const slot = this.trickSlots[p];
        if (slot && slot.firstElementChild) {
          slot.firstElementChild.className = `card sweep-to-${winnerIndex}`;
        }
      }

      // Celebratory bounce & gold pulse on winner player tag
      const winnerTag = this.playerTags[winnerIndex];
      if (winnerTag) {
        winnerTag.classList.remove('winner-tag-bounce');
        void winnerTag.offsetWidth; // Force CSS reflow to re-trigger animation
        winnerTag.classList.add('winner-tag-bounce');
        setTimeout(() => {
          if (winnerTag) winnerTag.classList.remove('winner-tag-bounce');
        }, 750);
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
      const roundPts = this.game.currentRoundPoints || [0, 0, 0, 0];
      let minScore = Math.min(...scores);

      for (let p = 0; p < 4; p++) {
        // Update bottom persistent footer scoreboard
        if (this.scoreboardPoints[p]) {
          this.scoreboardPoints[p].textContent = scores[p];
          const cell = this.scoreboardPoints[p].closest('.score-cell');
          if (cell) {
            if (scores[p] === minScore) cell.classList.add('is-leader');
            else cell.classList.remove('is-leader');
          }
        }

        // Update player station score badge
        if (this.playerScoreBadges && this.playerScoreBadges[p]) {
          const matchScore = scores[p] || 0;
          const penalty = roundPts[p] || 0;
          if (penalty > 0) {
            this.playerScoreBadges[p].innerHTML = `${matchScore} pts <span class="round-penalty-tag">+${penalty}</span>`;
          } else {
            this.playerScoreBadges[p].textContent = `${matchScore} pts`;
          }
        }
      }

      this.updateStatsModal();
    }

    updateStatsModal() {
      const stats = this.game.stats || {};
      if (this.statMatchesPlayed) this.statMatchesPlayed.textContent = stats.matchesPlayed || 0;
      if (this.statMatchesWon) this.statMatchesWon.textContent = stats.matchesWon || 0;
      if (this.statRoundsPlayed) this.statRoundsPlayed.textContent = stats.roundsPlayed || 0;
      if (this.statBestScore) {
        this.statBestScore.textContent = (stats.bestScore !== null && stats.bestScore !== undefined)
          ? `${stats.bestScore} pts`
          : '--';
      }
    }

    handleResetRequest() {
      const confirmed = window.confirm("Reset match scores and saved lifetime records? This will start a fresh match.");
      if (!confirmed) return;

      if (this.settingsModal) this.settingsModal.classList.remove('open');
      if (this.roundModal) this.roundModal.classList.remove('open');
      if (this.gameOverModal) this.gameOverModal.classList.remove('open');
      this.resetTableForNewRound();
      this.game.resetMemory();
      this.updateScoreboard();
      this.showToast('🧹 Match scores and records reset!');
      this.sound.playShuffle();
    }

    showToast(message) {
      this.tableToast.textContent = message;
      this.tableToast.classList.add('visible');
      clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => {
        this.tableToast.classList.remove('visible');
      }, 2200);
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
