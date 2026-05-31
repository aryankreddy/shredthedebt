import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  Check,
  Clipboard,
  ExternalLink,
  HandHeart,
  Mail,
  Target,
  Trash2,
} from "lucide-react";
import "./styles.css";
import shredLogo from "./assets/shred-the-debt-logo.webp";

const DONATE_URL =
  "https://unduemedicaldebt.org/campaign/globalshapersaustin-69821/";
const STORAGE_KEY = "shred-the-debt-austin-hub-v1";

const defaultCorporate = `[ Your corporate sponsorship guide lives here - editable, saves automatically. ]

Suggested structure:
- Target companies (Austin HQ / strong CSR): ...
- Sponsorship tiers ($ -> what they get): ...
- The ask + matching-gift angle: ...
- Point of contact + follow-up cadence: ...`;

const teamNames = ["Aryan", "Ben", "Atiya", "Melanie", "Ryan", "Arvin", "Arjun", "Aaliyah"];
const initiativeOptions = [
  "Outreach",
  "Restaurants & Food Partnerships",
  "Small Business Partnerships",
  "Events",
  "Community Involvement",
  "Corporate/Institutional",
  "School + Professional Network",
  "Media & Advertising",
];

const makeTeam = () =>
  [
    {
      id: "team",
      name: "Team",
      actionItems: ["", "", "", "", "", ""],
      wide: true,
    },
    ...teamNames.map((name) => ({
      id: name.toLowerCase(),
      name,
      actionItems: ["", "", "", "", "", ""],
    })),
  ];

const makeOutreachTracker = () =>
  Array.from({ length: 50 }, (_, index) => ({
    id: `contact-${index}`,
    contact: "",
    initiative: "",
    name: "",
    notes: "",
    person: "",
  }));

const defaultState = {
  goal: 15000,
  raised: 0,
  team: makeTeam(),
  outreachTracker: makeOutreachTracker(),
  customCards: [],
  templateOverrides: {},
  corporate: defaultCorporate,
  statuses: {},
};

const cardTypeLabels = {
  messaging: "Messaging Template",
  note: "Notecard",
  artifact: "Artifact",
};

const outreachTemplates = [
  {
    tag: "Template 1",
    icon: HandHeart,
    body: `Hey! I'm part of Global Shapers Austin and we're running a campaign to erase medical debt for families in need. Every $1 you donate wipes out $100 of debt - no kidding. Would mean a lot if you could contribute, even a little:
${DONATE_URL}`,
  },
  {
    tag: "Template 2",
    icon: Target,
    body: `Hey! 1 in 3 Americans struggles with medical debt. Our Global Shapers Austin chapter is working to change that - $1 donated erases up to $100 in debt for families below the poverty line. Can you help?
${DONATE_URL}`,
  },
  {
    tag: "Template 3",
    icon: HandHeart,
    body: `Hi! Quick ask - Global Shapers Austin is raising money to erase medical debt. $10 = $1,000 of debt gone for a real family. Link here if you want in:
${DONATE_URL}`,
  },
];

const linkedInTemplates = [
  {
    tag: "Template 1",
    icon: Target,
    body: "",
  },
];

const businessTemplates = [
  {
    tag: "Template 1",
    body: "",
  },
  {
    tag: "Template 2",
    body: "",
  },
];

const restaurantTemplates = [
  {
    tag: "Profit Share",
    body: "",
  },
  {
    tag: "Partnership Inquiry",
    body: "",
  },
];

const resources = [
  {
    title: "Undue Medical Debt",
    url: "https://unduemedicaldebt.org/",
  },
  {
    title: "Shred The Debt Toolkit",
    url: "https://drive.google.com/drive/folders/1AROG1L-IWTU2bWlH1hwojm2f4CJMnZ3v?usp=drive_link",
  },
  {
    title: "Social Media Guide",
    url: "https://drive.google.com/file/d/1CBDM6TlfQAs0d8Xke4wR05vx4rInalkX/view?usp=sharing",
  },
  {
    title: "Fundraising Email Example Templates",
    url: "https://drive.google.com/drive/folders/1ks1uNItEwmQfxP5RJ8X2jFpy0g-b2kP5",
  },
  {
    title: "Misc. Kickoff Decks",
    url: "https://drive.google.com/drive/folders/1lqQkCEafVXE3QU_nwHf_mk0I2BiHt8Ra",
  },
];

