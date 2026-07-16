# pifpaf-cms

Власна CMS для фотопортфоліо-сайту [pifpaf.online](https://www.pifpaf.online) — заміна поточної платформи 22Slides.com.

Стек: Next.js (frontend) + Supabase (Postgres, Storage, Auth). Деталі — у [ТЗ](docs/TOR_pifpaf_CMS.docx).

## Структура репозиторію

- `app/`, `lib/`, `styles/` — код Next.js-застосунку
- `docs/` — технічне завдання та супутня документація
- `prototypes/` — клікабельні HTML-прототипи інтерфейсу (адмінка, згодом публічна частина)

## Інфраструктура

- **GitHub**: [Neonserg/pifpaf-cms](https://github.com/Neonserg/pifpaf-cms) — окремий репозиторій, не повʼязаний з іншими проєктами акаунта. Публічний (потрібно для безкоштовного branch protection на приватних репо GitHub вимагає Pro).
- **Supabase**: проєкт `pifpaf-cms` (ref `uncpsomdrijhosgrdgwr`, регіон eu-central-1, організація Naiv) — окремий від решти проєктів організації. URL: `https://uncpsomdrijhosgrdgwr.supabase.co`
- **Vercel**: проєкт `pifpaf-cms` (команда NAIV) — підключено до GitHub, автодеплой на прод при мержі в `main`. URL: https://pifpaf-cms.vercel.app/ (домен pifpaf.online ще не перенесено)

## Розробка

Проєкт розробляється поетапно (фази 0–6, див. ТЗ, розділ 15). Гілка `main` захищена (обов'язковий CI-чек `build`), зміни йдуть через Pull Request.

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm run build
```
