# Архітектура

Технічна довідка для розробників/агентів, що працюють над кодом. Детальні вимоги — у [ТЗ](docs/TOR_pifpaf_CMS.docx).

## Стек

- **Frontend**: Next.js (App Router), TypeScript
- **Backend**: Supabase — PostgreSQL, Storage, Auth, Row Level Security
- **Хостинг**: Vercel (frontend), Supabase Cloud (backend) — під'єднання заплановане на Фазу 4
- **Дизайн-токени**: `styles/tokens.css`, ті самі значення, що й у `prototypes/admin_prototype.html` — тримати синхронізованими

## Структура репозиторію

```
app/                  Next.js App Router: сторінки і layout
lib/supabase/         фабрики Supabase-клієнтів + згенеровані типи БД
styles/                дизайн-токени (CSS custom properties)
docs/                  ТЗ та супутня документація
prototypes/            клікабельні HTML-прототипи (референс для UI, не production-код)
```

## Модель даних (Supabase, схема `public`)

| Таблиця | Призначення |
|---|---|
| `pages` | Дерево меню/сторінок. `type`: `category` \| `content` \| `link` \| `spacer`. `parent_id` — вкладеність категорій. |
| `blocks` | Блоки конструктора сторінок, належать `pages` (тільки для `type=content`). `type`: `text` \| `columns` \| `gallery` \| `media`. Довільні дані блоку — у `data jsonb`. |
| `media` | Медіатека: фото і відео, `storage_path` вказує на файл у Supabase Storage. |
| `forms` / `form_submissions` | Конструктор форм і вхідні заявки. |
| `settings` | Єдиний рядок налаштувань сайту. |

RLS увімкнено на всіх таблицях: публічний `SELECT` для рендеру сайту, запис — лише для автентифікованої сесії адміністратора (реальна автентифікація підключається у Фазі 1). Виняток — `form_submissions.INSERT`, відкритий публічно навмисно (відвідувач надсилає форму без входу).

Схема застосовується через Supabase MCP `apply_migration` (кожна зміна — окрема іменована міграція). Типи в `lib/supabase/database.types.ts` перегенеровуються `generate_typescript_types` після кожної зміни схеми і комітяться разом зі змінами.

## Мультиінсталяційність

Це НЕ мультитенантна система. Кожен новий сайт-клієнт — окрема інсталяція цього ж репозиторію: власний Supabase-проєкт, власний деплой, власний домен. Дивись розділ 11 ТЗ.
