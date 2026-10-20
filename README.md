# Przystań — symulator manewrów motorówką v3

Przeglądarkowy symulator z widokiem z góry. Cztery profile kadłuba,
zmieniane wymiary i masa, jeden lub dwa silniki o wybieranej mocy,
niezależne/sprzężone pionowe manetki, wiatr, prąd, fale, cumy, kotwica i echosonda.
Jezioro 600 × 400 m z wyspą, plażami, drzewami do cumowania, osiadaniem
kadłuba na dnie i osobnymi uszkodzeniami każdej śruby.
Bez kont i backendu. Aplikacja nie pobiera zewnętrznych zasobów w czasie działania.

**Model szkoleniowy, bez kalibracji dla konkretnego kadłuba.**
[Podstawy, źródła, wzory, liczby kontrolne i ograniczenia](docs/PHYSICS.md).

## Uruchomienie

Node.js 20.19+ (zalecane 24), npm:

```sh
npm ci --cache /tmp/boat-npm-cache
npm run dev
```

Otwórz port Vite (domyślnie 5173). `npm run build` tworzy statyczny katalog
`dist`. Względne adresy zasobów działają także pod `/BoatSimulator/`.
Nie otwieraj źródłowego HTML przez `file://`.

```sh
npm test           # testy fizyki i regresji manewrów
npm run test:e2e   # rzeczywiste sterowanie w Chromium
npm run build     # wersja produkcyjna
```

E2E używa `/usr/bin/chromium`, alternatywę wskaż przez `CHROMIUM_PATH`.
Playwright uruchamia Vite lub używa działającego serwera na 5173.
Push do `main` uruchamia `.github/workflows/pages.yml` i publikację Pages.
Repozytorium musi mieć aktywne Settings → Pages → Source: GitHub Actions.

## Obsługa

| Działanie | Klawiatura / mysz |
| --- | --- |
| Koło | A/D lub ←/→, chwyt obręczy i prowadzenie po łuku |
| Wyprostuj | C lub przycisk |
| Wybrana manetka | Krótko W/S lub ↑/↓: bieg pełzający / luz; przytrzymanie: płynna zmiana gazu; pionowa dźwignia |
| Wybór lewego/prawego silnika | 1 / 2 lub przyciski |
| Sprzężenie manetek | T lub przełącznik |
| Obydwa silniki na luz | Spacja lub „Luz” |
| Odbijacze | F lub przełącznik |
| Pauza / nowa próba | P / R lub przyciski |
| Punkt cumowania | Wybierz knagę, kliknij poler P lub drzewo D na mapie albo wybierz z listy |
| Założenie cumy | + przy odpowiedniej knadze; rzut do 6 m |
| Wybieranie / luzowanie | − / + po założeniu: cel ±0,5 m, wykonywany stopniowo |
| Odczepienie | × przy cumie |
| Kotwica | Ustaw długość rode, „Wydaj”, „Stop”, „Wybierz” |

Koło i manetki nie wracają samoczynnie do zera. Silnik ma osobny rzeczywisty
kąt, obroty, naciąg i opóźnienie zmiany biegu. Luz nie hamuje łodzi.
Przy równych przeciwnych manetkach łódź może dryfować podczas obrotu,
bo wsteczny ciąg jest słabszy. W formularzach strzałki obsługują dane pole.

„Zastosuj” po zmianie kadłuba/napędu rozpoczyna nową próbę. Wymiary i moc
są ograniczone zakresem formularza. Masa w podsumowaniu obejmuje silniki
i 150 kg załogi. Pozycja „Przy pomoście” ułatwia ćwiczenie cum, „Jezioro”
próbę napędu. Akwen ma 600 × 400 m. Przycisk „Cały akwen” pokazuje wyspę i plaże,
kliknięcie minimapy przesuwa widok, ◎ przywraca śledzenie łodzi.
Pozycje „Plaża” i „Wyspa” ułatwiają próby cumowania do brzegu.

Przy ręcznym wybieraniu naciąg ogranicza dostępna siła: 220 N, 40 W,
do 0,18 m/s. Knaga może utrzymać większy naciąg, ale ręka go nie wybierze.
Luzowanie odbywa się do 0,30 m/s. Echosonda pokazuje zmienne dno pod rufą
i historię, prześwit pod stępką to minimum dla całej długości kadłuba.
Brzeg stopniowo się wypłyca. Kadłub może oprzeć się na piasku i wyhamować,
a śruba (sięgająca niżej) może ucierpieć wcześniej. Kamienie są znacznie
groźniejsze niż piasek. Stan obu śrub jest widoczny osobno. „Podnieś napędy”
wyłącza ciąg i pozwala podpłynąć dryfem tam, gdzie mieści się sam kadłub.

Kotwica jest wydawana stopniowo, opada, osadza się i może wlec lub zerwać
rode. Winda ma limit 2,2 kN / 650 W, wybiera do 0,35 m/s. Przewiduje
obciążenie przed skróceniem łańcucha i przechodzi przez fazę oderwania
kotwicy od dna. Przy przeciążeniu trzeba podpłynąć w kierunku kotwicy. Łańcuch ma ciężar, lina sprężystość, a profil
pokazuje zwis i odcinek na dnie. To przybliżenie quasi-statyczne, nie pełna
dynamika poszczególnych ogniw. Nie istnieje automatyczne „przyciągnij łódź”.

Kierunki wiatru/prądu/fali oznaczają **dokąd**, a nie meteorologiczne „skąd”.
Wysokość fali może zależeć od wiatru albo być ustawiona ręcznie.
Kołysanie i przegłębienie są widoczne i mierzone. Parametry nie są prognozą
falowania prawdziwego jeziora.

## Pliki

- `src/physics.js` — dynamika kadłuba, kolizje i całkowanie.
- `src/craft.js` — profile, masa i napęd.
- `src/rigging.js` — cumy, wysiłek człowieka, kotwica i solver rode.
- `src/world.js` — akwen, wyspa, plaże, drzewa, dno i fale.
- `src/ground.js` — podparcie i tarcie kadłuba, kontakt i uszkodzenia śrub.
- `src/controls.js` — obręcz koła i zatrzaski manetek.
- `src/render.js` — mapa, minimapa, strugi, kil i lokalne ślady ruchu wody.
- `src/main.js`, `src/style.css` — panel i Canvas.
- `tests/` — regresje fizyki oraz przeglądarki.
- `docs/PHYSICS.md` — źródła i jawne założenia modelu.
