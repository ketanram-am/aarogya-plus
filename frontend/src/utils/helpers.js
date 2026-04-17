export function probColor(p) {
  return p >= 0.7 ? "var(--red)" : p >= 0.4 ? "var(--amber)" : "var(--sage)";
}