const schoolNetworkTemplates = [
  {
    tag: "Template 1",
    body: "",
  },
  {
    tag: "Template 2",
    body: "",
  },
  {
    tag: "Template 3",
    body: "",
  },
];

function normalizeState(parsed = {}) {
  return {
    ...defaultState,
    ...parsed,
    team: makeTeam().map((member, index) => {
      const saved = Array.isArray(parsed.team) ? parsed.team[index] : null;
      return {
        ...member,
        actionItems: [
          ...(saved?.actionItems || saved?.goals || []),
          ...(saved?.progress || []),
          ...member.actionItems,
        ].slice(0, 6),
      };
    }),
    outreachTracker:
      Array.isArray(parsed.outreachTracker) && parsed.outreachTracker.length
        ? makeOutreachTracker().map((row, index) => {
            const saved = parsed.outreachTracker[index];
            if (!saved) return row;
            return {
              ...row,
              contact: saved.contact || "",
              initiative: saved.initiative || "",
              name: saved.name || saved.place || "",
              notes: saved.notes || "",
              person: saved.person || "",
            };
          })
        : defaultState.outreachTracker,
    customCards: Array.isArray(parsed.customCards) ? parsed.customCards : [],
    templateOverrides: parsed.templateOverrides || {},
    statuses: parsed.statuses || {},
  };
}

function readLocalState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : defaultState;
  } catch {
    return defaultState;
  }
}

