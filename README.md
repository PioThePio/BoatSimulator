# Przystań — symulator manewrów motorówką v4

Przeglądarkowy symulator z widokiem z góry. Pięć profili kadłuba (w tym skuter wodny),
zmieniane wymiary i masa, jeden lub dwa silniki do 350 KM każdy,
niezależne/sprzężone pionowe manetki, wiatr, prąd, fale, cumy, kotwica i echosonda.
Nieregularne jezioro 600 × 400 m z większą wyspą i przesmykiem, portem z Y-bomami,
bojami, stacją paliw, pomostami na plaży i wyspie, szuwarami, mieliznami,
drzewami do cumowania, osiadaniem
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
npm run build     # samodzielny dist/index.html, z kodem i stylami w środku
npm run test:production # sprawdzenie gotowego pliku, także bez osobnych zasobów
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
| Wybór manetki klawiaturą | 1 / 2; przyciski dotykowe obsługują każdą manetkę bez wyboru |
| Sprzężenie manetek | T lub przełącznik |
| Obydwa silniki na luz | Spacja lub „Luz” |
| Odbijacze | F lub przełącznik |
| Pauza / nowa próba | P / R lub przyciski |
| Punkt cumowania | Kliknij poler P / Y, boję B lub drzewo D na mapie, następnie wybierz knagę |
| Założenie cumy | Pięć knag; alternatywnie cel z listy i + przy knadze; rzut do 6 m z 35 cm luzu |
| Wybieranie / luzowanie | − / + po założeniu: cel ±0,5 m, wykonywany stopniowo |
| Odczepienie | × przy cumie |
| Rozruch / gaszenie | Zapłon → Start na luzie; 0 wyłącza silnik i zapłon |
| Trym napędu | + / − przy każdej manetce; wskaźnik oraz uniesienie dziobu |
| Strumieniowe | Przytrzymaj ◀ / ▶; Q/E dziób, Z/X rufa; wyposażenie opcjonalne i wymagany zapłon |
| Paliwo | Tankuj przy ⛽, prędkość <0,15 m/s, silniki zgaszone |
| Ślad / łodzie portowe | Przycisk Ślad na mapie / przełącznik w warunkach |
| Kotwica | Ustaw długość rode, „Wydaj”, „Stop”, „Wybierz” |

Koło ma cztery obroty od oporu do oporu. Koło i manetki nie wracają samoczynnie do zera. Silnik ma osobny rzeczywisty
kąt, obroty, naciąg i opóźnienie zmiany biegu. Luz nie hamuje łodzi.
Przy równych przeciwnych manetkach łódź może dryfować podczas obrotu,
bo wsteczny ciąg jest słabszy. W formularzach strzałki obsługują dane pole.

„Zastosuj” po zmianie kadłuba/napędu rozpoczyna nową próbę. Wymiary i moc
są ograniczone zakresem formularza. Masa w podsumowaniu obejmuje silniki
i 150 kg załogi (85 kg na skuterze), masę zbiorników i paliwa. Paliwo zmienia masę, bezwładność i zanurzenie. Zbiorniki: jeden lub dwa, pojemność łączna 10–800 l. Start z 75% paliwa. Pozycja „Przy pomoście” ułatwia ćwiczenie cum, „Jezioro”
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
- `src/systems.js` — zbiorniki, tankowanie, akumulator, ładowanie i strumieniowe.
- `src/cockpit.js` — dotykowe manetki, stacyjki i wskaźniki.
- `src/traffic.js` — zacumowane jednostki, reakcja na środowisko i kolizje.
- `src/rigging.js` — cumy, wysiłek człowieka, kotwica i solver rode.
- `src/world.js` — akwen, wyspa, plaże, drzewa, dno i fale.
- `src/ground.js` — podparcie i tarcie kadłuba, kontakt i uszkodzenia śrub.
- `src/controls.js` — obręcz koła i zatrzaski manetek.
- `src/render.js` — mapa, minimapa, strugi, kil i lokalne ślady ruchu wody.
- `src/main.js`, `src/style.css` — panel i Canvas.
- `tests/` — regresje fizyki oraz przeglądarki.
- `docs/PHYSICS.md` — źródła i jawne założenia modelu.

## Zakres wydania v4 i ładowanie w Chrome

Wydanie v4 dodaje wyposażenie i zmienia fizykę. Zgłoszony problem białego ekranu
na konkretnym urządzeniu użytkownika pozostaje do osobnej diagnozy, zgodnie
z jego prośbą. Poniższe zabezpieczenia pochodzą z v3.0.1.


Publikacja jest pojedynczym `dist/index.html` z osadzonym JS i CSS.
Nie odwołuje się do usuniętych przy aktualizacji plików o starych hashach
i nie wymaga ładowania modułów z osobnych adresów. Cel kompilacji JS: ES2018.
Kod produkcyjny jest uruchamiany po utworzeniu elementu aplikacji.
Komunikat startowy, instrukcja dla wyłączonego JS i diagnostyka błędu
zastępują pusty ekran, a przycisk ponowienia odświeża adres HTML.

Przy starym ekranie z pamięci Chrome otwórz:
`https://piothepio.github.io/BoatSimulator/?v=4.0.0`.
Zrzut białego ekranu nie pozwolił jednoznacznie ustalić przyczyny po stronie
konkretnej przeglądarki; poprawka usuwa zależność od osobnych zasobów
i ujawnia ewentualny błąd uruchomienia.

Testy produkcyjne uruchamiają sam wynik publikacji pod `/BoatSimulator/`,
z brakiem katalogu assets, profilem dotykowym Android Chrome, wyłączonym
JS oraz celowo wywołanym błędem startu. Wdrożenie GitHub Pages wymaga
przejścia tych testów. Test z identyfikatorem Androida nadal korzysta
z Chromium na Linuksie — nie zastępuje sprawdzenia na fizycznym tablecie.
