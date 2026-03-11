// scripts/generate.js
// Run by GitHub Actions daily at midnight UTC
// Usage: ANTHROPIC_API_KEY=xxx node scripts/generate.js

const fs   = require('fs');
const path = require('path');

const CATEGORIES = [
  'mixed', 'science', 'history', 'popculture',
  'geography', 'sports', 'food', 'music',
  'technology', 'nature', 'film', 'politics'
];

const CAT_LABELS = {
  mixed:      'Mixed General Knowledge',
  science:    'Science & Nature',
  history:    'History',
  popculture: 'Pop Culture & Entertainment',
  geography:  'Geography',
  sports:     'Sports',
  food:       'Food & Drink',
  music:      'Music',
  technology: 'Technology & Computing',
  nature:     'Nature & Animals',
  film:       'Film & TV',
  politics:   'World Politics & Current Affairs',
};

function getTodayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

async function generateForCategory(cat) {
  const label   = CAT_LABELS[cat];
  const dateKey = getTodayKey();
  const prompt  = `You are generating a fun daily trivia quiz for ${dateKey}. Category: ${label}.

Create exactly 10 multiple-choice questions. Mix difficulties: 3 easy, 4 medium, 3 hard.

Respond with ONLY a valid JSON array — no markdown, no explanation:
[
  {
    "question": "Question text?",
    "options": ["A", "B", "C", "D"],
    "correct": 0,
    "fact": "One short fun fact (max 20 words)."
  }
]

Rules:
- correct = 0-based index of right answer
- Exactly 4 options per question
- No trick questions
- Vary question styles and difficulty`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  const data      = await res.json();
  const raw       = data.content.map(b => b.text || '').join('');
  const questions = JSON.parse(raw.replace(/```json|```/gi, '').trim());
  if (!Array.isArray(questions) || questions.length !== 10)
    throw new Error(`Expected 10 questions for ${cat}, got ${questions?.length}`);
  return questions;
}

async function main() {
  const dateKey = getTodayKey();
  console.log(`\n🧠 QuizPop — Generating questions for ${dateKey}\n`);
  const output = { date: dateKey, generated: new Date().toISOString(), categories: {} };

  for (const cat of CATEGORIES) {
    process.stdout.write(`  Generating ${cat}...`);
    try {
      output.categories[cat] = await generateForCategory(cat);
      console.log(` ✅`);
    } catch (e) {
      console.log(` ❌ ${e.message}`);
      process.exit(1);
    }
    await new Promise(r => setTimeout(r, 1200));
  }

  const outPath = path.join(__dirname, '..', 'data', 'questions.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n✅ Saved — ${CATEGORIES.length * 10} questions total\n`);

  const archivePath = path.join(__dirname, '..', 'data', `questions-${dateKey}.json`);
  fs.writeFileSync(archivePath, JSON.stringify(output, null, 2));
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
