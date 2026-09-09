# Display modes

Part of `docs/decisions/` — see `docs/DECISIONS.md` for the index and the reading policy.

**This file holds only the forward-looking reasoning — the *why* behind each display mode's shape and scope.** It deliberately does not re-explain: current rendering rules and behavior (`app/components/FretboardDiagram.RULES.md`, `SheetDiagram.RULES.md`), what's built vs. not right now (`app/status/song-views.md`), or the blow-by-blow build history (`docs/DRIFT_LOG.md`). If you're looking for exactly how a segment sizes itself or what a specific bug fix was, those files have it — this one only has why the shape is what it is.

## Display modes are layered, and ASCII is the default, not a placeholder

The plain ASCII tab is the baseline output — always available, always correct in content, independent of any richer view existing yet. Additional display modes (a visual fretboard diagram, note-highlighting during playback, chord-name references for a song) are opt-in layers on top of the same underlying note/chord data, built one at a time, each independently swappable without affecting the others — the same "one interface, swappable implementations" principle already used for the processing pipeline, extended to how results get shown.

## The fretboard diagram: two real lessons from actually using it

**Position without order isn't useful on its own.** The first version deduped every unique string/fret position used in a song into one static diagram — deliberately not showing playback order, on the theory that "where does this song live on the neck" was useful by itself. Tried against a real song, it wasn't: knowing *where* a note is without knowing *when* it comes doesn't actually help someone find it while playing. Replaced with one small mini-fretboard per playback step, chained in order — the lesson being that for a *practice* tool specifically, sequence is not optional detail, it's the point.

**A fixed-size layout wastes the exact case that matters most.** The sequenced version then used a fixed 4-fret window per segment regardless of content — padded, and wasteful for the common case of a single note. Changed to a tight fit: a segment's window is exactly the fretted span played, no padding. The lesson generalizes past this one component: don't reserve space for the general case when the common case is much smaller — let width (or whatever the dimension is) become a real signal instead of decoration.

## Songsterr explored as a reference, and why it's inspiration, not a near-term target

Songsterr's synced notation+tab+lyrics view with a YouTube play-along was looked at directly as a possible direction. Two real, structural gaps, not just "more work": (1) its rhythm notation (stems/rests/beaming precisely on the beat) needs exact per-note duration, which this project deliberately does not capture — `tab.schema.json`'s `durationSec` is approximated as "time until the next note," confirmed acceptable earlier specifically because exact rhythm was decided to be the human's job, not the tab's; matching Songsterr here would mean reopening that decision, not adding a display mode on top of it. (2) YouTube play-along needs a video-ingestion/metadata path this project doesn't have — `yt-dlp` is explicitly backlogged for real licensing reasons (`docs/decisions/backlog-and-scope.md`), so this isn't just unbuilt, it's blocked on a decision already deliberately deferred.

**"Sheet" (built 2026-09-09) is the deliberately scoped-down part of that idea that *is* compatible with what's already decided**: a tab staff visually inspired by Songsterr — 6 lines, round note shapes with the fret number inside, playback order — with no rhythm notation at all (no stems, no beaming, no duration-proportional spacing). Not real musical staff notation; Songsterr shows a real notation staff *and* a tab staff together, this only builds the tab-staff half, which is the half this project's data actually supports well.

## Playback and the metronome

**Playback** in practice mode was always meant to play back a synthesized version of the transcribed notes, not the original recording — chosen because listening to the full original song while trying to learn a riff is distracting for a beginner who hasn't learned it yet; a metronome defaulting to the song's tempo but adjustable down was part of this idea from the start, for the same reason. **A visual cue highlighting which note/chord is currently sounding** was the companion idea, backlogged alongside it — reading a tab alone doesn't convey the melody, and sometimes you have to hear (or see) it to play it accurately.

**The metronome (built 2026-09-09) answers this partially, deliberately, not as an oversight.** `app/hooks/useMetronome.ts` is a generic step sequencer — play/pause, editable bpm, advance one step per beat, loop — with zero knowledge of notes, strings, or frets, the same "keep layers separate" principle applied to *when* something happens, not just *what*. It does not attempt to sync to the song's actual note timing; it advances one step per beat at whatever bpm is set, full stop — the same "recognizable, not accurate" reasoning as the top of `docs/DECISIONS.md`, not an attempt at real rhythmic sync (which would hit the same `durationSec`-approximation limit as the Songsterr gap above). Because the hook is generic, any display mode could consume its `currentStep`; today only Sheet does (a playhead line, inverted note colors at the active step) — extending the same highlight to Fretboard/Ascii is real and logged, just not built.

## Three real views, one screen, switched by tab (2026-09-09)

`app/components/SongTabs.tsx` — Sheet, Fretboard, Ascii, in that order (Sheet is the default), exactly one view visible at a time. This is the "opt-in layers" principle above, now actually exercised with three real implementations instead of one.
