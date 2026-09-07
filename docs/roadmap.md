# Roadmap

Ziel: Aus dem Prototyp `Bingo.py` ein fertiges Produkt machen — eine schöne,
interaktive Website, mit der ein Gastgeber ohne Vorwissen ein Bingo vorbereiten
kann, bei dem **alle Gäste gleichzeitig gewinnen**.

Positionierung und Vermarktung: siehe [publikation.md](publikation.md).

## Getroffene Entscheidungen

| Frage | Entscheidung |
|---|---|
| Technologie | Alles TypeScript, läuft komplett im Browser. Kein Backend. |
| Umfang | Volles Paket: Landingpage + Generator + PDF + Beamer-Ziehungsapp |
| Geschäftsmodell | Kostenlos, Open Source, Repo öffentlich |
| Name | **Bingo Coup** (Repo: `bingo-coup`) |
| Zeitrahmen | Kein Termindruck — Priorität liegt auf Produktqualität |
| Spielvarianten | Zahlen **und** Begriffe, generisches Datenmodell von Anfang an |
| Regeln | Klassisch 5×5, 1–75, B-I-N-G-O-Spalten, freies Mittelfeld |
| Sprache | Deutsch, Texte in Sprachdateien (Englisch später ohne Umbau) |
| Design | Festlich und warm: Serifen, Creme, Gold-Akzent, viel Luft |

`Bingo.py` bleibt unverändert als Referenz und Projektursprung im Repo liegen.

## Ausgangslage

`Bingo.py` ist der Python-2-Prototyp von 2011 mit dem richtigen Kerngedanken.
Er bleibt unverändert als Referenz liegen; die Logik ist in `src/core/` neu
gebaut. Seine bekannten Schwächen — doppelte Zahlen durch zwei Indexfehler,
nur eine Karte statt n, Verwerfen statt erneutem Versuch — sind dort behoben.

## Phase 0 — Kern in TypeScript ✅ erledigt

- TypeScript-Projekt, keine Laufzeitabhängigkeiten, kein DOM-Zugriff
- Klassische Regeln inklusive B-I-N-G-O-Spalten und freiem Mittelfeld
- 80 Tests auf den Kerninvarianten
- Seed-basierte Reproduzierbarkeit: gleicher Seed = identischer Plan

## Phase 1 — n Karten zu einer Ziehung ✅ erledigt

`generatePlan()` erzeugt aus einer festen Ziehungsreihenfolge und einem
Gewinnzeitpunkt n Karten, die alle bei dieser Ziehung gewinnen und keine vorher.
Varianten über `winAtFor` (Welle, zwei Gruppen, alle-außer-einem).

### Was die Machbarkeitsanalyse ergeben hat

Die Sorge, die klassischen Regeln könnten den Spielraum zu sehr verengen, hat
sich **nicht bestätigt**. Gemessen mit `scripts/range.ts`, 80 Gäste, je fünf
Seeds:

| Gewinnzeitpunkt | Klassisch 1–75 | Offen 1–80 |
|---|---|---|
| 5 bis 65 | 5/5 erfolgreich | 5/5 erfolgreich |

Rechenzeit 4–26 ms für einen kompletten Saal. Die Machbarkeit ist damit kein
Engpass — der sinnvolle Bereich ergibt sich aus der Dramaturgie, nicht aus der
Kombinatorik. Der Fallback auf `OPEN_80` wird nicht gebraucht, bleibt aber als
Konfiguration erhalten.

Entscheidend dafür war ein Fund während der Messung: Eine *einzelne*
Ziehungsreihenfolge trägt nicht jeden Gewinnzeitpunkt. Bei frühen Zeitpunkten
kann ein B-I-N-G-O-Block in den ersten Ziehungen leer ausgehen, dann lässt sich
keine Gewinnlinie mehr füllen — bei Ziehung 12 schlug ursprünglich alles fehl,
während 10 und 15 funktionierten. Da wir die Reihenfolge selbst festlegen,
mischt `generatePlan` in diesem Fall einfach neu. Das schließt die Lücke.

### Zwei Ausbaustufen, die sich erledigt haben

Die gemeinsame Schlusszahl und das „alle haben vorher vier Kreuze" waren als
eigene Ausbaustufen geplant. Beides ist **zwangsläufig**: Eine Karte gewinnt nur
dann bei `winAt`, wenn das Element von `winAt` auf ihr steht und alle übrigen
Felder ihrer Gewinnlinie vorher gezogen wurden. Die dramaturgisch stärkste
Variante ist der Normalfall, kein Zusatz.

