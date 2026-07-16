# pifpaf-cms

Власна CMS для фотопортфоліо-сайту [pifpaf.online](https://www.pifpaf.online) — заміна поточної платформи 22Slides.com.

Стек: Next.js (frontend) + Supabase (Postgres, Storage, Auth). Деталі — у [ТЗ](docs/TOR_pifpaf_CMS.docx).

## Структура репозиторію

- `docs/` — технічне завдання та супутня документація
- `prototypes/` — клікабельні HTML-прототипи інтерфейсу (адмінка, згодом публічна частина)

## Інфраструктура

- **GitHub**: [Neonserg/pifpaf-cms](https://github.com/Neonserg/pifpaf-cms) — окремий репозиторій, не повʼязаний з іншими проєктами акаунта.
- **Supabase**: проєкт `pifpaf-cms` (ref `uncpsomdrijhosgrdgwr`, регіон eu-central-1, організація Naiv) — окремий від решти проєктів організації. URL: `https://uncpsomdrijhosgrdgwr.supabase.co`
- **Vercel**: ще не підключено — плануємо під'єднати, коли з'явиться реальний Next.js-код для деплою.

## Розробка

Проєкт розробляється поетапно (фази 0–6, див. ТЗ, розділ 15). Гілка `main` захищена, зміни йдуть через Pull Request.
