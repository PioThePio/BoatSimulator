# Przystań — symulator manewrów motorówką v19

Przeglądarkowy symulator z widokiem z góry, bez kont i backendu. Osiem rodzajów
łodzi, w tym skuter, zmieniane wymiary i masa, jeden lub dwa silniki do 350 KM.
Mapa wzorowana na Jeziorze Zegrzyńskim: obszar 17 × 14 km, ramiona Narwi
i Bugu, zatoki, mosty, plaże i przystanie. Port ze slipem, serwisem,
stanowiskami z bojami i ruchomymi Y-bomami szerokości 25 cm.

Uruchom: **https://piothepio.github.io/BoatSimulator/?v=19.0.0**.

Model służy do poznawania zależności w manewrach; nie jest skalibrowany dla
konkretnej łodzi. [Źródła, równania i ograniczenia](docs/PHYSICS.md).

## Zmiany v19 — poprawki zgłoszonych manewrów

- Naprawa przy cumie do pomostów obok slipu, po obu dostępnych stronach;
  przycisk na mapie. Zniknął warunek całego kadłuba w wąskim prostokącie.
- Koło, napęd, zegary i panel informacji w jednym rzędzie. Pompa przy napędzie,
  woda w zęzie po prawej; ON pokazuje także faktyczną pracę AUTO.
- Szkody zależą od energii; solver nie nalicza powtórnie tego samego kontaktu
  ani nie niszczy automatycznie łodzi przy 1,5 m/s.
- Ładowanie z płytszego startu, prowadzenie częściowo pływającej rufy,
  wciągarka i pasy dopuszczone na suchych podporach. Cały cykl ma regresję.
- Kamera SUV-a obejmuje zestaw i przesuwa się lekko tylko według biegu;
  łódź ma wyraźniejsze płynne oddalanie przy prędkości i powrót po zwolnieniu.
- Marker łodzi na całym akwenie, lokalna minimapa 3,5 km, rozdzielone napisy
  i nazwa jeziora na górze z informacją o okolicy.
- Napędy przypisane do typów łodzi, mocniejszy airboat przy pełnym skręcie,
  czytelny osobny ster wału. Usunięty wybór maksymalnego skrętu z menu.
- Delikatna woda na jałowym, kotłowanie pod obciążeniem, ślady prądu i wiatru,
  rozróżnienie plaży od wody, bezpieczny start przy wyspie i zalewanie/zatapianie.
- [Opis przyczyn, parametrów, konfiguracji napędów i regresji v19](docs/FIXES_V19.md).

## Zmiany v18 — Zegrze i obsługa na telefonie

- Kilometrowa skala jeziora, pomosty w ośmiu rejonach, mosty i paliwo na przeciwległym brzegu.
- Osobny pomost naprawczy obok slipu; naprawa przy cumie i wyłączonym zapłonie.
- Domyślny skręt 45°, szybsze dochodzenie napędu do zadanej pozycji; dysza skutera pozostaje 28°.
- Koło, napęd i zanurzenie obok siebie również na telefonie. Minimalny nagłówek,
  wybór stanowiska pod sterowaniem i panele przyczepy tylko w SUV-ie.
- Odległość od brzegu i oba rodzaje prędkości u góry mapy. Kliknięcie paska: km/h ↔ kn;
  osobne przełączanie jednostek wiatru i nurtu. Licznik łodzi pokazuje km/h.
- Kolory knag oznaczają napięcie cum; AUTO odpompowuje już od około 15 l.
- Kamera SUV-a pokazuje więcej za zestawem na R i przed nim na D.
- [Źródła mapy, kontrola skali i opis testów v18](docs/ZEGRZE.md).

## Zmiany v17 — audyt fizyki

- Osobny Z-drive ze skrętem i trymem; wał z osobnym sterem pozostaje odrębnym napędem.
- Ciąg po wentylacji wraca płynnie; zapowietrzenie wlotu waterjetu ma konsekwencje fizyczne.
- Płaski parking i ciągłe brzegi wjazdu na slip; krawężnik 7 cm z fizyką najazdu.
- Siły od nachylenia działają pod osiami. Wyższe opory trawy i piasku, poprawione materiały podłoża.
- Prowadnice reagują na kontakt, pasy zachowują osiągniętą pozycję łodzi zamiast ją centrować.
- Zamiast strzałek przy kadłubie ukośne zmarszczki od prędkości względem wody; napędy oznaczone kreskami.
- Uporządkowany wybór napędu/silników, załoga i wyposażenie na końcu menu.
- [Pełny raport, konfiguracje domyślne i lista testów](docs/AUDIT_V17.md), [surowe pomiary](docs/audit-v17-results.json).