### Die Tarnung war die eigentliche Arbeit

Nicht die Kombinatorik, sondern die Frage, ob die Karten *echt aussehen*. Ohne
Gegenmaßnahme trägt eine konstruierte Karte zum Gewinnzeitpunkt genau die
Treffer ihrer Gewinnlinie und sonst nichts — das fällt jedem Gast auf, der auf
den Zettel seines Nachbarn schaut.

Der richtige Maßstab ist dabei nicht eine durchschnittliche Karte, sondern eine
ehrliche Karte, die zufällig bei `winAt` gewinnt; die hat systematisch mehr
Treffer, weil sie Glück hatte. Gemessen bei Ziehung 25 von 75:

| | Treffer im Mittel |
|---|---|
| Ehrliche Karte, die zufällig bei 25 gewinnt | 11,33 |
| Unsere konstruierte Karte | 11,48 |
| Ohne `naturalLook` (Gegenprobe) | 6 |

Nebenbefund: Eine ehrliche Karte gewinnt in 1,25 % der Fälle genau bei Ziehung
25. Man könnte die Karten also auch durch Auswahl statt durch Konstruktion
gewinnen — perfekt getarnt, weil sie echt sind. `scripts/feasibility.ts`
vergleicht beide Wege. Die Konstruktion gewinnt, weil sie über den gesamten
Bereich zuverlässig ist und rund tausendmal schneller; `randomCard()` bleibt als
Referenz für die Tests und für den Modus „normales Bingo".

## Phase 2 — Ausgabe zum Drucken ✅ erledigt

- Karten, 4 pro A4-Seite, **nummeriert** — damit der Gastgeber weiß, welche
  Karte wohin gehört. Genau daran scheitert es in der Praxis.
- **Moderatorenblatt**: nicht nur die Ziehungsliste, sondern die Regie —
  „Zahl 47 → alle haben Bingo → jetzt auspacken lassen". Ohne dieses Dokument
  funktioniert der Trick nicht.
- Technisch bevorzugt über Druck-CSS statt einer PDF-Bibliothek: gestochen
  scharfe Vektorschrift, dasselbe Layout wie in der Vorschau, kein zusätzlicher
  Code. Der Nutzer druckt aus dem Browser nach PDF.

## Phase 3 — Website ✅ erledigt bis auf Begriffe-Bingo

Drei Bestandteile, alle statisch:

1. ✅ **Landingpage**, die den Effekt in fünf Sekunden verständlich macht
2. ✅ **Interaktiver Generator**: Gästezahl, Gewinnzeitpunkt, Seed, Regelsatz →
   Live-Vorschau → Druck. Dazu der **Probelauf**: ein Regler durch die ganze
   Ziehung, der live mitzählt, wie viele Karten Bingo haben. Bis zur vorletzten
   Zahl null, dann alle — das überzeugt schneller als jeder Erklärtext und ist
   gleichzeitig die beste Kontrolle vor dem Drucken.
3. ✅ **Ziehungsapp für den Beamer**: große Zahl auf dunklem Grund,
   Trommelwirbel, Tafel mit allen gezogenen Zahlen, Vollbild, Tastatursteuerung.
   Der Plan steckt im Link, sodass das Gerät am Beamer garantiert dieselbe
   Reihenfolge zeigt wie der Ausdruck. Der Regiehinweis für den Moderator ist
   klein und gedeckt — am Rechner lesbar, auf der Projektion nicht.
4. ⬜ **Begriffe-Bingo in der Oberfläche.** Der Kern kann es längst und es ist
   getestet; es fehlt nur die Eingabemaske für die Begriffe.

Gestaltung: festlich und warm, Serifenschrift, Creme mit Gold-Akzent, großzügige
Abstände. Gilt für Website und gedruckte Karten gleichermaßen.

## Phase 4 — Publikation

Siehe [publikation.md](publikation.md).

## Weiterhin offen

- Whitelabel ist erledigt: Der Aufdruck auf den Karten ist standardmäßig aus,
  und die Ziehungsapp zeigt den Produktnamen nirgends.
- Domain sichern: `bingocoup.de` und `coupbingo.com` sahen im DNS-Check frei
  aus. **Das Markenregister ist nicht geprüft** — siehe publikation.md.
- Hosting: GitHub Pages, Netlify oder Vercel
- Kartengröße 3×3 für Kinder ist als Regelsatz `KIDS_3X3` vorhanden und in der
  Oberfläche wählbar; ein eigenes Design dafür fehlt noch.
- Wer produziert das erste Video? Braucht einen echten Anlass.
