# LiteEA Tooling & Integration

**Версия:** 1.0.0  
**Дата:** 3 мая 2026  
**Статус:** Активна

---

## Overview

LiteEA методология поддерживается специализированными инструментами для различных аспектов архитектурного моделирования. Этот документ описывает доступные инструменты и их интеграцию.

---

## LiteEA BPMN Authoring Tool (LiteEA BAT)

**Назначение:** Текстовое (YAML) редактирование, визуализация и управление бизнес-процессами в нотации BPMN 2.0 с автоматическим расчётом расположения элементов.

**Внутреннее имя (legacy):** Cervin (до версии 0.3.6)

**Расположение:** `/Users/valerii/Documents/GitHub/LiteEA BAT`

**Версия:** 0.3.7 (по состоянию на 3 мая 2026)

**Лицензия:** MIT

### Основные функции

- **Text-first BPMN:** YAML DSL (`*.bpmn.yaml`) как источник истины, хранится в Git рядом с элементами архитектуры
- **Три канала доставки:**
  - CLI: `cervin compile <src> <dst>` для локальной компиляции
  - Web UI: `cervin serve` — локальный веб-интерфейс с редактором YAML и превью BPMN рядом
  - VS Code Extension: встроенный редактор с живым превью и автосохранением
- **Продвинутый layout алгоритм:** 4-фазовый процесс с ELK (Eclipse Layout Kernel)
  - Глобальная фаза ELK для согласованности колонн (X) через дорожки
  - Параллельные per-lane ELK проходы для Y координат
  - Сборка с дополнительной выравниванием на оси дорожек
  - Геометрическая маршрутизация потоков с правилами приоритета (R1–R6, L1)
- **Экспорт:** BPMN 2.0 XML, SVG (с полной поддержкой диаграмм)
- **Интеграция:** Полная поддержка ссылок на элементы ArchiMate (ROLE-XXX-001, APP-XXX-001, PROC-XXX-001)
- **Валидация:** AJV schema validation, cross-lane routing checks, structural BPMN 2.0 compliance

### Использование с LiteEA

#### Структура файлов

```
organizations/[org]/
├── .templates/
│   └── bpmn/
│       ├── process_template.bpmn.yaml          (базовый процесс)
│       └── advanced-process-with-lanes.bpmn.yaml (сложный процесс)
└── elements/
    └── 02_business/
        └── [PROCESS_NAME]_process.bpmn.yaml    (готовые процессы)
```

#### Рабочий процесс

1. **Создание процесса:**
   ```bash
   cd organizations/[your_org]
   cp .templates/bpmn/advanced-process-with-lanes.bpmn.yaml \
      elements/02_business/ORDER_FULFILLMENT_process.bpmn.yaml
   ```

2. **Редактирование:**
   - Откройте файл в VS Code с установленным расширением LiteEA BAT
   - Используйте графический редактор для моделирования
   - Редактируйте YAML напрямую для свойств элементов

3. **Валидация:**
   ```bash
   python3 .validators/lint.py elements/02_business/ORDER_FULFILLMENT_process.bpmn.yaml
   ```

4. **Визуализация:**
   - Preview в VS Code (встроенный просмотр)
   - Экспорт в SVG через LiteEA BAT
   - Включение в документацию проекта

5. **Коммит в Git:**
   ```bash
   git add elements/02_business/ORDER_FULFILLMENT_process.bpmn.yaml
   git commit -m "Add ORDER_FULFILLMENT process with lanes and stages"
   ```

### Основные свойства BPMN элементов

При редактировании процесса в LiteEA BAT убедитесь, что указаны:

**Для дорожек (Lanes):**
- `id` — уникальный идентификатор (lane_sales, lane_warehouse)
- `name` — описательное имя (Sales Team, Warehouse)
- `actor_role` — ссылка на BusinessRole (ROLE-SALES-001)
- `responsible_system` — ссылка на ApplicationComponent (APP-CRM-001)

**Для задач (Tasks):**
- `id` — уникальный в контексте процесса (S1_receive, S2_pack)
- `type` — тип элемента (task, userTask, serviceTask, exclusiveGateway)
- `label` — описание для пользователя (Receive Order)
- `lane` — на какой дорожке выполняется
- `supporting_system` — система, выполняющая задачу
- `required_data` — входные данные
- `output_data` — выходные данные

**Для узлов решений (Gateways):**
- `decision_logic` — логика принятия решения
- `true_path` / `false_path` — направления маршрутизации
- `checks` — условия проверки