function money(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function App() {
  const [state, setState] = useState(readLocalState);
  const [campaign, setCampaign] = useState({
    raised: state.raised,
    goal: state.goal,
    loading: true,
  });
  const [savedPulse, setSavedPulse] = useState(false);
  const [copied, setCopied] = useState("");
  const [editingTemplates, setEditingTemplates] = useState({});
  const [templateDrafts, setTemplateDrafts] = useState({});
  const [storageMode, setStorageMode] = useState("loading");

  const progress = useMemo(() => {
    if (!campaign.goal) return 0;
    return Math.min(100, Math.round((campaign.raised / campaign.goal) * 100));
  }, [campaign.goal, campaign.raised]);

  useEffect(() => {
    async function loadCampaign() {
      try {
        const response = await fetch("/api/campaign");
        if (!response.ok) throw new Error("Campaign response failed");
        const data = await response.json();
        setCampaign({
          raised: Number(data.raised) || 0,
          goal: Number(data.goal) || defaultState.goal,
          loading: false,
        });
      } catch {
        setCampaign((current) => ({ ...current, loading: false }));
      }
    }

    loadCampaign();
  }, []);

  useEffect(() => {
    async function loadSharedState() {
      try {
        const response = await fetch("/api/state");
        if (!response.ok) throw new Error("Shared state unavailable");
        const data = await response.json();
        if (data.state) {
          setState(normalizeState(data.state));
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(data.state)));
        }
        setStorageMode("shared");
      } catch {
        setStorageMode("local");
      }
    }

    loadSharedState();
  }, []);

  useEffect(() => {
    if (storageMode === "loading") return undefined;

    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setSavedPulse(true);
        window.setTimeout(() => setSavedPulse(false), 900);
      } catch {
        setSavedPulse(false);
      }

      if (storageMode === "shared") {
        fetch("/api/state", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ state }),
        }).catch(() => setStorageMode("local"));
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [state, storageMode]);

  const updateTeam = (memberIndex, field, value, itemIndex) => {
    setState((current) => ({
      ...current,
      team: current.team.map((member, index) => {
        if (index !== memberIndex) return member;
        return {
          ...member,
          [field]: member[field].map((item, nestedIndex) =>
            nestedIndex === itemIndex ? value : item,
          ),
        };
      }),
    }));
  };

  const copyText = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(""), 1500);
    } catch {
      setCopied("");
    }
  };

  const updateOutreachTracker = (rowIndex, field, value) => {
    setState((current) => ({
      ...current,
      outreachTracker: current.outreachTracker.map((row, index) =>
        index === rowIndex ? { ...row, [field]: value } : row,
      ),
    }));
  };

  const addCustomCard = (initiative, type) => {
    const id = `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setState((current) => ({
      ...current,
      customCards: [
        ...current.customCards,
        {
          id,
          initiative,
          type,
          title: cardTypeLabels[type],
          body: "",
          fileData: "",
          fileName: "",
          fileType: "",
        },
      ],
    }));
  };

  const updateCustomCard = (id, patch) => {
    setState((current) => ({
      ...current,
      customCards: current.customCards.map((card) =>
        card.id === id ? { ...card, ...patch } : card,
      ),
    }));
  };

  const deleteCustomCard = (id) => {
    setState((current) => ({
      ...current,
      customCards: current.customCards.filter((card) => card.id !== id),
    }));
  };

  const renderCustomCards = (initiative) => {
    const cards = state.customCards.filter((card) => card.initiative === initiative);
    if (!cards.length) return null;

    return (
      <div className="custom-card-grid">
        {cards.map((card) => (
          <CustomInitiativeCard
            card={card}
            copied={copied === card.id}
            key={card.id}
            onCopy={() => copyText(card.id, card.body || "")}
            onDelete={() => deleteCustomCard(card.id)}
            onUpdate={(patch) => updateCustomCard(card.id, patch)}
          />
        ))}
      </div>
    );
  };

  const getTemplateOverride = (id) => {
    const override = state.templateOverrides[id];
    if (!override) return {};
    if (typeof override === "string") return { body: override };
    return override;
  };

  const getTemplateBody = (id, fallback) => getTemplateOverride(id).body || fallback;
  const getTemplateTitle = (id, fallback) => getTemplateOverride(id).title || fallback;

  const startTemplateEdit = (id, title, body) => {
    setTemplateDrafts((current) => ({ ...current, [id]: { title, body } }));
    setEditingTemplates((current) => ({ ...current, [id]: true }));
  };

  const cancelTemplateEdit = (id) => {
    setEditingTemplates((current) => ({ ...current, [id]: false }));
  };

  const saveTemplateEdit = (id) => {
    const draft = templateDrafts[id] || {};
    setState((current) => ({
      ...current,
      templateOverrides: {
        ...current.templateOverrides,
        [id]: {
          title: draft.title || "",
          body: draft.body || "",
        },
      },
    }));
    setEditingTemplates((current) => ({ ...current, [id]: false }));
  };

  const renderTemplateCard = (prefix, template, options = {}) => {
    const id = `${prefix}-${template.tag}`;
    const body = getTemplateBody(id, template.body);
    const title = getTemplateTitle(id, template.tag);
    const draft = templateDrafts[id] || { title, body };

    return (
      <EditableTemplateCard
        key={id}
        id={id}
        title={title}
        Icon={template.icon}
        body={body}
        copied={copied === id}
        draft={draft}
        isEditing={Boolean(editingTemplates[id])}
        onCancel={() => cancelTemplateEdit(id)}
        onCopy={() => copyText(id, body)}
        onDraftChange={(field, value) =>
          setTemplateDrafts((current) => ({
            ...current,
            [id]: {
              ...draft,
              [field]: value,
            },
          }))
        }
        onEdit={() => startTemplateEdit(id, title, body)}
        onSave={() => saveTemplateEdit(id)}
        variant={options.variant}
      />
    );
  };

  return (
    <>
      <nav className="topbar">
        <a className="brand" href="#top" aria-label="Shred the Debt home">
          <img className="nav-logo" src={shredLogo} alt="Shred The Debt" />
          <span className={`save-dot ${savedPulse ? "is-saved" : ""}`} title="Saved" />
        </a>
        <div className="nav-links" aria-label="Primary navigation">
          <a href="#team">Team</a>
          <a href="#toolkit">Initiatives</a>
          <a href="#playbook">Resources</a>
        </div>
        <a className="donate-button" href={DONATE_URL} target="_blank" rel="noreferrer">
          Donate <ArrowUpRight size={16} />
        </a>
      </nav>

      <main id="top">
        <section className="hero">
          <div className="hero-inner">
            <div className="hero-copy">
              <img
                className="campaign-logo"
                src={shredLogo}
                alt="Shred The Debt"
              />
              <p>Global Shapers Austin Hub</p>
              <div className="progress-wrap" aria-label={`${progress}% of fundraising goal`}>
                <div className="progress-label">
                  <span>
                    {campaign.loading ? "Loading raised total" : `${money(campaign.raised)} raised`}
                  </span>
                  <span>{money(campaign.goal)} goal</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="team" className="section section-surface">
          <div className="section-inner">
            <SectionHeader
              kicker="Section 01"
              title="Team"
            />
            <div className="team-grid">
              {state.team.map((member, memberIndex) => (
                <article className={`member-card ${member.wide ? "member-card-wide" : ""}`} key={member.id}>
                  <h3 className="member-name">{member.name}</h3>
                  <LineGroup
                    label="Action Items"
                    tone="blue"
                    values={member.actionItems}
                    onChange={(itemIndex, value) =>
                      updateTeam(memberIndex, "actionItems", value, itemIndex)
                    }
                  />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="toolkit" className="section section-paper">
          <div className="section-inner">
            <SectionHeader
              kicker="Section 02"
              title="Fundraising Initiatives"
            />
            <div className="initiative-section">
              <h3>Outreach</h3>
              <div className="toolkit-subhead">
                <h4>Friends & Family</h4>
              </div>
              <div className="outreach-grid">
                {outreachTemplates.map((template) => renderTemplateCard("outreach", template))}
              </div>
              <div className="toolkit-subhead toolkit-subhead-inline">
                <h4>LinkedIn</h4>
              </div>
              <div className="outreach-grid single-template-grid">
                {linkedInTemplates.map((template) => renderTemplateCard("linkedin", template))}
              </div>
              {renderCustomCards("Outreach")}
              <AddCardControl initiative="Outreach" onAdd={addCustomCard} />
            </div>

            <div className="initiative-section">
              <h3>Restaurants & Food Partnerships</h3>
              <div className="outreach-grid">
                {restaurantTemplates.map((template) => renderTemplateCard("restaurant", template))}
              </div>
              {renderCustomCards("Restaurants & Food Partnerships")}
              <AddCardControl initiative="Restaurants & Food Partnerships" onAdd={addCustomCard} />
            </div>

            <div className="initiative-section">
              <h3>Small Business Partnerships</h3>
              <div className="toolkit-split">
                {businessTemplates.map((template) => (
                  renderTemplateCard("business", template, { variant: "resource" })
                ))}
              </div>
              {renderCustomCards("Small Business Partnerships")}
              <AddCardControl initiative="Small Business Partnerships" onAdd={addCustomCard} />
            </div>

            <div className="initiative-section">
              <h3>Events</h3>
              {renderCustomCards("Events")}
              <AddCardControl initiative="Events" onAdd={addCustomCard} />
            </div>

            <div className="initiative-section">
              <h3>Community Involvement</h3>
              {renderCustomCards("Community Involvement")}
              <AddCardControl initiative="Community Involvement" onAdd={addCustomCard} />
            </div>

            <div className="initiative-section">
              <h3>Corporate/Institutional</h3>
              <article className="resource-card corporate-guide">
                <div className="card-topline">
                  <span>Corporate Sponsorship Guide</span>
                  <Mail size={18} />
                </div>
                <p>Your space to type or paste the guide. Auto-saves as the board evolves.</p>
                <textarea
                  value={state.corporate}
                  onChange={(event) =>
                    setState((current) => ({ ...current, corporate: event.target.value }))
                  }
                  aria-label="Corporate sponsorship guide"
                />
              </article>
              {renderCustomCards("Corporate/Institutional")}
              <AddCardControl initiative="Corporate/Institutional" onAdd={addCustomCard} />
            </div>

            <div className="initiative-section">
              <h3>School + Professional Network</h3>
              <div className="outreach-grid">
                {schoolNetworkTemplates.map((template) => (
                  renderTemplateCard("school-network", template)
                ))}
              </div>
              {renderCustomCards("School + Professional Network")}
              <AddCardControl initiative="School + Professional Network" onAdd={addCustomCard} />
            </div>

            <div className="initiative-section">
              <h3>Media & Advertising</h3>
              {renderCustomCards("Media & Advertising")}
              <AddCardControl initiative="Media & Advertising" onAdd={addCustomCard} />
            </div>

            <article className="resource-card outreach-tracker">
              <h3 className="tracker-title">Contact Tracker</h3>
              <div className="tracker-table">
                <div className="tracker-row tracker-head">
                  <span>Name</span>
                  <span>Initiative</span>
                  <span>Contact</span>
                  <span>Person</span>
                  <span>Notes</span>
                </div>
                {state.outreachTracker.map((row, rowIndex) => (
                  <div className="tracker-row" key={row.id}>
                    <input
                      value={row.name}
                      onChange={(event) =>
                        updateOutreachTracker(rowIndex, "name", event.target.value)
                      }
                      aria-label={`Contact tracker name ${rowIndex + 1}`}
                    />
                    <select
                      value={row.initiative}
                      onChange={(event) =>
                        updateOutreachTracker(rowIndex, "initiative", event.target.value)
                      }
                      aria-label={`Contact tracker initiative ${rowIndex + 1}`}
                    >
                      <option value=""></option>
                      {initiativeOptions.map((initiative) => (
                        <option key={initiative} value={initiative}>
                          {initiative}
                        </option>
                      ))}
                    </select>
                    <input
                      value={row.contact}
                      onChange={(event) =>
                        updateOutreachTracker(rowIndex, "contact", event.target.value)
                      }
                      aria-label={`Contact tracker contact ${rowIndex + 1}`}
                    />
                    <select
                      value={row.person}
                      onChange={(event) =>
                        updateOutreachTracker(rowIndex, "person", event.target.value)
                      }
                      aria-label={`Contact tracker person ${rowIndex + 1}`}
                    >
                      <option value=""></option>
                      {teamNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={row.notes}
                      onChange={(event) =>
                        updateOutreachTracker(rowIndex, "notes", event.target.value)
                      }
                      aria-label={`Contact tracker notes ${rowIndex + 1}`}
                    />
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section id="playbook" className="section section-paper">
          <div className="section-inner">
            <SectionHeader
              kicker="Section 03"
              title="Resources"
            />
            <div className="resources-list">
              {resources.map((resource) => (
                <a
                  className="resource-link-card"
                  href={resource.url}
                  key={resource.title}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{resource.title}</span>
                  <ExternalLink size={17} />
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

    </>
  );
}

function SectionHeader({ kicker, title, text }) {
  return (
    <header className="section-header">
      <span className="eyebrow">{kicker}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </header>
  );
}

function EditableTemplateCard({
  title,
  body,
  Icon,
  copied,
  draft,
  isEditing,
  onCancel,
  onCopy,
  onDraftChange,
  onEdit,
  onSave,
  variant = "copy",
}) {
  const articleClass = variant === "resource" ? "resource-card" : "copy-card";

  return (
    <article className={`${articleClass} editable-template-card`}>
      <div className="card-topline">
        <span>
          {Icon ? <Icon size={16} /> : null}
          {title}
        </span>
        <div className="template-actions">
          {isEditing ? (
            <>
              <button className="ghost-button" type="button" onClick={onCancel}>
                Cancel
              </button>
              <button className="ghost-button primary-action" type="button" onClick={onSave}>
                Save
              </button>
            </>
          ) : (
            <>
              <button className="ghost-button" type="button" onClick={onEdit}>
                Edit
              </button>
              <button className="ghost-button" type="button" onClick={onCopy}>
                {copied ? <Check size={16} /> : <Clipboard size={16} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </>
          )}
        </div>
      </div>
      {isEditing ? (
        <div className="template-edit-stack">
          <label>
            <span>Title</span>
            <input
              value={draft.title || ""}
              onChange={(event) => onDraftChange("title", event.target.value)}
              aria-label={`${title} title editor`}
            />
          </label>
          <label>
            <span>Template</span>
            <textarea
              className="template-editor"
              value={draft.body || ""}
              onChange={(event) => onDraftChange("body", event.target.value)}
              aria-label={`${title} template editor`}
            />
          </label>
        </div>
      ) : variant === "resource" ? (
        <pre className="scroll-pre">{body}</pre>
      ) : (
        <p>{body}</p>
      )}
    </article>
  );
}

function AddCardControl({ initiative, onAdd }) {
  const [type, setType] = useState("messaging");

  return (
    <div className="add-card-control">
      <select
        value={type}
        onChange={(event) => setType(event.target.value)}
        aria-label={`Card type for ${initiative}`}
      >
        <option value="messaging">Messaging Template</option>
        <option value="note">Notecard</option>
        <option value="artifact">Artifact</option>
      </select>
      <button className="ghost-button" type="button" onClick={() => onAdd(initiative, type)}>
        Add Card
      </button>
    </div>
  );
}

function CustomInitiativeCard({ card, copied, onCopy, onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(!card.body && !card.fileData);
  const [draft, setDraft] = useState(card);

  useEffect(() => {
    setDraft(card);
  }, [card]);

  const save = () => {
    onUpdate(draft);
    setIsEditing(false);
  };

  const cancel = () => {
    setDraft(card);
    setIsEditing(false);
  };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((current) => ({
        ...current,
        fileData: reader.result,
        fileName: file.name,
        fileType: file.type,
      }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <article className="resource-card custom-initiative-card">
      <div className="card-topline">
        <span>{cardTypeLabels[card.type]}</span>
        <div className="template-actions">
          {isEditing ? (
            <>
              <button className="ghost-button" type="button" onClick={cancel}>
                Cancel
              </button>
              <button className="ghost-button primary-action" type="button" onClick={save}>
                Save
              </button>
            </>
          ) : (
            <>
              <button className="ghost-button" type="button" onClick={() => setIsEditing(true)}>
                Edit
              </button>
              {card.type === "messaging" ? (
                <button className="ghost-button" type="button" onClick={onCopy}>
                  {copied ? <Check size={16} /> : <Clipboard size={16} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="custom-card-body">
        {isEditing ? (
          <div className="template-edit-stack">
            <label>
              <span>Title</span>
              <input
                value={draft.title || ""}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
                aria-label={`${card.title} title`}
              />
            </label>
            {card.type === "artifact" ? (
              <>
                <label>
                  <span>Upload</span>
                  <input
                    accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt"
                    onChange={(event) => handleFile(event.target.files?.[0])}
                    type="file"
                  />
                </label>
                <label>
                  <span>Notes</span>
                  <textarea
                    className="template-editor"
                    value={draft.body || ""}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, body: event.target.value }))
                    }
                  />
                </label>
              </>
            ) : (
              <label>
                <span>{card.type === "note" ? "Note" : "Template"}</span>
                <textarea
                  className="template-editor"
                  value={draft.body || ""}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, body: event.target.value }))
                  }
                />
              </label>
            )}
          </div>
        ) : (
          <CustomCardDisplay card={card} />
        )}
      </div>
      <button
        aria-label={`Delete ${card.title || cardTypeLabels[card.type]}`}
        className="delete-card-button"
        onClick={onDelete}
        type="button"
      >
        <Trash2 size={13} />
      </button>
    </article>
  );
}

function CustomCardDisplay({ card }) {
  return (
    <div className="custom-card-display">
      <h4>{card.title}</h4>
      {card.type === "artifact" && card.fileData ? (
        card.fileType?.startsWith("image/") ? (
          <img className="artifact-preview" src={card.fileData} alt={card.fileName || card.title} />
        ) : (
          <a className="artifact-download" href={card.fileData} download={card.fileName}>
            {card.fileName || "Download artifact"} <ExternalLink size={15} />
          </a>
        )
      ) : null}
      {card.body ? <p>{card.body}</p> : <p className="empty-card-text">No content yet.</p>}
    </div>
  );
}

function LineGroup({ label, tone, values, onChange }) {
  return (
    <div className="line-group">
      <span className={tone}>{label}</span>
      {values.map((value, index) => (
        <AutoGrowTextarea
          key={`${label}-${index}`}
          value={value}
          aria-label={`${label} ${index + 1}`}
          onChange={(event) => onChange(index, event.target.value)}
        />
      ))}
    </div>
  );
}

function AutoGrowTextarea({ value, onChange, ...props }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      rows={1}
      value={value}
      onChange={onChange}
    />
  );
}

createRoot(document.getElementById("root")).render(<App />);
