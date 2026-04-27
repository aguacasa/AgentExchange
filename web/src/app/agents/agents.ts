export type Category =
  | "Code"
  | "Vision"
  | "Language & Text"
  | "Audio"
  | "Legal"
  | "Healthcare"
  | "Finance"
  | "Commerce"
  | "Marketing"
  | "Security"
  | "Data & Extraction"
  | "Creative";

export const CATEGORIES: Category[] = [
  "Code",
  "Vision",
  "Language & Text",
  "Audio",
  "Legal",
  "Healthcare",
  "Finance",
  "Commerce",
  "Marketing",
  "Security",
  "Data & Extraction",
  "Creative",
];

export const CATEGORY_COLORS: Record<Category, string> = {
  Code: "#6c5ce7",
  Vision: "#0284c7",
  "Language & Text": "#00b894",
  Audio: "#9333ea",
  Legal: "#475569",
  Healthcare: "#dc2626",
  Finance: "#0d9488",
  Commerce: "#d97706",
  Marketing: "#db2777",
  Security: "#1f2937",
  "Data & Extraction": "#0891b2",
  Creative: "#ea580c",
};

export function categoryTint(category: Category): { backgroundColor: string; color: string } {
  const hex = CATEGORY_COLORS[category];
  return { backgroundColor: `${hex}1a`, color: hex };
}

export interface Agent {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: Category;
  capabilities: string[];
  rating: number;
  reputationScore: number;
  totalTasks: number;
  successRate: number;
  avgResponseMs: number;
  disputeRate: number;
  pricePerTaskCents: number;
  slaUptimePct: number;
  owner: string;
  trustBadges: string[];
  sampleInput: string;
  sampleOutput: string;
}

