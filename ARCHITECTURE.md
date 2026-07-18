# Архітектура

Технічна довідка для розробників/агентів, що працюють над кодом. Детальні вимоги — у [ТЗ](docs/TOR_pifpaf_CMS.docx).

## Стек

- **Frontend**: Next.js (App Router), TypeScript
- **Backend**: Supabase — PostgreSQL, Storage, Auth, Row Level Security
- **Хостинг**: Vercel (команда NAIV, проєкт `pifpaf-cms`, автодеплой з `main`; тимчасовий домен `pifpaf-cms.vercel.app` до переносу pifpaf.online), Supabase Cloud (бекенд)
- **Дизайн-токени**: `styles/tokens.css`, ті самі значення, що й у `prototypes/admin_prototype.html` — тримати синхронізованими

## Структура репозиторію

```
app/(public)/          публічна частина сайту: маршрутизація за деревом сторінок, блоки, галереї, форми
app/admin/              адмінка: автентифікація, конструктор сторінок, медіатека, форми, налаштування
lib/supabase/           фабрики Supabase-клієнтів + згенеровані типи БД
                        server.ts — cookie-сесія (адмінка/actions); public.ts — cookie-less
                        клієнт для публічних читань (обов'язково: cookies() у публічному
                        дереві зламали б SSG/ISR-кешування)
lib/public-pages.ts     резолв URL → сторінка, дерево меню (кешовано через React `cache()`)
lib/gallery-layout.ts   спільний алгоритм плитки галереї (адмінка + публічна частина)
styles/                 дизайн-токени + окремі стилі адмінки (`admin.css`) і публічної частини (`public.css`)
docs/                   ТЗ та супутня документація
prototypes/             клікабельні HTML-прототипи (референс для UI, не production-код)
```

## Модель даних (Supabase, схема `public`)

| Таблиця | Призначення |
|---|---|
| `pages` | Дерево меню/сторінок. `type`: `category` \| `content` \| `link` \| `spacer`. `parent_id` — вкладеність категорій. |
| `blocks` | Блоки конструктора сторінок, належать `pages` (тільки для `type=content`). `type`: `text` \| `columns` \| `gallery` \| `media`. Довільні дані блоку — у `data jsonb`. |
| `media` | Медіатека: фото і відео, `storage_path` вказує на файл у Supabase Storage. |
| `forms` / `form_submissions` | Конструктор форм і вхідні заявки. |
| `settings` | Єдиний рядок налаштувань сайту. |

RLS увімкнено на всіх таблицях: публічний `SELECT` для рендеру сайту (крім `form_submissions` — її читає лише адмін), запис — лише для ролі `authenticated` (політики розбиті по командах INSERT/UPDATE/DELETE). Публічне надсилання форм іде НЕ через INSERT-політику, а через функцію `public.submit_form(...)` (SECURITY DEFINER) з перевіркою існування форми і rate limit 5 заявок/10 хв на SHA-256-хеш IP.

Схема застосовується через Supabase MCP `apply_migration` (кожна зміна — окрема іменована міграція). Типи в `lib/supabase/database.types.ts` перегенеровуються `generate_typescript_types` після кожної зміни схеми і комітяться разом зі змінами.

## Мультиінсталяційність

Це НЕ мультитенантна система. Кожен новий сайт-клієнт — окрема інсталяція цього ж репозиторію: власний Supabase-проєкт, власний деплой, власний домен. Дивись розділ 11 ТЗ.
