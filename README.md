# Shabd: AI voice vocabulary coach

A voice agent that helps people learn English vocabulary. The coach says a word, the learner explains it in their own words, then uses it in a sentence. Hindi hints help when they are stuck, and missed words come back later in the round.

## AI features (Gemini)
1. **Understands any explanation.** Judges the learner's own words, Hinglish included, as correct, close or wrong.
2. **Sentence coach.** Checks the learner's sentence, gives one specific tip and a better version.
3. **Ask about the word.** The learner can ask follow-up questions by voice ("How is it different from shy?").
4. **Words on any topic.** Type a topic like "banking" and AI creates a fresh set of words.

If AI is unavailable, the app still works in basic mode with rule-based checks.

## Files
- `index.html`: the whole app (voice, UI, logic).
- `netlify/functions/coach.mjs`: server function that calls Gemini, so the API key is never exposed in the page.
- `netlify.toml`: Netlify settings.

## Deploy (about 15 minutes, free)
1. **Get a Gemini API key.** Go to aistudio.google.com, sign in, click **Get API key**, then **Create API key**. Copy it. Do not turn on billing for this project, so the free limits protect you.
2. **Put the files on GitHub.** On github.com create a new repository (for example `shabd-coach`). Click **uploading an existing file** and drag in everything from this folder: `index.html`, `netlify.toml`, `README.md` and the `netlify` folder. Commit.
3. **Deploy on Netlify.** On app.netlify.com choose **Add new project, Import an existing project, GitHub**, pick the repository, leave the build settings as they are, and deploy.
4. **Add the key.** In the Netlify project go to **Project configuration, Environment variables, Add a variable**. Key: `GEMINI_API_KEY`, value: your key. Then go to **Deploys** and click **Trigger deploy** so the function picks it up.
5. **Rename the link (optional).** In project settings, change the name so the link looks like `shabd-coach-yourname.netlify.app`.
6. **Test.** Open the link in Chrome or Edge, allow the microphone, and check that the top bar says **AI coach on · Gemini**.

## If the AI badge says "Basic mode"
- Check the variable name is exactly `GEMINI_API_KEY` and that you redeployed after adding it.
- If the Netlify function log shows a model error, add another variable `GEMINI_MODEL` with a model name listed in Google AI Studio, then redeploy.
- A `rate_limited` error means the free quota is used up for now; it resets later.

## Browser support
Voice input uses the browser's speech recognition, which works best in Chrome and Edge on desktop and Android. In other browsers the learner can type answers while the coach still speaks.
