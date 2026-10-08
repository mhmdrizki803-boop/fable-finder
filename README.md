[![Made with pollinations.ai](https://raw.githubusercontent.com/pollinations/pollinations/main/packages/ui/src/brand/badge-made-with.svg)](https://pollinations.ai/?ref=badge)

# Fable Finder

Type the lesson you keep forgetting and get a four line fable with a picture, written on the spot.

**Live:** https://mhmdrizki803-boop.github.io/fable-finder/

## What it does

- The lesson goes to a text model, which returns a title, exactly four lines, a moral, and the one line prompt an illustrator would need.
- An image model draws that picture on the spot, so every fable gets its own illustration.
- **Read it aloud** sends the same words to a voice model, so the fable works with your eyes closed.
- **Keep this one** saves the fable to a shelf in your browser. Nothing is uploaded anywhere else.

## How it uses Pollinations

Bring your own Pollen: signing in is a plain OAuth + PKCE loop in the browser, and the player's own Pollen pays for the writing (`/v1/chat/completions`), the picture (`/image/{prompt}`) and the voice (`/v1/audio/speech`). Nothing is proxied through a server of ours, the page is static and talks straight to `gen.pollinations.ai`.
