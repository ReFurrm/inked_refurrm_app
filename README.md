# React + Vite

This # Co-Author AI Notebook

Single-page Tailwind UI for drafting long-form work with an AI “co-author”:

- Style anchor to lock in the author’s voice  
- Plot / scene prompt for next-scene generation  
- Clarity / research helper for questions and reality checks  
- Autosnapshots per project/chapter  
- Mock “linked file” sync bar for future Word/Docs/Drive integration  

> Current version ships with **stub AI functions only** (no API key required).  
> You can wire it to your own backend or provider when you’re ready.

---

## Features

### Style Anchor

Paste one or two paragraphs that sound the most like the author.  
Every AI call is designed to use this as the **voice contract**, so the output stays consistent to their tone.

### Next Plot Point / Scene

Describe the next scene, beat, or section.

The app:

1. Takes the tail of the current manuscript
2. Sends it (with the style anchor) to `callManuscriptAPI(...)`
3. Appends a new passage (~200–300 words) to the chapter

`callManuscriptAPI` is a **stub** in this repo. Replace it with your own backend or model call.

### Clarity / Research Helper

A separate text area for:

- Timeline sanity checks
- “Would this be realistic if…?”
- Character motivation and structure questions

Uses `callClarityAPI(...)` (stub) and shows the response plus optional sources.

### Manuscript Editor

- Uses a `contenteditable` div for the chapter draft  
- AI output is appended as `<p>` blocks rather than replacing existing text  
- Em dashes are stripped and replaced with simple hyphens at the UI layer

### Autosnapshots

- Snapshots are stored in `localStorage` per `projectId` + `chapterId`
- Idle timer (2 minutes without edits) creates an **Idle autosave** snapshot
- Latest snapshot info is displayed in the “Chapter Draft” info bar

### Linked File (Mock)

- “Link File” prompts for a filename and stores it in state
- “Update Linked File” simulates a sync with a fake delay
- Status badge flips between **linked**, **unsynced**, and **synced**

You can replace `linkFileMock` and `updateLinkedFile` with a real bridge to:

- Google Drive
- OneDrive / SharePoint
- Dropbox
- Your own file API

### Design Notes

- Tailwind via CDN (no build step required)
- Neutral teal / sky / slate palette (no purple)
- Single responsive page; works well on laptop and tablet

---

## Running Locally

1. Save the file as `index.html`.
2. Open it directly in any modern browser (Chrome, Edge, Firefox, Safari).

Optionally, serve it via a simple static server:

```bash
# Python 3
python -m http.server 8000

# Open:
# http://localhost:8000/index.html


Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
