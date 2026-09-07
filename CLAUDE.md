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
npm run dev                     # Website, http://localhost:5173
npm test                        # Vitest: Logik (91 Tests)
npm run test:e2e                # Playwright: Oberfläche (17 Tests)
npm run typecheck               # tsc + svelte-check
npx vitest run -t "Tarnung"     # einzelne Testgruppe
npm run demo 60 25              # Spielplan im Terminal ansehen
npm run range                   # welche Gewinnzeitpunkte tragen 80 Gäste?
npm run feasibility             # Konstruktion vs. Auswahl (langsam)
```

`npm run test:e2e` baut selbst und startet `vite preview` auf Port 4173 — getestet
wird die Produktionsausgabe, nicht der Dev-Server. `vite preview` braucht dabei
zwingend `--host`, sonst lauscht es nicht auf 127.0.0.1 und Playwright wartet
ins Leere.

## Architektur

Statische Website: Vite, Svelte 5, kein Backend. `src/core/` ist reines
TypeScript ohne Abhängigkeiten und ohne DOM-Zugriff, `src/ui/` die Oberfläche
darüber. Die Trennung ist wichtig — der Kern darf nie etwas über das DOM
wissen, damit die Terminal-Skripte in `scripts/` weiter funktionieren.

- `types.ts` — Datenmodell und die Regelsätze `CLASSIC` / `OPEN_80` / `KIDS_3X3`
- `rules.ts` — Linien, Spaltenbereiche, freies Feld; `lines()` ist gecacht
- `card.ts` — Trefferbild und `winIndexOf()`: bei welcher Ziehung eine Karte gewinnt
- `generator.ts` — `buildCard()`, `generatePlan()`, `randomCard()`
- `rng.ts` — seed-basiert; gleicher Seed muss exakt denselben Plan liefern

### Zwei Dinge, die man wissen muss

**Eine Zelle trägt ein `Item`, keine Zahl.** Die Gewinnlogik arbeitet
ausschließlich auf Positionen und Ziehungsindizes und darf nie auf `label`
schauen. Das trennt Darstellung von Logik und hält den Kern für andere
Regelsätze offen. Beschriftungen frei zu setzen ist damit technisch möglich
(`generatePlan({ items })`), ist aber **kein Produktziel** — die Oberfläche
kennt nur Zahlen-Bingo.

**`buildCard` baut in drei Schritten**: Gewinnlinie mit früh gezogenen Elementen
füllen, dann für jedes übrige Feld entscheiden „früh oder spät" (`Slot`-Maske),
dann konkrete Elemente zuweisen. Der Kern ist `repairSlots`: Jede fremde Linie
braucht mindestens ein spät gezogenes Feld, sonst entsteht ein verfrühtes Bingo.
`balanceAgainstSupply` gleicht die Maske danach an den Vorrat je Spalte ab und
muss `repairSlots` erneut auslösen.

### Oberfläche

- `src/ui/App.svelte` — Landingpage, Generator und Probelauf in einem
- `src/ui/lib/BingoCard.svelte` — eine Karte; `brand={null}` ist der Standard
- `src/ui/lib/HostSheet.svelte` — Moderatorenblatt mit Regieanweisung
- `src/ui/lib/DrawApp.svelte` — Ziehungsapp für den Beamer
- `src/ui/lib/planParams.ts` — Plan in der Adresszeile, Regelsatz-Auswahl

### Die Ziehungsapp

Erreichbar über `#draw?g=…&w=…&s=…&r=…`. Der Plan steckt vollständig in diesen
vier Werten, weil der Seed alles bestimmt — dadurch lässt sich der Link auf das
Gerät am Beamer schicken und zeigt dort garantiert dieselbe Ziehung wie der
Ausdruck. Genau das prüft der wichtigste E2E-Test („stimmt mit dem
Moderatorenblatt überein"); bricht er, passen Karten und Ziehung nicht mehr
zusammen und der ganze Abend wäre hin.

Vier Dinge, die dort absichtlich so sind:

1. **Dunkler Grund.** Bewusste Ausnahme vom Papierton: Das läuft projiziert in
   einem oft abgedunkelten Saal. Umschaltbar für helle Räume.
2. **Der Regiehinweis ist klein und gedeckt.** Der Moderator liest ihn am
   Rechner, auf der Projektion aus zehn Metern ist er unlesbar. Er darf den
   Gästen nichts verraten — deshalb steht dort auch sonst nichts über den Trick.
3. **Ein Klick während des Trommelwirbels kürzt ihn ab**, statt zu verpuffen.
   Vorher war der Knopf gesperrt und Nachklicken verschluckte den Klick.
4. **Planwechsel baut die Komponente neu auf** (`{#key drawHash(params)}` in
   `App.svelte`). Ohne das behält die Ziehung ihren Zählerstand, und wer den
   Seed ändert, stünde mitten in einer Ziehung, die zu seinen frisch gedruckten
   Karten nicht passt.

Svelte 5 mit Runes (`$state`, `$derived`, `$effect`). Die Bildschirmansicht und
die Druckfassung stehen **beide** im DOM und tragen dieselben `data-testid` —
die Druckfassung liegt in `.print-only`, das nur `@media print` sichtbar wird.
In Tests deshalb immer über `getByRole('main')` bzw. `.print-only` eingrenzen,
sonst schlägt Playwrights strict mode zu.

Gedruckt wird über Druck-CSS, nicht über eine PDF-Bibliothek: gestochen scharfe
Vektorschrift, dasselbe Layout wie in der Vorschau, kein zusätzlicher Code. Vier
Karten je A4-Seite, das Moderatorenblatt auf einer eigenen Seite.

Zwei Dinge, die auf dem Papier zählen und leicht kaputtgehen:

1. **Gedruckte Karten sind leer.** Die Druckfassung rendert mit `drawn={0}`.
   Einzige markierte Zelle je Karte ist das freie Mittelfeld — das gilt per
   Definition immer als getroffen (`positionOf(null)` gibt `-1` zurück).
2. **Kein Aufdruck.** `brand` bleibt standardmäßig `null`. Der Produktname auf
   dem Tisch würde die Überraschung verraten.

### Vorsicht bei Parametern aus der Adresszeile

`Number(null)` ist `0`, nicht `NaN` — ein fehlender Parameter rutschte damit als
0 durch, statt den Standard zu nehmen, und die Seite startete ohne Adresszusatz
mit einem Gast und Gewinn bei Ziehung 1, also im Fehlerzustand. `clampInt` in
`planParams.ts` fängt das ab, `planParams.test.ts` hält es fest.

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
