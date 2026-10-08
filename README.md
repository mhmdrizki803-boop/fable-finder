# Alibi — a voice murder mystery

Four suspects, one interview at a time. Ask out loud, catch the contradictions, then name the killer. Every case is written fresh the moment you press **New case**.

**[Play Alibi](https://mhmdrizzzki.github.io/voice-mystery/)**

## What happens in a case

- A text model writes the case: a victim, a place, and four suspects with their own voice — one of them is lying.
- You interview by typing, or by recording the question; speech recognition turns your voice into the question.
- Each suspect answers in character and the answer is spoken back to you with `POST /v1/audio/speech`, one voice per suspect.
- The notebook keeps every claim, so contradictions surface while you play. The whole case travels with every question, so a guilty suspect stays consistent and a truthful one stops making sense.
- Accuse when you are ready. The real story is revealed either way, then a whole new case.

## Bring your own Pollen

Press *Sign in with Pollinations* and allow `voice-mystery`: the sign-in is a plain OAuth + PKCE loop in the browser, there is no backend and no proxy. Your own Pollen pays for the case, for every answer and for every voice you hear.

## How it works

```js
// the suspect answers in character, with the case in the prompt
const r = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
  body: JSON.stringify({ model: TEXT_MODEL, messages: [
    { role: "system", content: suspectSystem(suspect) },
    { role: "user", content: "The detective asks: " + question }] })
});

// and the same answer is spoken back with that suspect's own voice
const voice = await fetch("https://gen.pollinations.ai/v1/audio/speech", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
  body: JSON.stringify({ model: "openai/tts-1", voice: suspect.voice,
    input: answer, response_format: "mp3" })
});
```

## Screenshots

![A case in progress](docs/screenshot-case.png)