**Для KPI:**
- `name` — название метрики
- `target` — целевое значение
- `calculated_from` — элементы, используемые для расчёта

### Архитектура LiteEA BAT

**Компоненты:**

| Компонент | Описание | Технология |
| --- | --- | --- |
| **Parser** (`src/parser.ts`) | YAML DSL → внутреннее представление (ProcessIr) | AJV schema validation |
| **Layout Engine** (`src/layout.ts`) | 4-фазовый алгоритм: ELK + геометрическая маршрутизация | ELK.js (Eclipse Layout Kernel) |
| **Emitter** (`src/emitter.ts`) | ProcessIr + LayoutIr → BPMN 2.0 XML | xmlbuilder2 |
| **CLI** (`src/cli.ts`) | Компиляция файлов из командной строки | Node.js |
| **Web Server** (`src/serve-ui.ts`) | HTTP API и локальный веб-интерфейс | Express-like Node.js server |
| **VS Code Extension** (`extension/src/`) | Встроенный редактор и превью | VS Code webview API |
| **Web UI** (`ui/src/`) | YAML редактор + BPMN превью | Vite, React/Preact, bpmn-js viewer |

**Источники (GitHub):**
```
LiteEA BAT/
├── src/                # TypeScript исходный код
│   ├── ir.ts          # Type definitions (ProcessIr, LayoutIr)
│   ├── parser.ts      # YAML → ProcessIr
│   ├── layout.ts      # Layout algorithm (4-фазовый ELK)
│   ├── emitter.ts     # ProcessIr → BPMN 2.0 XML
│   ├── cli.ts         # CLI entry point
│   └── serve-ui.ts    # Web server & API
├── extension/         # VS Code расширение
├── ui/               # Web UI (Vite SPA)
├── examples/         # Примеры BPMN процессов
├── tests/            # Vitest suite (38 тестов)
├── CLAUDE.md         # AI agent context & layout algorithm docs
├── diagram-rules.md  # Правила маршрутизации (R1–R6, L1)
├── roadmap.md        # Project status (RD-001 to RD-078+)
└── cervin-project-description-v0.3.md  # Детальное описание

```

### Примеры процессов

**Базовый процесс:** `organizations/acme_corp/.templates/bpmn/process_template.bpmn.yaml`

Использование:
- Одна роль / актор
- Простой линейный поток
- Без сложных ветвлений
- Быстрое прототипирование

**Сложный процесс:** `organizations/acme_corp/.templates/bpmn/advanced-process-with-lanes.bpmn.yaml`

Использование:
- Несколько акторов с дорожками (swimlanes)
- Явные этапы (S1, S2, S3) с фазовой группировкой
- Контрольные точки качества с явными проверками
- Циклы переработки и ветвления (gateways)
- Явный поток данных между шагами
- KPI и метрики производительности

**Готовые примеры:** 
- `organizations/acme_corp/.templates/EXAMPLES.md` — E-commerce Order Fulfillment
- `LiteEA BAT/examples/` — дополнительные примеры BPMN процессов

### Интеграция с архитектурой

Каждый элемент BPMN процесса может ссылаться на архитектурные элементы:

```yaml
- id: "S1_receive"
  type: "task"
  supporting_system: "APP-CRM-001"  # Ссылка на ApplicationComponent
  lane: "lane_sales"                # Ссылка на BusinessRole через дорожку
  
# Валидатор проверит, что:
# ✓ APP-CRM-001 существует в elements/03_application/
# ✓ lane_sales.actor_role соответствует существующему BusinessRole
```

Это обеспечивает полную трассируемость от процесса к приложениям и ролям.

---

## Установка и конфигурация LiteEA BAT

### Требования

- Node.js 14+ (v16+ рекомендуется)
- npm 6+
- VS Code 1.60+ (для расширения)
- Python 3.8+ (для LiteEA валидации процессов)

### Быстрый старт

```bash
cd /Users/valerii/Documents/GitHub/LiteEA\ BAT

# Установка зависимостей
npm install

# Полная сборка (TypeScript → JavaScript)
npm run build

# Запуск локального веб-интерфейса (редактор + превью)
npm run build && npm run ui:build
node dist/cli.js serve
# Или: npx cervin serve (если установлено глобально)
```

Веб-интерфейс откроется на `http://127.0.0.1:3000` (или указанном порту).

