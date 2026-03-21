# Prediktivní simulátor reakcí na marketingové kampaně

Webová aplikace pro simulaci a analýzu reakcí cílových skupin na marketingové kampaně na sociálních sítích s využitím velkých jazykových modelů (LLM). Aplikace vzniká jako prototyp pro společnost Emplifi v rámci bakalářské práce.

## Kontext a motivace

Marketingové kampaně na sociálních sítích jsou ze své podstaty nepředvídatelné — reakce publika mohou být pozitivní, neutrální i silně negativní, a značky nemají možnost předem otestovat, jak jejich obsah přijme cílová skupina. Tento simulátor řeší problém nepředvídatelnosti tím, že pomocí LLM generuje realistické reakce fiktivních person z definované cílové skupiny na zadaný marketingový obsah **ještě před spuštěním kampaně**. Marketingový specialista tak získá preview očekávaných reakcí včetně metrik sentimentu, relevance, toxicity a nákupního záměru.

## Hlavní funkce

- **Správa kampaní** — CRUD operace pro marketingové kampaně (název + textový obsah reklamy)
- **Definice cílových skupin** — tvorba detailních popisů cílových skupin s konfigurovatelným počtem person (1–100)
- **Výběr sociální platformy** — simulace reakcí specifických pro Twitter/X, Facebook, Instagram, LinkedIn nebo TikTok (každá platforma má vlastní style guide v promptu)
- **Výběr LLM modelu** — podpora poskytovatelů OpenAI a xAI (Grok), uživatel si konfiguruje vlastní API klíče
- **Dvoustupňová simulace** — generování realistických first-person komentářů + nezávislé hodnocení metrik druhým LLM voláním
- **Real-time sledování výsledků** — Supabase Realtime subscriptions + polling fallback pro živé zobrazení výsledků
- **Analýza výsledků** — distribuce sentimentu, průměrné skóre relevance, toxicity a purchase intent, diskuzní vlákno reakcí
- **Export dat** — JSON export výsledků simulace
- **Vícejazyčná podpora** — generování reakcí v angličtině nebo češtině
- **Správa API klíčů** — uživatel si v profilu konfiguruje vlastní API klíče pro jednotlivé LLM poskytovatele

## Technologický stack

### Frontend
- **Next.js 15** (App Router) — React framework s Server Components, Server Actions a middleware
- **React 19** — funkcionální komponenty s hooks (useState, useEffect, useCallback, useRef)
- **TypeScript 5** — striktní režim, všechny soubory v .ts/.tsx
- **Tailwind CSS 3.4** — utility-first CSS framework s custom HSL color scheme a dark mode (class-based)
- **shadcn/ui** — komponentová knihovna nad Radix UI (Button, Card, Dialog, Table, Select, Badge, Form, AlertDialog, Avatar, Checkbox, DropdownMenu, Input, Label, Textarea)
- **react-hook-form + Zod** — formuláře s validací (@hookform/resolvers pro integraci)
- **recharts** — vizualizace dat (grafy)
- **lucide-react** — ikonová knihovna
- **sonner** — toast notifikace
- **next-themes** — přepínání dark/light mode

### Backend
- **Supabase** — Backend-as-a-Service (PostgreSQL databáze, Auth, Edge Functions, Realtime, Row Level Security)
- **Next.js Server Actions** — server-side funkce volané z klientských komponent pro bezpečný přístup k DB
- **Supabase Edge Functions** (Deno runtime) — asynchronní zpracování LLM simulací

### LLM integrace
- **Přímé API volání** — OpenAI-kompatibilní REST API (chat/completions endpoint)
- **Podporovaní poskytovatelé**: OpenAI (GPT-4o, GPT-4o Mini), xAI (Grok 3 Fast, Grok 3 Mini Fast)
- **Structured JSON output** — response_format: { type: "json_object" }
- **Temperature 0.7** — balancovaná kreativita

### Testování
- **Vitest 4.1** — testovací framework (unit a integrační testy)
- **Proxy-based Supabase mock** — vlastní chainable mock pro testování server actions

### Deployment
- **Vercel** — hosting Next.js aplikace
- **Supabase Cloud** — hosting databáze, auth a Edge Functions

## Architektura aplikace

