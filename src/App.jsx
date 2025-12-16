import React from 'react';
import { Heart, PenTool, Sparkles, Wand2, BookOpen, Send, Flame } from 'lucide-react';

const features = [
  {
    icon: <Heart />,
    title: 'Ink with a pulse',
    text: 'Human-first voice. No robotic sludge. Every line feels lived-in.',
  },
  {
    icon: <PenTool />,
    title: 'Ghostwriter instincts',
    text: 'I hold the shape of your story, sharpen the edges, and keep it breathing.',
  },
  {
    icon: <Sparkles />,
    title: 'Clean revisions',
    text: 'Fast iterations with zero fluff—just the words that belong.',
  },
  {
    icon: <Wand2 />,
    title: 'Scene doctor',
    text: 'Drop in a messy paragraph; it comes back cinematic.',
  },
];

const steps = [
  { label: '01', title: 'Drop your pages', text: 'Paste the rough draft, the ramble, or the voice memo transcription.' },
  { label: '02', title: 'Lock the tone', text: 'Pick the vibe—tender, sharp, or “hauntingly human.” I hold that line.' },
  { label: '03', title: 'Get the polished draft', text: 'A finished page with heartbeat, ready to ship or keep iterating.' },
];

const samples = [
  {
    title: 'Pulse scene',
    text: `The air in the room shifted before the truth arrived—heavier at the edges, lighter in the center, as if it needed a place to land. I didn’t move. I let the dust keep falling through that slice of light and thought: fine, let every fact line up in daylight and take a number.`,
  },
  {
    title: 'Boundary letter',
    text: `I’m grateful for the history we have, and I’m choosing to keep my peace intact. I won’t be available for late-night rescues anymore. If you need support, please reach out during the day so we can plan something that works for both of us.`,
  },
  {
    title: 'Brand voice spark',
    text: `You don’t need louder copy. You need a pulse on the page—words that hum like neon and close like a hug. That’s what we do here.`,
  },
];

const packages = [
  { name: 'Spark', detail: '1,000 words polished', fit: 'Quick punch-up for scenes, emails, or bios.' },
  { name: 'Pulse', detail: '5,000 words rewritten', fit: 'Chapter rescue, pitch decks, origin stories.' },
  { name: 'Ghost', detail: 'Ongoing partnership', fit: 'Serial edits, launches, and live collabs.' },
];

const Tag = ({ children }) => <span className="tag">{children}</span>;

export default function App() {
  return (
    <div className="page">
      <header className="hero card">
        <div>
          <div className="eyebrow">Ghostwriter / Human-first</div>
          <h1>
            Ink with a pulse. <br />
            Ghostwriter energy, zero sludge.
          </h1>
          <p className="lead">
            I turn messy drafts into work with a heartbeat—letters that land, scenes that breathe, and copy that
            doesn’t smell like AI.
          </p>
          <div className="hero-actions">
            <button className="button primary">
              <Send size={18} />
              Book a session
            </button>
            <button className="button ghost">
              <BookOpen size={18} />
              See sample pages
            </button>
          </div>
          <div className="tags">
            <Tag>Memoirs & letters</Tag>
            <Tag>Brand voice</Tag>
            <Tag>Scene surgery</Tag>
          </div>
        </div>
        <div className="hero-pane">
          <div className="pane-header">
            <span className="dot red" />
            <span className="dot amber" />
            <span className="dot green" />
            <span className="pane-title">Live draft • Human in loop</span>
          </div>
          <div className="pane-body">
            “The ink kept time with my pulse until the page exhaled. That’s the difference: your story stays alive
            while it’s being written.”
          </div>
        </div>
      </header>

      <section className="grid">
        {features.map((item) => (
          <article key={item.title} className="card feature">
            <div className="icon">{item.icon}</div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="card section">
        <div className="section-header">
          <div className="eyebrow">How it flows</div>
          <h2>Low-friction collaboration</h2>
          <p className="muted">No portals. No dashboards. Just you, me, and fast turnarounds.</p>
        </div>
        <div className="steps">
          {steps.map((step) => (
            <div key={step.label} className="step">
              <span className="step-label">{step.label}</span>
              <div>
                <h4>{step.title}</h4>
                <p>{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card section">
        <div className="section-header">
          <div className="eyebrow">Samples</div>
          <h2>Ink with a heartbeat</h2>
          <p className="muted">Snippets from recent passes—memoir, boundary-setting, and brand voice.</p>
        </div>
        <div className="samples">
          {samples.map((sample) => (
            <article key={sample.title} className="sample">
              <div className="sample-top">
                <Flame size={18} />
                <span>{sample.title}</span>
              </div>
              <p>{sample.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card section">
        <div className="section-header">
          <div className="eyebrow">Ways to work</div>
          <h2>Pick the pace</h2>
          <p className="muted">From quick rescues to steady ghostwriting.</p>
        </div>
        <div className="packages">
          {packages.map((pack) => (
            <article key={pack.name} className="package">
              <div className="package-name">
                <Sparkles size={16} />
                <span>{pack.name}</span>
              </div>
              <p className="package-detail">{pack.detail}</p>
              <p className="muted">{pack.fit}</p>
              <button className="button subtle">Start {pack.name.toLowerCase()}</button>
            </article>
          ))}
        </div>
      </section>

      <section className="card cta">
        <div>
          <div className="eyebrow">Ready when you are</div>
          <h2>Let’s put ink to the page</h2>
          <p className="muted">
            Send the messy doc. I’ll return a draft with pulse, pressure, and clarity.
          </p>
        </div>
        <button className="button primary">
          <Send size={18} />
          Start a project
        </button>
      </section>

      <footer className="footer">
        <span className="logo-mark">PulseInk</span>
        <div className="muted">Ghostwriter energy. Human heartbeat.</div>
      </footer>
    </div>
  );
}