## Zmiany v16

- Podpory przyczepy mają tarcie, kolebkę V i fizyczne prowadzenie opartego
  kadłuba. Parking jest poziomy. Pasy można zwolnić przed zjazdem do wody;
  łódź pozostaje stabilna przy spokojnej jeździe i hamowaniu.
- Osobna wciągarka dziobowa z ograniczonym uciągiem, mocą, liną i hamulcem.
  Wciąga także na suchych podporach. Oddzielny, miękki odbojnik dziobowy;
  wspornik z polerem i wciągarką stoi dalej z przodu.
- Załadunek oceniany za osiowość, tor i zatrzymanie, z potrąceniem za szkody.
  Zapinanie pasów działa także przy pracującym silniku łodzi.
- SUV wyciąga pustą przyczepę dwuosiową z domyślnego mokrego slipu.
  Poślizg nadal zależy od ciężaru, głębokości, rampy i 4×4; ma osobny dźwięk.
  Rzeczywiste osie przyczepy przesunięto do tyłu, wraz z geometrią i oponami.
- Dwa stanowiska serwisu od strony parkingu, piasek poza placem,
  uporządkowane miejsca postojowe i wolny dojazd do slipu.
- Menu szybkości kierownicy, osobno dla SUV-a i łodzi: działa na żywo
  i zapisuje ustawienia. Pod kierownicą SUV-a widoczne pochylenie zestawu.
- Osobne strzałki wiatru i prądu. Woda nie oddziałuje ani nie animuje się
  na suchym lądzie; strzałki przy kadłubie pokazują dryf względem brzegu.
- Kolor knagi nadal oznacza punkt połączenia. Osobny wskaźnik pokazuje
  napięcie cumy; model łagodniej przechodzi przez moment wybierania luzu.
- Swamp boat: płaski kadłub, śmigło powietrzne, stery w strumieniu powietrza,
  wyraźny poślizg boczny, brak trymu, podwodnej śruby i wstecznego biegu.
  Na piasku uwzględniono łagodniejszy kontakt kadłubów płaskiego i RIB;
  kontakt z kamieniami nadal jest groźny. Silniejsze kołysanie zacumowanych łodzi
  wynika z dynamiki fal i cum, bez losowego obracania modeli.

## Zmiany v15

- Podpinanie przyczepy po podjechaniu hakiem: odległość i kąt w konsoli,
  znaczniki na mapie, przechwycenie w zasięgu 80 cm / 34°. Reset SUV-a
  przenosi go na parking bez zerowania rejsu, paliwa ani uszkodzeń łodzi.
  Zapięty, zabezpieczony ładunek wraca z zestawem; odczepiona przyczepa zostaje.
- Jeden przycisk pasów przy napędzie, małe początkowe złożenie zestawu,
  wspólna skala mapy przy przesiadaniu, prąd pod wskaźnikiem wiatru.
- Oddzielny rozrusznik SUV-a, bez klikania przy wciskaniu gazu.
- Pojedyncza śruba ma boczny efekt na wstecznym. Napęd zaburtowy skręca
  ciągiem od postoju; stacjonarny ma stały wał i osobny ster. Luz zachowuje
  ruch boczny, a mocny zryw na skręcie łatwiej odrzuca rufę.
- Wybór liczby osób i masy wyposażenia. Paliwo, załoga, ekwipunek oraz
  woda w zęzie wpływają na masę, zanurzenie i osiągi.
- Zęza: wskaźnik, pompa ręczna, AUTO od 20%, alarm od 50%, pobór prądu,
  odgłos pompy i chlupotania. Przeciek powstaje po uszkodzeniach konstrukcji
  lub silnym uderzeniu w napęd; samo otarcie łopatek nie dziurawi kadłuba.
