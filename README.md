# Monitor Polític Municipal
## Castell-Platja d'Aro — Sistema d'intel·ligència municipal automatitzada

Aplicació web per a la fiscalització i seguiment de l'activitat municipal de l'Ajuntament de Castell-Platja d'Aro.

---

## Stack tecnològic

- **Framework**: Next.js 14 (App Router)
- **Base de dades**: Supabase (PostgreSQL)
- **IA**: OpenAI GPT-4o-mini
- **Estils**: Tailwind CSS + shadcn/ui
- **Deploy**: Vercel
- **Gràfics**: Recharts

---

## Configuració inicial

### 1. Clona el repositori

```bash
git clone https://github.com/[el-teu-usuari]/monitor-politic.git
cd monitor-politic
npm install
```

### 2. Configura les variables d'entorn

```bash
cp .env.example .env.local
```

Omple els valors a `.env.local`:

| Variable | On trobar-la |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public |
| `SUPABASE_SERVICE_KEY` | Supabase → Project Settings → API → service_role |
| `OPENAI_API_KEY` | platform.openai.com → API Keys |
| `TELEGRAM_BOT_TOKEN` | Telegram → @BotFather → /newbot |
| `TELEGRAM_CHAT_ID` | Visita: api.telegram.org/bot[TOKEN]/getUpdates |
| `RESEND_API_KEY` | resend.com → API Keys |

### 3. Crea la base de dades a Supabase

Al **SQL Editor** de Supabase, executa:

```sql
-- Copia i enganxa el contingut de:
supabase/migrations/001_initial_schema.sql
```

### 4. Executa en local

```bash
npm run dev
```

Obre [http://localhost:3000](http://localhost:3000)

---

## Deploy a Vercel

### Opció A — Via GitHub (recomanat)

1. Puja el codi a GitHub
2. Ves a [vercel.com](https://vercel.com) → Import Project
3. Selecciona el repositori
4. Afegeix les variables d'entorn (les mateixes que a `.env.local`)
5. Deploy → automàtic en cada `git push`

### Opció B — Via CLI

```bash
npm i -g vercel
vercel --prod
```

---

## Estructura del projecte

```
monitor-politic/
├── app/
│   ├── (auth)/          # Login i registre
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/     # App principal (protegida)
│   │   ├── dashboard/   # Pàgina principal amb stats
│   │   ├── documents/   # Llista i fitxes de documents
│   │   ├── assistent/   # Assistent de Preparació (mòdul clau)
│   │   ├── compromisos/ # Seguiment de compromisos del govern
│   │   ├── analisi/     # Gràfics polítics avançats
│   │   └── admin/       # Panell d'administració
│   └── api/             # API routes del backend
│       ├── auth/        # Registre i autenticació
│       ├── documents/   # CRUD de documents
│       ├── assistent/   # Endpoint de l'Assistent de Preparació
│       ├── compromisos/ # CRUD de compromisos
│       └── stats/       # Estadístiques del dashboard
├── components/
│   ├── layout/          # Sidebar i TopBar
│   ├── charts/          # Gràfics (Recharts)
│   ├── documents/       # Components de fitxes
│   ├── assistent/       # Components de l'assistent
│   └── compromisos/     # Components de compromisos
├── lib/
│   ├── supabase/        # Clients de Supabase (server i client)
│   ├── openai.ts        # Client OpenAI i prompts
│   ├── constants.ts     # Constants de l'app
│   └── utils.ts         # Funcions utilitàries
├── types/               # TypeScript types
├── supabase/
│   └── migrations/      # SQL de la base de dades
├── middleware.ts         # Protecció de rutes
└── .env.example         # Plantilla de variables d'entorn
```

---

## Mòduls principals

### Assistent de Preparació
El mòdul diferencial. Permet preguntar en llenguatge natural sobre qualsevol tema municipal i genera un informe complet amb antecedents, acords vigents, imports, vulnerabilitats del govern i preguntes suggerides per al ple.

**Cas d'ús típic**: Abans d'un ple, el regidor escriu "Tot el que saps sobre la contracta de neteja viaria" i rep en 30 segons un informe complet amb historial, imports i preguntes per fer.

### Vigilància automàtica
Monitoritza 5 fonts oficials dues vegades al dia. Detecta novetats, les analitza amb OpenAI i les classifica per urgència.

### Dashboard polític
8 gràfics de valor polític: venciments, imports per mes, distribució per tema, ranking de proveïdors, mapa de calor d'activitat, temes del BPM, compromisos complerts vs incomplerts, comparativa intermunicipal.

---

## Usuaris i permisos

| Permís | Administrador | Usuari normal |
|---|---|---|
| Veure documents | ✅ | ✅ |
| Editar Observacions | ✅ | ✅ |
| Editar altres camps | ✅ | ❌ |
| Gestionar compromisos | ✅ | ❌ |
| Validar registres | ✅ | ❌ |
| Rep Telegram | ✅ | ❌ |
| Rep emails | ✅ | ✅ |

**Administrador**: `aitor.tendero@gmail.com` (únic, no configurable)

---

## Idioma

- Interfície i resums de la IA en **català per defecte**
- L'usuari pot canviar a **castellà** des del seu perfil
- L'Assistent accepta preguntes en català i castellà indistintament

---

## Cost operatiu estimat

| Servei | Cost mensual |
|---|---|
| OpenAI GPT-4o-mini | 2 — 4 €/mes |
| Supabase (Free tier) | 0 €/mes |
| Vercel (Hobby) | 0 €/mes |
| Resend (Free tier) | 0 €/mes |
| **Total** | **2 — 4 €/mes** |
