# Równoległy rozwój Canvas i WebGL

## Co jest przygotowane

- `main`: aktualna stabilna aplikacja Canvas, działająca pod dotychczasowym publicznym adresem.
- `experimental/webgl`: niezależna gałąź dla prac nad PixiJS/WebGL, oparta na tej samej bazie kodu i zapisie sesji.
- Dwa katalogi robocze pozwalają jednocześnie edytować i uruchamiać obie gałęzie.
- Oddzielne porty deweloperskie i produkcyjne zapobiegają pomyleniu aplikacji w testach oraz rozdzielają lokalne dane przeglądarki.
- Gałąź eksperymentalna ma własne sprawdzenia CI. Nie publikuje niczego pod adresem wersji stabilnej, także po ręcznym uruchomieniu odziedziczonego workflow publikacji.

**Renderer w tej gałęzi jest jeszcze oparty na Canvas. Samo utworzenie odnogi nie wdraża WebGL ani nie poprawia wydajności.** PixiJS nie jest jeszcze zależnością projektu. To gotowa baza do oddzielnej migracji i pomiarów porównawczych.

## Uruchamianie i sprawdzenia

W każdym katalogu wykonaj osobne `npm ci`. Jeśli katalog domowy środowiska chmurowego jest tylko do odczytu, użyj `npm ci --cache /tmp/boat-webgl-npm-cache`. Nie współdziel `node_modules` symlinkiem: przyszłe zależności nowego renderera nie powinny zmieniać środowiska wersji stabilnej.

| Wersja | Katalog w tym środowisku | Serwer `npm run dev` | Test gotowego HTML |
| --- | --- | --- | --- |
| Stabilna Canvas | `/workspace/BoatSimulator` | `http://localhost:5173` | port 4174 |
| Eksperymentalna | `/workspace/BoatSimulator-webgl` | `http://localhost:5174` | port 4175 |

Polecenia w gałęzi eksperymentalnej:

```sh
npm ci
npm run dev
npm test
npm run test:e2e
npm run test:production
npm run benchmark:browser -- --cpu=4 --seconds=10
```

Konfiguracja testów i narzędzi do zrzutów wskazuje port tej gałęzi. Dane pod `localhost:5173` i `localhost:5174` są odrębne; rozpoczęcie próby w eksperymencie nie nadpisuje stabilnej sesji. Używaj konsekwentnie tej samej nazwy hosta — `localhost` i `127.0.0.1` również mają oddzielne dane.

Jeżeli projekt jest pobierany od nowa, dwie kopie robocze można utworzyć tak:

```sh
git clone https://github.com/PioThePio/BoatSimulator.git
cd BoatSimulator
git worktree add ../BoatSimulator-webgl experimental/webgl
```

## Przenoszenie zmian między gałęziami

Gałęzie mają wspólnego przodka, ale nie synchronizują się automatycznie. Ulepszenia stabilnej wersji wprowadzamy na `main`, a następnie włączamy przez `git merge origin/main` w gałęzi eksperymentalnej. Zmiany renderera pozostają w eksperymencie. Przy scalaniu trzeba zachować eksperymentalne porty, oznaczenie gałęzi i brak publikacji do stabilnego adresu.

Poprawki wspólnej fizyki, mapy lub zapisu powinny mieć oddzielne commity od zmian renderera. Pozwala to przenieść konkretną poprawkę przez `git cherry-pick`, bez kopiowania całych plików i bez przenoszenia nowego renderera do wersji stabilnej. Po integracji wykonujemy odpowiednie regresje; konflikty rozwiązujemy w kodzie, nie przez reset gałęzi.

## Kolejność dalszych prac

1. Zbudować powtarzalny benchmark jednej łodzi podczas pływania, manewrów w porcie i generowania fal. Osobno mierzyć fizykę, rysowanie, panele oraz dłuższą sesję z autozapisem.
2. Usunąć potwierdzone nadmiarowe obliczenia wspólnego modelu. Zachować czas i zachowanie fizyki; sam nowy renderer nie naprawi przeciążonej pętli obliczeń.
3. Wydzielić interfejs renderera: stan świata i kamera na wejściu; obraz oraz przeliczenie kliknięć na wyjściu. Renderowanie nie może zmieniać fizyki ani formatu zapisu.
4. Podpiąć PixiJS/WebGL przy zachowaniu Canvas jako punktu odniesienia. Porównywać identyczne scenariusze, mapę, skalę, kolejność warstw, hit-testing oraz czasy klatek.
5. Dodać publiczny, osobny adres demonstracyjny. Przed publikacją pod ścieżką tej samej domeny rozdzielić wszystkie klucze localStorage, historię cofnięć i Logbook: same różne ścieżki URL nie izolują danych.

Nowy publiczny adres nie został jeszcze uruchomiony. Zapisów nie należy przenosić w obie strony automatycznie: ewentualny import musi kopiować dane i zachować oryginał, a zgodność schematu należy sprawdzać testami.