- Nowe kadłuby płaskodenny i RIB, różne progi ślizgu, reakcje na fale i wiatr.
  Subtelny efekt brzegu działa w ruchu blisko nabrzeża i lądu.
- Szybsze wybieranie cum z zachowaniem limitu siły i mocy człowieka,
  niewielka sprężystość po naprężeniu. Śruba na luzie dotyka piasku bez
  naliczania zużycia; piana wentylacji znika po zgaszeniu silnika.

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
Formularze łodzi i pogody są w oknach; pod konsolą pozostają cumy i kotwica,
a w SUV-ie także ustawienia slipowania.
Stan kadłuba, pomostu i śrub jest w kokpicie pod schematem uniesienia dziobu.
Obrys mapy stanu pokazuje uderzenia w burty, wnętrze trzy części dna
(przód, środek, tył), a symbole napędów z tyłu stan każdej śruby.
Łagodne osiadanie na piasku nie uszkadza kadłuba. Śruba może doznać drobnego
otarcia piaskiem; kontakt z kamieniami jest znacznie groźniejszy. Trwałe
kolory szkód przechodzą od żółtego przez pomarańczowy do czerwonego.
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
| Cumy | Kliknij poler, boję lub drzewo, następnie knagę na rysunku; przytrzymaj − / +, aby wybierać/luzować, × odpina |
| Kotwica | Kliknij dziób lub ⚓; zadana długość i Wydaj/Stop/Wybierz, również w dolnym panelu |
| Okna na mapie | Przesuwanie za nagłówek myszą/dotykiem; także strzałkami po ustawieniu fokusu na nagłówku |
| Tankowanie | Burtą przy ⛽, co najmniej jedna cuma do stanowiska, prędkość <0,15 m/s, silniki i zapłon wyłączone |
| Dźwięk | Przełącznik i głośność w konsoli; uruchamia się po dotknięciu ekranu, wycisza na pauzie |
| Silniki osobno | Suwak „Silniki” 0–200%, zapisany razem z głośnością ogólną; nie ścisza wody, alarmów ani kliknięć |
| Trym — dźwięk | Pompa elektryczna jest słyszalna podczas fizycznego ruchu napędu, również na wyłączonym silniku |
| Naprawa | Cumowanie do dostępnej strony pomostów obok slipu, postój i wyłączony zapłon; przycisk pojawia się na mapie |
| Widok | ◎ centruje łódź, minimapa przesuwa widok, „Cały akwen” pokazuje jezioro, „Ślad” przełącza linię trasy |

Skok koła między oporami: otwarta 1,5 obrotu, motorówka 2,5, kabinowa 3,
wypornościowa 3,5; skuter tylko 90°. Koło nie wraca do zera. Zaburtowy ma
domyślnie ±45° przypisane do jednostki; dysza skutera ±28°. Menu nie zmienia tego zakresu.
Klawiatura szybciej zmienia manetkę po przytrzymaniu: pełny zakres w około
1,3 s, na skuterze około 0,95 s. Krótkie naciśnięcie nadal wybiera pełzający.
Strzałki po ustawieniu fokusu na stacyjce sterują łodzią; stacyjka nie zmienia pozycji. Manetki też pozostają
w zadanej pozycji. Dwa silniki mają osobne obrotomierze, obciążenie i ciąg.
Wsteczny ciąg jest słabszy, a zmiana biegu wymaga czasu. Luz pozwala płynąć
bezwładnością; zanurzony zaburtowy nadal reaguje na przepływ wody.

## SUV i slipowanie

Wybierz start **Parking · łódź na przyczepie** albo **Slip · załadunek z wody**.
Wybór stanowiska pod sterowaniem lub **V** przełącza łódź/SUV.
Koło i wskaźniki pozostają na swoich miejscach, manetki zastępują gaz,
hamulec i **PRND**. W/↑ gaz, S/↓ hamulec nożny. **Spacja przełącza
ręczny**, **Q/E** poprzedni/następny bieg; działają też 1/2/3/4 = P/R/N/D. Stacyjka: klik w prawo zapłon/rozruch, w lewo całkowite wyłączenie.
Zatrzymaj zestaw przed zmianą kierunku i przesiadką. Pedały puszczają po
zwolnieniu przycisku, suwaka albo klawisza.

