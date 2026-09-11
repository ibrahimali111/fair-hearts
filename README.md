# ♥ Fair Hearts — Zero-Bias Card Game with 3-Tier AI

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform: Web & PWA](https://img.shields.io/badge/Platform-Web%20%7C%20PWA%20%7C%20Mobile-blue.svg)](index.html)
[![AI Architecture: PIMC](https://img.shields.io/badge/AI-Monte%20Carlo%20PIMC-purple.svg)](js/ai-hard.js)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-brightgreen.svg)](index.html)

An open-source, mathematically fair implementation of the classic **Hearts** trick-taking card game. Built to solve the widespread frustration with commercial Hearts games that secretly bias and coordinate bots against the human player.

---

## 🎯 The Problem with Commercial Hearts Games

Almost all commercial Hearts mobile and web apps use rigged AI:
1. **Rubber-Banding Collusion:** The bots secretly peek into your hidden hand and collude to dump penalty cards (the Queen of Spades ♠Q and Hearts ♥) on the real human player.
2. **Artificial Difficulty:** Instead of making bots smarter, commercial apps simply handicap the human or coordinate discards against Seat 0.
3. **Flawed Dumping Heuristics:** In naive implementations, bots simply dump cards on whoever is winning the current trick, turning active players into constant lightning rods.

---

## ⚖️ The Fair Hearts Solution: Radical Symmetry

Fair Hearts is engineered on **three non-negotiable principles**:

1. **Zero Information Leakage ("No-Peeking"):**  
   Every AI function receives strictly its own hand and the publicly played cards. There is literally no code path in the engine that allows a bot to look at opponent cards.
2. **Seat Anonymity:**  
   The AI algorithms evaluate all 4 seats as identical anonymous competitors. The bot has no concept of whether a player is human or AI.
3. **Independent Self-Interest:**  
   Every bot plays solely to minimize its own score or execute a legal "Shoot the Moon". When dumping penalty cards, bots target the **current match leader on the scoreboard** (the biggest threat), never a fixed seat.

---

## 🧠 3-Tier AI Architecture

| Tier | Name | Engine & Algorithmic Design |
| :--- | :--- | :--- |
| **Tier 1** | **Casual** *(Easy)* | **Rule of Thumb (Heuristics):** Plays legal cards, ducks when points appear, sheds high cards when void. Does not count cards or remember past voids. |
| **Tier 2** | **Strategic** *(Normal)* | **Card Counting & Void Tracking:** Tracks all 52 cards, detects opponent voids, manages Queen of Spades danger, targets the match leader, and actively defends against opponent moon shots. |
| **Tier 3** | **Master** *(Hard)* | **Perfect Information Monte Carlo (PIMC):** Runs 35+ void-constrained determinizations per decision, simulating future trick trajectories to mathematically minimize expected penalty points. |

---

## 📱 Cross-Platform (Run on Every OS)

Fair Hearts is built with **zero external dependencies** using pure HTML5, modern CSS3, and vanilla JavaScript:

- **Windows / macOS / Linux:** Open `index.html` in Chrome, Firefox, Safari, or Edge.
- **Android:** Open in Chrome, tap the `⋮` menu, and select **"Add to Home Screen"** or **"Install app"**. It installs as a lightweight Progressive Web App (PWA) that launches in full-screen and works 100% offline!
- **iOS:** Open in Safari, tap the Share icon, and select **"Add to Home Screen"**.

---

## 🃏 Official Hearts Rules Supported

- **Card Passing Rotation:** Round 1 (Pass Left) $\rightarrow$ Round 2 (Pass Right) $\rightarrow$ Round 3 (Pass Across) $\rightarrow$ Round 4 (No Pass / Keep) $\rightarrow$ repeats.
- **Opening Lead:** The player holding the 2 of Clubs (2♣) must lead the first trick.
- **Blood Rule (Trick 1):** No penalty points (Hearts or ♠Q) may be played on the first trick unless a player has only points.
- **Hearts Breaking:** Hearts cannot be led until a Heart or the Queen of Spades has been played on a previous trick, or the leader has only Hearts.
- **Shooting the Moon:** Collecting all 13 Hearts + the Queen of Spades gives **0 points** to the shooter and **+26 points** to every opponent!
- **Game Over:** The match ends when any player hits 100 points. Lowest score wins!

---

## 🛠️ Local Development & Testing

Clone the repository and open `index.html` in any web browser:

```bash
git clone https://github.com/ibrahimali111/fair-hearts.git
cd fair-hearts
# Start a simple local server (optional)
python3 -m http.server 8080
```

Open `http://localhost:8080` in your browser.

---

## 📄 License

MIT License — Copyright (c) 2026 [ibrahimali111](https://github.com/ibrahimali111).