### Установка VS Code расширения

```bash
cd /Users/valerii/Documents/GitHub/LiteEA\ BAT

# Подготовка расширения
npm run extension:prep

# Через VS Code: F5 для запуска Extension Development Host
# Или вручную: npm run package-extension для создания VSIX
```

### Валидация процессов

```bash
# Компиляция одного файла
node dist/cli.js compile \
  /path/to/process.bpmn.yaml \
  /tmp/output.bpmn

# С проверкой ошибок
npm test
```

**Примеры для тестирования:**
```bash
# Встроенный пример Order Fulfillment
node dist/cli.js compile \
  examples/order-fulfillment.cervin.yaml \
  /tmp/order-fulfillment.bpmn

# Превью в браузере
npm run serve
```

### Интеграция с LiteEA организациями

1. **Разместите процессы в стандартной локации:**
   ```
   organizations/[org]/elements/02_business/[PROCESS_NAME]_process.bpmn.yaml
   ```

2. **Используйте LiteEA BAT для редактирования:**
   - Откройте папку `organizations/[org]` в VS Code
   - С установленным расширением LiteEA BAT увидите превью при открытии `.bpmn.yaml`
   - Редактируйте YAML прямо в редакторе

3. **Валидируйте после изменений:**
   ```bash
   cd organizations/[org]
   python3 .validators/lint.py
   node /path/to/LiteEA\ BAT/dist/cli.js compile \
     elements/02_business/[PROCESS_NAME]_process.bpmn.yaml \
     /tmp/preview.bpmn
   ```

### Проверка установки и функциональности

```bash
cd /Users/valerii/Documents/GitHub/LiteEA\ BAT

# Полный тест suite (38 тестов)
npm test

# Сборка без ошибок
npm run build

# Проверка типов TypeScript
npm run type-check

# Lint кода
npm run lint
```

**Успешная проверка:** все команды завершаются без ошибок, `npm test` показывает "38 tests passed"

---

## Текущее состояние LiteEA BAT (v0.3.7)

**Завершённые фазы разработки (по roadmap.md):**

✅ **Phase 1–7** — Все критические исправления, оптимизации, качество кода, тесты (38 тестов) и документация  
✅ **Phase 6** — Интеграция с AI Agent Rules (правила проекта, именование, английский язык)  
✅ **Phase 7** — Продвинутый layout алгоритм с правилами маршрутизации (R1–R6, L1)  

**Статус:** Production-ready (готов к использованию в реальных проектах)

**Документация проекта:**
- `CLAUDE.md` — AI agent context и layout algorithm details
- `diagram-rules.md` — Правила маршрутизации и BPMN 2.0 валидация
- `roadmap.md` — 78+ завершённых задач с stable IDs (RD-XXX)

## Расширения и интеграции

### Планируемые инструменты на уровне LiteEA

- **Capability Maturity Visualizer** (RD-201+) — Графическое представление уровней зрелости способностей
- **Architecture Dashboard** (RD-202+) — Интерактивный портал для просмотра всей архитектуры с браузером элементов
- **CI/CD Integration** (RD-103-104) — Автоматическая генерация диаграмм при коммитах в Git
- **API Gateway** (RD-206) — Программный доступ к архитектурным элементам и процессам
- **Collaboration Tools** (RD-209) — Рецензирование архитектуры, комментарии в контексте диаграмм

### Возможные расширения LiteEA BAT

- **BPMN Simulation** — Выполнение процессов с отслеживанием пути выполнения
- **Performance Analysis** — Анализ времени выполнения и узких мест
- **Process Mining** — Интеграция с реальными логами выполнения процессов
- **Multi-pool Support** — Поддержка нескольких пулов в одной диаграмме
- **Export Enhancements** — PNG, PDF, SVG с метаданными для документации

---

## Trouble Shooting

### Компиляция не работает: "Cannot find module"

**Проблема:** 
```
Error: Cannot find module './dist/compiler.js'
```

**Решение:**
1. Убедитесь, что сборка завершена: `npm run build`
2. Проверьте, что `dist/` папка содержит скомпилированные файлы
3. Попробуйте очистку и пересборку:
   ```bash
   rm -rf dist/
   npm run build
   ```

### VS Code расширение не показывает превью

**Проблема:** "Preview not loading" или расширение не активируется