Cofnij przyczepę na slip i zwolnij zabezpieczenia. Nacisk podpór w kg
stopniowo maleje: rufa zaczyna pływać, gdy dziób nadal jest oparty.
Przy zerowym nacisku łódź pływa, a początkowa cuma dziobowa do PRZ
utrzymuje ją przy przyczepie. Odepnij cumę, jeśli chcesz odpłynąć. Do załadunku wprowadź ją
prosto między prowadnice, załóż cumę dziobową na **PRZ**, zatrzymaj,
wyłącz silniki i wybierz **Zabezpiecz łódź**. Zbyt płytka/głęboka przyczepa
utrudnia operację. Przed wyjazdem odczep cumy od pomostu i wybierz kotwicę.
Kąt slipu 4–18° ustawisz na starcie lub w panelu poniżej. Obciążenie,
przegub, hamowanie, opory, wypór i mokra trakcja wpływają na ruch;
parking z liniami służy do ćwiczenia cofania i parkowania. Na lądzie
możesz odczepić przyczepę i jeździć samym SUV-em, następnie podjechać
hakiem do zaczepu i przyczepić ją ponownie. Przycisk 4×4 pomaga na
mokrym slipie. Pas piasku na parkingu pozwala ćwiczyć trakcję i zakopanie
kół. Zbyt duże złożenie zestawu powoduje uszkodzenia.

Gaz i hamulec narastają liniowo. Alarm zapłonu SUV-a jest wyłączony.
Łódź zaczyna na przyczepie z maksymalnym trymem, może uruchomić silnik,
ale brak wody przy stopie oznacza brak chłodzenia i szybsze przegrzanie.
Pasy można zwolnić także podczas jazdy: niezabezpieczona łódź może spaść,
a cuma zerwać się pod przeciążeniem. Za szybki załadunek uszkadza dziób;
wyłamanie wspornika może skończyć się uderzeniem w samochód.
Diagram zanurzenia oddzielnie przechyla całe nadwozie, przyczepę i łódź;
pokazuje też stopniowe unoszenie rufy i kontakt z podporami. Ten sam
widok jest dostępny w kokpicie łodzi, gdy podpływasz na przyczepę.

Knagi w menu cumowania: **jasna** wolna, **zielona** połączona z wybranym
polerem, **beżowa** z innym. Naciąg pokazuje wartość w kN i kolor liny na
mapie. Po prawej jest lokalny wiatr ze strzałką pokazującą **dokąd** wieje.

## Dźwięk i pogoda

Proste syntezowane dźwięki: stacyjka, rozrusznik, osobna praca i obroty silników,
przełączenie manetki i przekładni, fale, opływ/ślizg, strumieniowe, tankowanie,
uderzenia i pęknięcie cumy. Web Audio nie pobiera plików. Pierwsze dotknięcie
odblokowuje dźwięk; głośność i wyciszenie są zapamiętywane na urządzeniu.
Pauza, menu startowe i utrata aktywności karty wyciszają symulację.

W v11 silniki mają łagodniejsze, cichsze brzmienie i więcej szumu wydechu,
a kliknięcia manetki, stacyjki i uderzenia są wyraźniejsze. Strumieniowy
szumi wodą; wejście w ślizg dodaje osobny, szerszy rozbryzg i ogranicza
niższy szum wypornościowy. Zapłon bez pracującego silnika uruchamia
ciągły brzęczyk łodzi, również po zgaśnięciu (SUV bez brzęczyka); START, praca silnika i pozycja
0 wyłączają go. Zimny silnik lekko faluje na wolnych obrotach, a efekt
zanika przy rozgrzaniu i zwiększeniu gazu. Okno cumowania otwiera się dalej
od kadłuba, z zachowaniem możliwości przesuwania i obsługi na telefonie.

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

Obok portu są domki, warsztat, slip i dwa pomosty serwisowe z polerami R1–R3
po obu stronach. W menu startowym można wybrać „Przy slipie · serwis”.
Naprawa kadłuba i śrub postępuje w czasie; odcumowanie, ruch lub włączenie
zapłonu przerywa pracę. Naprawy nie przenoszą łodzi i nie odnawiają pomostów.

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
liczby cylindrów rzeczywistego silnika danej mocy. Osobno słychać
bulgot przy hamowaniu przeciwnym
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
