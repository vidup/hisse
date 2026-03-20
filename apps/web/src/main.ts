import "./style.css";

interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("#app not found");
}

app.innerHTML = `
  <main class="page">
    <section class="card">
      <p class="eyebrow">Hisse</p>
      <h1>Vite ↔ Fastify</h1>
      <p class="subtitle">Socle minimal : le front appelle l’API et affiche sa réponse.</p>
      <button id="reload-button">Reload health</button>
      <pre id="output" class="output">Loading…</pre>
    </section>
  </main>
`;

const output = requireElement<HTMLPreElement>("#output");
const reloadButton = requireElement<HTMLButtonElement>("#reload-button");

reloadButton.addEventListener("click", () => {
  void loadHealth();
});

void loadHealth();

async function loadHealth() {
  output.textContent = "Loading…";

  try {
    const response = await fetch("/api/health");
    const data = (await response.json()) as HealthResponse;
    output.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    output.textContent = error instanceof Error ? error.message : "Unknown error";
  }
}

function requireElement<TElement extends Element>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);
  return element;
}