**Решение:**
1. Убедитесь, что `npm run extension:prep` выполнен
2. Перезагрузите VS Code Extension Development Host (F5)
3. Проверьте, что файл имеет расширение `.bpmn.yaml`
4. Посмотрите Output в VS Code → "Cervin" канал для ошибок

### Ошибки валидации при компиляции

**Проблема:** "Schema validation failed" или "Invalid element structure"

**Решение:**
1. Проверьте синтаксис YAML (используйте YAML linter в VS Code)
2. Убедитесь, что структура соответствует шаблону (`process_template.bpmn.yaml`)
3. Проверьте все обязательные поля: `id`, `lanes`, `stages`, `steps`
4. Для ArchiMate ссылок используйте точные ID (ROLE-XXX-001, APP-XXX-001)

### Webservice не запускается: Port already in use

**Проблема:** 
```
Error: listen EADDRINUSE :::3000
```

**Решение:**
```bash
# Используйте другой порт
npm run serve -- --port 3001

# Или найдите и завершите процесс на порту 3000
lsof -i :3000
kill -9 <PID>
```

### Layout выглядит неправильно

**Проблема:** "Elements overlap", "Flows cross incorrectly", "Lane axis not aligned"

**Решение:**
1. Эти проблемы обычно возникают при очень большом диапазоне элементов или специальных конфигурациях
2. Попробуйте отрегулировать параметры layout через `.layout-options`:
   ```yaml
   layoutOptions:
     elkNodeSpacing: 60        # увеличить расстояние между элементами
     laneVerticalGap: 50       # увеличить зазор между дорожками
     elkDiagramPadding: 60     # увеличить отступ
   ```
3. Если проблема сохраняется, проверьте `diagram-rules.md` и файл `CLAUDE.md` для правил маршрутизации

### Экспорт в SVG работает, но диаграмма неполная

**Проблема:** "SVG содержит только часть диаграммы"

**Решение:**
1. Проверьте, что процесс имеет хотя бы один flow (startEvent → step → endEvent)
2. Убедитесь, что все элементы имеют уникальные ID в контексте процесса
3. Попробуйте экспортировать в BPMN XML вместо SVG для отладки:
   ```bash
   npm run cervin compile process.bpmn.yaml output.bpmn
   # Затем откройте в BPMN модели редакторе типа bpmn-js
   ```

---

## Документация и ресурсы

### Основные документы LiteEA BAT

| Файл | Назначение |
| --- | --- |
| `README.md` | Обзор проекта и quick start |
| `CLAUDE.md` | AI agent context, layout algorithm details |
| `diagram-rules.md` | Правила маршрутизации (R1–R6, L1) и BPMN 2.0 валидация |
| `cervin-project-description-v0.3.md` | Детальное описание версии 0.3 |
| `roadmap.md` | Статус проекта (RD-001 до RD-078+) |
| `glossary.md` | Глоссарий терминов (BPMN, DSL, layout и т.д.) |
| `LICENSE` | MIT лицензия |
| `CONTRIBUTING.md` | Гайд для контрибьюторов |

### Основная методология LiteEA

- **Методология:** `/Users/valerii/Documents/GitHub/LiteEA/method/LiteEA Методология управления архитектурой предприятия (Architecture-as-Code).md`
- **Раздел 4:** Слой моделирования бизнес-процессов (описание LiteEA BAT)
- **TOOLING.md:** Этот файл (инструменты и интеграции)

### Примеры использования

- **LiteEA Examples:** `organizations/acme_corp/.templates/EXAMPLES.md`
- **LiteEA BAT Examples:** `/Users/valerii/Documents/GitHub/LiteEA BAT/examples/`
  - `order-fulfillment.cervin.yaml` — полный E-commerce процесс
  - и другие примеры процессов

### Вопросы и проблемы

1. **При использовании LiteEA BAT:** смотрите раздел "Trouble Shooting" выше
2. **По дизайну layout алгоритма:** смотрите `CLAUDE.md` и `diagram-rules.md` в репозитории LiteEA BAT
3. **По интеграции с LiteEA:** смотрите раздел "Использование с LiteEA" выше и методологию раздел 4 и 9

### Лицензия и авторство

**LiteEA BAT:** MIT License  
**LiteEA:** MIT License (заявить при публикации)

Оба проекта могут быть опубликованы в открытом доступе и используются для образовательных и коммерческих целей в соответствии с условиями MIT.

---

**Документ версия:** 1.0.0  
**Обновлено:** 3 мая 2026  
**Следующее обновление:** При добавлении новых инструментов

