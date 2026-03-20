import "./style.css";

interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

interface AgentProfile {
  id: string;
  name: string;
  rolePrompt: string;
  tools: string[];
  skills: string[];
  createdAt: string;
}

interface AgentsResponse {
  items: AgentProfile[];
  count: number;
}

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("#app not found");
}

app.innerHTML = `
  <main class="page">
    <section class="hero card">
      <p class="eyebrow">Hisse · vertical slice</p>
      <h1>Agents</h1>
      <p class="subtitle">
        Petite app Vite branchée sur une API Fastify pour commencer à gérer des agents.
      </p>
      <div class="hero-meta">
        <span id="health-pill" class="pill pill--loading">Connexion à l'API…</span>
      </div>
    </section>

    <section class="grid">
      <section class="card">
        <div class="section-head">
          <div>
            <p class="eyebrow">Create</p>
            <h2>Créer un agent</h2>
          </div>
        </div>

        <form id="agent-form" class="form">
          <label>
            <span>Nom</span>
            <input name="name" placeholder="PRD Agent" required />
          </label>

          <label>
            <span>Rôle / prompt</span>
            <textarea
              name="rolePrompt"
              rows="5"
              placeholder="Rédige un PRD clair, structuré et actionnable."
              required
            ></textarea>
          </label>

          <label>
            <span>Tools (séparés par des virgules)</span>
            <input name="tools" placeholder="read, bash, hisse_task" />
          </label>

          <label>
            <span>Skills (séparés par des virgules)</span>
            <input name="skills" placeholder="prd-writing, product-thinking" />
          </label>

          <div class="form-actions">
            <button type="submit">Créer l’agent</button>
            <span id="form-status" class="form-status"></span>
          </div>
        </form>
      </section>

      <section class="card">
        <div class="section-head">
          <div>
            <p class="eyebrow">List</p>
            <h2>Agents disponibles</h2>
          </div>
          <button id="refresh-button" class="secondary">Rafraîchir</button>
        </div>

        <div id="agents-meta" class="agents-meta"></div>
        <div id="agents-list" class="agents-list"></div>
      </section>
    </section>
  </main>
`;

const healthPill = requireElement<HTMLSpanElement>("#health-pill");
const agentsMeta = requireElement<HTMLDivElement>("#agents-meta");
const agentsList = requireElement<HTMLDivElement>("#agents-list");
const refreshButton = requireElement<HTMLButtonElement>("#refresh-button");
const form = requireElement<HTMLFormElement>("#agent-form");
const formStatus = requireElement<HTMLSpanElement>("#form-status");

refreshButton.addEventListener("click", () => {
  void loadAgents();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formStatus.textContent = "Création…";

  const formData = new FormData(form);
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    rolePrompt: String(formData.get("rolePrompt") ?? "").trim(),
    tools: splitCsv(String(formData.get("tools") ?? "")),
    skills: splitCsv(String(formData.get("skills") ?? "")),
  };

  try {
    const response = await fetch("/api/agents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    form.reset();
    formStatus.textContent = "Agent créé.";
    await loadAgents();
  } catch (error) {
    formStatus.textContent = error instanceof Error ? error.message : "Erreur inconnue";
  }
});

void Promise.all([loadHealth(), loadAgents()]);

async function loadHealth() {
  try {
    const response = await fetch("/api/health");
    const health = (await response.json()) as HealthResponse;
    healthPill.textContent = `${health.service} · ${health.status}`;
    healthPill.className = "pill pill--ok";
  } catch {
    healthPill.textContent = "API inaccessible";
    healthPill.className = "pill pill--error";
  }
}

async function loadAgents() {
  agentsMeta.textContent = "Chargement…";
  agentsList.innerHTML = "";

  try {
    const response = await fetch("/api/agents");
    const data = (await response.json()) as AgentsResponse;

    agentsMeta.textContent = `${data.count} agent${data.count > 1 ? "s" : ""}`;

    if (data.items.length === 0) {
      agentsList.innerHTML = `<p class="empty">Aucun agent pour le moment.</p>`;
      return;
    }

    agentsList.innerHTML = data.items
      .map(
        (agent) => `
          <article class="agent-card">
            <div class="agent-card__header">
              <div>
                <h3>${escapeHtml(agent.name)}</h3>
                <p class="agent-id">${escapeHtml(agent.id)}</p>
              </div>
              <span class="agent-date">${new Date(agent.createdAt).toLocaleString()}</span>
            </div>
            <p class="agent-role">${escapeHtml(agent.rolePrompt)}</p>
            <div class="chips">
              ${renderChips(agent.tools, "tool")}
            </div>
            <div class="chips">
              ${renderChips(agent.skills, "skill")}
            </div>
          </article>
        `,
      )
      .join("");
  } catch (error) {
    agentsMeta.textContent = "Erreur";
    agentsList.innerHTML = `<p class="empty">${escapeHtml(error instanceof Error ? error.message : "Erreur inconnue")}</p>`;
  }
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function renderChips(values: string[], kind: "tool" | "skill") {
  if (values.length === 0) {
    return `<span class="chip chip--empty">No ${kind}s</span>`;
  }

  return values
    .map((value) => `<span class="chip chip--${kind}">${escapeHtml(value)}</span>`)
    .join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function requireElement<TElement extends Element>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }
  return element;
}
