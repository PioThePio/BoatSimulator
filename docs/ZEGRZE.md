# Zegrze — mapa v18, skrócone odległości v20

## Mapa i źródła

Obrys jest interpretacją czterech map przesłanych przez użytkownika, przede
wszystkim atlasu portów z podziałką kilometrową. Zachowano południowy basen,
zachodnie ramię do Dębego, północne do Serocka/Wierzbicy, ujście Bugu,
zatokę Rządzy i wejście do Kanału Żerańskiego. Dawna duża, fikcyjna wyspa
na środku została zastąpiona małymi wyspami przy ujściu Bugu.

Niezależnie sprawdzono 22 października 2026:

- [Publiczny geoportal Zegrza](https://github.com/patrycjamormus/geoportal-zegrze),
  opis źródeł BDOT10k/OSM/ortofotomapy oraz współrzędne centrum i przykładowej
  trasy w `mapa/mapa.js`. Nie skopiowano kodu ani kafelków mapy.
- [GeoNames](https://www.geonames.org/), dane miejscowości dostarczone w
  [geonamescache 3.0.2](https://pypi.org/project/geonamescache/3.0.2/):
  Serock 52.51036, 21.0691; Nieporęt 52.43152, 21.03212;
  Białobrzegi 52.44199, 21.05255; Wieliszew 52.4513, 20.96827.
  Użyto ich do kontroli odległości i położenia nazw. Dane GeoNames:
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Bezpośredni dostęp do Wikipedii i OpenStreetMap zwrócił HTTP 403 polityki
sieci. Pobrana globalna warstwa jezior Natural Earth nie zawierała Zegrza,
więc nie wykorzystano jej do kształtu brzegu. Obrys nie pochodzi z pomiarów
geodezyjnych ani z pobranej, dokładnej geometrii OSM.

## Skala i czas

- Źródłowa podziałka atlasu: **75 pikseli = 1000 rzeczywistych metrów**.
  Na życzenie użytkownika v20 skraca geograficzne odległości do **70%**:
  75 pikseli atlasu daje teraz 700 m symulacji, a świat ma **11,95 × 9,73 km**
  zamiast 17,07 × 13,89 km. Osie x/y mają ten sam współczynnik.
- Interpretowany obrys wody ma około **14,93 km²** po kompresji, wcześniej
  30,47 km². Nie są to pomiary rzeczywistego zbiornika. Odnogi kończą się
  na krawędziach dostarczonej mapy.
- Serock–Nieporęt: **9,12 km rzeczywiście**, około **6,38 km w symulacji**.
  Projekcja współrzędnych geograficznych uwzględnia kompresję i pozostaje odwracalna.
- Kompresja względem punktu (80 m, 4 m) przy głównej kei zachowuje jej położenie.
  Główne pomosty, parking i slip zachowują geometrię; zdalne przystanie przesunięto
  z brzegiem, bez skracania pomostów. Wyspy i obrys jeziora skalują się razem.
- Łódź 5,5 m nadal ma 5,5 jednostki świata. Nie zmieniono mas, prędkości, czasu,
  głębokości ani wymiarów obiektów. Przy 36 km/h kilometr symulacji nadal zajmuje
  100 sekund, ale ta sama przeprawa geograficzna jest o 30% krótsza.
- Zwykłe pomosty zdalnych przystani mają 20–40 m długości i 1,8 m szerokości;
  Y-bomy nadal 25 cm. Główny port zachowuje sprawdzoną geometrię manewrową.
- Podgląd całego akwenu i minimapa mają identyczną skalę osi x/y.
  Przy takim powiększeniu łódź jest naturalnie bardzo mała; znacznik pomaga
  ją odnaleźć. Kliknięcie minimapy uwzględnia marginesy projekcji.

Brzegi i szerokości przesmyków są przybliżone, bo źródłowy atlas jest
mapą poglądową. Mosty odzwierciedlają położenie przepraw w Zegrzu i Wierzbicy;
odwzorowano również zaporę Dębe i most na kanale. Rozpiętości wynikają z tego
obrysu. Przyjęte w modelu prześwity 7,5 / 6,5 / 3,5 m nie zostały potwierdzone
dokumentacją mostów. Głębokości, mielizny, lokalne prądy i porty ćwiczebne
są elementami symulacji, nie rzeczywistą batymetrią ani informacją nawigacyjną.

Dokładne zapytania o najbliższy brzeg wykonuje indeks BVH odcinków, zamiast
rasteryzacji wielokilometrowego jeziora. Nie traci to rozdzielczości kontaktu
małego kadłuba z brzegiem. Rysowanie wektorowe nie tworzy ogromnej tekstury.

## Porty, paliwo i naprawa

Główny port znajduje się przy cyplu Zegrza Północnego. Zachowano istniejące
stanowiska z bojami, pływającymi Y-bomami, parking i slip. Obok slipu jest
osobny pomost serwisowy: cumuje się po jego wschodniej stronie, bez wpływania
między prowadnice przyczepy. Polery są dostępne po obu wodnych stronach
pomostów; ich nazwa pojawia się dopiero po wybraniu.

Naprawa w wodzie wymaga pozostania w stanowisku, przynajmniej jednej cumy
do pomostu serwisu oraz wyłączonych silników i zapłonu. Dopuszcza niewielki
ruch zacumowanej łodzi; naprawia stopniowo i przerywa po odpłynięciu lub
odcumowaniu. Sprawdzono pełne zakończenie naprawy dla motorówki, kabinówki
i jednostki wypornościowej. Dwa stanowiska na parkingu nadal obsługują łodzie
zabezpieczone na przyczepie.

Po przeciwnej stronie, w rejonie Ryni, jest ćwiczebna stacja paliw,
**2,86 km w linii prostej od głównego portu**. Tankowanie wymaga cumy,
postoju i wyłączonego zapłonu. Mniejsze pomosty rozmieszczono w rejonach
Nieporętu, Białobrzegów, Ryni, Serocka, Jachranki, Skubianki, Wieliszewa
i zatoki Rządzy. Nie są kopiami rzeczywistego wyposażenia konkretnych marin.

Nad wodą można przepłynąć pod mostem; kolizje powodują jego fizyczne filary,
nie cała powierzchnia jezdni. Zapora pozostaje zamkniętą przeszkodą.

## Sterowanie, cumy i AUTO

Domyślny zakres skrętu zmieniono z ±35° na **±45°**; wybór 30/35/40/45°
pozostał. Rzeczywisty napęd dochodzi do zadanego położenia z szybkością
0,80 zamiast 0,38 rad/s. Skuter zachowuje dyszę ±28° i szybkość 1,6 rad/s.
Nie zmieniono sił kadłuba, modelu ślizgu, prop walk ani prop wash.
Test porównuje rzeczywisty promień przy 35° i 45°: 45° daje ciaśniejszy łuk
na pełzającym, a ten sam skręt rozszerza łuk po nabraniu prędkości.
Dotychczasowe regresje ostrych zwrotów zachowują jawnie 35°, aby nadal
porównywały ten sam manewr; nowa regresja sprawdza nową wartość domyślną.

Kolor knagi w oknie cum wynika teraz wyłącznie z faktycznego napięcia liny:

| Kolor | Stan |
| --- | --- |
| Biały | Napięcie poniżej 1 N — za luźno |
| Zielony | Napięta, poniżej 20% siły zrywającej — OK do cumowania |
| Brązowy | 20–80% siły zrywającej — za ciasno |
| Czerwony | Co najmniej 80% — granica zerwania |

Ikona, pasek i tekst wskazują ten sam stan. Wybór innego polera nie zmienia
koloru obciążenia. Tło/obramowanie wskazuje aktualnie obsługiwane połączenie.

AUTO wcześniej czekało na 20% całej umownej pojemności zęzy, co oznaczało
dużo wody; dodatkowo decyzja używała poziomu z poprzedniego kroku. Teraz
odczytuje faktyczne litry przed decyzją: start przy `min(15 l, 5% pojemności)`,
stop przy `min(3 l, 1%)`. W kokpicie widać próg oczekiwania i pracę AUTO
oddzielnie od ręcznego ON. Pompa nadal usuwa fizyczną masę wody, wymaga
sprawnego akumulatora i ma ograniczoną wydajność: może nie nadążyć za dużym
przeciekiem. Nie ukryto tej sytuacji zmianą wskazania.

## Interfejs

Nagłówek na telefonie ma 25 px. Koło, napęd i przekrój zanurzenia mieszczą
się obok siebie; wskaźniki są pod nimi, wybór stanowiska poniżej sterowania.
Usunięto powtórzony przycisk startu w nagłówku i przesiadkę na mapie.
Konsola przyczepy, slip i wciągarka są widoczne tylko w SUV-ie.

Górny pasek mapy pokazuje odległość środka pojazdu od naturalnego brzegu,
prędkość względem brzegu, względem wody, kurs i obrót. Kliknięcie przełącza
km/h ↔ kn. Prędkościomierz łodzi stale pokazuje km/h. Wiatr i nurt mają
osobne strzałki; każde wskazanie osobno przełącza m/s ↔ km/h.
Wybrane jednostki są zapisywane lokalnie. W SUV-ie prędkość względem wody
jest pomijana, a widok w R wyprzedza samochód ku tyłowi, w D ku przodowi,
bez zmiany przybliżenia.

## Weryfikacja

Dodano **13 regresji modelu** w `tests/zegrze-v18.test.js`: skala, projekcja,
400 porównań indeksu brzegu z niezależnym obliczeniem, minimapa, dostępność
pomostów, filary mostów, pełna naprawa na wodzie, ograniczenia serwisu
i tankowania, AUTO i przeciążenie pompy, kolory cum, skręt oraz kamera SUV-a.

Dodano **8 prób przeglądarkowych** w `tests/features-v18.spec.js`: układ
telefonu 390 px, jednostki i ich zapis, stacyjka dotykowa, naprawa, etykiety
polerów, zmiana koloru podczas rzeczywistego wybierania cumy, widoczność
paneli przyczepy i kamera renderera. Dawne testy plaży/wyspy/przesmyku używają
nowych miejsc; test kontaktu śruby nie zakłada, że dotknięcie dziobem dna
oznacza też dotknięcie śrubą przy unoszącej się rufie.

Sprawdzenia wydania: `npm test`, `npm run test:e2e`,
`npm run test:production`. Ta ostatnia grupa uruchamia samodzielny HTML
pod ścieżką Pages, również z emulacją Android Chrome, oraz diagnostykę
błędów startu i wyłączonego JavaScript.

Wynik lokalnej weryfikacji wydania: **219/219 testów modelu,
82/82 testów interfejsu, 5/5 testów produkcyjnego HTML**; build zakończony
poprawnie. Obejrzano również układ 390 px z dwoma silnikami, SUV-a przy
1153 px i podgląd całego jeziora. Nie testowano na fizycznym telefonie.
