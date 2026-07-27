"""AI-Agent: Gemini-powered Pokemon team advisor.

Runs as its own small Flask server, separate from the Node/Express backend
and the React frontend. The Node backend (Backend/routes/team.js) is the
only thing that talks to this service — it computes the team's type
weaknesses itself (trusted, deterministic logic) and forwards that data here
so Gemini only has to reason about it, not re-derive Pokemon type match-ups
from scratch.

Run it with:
    pip install -r requirements.txt
    python app.py

It reads GEMINI_API_KEY from a local .env file (see .env.example) and
listens on PORT (default 5002).
"""

import os

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from google import genai
from google.genai import types

load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is not set. Copy AI-Agent/.env.example to "
        "AI-Agent/.env and fill in your key from "
        "https://aistudio.google.com/apikey."
    )

# ─── Token-efficiency settings ──────────────────────────────────────────────
# This task (summarize pre-computed weakness data into a few sentences of
# advice) doesn't need heavy reasoning, so every knob here is set to spend as
# few tokens as possible per call:
#   - flash-lite is Gemini's cheapest current text tier (vs. flash/pro).
#   - thinking_level="minimal" skips the internal "thinking" tokens that are
#     billed even though they're never shown to the user.
#   - max_output_tokens hard-caps the response so a verbose answer can't run
#     away with cost — ~220 tokens comfortably covers the requested 3-5
#     sentences.
MODEL_NAME = "gemini-3.5-flash-lite"
MAX_OUTPUT_TOKENS = 220
GENERATION_CONFIG = types.GenerateContentConfig(
    thinking_config=types.ThinkingConfig(thinking_level="minimal"),
    max_output_tokens=MAX_OUTPUT_TOKENS,
)

client = genai.Client(api_key=GEMINI_API_KEY)
app = Flask(__name__)


def build_prompt(team, pokemon_weaknesses, team_weaknesses):
    """Builds the natural-language prompt sent to Gemini.

    `team`, `pokemon_weaknesses`, and `team_weaknesses` all come straight
    from Backend/routes/team.js's computeTeamWeaknesses(), so the weakness
    data here is already correct — Gemini's job is only to summarize it and
    suggest additions, not calculate type effectiveness itself.

    Kept deliberately terse: every word here is billed as an input token on
    every team change, so the instructions are trimmed to the minimum needed
    to get a short, on-topic answer (see MODEL_NAME/GENERATION_CONFIG above
    for the other token-saving knobs).
    """
    weaknesses_by_id = {entry["id"]: entry.get("weaknesses", []) for entry in pokemon_weaknesses}

    team_lines = []
    for member in team:
        types = ",".join(member.get("typeNames", [])) or "?"
        weaknesses = ",".join(weaknesses_by_id.get(member["id"], [])) or "none"
        team_lines.append(f"{member['name']}({types}) weak:{weaknesses}")

    shared = (
        ",".join(f"{entry['name']}x{entry['count']}" for entry in team_weaknesses)
        if team_weaknesses
        else "none"
    )

    return (
        "Pokemon team advisor. Plain text, 2-4 short sentences, no markdown.\n"
        f"Team: {'; '.join(team_lines)}\n"
        f"Shared weaknesses: {shared}\n"
        "If coverage is already solid (at most 1-2 shared weaknesses), say the "
        "team looks good and why. Otherwise name 1-3 real existing Pokemon "
        "that cover the shared weaknesses and say why briefly."
    )


# Team size and shape are already validated by Backend/routes/team.js before
# a request ever reaches this service, but this service has no auth of its
# own and could be called directly (e.g. if ever exposed beyond localhost),
# so the same checks are repeated here as defense in depth.
MAX_TEAM_SIZE = 6


def validate_team(team):
    """Returns a list of error strings; empty list means the team is valid."""
    if not isinstance(team, list):
        return ["team must be a list"]
    if len(team) > MAX_TEAM_SIZE:
        return [f"team must contain at most {MAX_TEAM_SIZE} Pokemon"]

    errors = []
    for index, member in enumerate(team):
        if not isinstance(member, dict) or not member.get("name") or "id" not in member:
            errors.append(f"team[{index}] is missing a valid id/name")
    return errors


@app.route("/recommend", methods=["POST"])
def recommend():
    data = request.get_json(force=True, silent=True) or {}
    team = data.get("team") or []
    pokemon_weaknesses = data.get("pokemonWeaknesses") or []
    team_weaknesses = data.get("teamWeaknesses") or []

    if not team:
        return jsonify({"recommendation": "Add Pokemon to your team to get AI advice."})

    validation_errors = validate_team(team)
    if validation_errors:
        return jsonify({"error": "; ".join(validation_errors)}), 400

    try:
        # Moved inside the try/except: a malformed team payload previously
        # made build_prompt() raise an uncaught KeyError here, returning a
        # raw Flask 500 (and, with debug=True, exposing the interactive
        # Werkzeug debugger). validate_team() above should catch most bad
        # input already, but this keeps any remaining edge case from
        # crashing out unhandled.
        prompt = build_prompt(team, pokemon_weaknesses, team_weaknesses)

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=GENERATION_CONFIG,
        )
        text = (response.text or "").strip()
        if not text:
            text = "The AI didn't return any advice that time — try again in a moment."

        # Logged (not billed extra) so you can see exactly what each call
        # costs. thoughts_token_count should be ~0 thanks to thinking_level.
        usage = response.usage_metadata
        if usage:
            app.logger.info(
                "Gemini usage — input:%s thoughts:%s output:%s",
                usage.prompt_token_count,
                usage.thoughts_token_count,
                usage.candidates_token_count,
            )

        return jsonify({"recommendation": text})
    except Exception as exc:  # Any Gemini/network error surfaces as a clean 502.
        app.logger.error("Gemini request failed: %s", exc)
        return jsonify({"error": "Could not get a recommendation from Gemini."}), 502


@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": MODEL_NAME, "max_output_tokens": MAX_OUTPUT_TOKENS})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5002))
    app.run(port=port, debug=True)
