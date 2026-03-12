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

// Subtopic pools — Claude picks 3 randomly each day per category
const SUBTOPICS = {
  mixed: [
    'World Records & Firsts', 'Famous Quotes & Speeches', 'Weird & Wonderful Facts',
    'Landmark Dates in History', 'Record Breakers', 'Famous Inventions',
    'Unusual Laws Around the World', 'Pop Culture Moments', 'Scientific Discoveries',
    'Geography Surprises', 'Celebrity Firsts', 'Historic Coincidences',
    'Money & Economics', 'Language & Words', 'Space & Universe'
  ],
  science: [
    'Human Body & Anatomy', 'Space & Astronomy', 'Chemistry & Elements',
    'Evolution & Natural Selection', 'Physics & Forces', 'Genetics & DNA',
    'Climate & Weather', 'Famous Inventions', 'Mathematics & Numbers',
    'Neuroscience & The Brain', 'Quantum Physics', 'Marine Biology',
    'Geology & Earth Science', 'Ecology & Environment', 'Medicine & Disease'
  ],
  history: [
    'Roman Empire', 'World War II', 'Ancient Egypt',
    'The Vikings', 'Tudor England', 'The Cold War',
    'Ancient Greece', 'The Renaissance', 'American Revolution',
    'The British Empire', 'Medieval Period', 'French Revolution',
    'The Space Race', 'Industrial Revolution', 'World War I',
    'Ancient China', 'The Ottoman Empire', 'Colonial Africa',
    'The Crusades', 'Ancient Mesopotamia'
  ],
  popculture: [
    'Reality TV Shows', 'Video Games & Gaming', 'Social Media History',
    '2000s Nostalgia', 'Superhero Movies & Comics', 'TikTok & Internet Culture',
    '90s Cartoons & Animation', 'Celebrity Moments', 'Awards Shows & Oscars',
    'Famous Memes & Viral Moments', '80s Pop Culture', 'Streaming Era TV',
    'Fashion & Style Icons', 'YouTube & Creator Culture', 'K-Pop & Global Music'
  ],
  geography: [
    'Capital Cities', 'Rivers & Mountains', 'Island Nations',
    'European Countries', 'African Geography', 'US States & Cities',
    'Flags of the World', 'Oceans & Seas', 'Borders & Neighbours',
    'Asian Geography', 'South American Countries', 'Deserts & Extreme Climates',
    'World Heritage Sites', 'Landlocked Countries', 'Population & Demographics'
  ],
  sports: [
    'Premier League Football', 'Olympic Games History', 'Tennis Grand Slams',
    'Formula 1 Racing', 'Boxing Legends', 'Cricket World Cup',
    'NBA Basketball', 'Rugby World Cup', 'Golf Majors',
    'FIFA World Cup', 'Athletics & Track', 'Swimming & Aquatics',
    'Cycling & Tour de France', 'Winter Olympics', 'Sports Records & Firsts'
  ],
  food: [
    'Street Food Around the World', 'Fine Dining & Michelin Stars', 'British Cuisine',
    'Cocktails & Spirits', 'Spices & Herbs', 'Baking & Pastry',
    'Fast Food History', 'Fermented Foods & Drinks', 'Chocolate & Sweets',
    'Italian Cuisine', 'Japanese Food Culture', 'Vegetarian & Vegan Foods',
    'Cheese & Dairy', 'Coffee & Tea', 'Unusual Delicacies Around the World'
  ],
  music: [
    '90s Hip Hop & Rap', 'Motown & Soul', 'Classical Composers',
    'The Beatles Era', 'Punk & New Wave', 'Jazz & Blues',
    'Musical Theatre & Broadway', '80s Pop Icons', 'Country Music',
    'Electronic & Dance Music', 'Opera & Classical', 'K-Pop & Asian Pop',
    'Heavy Metal & Rock', 'Britpop & UK Music', 'One Hit Wonders',
    'Grammy & BRIT Award History', 'Music Festivals', 'Singer-Songwriters'
  ],
  technology: [
    'Social Media Platforms', 'Apple & Steve Jobs', 'Microsoft & Bill Gates',
    'AI & Machine Learning', 'Video Game History', 'Internet History & Web',
    'Smartphone Evolution', 'Space Technology & NASA', 'Cybersecurity & Hacking',
    'Programming Languages', 'Tech Billionaires', 'Robotics & Automation',
    'Cryptocurrency & Blockchain', 'Computer Hardware History', 'Tech Fails & Disasters'
  ],
  nature: [
    'Big Cats & Wild Predators', 'Ocean & Deep Sea Creatures', 'Birds of Prey',
    'Rainforest & Jungle Life', 'Extinct & Prehistoric Animals', 'Insects & Bugs',
    'Dogs & Domesticated Animals', 'Trees & Plant Life', 'Reptiles & Amphibians',
    'Primates & Great Apes', 'Arctic & Antarctic Wildlife', 'Coral Reefs & Marine Life',
    'Migration & Animal Behaviour', 'Venomous Animals', 'Fungi & Microorganisms'
  ],
  film: [
    '90s Blockbusters', 'Disney & Pixar Animation', 'Horror Films',
    'Directors & Film Auteurs', 'Oscars & Academy Award History', 'James Bond Series',
    'Sci-Fi Cinema', 'Sequels & Franchises', 'Silent & Golden Era Film',
    'Independent & Arthouse Cinema', 'Film Scores & Soundtracks', 'Action Heroes',
    'Comedy Classics', 'Documentary Films', 'International Cinema'
  ],
  politics: [
    'UK Politics & Prime Ministers', 'US Presidents & Elections', 'United Nations',
    'Famous Political Speeches', 'Political Scandals & Controversies', 'Women in Politics',
    'International Treaties & Agreements', 'Dictators & Authoritarian Regimes', 'EU & European Politics',
    'Revolution & Uprisings', 'Cold War Politics', 'Democracy & Voting Rights',
    'War Crimes & International Law', 'Economic Policies & Recessions', 'Current World Leaders'
  ]
};

function getTodayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

// Seeded random — same date always picks same subtopics (consistent within a day)
function seededRandom(seed) {
  let x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function pickSubtopics(category, dateKey, count = 3) {
  const pool = SUBTOPICS[category];
  const seed = dateKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + category.length;
  const picked = [];
  const used = new Set();
  let i = 0;
  while (picked.length < count) {
    const idx = Math.floor(seededRandom(seed + i) * pool.length);
    if (!used.has(idx)) {
      used.add(idx);
      picked.push(pool[idx]);
    }
    i++;
  }
  return picked;
}

// Distribute 10 questions across 3 subtopics: 4, 3, 3
function buildSubtopicDistribution(subtopics) {
  return [
    { topic: subtopics[0], count: 4 },
    { topic: subtopics[1], count: 3 },
    { topic: subtopics[2], count: 3 },
  ];
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

async function generateForCategory(cat, recentQuestions, dateKey) {
  const label     = CAT_LABELS[cat];
  const subtopics = pickSubtopics(cat, dateKey);
  const dist      = buildSubtopicDistribution(subtopics);

  console.log(`    Subtopics: ${subtopics.join(' | ')}`);

  // Build avoid list (max 30 to keep prompt lean)
  const avoidList = Array.from(recentQuestions).slice(0, 30);
  const avoidSection = avoidList.length > 0
    ? `\n\nDo NOT repeat any of these recently used questions:\n${avoidList.slice(0,25).map(q => '- ' + q).join('\n')}`
    : '';

  const subtopicInstructions = dist.map(d =>
    `- ${d.topic}: write exactly ${d.count} questions`
  ).join('\n');

  const prompt = `You are generating a fun daily trivia quiz for ${dateKey}. Category: ${label}.

Today's subtopics (you MUST follow this distribution exactly):
${subtopicInstructions}

Total: exactly 10 questions.

Guidelines:
- Mix difficulties: roughly 3 easy, 4 medium, 3 hard across all subtopics
- Avoid obvious textbook questions — favour obscure, surprising or counterintuitive facts
- Include at least 1 question referencing something from the last 12 months where relevant
- Vary question styles: What, Which, Who, When, How many, True/False framing
- Make the "Did you know" facts genuinely surprising — not just a restatement of the answer${avoidSection}

Respond with ONLY a valid JSON array — no markdown, no explanation, just raw JSON:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "fact": "One short surprising fact about the answer (max 20 words)."
  }
]

Rules:
- "correct" is the 0-based index of the right answer in options
- Every question must have exactly 4 options
- No trick questions — answers must be definitively correct
- Do NOT repeat any questions from the avoid list`;

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

  // Tag each question with its subtopic for future reference
  let qIndex = 0;
  dist.forEach(d => {
    for (let i = 0; i < d.count; i++) {
      if (questions[qIndex]) questions[qIndex]._subtopic = d.topic;
      qIndex++;
    }
  });

  return questions;
}

async function main() {
  const dateKey = getTodayKey();
  console.log(`\n🧠 QuizPop — Generating questions for ${dateKey}\n`);

  // Load recent questions to avoid repeats (last 14 days)
  console.log('Checking recent questions to avoid repeats...');
  const recentQuestions = getRecentQuestions(14);

  const output = {
    date: dateKey,
    generated: new Date().toISOString(),
    categories: {}
  };

  for (const cat of CATEGORIES) {
    process.stdout.write(`  Generating ${cat}...\n`);
    try {
      output.categories[cat] = await generateForCategory(cat, recentQuestions, dateKey);
      console.log(`  ✅ ${cat} done`);
    } catch (e) {
      console.log(`  ❌ ${cat} failed: ${e.message}`);
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
  console.log(`📦 Archived as questions-${dateKey}.json`);

  // Log today's subtopic selections for transparency
  console.log('\n📋 Today\'s subtopic selections:');
  CATEGORIES.forEach(cat => {
    const subtopics = pickSubtopics(cat, dateKey);
    console.log(`  ${cat}: ${subtopics.join(' | ')}`);
  });
  console.log('');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
