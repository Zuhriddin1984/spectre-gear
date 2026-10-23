# Spectre Gear

Spectrerental учун ички ускуна бошқаруви тизими: 284 та ускуна, бронлар (икки марта бронлаш мумкин эмас), QR орқали бериш ва қайтариш, комплектлар, таъмир тарихи, инвентаризация, мижозлар, ҳисоботлар, шартнома ва қабул-топшириш акти, Telegram эслатма. Тил: ўзбек (кирилл) ва рус.

Технологиялар: Next.js 14 (сайт), Supabase (база, кириш, расмлар), Vercel (хостинг).

## Ишга тушириш (бир марта)

### 1. Supabase (база)
1. https://supabase.com га GitHub орқали киринг → **New project**. Номи: `spectre-gear`, Region: **Central EU (Frankfurt)**, база паролини сақлаб қўйинг.
2. Лойиҳа очилгач: **SQL Editor** → **New query**. `supabase/migrations/0001_init.sql` файлининг бутун матнини қўйинг → **Run**.
3. Яна **New query** → `supabase/migrations/0002_pin_login.sql` матнини қўйинг → **Run**.
4. Яна **New query** → `supabase/seed.sql` матнини қўйинг → **Run** (284 та ускуна ва тоифалар қўшилади).
5. **Project Settings → API Keys** бўлимидан учта қийматни олинг: `Project URL`, **Legacy API Keys** варағидаги `anon public` (`eyJ...`) ва `service_role` калитлар.

### 2. Vercel (хостинг)
1. https://vercel.com га GitHub орқали киринг → **Add New → Project** → `spectre-gear` репосини **Import** қилинг.
2. **Environment Variables** бўлимига қўшинг:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public калит
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role калит (махфий, ҳеч кимга берманг)
   - `ACCESS_PIN` = ходимлар кирадиган умумий PIN-код (4–6 рақам)
   - `CRON_SECRET` = исталган узун тасодифий матн
   - ихтиёрий: `COMPANY_NAME`, `COMPANY_DETAILS` (СТИР, ҳисоб рақам, манзил), `COMPANY_CITY` — шартномада чиқади
3. **Deploy** (калитларни кейин ўзгартирсангиз: **Deployments → ⋯ → Redeploy**). **Settings → Deployment Protection → Vercel Authentication** ни ўчиринг, акс ҳолда ходимлар сайтни очолмайди.
4. Сайтни очинг: биринчи киришда исмингиз ва PIN сўралади, сиз **администратор** бўласиз. Бошқа ходимларни **Ходимлар** бўлимидан қўшасиз. Тайёр бўлгач, `https://spectre-gear-....vercel.app` манзили беради. Кейин ўз доменингизни (масалан, `gear.spectrerental.uz`) **Settings → Domains** да улаш мумкин.

### 3. Telegram эслатма (ихтиёрий)
1. Telegram'да **@BotFather** → `/newbot` → бот номи → токен беради.
2. Ботни ходимлар гуруҳига қўшинг ва гуруҳда бирор хабар ёзинг. `https://api.telegram.org/bot<ТОКЕН>/getUpdates` очиб, `chat.id` ни олинг (гуруҳда минус билан бошланади).
3. Vercel'да `TELEGRAM_BOT_TOKEN` ва `TELEGRAM_CHAT_ID` ни қўшинг ва қайта Deploy қилинг. Ҳар куни соат 10:00 да (Тошкент) муддати ўтган ижаралар рўйхати келади.

## Кундалик иш
- **Скан**: телефонда сайтни очинг → «Скан» → камерани ёқинг → ускунадаги QR. Ускуна саҳифасида бериш, қайтариш, таъмир тугмалари бор.
- **QR-ёрлиқлар**: тоифани танланг → «Чоп этиш». A4 ёки ёрлиқ принтерига.
- **Нархлар**: ускуна саҳифасида «Кунлик нарх» (фақат администратор ўзгартиради).

## Дастурчилар учун
```
cp .env.example .env.local   # Supabase қийматларини ёзинг
npm install
npm run dev
```
Маълумотлар тузилмаси ва бизнес қоидалари: `supabase/migrations/0001_init.sql` (икки марта бронлаш база даражасида `no_double_booking` чеклови билан тақиқланган).
