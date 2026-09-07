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

Vollständig benutzbar: Generator, Druckausgabe und Ziehungsapp für den Beamer.
Offen ist Begriffe-Bingo in der Oberfläche — siehe
[docs/roadmap.md](docs/roadmap.md).

## Ausprobieren

```bash
npm install
npm run dev        # Website unter http://localhost:5173
```

Im Probelauf zieht man den Regler durch die Ziehung und sieht, wie bis zur
vorletzten Zahl niemand Bingo hat — und dann alle auf einmal.

Für den Abend selbst führt „Ziehung am Beamer starten" in die Vollbildansicht:
große Zahl, Trommelwirbel, Tafel mit allen gezogenen Zahlen. Der Link dorthin
enthält den ganzen Plan — man kann ihn auf das Gerät am Beamer schicken und
bekommt dort garantiert dieselbe Reihenfolge wie auf dem Ausdruck.

Bedienung: Leertaste oder Klick zieht, Pfeil links nimmt zurück, `F` schaltet
Vollbild, `Esc` führt zurück zum Generator.

```bash
npm test           # 91 Unit-Tests
npm run test:e2e   # 17 Playwright-Tests der Oberfläche
npm run demo 60 25 # Spielplan im Terminal, ohne Browser
npm run range      # welche Gewinnzeitpunkte tragen 80 Gäste?
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