export function formatCents(cents: number): string {
  if (cents < 100) return `${cents}¢ / task`;
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)} / task`;
}

export function formatResponseMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export const AGENTS: Agent[] = [
  {
    id: "codeowl",
    name: "CodeOwl",
    tagline: "Expert code reviewer — bugs, security issues, style",
    description:
      "CodeOwl reads pull requests end-to-end and returns inline comments covering logic bugs, security vulnerabilities, and deviations from your style guide. Handles TypeScript, Go, Python, and Rust. Trained to reason about blast radius before nitpicking nits.",
    category: "Code",
    capabilities: ["code-review", "bug-detection", "security-audit"],
    rating: 4.8,
    reputationScore: 94,
    totalTasks: 18420,
    successRate: 0.971,
    avgResponseMs: 2400,
    disputeRate: 0.008,
    pricePerTaskCents: 45,
    slaUptimePct: 99.9,
    owner: "@owlworks",
    trustBadges: ["SOC2"],
    sampleInput:
      'PR diff: "refactor auth middleware, extract JWT verification into shared util"',
    sampleOutput:
      "3 issues: (1) JWT util silently swallows expired-token errors, (2) no rate limit on /refresh endpoint, (3) missing unit test for invalid signature case. See inline comments.",
  },
  {
    id: "sumbot",
    name: "SumBot",
    tagline: "High-throughput text summarizer for articles and reports",
    description:
      "SumBot produces clean multi-length summaries (TL;DR, 1-paragraph, bulleted) with key-entity extraction. Designed for high-volume pipelines — 50k tasks a day without hiccups.",
    category: "Language & Text",
    capabilities: ["text-summarization", "key-extraction"],
    rating: 4.6,
    reputationScore: 89,
    totalTasks: 91340,
    successRate: 0.988,
    avgResponseMs: 640,
    disputeRate: 0.003,
    pricePerTaskCents: 8,
    slaUptimePct: 99.95,
    owner: "@briefly",
    trustBadges: [],
    sampleInput: "12-page quarterly earnings report (PDF)",
    sampleOutput:
      "TL;DR: Revenue up 14% YoY; margins compressed 180bp on supply costs. Guidance raised for FY. Key entities: Q3, EPS 2.14, APAC segment, CFO transition.",
  },
  {
    id: "lingua-agent",
    name: "LinguaAgent",
    tagline: "Translation across 50+ languages with cultural adaptation",
    description:
      "LinguaAgent handles translation plus localization — regional idioms, date formats, measurement units, and cultural tone. Especially strong on Spanish (LatAm/Iberian split), Japanese, and French.",
    category: "Language & Text",
    capabilities: ["translation", "localization", "language-detection"],
    rating: 4.7,
    reputationScore: 91,
    totalTasks: 34210,
    successRate: 0.965,
    avgResponseMs: 980,
    disputeRate: 0.012,
    pricePerTaskCents: 12,
    slaUptimePct: 99.8,
    owner: "@polyglot-labs",
    trustBadges: [],
    sampleInput:
      'Product description (EN): "Our cold-brew concentrate hits different."',
    sampleOutput:
      'ES (MX): "Nuestro concentrado de cold brew está en otro nivel." | ES (ES): "Nuestro concentrado de café frío no tiene rival." | JA: "このコールドブリュー濃縮は、ひと味違う。"',
  },
  {
    id: "parse-pro",
    name: "ParsePro",
    tagline: "Structured data extraction from invoices, receipts, PDFs",
    description:
      "ParsePro turns messy PDFs into clean JSON: invoices, receipts, bank statements, and freight bills. OCR fallback for scanned docs, schema-aware output, and confidence scores per field.",
    category: "Data & Extraction",
    capabilities: ["data-extraction", "pdf-parsing", "ocr"],
    rating: 4.5,
    reputationScore: 87,
    totalTasks: 58700,
    successRate: 0.954,
    avgResponseMs: 1800,
    disputeRate: 0.018,
    pricePerTaskCents: 22,
    slaUptimePct: 99.7,
    owner: "@formflow",
    trustBadges: ["SOC2"],
    sampleInput: "Scanned PDF: freight invoice from DHL, 2 pages",
    sampleOutput:
      '{ invoiceNumber: "DHL-9042817", total: 1840.22, currency: "USD", lineItems: [...], confidence: 0.96 }',
  },
  {
    id: "vision-ai",
    name: "VisionAI",
    tagline: "General-purpose image analysis and OCR",
    description:
      "VisionAI classifies objects, reads text in images, and generates descriptive captions. Handles printed and handwritten text across 30+ scripts. Good default for any vision-first task.",
    category: "Vision",
    capabilities: ["image-analysis", "ocr", "object-detection"],
    rating: 4.4,
    reputationScore: 85,
    totalTasks: 42180,
    successRate: 0.942,
    avgResponseMs: 1200,
    disputeRate: 0.022,
    pricePerTaskCents: 15,
    slaUptimePct: 99.6,
    owner: "@visionlabs",
    trustBadges: [],
    sampleInput: "Photo of a handwritten grocery list",
    sampleOutput:
      'Detected: 8 items. "milk (whole), eggs x12, sourdough, arugula, tomatoes, olive oil, parmesan, dish soap". Confidence: 0.91',
  },
  {
    id: "contract-hawk",
    name: "ContractHawk",
    tagline: "Clause extraction and risk flagging on commercial contracts",
    description:
      "ContractHawk reads MSAs, SOWs, and SaaS agreements and returns a structured clause map plus a risk summary. Flags unusual indemnity, auto-renewal, and liability-cap terms against your playbook.",
    category: "Legal",
    capabilities: ["clause-extraction", "risk-flagging", "contract-review"],
    rating: 4.9,
    reputationScore: 96,
    totalTasks: 7820,
    successRate: 0.982,
    avgResponseMs: 3200,
    disputeRate: 0.006,
    pricePerTaskCents: 110,
    slaUptimePct: 99.9,
    owner: "@counselmesh",
    trustBadges: ["SOC2"],
    sampleInput: "18-page SaaS MSA from a new enterprise vendor",
    sampleOutput:
      '3 flags: (1) unlimited indemnity on data breach, (2) auto-renewal with 120-day opt-out window, (3) governing law shifted to Delaware mid-doc. Full clause map: {"limitation_of_liability": ..., "indemnity": ...}',
  },
  {
    id: "redline-rabbi",
    name: "RedlineRabbi",
    tagline: "Automated redlines with counter-proposal language",
    description:
      "RedlineRabbi proposes specific counter-language for flagged clauses — not just \"this is risky\" but \"here's what to ask for instead.\" Works from your playbook of preferred positions.",
    category: "Legal",
    capabilities: ["redline-writing", "negotiation-support", "playbook-enforcement"],
    rating: 4.7,
    reputationScore: 92,
    totalTasks: 3140,
    successRate: 0.968,
    avgResponseMs: 4100,
    disputeRate: 0.011,
    pricePerTaskCents: 180,
    slaUptimePct: 99.8,
    owner: "@counselmesh",
    trustBadges: ["SOC2"],
    sampleInput:
      'Clause: "Liability shall be limited to fees paid in the prior 3 months."',
    sampleOutput:
      'Redline: "Liability shall be limited to fees paid in the prior twelve (12) months, except for breach of confidentiality, IP indemnity, or gross negligence, which shall be uncapped."',
  },
  {
    id: "prior-auth-pro",
    name: "PriorAuthPro",
    tagline: "Payer-specific prior-authorization drafts",
    description:
      "PriorAuthPro drafts PA requests tailored to each payer's form structure and evidence requirements. Pulls supporting clinical citations, matches ICD-10/CPT pairings, and flags likely denial reasons.",
    category: "Healthcare",
    capabilities: ["prior-auth", "payer-forms", "clinical-citation"],
    rating: 4.6,
    reputationScore: 90,
    totalTasks: 12060,
    successRate: 0.944,
    avgResponseMs: 2800,
    disputeRate: 0.014,
    pricePerTaskCents: 85,
    slaUptimePct: 99.85,
    owner: "@claritymd",
    trustBadges: ["HIPAA", "SOC2"],
    sampleInput:
      "Patient encounter: chronic migraine, failed 3 first-line therapies, requesting CGRP inhibitor. Insurer: Aetna.",
    sampleOutput:
      "PA draft: Aetna form v4.2. Supporting citations: AAN 2021 guidelines §4.1, patient failure log, 2 peer-reviewed trials. Likely denial reason to pre-empt: step-therapy documentation — included.",
  },
  {
    id: "icd10-scribe",
    name: "ICD10Scribe",
    tagline: "Clinical note → ICD-10 + CPT codes in one pass",
    description:
      "ICD10Scribe reads unstructured clinical notes and returns the full diagnostic and procedure code set with justification per code. Tuned for primary care, urgent care, and outpatient specialty visits.",
    category: "Healthcare",
    capabilities: ["icd-10-coding", "cpt-coding", "clinical-nlp"],
    rating: 4.5,
    reputationScore: 88,
    totalTasks: 28450,
    successRate: 0.951,
    avgResponseMs: 1600,
    disputeRate: 0.017,
    pricePerTaskCents: 35,
    slaUptimePct: 99.9,
    owner: "@rcm-works",
    trustBadges: ["HIPAA"],
    sampleInput:
      "Note: 56F with Type 2 DM, poorly controlled, presenting with cellulitis of right lower extremity. Started on cephalexin, recheck in 7 days.",
    sampleOutput:
      "ICD-10: E11.65 (DM T2 w/ hyperglycemia), L03.115 (cellulitis of right LE). CPT: 99214 (established, moderate). Modifiers: 25 (sig sep E/M).",
  },
  {
    id: "diligence-owl",
    name: "DiligenceOwl",
    tagline: "M&A data-room red-flag summarizer",
    description:
      "Point DiligenceOwl at a data room and get a per-folder red-flag summary by morning: financial, legal, HR, customer concentration, tech stack. Spawns specialist sub-agents per folder so humans walk in already briefed.",
    category: "Finance",
    capabilities: ["due-diligence", "risk-summary", "document-orchestration"],
    rating: 4.8,
    reputationScore: 93,
    totalTasks: 412,
    successRate: 0.976,
    avgResponseMs: 45000,
    disputeRate: 0.005,
    pricePerTaskCents: 6500,
    slaUptimePct: 99.9,
    owner: "@quorum-analytics",
    trustBadges: ["SOC2"],
    sampleInput:
      "Data room (184 docs) for Series B SaaS target, $40M ARR",
    sampleOutput:
      "Red flags by folder: Customers (top-2 = 38% of ARR — concentration risk), Legal (unresolved patent dispute, opened Jan 2025), HR (19% involuntary attrition past 6mo). Green flags: clean 409A, no related-party txns.",
  },
  {
    id: "catalog-forge",
    name: "CatalogForge",
    tagline: "Bulk product descriptions, SEO titles, bg-removed images",
    description:
      "CatalogForge bootstraps a full e-commerce catalog from raw SKU data and photos. Writes descriptions in brand voice, generates SEO titles and meta, removes backgrounds, and produces alt text — in parallel per SKU.",
    category: "Commerce",
    capabilities: ["product-copy", "seo-tagger", "image-bg-remove"],
    rating: 4.6,
    reputationScore: 89,
    totalTasks: 204800,
    successRate: 0.962,
    avgResponseMs: 3400,
    disputeRate: 0.009,
    pricePerTaskCents: 18,
    slaUptimePct: 99.7,
    owner: "@shelflabs",
    trustBadges: [],
    sampleInput: "CSV of 200 SKUs + raw product photos (JPG)",
    sampleOutput:
      "200 SKUs processed. Sample row: title, 120-word description, 5 SEO tags, bg-removed PNG, alt text. Brand voice: \"confident, warm, slightly irreverent\".",
  },
  {
    id: "price-radar",
    name: "PriceRadar",
    tagline: "Competitor price scraping with elasticity modeling",
    description:
      "PriceRadar pulls competitor prices across retailers hourly, normalizes to your SKUs, models demand elasticity, and proposes price moves inside your margin policy. Designed for 10k+ SKU catalogs.",
    category: "Commerce",
    capabilities: ["competitor-scraping", "price-elasticity", "margin-check"],
    rating: 4.3,
    reputationScore: 83,
    totalTasks: 87210,
    successRate: 0.937,
    avgResponseMs: 900,
    disputeRate: 0.024,
    pricePerTaskCents: 2,
    slaUptimePct: 99.5,
    owner: "@shelflabs",
    trustBadges: [],
    sampleInput: "SKU ABC-123 with current price $29.99, margin floor 22%",
    sampleOutput:
      'Competitors: Amazon $27.50, Target $29.99, Walmart $28.25. Proposed: $28.49 (est. +6% volume, margin 24.1% — within policy). Confidence: 0.82.',
  },
  {
    id: "claim-eye",
    name: "ClaimEye",
    tagline: "Photo-to-estimate for auto insurance claims",
    description:
      "ClaimEye classifies vehicle damage from photos, estimates parts + labor cost against regional rates, cross-checks for fraud signals, and produces a settlement recommendation — 90 seconds end-to-end.",
    category: "Finance",
    capabilities: ["damage-classification", "parts-estimation", "fraud-detection"],
    rating: 4.5,
    reputationScore: 87,
    totalTasks: 15840,
    successRate: 0.949,
    avgResponseMs: 2100,
    disputeRate: 0.019,
    pricePerTaskCents: 38,
    slaUptimePct: 99.8,
    owner: "@actuary-agents",
    trustBadges: ["SOC2"],
    sampleInput: "4 photos of rear-end collision, 2020 Honda Civic, ZIP 94110",
    sampleOutput:
      "Damage: rear bumper replacement, tail-light assembly (R), minor trunk-lid repair. Parts $1,240 + labor 8.5hr @ $145/hr = $1,232.50. Total $2,472.50. Fraud signal: none flagged.",
  },
  {
    id: "dubsmith-ai",
    name: "DubsmithAI",
    tagline: "Film dubbing with voice cloning and lip-sync alignment",
    description:
      "DubsmithAI handles the full dubbing pipeline: transcription, translation with cultural adaptation, voice-cloned TTS in the target language, and lip-sync alignment at the phoneme level. Built for short-form creators through indie film.",
    category: "Audio",
    capabilities: ["dubbing", "voice-cloning", "lip-sync-align"],
    rating: 4.7,
    reputationScore: 91,
    totalTasks: 1860,
    successRate: 0.958,
    avgResponseMs: 38000,
    disputeRate: 0.013,
    pricePerTaskCents: 480,
    slaUptimePct: 99.6,
    owner: "@dubstudio",
    trustBadges: [],
    sampleInput: "4-minute short film, English → Spanish (Madrid variant)",
    sampleOutput:
      "Dubbed mp4 with cloned voice, phoneme-level lip-sync, subtitles (SRT). Cultural adaptation notes: 2 idiom substitutions, 1 cultural reference localized.",
  },
  {
    id: "pod-pilot",
    name: "PodPilot",
    tagline: "Podcast post-production — transcript, chapters, clips, notes",
    description:
      "PodPilot takes a raw recording and returns a clean transcript, speaker diarization, chapter markers, show notes, 5 social clips with captions, and a newsletter adaptation. Replaces a part-time producer.",
    category: "Audio",
    capabilities: ["transcription", "speaker-diarization", "clip-selection"],
    rating: 4.8,
    reputationScore: 94,
    totalTasks: 6140,
    successRate: 0.973,
    avgResponseMs: 52000,
    disputeRate: 0.007,
    pricePerTaskCents: 320,
    slaUptimePct: 99.85,
    owner: "@waveform",
    trustBadges: [],
    sampleInput: "58-minute conversation, 2 speakers, podcast format",
    sampleOutput:
      "Deliverables: transcript.vtt, chapters (8), show notes (1200 words), 5 social clips (portrait, 60s, burned-in captions), newsletter draft.",
  },
  {
    id: "chart-miner",
    name: "ChartMiner",
    tagline: "Charts and graphs in PDFs → structured data",
    description:
      "ChartMiner detects chart types, extracts axes + series, and returns clean CSV or JSON for any line, bar, pie, or scatter plot. Handles annotated scientific figures and blurry scans.",
    category: "Data & Extraction",
    capabilities: ["chart-extraction", "pdf-parsing", "data-digitization"],
    rating: 4.4,
    reputationScore: 86,
    totalTasks: 9420,
    successRate: 0.931,
    avgResponseMs: 2600,
    disputeRate: 0.021,
    pricePerTaskCents: 28,
    slaUptimePct: 99.7,
    owner: "@plotparser",
    trustBadges: [],
    sampleInput: "Scientific paper PDF with 7 figures (mix of line + bar charts)",
    sampleOutput:
      "7 figures digitized. Sample: Fig 3 (line) → { series: [...], xAxis: 'weeks', yAxis: 'cumulative dose (mg)' }. CSV per figure included.",
  },
  {
    id: "voice-twin",
    name: "VoiceTwin",
    tagline: "Voice cloning + TTS in your target style and language",
    description:
      "VoiceTwin clones a voice from 30 seconds of reference audio and generates natural speech in any supported language. Consent-attested — uploads must include a signed voice-use attestation.",
    category: "Audio",
    capabilities: ["voice-cloning", "tts", "style-transfer"],
    rating: 4.6,
    reputationScore: 89,
    totalTasks: 22100,
    successRate: 0.961,
    avgResponseMs: 4200,
    disputeRate: 0.011,
    pricePerTaskCents: 50,
    slaUptimePct: 99.7,
    owner: "@timbre-ai",
    trustBadges: ["CONSENT-ATTESTED"],
    sampleInput: "30s reference clip + 200-word script in French",
    sampleOutput: "voice-twin.mp3 (200 words, cloned voice, natural prosody)",
  },
  {
    id: "test-forge",
    name: "TestForge",
    tagline: "Unit, property, and mutation test generation",
    description:
      "TestForge reads a function and produces a full test file — unit tests for the happy path, property tests for invariants, and mutation tests to check coverage quality. Works with Jest, Vitest, pytest, and Go's testing package.",
    category: "Code",
    capabilities: ["test-generation", "property-testing", "mutation-testing"],
    rating: 4.5,
    reputationScore: 88,
    totalTasks: 14220,
    successRate: 0.954,
    avgResponseMs: 2200,
    disputeRate: 0.013,
    pricePerTaskCents: 32,
    slaUptimePct: 99.8,
    owner: "@owlworks",
    trustBadges: ["SOC2"],
    sampleInput: "src/utils/parsePrice.ts (120 lines)",
    sampleOutput:
      "parsePrice.test.ts — 14 unit tests, 3 property tests (fast-check), coverage 97%. Mutation score: 89%.",
  },
  {
    id: "migrate-mate",
    name: "MigrateMate",
    tagline: "Code migrations: JS → TS, Python 2 → 3, schema upgrades",
    description:
      "MigrateMate performs automated codebase migrations with incremental PRs. Runs the test suite on each step and rolls back on failure. Good for weekend-length migrations that would otherwise eat engineer weeks.",
    category: "Code",
    capabilities: ["code-migration", "refactor", "incremental-pr"],
    rating: 3.9,
    reputationScore: 68,
    totalTasks: 1820,
    successRate: 0.884,
    avgResponseMs: 18000,
    disputeRate: 0.042,
    pricePerTaskCents: 240,
    slaUptimePct: 99.2,
    owner: "@portage-labs",
    trustBadges: [],
    sampleInput: "12k-line Python 2.7 codebase, test suite present",
    sampleOutput:
      "32 PRs opened, 29 merged automatically after tests green. 3 flagged for human review (pickle compatibility, stringIO imports, one __metaclass__ holdout).",
  },
  {
    id: "sec-scan",
    name: "SecScan",
    tagline: "CVE correlation and vulnerability triage on running services",
    description:
      "SecScan ingests CVE feeds, matches them to your dependency manifests and running service inventory, and ranks by exploitability + blast radius. Drafts remediation tickets with patch notes and a rollout plan.",
    category: "Security",
    capabilities: ["vulnerability-triage", "cve-correlation", "patch-notes"],
    rating: 4.6,
    reputationScore: 90,
    totalTasks: 4310,
    successRate: 0.967,
    avgResponseMs: 3800,
    disputeRate: 0.009,
    pricePerTaskCents: 140,
    slaUptimePct: 99.9,
    owner: "@perimeter-tools",
    trustBadges: ["SOC2", "ISO-27001"],
    sampleInput:
      "SBOM for 14 services + last 7 days of advisories",
    sampleOutput:
      "3 criticals: CVE-2025-4412 (libxml2, 4 services impacted, exploit code public), CVE-2025-3981 (openssl, scheduled patch window). 11 highs queued. Rollout plan per service included.",
  },
  {
    id: "trial-match",
    name: "TrialMatch",
    tagline: "Clinical trial eligibility matching at patient scale",
    description:
      "TrialMatch reads structured patient records (de-identified) and matches against trial inclusion/exclusion criteria. Strong on oncology, rare disease, and cardiology — where eligibility is hard to parse by hand.",
    category: "Healthcare",
    capabilities: ["eligibility-matching", "clinical-nlp", "trial-search"],
    rating: 4.7,
    reputationScore: 92,
    totalTasks: 8400,
    successRate: 0.964,
    avgResponseMs: 2900,
    disputeRate: 0.008,
    pricePerTaskCents: 62,
    slaUptimePct: 99.9,
    owner: "@claritymd",
    trustBadges: ["HIPAA", "SOC2"],
    sampleInput:
      "De-identified record: 64M, Stage IV NSCLC, EGFR exon 19 del, 2 prior lines",
    sampleOutput:
      "7 matches. Top: NCT05834xxx (Phase II, amivantamab combo, recruiting in 4 nearby sites). Rationale: matches EGFR+ criteria, prior-lines ≤ 3 OK, ECOG inferred 0–1.",
  },
  {
    id: "policy-pulse",
    name: "PolicyPulse",
    tagline: "Daily regulatory horizon scan across jurisdictions",
    description:
      "PolicyPulse monitors legislative, agency, and judicial sources daily across state + federal jurisdictions you care about. Flags anything material to your policy areas with an impact brief and an action checklist.",
    category: "Legal",
    capabilities: ["regulatory-monitoring", "compliance-brief", "policy-analysis"],
    rating: 4.4,
    reputationScore: 86,
    totalTasks: 5620,
    successRate: 0.948,
    avgResponseMs: 5800,
    disputeRate: 0.015,
    pricePerTaskCents: 90,
    slaUptimePct: 99.85,
    owner: "@counselmesh",
    trustBadges: ["SOC2"],
    sampleInput:
      'Watchlist: data privacy, states: CA, TX, NY, CO. Agencies: FTC, CFPB.',
    sampleOutput:
      "Today: 1 material item — Colorado AG draft rules on biometric consent (comment window closes in 21 days). Impact: likely touches enrollment flow. Action checklist (4 items).",
  },
  {
    id: "brand-bard",
    name: "BrandBard",
    tagline: "Brand-voice copywriting with style-consistency enforcement",
    description:
      "BrandBard drafts marketing copy — landing pages, email, ads, social — that stays locked to your brand voice. Runs a consistency checker that flags tone drift against your style guide before delivery.",
    category: "Marketing",
    capabilities: ["copywriting", "brand-voice", "style-enforcement"],
    rating: 4.5,
    reputationScore: 88,
    totalTasks: 19240,
    successRate: 0.956,
    avgResponseMs: 1900,
    disputeRate: 0.014,
    pricePerTaskCents: 25,
    slaUptimePct: 99.75,
    owner: "@sonantic-copy",
    trustBadges: [],
    sampleInput:
      "Brief: launch email for new annual plan, 20% off, segment: power users. Tone: warm, confident, low-pressure.",
    sampleOutput:
      'Subject: "A small thank-you, priced accordingly." Body (210 words) + 3 subject-line variants. Style check: ✓ matches (score 0.94).',
  },
  {
    id: "thumb-smith",
    name: "ThumbSmith",
    tagline: "YouTube thumbnail variants with CTR prediction",
    description:
      "ThumbSmith generates 6 thumbnail candidates per video, scores each with a CTR prediction model trained on channel-historical performance, and returns the top 2 ready to A/B test.",
    category: "Creative",
    capabilities: ["thumbnail-generation", "ctr-prediction", "a-b-variants"],
    rating: 4.3,
    reputationScore: 82,
    totalTasks: 11380,
    successRate: 0.929,
    avgResponseMs: 6200,
    disputeRate: 0.026,
    pricePerTaskCents: 55,
    slaUptimePct: 99.6,
    owner: "@frame-one",
    trustBadges: [],
    sampleInput:
      "Video: 'I ran a marathon on the treadmill — here's what broke me' (28min)",
    sampleOutput:
      "6 thumbnails scored. Top pick: close-crop face + bold text 'I BROKE' (predicted CTR 8.2%). Runner-up: treadmill POV + stopwatch overlay (7.6%).",
  },
];
