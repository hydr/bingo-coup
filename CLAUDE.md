# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt

**Bingo Coup** — Bingo, bei dem **alle Gäste gleichzeitig gewinnen**: Die Ziehungsreihenfolge ist
vorbestimmt, und jede Karte ist so konstruiert, dass sie genau bei einer
bestimmten Ziehung Bingo hat — bei derselben für alle.

Ziel ist eine statische Website (Generator, Druckansicht, Beamer-Ziehungsapp).
Plan: [docs/roadmap.md](docs/roadmap.md), Vermarktung: [docs/publikation.md](docs/publikation.md).

`Bingo.py` ist der Python-2-Prototyp von 2011 und liegt als Referenz unverändert
im Repo. **Nicht anfassen und nicht portieren** — die Logik ist in `src/core/`
neu gebaut.

## Befehle

```bash
npm test                        # Vitest, alle Tests
npx vitest run -t "Tarnung"     # einzelne Testgruppe
npm run typecheck               # tsc --noEmit
npx tsx scripts/demo.ts 60 25   # Spielplan im Terminal ansehen
npx tsx scripts/range.ts        # welche Gewinnzeitpunkte tragen 80 Gäste?
npx tsx scripts/feasibility.ts  # Konstruktion vs. Auswahl im Vergleich (langsam)
```

## Architektur

`src/core/` ist reines TypeScript ohne Abhängigkeiten und ohne DOM-Zugriff —
alles läuft später im Browser, es gibt kein Backend.

- `types.ts` — Datenmodell und die Regelsätze `CLASSIC` / `OPEN_80` / `KIDS_3X3`
- `rules.ts` — Linien, Spaltenbereiche, freies Feld; `lines()` ist gecacht
- `card.ts` — Trefferbild und `winIndexOf()`: bei welcher Ziehung eine Karte gewinnt
- `generator.ts` — `buildCard()`, `generatePlan()`, `randomCard()`
- `rng.ts` — seed-basiert; gleicher Seed muss exakt denselben Plan liefern

### Zwei Dinge, die man wissen muss

**Eine Zelle trägt ein `Item`, keine Zahl.** Dadurch teilen Zahlen-Bingo und
Begriffe-Bingo dieselbe Logik. Die Gewinnlogik arbeitet ausschließlich auf
Positionen und Ziehungsindizes — sie darf nie auf `label` schauen.

**`buildCard` baut in drei Schritten**: Gewinnlinie mit früh gezogenen Elementen
füllen, dann für jedes übrige Feld entscheiden „früh oder spät" (`Slot`-Maske),
dann konkrete Elemente zuweisen. Der Kern ist `repairSlots`: Jede fremde Linie
braucht mindestens ein spät gezogenes Feld, sonst entsteht ein verfrühtes Bingo.
`balanceAgainstSupply` gleicht die Maske danach an den Vorrat je Spalte ab und
muss `repairSlots` erneut auslösen.

### Invarianten

Diese Zusagen dürfen nicht brechen; alle sind getestet:

1. Jede Karte gewinnt bei genau `winAt` — keine Linie wird vorher vollständig.
2. Keine Zahl doppelt auf einer Karte, jede im Bereich ihrer Spalte.
3. Gleicher Seed → identischer Plan.
4. Das Trefferbild gleicht dem echter Gewinnerkarten (siehe unten).

`buildCard` rechnet jede Karte am Ende unabhängig mit `winIndexOf` nach und
verwirft sie bei Abweichung. Diesen Sicherheitsgurt nicht entfernen — er ist der
Grund, warum ein Fehler in der Maskenlogik nicht auf gedrucktem Papier landet.

### Tarnung

Die Karten dürfen nicht präpariert aussehen — Gäste schauen auf den Zettel des
Nachbarn. Deshalb streut `naturalLook` Treffer außerhalb der Gewinnlinie ein.

Der Maßstab dafür ist nicht eine beliebige Karte, sondern eine **ehrliche Karte,
die zufällig bei `winAt` gewinnt**; die hat systematisch mehr Treffer als der
Durchschnitt. Der Test misst diese Referenz zur Laufzeit per `randomCard` und
Rejection Sampling, statt sie zu schätzen. Wer an `naturalLook` etwas ändert,
prüft gegen diese Referenz, nicht gegen eine Faustregel.

### Gemessene Grenzen

Mit Neu-Mischen der Ziehungsreihenfolge in `generatePlan` tragen alle
Gewinnzeitpunkte von 5 bis 65 einen Saal mit 80 Gästen, in unter 30 ms. Die
Machbarkeit ist damit **kein Engpass** — der sinnvolle Bereich ergibt sich aus
der Dramaturgie, nicht aus der Kombinatorik.

Eine einzelne Ziehungsreihenfolge trägt aber nicht jeden Gewinnzeitpunkt: Bei
frühen Zeitpunkten kann ein B-I-N-G-O-Block in den ersten Ziehungen leer
ausgehen, dann ist keine Gewinnlinie mehr füllbar. `generatePlan` mischt in
diesem Fall neu; `buildCard` allein kann scheitern.

## Sprache

Code-Bezeichner englisch, Kommentare und Dokumentation deutsch. Umlaute in
Quelltext-Kommentaren umschrieben (`ue`), in Markdown-Dateien ausgeschrieben.
