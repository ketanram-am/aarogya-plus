const BASE = import.meta.env.DEV ? "" : "";

async function handleRes(r) {
  const text = await r.text();
  try { 
    return JSON.parse(text); 
  } catch { 
    throw new Error(!r.ok ? "Backend server is offline (502 Gateway)" : text || "Invalid response format"); 
  }
}

async function post(endpoint, body) {
  const r = await fetch(BASE + endpoint, { 
    method: "POST", 
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify(body) 
  });
  return handleRes(r);
}

async function postForm(endpoint, formData) {
  const r = await fetch(BASE + endpoint, { method: "POST", body: formData });
  return handleRes(r);
}

async function get(endpoint) {
  const r = await fetch(BASE + endpoint);
  return handleRes(r);
}

export const api = {
  analyze: (text, lang) => post("/api/analyze", { text, lang }),
  scan: (file, lang) => { 
    const f = new FormData(); 
    f.append("image", file); 
    f.append("lang", lang); 
    return postForm("/api/scan", f); 
  },
  reminders: (lang) => get(`/api/reminders?lang=${lang}`),
  taken: (name, time) => post("/api/taken", { medicine_name: name, time }),
  followup: (lang) => get(`/api/followup?lang=${lang}`),
  locate: (name, lat, lng) => get(`/api/locate-medicine?name=${encodeURIComponent(name)}&lat=${lat}&lng=${lng}`),
};
