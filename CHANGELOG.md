# Changelog

Формат — [Keep a Changelog](https://keepachangelog.com/uk/1.1.0/).

## [Unreleased]

### Added
- Фаза 1: автентифікація адміністратора (email+пароль, cookie-based сесії через `@supabase/ssr`), захищений маршрут `/admin/*`
- Дерево сторінок/меню (`/admin/pages`): категорія/сторінка/посилання/роздільник, CRUD, drag-реордер, editable slug (крім головної), "зробити головною"
- Медіатека (`/admin/media`): завантаження одиночне й масове напряму в Supabase Storage, реальне визначення пропорцій фото/відео, пошук і фільтр за типом
- Storage bucket `media` з політиками (публічне читання файлів, запис лише для автентифікованих)
- Фаза 0: каркас Next.js (App Router, TypeScript) + Supabase-клієнти з типами
- Початкова схема БД: `pages`, `blocks`, `media`, `forms`, `form_submissions`, `settings` — з увімкненим RLS
- CI (GitHub Actions): лінт, перевірка типів, збірка на кожен PR
- Дизайн-токени (`styles/tokens.css`), синхронізовані з прототипом адмінки
- ТЗ і клікабельний прототип адмін-панелі (`docs/`, `prototypes/`)
