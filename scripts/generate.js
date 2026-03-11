// scripts/generate.js
// Run by GitHub Actions daily — generates 120 fresh questions across 12 categories

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

// Load recent questions from archives to avoid repeats
function getRecentQuestions(days) {
  const recentQuestions = new Set();
  const dataDir = path.join(__dirname, '..', 'data');
  
  for (let i = 1; i <= days; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const dateKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
    const archivePath = path.join(dataDir, `questions-${dateKey}.json`);
    
    if (fs.existsSync(archivePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
        Object.values(data.categories || {}).forEach(catQuestions => {
          catQuestions.forEach(q => recentQuestions.add(q.question.toLowerCase().trim()));
        });
      } catch(e) {
        // Skip corrupt files
      }
    }
  }
  
  console.log(`  (found ${recentQuestions.size} recent questions to avoid)`);
  return recentQuestions;
}

async function generateForCategory(cat, recentQuestions) {
  const label   = CAT_LABELS[cat];
  const dateKey = getTodayKey();
  
  // Build a short list of recent questions to avoid (max 30 to keep prompt lean)
  const avoidList = Array.from(recentQuestions).slice(0, 30);
  const avoidSection = avoidList.length > 0
    ? `\n\nAvoid repeating these recently used questions:\n${avoidList.slice(0,20).map(q => '- ' + q).join('\n')}`
    : '';

  const prompt = `You are generating a fun daily trivia quiz for ${dateKey}. Category: ${label}.

Create exactly 10 multiple-choice questions. Mix difficulties: 3 easy, 4 medium, 3 hard. Make them fun, surprising and educational.

Where relevant, include 1-2 questions that tie into recent news, events or things happening in the world right now in ${new Date().toLocaleString('en-GB', {month:'long', year:'numeric'})}. This keeps the quiz feeling fresh and current.${avoidSection}

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
- "correct" is the 0-based index of the right answer
- Every question must have exactly 4 options
- No trick questions — answers must be definitively correct
- Make facts genuinely surprising or interesting
- Vary question styles: What, Which, Who, When, How many, True/False style
- Do NOT repeat any questions from the avoid list above`;

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

  // Load recent questions to avoid repeats (last 14 days)
  console.log('Checking recent questions to avoid repeats...');
  const recentQuestions = getRecentQuestions(14);

  const output = { date: dateKey, generated: new Date().toISOString(), categories: {} };

  for (const cat of CATEGORIES) {
    process.stdout.write(`  Generating ${cat}...`);
    try {
      output.categories[cat] = await generateForCategory(cat, recentQuestions);
      console.log(` ✅`);
    } catch (e) {
      console.log(` ❌ ${e.message}`);
      process.exit(1);
    }
    // Delay between calls to avoid rate limiting
    await new Promise(r => setTimeout(r, 1200));
  }

  // Save today's questions
  const outPath = path.join(__dirname, '..', 'data', 'questions.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n✅ Saved questions.json — ${CATEGORIES.length * 10} questions total`);

  // Save archive copy
  const archivePath = path.join(__dirname, '..', 'data', `questions-${dateKey}.json`);
  fs.writeFileSync(archivePath, JSON.stringify(output, null, 2));
  console.log(`📦 Archived as questions-${dateKey}.json\n`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
