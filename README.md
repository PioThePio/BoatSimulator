# Przystań — symulator manewrów motorówką v10

Przeglądarkowy symulator z widokiem z góry, bez kont i backendu. Pięć rodzajów
łodzi, w tym skuter, zmieniane wymiary i masa, jeden lub dwa silniki do 350 KM.
Nieregularne jezioro 600 × 400 m, wyspa z przesmykiem, plaże, mielizny,
szuwary, port ze stanowiskami z bojami i ruchomymi Y-bomami szerokości 25 cm.

Uruchom: **https://piothepio.github.io/BoatSimulator/?v=10.0.0**.

Model służy do poznawania zależności w manewrach; nie jest skalibrowany dla
konkretnej łodzi. [Źródła, równania i ograniczenia](docs/PHYSICS.md).

## Uruchomienie lokalne

Node.js 20.19+ (zalecane 24), npm:

```sh
npm ci --cache /tmp/boat-npm-cache
npm run dev
npm test
npm run test:e2e
npm run test:production
```

Vite działa domyślnie na porcie 5173. Playwright używa `/usr/bin/chromium`;
inną przeglądarkę wskaż przez `CHROMIUM_PATH`. `npm run build` tworzy jeden
samodzielny `dist/index.html`, z JS i CSS w środku. Nie otwieraj źródłowego
HTML przez `file://`. Push do `main` uruchamia testy i publikację Pages.

## Obsługa

Na początku wybierz łódź, wyposażenie, **miejsce startu** i pogodę.
„Rozpocznij rejs” rozpoczyna próbę z wyłączonymi silnikami. „Nowa próba”,
klawisz R i przycisk „Łódź i start” otwierają ten sam formularz, zachowując
wcześniejsze wybory. Zamknięcie okna bez rozpoczęcia nie resetuje rejsu.
Pogodę podczas pływania zmieniaj pod ikoną **☀ na mapie**.
Formularze łodzi i pogody są w oknach; pod konsolą pozostają cumy i kotwica.
Stan kadłuba, pomostu i śrub jest w kokpicie pod schematem uniesienia dziobu.
Obok schematu widać zanurzenie kadłuba w spoczynku z aktualnym paliwem
oraz bieżący prześwit pod stępką. Ten drugi uwzględnia przechył, kołysanie
i dno pod całym kadłubem; ostrzega poniżej 20 cm i pokazuje osiadanie.
Śruba może sięgać głębiej — jej osobny odczyt pozostaje nad tymi wartościami.
Mapa kontaktów pokazuje trafioną część kadłuba lub odbijacz: zielony kontakt,
pomarańczowe uszkodzenie, czerwone silne uderzenie. Błysk zanika, ślad szkody zostaje.
Uszkodzenia są zawsze aktywne.

| Działanie | Obsługa |
| --- | --- |
| Koło | A/D lub ←/→; chwyt obręczy albo pola między ramionami poza piastą, prowadzenie po łuku |
| Pozycja napędu | Pasek L–P nad kołem: zielony znacznik rzeczywistego kąta, cienki złoty — pozycja zadana |
| Wyprostuj | C lub przycisk |
| Manetka | Krótko W/S lub ↑/↓: pełzający/luz, przytrzymanie: płynny gaz; pionowa dźwignia i ▲ / N / ▼ |
| Wybór silnika | 1/2 lub kliknięcie manetki; T spina/rozdziela manetki |
| Obydwa silniki na luz | Spacja lub N |
| Stacyjka | W prawo 0 → I → START, na luzie; w lewo I → 0, silnik i zapłon wyłączone |
| Trym | ▲/▼ wspólnie dla obu silników, 0–40% co 5 punktów, dalej co 10; przyciski pokazują cel, wskaźnik aktualną pozycję |
| Strumieniowe | Przytrzymaj ◀/▶; Q/E dziób, Z/X rufa; wymagają wyposażenia i zapłonu |
| Odbijacze / pauza | F / P lub przełączniki |
| Cumy | Kliknij poler P/Y, boję B lub drzewo D, następnie knagę na rysunku; przytrzymaj − / +, aby wybierać/luzować, × odpina |
| Kotwica | Kliknij dziób lub ⚓; zadana długość i Wydaj/Stop/Wybierz, również w dolnym panelu |
| Okna na mapie | Przesuwanie za nagłówek myszą/dotykiem; także strzałkami po ustawieniu fokusu na nagłówku |
| Tankowanie | Burtą przy ⛽, co najmniej jedna cuma do stanowiska, prędkość <0,15 m/s, silniki i zapłon wyłączone |
| Dźwięk | Przełącznik i głośność w konsoli; uruchamia się po dotknięciu ekranu, wycisza na pauzie |
| Widok | ◎ centruje łódź, minimapa przesuwa widok, „Cały akwen” pokazuje jezioro, „Ślad” przełącza linię trasy |