### High-level diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        KLIENT (Browser)                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  Dashboard   │  │  Simulations │  │  Profile (API Keys)    │  │
│  │  (React)     │  │  (Realtime)  │  │  (react-hook-form)     │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬────────────┘  │
│         │                 │                       │               │
│         │    Supabase Browser Client (RLS)        │               │
└─────────┼─────────────────┼───────────────────────┼───────────────┘
          │                 │                       │
          ▼                 ▼                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     NEXT.JS SERVER                               │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Server Actions (campaigns, target-groups, simulations,    │  │
│  │  profile, api-keys) — auth check + Zod validace + DB ops  │  │
│  └────────────────────────────┬───────────────────────────────┘  │
│                               │                                  │
│  ┌────────────────────────────┴───────────────────────────────┐  │
│  │  Middleware — JWT session validace, redirect na login      │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                        SUPABASE                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  PostgreSQL   │  │  Auth        │  │  Edge Functions        │ │
│  │  (RLS)        │  │  (GoTrue)    │  │  run-llm-simulation    │ │
│  │              │  │  Email/OAuth  │  │  (Deno runtime)        │ │
│  └──────────────┘  └──────────────┘  └───────────┬────────────┘ │
│  ┌──────────────┐                                │              │
│  │  Realtime     │                                │              │
│  │  (WebSocket)  │                                │              │
│  └──────────────┘                                │              │
└──────────────────────────────────────────────────┼──────────────┘
                                                   │
                                                   ▼
                                    ┌──────────────────────────┐
                                    │      LLM PROVIDER API    │
                                    │  OpenAI (api.openai.com) │
                                    │  xAI (api.x.ai)         │
                                    └──────────────────────────┘
```

### Tok dat při simulaci

1. Uživatel na dashboardu vybere **kampaň**, **cílovou skupinu**, **platformu**, **LLM model** a **jazyk**
2. Klikne "Run Simulation" → volá se Server Action `runSimulation()`
3. Server Action:
   - Ověří autentizaci uživatele
   - Pre-flight check: ověří, že uživatel má nakonfigurovaný API klíč pro vybraného poskytovatele
   - Načte data kampaně a cílové skupiny z DB
   - Vytvoří **snapshoty** (immutabilní kopie dat v době simulace jako JSONB)
   - Vloží záznam simulace se statusem `pending`
   - **Fire-and-forget** zavolá Supabase Edge Function (bez await)
4. Uživatel je okamžitě přesměrován na detail simulace
5. Edge Function (`run-llm-simulation`):
   - Aktualizuje status na `running`
   - **Krok 1 — Generování reakcí**: Sestaví system + user prompt, zavolá LLM API, obdrží JSON s reakcemi person. Pokud LLM vrátí méně reakcí než požadováno, retry (max 2 pokusy)
   - **Krok 2 — Nezávislé hodnocení**: Druhé LLM volání hodnotí všechny reakce na třech metrikách (relevance, toxicity, purchase intent)
   - **Krok 3 — Spojení a uložení**: Spojí reakce s hodnocením, vloží do `simulation_results`, aktualizuje status na `completed`
6. Detail simulace v prohlížeči sleduje výsledky přes **Supabase Realtime** (postgres_changes) s fallback **polling každé 3s**

## Datový model

### ER diagram (vztahy)

```
profiles (1) ──────< (N) campaigns
profiles (1) ──────< (N) target_groups
profiles (1) ──────< (N) simulations
profiles (1) ──────< (N) user_api_keys

campaigns (1) ─ ─ ─< (N) simulations      [ON DELETE SET NULL]
target_groups (1) ─ ─< (N) simulations    [ON DELETE SET NULL]

