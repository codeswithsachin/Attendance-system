# Attendly v2.0

> Smart attendance management system for modern classrooms.

**Built by [Sachin](https://instagram.com/nyxsachin) — [@nyxsachin](https://instagram.com/nyxsachin)**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://attendance-system-codeswithsachin.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-codeswithsachin-181717?style=for-the-badge&logo=github)](https://github.com/codeswithsachin/Attendance-system)

---

## What is Attendly?

Attendly is a fully client-side attendance management system built with vanilla HTML, CSS and JavaScript. No backend, no database, no dependencies. All data lives in the browser's localStorage.

It has two portals — a **Teacher portal** for managing classes, students and registers, and a **Student portal** for viewing personal attendance history.

---

## Features

### Teacher portal
- **Daily attendance register** — mark Present, Absent, Late or Leave per student
- **Live stats** — today's rate, present count, absent count, total students, day streak
- **Trend badge** — shows +/- change vs previous register
- **Analytics** — SVG smooth line chart, stacked bar chart, donut chart, 70-day heatmap, ranked performance list
- **Class health** — on track / needs watch / at-risk / no records breakdown
- **At-risk alerts** — notification panel flags students below your set threshold
- **Streak tracker** — counts consecutive days with a register
- **Edit students and classes** — full CRUD via modal
- **CSV exports** — full report, monthly summary, at-risk list
- **JSON backup** — download and restore all data
- **Print register** — formatted printable page
- **Dark mode** — persisted, togglable from sidebar or topbar
- **Demo data** — 15 students, 3 classes, 21 days of realistic attendance in one click

### Student portal
- Personal attendance overview with animated score ring
- Confetti on 80%+ attendance
- Full attendance history with search/filter
- Enrolled classes view

### UI/UX
- Glassmorphism login card with animated glow orbs
- Particle canvas background
- Spring-animated stat cards
- Gradient text headline
- Hero banner with rotating ring decoration
- Per-student avatar colors
- Fully responsive — works on desktop, tablet and mobile
- Accessible — keyboard nav, ARIA labels, focus rings

---

## Demo credentials

| Role    | Email                      | Password    |
|---------|----------------------------|-------------|
| Teacher | teacher@attendly.com       | teacher123  |
| Student | (name)@student.com         | student123  |

After logging in as teacher, go to **Settings > Load Demo** to populate with sample data.

---

## Tech stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Markup     | HTML5 (semantic)                  |
| Styling    | CSS3 (custom properties, grid, flexbox, animations) |
| Logic      | Vanilla JavaScript (ES2022)       |
| Charts     | Canvas API + inline SVG           |
| Storage    | localStorage                      |
| Fonts      | Inter + Plus Jakarta Sans (Google Fonts) |
| Deployment | Vercel (static)                   |

Zero dependencies. Zero frameworks. Zero build step.

---

## Project structure

```
Attendance-system/
  index.html    - app shell, all pages and modals
  style.css     - full design system (tokens, components, dark mode, responsive)
  script.js     - all app logic, charts, exports, demo data
  vercel.json   - deployment and security headers config
  README.md     - this file
```

---

## Run locally

Just open `index.html` in any modern browser. No server needed.

Or use VS Code Live Server:
1. Install the **Live Server** extension
2. Right-click `index.html` > **Open with Live Server**

---

## Deploy to Vercel

1. Fork or clone this repo
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Vercel auto-detects it as a static site
4. Deploy — done

The `vercel.json` handles routing and security headers automatically.

---

## Screenshots

| Login | Dashboard | Analytics |
|-------|-----------|-----------|
| Glassmorphism card with animated glow | Hero banner, stat cards, charts | SVG line chart, donut, heatmap |

---

## License

MIT — free to use, modify and share.

---

Built with care by **[Sachin](https://instagram.com/nyxsachin)** — follow on Instagram [@nyxsachin](https://instagram.com/nyxsachin)
