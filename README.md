# Bingo Coup

Bingo, bei dem **alle Gäste gleichzeitig gewinnen**.

Das Spiel läuft für alle sichtbar normal ab: echte Karten, ein Moderator, der
Zahlen vorliest. Nur ist die Ziehungsreihenfolge vorher festgelegt und jede
Karte so gebaut, dass sie genau bei einer bestimmten Ziehung Bingo hat — bei
derselben für alle. In den letzten Runden merkt nach und nach jeder im Raum,
dass ihm nur noch eine Zahl fehlt. Dann fällt sie, und der ganze Saal springt
gleichzeitig auf.

Gedacht für Familienfeiern: Goldene Hochzeit, Hochzeit, Kindergeburtstag,
Firmenfeier. Niemand wird bevorzugt, es gibt keinen Verlierer — der „Preis" ist
etwas, das ohnehin für alle da ist.

**Nicht** gedacht für Verlosungen mit Geldeinsatz.

## Stand

Kernlogik und Tests stehen. Die Website mit Generator, Druckansicht und
Ziehungsapp ist in Arbeit — siehe [docs/roadmap.md](docs/roadmap.md).

## Ausprobieren

```bash
npm install
npm test                       # 80 Tests
npx tsx scripts/demo.ts 60 25  # Spielplan für 60 Gäste, Bingo bei Ziehung 26
```

## Wie es funktioniert

```ts
import { generatePlan } from './src/core/index.js'

const plan = generatePlan({
  cardCount: 60,   // Gäste
  winAt: 25,       // Bingo bei der 26. Ziehung (0-basiert)
  seed: 20260906,  // gleicher Seed = exakt dieselben Karten
})

plan.drawOrder    // in genau dieser Reihenfolge vorlesen
plan.winningItem  // diese Zahl löst den ganzen Saal aus
plan.cards        // eine Karte je Gast
```

Standard sind die klassischen Regeln: 5×5, Zahlen 1–75, B-I-N-G-O-Spalten,
freies Mittelfeld. Statt Zahlen gehen auch Begriffe („Onkel Werner hält eine zu
lange Rede") — dann ist die Ziehung der Ablauf des Abends.

## Herkunft

`Bingo.py` ist der ursprüngliche Prototyp aus dem Jahr 2011, gebaut für eine
Goldene Hochzeit. Er liegt unverändert im Repo.

## Lizenz

MIT