simulations (1) ──────< (N) simulation_results  [ON DELETE CASCADE]
```

### Tabulky

#### `profiles`
Uživatelské profily — rozšíření Supabase Auth.
| Sloupec | Typ | Popis |
|---------|-----|-------|
| `id` | uuid, PK | ID uživatele (FK → auth.users) |
| `email` | text | E-mailová adresa |
| `username` | text, nullable | Uživatelské jméno (3–50 znaků, alfanumerické + _ -) |
| `created_at` | timestamp | Datum vytvoření |
| `updated_at` | timestamp | Datum poslední úpravy |

#### `campaigns`
Marketingové kampaně.
| Sloupec | Typ | Popis |
|---------|-----|-------|
| `id` | uuid, PK | ID kampaně |
| `user_id` | uuid, FK → profiles | Vlastník |
| `name` | text | Název kampaně (3–255 znaků) |
| `content` | text | Textový obsah reklamy (min 10 znaků) |
| `created_at` | timestamp | Datum vytvoření |

#### `target_groups`
Cílové skupiny pro simulace.
| Sloupec | Typ | Popis |
|---------|-----|-------|
| `id` | uuid, PK | ID cílové skupiny |
| `user_id` | uuid, FK → profiles | Vlastník |
| `name` | text | Název skupiny (3–255 znaků) |
| `description` | text | Detailní popis cílové skupiny (min 10 znaků) |
| `persona_count` | int | Počet person k vygenerování (1–100) |
| `created_at` | timestamp | Datum vytvoření |

#### `simulations`
Záznamy o simulacích.
| Sloupec | Typ | Popis |
|---------|-----|-------|
| `id` | uuid, PK | ID simulace |
| `user_id` | uuid, FK → profiles | Vlastník |
| `campaign_id` | uuid, FK → campaigns, nullable | Zdrojová kampaň (SET NULL při smazání) |
| `target_group_id` | uuid, FK → target_groups, nullable | Zdrojová cílová skupina (SET NULL při smazání) |
| `status` | enum | Stav: `pending`, `running`, `completed`, `failed` |
| `model` | text | ID použitého LLM modelu (např. `openai/gpt-4o`) |
| `campaign_snapshot` | jsonb | Immutabilní snapshot kampaně v době simulace |
| `target_group_snapshot` | jsonb | Immutabilní snapshot cílové skupiny |
| `error_message` | text, nullable | Chybová zpráva (při stavu `failed`) |
| `created_at` | timestamp | Datum spuštění |
| `finished_at` | timestamp, nullable | Datum dokončení |

Snapshot pattern: Data kampaně a cílové skupiny se ukládají jako JSONB snapshot v momentě spuštění simulace. Díky tomu zůstávají výsledky historicky přesné i pokud je originální kampaň/skupina později upravena nebo smazána.

#### `simulation_results`
Výsledky simulace — jednotlivé reakce person s metrikami.
| Sloupec | Typ | Popis |
|---------|-----|-------|
| `id` | uuid, PK | ID výsledku |
| `simulation_id` | uuid, FK → simulations | Simulace (CASCADE DELETE) |
| `persona_name` | text | Deskriptivní název persony |
| `content` | text | Text reakce (first-person komentář) |
| `sentiment` | enum | `positive`, `negative`, `neutral` |
| `relevance_score` | float (0–1) | Relevance kampaně pro personu |
| `toxicity_score` | float (0–1) | Toxicita/offenzivita reakce |
| `purchase_intent` | float (0–1) | Pravděpodobnost nákupu |
| `created_at` | timestamp | Datum vytvoření |

#### `user_api_keys`
API klíče uživatelů pro LLM poskytovatele.
| Sloupec | Typ | Popis |
|---------|-----|-------|
| `id` | uuid, PK | ID záznamu |
| `user_id` | uuid, FK → auth.users | Vlastník (CASCADE DELETE) |
| `provider` | text | Poskytovatel: `openai` nebo `xai` |
| `api_key` | text | Šifrovaný API klíč |
| `key_hint` | text | Poslední 4 znaky klíče (pro zobrazení v UI) |
| `created_at` | timestamp | Datum vytvoření |
| `updated_at` | timestamp | Datum poslední úpravy |
| UNIQUE | (user_id, provider) | Jeden klíč na poskytovatele na uživatele |

## Bezpečnostní model

### Autentizace
- **Supabase Auth** (nad GoTrue) — email/heslo + OAuth (Google)
- **JWT session** v cookies, validovaný middleware na každém requestu
- **Next.js Middleware** (`middleware.ts`) — přesměruje neautentizované uživatele na `/auth/login`

### Row Level Security (RLS)
Všechny tabulky mají aktivní RLS politiky:
| Tabulka | Politika |
|---------|----------|
| `profiles` | Uživatel vidí/edituje jen svůj profil |
| `campaigns` | CRUD pouze vlastní kampaně (`user_id = auth.uid()`) |
| `target_groups` | CRUD pouze vlastní cílové skupiny |
| `simulations` | Uživatel vidí/maže pouze vlastní simulace |
| `simulation_results` | Přístup přes simulaci (user_id check) |
| `user_api_keys` | Uživatel spravuje pouze své klíče |

### Ochrana API klíčů
- Klíče jsou **uloženy šifrovaně at rest** v Supabase
- Na klienta se **nikdy neposílá plný klíč** — pouze `key_hint` (poslední 4 znaky)
- Klíče se **čtou server-side** v Server Actions a Edge Function
- **Service role key** je použit pouze v Edge Function (server-side)

### Datová izolace
- Všechny server actions ověřují `supabase.auth.getUser()` před jakoukoliv operací
- Dotazy filtrují `.eq("user_id", user.id)` v kombinaci s RLS
- CORS chráněn Supabase

## Struktura projektu

```
bp-marketing-simulator-llm/
├── app/                              # Next.js App Router
│   ├── (protected)/                  # Route group — vyžaduje přihlášení
│   │   ├── dashboard/                # Hlavní dashboard (control center)
│   │   │   ├── components/
│   │   │   │   ├── DashboardClient.tsx    # State pro výběr kampaně/skupiny/platformy/modelu/jazyka
│   │   │   │   ├── CampaignsTable.tsx     # Tabulka kampaní s CRUD dialogy
│   │   │   │   └── TargetGroupsTable.tsx  # Tabulka cílových skupin s CRUD dialogy
│   │   │   └── page.tsx              # Server Component — načte data, předá klientovi
│   │   ├── simulations/              # Historie a detail simulací
│   │   │   ├── [id]/                 # Detail simulace
│   │   │   │   ├── components/
│   │   │   │   │   ├── SimulationResults.tsx  # Realtime + polling sledování výsledků
│   │   │   │   │   ├── AnalysisSummary.tsx    # Souhrnné statistiky (sentiment, skóre)
│   │   │   │   │   └── DiscussionThread.tsx   # Vlákno reakcí person (avatary, badges)
│   │   │   │   └── page.tsx
│   │   │   ├── components/
│   │   │   │   └── SimulationsTable.tsx       # Seznam simulací s filtrováním
│   │   │   └── page.tsx
│   │   ├── profile/                  # Uživatelský profil a správa API klíčů
│   │   │   ├── components/
│   │   │   │   ├── ProfileForm.tsx
│   │   │   │   └── ApiKeysForm.tsx
│   │   │   └── page.tsx
│   │   └── layout.tsx                # Layout s Navbar pro chráněné stránky
│   ├── auth/                         # Autentizační stránky
│   │   ├── login/                    # Přihlášení (email + Google OAuth)
│   │   ├── sign-up/                  # Registrace
│   │   ├── forgot-password/          # Reset hesla
│   │   ├── update-password/          # Nastavení nového hesla
│   │   ├── callback/route.ts         # OAuth callback handler
│   │   └── confirm/route.ts          # Email confirmation handler
│   ├── campaigns/
│   │   └── actions.ts                # Server Actions: createCampaign, updateCampaign, deleteCampaign
│   ├── target-groups/
│   │   └── actions.ts                # Server Actions: createTargetGroup, updateTargetGroup, deleteTargetGroup
│   ├── simulations/
│   │   └── actions.ts                # Server Actions: runSimulation, deleteSimulation
│   ├── profile/
│   │   ├── actions.ts                # Server Actions: getProfile, updateProfile
│   │   └── api-key-actions.ts        # Server Actions: getUserApiKeyHints, upsertApiKey, deleteApiKey
│   ├── layout.tsx                    # Root layout (Toaster, ThemeProvider)
│   ├── page.tsx                      # Landing page (veřejná)
│   └── globals.css                   # Globální styly + Tailwind direktivy
├── components/                       # Sdílené komponenty
│   ├── ui/                           # shadcn/ui komponenty (18 komponent)
│   ├── auth/                         # Autentizační komponenty
│   │   ├── GoogleSignInButton.tsx
│   │   └── ...
│   ├── Navbar.tsx                    # Hlavní navigace (Dashboard, Simulations, Profile, Logout)
│   ├── login-form.tsx
│   ├── sign-up-form.tsx
│   ├── logout-button.tsx
│   ├── forgot-password-form.tsx
│   ├── update-password-form.tsx
│   └── theme-switcher.tsx            # Dark/light mode přepínač
├── lib/                              # Utility a konfigurace
│   ├── supabase/
│   │   ├── client.ts                 # createBrowserClient — pro klientské komponenty
│   │   ├── server.ts                 # createServerClient — pro server actions
│   │   └── middleware.ts             # updateSession — JWT validace v middleware
│   ├── validation/                   # Zod validační schémata
│   │   ├── campaignSchema.ts         # name: 3–255 znaků, content: min 10 znaků
│   │   ├── targetGroupSchema.ts      # name: 3–255 znaků, description: min 10, persona_count: 1–100
│   │   ├── profileSchema.ts          # username: 3–50 znaků, alfanumerické
│   │   └── apiKeySchema.ts           # provider enum validace
│   └── utils.ts                      # cn() helper (clsx + tailwind-merge), hasEnvVars()
├── supabase/                         # Supabase konfigurace
│   ├── functions/
│   │   └── run-llm-simulation/       # Edge Function — jádro simulačního systému
│   │       ├── index.ts              # 542 řádků — prompt building, LLM volání, výsledky
│   │       └── deno.json             # Deno import mapa
│   ├── migrations/                   # SQL migrace
│   │   ├── 20250112_update_simulations_fk_constraints.sql
│   │   ├── 20250321_create_user_api_keys.sql
│   │   └── 20250322_add_purchase_intent.sql
│   └── config.toml                   # Supabase CLI konfigurace
├── __tests__/                        # Testy (Vitest)
│   ├── lib/
│   │   ├── utils.test.ts             # Unit testy utility funkcí
│   │   └── validation/
│   │       ├── campaignSchema.test.ts
│   │       ├── targetGroupSchema.test.ts
│   │       ├── profileSchema.test.ts
│   │       └── apiKeySchema.test.ts
│   └── integration/
│       ├── helpers/
│       │   └── supabaseMock.ts        # Proxy-based chainable Supabase mock
│       ├── campaigns/actions.test.ts
│       ├── target-groups/actions.test.ts
│       ├── simulations/actions.test.ts
│       └── simulation-flow.test.ts    # Systémový test celého toku
├── middleware.ts                      # Next.js middleware (auth redirect)
├── package.json
├── tsconfig.json                      # TypeScript strict mode, path alias @/*
├── tailwind.config.ts                 # Custom HSL barvy, dark mode, animace
├── vitest.config.ts                   # Vitest konfigurace
├── eslint.config.mjs                  # ESLint 9
├── postcss.config.mjs                 # PostCSS + Tailwind + Autoprefixer
└── next.config.ts                     # Exclude supabase functions z buildu
```

## LLM integrace — Prompt Engineering

### Dvoustupňový pipeline

Simulace používá dvě nezávislá LLM volání, čímž se odděluje kreativní generování od analytického hodnocení a zabraňuje se bias v evaluaci.

#### Krok 1: Generování reakcí

**System prompt** instruuje LLM k vytvoření N unikátních person na základě popisu cílové skupiny. Klíčové aspekty promptu:

- **Persona generation**: Každá persona má unikátní pozadí, motivaci a perspektivu. Jména person jsou deskriptivní (např. "Budget-Conscious College Student", "Retired Engineer Who Distrusts Ads")
- **Comment authenticity**: Reakce jsou psány v první osobě, jako by persona skutečně komentovala reklamu na dané platformě. Variabilní délka, přirozené nedokonalosti, emocionální reakce
- **Platform-specific style guide**: Každá platforma má detailní pokyny:
  - **Twitter/X**: 1–2 věty, hashtags, sarkasmus, punchy, 30–280 znaků
  - **Facebook**: Osobní příběhy, delší komentáře, emoji, tagování
  - **Instagram**: Krátké, emoji-heavy, trendy slang, "Fire" reakce
  - **LinkedIn**: Profesionální tón, thought leadership, reference na průmysl
  - **TikTok**: Gen-Z energie, slang ("no cap", "slay"), krátké, vtipné
- **Sentiment realism**: Realistická distribuce — ne 100% pozitivní ani negativní, variace v rámci každého sentimentu
- **Jazyková lokalizace**: Prompt obsahuje instrukci pro generování v angličtině nebo češtině (včetně lokalizovaných jmen person)

**User prompt** obsahuje: název kampaně, textový obsah reklamy, název cílové skupiny a její popis.

**Výstup**: Striktní JSON `{ "reactions": [{ "persona_name", "content", "sentiment" }] }`

**Retry logika**: Pokud LLM vrátí méně reakcí než požadovaný persona_count, provede se retry (max 2 pokusy).

#### Krok 2: Nezávislé hodnocení metrik

Druhé LLM volání dostane kampaň + vygenerované reakce a hodnotí je na třech metrikách:

| Metrika | Rozsah | Popis |
|---------|--------|-------|
| **Relevance Score** | 0.0–1.0 | Jak relevantní je kampaň pro personu na základě její reakce a profilu |
| **Toxicity Score** | 0.0–1.0 | Jak toxická/ofenzivní je reakce (0 = civilizovaná, 1 = hate speech) |
| **Purchase Intent** | 0.0–1.0 | Pravděpodobnost, že persona zakoupí produkt/službu na základě své reakce |

Každá metrika má detailní škálu v promptu (např. relevance: 0.0–0.2 = žádný vztah, 0.9–1.0 = přímo adresuje potřeby persony). Metriky jsou **vzájemně nezávislé** — toxický komentář může mít vysoký purchase intent.

**Výstup**: JSON `{ "evaluations": [{ "persona_name", "relevance_score", "toxicity_score", "purchase_intent" }] }`

### Technické parametry LLM volání

- **API formát**: OpenAI-kompatibilní chat/completions endpoint (používá se pro OpenAI i xAI)
- **Structured output**: `response_format: { type: "json_object" }` — vynucení JSON odpovědi
- **Temperature**: 0.7 — balancovaná kreativita vs. konzistence
- **Bez streamování** — volání vrací kompletní JSON odpověď (streamování není vhodné pro structured output)

### Podporované LLM modely

| Provider | Model | ID v aplikaci | Kategorie |
|----------|-------|---------------|-----------|
| xAI | Grok 3 Mini Fast | `xai/grok-3-mini-fast` | Rychlý (fast) |
| xAI | Grok 3 Fast | `xai/grok-3-fast` | Standardní |
| OpenAI | GPT-4o Mini | `openai/gpt-4o-mini` | Rychlý (fast) |
| OpenAI | GPT-4o | `openai/gpt-4o` | Standardní |

Model ID formát `provider/model` je používán konzistentně v UI, server actions i Edge Function. Fast modely mají kratší odhadovanou dobu zpracování v UI progress baru.

### Omezení výstupů závislá na promptu

- Kvalita a realističnost reakcí závisí na detailnosti popisu cílové skupiny — vágní popis vede k obecným reakcím
- LLM může generovat méně reakcí než požadovaný persona_count (řešeno retry logikou)
- Sentiment distribuce je přirozená, ale nemusí přesně odpovídat realitě
- Metriky (relevance, toxicity, purchase intent) jsou subjektivní hodnocení LLM, ne objektivní měření
- Jazykové verze (EN/CS) mohou mít různou kvalitu v závislosti na trénovacích datech modelu
- Cenové náklady rostou s počtem person a použitým modelem

## Uživatelské rozhraní

### Hlavní obrazovky

#### 1. Landing Page (`/`)
Veřejná stránka s tlačítky pro přihlášení/registraci.

#### 2. Dashboard (`/dashboard`)
Control center aplikace — hlavní pracovní plocha:
- **Tabulka kampaní** — seznam kampaní s možností vytvoření, editace a smazání (modální dialogy)
- **Tabulka cílových skupin** — seznam skupin s CRUD operacemi
- **Výběr platformy** — 5 tlačítek (Twitter, Facebook, Instagram, LinkedIn, TikTok)
- **Výběr LLM modelu** — dropdown s 4 modely
- **Přepínač jazyka** — EN / CZ toggle
- **Tlačítko Run Simulation** — spustí simulaci s validací (musí být vybrána kampaň i skupina)

Uživatelský tok: Vybere kampaň (klikne na řádek) → Vybere skupinu → Vybere platformu → Vybere model → Klikne "Run Simulation" → Přesměrován na detail

#### 3. Detail simulace (`/simulations/[id]`)
Real-time zobrazení výsledků:
- **Hlavička**: Název kampaně, cílová skupina, model, platforma, status badge
- **Progress bar**: Elapsed vs. estimated time (odhad na základě modelu a počtu person)
- **AnalysisSummary**: Distribuce sentimentu (positive/negative/neutral), průměrné skóre metrik
- **DiscussionThread**: Vlákno reakcí person — avatar, jméno, sentiment badge, text reakce, metriky
- **Export**: JSON export výsledků
- **Live indikátor**: Badge "Live" při aktivní Realtime subscription

#### 4. Historie simulací (`/simulations`)
Tabulka všech simulací s filtrováním, statusy a akcemi (zobrazit detail, smazat).

#### 5. Profil (`/profile`)
- **ProfileForm**: Editace uživatelského jména
- **ApiKeysForm**: Správa API klíčů per provider (přidání, aktualizace, smazání; visibility toggle pro klíč)

#### 6. Autentizace (`/auth/*`)
Login (email + Google OAuth), registrace, reset hesla, nastavení nového hesla.

### Navigace
- **Navbar**: Marketing Simulator (logo) | Dashboard | Simulations | Profile | Logout
- **ThemeSwitcher**: Dark/Light mode přepínač v navigaci

## State management

Aplikace **nepoužívá** globální state management knihovnu (Redux, Zustand apod.). Stav je řízen:

1. **Server Components** (výchozí) — data se načtou na serveru a předají jako props
2. **useState** — lokální UI stav v klientských komponentách (výběry, modály, formuláře)
3. **Server Actions** — mutace dat s `revalidatePath()` pro cache invalidaci
4. **Supabase Realtime** — live subscriptions na `postgres_changes` pro tabulky `simulations` a `simulation_results`
5. **Polling fallback** — každé 3 sekundy pro spolehlivost (pokud Realtime subscription nepřijímá data)

## Testování

### Testovací framework a konfigurace
- **Vitest 4.1** s `@vitejs/plugin-react`, environment: Node, globální utilities, path alias `@/*`
- Spuštění: `npm run test` (single run) / `npm run test:watch` (watch mode)

### Unit testy (validační schémata)
Testování Zod schémat pro všechny entity:
- **campaignSchema.test.ts**: Validní data, boundary testing (min/max délka), odmítnutí nevalidních dat, chybové zprávy
- **targetGroupSchema.test.ts**: Validace persona_count (1–100), description min length
- **profileSchema.test.ts**: Username formát (alfanumerické + _ -)
- **apiKeySchema.test.ts**: Provider enum validace
- **utils.test.ts**: Testy utility funkcí (cn helper)

### Integrační testy (server actions)
Testování server actions s mockovaným Supabase klientem:
- **supabaseMock.ts**: Proxy-based chainable mock — podporuje method chaining (`.from().select().eq()...`), konfigurovatelné výsledky per tabulka, mock autentizace, mock `functions.invoke()`
- **campaigns/actions.test.ts**: Testy `createCampaign`, `updateCampaign`, `deleteCampaign` — auth check, validace, DB operace
- **target-groups/actions.test.ts**: Testy CRUD operací pro cílové skupiny
- **simulations/actions.test.ts**: Test `runSimulation` — pre-flight API key check, snapshot vytváření, Edge Function invokace

### Systémový test
- **simulation-flow.test.ts**: End-to-end tok — vytvoření kampaně → vytvoření skupiny → spuštění simulace → ověření výsledků

## Spuštění projektu

### Požadavky
- Node.js 18+
- npm
- Supabase účet (nebo lokální Supabase CLI)
- API klíče pro LLM poskytovatele (OpenAI a/nebo xAI)

### Instalace

```bash
git clone https://github.com/your-repo/bp-marketing-simulator-llm.git
cd bp-marketing-simulator-llm
npm install
```

### Environment Variables

```env
# Supabase (povinné)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=xxx

# Pro server actions (povinné)
SUPABASE_SERVICE_ROLE_KEY=xxx
```

API klíče pro LLM poskytovatele se konfigurují přímo v aplikaci přes stránku Profile — každý uživatel si nastaví své vlastní klíče.

### Spuštění

```bash
# Development server (Turbopack)
npm run dev

# Build pro produkci
npm run build
npm start

# Testy
npm run test
npm run test:watch

# Linting
npm run lint
```

### Deployment Edge Function

```bash
supabase functions deploy run-llm-simulation
```

## Autor

David Sambazov — Bakalářská práce, 2025/26

## Licence

Tento projekt je součástí bakalářské práce.
