# RF óraszámok

management.azure.com REST API használatával.

1. Azure CLI-ből nyerjük ki az `access token`-t.
- A parancsot másoljuk az oldalról.
- A link egyből a CLI-t nyitja, vagy jobb fent a terminál gomb.
- Első indításkor tárhely fiók nem kell, válasszuk a Corvinus ISZK előfizetést.
- Adjuk meg a CLI-ben a parancsot, majd másoljuk a token-t.
2. Adjuk meg a token-t a beviteli mezőben.
3. Alapértelmezetten az adott hónapot állítja be a dátum szűrő, de bármilyen dátum megadható. (A vége dátumot érdemes a jelenlegi dátumon hagyni.)
4. Nyomjunk a Go gombra, internetsebességtől függően 1-2 perc alatt töltődnek be az adatok.
- Elég régi API, egyszerre 150 rekordot tud letölteni, így a több ezer rekordot több lekérdezésben tudja lekérni.
