const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app element");
}

app.innerHTML = `
  <main class="app">
    <h1>Color 3D AI</h1>
    <p>Basic TypeScript web app scaffold.</p>
  </main>
`;
