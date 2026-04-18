const BASE = import.meta.env.DEV
  ? "http://localhost:5000"
  : ""; // in production, same origin

async function handleRes(r) {
  const text = await r.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      !r.ok
        ? "Backend server error (check if Flask is running)"
        : text || "Invalid response format"
    );
  }

  if (!r.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

async function post(endpoint, body) {
  const r = await fetch(BASE + endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleRes(r);
}

async function postForm(endpoint, formData) {
  const r = await fetch(BASE + endpoint, {
    method: "POST",
    body: formData,
  });
  return handleRes(r);
}

async function get(endpoint) {
  const r = await fetch(BASE + endpoint);
  return handleRes(r);
}

export const api = {
  analyze: (text, lang) =>
    post("/api/analyze", { text, lang }),

  scan: (file, lang) => {
    const f = new FormData();
    f.append("image", file);
    f.append("lang", lang);
    return postForm("/api/scan", f);
  },

  reminders: (lang) =>
    get(`/api/reminders?lang=${lang}`),

  taken: (name, time) =>
    post("/api/taken", {
      medicine_name: name,
      time,
    }),

  followup: (lang) =>
    get(`/api/followup?lang=${lang}`),

  locate: (name, lat, lng) =>
    get(
      `/api/locate-medicine?name=${encodeURIComponent(
        name
      )}&lat=${lat}&lng=${lng}`
    ),

  prescriptions: (lang) =>
    get(`/api/prescriptions?lang=${lang}`),

  prescription: (id, lang) =>
    get(`/api/prescriptions/${id}?lang=${lang}`),
};