# LiteEA Project Glossary

**Location:** Project root  
**Purpose:** Single source of truth for all project terms and abbreviations  
**Format:** English term (Russian translation)  
**Last Updated:** May 3, 2026

---

## Architecture & Methodology

| Term | Definition |
|------|-----------|
| **Lite Enterprise Architecture (LiteEA)** | Облегченная методология управления корпоративной архитектурой |
| **Architecture-as-Code (AaC)** | Подход к определению и управлению архитектурой через текстовые файлы, хранящиеся в Git системе контроля версий |
| **ArchiMate** | Открытый стандарт моделирования корпоративной архитектуры (текущая версия: 3.2) |
| **Element** | Архитектурный примитив - единица моделирования (компонент, роль, цель, узел) |
| **Relation** (или Relationship) | Связь между двумя архитектурными элементами |
| **Atomicity** (Атомарное разделение) | Принцип, при котором описание элемента и его связи хранятся в разных файлах |

## Layers (Слои)

| Term | Definition |
|------|-----------|
| **Motivation Layer** | Мотивационный слой - стратегические цели, принципы, ограничения |
| **Business Layer** | Бизнес-слой - роли, процессы, функции, акторы |
| **Application Layer** | Слой приложений - компоненты, сервисы, интерфейсы, объекты данных |
| **Technology Layer** | Технологический слой - инфраструктура, узлы, системное ПО, артефакты |

## Element Types (Типы элементов)

### Motivation Layer Elements
| Type | Russian | Example ID |
|------|---------|-----------|
| **Goal** | Цель | GOAL-REV-001 |
| **Principle** | Принцип | PRIN-SCALE-001 |
| **Constraint** | Ограничение | CONS-COMPLIANCE-001 |
| **Driver** | Драйвер/Побудитель | DRIV-MARKET-001 |
| **Outcome** | Результат | OUTC-SAVINGS-001 |
| **Value** | Ценность | VALUE-INNOVATION-001 |

### Business Layer Elements
| Type | Russian | Example ID |
|------|---------|-----------|
| **BusinessRole** | Бизнес-роль | ROLE-SALES-001 |
| **BusinessActor** | Бизнес-актор | ACTR-CUSTOMER-001 |
| **BusinessProcess** | Бизнес-процесс | PROC-ORD-FULFILL |
| **BusinessFunction** | Бизнес-функция | FUNC-PAYMENT-001 |
| **Service** | Сервис | SRVC-CUSTOMER-MGT |

### Application Layer Elements
| Type | Russian | Example ID |
|------|---------|-----------|
| **ApplicationComponent** | Компонент приложения | APP-ORD-API-001 |
| **ApplicationService** | Сервис приложения | SRVC-AUTH-001 |
| **DataObject** | Объект данных | DATA-ORDER-001 |
| **ApplicationInterface** | Интерфейс приложения | INTF-REST-API-001 |

### Technology Layer Elements
| Type | Russian | Example ID |
|------|---------|-----------|
| **Node** | Узел | NODE-DB-001 |
| **SystemSoftware** | Системное ПО | SYS-LINUX-001 |
| **Artifact** | Артефакт | ARTF-DOCKER-IMG-001 |
| **Device** | Устройство | DEV-ROUTER-001 |
| **CommunicationPath** | Канал коммуникации | NET-FIBER-001 |

## Relation Types (ArchiMate 3.2)

| Type | Russian | Use Case |
|------|---------|----------|
| **Serving** | Обслуживание | A служит/поддерживает B |
| **Assignment** | Назначение | Роль выполняет активность |
| **Realization** | Реализация | Компонент реализует сервис |
| **Access** | Доступ | Компонент читает/записывает данные |
| **Composition** | Композиция | Элемент состоит из других элементов |
| **Aggregation** | Агрегация | Слабая связь между элементами |
| **Triggering** | Срабатывание | Активность инициирует другую активность |
| **Flow** | Поток | Передача данных/ресурсов/управления |
| **Specialization** | Специализация | A является подтипом B |
| **Association** | Связь | Связь между элементами |
| **Influence** | Влияние | A влияет на B |

## Project Structure

| Term | Russian | Definition |
|------|---------|-----------|
| **Organization** | Организация | Папка в `organizations/`, содержащая полную архитектуру компании |
| **Multi-tenant** | Мультитенантность | Поддержка множественных независимых организаций в одном проекте |
| **Template** | Шаблон | Готовый YAML-файл для создания нового элемента |
| **Validator** (Linter) | Валидатор | Python скрипт для проверки целостности архитектуры |
| **View** | Представление | Конфигурация для генерации диаграмм |
| **Archive** | Архив | Папка `0.archive` для устаревших элементов (вместо удаления) |

