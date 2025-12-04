# Prediktivní simulátor reakcí na marketingové kampaně

Webová aplikace pro simulaci reakcí cílových skupin na marketingové kampaně s využitím velkých jazykových modelů (LLM).

## 🎯 O projektu

Aplikace umožňuje marketingovým specialistům testovat své kampaně ještě před jejich spuštěním. Pomocí LLM generuje realistické reakce fiktivních person z definované cílové skupiny na zadaný marketingový obsah.

### Hlavní funkce

- **Správa kampaní** - vytváření a správa marketingových kampaní
- **Definice cílových skupin** - tvorba detailních popisů cílových skupin s počtem person
- **Výběr sociální platformy** - simulace reakcí specifických pro Twitter/X, Facebook, Instagram, LinkedIn nebo TikTok
- **Výběr LLM modelu** - podpora více poskytovatelů (OpenAI, Anthropic, Google, xAI)
- **Simulace reakcí** - generování realistických first-person komentářů od virtuálních person
- **Analýza výsledků** - sentiment, relevance a toxicita každé reakce

## 🛠 Technologie

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui komponenty
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **LLM integrace**: Přímé API volání (OpenAI, Anthropic, Google Gemini, xAI Grok)
- **Deployment**: Vercel (frontend), Supabase (backend)

## 📁 Struktura projektu

```
bp-marketing-simulator-llm/
├── app/                          # Next.js App Router
│   ├── (protected)/              # Chráněné routes (vyžadují přihlášení)
│   │   ├── dashboard/            # Hlavní dashboard
│   │   │   ├── components/       # Komponenty dashboardu
│   │   │   │   ├── CampaignsTable.tsx    # Tabulka kampaní
│   │   │   │   ├── DashboardClient.tsx   # Hlavní klientská komponenta
│   │   │   │   └── TargetGroupsTable.tsx # Tabulka cílových skupin
│   │   │   └── page.tsx          # Stránka dashboardu
│   │   ├── campaigns/new/        # Vytvoření nové kampaně
│   │   ├── target-groups/new/    # Vytvoření nové cílové skupiny
│   │   ├── simulations/          # Přehled simulací
│   │   │   ├── [id]/             # Detail simulace
│   │   │   │   ├── components/   # Komponenty detailu
│   │   │   │   │   ├── SimulationResults.tsx  # Výsledky simulace
│   │   │   │   │   ├── AnalysisSummary.tsx    # Souhrn analýzy
│   │   │   │   │   └── DiscussionThread.tsx   # Vlákno diskuze
│   │   │   │   └── page.tsx      # Stránka detailu
│   │   │   └── page.tsx          # Seznam simulací
│   │   ├── profile/              # Uživatelský profil
│   │   └── layout.tsx            # Layout pro chráněné stránky
│   ├── auth/                     # Autentizace
│   │   ├── login/                # Přihlášení
│   │   ├── sign-up/              # Registrace
│   │   ├── forgot-password/      # Zapomenuté heslo
│   │   ├── callback/             # OAuth callback
│   │   └── ...
│   ├── campaigns/
│   │   ├── actions.ts            # Server actions pro kampaně
│   │   └── components/
│   │       └── CampaignForm.tsx  # Formulář kampaně
│   ├── target-groups/
│   │   ├── actions.ts            # Server actions pro cílové skupiny
│   │   └── components/
│   │       └── TargetGroupForm.tsx # Formulář cílové skupiny
│   ├── simulations/
│   │   └── actions.ts            # Server actions pro simulace
│   ├── profile/
│   │   └── actions.ts            # Server actions pro profil
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Globální styly
├── components/                   # Sdílené komponenty
│   ├── ui/                       # shadcn/ui komponenty
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── auth/                     # Autentizační komponenty
│   ├── Navbar.tsx                # Navigační lišta
│   └── ...
├── lib/                          # Utility a konfigurace
│   ├── supabase/                 # Supabase klienti
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   └── middleware.ts         # Auth middleware
│   ├── utils.ts                  # Pomocné funkce
│   └── validation/               # Zod schémata
│       ├── campaignSchema.ts
│       ├── targetGroupSchema.ts
│       └── profileSchema.ts
├── supabase/                     # Supabase konfigurace
│   ├── functions/                # Edge Functions
│   │   └── run-llm-simulation/   # Hlavní simulační funkce
│   │       ├── index.ts          # Entry point
│   │       └── deno.json         # Deno konfigurace
│   ├── migrations/               # Databázové migrace
│   └── config.toml               # Supabase konfigurace
├── middleware.ts                 # Next.js middleware (auth)
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## 🗄 Databázové schéma

### Tabulky

#### `profiles`
Uživatelské profily (rozšíření Supabase Auth).
- `id` (uuid, PK) - ID uživatele
- `email` (text) - E-mail
- `full_name` (text) - Jméno
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### `campaigns`
Marketingové kampaně.
- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles) - Vlastník
- `name` (text) - Název kampaně
- `content` (text) - Obsah/text kampaně
- `created_at` (timestamp)

#### `target_groups`
Cílové skupiny pro simulace.
- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles) - Vlastník
- `name` (text) - Název skupiny
- `description` (text) - Detailní popis cílové skupiny
- `persona_count` (int) - Počet person k vygenerování
- `created_at` (timestamp)

#### `simulations`
Záznamy o simulacích.
- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles)
- `campaign_id` (uuid, FK → campaigns, nullable)
- `target_group_id` (uuid, FK → target_groups, nullable)
- `status` (enum: pending, running, completed, failed)
- `model` (text) - Použitý LLM model
- `campaign_snapshot` (jsonb) - Snapshot kampaně v době simulace
- `target_group_snapshot` (jsonb) - Snapshot cílové skupiny
- `error_message` (text, nullable)
- `created_at` (timestamp)
- `finished_at` (timestamp, nullable)

#### `simulation_results`
Výsledky simulace - jednotlivé reakce person.
- `id` (uuid, PK)
- `simulation_id` (uuid, FK → simulations)
- `persona_name` (text) - Název persony
- `content` (text) - Text reakce
- `sentiment` (enum: positive, negative, neutral)
- `relevance_score` (float) - Relevance 0-1
- `toxicity_score` (float) - Toxicita 0-1
- `created_at` (timestamp)

## 🔄 Architektura simulace

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Dashboard     │────▶│  Server Action   │────▶│    Supabase     │
│   (Next.js)     │     │  runSimulation() │     │   (Database)    │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   LLM API       │◀────│  Edge Function   │◀────│   Supabase      │
│ (OpenAI/etc.)   │     │ run-llm-simulation│    │  Functions      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

1. Uživatel vybere kampaň, cílovou skupinu, platformu a model
2. Server action vytvoří záznam simulace v DB se statusem "pending"
3. Zavolá se Supabase Edge Function
4. Edge Function:
   - Načte data simulace z DB
   - Aktualizuje status na "running"
   - Sestaví prompt pro LLM
   - Zavolá příslušné LLM API
   - Uloží výsledky do DB
   - Aktualizuje status na "completed"

## 🚀 Spuštění projektu

### Požadavky
- Node.js 18+
- npm nebo yarn
- Supabase účet
- API klíče pro LLM poskytovatele

### Instalace

```bash
# Klonování repozitáře
git clone https://github.com/your-repo/bp-marketing-simulator-llm.git
cd bp-marketing-simulator-llm

