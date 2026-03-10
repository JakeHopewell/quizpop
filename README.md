# 🧠 QuizPop

**Daily AI-generated trivia quiz. 10 questions, one shot per day, shareable results.**

🌐 Live at [www.quizpop.co.uk](https://www.quizpop.co.uk)

---

## What is QuizPop?

QuizPop is a free daily brain challenge. Every day at midnight, an AI generates a fresh set of 10 trivia questions across 6 categories. Everyone gets the same questions — compare your score with friends and build your daily streak.

- 🎲 6 categories: Mixed, Science, History, Pop Culture, Geography, Sports
- ⏱️ 15 seconds per question
- 🔥 Daily streak tracking
- 📲 One-tap sharing to WhatsApp, X and clipboard
- 🎉 Confetti for high scores

---

## How It Works

Questions are pre-generated once daily by a GitHub Actions cron job using the Claude AI API. The frontend is a single static HTML file — no backend, no database, no frameworks.

```
Midnight UTC
    ↓
GitHub Actions runs scripts/generate.js
    ↓
Claude API generates 10 questions × 6 categories
    ↓
Saved to data/questions.json
    ↓
GitHub Pages serves it instantly to all visitors
```

---

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript (single file)
- **Hosting:** GitHub Pages (free)
- **Question generation:** Claude AI via Anthropic API
- **Automation:** GitHub Actions (cron job, daily at midnight UTC)
- **DNS:** One.com → GitHub Pages

---

## Project Structure

```
quizpop/
├── index.html                        ← Entire frontend
├── data/
│   ├── questions.json                ← Today's questions (auto-updated)
│   └── questions-YYYY-MM-DD.json    ← Daily archive
├── scripts/
│   └── generate.js                  ← Question generator (Node.js)
└── .github/
    └── workflows/
        └── daily-questions.yml      ← GitHub Actions cron job
```

---

## Deployment

1. Fork this repository
2. Enable GitHub Pages (Settings → Pages → main branch)
3. Add `ANTHROPIC_API_KEY` to repository secrets
4. Trigger the first question generation manually via the Actions tab
5. Point your domain DNS to GitHub Pages

---

## License

MIT — see [LICENSE](./LICENSE)

---

Built with ❤️ and [Claude AI](https://anthropic.com)
