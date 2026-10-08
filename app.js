"use strict";

// Bring Your Own Pollen: OAuth + PKCE in the browser, no backend, no proxy.
const CLIENT_ID = "pk_6LnedIqhz9hN6gFC";
const REDIRECT = location.origin + location.pathname;
const AUTH_URL = "https://enter.pollinations.ai/authorize";
const TOKEN_URL = "https://enter.pollinations.ai/api/oauth/token";
const API = "https://gen.pollinations.ai";

const TEXT_MODEL = "openai/gpt-5.4-nano";
const TTS_MODEL = "openai/tts-1";
const STT_MODEL = "openai/gpt-transcribe";
const VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

const b64u = (buf) => btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/\+/g, "-").split("/").join("_").replace(/=+$/, "");
const randB = (n) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return b64u(a); };
const s256 = async (v) => b64u(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)));
const $ = (id) => document.getElementById(id);

let token = localStorage.getItem("ff_token") || "";
let login = localStorage.getItem("ff_login") || "";
let mystery = null;
let picked = null;
let lastAudioUrl = null;

/* ---------- sign in ---------- */
async function signIn() {
  const verifier = randB(32);
  localStorage.setItem("pkce_v", verifier);
  const q = new URLSearchParams({
    response_type: "code", client_id: CLIENT_ID, redirect_uri: REDIRECT,
    scope: "profile usage", state: randB(16),
    code_challenge: await s256(verifier), code_challenge_method: "S256"
  });
  location.href = AUTH_URL + "?" + q.toString();
}

async function handleCallback() {
  const p = new URLSearchParams(location.search);
  const code = p.get("code");
  if (!code || token) return;
  const verifier = localStorage.getItem("pkce_v") || "";
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT, client_id: CLIENT_ID, code_verifier: verifier }).toString()
  });
  const d = await r.json();
  if (d.access_token) {
    token = d.access_token;
    localStorage.setItem("ff_token", token);
    history.replaceState(null, "", location.pathname);
  }
  authUI();
}

function authUI() {
  const s = $("status");
  if (token) {
    s.textContent = "Signed in — the case, the answers and the voices are paid with your own Pollen.";
    $("signin").textContent = "Sign out";
  } else {
    s.textContent = "Sign in with Pollinations to open a case. Every line and every voice is your own Pollen.";
    $("signin").textContent = "Sign in with Pollinations";
  }
}


/* ---------- the fable ---------- */
const IMAGE_MODEL = "flux";
const TONES = ["a gentle village tale", "a wry modern parable", "a dark forest warning", "a seaside yarn"];

async function chat(system, user, max) {
  const r = await fetch(API + "/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      max_tokens: max,
      temperature: 0.9
    })
  });
  if (!r.ok) throw new Error("the writer answered " + r.status);
  const d = await r.json();
  const msg = ((d.choices || [])[0] || {}).message || {};
  const txt = msg.content || "";
  const hit = txt.match(/\{[\s\S]*\}/);
  if (!hit) throw new Error("the writer did not return a fable");
  return JSON.parse(hit[0]);
}

function fablePrompt(tone) {
  return "You write very short fables. Reply with JSON only: " +
    "{\"title\":\"three words\",\"lines\":[\"...\",\"...\",\"...\",\"...\"],\"moral\":\"one sentence\",\"picture\":\"a short prompt for an illustrator\"} " +
    "Rules: exactly four lines, each under 16 words, telling one small story that shows the lesson without ever stating it; the moral states the lesson in one sentence; the picture prompt describes one scene with the main character and the setting and must not ask for any text or letters in the image. Tone: " + tone + ".";
}

async function writeFable(lesson, tone) {
  return await chat(fablePrompt(tone), "The lesson: " + lesson, 420);
}