## File Types

| Extension | Russian | Purpose |
|-----------|---------|---------|
| **.yaml** | YAML файл | Элементы и связи архитектуры |
| **.bpmn.yaml** | BPMN процесс | Описание бизнес-процесса в текстовом формате |
| **.md** | Markdown документ | Документация проекта |
| **.py** | Python скрипт | Инструменты (валидатор, генератор и т.д.) |
| **.puml** | PlantUML диаграмма | Визуализация архитектуры (предпочтительный формат) |
| **.mmd** | Mermaid диаграмма | Альтернативный формат для диаграмм |

## Metadata Fields

| Field | Russian | Type | Example |
|-------|---------|------|---------|
| **id** | Идентификатор | String | APP-ORD-001 |
| **name** | Название | String | Order API Service |
| **type** | Тип | String | ApplicationComponent |
| **layer** | Слой | String | Application |
| **status** | Статус | Draft/Active/Deprecated/Archived | Active |
| **owner** | Владелец | Email/Handle | firstname.lastname |
| **created_at** | Дата создания | YYYY-MM-DD | 2026-05-03 |
| **updated_at** | Дата обновления | YYYY-MM-DD | 2026-05-03 |
| **tags** | Теги | Array | [microservice, critical] |
| **description** | Описание | Text | Clear explanation of purpose |
| **criticality** | Критичность | Critical/High/Medium/Low | High |

## Abbreviations

| Abbreviation | English | Russian |
|--------------|---------|---------|
| **AaC** | Architecture-as-Code | Архитектура-как-Код |
| **BPMN** | Business Process Model and Notation | Модель и обозначение бизнес-процессов |
| **API** | Application Programming Interface | Интерфейс программирования приложений |
| **DB** | Database | База данных |
| **REST** | Representational State Transfer | Передача состояния представления |
| **YAML** | YAML Ain't Markup Language | YAML это не язык разметки |
| **Git** | Version Control System | Система управления версиями |
| **CI/CD** | Continuous Integration/Continuous Delivery | Непрерывная интеграция/Непрерывная доставка |
| **SLA** | Service Level Agreement | Соглашение об уровне обслуживания |
| **RTO** | Recovery Time Objective | Объектив времени восстановления |
| **RPO** | Recovery Point Objective | Объектив точки восстановления |

## Status Values

| Value | Russian | Meaning |
|-------|---------|---------|
| **Draft** | Черновик | Under development, not validated |
| **Active** | Активный | In use, validated and approved |
| **Deprecated** | Устаревший | Planned for retirement |
| **Archived** | Архивированный | No longer in use, kept for history |

## Criticality Levels

| Level | Russian | Definition |
|-------|---------|-----------|
| **Critical** | Критический | System failure causes major business impact |
| **High** | Высокий | System failure causes significant business impact |
| **Medium** | Средний | System failure causes moderate business impact |
| **Low** | Низкий | System failure has minimal business impact |

## Domain Code Examples

| Code | Domain | Example |
|------|--------|---------|
| **ORD** | Orders | GOAL-ORD-001, APP-ORD-API-001 |
| **PAY** | Payments | APP-PAY-SERVICE-001 |
| **USR** | User Management | ROLE-USR-ADMIN-001 |
| **PRD** | Products | PROC-PRD-CATALOG-001 |
| **INV** | Inventory | NODE-INV-DB-001 |
| **SHP** | Shipping | FUNC-SHP-LOGISTICS-001 |
| **NTF** | Notifications | APP-NTF-EMAIL-001 |
| **RPT** | Reporting | SRVC-RPT-ANALYTICS-001 |
| **AUT** | Authentication | APP-AUT-OAUTH-001 |
| **BIL** | Billing | PROC-BIL-INVOICE-001 |

## Documentation Terms

| Term | Russian | Context |
|------|---------|---------|
| **README** | Описание проекта | Overview document |
| **GETTING_STARTED** | Быстрый старт | Tutorial for new users |
| **CONVENTIONS** | Соглашения | Naming standards and best practices |
| **EXAMPLES** | Примеры | Real-world usage examples |
| **GLOSSARY** | Словарь терминов | This document |
| **ROADMAP** | Дорожная карта | Project phases and tasks |

---

## Notes

- **Consistency:** Use terms from this glossary consistently across all project documents
- **Updates:** Add new terms as project evolves
- **Language:** English is primary; Russian translations provided for all terms
- **References:** When using term first time, reference with: Term (Translation)
- **Abbreviations:** First use as "ABBR (Expanded form)", then just "ABBR"

---

**Version:** 1.0.0  
**Status:** Active ✓  
**Last Updated:** May 3, 2026