# Instalace závislostí
npm install

# Konfigurace environment variables
cp .env.example .env.local
# Vyplňte hodnoty v .env.local
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=xxx

# Pro Edge Function (nastavit přes supabase secrets set)
# X_API_KEY=xxx          # xAI/Grok
# OPENAI_API_KEY=xxx     # OpenAI
# ANTHROPIC_API_KEY=xxx  # Anthropic
# GOOGLE_API_KEY=xxx     # Google Gemini
```

### Spuštění

```bash
# Development server
npm run dev

# Build pro produkci
npm run build
npm start
```

### Deployment Edge Function

```bash
# Nastavení API klíčů
supabase secrets set X_API_KEY=xxx
supabase secrets set OPENAI_API_KEY=xxx

# Deploy
supabase functions deploy run-llm-simulation
```

## 📊 Podporované LLM modely

| Provider | Model | ID |
|----------|-------|-----|
| xAI | Grok 3 Mini Fast | `xai/grok-3-mini-fast` |
| xAI | Grok 3 Fast | `xai/grok-3-fast` |
| OpenAI | GPT-4o Mini | `openai/gpt-4o-mini` |
| OpenAI | GPT-4o | `openai/gpt-4o` |
| Anthropic | Claude 3.5 Haiku | `anthropic/claude-3-5-haiku-latest` |
| Anthropic | Claude Sonnet 4 | `anthropic/claude-sonnet-4-20250514` |
| Google | Gemini 2.0 Flash | `google/gemini-2.0-flash` |
| Google | Gemini 2.5 Flash | `google/gemini-2.5-flash-preview-05-20` |

## 👤 Autor

David Sambazov - Bakalářská práce, 2025

## 📄 Licence

Tento projekt je součástí bakalářské práce.