/* ---------- the picture and the voice ---------- */
async function drawPicture(prompt) {
  const seed = Math.floor(Math.random() * 999999);
  const u = API + "/image/" + encodeURIComponent(prompt) +
    "?width=768&height=512&seed=" + seed + "&model=" + IMAGE_MODEL + "&nologo=true";
  const r = await fetch(u, { headers: { Authorization: "Bearer " + token } });
  if (!r.ok) throw new Error("the illustrator answered " + r.status);
  return URL.createObjectURL(await r.blob());
}

async function speak(f) {
  const text = (f.title ? f.title + ". " : "") + (f.lines || []).join(" ") + " " + (f.moral || "");
  const r = await fetch(API + "/v1/audio/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ model: TTS_MODEL, voice: "fable", input: text, response_format: "mp3" })
  });
  if (!r.ok) throw new Error("the voice answered " + r.status);
  return URL.createObjectURL(await r.blob());
}

/* ---------- put it on the page ---------- */
let current = null;

function render(f, picUrl) {
  $("fablebox").hidden = false;
  $("ftitle").textContent = f.title || "A fable";
  $("ftext").innerHTML = "";
  (f.lines || []).forEach(function (line) {
    const p = document.createElement("p");
    p.textContent = line;
    $("ftext").appendChild(p);
  });
  $("fmoral").textContent = f.moral || "";
  if (picUrl) { $("fimg").src = picUrl; $("fimg").hidden = false; }
  else { $("fimg").hidden = true; }
}

/* ---------- the shelf, kept in this browser only ---------- */
function shelf() { try { return JSON.parse(localStorage.getItem("ff_shelf") || "[]"); } catch (e) { return []; } }

function renderShelf() {
  const items = shelf(), box = $("shelf");
  if (!items.length) { box.innerHTML = '<p class="dim">Fables you keep stay here, in this browser.</p>'; return; }
  box.innerHTML = "";
  items.forEach(function (f) {
    const b = document.createElement("button");
    b.className = "ghost";
    b.textContent = f.title || "A fable";
    b.onclick = function () {
      current = f;
      render(f, "");
      $("status").textContent = "Kept fable. Press Tell me a fable again for a fresh drawing of it.";
    };
    box.appendChild(b);
  });
}

/* ---------- the buttons ---------- */
$("tell").onclick = async function () {
  if (!token) { signIn(); return; }
  const lesson = $("lesson").value.trim();
  if (lesson.length < 4) { $("status").textContent = "Write the lesson first, a few words is enough."; return; }
  const tone = TONES[+$("tone").value || 0];
  $("tell").disabled = true;
  $("status").textContent = "Writing the fable...";
  try { current = await writeFable(lesson, tone); }
  catch (e) { $("tell").disabled = false; $("status").textContent = "could not write it (" + e.message + "), try again"; return; }
  render(current, "");
  $("status").textContent = "Drawing the picture...";
  try {
    render(current, await drawPicture(current.picture || lesson));
    $("status").textContent = "Done. Your own Pollen paid for one fable.";
  } catch (e) {
    $("status").textContent = "The fable is ready, the picture failed (" + e.message + ").";
  }
  $("tell").disabled = false;
};

$("read").onclick = async function () {
  if (!token) { signIn(); return; }
  if (!current) { $("status").textContent = "Tell a fable first, then I can read it out."; return; }
  $("status").textContent = "Recording the voice...";
  try { new Audio(await speak(current)).play(); $("status").textContent = "Reading it out loud."; }
  catch (e) { $("status").textContent = "The voice failed (" + e.message + ")."; }
};

$("keep").onclick = function () {
  if (!current) return;
  const items = shelf().filter(function (f) { return f.title !== current.title; });
  items.unshift({ title: current.title, lines: current.lines, moral: current.moral, picture: current.picture });
  localStorage.setItem("ff_shelf", JSON.stringify(items.slice(0, 10)));
  renderShelf();
  $("status").textContent = "Kept. It is waiting in your shelf below.";
};

/* ---------- boot ---------- */
authUI();
handleCallback();
renderShelf();
