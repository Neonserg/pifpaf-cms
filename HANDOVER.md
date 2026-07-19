# Handover

Стан проєкту на липень 2026. Для технічного опису дивись [ARCHITECTURE.md](ARCHITECTURE.md), для процесу розробки — [CONTRIBUTING.md](CONTRIBUTING.md), повне ТЗ — [docs/TOR_pifpaf_CMS.docx](docs/TOR_pifpaf_CMS.docx).

## Що готово

- **Фаза 0** — каркас Next.js + Supabase, CI, схема БД
- **Фаза 1** — автентифікація адміна, дерево сторінок/меню, медіатека (bulk upload, реальні пропорції фото/відео)
- **Фаза 2** — конструктор сторінок: текст, багатоколонковий текст, галерея (3 лайаути), окреме медіа
- **Фаза 3** — публічна частина сайту (маршрутизація за деревом сторінок, бічне меню, рендер блоків, лайтбокс для галерей), налаштування сайту (`/admin/settings`), конструктор контактних форм (`/admin/forms`)
- **Аудит оптимізації/безпеки/SEO** (18.07.2026, PR #15) — див. розділ нижче
- **Масштаб галерей + стилі меню** (19.07.2026, PR #16) — кнопки "−"/"+" поруч із заголовком сторінки (`GalleryZoomControl`, `lib/gallery-zoom.ts`), 6 кроків (-2..+4, ~25%/крок), стан спільний для всіх галерей на сторінці й зберігається в localStorage; превью завжди генерується в одному фіксованому розмірі (крок +2 від бази), інші рівні — чистий CSS-ресайз без нових запитів. Пункти бічного меню тепер по центру колонки й жирним; "Home" → "home"
- **Мобільні відступи + два лого для тем** (19.07.2026) — зменшено верхній відступ над галереями на мобільних (`.public-main`/`.public-page-header` у `styles/public.css`); лого тепер два незалежні файли — `settings.logo_light_url`/`logo_dark_url`, завантажуються в `/admin/settings` → «Логотип», публічна частина обирає файл за поточною темою з фолбеком на старе єдине лого, поки нові не завантажені

Наповнення контентом перенесено з поточного сайту pifpaf.online: структура верхнього рівня меню (`food & drinks`, `pack`, `people & ...`, `video recipes`, `contacts`, зовнішнє посилання на студію), головна сторінка (усі 165 фото з розділу Best Gallery), і всі підгалереї `food & drinks` (44) та `pack` (27) з оригінальними фото в нативній роздільності. `video recipes` навмисно не переносились — потребують окремого рішення (див. нижче).

## Аудит 18.07.2026 (PR #15) — що змінилось і чому

**Кешування публічної частини.** Публічні читання йдуть через cookie-less клієнт `lib/supabase/public.ts` (звичайний `createClient`, без сесії) — саме тому публічні сторінки більше не динамічні: `[[...slug]]/page.tsx` має `revalidate = 300` + `generateStaticParams`, усі ~77 сторінок пререндеряться (SSG/ISR). Адмінські дії (pages/blocks/forms/deleteMedia) додатково викликають `revalidatePath("/", "layout")`, тож публікація оновлює сайт одразу. **Важливо:** нічого в дереві `app/(public)` не повинно читати `cookies()`/`headers()` під час рендеру — це поверне динамічний рендеринг на кожен запит (у server actions можна).

**Форми: захист від спаму.** Публічна вставка в `form_submissions` через пряму INSERT-політику видалена. Єдиний шлях — Postgres-функція `submit_form(p_form_id, p_data, p_ip_hash)` (SECURITY DEFINER): перевіряє існування форми і тримає ліміт 5 заявок/10 хв на IP (у БД зберігається лише SHA-256-хеш IP, колонка `ip_hash`). Advisors Supabase попереджають, що ця функція доступна anon — це навмисно, не «виправляти».

**SEO.** Per-page `<title>`/OG через `generateMetadata` у `[[...slug]]/page.tsx`; `app/sitemap.ts` (всі сторінки з `pathMap`) і `app/robots.ts` (disallow `/admin`). Базовий URL — `NEXT_PUBLIC_SITE_URL`, фолбек `https://pifpaf.online`.

**Security-заголовки** у `next.config.mjs`: `X-Frame-Options: DENY`, CSP `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.

**Медіа.** Bucket `media` обмежено на рівні Supabase: 100 МБ, лише `image/*`/`video/*`. В адмінці додатковий ліміт: фото ≤ 10 МБ, відео ≤ 100 МБ. Публічні медіа-блоки використовують `mediaThumbUrl` + `loading="lazy"`; відео — `preload="metadata"`; лайтбокс префетчить сусідні фото.

**БД.** Індекси на `forms.page_id`, `settings.home_page_id`; RLS-політики переструктуровано: `FOR ALL`-політики розбиті на INSERT/UPDATE/DELETE, обмежені роллю `authenticated` з initplan-safe перевіркою `(select auth.uid())`. Усі попередження Supabase advisors закриті (крім навмисних, див. вище).

**Деплой-урок:** міграції через MCP б'ють у продакшн-БД миттєво, а код їде тільки з мержем у main. Всі зміни, що ламають старий код (видалення політики/гранту), робити у два кроки: спершу адитивна міграція, після деплою — прибирання старого шляху.

### Ручні кроки, які ще не зроблені (потрібен дашборд)

- **Leaked Password Protection**: Supabase Dashboard → Authentication → Passwords — увімкнути (через API/MCP недоступно)
- **`NEXT_PUBLIC_IMAGE_TRANSFORM=on`** у Vercel env: без нього `mediaThumbUrl` віддає оригінали замість мініатюр. Вмикати лише якщо тариф Supabase підтримує image transformations
- **`NEXT_PUBLIC_SITE_URL`** у Vercel env — виставити фінальний домен, коли pifpaf.online переїде
- **Auth Site URL / Redirect URLs**: Supabase Dashboard → Authentication → URL Configuration — досі стоїть дефолтний `http://localhost:3000`, тому лінки скидання пароля й magic link ведуть на localhost. Виставити Site URL на `https://pifpaf-cms.vercel.app` (пізніше — фінальний домен) і додати його в Redirect URLs

## Що лишилось (за ТЗ, розділ 15)

- Email-сповіщення про нові заявки з форм (зараз заявки бачить лише адмін у списку — це відповідає ТЗ, email опційний)
- Обробка відеорецептів: у старій системі відео вставлені через YouTube iframe у підписі фото-елемента — потребує окремого рішення (нативне відео чи YouTube-вбудова)
- Перенесення домену pifpaf.online на Vercel-деплой (сайт уже працює в продакшні на тимчасовому домені `pifpaf-cms.vercel.app`; початковий план із DigitalOcean App Platform не реалізовувався)
- Кросбраузерне/мобільне тестування "в бою" (структурно перевірено, але не на реальних пристроях)

## Доступи

- **GitHub**: [Neonserg/pifpaf-cms](https://github.com/Neonserg/pifpaf-cms) — публічний репозиторій
- **Supabase**: проєкт `pifpaf-cms` (ref `uncpsomdrijhosgrdgwr`), організація Naiv — доступ через [Supabase Dashboard](https://supabase.com/dashboard/project/uncpsomdrijhosgrdgwr)
- **Vercel**: команда NAIV, проєкт `pifpaf-cms` — production-деплой з гілки `main` автоматично; тимчасовий публічний домен `pifpaf-cms.vercel.app` (гілкові аліаси закриті Vercel SSO)
- **Адмінка сайту** (`/admin/login`): облікові дані зберігаються приватно у власника проєкту, тут не публікуються (репозиторій публічний)

## Локальний запуск

```bash
npm install
cp .env.example .env.local   # заповнити NEXT_PUBLIC_SUPABASE_URL і NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY зі свого Supabase-проєкту
npm run dev                   # http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY` застосунком у продакшені не використовується — потрібен лише для одноразових скриптів масового імпорту медіа (не в репозиторії, зберігати локально в `.env.local`, ніколи не комітити).
