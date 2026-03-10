// scripts/generate.js
// Run by GitHub Actions daily at midnight UTC
// Usage: ANTHROPIC_API_KEY=xxx node scripts/generate.js

const fs   = require('fs');
const path = require('path');

const CATEGORIES = ['mixed', 'science', 'history', 'popculture', 'geography', 'sports'];
const CAT_LABELS = {
  mixed:      'Mixed General Knowledge',
  science:    'Science & Nature',
  history:    'History',
  popculture: 'Pop Culture & Entertainment',
  geography:  'Geography',
  sports:     'Sports',
};

function getTodayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

async function generateForCategory(cat) {
  const label = CAT_LABELS[cat];
  const dateKey = getTodayKey();

  const prompt = `You are generating a fun daily trivia quiz for ${dateKey}. Category: ${label}.

Create exactly 10 multiple-choice questions. Mix difficulties: 3 easy, 4 medium, 3 hard. Make them fun, surprising, and educational.

Respond with ONLY a valid JSON array — no markdown, no explanation, just raw JSON:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "fact": "One short fun fact about the answer (max 20 words)."
  }
]

Rules:
- "correct" is the 0-based index of the right answer in options array
- Every question must have exactly 4 options
- No trick questions — answers should be definitively correct
- Make facts genuinely surprising or interesting
- Vary question styles: "What is...", "Which...", "In what year...", "Who...", "How many..."`;

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

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw  = data.content.map(b => b.text || '').join('');
  const clean = raw.replace(/```json|```/gi, '').trim();
  const questions = JSON.parse(clean);

  if (!Array.isArray(questions) || questions.length !== 10) {
    throw new Error(`Expected 10 questions, got ${questions?.length}`);
  }

  return questions;
}

async function main() {
  const dateKey = getTodayKey();
  console.log(`\n🧠 QuizPop — Generating questions for ${dateKey}\n`);

  const output = { date: dateKey, generated: new Date().toISOString(), categories: {} };

  for (const cat of CATEGORIES) {
    process.stdout.write(`  Generating ${cat}...`);
    try {
      const questions = await generateForCategory(cat);
      output.categories[cat] = questions;
      console.log(` ✅ (${questions.length} questions)`);
    } catch (e) {
      console.log(` ❌ FAILED: ${e.message}`);
      process.exit(1);
    }
    // Small delay between calls to avoid rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }

  // Write to data/questions.json (served as static file)
  const outPath = path.join(__dirname, '..', 'data', 'questions.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n✅ Saved to data/questions.json`);

  // Also keep an archive copy
  const archivePath = path.join(__dirname, '..', 'data', `questions-${dateKey}.json`);
  fs.writeFileSync(archivePath, JSON.stringify(output, null, 2));
  console.log(`📦 Archived to data/questions-${dateKey}.json\n`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