Skok koła między oporami: otwarta 1,5 obrotu, motorówka 2,5, kabinowa 3,
wypornościowa 3,5; skuter tylko 90°. Koło nie wraca do zera. Zaburtowy ma
domyślnie ±35°, z wyborem ±30/35/40/45° w menu; dysza skutera ±28°.
Klawiatura szybciej zmienia manetkę po przytrzymaniu: pełny zakres w około
1,3 s, na skuterze około 0,95 s. Krótkie naciśnięcie nadal wybiera pełzający.
Strzałki po ustawieniu fokusu na stacyjce sterują łodzią; stacyjka nie zmienia pozycji. Manetki też pozostają
w zadanej pozycji. Dwa silniki mają osobne obrotomierze, obciążenie i ciąg.
Wsteczny ciąg jest słabszy, a zmiana biegu wymaga czasu. Luz pozwala płynąć
bezwładnością; zanurzony zaburtowy nadal reaguje na przepływ wody.

## Dźwięk i pogoda

Proste syntezowane dźwięki: stacyjka, rozrusznik, osobna praca i obroty silników,
przełączenie manetki i przekładni, fale, opływ/ślizg, strumieniowe, tankowanie,
uderzenia i pęknięcie cumy. Web Audio nie pobiera plików. Pierwsze dotknięcie
odblokowuje dźwięk; głośność i wyciszenie są zapamiętywane na urządzeniu.
Pauza, menu startowe i utrata aktywności karty wyciszają symulację.

Pod **☀ Pogoda** siłę wiatru i prądu ustawiasz dwoma uchwytami na jednym
suwaku: MIN–MAX. Równe wartości oznaczają stałą siłę; przycisk „Ustaw stały”
zrównuje je z maksimum. Osobny suwak **±0–90°** ustawia zmienność kierunku.
Wartości zmieniają się płynnie, niezależnie dla wiatru i prądu. Fale mogą
zależeć od aktualnej siły wiatru albo mieć ręcznie ustawioną wysokość.

Tankowanie odbywa się przy oznaczonym odcinku pomostu z pięcioma stałymi
odbijaczami. Odpięcie ostatniej cumy, odpłynięcie lub włączenie silnika
przerywa tankowanie. Usunięto przełącznik podnoszenia napędu; służy do tego trym.

## Trym, płycizna i wskaźniki

0–40% to umowny **roboczy zakres trymu**: −4° do +12°. Przy ruszaniu,
wchodzeniu w ślizg i wolnych manewrach zwykle używa się niskiej pozycji.
W ślizgu umiarkowane podniesienie może zmniejszyć opór. Powyżej 40% zaczyna
się podnoszenie napędu (tilt), do 78° przy 100%. Konkretne silniki mają
własne ograniczenia pracy w tym zakresie — nasza skala jest przybliżeniem.

Położenie śruby uwzględnia kąt, długość kolumny, przegłębienie, przechył,
kołysanie i lokalne dno. Częściowo podniesiony, zanurzony napęd może pomóc
wycofać łódź z piasku. Kontakt z kamieniami jest groźniejszy niż z piaskiem.
Śruba wynurzona nie wytwarza ciągu; utrata zanurzenia wlotu ogranicza
chłodzenie. Schemat pokazuje wodę, śrubę i płytkie dno, a napis sygnalizuje
kontakt. Duży trym przy prędkości może powodować wentylację i utratę ciągu.

Wskaźniki mają ikony i kolorowe zakresy. Paliwo: E–F, rezerwa poniżej 10%
i spalanie w L/h. Temperatura: umowny roboczy zakres 64–95°C, ostrzeganie
95–105°C, alarm od 105°C. Napięcie: ostrzeganie poniżej 11,5 V i powyżej
14,8 V oraz informacja o ładowaniu. Paliwo zmienia masę, bezwładność i
zanurzenie; jeden lub dwa zbiorniki, razem 10–800 l, start z 75% paliwa.

## Cumy i kotwica

Rzut cumy do 6 m pozostawia 35 cm luzu, bez przyciągania łodzi. Ręczne
wybieranie działa tylko podczas przytrzymania: siła rośnie od 120 do 450 N,
moc do 65 W i prędkość do 0,18 m/s; luzowanie do 0,3 m/s. Puszczenie
zatrzymuje zmianę długości. Kilka lin dzieli siłę jednej osoby. Wiatr, prąd
i silnik mogą nadal przeciążyć i zerwać cumę. Przy silnym prądzie potrzebny
uciąg może przekroczyć siłę ręki i zamontowanych strumieniowych.
Cumy zaparkowanych jednostek łączą rzeczywiste knagi i polery, reagują na
wiatr/prąd i pozwalają na ograniczony obrót. Y-bomy reagują na kontakt i cumy.

