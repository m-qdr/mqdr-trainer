# agent.md — гид для агентов в репозитории MQDR Trainer

## Что это

MQDR Trainer — одностраничное PWA-приложение для засечки кругов в FPV-гонках дронов.
Vanilla HTML/CSS/JS, **без сборки, без фреймворков, без внешних зависимостей** — вся логика
живёт в одном `index.html`. UI и комментарии — на русском языке.

## Файлы

| Файл | Назначение |
|------|-----------|
| `index.html` | Всё приложение: стили, разметка, скрипт (~2100 строк, один файл) |
| `manifest.json` | PWA-манифест (реальный файл, НЕ data:/blob: URI — их браузеры не принимают) |
| `sw.js` | Service Worker: офлайн-кэш `mqdr-cache-vN` |
| `icons/` | `icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` |
| `README.md` | Пользовательская документация (обновлять при изменении фич) |

## Структура index.html

- `<head>` — PWA-мета, `<link rel="manifest">`, favicon, apple-touch-icon
- `<style>` — CSS (тёмная тема, фон `#0b0e14`, акцент `#0df3f0`, скруглённый «телефонный» контейнер).
  Адаптив: safe-area (`viewport-fit=cover` + `env(safe-area-inset-*)`), `100dvh`, медиазапросы
  `max-width: 440px`, `max-width: 360px`, компактный режим `max-height: 520px + landscape`; тач-цели ≥40px.
- Разметка — офлайн-бейдж, кнопка установки PWA, основной UI
- `<script>` — IIFE-модули в порядке появления:
  1. `registerSW()` — регистрация `sw.js` (только https/localhost, по событию `load`)
  2. `updateOfflineStatus()` — индикатор онлайн/офлайн
  3. `installButton` — обработка `beforeinstallprompt`
  4. `mainApp` — вся логика: настройки, голос (Web Speech), звук (Web Audio), таймер,
     режимы старта `first lap` / `hole shot` (`raceMode` + `waitingFirstCrossing`,
     запуск таймера по первому пересечению — `startTiming()`),
     геймпад (Gamepad API, опрос в `pollGamepad`), клавиатура (Space/Enter — круг/старт, S — стоп, R — сброс, Z — отмена действия с кругами, P — следующий пилот),
     история кругов `lapHistory` + `undoLastLap()` (отмена добавления/удаления),
     командные гонки (`teamCount` 1–8, `currentPilot`, `lapPilots[]` параллелен `laps`,
     панель чипов `renderTeamPanel()`, смена `switchPilot()/nextPilot()`)
- В конце `mainApp` экспортирует отладочный хук `window.__laps` (доступ к состоянию и функциям из консоли)

## Ключевые правила

1. **Никаких внешних сетевых ресурсов** (CDN, шрифты, картинки) — сломает офлайн-режим.
2. **Изменил `index.html`, `manifest.json` или иконки → подними `CACHE_NAME` в `sw.js`**
   (`mqdr-cache-v6` → `v7`), иначе установленные клиенты останутся на старой версии.
3. Манифест и SW — только реальные файлы того же origin. Не возвращаться к data:/blob: URI.
4. Минимальное время круга 1 с — защита от ложных срабатываний, не убирать.
5. Ключи настроек в `localStorage` с префиксом `mqdr_` (`mqdr_voice_enabled`, `mqdr_volume`,
   `mqdr_display_format`, `mqdr_best_laps_count`, `mqdr_race_mode`, `mqdr_time_mode`,
   `mqdr_timer_seconds`, `mqdr_team_count`); ключ `laps_trainer_radiomaster` — легаси,
   сохранять совместимость при чтении/записи.
6. Аудио- и речевые API требуют пользовательского жеста — не вызывать до первого взаимодействия.
7. Вьюпорт зафиксирован (`user-scalable=no`, запрет double-tap zoom) — часть UX, не менять без причины.

## Как проверять

```bash
# из корня репозитория — любой статический сервер:
python -m http.server 8080     # или: npx serve .
# открыть http://localhost:8080
```

- SW регистрируется только по `http://localhost` / `https:`; при `file://` — офлайн и установка недоступны (это норма, не баг).
- Синтаксис извлечённого инлайн-скрипта и `sw.js` — через `node --check`.
- `manifest.json` — валидность через `ConvertFrom-Json` / `JSON.parse`.
- PNG-иконки — сигнатура и размеры читаются из заголовка файла; перегенерация возможна
  через .NET GDI+ (`System.Drawing`), дизайн должен совпадать с `icons/icon.svg`.
- Логика таймера тестируется из консоли через `window.__laps`
  (`startCountdown`, `recordLap`, `stopTimer`, `resetAll`, `setVolume` и др.).
