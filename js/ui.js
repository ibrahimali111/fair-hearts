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
      this.botHandContainers = {
        1: document.getElementById('bot-hand-1'),
        2: document.getElementById('bot-hand-2'),
        3: document.getElementById('bot-hand-3')
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
        // Delay bot hand re-render during trick play so the departing card flies smoothly before hand contracts
        if (this.game && this.game.currentTrick && this.game.currentTrick.plays.length > 0) {
          setTimeout(() => {
            this.renderBotHands(hands);
            this.updateBotCardCounts(hands);
          }, 300);
        } else {
          this.renderBotHands(hands);
          this.updateBotCardCounts(hands);
        }
      });

      this.game.setCallback('onTurnChange', ({ player, trickNumber, legalPlays }) => {
        this.highlightActiveTurn(player);
        this.currentLegalPlays = legalPlays || [];
        this.updateCardLegalStates();
      });

      this.game.setCallback('onCardPlayed', ({ player, card, trick, cardIndex }) => {
        this.animateCardPlay(player, card, cardIndex);
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
        this.animatePassExchange(passed, received, direction);
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
      const isMobile = window.innerWidth <= 768;

      // On Mobile: Use the luxury two-tier staggered layout from reference game when totalCards > 6
      if (isMobile && totalCards > 6) {
        const splitIndex = Math.floor(totalCards / 2);
        const topCards = hand.cards.slice(0, splitIndex);
        const bottomCards = hand.cards.slice(splitIndex);

        const handContainer = document.createElement('div');
        handContainer.className = 'hand-two-tier';

        const rowTop = document.createElement('div');
        rowTop.className = 'hand-row row-top';

        const rowBottom = document.createElement('div');
        rowBottom.className = 'hand-row row-bottom';

        // Gentle curve for top row
        const topCenter = (topCards.length - 1) / 2;
        topCards.forEach((card, index) => {
          const cardEl = this.createCardDom(card);
          cardEl.classList.add('anim-deal', 'in-row-top');

          const offset = topCenter > 0 ? (index - topCenter) / topCenter : 0;
          const rot = offset * 10;
          const lift = Math.abs(offset) * 5;

          cardEl.style.setProperty('--card-rot', `${rot.toFixed(2)}deg`);
          cardEl.style.setProperty('--card-lift', `${lift.toFixed(2)}px`);
          cardEl.style.zIndex = index + 1;

          cardEl.addEventListener('click', () => {
            this.handleHumanCardClick(card);
          });
          rowTop.appendChild(cardEl);
        });

        // Gentle curve for bottom row
        const botCenter = (bottomCards.length - 1) / 2;
        bottomCards.forEach((card, index) => {
          const cardEl = this.createCardDom(card);
          cardEl.classList.add('anim-deal', 'in-row-bottom');

          const offset = botCenter > 0 ? (index - botCenter) / botCenter : 0;
          const rot = offset * 12;
          const lift = Math.abs(offset) * 6;

          cardEl.style.setProperty('--card-rot', `${rot.toFixed(2)}deg`);
          cardEl.style.setProperty('--card-lift', `${lift.toFixed(2)}px`);
          cardEl.style.zIndex = index + 25; // on top of back tier

          cardEl.addEventListener('click', () => {
            this.handleHumanCardClick(card);
          });
          rowBottom.appendChild(cardEl);
        });

        handContainer.appendChild(rowTop);
        handContainer.appendChild(rowBottom);
        this.humanHandEl.appendChild(handContainer);
      } else {
        // Desktop OR 6 or fewer cards on mobile: Spacious single-row curved fan
        const fanContainer = document.createElement('div');
        fanContainer.className = 'hand-row row-fan';

        let cardOverlap = -24;
        if (totalCards <= 4) cardOverlap = 6;
        else if (totalCards <= 6) cardOverlap = -6;
        else if (totalCards <= 8) cardOverlap = -16;
        else cardOverlap = -32;

        fanContainer.style.setProperty('--hand-overlap', `${cardOverlap}px`);

        const maxRotation = totalCards > 6 ? 36 : 18;
        const liftAmount = totalCards > 6 ? 18 : 8;

        const center = (totalCards - 1) / 2;
        hand.cards.forEach((card, index) => {
          const cardEl = this.createCardDom(card);
          cardEl.classList.add('anim-deal');

          const offset = center > 0 ? (index - center) / center : 0;
          const rot = offset * (maxRotation / 2);
          const lift = Math.abs(offset) * Math.abs(offset) * liftAmount;

          cardEl.style.setProperty('--card-rot', `${rot.toFixed(2)}deg`);
          cardEl.style.setProperty('--card-lift', `${lift.toFixed(2)}px`);
          cardEl.style.zIndex = index + 1;

          cardEl.addEventListener('click', () => {
            this.handleHumanCardClick(card);
          });
          fanContainer.appendChild(cardEl);
        });

        this.humanHandEl.appendChild(fanContainer);
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

    renderBotHands(hands) {
      for (let p = 1; p <= 3; p++) {
        const container = this.botHandContainers[p];
        if (!container) continue;
        const count = (hands && hands[p]) ? hands[p].count : 0;
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
          const miniCard = document.createElement('div');
          miniCard.className = 'bot-card';
          miniCard.dataset.index = i;
          miniCard.style.zIndex = i + 1;
          const img = document.createElement('img');
          img.src = 'assets/cards/back.svg';
          img.alt = 'Card Back';
          img.draggable = false;
          miniCard.appendChild(img);
          container.appendChild(miniCard);
        }
      }
    }

    animateCardPlay(playerIndex, card, cardIndex) {
      const targetSlot = this.trickSlots[playerIndex];
      if (!targetSlot) return;

      // 1. Locate source card on screen
      let sourceEl = null;

      if (playerIndex === 0) {
        sourceEl = this.humanHandEl.querySelector(`.card[data-id="${card.id}"]`);
      } else {
        const botCards = this.botHandContainers[playerIndex]
          ? this.botHandContainers[playerIndex].querySelectorAll('.bot-card')
          : [];
        if (botCards.length > 0) {
          const idx = (cardIndex !== undefined && cardIndex >= 0 && cardIndex < botCards.length)
            ? cardIndex
            : Math.floor(botCards.length / 2);
          sourceEl = botCards[idx];
        }
      }

      // Determine starting coordinates (from source card, or fallback to player station tag)
      let startRect = null;
      if (sourceEl && sourceEl.getBoundingClientRect) {
        const r = sourceEl.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          startRect = r;
          sourceEl.style.visibility = 'hidden';
        }
      }

      if (!startRect && this.playerTags[playerIndex]) {
        const tagRect = this.playerTags[playerIndex].getBoundingClientRect();
        if (tagRect.width > 0) {
          startRect = tagRect;
        }
      }

      const targetRect = targetSlot.getBoundingClientRect();

      let targetW = targetRect.width;
      let targetH = targetRect.height;
      let targetCenterX = targetRect.left + targetRect.width / 2;
      let targetCenterY = targetRect.top + targetRect.height / 2;

      // Robust fallback if slot has 0 computed dimensions
      if (targetW === 0) {
        targetW = window.innerWidth <= 768 ? 50 : 72;
        targetH = window.innerWidth <= 768 ? 72 : 104;
        targetCenterX = targetRect.left + targetW / 2;
        targetCenterY = targetRect.top + targetH / 2;
      }

      if (!startRect) {
        this.sound.playCardSnap();
        this.renderTrickCard(playerIndex, card);
        return;
      }

      // 2. Compute FLIP coordinate deltas
      const dx = (startRect.left + startRect.width / 2) - targetCenterX;
      const dy = (startRect.top + startRect.height / 2) - targetCenterY;

      // Natural release rotation angle for each seat
      let startRot = 0;
      if (playerIndex === 0 && sourceEl && sourceEl.style.getPropertyValue('--card-rot')) {
        startRot = parseFloat(sourceEl.style.getPropertyValue('--card-rot')) || 0;
      } else if (playerIndex === 1) {
        startRot = -12; // West flick
      } else if (playerIndex === 3) {
        startRot = 12;  // East flick
      } else {
        startRot = -6;  // North flick
      }

      // 3. Build flying card element placed at destination coordinates
      const flyer = document.createElement('div');
      flyer.className = 'flying-card-sweep';
      flyer.style.left = `${(targetCenterX - targetW / 2)}px`;
      flyer.style.top = `${(targetCenterY - targetH / 2)}px`;
      flyer.style.width = `${targetW}px`;
      flyer.style.height = `${targetH}px`;
      flyer.style.zIndex = '9999';

      const img = document.createElement('img');
      img.src = card.svgPath;
      img.alt = card.fullName;
      img.draggable = false;
      flyer.appendChild(img);
      document.body.appendChild(flyer);

      this.sound.playCardSlide();

      // 4. Smooth, organic GPU-accelerated Keyframe Animation (Identical high-visibility physics for Bots & Human)
      const duration = (this.game.botDelayMs < 800) ? 280 : 360;

      const anim = flyer.animate([
        {
          transform: `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0px) scale(0.9) rotate(${startRot}deg)`,
          opacity: 1,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
          offset: 0
        },
        {
          transform: `translate3d(${(dx * 0.45).toFixed(1)}px, ${(dy * 0.45 - 28).toFixed(1)}px, 0px) scale(1.08) rotate(${(startRot * 0.3).toFixed(1)}deg)`,
          opacity: 1,
          boxShadow: '0 24px 44px rgba(0, 0, 0, 0.65)',
          offset: 0.5
        },
        {
          transform: 'translate3d(0px, 0px, 0px) scale(1) rotate(0deg)',
          opacity: 1,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          offset: 1
        }
      ], {
        duration: duration,
        easing: 'cubic-bezier(0.22, 0.9, 0.36, 1)',
        fill: 'forwards'
      });

      anim.onfinish = () => {
        flyer.remove();
        this.sound.playCardSnap();
        this.renderTrickCard(playerIndex, card);
      };
    }

    renderTrickCard(playerIndex, card) {
      const slot = this.trickSlots[playerIndex];
      if (!slot) return;
      slot.innerHTML = '';
      const cardEl = this.createCardDom(card);
      slot.appendChild(cardEl);
    }

    sweepTrick(winnerIndex) {
      const winnerTag = this.playerTags[winnerIndex];
      if (!winnerTag) return;

      const destRect = winnerTag.getBoundingClientRect();
      const destX = destRect.left + destRect.width / 2;
      const destY = destRect.top + destRect.height / 2;

      this.sound.playTrickSweep();

      // Collect all 4 cards currently sitting in the trick slots
      const cardsToSweep = [];
      for (let p = 0; p < 4; p++) {
        const slot = this.trickSlots[p];
        if (slot) {
          const imgEl = slot.querySelector('img');
          const cardEl = slot.firstElementChild;
          if (cardEl && imgEl) {
            const rect = cardEl.getBoundingClientRect();
            if (rect.width > 0) {
              cardsToSweep.push({ slot, rect, src: imgEl.src, alt: imgEl.alt || 'Card' });
            }
          }
        }
      }

      // Empty trick slots immediately so cards don't double-render
      cardsToSweep.forEach(({ slot }) => {
        slot.innerHTML = '';
      });

      // Fly each trick card smoothly into the winner's player tag
      cardsToSweep.forEach(({ rect, src, alt }, index) => {
        const flyer = document.createElement('div');
        flyer.className = 'flying-card-sweep';
        flyer.style.left = `${rect.left}px`;
        flyer.style.top = `${rect.top}px`;
        flyer.style.width = `${rect.width}px`;
        flyer.style.height = `${rect.height}px`;
        flyer.style.zIndex = `${9100 + index}`;

        const img = document.createElement('img');
        img.src = src;
        img.alt = alt;
        img.draggable = false;
        flyer.appendChild(img);
        document.body.appendChild(flyer);

        const dx = destX - (rect.left + rect.width / 2);
        const dy = destY - (rect.top + rect.height / 2);

        // Stagger cards slightly for authentic dealer card gathering
        const delay = index * 35;
        const duration = 400;

        const anim = flyer.animate([
          {
            transform: 'translate3d(0px, 0px, 0px) scale(1) rotate(0deg)',
            opacity: 1,
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)',
            offset: 0
          },
          {
            transform: `translate3d(${(dx * 0.45).toFixed(1)}px, ${(dy * 0.45 - 25).toFixed(1)}px, 0px) scale(0.85) rotate(${(index * 6 - 9)}deg)`,
            opacity: 0.95,
            boxShadow: '0 20px 36px rgba(0, 0, 0, 0.65)',
            offset: 0.55
          },
          {
            transform: `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0px) scale(0.18) rotate(${(index * 14 - 21)}deg)`,
            opacity: 0,
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
            offset: 1
          }
        ], {
          duration: duration,
          delay: delay,
          easing: 'cubic-bezier(0.2, 0.9, 0.35, 1)',
          fill: 'forwards'
        });

        anim.onfinish = () => {
          flyer.remove();
        };
      });

      // Celebratory gold pulse on the winner player tag as cards arrive
      setTimeout(() => {
        winnerTag.classList.remove('winner-tag-bounce');
        void winnerTag.offsetWidth;
        winnerTag.classList.add('winner-tag-bounce');
        setTimeout(() => {
          if (winnerTag) winnerTag.classList.remove('winner-tag-bounce');
        }, 750);
      }, 360);

      // Update scoreboard
      setTimeout(() => {
        this.updateScoreboard();
      }, 520);
    }

    animatePassExchange(passed, received, direction) {
      // Map pass direction to target bot index from South (0)
      let targetIndex = 1; // Left = West
      if (direction === 'right') targetIndex = 3; // Right = East
      else if (direction === 'across') targetIndex = 2; // Across = North

      const targetStation = this.playerTags[targetIndex];
      const southTag = this.playerTags[0];
      if (!targetStation || !southTag) return;

      const targetRect = targetStation.getBoundingClientRect();
      const southRect = this.humanHandEl ? this.humanHandEl.getBoundingClientRect() : southTag.getBoundingClientRect();

      // 3 passed cards fly from South toward the target player
      for (let i = 0; i < 3; i++) {
        const flyer = document.createElement('div');
        flyer.className = 'flying-card-sweep';
        const startX = southRect.left + southRect.width / 2 + (i - 1) * 36;
        const startY = southRect.top + 10;
        flyer.style.left = `${startX}px`;
        flyer.style.top = `${startY}px`;
        flyer.style.width = '48px';
        flyer.style.height = '70px';
        flyer.style.zIndex = `${9500 + i}`;

        const img = document.createElement('img');
        img.src = (passed && passed[i]) ? passed[i].svgPath : 'assets/cards/back.svg';
        img.draggable = false;
        flyer.appendChild(img);
        document.body.appendChild(flyer);

        const dx = (targetRect.left + targetRect.width / 2) - startX;
        const dy = (targetRect.top + targetRect.height / 2) - startY;

        flyer.animate([
          { transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)', opacity: 1 },
          { transform: `translate3d(${(dx * 0.5).toFixed(1)}px, ${(dy * 0.5 - 20).toFixed(1)}px, 0px) scale(0.85) rotate(${(i * 8 - 8)}deg)`, opacity: 0.9 },
          { transform: `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(0.25) rotate(${(i * 12 - 12)}deg)`, opacity: 0 }
        ], {
          duration: 450,
          delay: i * 45,
          easing: 'cubic-bezier(0.22, 0.9, 0.36, 1)',
          fill: 'forwards'
        }).onfinish = () => flyer.remove();
      }
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