Okno kotwicy sugeruje orientacyjnie **5:1**, a przy silniejszym wietrze,
prądzie lub fali **7:1**, od dna do rolki dziobowej. Uwzględnia dostępny
zapas i ostrzega, jeżeli jest za krótki. Sugestia nie gwarantuje trzymania;
znaczenie ma też dno, typ kotwicy i przestrzeń do obrotu łodzi. 3:1 nie
jest uniwersalną regułą dla połączenia łańcucha z liną.

Kotwica ma ciężki łańcuch i lekką linę, zwis, osadzenie i wleczenie.
Winda: wydawanie do 0,65 m/s, wybieranie do 0,35 m/s / 650 W / 2,2 kN.
Przeciążenie może wymagać podpłynięcia nad kotwicę. Nie ma automatycznego
„przyciągnij łódź”. Dolny panel pokazuje skrócony profil rode.

## Model i sprawdzanie

Zaburtowe od **150 KM każdy** mają głębsze, syntetyczne brzmienie w stylu
V8. Mniejsze silniki i skuter zachowują wyższy, brzęczący ton; dwa silniki
90 KM nie zmieniają się w jeden duży. To wybór barwy, a nie deklaracja
liczby cylindrów rzeczywistego silnika danej mocy. Dotychczasowy szum
płynięcia pozostaje. Osobno słychać bulgot przy hamowaniu przeciwnym
biegiem oraz napowietrzaniu/podnoszeniu pracującej śruby; po pełnym
wynurzeniu ustaje podwodny bulgot.

Obciążenie napędu uwzględnia kierunek napływu na śrubę, rzeczywisty
przepływ poprzeczny w zakręcie i spotykaną falę. Nowe obciążenie lekko
obniża obroty wału, zmienia ciąg i barwę wydechu; regulator odzyskuje
część obrotów. Napowietrzenie odwrotnie: odciąża śrubę, obroty mogą wzrosnąć,
a ciąg spada. Zakręt lub fala nie oznaczają zawsze spadku RPM — zależy
to również od gazu, prędkości i zanurzenia napędu.

W ostrym zakręcie rufa traci część przyczepności bocznej, a lokalne siły
kadłuba, ciąg silnika i masa wyznaczają tor. Przy tej samej prędkości wejścia
słaby silnik traci ślizg, mocniejszy może utrzymać ciaśniejszy zwrot w ślizgu.
Skuter ma szybszą reakcję pompy i inny uślizg. Odjęcie gazu zmniejsza ciąg,
łódź zwalnia, zwiększa zanurzenie i nadal płynie przy pozostawionym biegu.

Kilwater V jest wspólny dla rysunku i fizyki: przez maksymalnie 28 s
rozchodzi się z przebytej trasy, dryfuje z prądem i zanika. Wpłynięcie na
własną falę zmienia kołysanie, pochylenie i zanurzenie napędu. To uproszczony
model pakietów falowych, bez pełnej hydrodynamiki powierzchniowej.
Kamera łagodnie oddala widok przy szybszym płynięciu.

W `tests/` są regresje rozruchu, przyspieszenia, pełzania, hamowania w
zakręcie, dryfu, masy/paliwa, trymu i zejścia z płycizny, cum, kotwicy,
fal, przedziałów pogody, sygnału audio oraz obsługi okien myszą i dotykiem. [Opis fizyki](docs/PHYSICS.md)
odróżnia teoretyczną strukturę modelu od naszych umownych współczynników.

Najważniejsze moduły: `physics.js` i `hydrodynamics.js` — ruch i opory;
`drive.js` — geometria trymu i sugestia rode; `instruments.js` — wskaźniki
i schemat; `impacts.js` i `contact-instrument.js` — kontakt i mapa uszkodzeń;
`wake.js` — fizyczny i widoczny kilwater V; `rigging.js` — cumy i kotwica; `marina.js`
i `traffic.js` — Y-bomy i zacumowane jednostki; `thermal.js` — chłodzenie.

Zgłoszony wcześniej biały ekran na fizycznym urządzeniu Chrome pozostaje
oddzielnym zgłoszeniem. Testy produkcyjne sprawdzają plik pod ścieżką Pages,
profil dotykowy z identyfikatorem Androida, brak osobnych zasobów,
wyłączony JS i diagnostykę błędu startu. Używają Chromium na Linuksie;
nie zastępują próby na konkretnym tablecie.
