# Przystań — możliwości, model i zakres odwzorowania

Dokument opisuje aktualny model od A do Z, bez historii wydań. Jest
uzupełnieniem [instrukcji użytkownika](INSTRUKCJA.md). „Fizyczne” oznacza
tu wpływ sił na stan symulacji, a nie tylko animację. Współczynniki są
jawnymi przybliżeniami treningowymi; nie są kalibracją konkretnej łodzi.

## Mapa możliwości i ograniczeń

| System | Co rzeczywiście jest liczone | Uproszczenia / brakujące zjawiska |
| --- | --- | --- |
| Ruch kadłuba | Pęd wzdłużny, boczny, obrót, masa dodana, rozłożone opory | Model płaski z dodatkowymi oscylatorami, bez pełnej dynamiki bryły 3D |
| Kadłuby | Dziewięć różnych profili, masa, załoga, paliwo, wyposażenie, zanurzenie | Współczynniki empiryczne, bez krzywych z prób morskich |
| Napędy | Zaburtowy, Z-drive, wał/ster, waterjet, śmigło powietrzne; dwa silniki | Brak szczegółowych map śrub, przekładni i producentów |
| Ślizg i skręt | Płynny udział ślizgu, opór przejściowy, utrata prędkości na zwrocie, poślizg | Bez pełnego modelu Savitsky’ego i geometrii spray rails |
| Trym / wentylacja | Położenie nogi, ciąg, zanurzenie, wzrost RPM i spadek ciągu przy napowietrzeniu | Umowna geometria śruby i dolotu; nie model erozji kawitacyjnej |
| Prop walk / wash | Siła boczna śruby i moment; kierowany ciąg oraz przepływ przez ster | Założona prawoskrętna śruba, uproszczone zanikanie z prędkością |
| Wiatr i prąd | Siły względne, momenty, zmienność siły/kierunku, lokalne osłony | Lokalne pola przybliżone, bez CFD i rzeczywistych prognoz |
| Fale / wake | Fala orbitalna, opóźniony kilwater V, kołysanie, odbicia | Liniowe składowe i pakiety falowe, bez łamania fal i pełnego przepływu |
| Bank suction / mijanie | Nowe ograniczone siły boczne ∝ prędkość², momenty przy burcie | Przybliżenie bliskiego pola, bez pełnego bow cushion i rozwiązania ciśnień |
| Cumy | Luz, sprężystość, tłumienie, ramiona, siła ręki, zerwanie | Odcinek bez masy w poziomie, brak tarcia o knagi i oplatania przeszkód |
| Odbijacze | Kontakt poza obrysem, sprężyna, tłumienie, kompresja, małe tarcie | Umowna sprężystość, bez pomiarów ciśnienia konkretnego odbijacza |
| Kotwica | Łańcuch + lina, zwis, ciężar, dno, opadanie, chwytanie/wleczenie, winda | Model quasi-statyczny, brak wielowęzłowej dynamiki liny |
| Uszkodzenia | Energia kontaktu, strefy burt/dna, śruby, miękkie obiekty | Wskaźnik procentowy zamiast konstrukcyjnej analizy materiału |
| Zęza / zalewanie | Litry, przeciek i rozpryski oddzielnie, masa wody, pompa, zatopienie | Uśrednione wnętrze kadłuba, bez osobnych przedziałów wodoszczelnych |
| Temperatura | Bilans nagrzewania/chłodzenia, limit mocy i ochronne wyłączenie | Bez trwałego zatarcia i pełnego układu olejowego |
| Elektryka | Wspólny akumulator, alternatory, odbiorniki, spadek V, słaby rozruch | Krzywa OCV i rezystancja umowne, bez chemii/temperatury ogniw |
| Paliwo / eksploatacja | L/h, masa paliwa, tankowanie, motogodziny, przebieg, ETA | Zużycie empiryczne; GPS wskazuje cel po prostej, nie trasę po wodzie |
| Flota / hol | Do 8 ciał, niezależny stan, naprężenie, szarpnięcie, zerwanie | Brak autonomicznej żeglugi NPC, załogi i oplatania holu wokół śrub |
| MOB | Koło/manekin, dryf, fale, osiadanie, miękki kontakt, podejmowanie | To obiekt treningowy, bez człowieka, fizjologii, AI i obrażeń |
| SUV / przyczepa | Bezwładność zestawu, skręt, hak, PRND, hamulce, trakcja, podłoża | Model 2D, umowne opony i siła napędowa, bez pełnej mechaniki zawieszenia |
| Slipowanie | Podparcie, wyporność, prowadnice, tarcie, wciągarka, odbojnik, pasy, scoring | Uproszczone rolki i hydrostatyka, nie katalog konkretnej przyczepy |
| Zapis | Pełny stan lokalny, poprzednia kopia, kontynuacja w pauzie | Jedna przeglądarka/domena, bez konta, chmury i eksportu |
| Dźwięk | Proceduralne silniki, obciążenie, rozruch, woda, trym, alarmy, kolizje | Bez próbek licencjonowanych i wiernego odwzorowania modeli silników |

## Jednostki, geometria i zegary

Wewnętrznie: metry, kilogramy, sekundy, niutony, radiany. X rośnie na
wschód, Y na południe; kąt kadłuba rośnie zgodnie z ruchem wskazówek zegara
od wschodu. Interfejs zamienia to na kurs od północy. Rozmiary obiektów
i prędkości są fizyczne. Kontakt i grafika korzystają z tego samego
lokalnego obrysu kadłuba.

`worldScale = 0.50`, dokładnie połowa pierwotnej geografii. Położenia
geograficzne są kompresowane raz względem punktu głównej kei (80, 4):
`p' = origin + (p-origin) × 0.50`. Nie skaluje się długości łodzi,
pomostów, SUV-a, przyczep, budynków, drzew, polerów ani boi.

Oddzielny `operationalTimeScale = 1/worldScale = 2` dotyczy wyłącznie
czasu podróży, motogodzin, paliwa od czasu pracy, przebiegu, statystyk
i ETA. `logicalDistance = physicalDistance/0.50`: 500 m mapy daje 1000 m
licznika. Motogodziny naliczane są osobno tylko pracującym silnikom.
Paliwo zużyte w kroku: `L/h × dt × 2 / 3600`.

Fizyka kadłuba, obroty, chłodzenie, akumulator, przecieki, pompa, cumy,
kotwica, fale, wake, hol, MOB, SUV i przyczepa nadal używają rzeczywistego
`dt`, bez mnożnika 2. Podstawowy krok to 1/120 s. Pauza, otwarte menu
konfiguracji/pomocy oraz ukryta karta nie integrują świata. Zegar nie
nadrabia czasu zamkniętej przeglądarki. Trasa wynika z całki prędkości,
więc reset/depenetracja nie dodają fałszywych kilometrów.

## Profile łodzi i konfiguracje domyślne

| Profil | L × B [m] | Masa samego kadłuba [kg] | Bazowe zanurzenie [m] | Silnik [KM] | Paliwo maks. [l] | Dopuszczone napędy |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Otwarta | 4,2 × 1,75 | 380 | 0,28 | 25 | 45 | Zaburtowy |
| Motorówka | 5,5 × 2,15 | 800 | 0,38 | 90 | 100 | Zaburtowy, Z-drive |
| Kabinowa | 7,5 × 2,65 | 2100 | 0,55 | 200 | 250 | Zaburtowy, Z-drive, wał |
| Wypornościowa | 9 × 3,1 | 4200 | 0,75 | 90 | 400 | Wał |
| Skuter | 3,2 × 1,22 | 310 | 0,20 | 170 | 60 | Waterjet |
| Płaskodenna | 4,6 × 1,9 | 440 | 0,23 | 50 | 45 | Zaburtowy |
| RIB | 5,2 × 2,25 | 470 | 0,30 | 100 | 100 | Zaburtowy |
| Swamp boat | 5,3 × 2,35 | 650 | 0,16 | 180 | 90 | Śmigło powietrzne |
| Wyścigowa | 9,2 × 2,35 | 1850 | 0,58 | 2 × 600 | 450 | Dwa Z-drive |

Start domyślnie: jeden silnik, zbiornik 75% pełny, 2 osoby po 75 kg
i 25 kg wyposażenia; skuter 1 osoba +5 kg. Kabinowa ma domyślny dziobowy strumieniowy; wypornościowa dziobowy i rufowy.
Można je wyłączyć w konfiguracji. Jawne `false` zachowuje wariant bez instalacji
i jej masy; starsze zapisy zachowują własne wyposażenie.
Trym podnoszonego napędu 10%, a na zabezpieczonej przyczepie 100%.
Nowa próba zaczyna z wyłączonymi silnikami. Przeliczana masa obejmuje
kadłub, silniki, zbiorniki, osprzęt, załogę, paliwo i wodę w zęzie.
Drugi silnik zwiększa masę i ma osobną dynamikę.

Parametry edytowalne: długość 2,8–11 m, szerokość 1,1–3,8 m, kadłub
200–8000 kg, 1/2 silniki (skuter/airboat tylko 1; wyścigowa zawsze 2), 10–350 KM na silnik,
a wyścigowa do 600 KM na silnik,
10–800 l paliwa, 1/2 zbiorniki, 0–12 osób, 0–1500 kg wyposażenia.
To zakres eksperymentów, nie potwierdzenie dopuszczalności takich
konfiguracji przez producenta.

Benzyna ma 0,745 kg/l, olej napędowy wyścigowej 0,84 kg/l, woda zęzowa 1 kg/l. Zanurzenie rośnie według
`Δm / (1000 × L × B × 0.7)`. Woda i paliwo położone bliżej rufy zmieniają
środek masy i moment bezwładności. Masa dodana wzdłużna to 1,08m,
boczna 1,65m (zabawki dmuchane 1,15m); moment yaw jest powiększony
odpowiednio ×1,55 lub ×1,2 względem przyjętej geometrii bezwładności.

Płaskodenna wcześniej wchodzi w ślizg i mocniej reaguje na falę;
V ma większy opór i łagodniejszą reakcję; RIB jest lekki i ma podatne
burty; kabinowa ma większą masę, bezwładność oraz powierzchnię dla wiatru;
wypornościowa nie osiąga ślizgu. Swamp ma mały boczny opór, poślizg,
silny moment od sterów powietrznych i zachowuje ruch po zdjęciu gazu.

## Równania ruchu, skręt i napędy

Stan poziomy to `(x,y,heading,vx,vy,yawRate)`. Siły są sumowane w osiach
kadłuba jako surge/sway/yaw. Opór poprzeczny jest sumą lokalnych oporów
wzdłuż kadłuba: prędkość przekroju `v + yawRate × x`, siła ∝ kwadrat tej
prędkości ze znakiem przeciwnym, moment z ramienia. Nie wymusza się
prędkości zgodnej z kierunkiem dziobu; boczny pęd może pozostać po N.

Opór wzdłużny łączy tarcie inspirowane ITTC, opór falowy z garbem
przejściowym, opór cofającej pawęży i opór podparcia w ślizgu. Udział
ślizgu zależy od liczby Froude’a, masy, przybliżonej siły nośnej,
kadłuba i obciążenia zwrotem. Rośnie i zanika ze zwłoką. Ostry skręt
kosztuje moc przez przepływ boczny oraz dodatkową siłę nośną; słabszy
napęd może zejść ze ślizgu, mocniejszy utrzymuje większą prędkość.
Usunięto podwójne liczenie obrotu układu współrzędnych; stabilizujące
współczynniki kadłuba kompensują nieskalibrowany moment Munka.

| Napęd | Siła i sterowanie |
| --- | --- |
| Zaburtowy / Z-drive | Obracany wektor ciągu w punkcie przy rufie, kąt do ±45°, trym; na N słabszy hydrodynamiczny efekt nogi |
| Wał | Stały osiowy ciąg pod rufą; osobny ster za rufą, efektywność od przepływu i wash naprzód, cofanie trudniejsze |
| Waterjet | Dysza do ±28°, kierowanie zależne od pracującego strumienia; wstecz przez deflektor, bez prop walk |
| Airboat | Śmigło nad wodą i stery w powietrzu do ±45°; bez podwodnej śruby, trymu i biegu wstecznego |

Wektor ciągu, ramiona dwóch silników i ustawienie rufowych napędów
tworzą rzeczywiste momenty. Wash w zaburtowym/Z-drive jest samym
wektorem ciągu — nie dodaje się drugi raz tej samej siły. W wale wash
zwiększa napływ na ster. Bez ciągu, ale z ruchem wody, noga/ster nadal
może dawać niewielką siłę. Ruch napędu ma ograniczoną prędkość zmiany.

Prop walk działa tylko dla pojedynczej prawoskrętnej śruby na wstecznym:
`Fy = -abs(thrust) × strength × coefficient × fade`, gdzie coefficient
wynosi 0,45 dla wału i 0,30 dla zaburtowego/Z-drive,
`fade = max(0,1-|u|/2.2)^2 × (1-planing)`. Moment to `engineLever × Fy`.
Strength: otwarta/motorówka/płaskodenna 0,2; RIB 0,25; kabinowa 0,4;
wypornościowa 0,6; waterjet/airboat 0. Dwa silniki zakładają śruby
przeciwbieżne i nie mają tego sumarycznego walk.

Silnik ma opóźnione RPM, przełączenie F/N/R i asymetrię ciągu wstecz.
Ciąg jest ograniczony momentem przy małej prędkości i dostępną mocą
przy dużej. Obciążenie zależy od napływu, cofania przeciw ruchowi,
przepływu bocznego i fal. Zmienia RPM oraz dźwięk. Rozruch i bieg
pełzający nie są stałą etykietą liczbową — obroty mają dynamikę.

## Wyścigowa i turbodoładowanie

Oddzielny profil `racing.js`: deep-V 27°, L/B 9,2/2,35 m, kadłub 1850 kg,
2 × 600 KM, 450 l oleju napędowego, trym początkowy 20%, 1,5 obrotu koła.
Normalne profile zachowują dawny limit mocy i kalibrację. Wariant bez
strumieniowych jest bazą porównawczych audytów napędów, niezależnie od
nowych domyślnych opcji wyposażenia kabinowej/wypornościowej.

Wyłącznie ten profil ma szybszą stałą narastania obrotów 0,22–0,38 s,
RPM biegu jałowego 720 i zakres wału około 3450 RPM ponad pracę biegu.
Opór w ślizgu mnoży się przez `0.48 + 0.5 × clamp(abs(trim-.20)/.22,0,1)`;
w wyporności korekta zanika z udziałem ślizgu. To jawne przybliżenie
mniejszej powierzchni zwilżonej smukłego wyścigowego kadłuba. Nadal działają
masy dodane, rozłożone siły boczne, energia zwrotu, poślizg, wentylacja,
fale, kolizje i termika. W pomiarze 30 s spokojnej wody domyślna jednostka
osiąga około 114,5 km/h; pełny zwrot zmniejsza prędkość do około 44 km/h
po 10 s. Wyniki są modelowe, nie dane producenta.

Spalanie używa współczynnika 0,225 zamiast 0,29 przy członie KM × n³.
Turbo korzysta z rzeczywistych `n`, obciążenia i stanu silnika: boost
`n² × (.25+.75×load)`, gwizd 850–4050 Hz, głośność do 0,018 na silnik.
Gwałtowne odjęcie polecenia przy boost >0,18 uruchamia krótkie syknięcie
BOV z szumu. Wygasające obroty bez kolejnej zmiany polecenia nie powtarzają
syku. To dodatkowe głosy audio; dawne głosy silników, kliknięć i stacyjki
zostają. Pauza/wyciszenie oraz głośność silników obejmują nowy napęd.

## Trym, wentylacja, grafika i temperatura

Trym zmienia geometrię nogi, pionową składową ciągu, położenie śruby,
opór i przegłębienie w ślizgu. Skala 0–40% jest robocza, powyżej
podnoszenie. Wentylację wywołuje zanurzenie śruby poniżej około 70%
lub nadmierny kąt przy większym napływie. Stan wentylacji narasta
i opada ze stałą około 0,35 s: obroty wzrastają, grip spada i maleje
rzeczywisty ciąg. Po powrocie do wody odzyskanie jest płynne.

Zaburtówka ma widoczną osłonę nad pawężą, Z-drive smukłą nogę za pawężą.
Pomocnicza kreska jest tylko za klasycznym osobnym sterem wałowym.
Każda struga wynika z `effectiveThrust`, biegu i faktycznego kąta
danego napędu. Wał nie skręca strugi razem ze sterem. Dwa silniki
mają osobne strugi i poprawnie przypisane wypływy chłodzenia.

Piana jest przejściem po szybkim narastaniu obrotów, dużej mocy wstecz
przeciw ruchowi, wentylacji albo ponownym złapaniu wody. Po ustaleniu
pozostaje normalna struga. Wyłączony silnik nie tworzy piany ani wypływu.
Silnik na N pokazuje mały wypływ chłodzenia z boku rufy, bez fikcyjnej
napędowej chmury bąbelków. Wizualne smugi kadłuba zależą od prędkości
względem wody, również dla dryfu.

Temperatura jest empirycznym bilansem ciepła zależnym od RPM, obciążenia,
zanurzenia wlotu i przepływu. HIGH TEMP ≥95°C, ALARM ≥105°C,
OVERHEAT ≥120°C, ochronne wyłączenie ≥145°C. Moc spada do 35% w
zakresie 105–135°C. Rozruch jest blokowany ponad 110°C, flaga trip
znika po spadku do 100°C. Nie ma trwałego zatarcia. Chłodzenie i
temperatura używają fizycznych sekund, nie czasu eksploatacyjnego.

## Instalacja elektryczna i paliwo

Jeden akumulator zasila cały bilans: `I = odbiorniki - alternator`.
`SOC -= I × dt / (3600 × Ah)`. Pojemność: skuter 35 Ah; inne 80 Ah
+80 Ah na każdy zainstalowany strumieniowy. Rozrusznik 110 A na silnik,
zapłon 1,2 A łącznie, światła LED 0,65 A, GPS 0,35 A, sonar 0,70 A,
instrumenty 0,55 A. Pompa: `4.5 × sqrt(wydajność/32)` A. Strumieniowe
pobierają prąd zależny od siły i napięcia, bez osobnego fikcyjnego magazynu.

OCV dla SOC 0/10/25/50/75/100% wynosi 10,6/11,8/12,0/12,2/12,45/12,75 V.
Rezystancja: `0.003 × 80/Ah × (1+8×(1-SOC)^4)` Ω. Obciążone napięcie
to OCV−I×R. Alternator daje 12–34 A na silnik zależnie od RPM, najpierw
zasila odbiorniki, następnie ładuje; regulator ogranicza doładowanie
powyżej 99% SOC. Przy nadwyżce pracującego alternatora jest około
13,5–14,4 V. Wyłączenie obciążenia przywraca część napięcia, bez
przywracania zużytych Ah.

Rozruch wymaga SOC ≥8% i napięcia ≥10 V. RPM rozrusznika zależy od
obciążonego napięcia; minimum 185 RPM i ograniczony czas próby powodują,
że słaby akumulator może zacząć kręcić, lecz nie uruchomić silnika.
Przełączniki i główne OFF korzystają z tego samego modelu co pompa,
strumieniowe, GPS i instrumenty. Strumieniowe nie wymagają zapłonu.

Zużycie silnika [l/h] jest empiryczne:
`0.45 + 0.003×KM + 0.29×KM×n^3×(0.55+0.45×load)`.
Dotyczy logicznej godziny; masa znika ze zbiornika zgodnie z tym samym
ubytkiem. Zbiorniki rozdzielają paliwo proporcjonalnie. Tankowanie
0,65 l/s używa czasu fizycznego i wymaga lokalnego stanowiska,
rzeczywistej cumy, prędkości ≤0,15 m/s i stacyjek OFF. Rynia i Pilawa
korzystają z jednej wspólnej logiki, nie dwóch niezależnych systemów.

## Zęza, przecieki i zalewanie

Woda w zęzie jest liczbą litrów z rzeczywistą masą. Napływ z uszkodzenia
jest przybliżeniem wypływu przez otwór pod ciśnieniem hydrostatycznym:
`0.62 × breachArea × sqrt(2g×head) × 1000` l/s. Pole otworu zależy od
uszkodzeń kadłuba ponad 18%, sumy szkód dna ponad 8% oraz poważnego
uderzenia napędu/uszczelnienia. Samo przetarcie śruby nie daje przecieku.

Oddzielnie liczy się `deckInflow`: rozpryski/agresywny zwrot, przechył,
boczna fala i chwilowe zalanie pokładu, do 2,4 l/min. Normalne spokojne
pływanie nie daje zauważalnego napływu. `leakTotal` i `deckTotal`
zachowują rozróżnienie, panel pokazuje łączny napływ. Szczelne zabawki
dmuchane nie mają zalewanej zęzy.

Wydajności nominalne przy 12 V: tender/flat/swamp/PWC 32 l/min,
RIB/runabout 50, cabin 95, cruiser 126. Wydajność spada z napięciem.
OFF, AUTO i ON są wzajemnie wykluczające. AUTO zwykle startuje od
15 l i wyłącza poniżej 3 l; pływak ma histerezę. Pompa wymaga
głównego ON i SOC >2%. Litry wracają do fizyki masy i zanurzenia
w każdym kroku; po wypompowaniu parametry wracają. Alarm działa od
50% umownej pojemności zęzy. Osobny uproszczony model zalewania
obniża kadłub, zwiększa pokrytą wodą część i może zalać silnik.

Woda daje dodatkowy dynamiczny moment przegłębienia: cel pitch zawiera
`min(0.10, 0.18 × waterKg/totalMass)` rad ponad istniejący wpływ środka
masy. Nie dodaje się drugi raz masy wody ani statycznego zanurzenia.
`immersionReadings` podaje bieżące zanurzenie środka, dziobu i rufy z
heave/pitch i aktualnej powierzchni. Profil dopasowuje skalę, oznacza
zalany pokład/cały kadłub, a rosnąca woda przesuwa kadłub w dół względem
tej samej linii powierzchni.

`flood-systems.js` odcina instalację przy całkowitym zatonięciu lub
krytycznym przecieku napędu (driveLeak ≥0,7 i propDamage ≥85%) po dotarciu
wody do instalacji przy submersion >0,6. Awaria jest zatrzaskiwana:
master OFF, SOC i V =0, wszystkie powered=false, alternator/odbiorniki
bez prądu, silniki OFF, pompa i strumieniowe stoją, rozruch jest blokowany.
Przełącznik nie omija awarii. Taki stan przechodzi przez dotychczasowy
snapshot i odczyt. Po osuszeniu serwis może odtworzyć instalację i
akumulator z SOC 60%, pozostawiając główne zasilanie OFF do ręcznego
włączenia. Zdrowy akumulator i odwracalna termika zachowują stare zasady.

## Cumy, odbijacze, kotwica i szkody

Cuma działa wyłącznie na rozciąganie. Ma długość spoczynkową, `EA/L`,
tłumienie i ramię w konkretnej knadze. Implicit Kelvin–Voigt stabilizuje
krótkie sztywne liny; luz nie tworzy siły przyciągającej. Pierwsze
napięcie może lekko odbić kadłub. Wybieranie buduje siłę ręki 120–450 N,
65 W, maks. 0,28 m/s, dzielone między jednocześnie wybierane cumy.
Puszczenie natychmiast zatrzymuje skracanie. Przekroczenie wytrzymałości
rywa linę. Kolory używają tego samego obciążenia w kN i procentach:
biały <1 N, zielony <20%, brązowy 20–80%, czerwony ≥80% siły zrywającej.

Trzy odbijacze na stronę mają położenia obliczone z lokalnego zwężającego
się obrysu, nie prostokąta. Kontakt zaczyna się przed kadłubem. Przybliżona
sztywność `12000 × (radius/.14)^.8` N/m, tłumienie `1.05×sqrt(k×m_eff)`,
ograniczona kompresja i siła. Tarcie wzdłużne ma limit 3,5% impulsu
normalnego, pozwala przesuwać się przy kei. Kontakt odbijacza nie
nalicza równocześnie pełnego uderzenia kadłuba. Dopiero rzeczywiste
dotknięcie nieosłoniętego kadłuba lub dobicie kompresji pozostawia
energię do naliczenia szkód. Wiatr, wake i cumy nie są wyłączane przy kei.

Kotwica ma ciężar i opadanie, model łańcucha z liną, zwis, odcinek dna,
ograniczony uciąg windy, trzymanie oraz wleczenie zależne od podłoża
i kąta. Współczynniki trzymania piasek/muł/kamienie: 28/12/3 w umownej
skali. Zalecenie 5:1 lub 7:1 liczy wysokość rolki nad dnem, a nie sam
odczyt sondy; nie gwarantuje trzymania. Brak pełnej dynamiki każdego ogniwa.

Uszkodzenia wynikają z normalnej energii kontaktu `0.5×m_eff×vn²` oraz
lokalnej ochrony. Przedziały opisowe kontaktu nie są automatycznym
zniszczeniem: kadłub do 0,15 m/s i chroniony kontakt do 0,30 m/s
mogą być łagodne. Ciągły docisk jest jednym epizodem; dopisywany jest
przyrost szczytowej energii, nie ten sam cios w każdym kroku. RIB
ma bardziej podatne burty, banan/materac są miękkie, barka ciężka.
Na piasku RIB i płaskodenna mają mniejsze szkody przy niewielkiej
prędkości, ale nie są odporne na szybkie wejście. Śruba na biegu
ma osobne szkody zależne od kontaktu i materiału; piasek na N jej
nie niszczy. Naprawy wymagają postoju, właściwego cumowania/stanowiska
i stacyjek OFF; nie resetują świata ani położenia.

## Wiatr, prąd, fale i physical wake

Wiatr działa na nadwodny obrys przez względny przepływ i momenty,
prąd przez prędkość wody względem kadłuba. WindageFactor:
skuter 0,3, otwarta/płaskodenna 0,55, motorówka 0,6, swamp 0,85,
RIB 0,9, kabinowa/wypornościowa 1,0. Siła i kierunek mogą zmieniać
się niezależnie w zadanym zakresie. Osłony wysp/pomostów oraz
zawirowania i kierowanie przy brzegu są lokalnymi przybliżeniami.
Nie odtwarzają rzeczywistych prądów Zegrza.

Zwykła fala to suma trzech składowych o okresach 2,8/1,9/3,9 s,
z wysokością, kierunkiem, orbitalnymi prędkościami i przyspieszeniami.
Fale wymuszają heave, roll i pitch oraz chwilowe zanurzenie napędu.
Heave jest wizualizowany także subtelną zmianą wielkości łodzi.

Wake powstaje ze śladu dowolnego emitera, nie tylko gracza. Amplituda
zależy od prędkości względem wody, masy, L/B, typu kadłuba, liczby
Froude’a i udziału ślizgu; limit 0,44 m. Zapisy śladu co ≥0,2 s
tworzą dwie rozchodzące się smugi V. Prąd unosi ślad. Pakiet ma
rzeczywisty czas propagacji, minimalny wiek 0,35 s, tłumienie
`exp(-age/13) × max(0,1-age/36)`, potem znika.

To samo pole fali jest rysowane i próbkowane przez kadłub, zacumowane
łodzie, boje, Y-bomy i obiekty ratunkowe. Rozłożone siły dają również
moment; reakcja zmienia napięcie konkretnych lin i kompresję odbijaczy.
Boje mają sprężyste zakotwienie i ograniczone przesunięcie, Y-bomy
zawias/restytucję oraz własną bezwładność; nie są nieruchomymi obrazkami.

Odbicia wykorzystują lustrzane źródła od skończonych odcinków, najwyżej
dwa odbicia. Twarde pomosty mają współczynniki około 0,56–0,64, naturalny
brzeg 0,34, łagodna plaża 0,08, dodatkowo energia szybko maleje z drogą
i liczbą odbić. Nie ma niekończącego się wzmacniania fal. Most jest
rysowany nad wodą; kolidują jego podpory, nie cały przelot.

## Wizualna i akustyczna reakcja na wiatr

`wind-response.js` jest czystym odwzorowaniem aktualnej prędkości pogody.
Do 3 m/s brak dodatkowego zagęszczenia; od 6 m/s rośnie biała część
akcentów, gęstość do ×3,8 i delikatna szara domieszka w kolorze wody.
Warstwa jest wycięta obrysem jeziora i wysp, nie barwi lądu. Renderowanie
nie zmienia równań fal ani sił. Osobny przełącznik wyłącza tę warstwę.

Nowy generator to osobny bufor białego szumu i filtr lowpass. Gain
`0.004 × windSpeed`, cutoff `250+95×windSpeed` Hz, z wygładzaniem
zmian w czasie rzeczywistym. Przy 0 m/s cel głośności jest 0.
Wyciszenie, pauza i przełącznik szumu odcinają efekt. Nie zastępuje
istniejącej warstwy silników, wody, biegów ani rozruchu.

## Tor wodny, IALA A i podwodne przeszkody

`navigation-marks.js` definiuje dwa umowne szlaki w górę Narwi i Bugu.
Pary mają czerwone walce po lewej oraz zielone stożki po prawej względem
kierunku szlaku; rozstaw jest ograniczony szerokością wody. Kardynalne
N/E/W mają poprawne czarno-żółte pasy i konfiguracje dwóch stożków;
renderer obsługuje też S. Znaki odosobnionego niebezpieczeństwa mają
czarny–czerwony–czarny i dwie kule. Jest 30 oznaczeń, w tym trzy pary
niebezpieczeństwo/kardynalny. Analizowane pozycje pozostają na wodzie.
Pławy mają niewielki ograniczony ruch i kołysanie, bez nowych numerów
polerów lub zmian dotychczasowych cum.

Trzy głazy mają promienie 5/4/4,5 m i minimalną głębokość 0,32/0,25/0,38 m.
Gładka korekta lokalnego dna podaje materiał rock do istniejącego
`groundContact` i `propellerContact`, więc szkody wynikają z obecnej
energii i geometrii, a nie samego dotknięcia obrazka. Pozostałe dno nie
zmienia się. Wyłączenie znaków w Pogodzie ukrywa grafikę, pozostawia dno.
Rozmieszczenie jest treningowe, bez potwierdzenia rzeczywistego toru.

## Ssanie brzegowe i interakcje mijania

Czyste funkcje są w `hydro-interactions.js`, adaptacja sceny w
`interaction-scene.js`. Wyłączenie `env.hydroInteractions` usuwa nowe
siły. Dotychczasowy subtelny wpływ bliskości brzegu na sterowność
pozostaje bez przebudowy.

Przy stromym brzegu lub twardym pomoście:

`F = 0.5 × 1000 × L × draft × 0.012 × u² × exp(-2×gap/range)`
`    × steepness × sideAlignment² × confinement`.

`gap` jest odstępem od burty, `range=max(0.5,1.1×B)`, confinement
uwzględnia względną głębokość. Siła jest boczna w stronę przeszkody,
działa na ramieniu −0,18L i ma ograniczenie 8% ciężaru łodzi. Nie ma
jej bez ruchu względem wody, przy przeszkodzie przed dziobem, poza dwiema długościami
ani przy łagodnej plaży. Geometria brzegu jest próbkowana co 0,2 s,
siła liczona w każdym kroku. Nie zmienia sterowania, silnika ani cum.

Bliskie mijanie współosiowych lub przeciwnie skierowanych jednostek
wykorzystuje wspólne pole kontaktu burt, nakładanie się długości oraz
średnią kwadratów prędkości względem wody. Współczynnik 0,008, zanik
wykładniczy ze szczeliną, maks. 5% ciężaru lżejszej jednostki. Impulsy
są równe i przeciwne; ramiona tworzą momenty. Obsługiwane są jednostki
floty i widoczne łodzie portowe. Zjawisko jest opcjonalnym przybliżeniem
treningowym, nie rozwiązaniem hydrodynamiki dwóch kadłubów; nie obejmuje
pełnej sekwencji fali dziobowej i zmian ciśnień wszystkich faz mijania.

## Holowane obiekty i ratownictwo

| Obiekt | L × B [m] | Masa z domyślnymi osobami [kg] | Bazowe zanurzenie [m] | Lina/knaga max |
| --- | --- | ---: | ---: | ---: |
| Barka | 10,5 × 3,5 | 4100 | 0,48 | 40 kN |
| Banan, 3 osoby | 4,8 × 1,1 | 260 | 0,14 | 6 kN |
| Materac, 1 osoba | 2,2 × 1,6 | 93 | 0,08 | 5 kN |
| Wiosłówka, 1 osoba | 3,8 × 1,5 | 140 | 0,18 | 6 kN |
| Kajak, 1 osoba | 3,6 × 0,7 | 100 | 0,14 | 4 kN |

Parametry, liczba osób i wyposażenie są edytowalne. Kajak i wiosłówka
mają ograniczony napęd ręczny wyłącznie po objęciu stanowiska;
pozostałe obiekty nie dostają ukrytego silnika. Każdy ma własną masę,
zanurzenie, opór, bezwładność, cumy i kotwicę. Banan/materac mają
mniejszą boczną masę dodaną, opory planujące oraz zamkniętą wyporność.

Hol to jednostronna sprężysta lina, nie więz teleportujący. Siły
w punktach zaczepienia są równe i przeciwne, dają momenty obu ciał.
Długość 0,6–60 m, rzut 25 m, ręczne wybieranie do 450 N/65 W,
limit długości zmienianej w trzymanym przycisku. Wytrzymałość jest
minimum wybranej liny i obu punktów zaczepienia. Nagły skok napięcia
może zerwać hol, co zatrzymuje przekaz siły i daje komunikat.

Whip wynika z bocznego pędu, małego oporu i więzu liny — nie dodaje się
„siły odśrodkowej” ani mnożnika prędkości. `whipState` mierzy składową
styczną i chwilowy nadmiar prędkości. Lateralne napięcie daje ograniczony
przechył (do 0,14 rad), a poprzeczna fala zwiększa rozpraszający opór
`0.5×rho×B×draft×0.12×u×abs(u)×clamp(4×crossSlope,0,1)`.
Rozłożone próbki wake z przodu/tyłu wymuszają kołysanie i yaw.
Nowy opór/przechył można wyłączyć `env.towEffects`; bazowa lina zostaje.

Ratownictwo jest osobnym stanem floty, bez zabierania ośmiu miejsc łodzi.
Czysty integrator `advanceRescueObject` nie mutuje argumentów. Koło:
2,5 kg, 0,8 m, draft 0,05 m. Manekin: 80 kg, 1,7×0,5 m, draft 0,18 m.
Masa z umowną masą dodaną ×1,7, kwadratowy opór względem prądu/oscylacji
wody, siła wiatru, heave/roll i tarcie przy osiadaniu na lądzie.
Rzut dziedziczy prędkość łodzi i dodaje 1,5 m/s na wybraną burtę.

Podejmowanie wymaga ≤1,7 m od obrysu kadłuba, względnej prędkości
≤0,55 m/s i obu manetek na N. Limit 12 aktywnych obiektów, ograniczona
historia 16 podjętych. Kontakt z kadłubem odpycha lekki obiekt i jest
liczony w treningu; nie uszkadza automatycznie łodzi. Obiekty korzystają
ze wspólnego pola fal i wake. To nie jest symulacja zachowania człowieka.

## SUV, przyczepa i slipowanie

SUV: 4,9×2 m, masa 2400 kg, moc 250 KM, rozstaw osi 2,9 m, skręt
±34°, 2,5 obrotu koła. Gaz i hamulec narastają w czasie. PRND,
ręczny, odłączany hak, 4×4, siły opon, obciążenie osi, opory toczenia,
pochylenie i poślizg wpływają na ruch. Piasek zwiększa opory i może
powodować zapadanie kół. Przód/tył mają różne warunki trakcji.

Przyczepa powstaje z parametrów łodzi. Masa pusta:
`220 + 65×L + 0.055×max(0,mBoat-1200)` kg, 1–3 osie według masy,
osie przesunięte za środek, dłuższy dyszel. Łódź zabezpieczona
powiększa fizyczną masę zestawu. Oporów pustej przyczepy nie liczy
się jak głęboko zanurzonego ciężkiego kadłuba. Normalny SUV wyciąga
pustą dwuosiową przyczepę w testach; mokry stromy slip i ciężka łódź
nadal mogą ograniczać przyczepność. Poślizg ma dźwięk.

Parking jest poziomy; dopiero slip opada. Kąt ustawiany 4–18°, domyślnie
8°. Profil liczy oddzielne pochylenie całego SUV-a oraz przyczepy na
podstawie kontaktów osi/haka. Nie obraca jedynie rysunku kół.

Po zwolnieniu pasów pozostaje fizyczne podparcie i tarcie. Zanurzenie
zmniejsza nacisk kg i tarcie: podparta → częściowo pływa → pływa.
Przyczepa działa jak podpory, nie sztywny pływający magnes. Prowadnice
dają kontaktowe siły boczne, opór i tłumienie; nie ustalają arbitralnie
pozycji. Krzywe wejście może się nie udać. Wciągarka jest osobną liną
do dziobu z ograniczoną siłą, działa także częściowo na lądzie,
zatrzymuje zwijanie po puszczeniu i utrzymuje długość hamulcem.
Odbojnik oraz samochód przyjmują kontakt za szybko wjeżdżającej łodzi.

Scoring zapisuje osiowość 35%, tor/odchylenie wejścia 35%, pozycję
i prędkość zatrzymania 30%, z potrąceniem za uderzenia. Zabezpieczenie
wymaga rzeczywistego osadzenia kadłuba i właściwej pozycji, nie samej
obecności nad prostokątem przyczepy. Pasy nie wymagają wyłączonego
silnika. Praca bez zanurzonego wlotu szybko podnosi temperaturę.
Przejazd z luźną łodzią, silne hamowanie lub złożenie zestawu mogą
uszkodzić/zrzucić kadłub. Reset pojazdu jest lokalny; rejs pozostaje.

## Mapa i wiarygodność geografii

Obrys jest interpretacją przesłanego atlasu jeziora i pozostałych map,
z pierwotną podziałką 75 px = 1 km, skompresowaną do 500 m mapy.
Świat ma 8,53×6,95 km. Zachowano ramiona Narwi i Bugu, zatokę Rządzy,
południowy basen, przesmyki, mosty w Zegrzu i Wierzbicy, zaporę Dębe
i wejście do Kanału Żerańskiego. GeoNames dostarcza punkty kontrolne
miejscowości. Dokładny test brzegu wykorzystuje BVH odcinków.

Główny port treningowy jest przy cyplu Zegrza Północnego: stara keja,
stanowiska z bojami i Y-bomami 25 cm, parking, slip, pomost serwisu.
Pomosty zdalne mają fizyczne 20–40 m. Budynki i drzewa stoją na lądzie,
pomosty mają dojście do brzegu; stacja Rynia ma oddzielne stanowisko.
Kompresja świata nie skraca samych budowli.

**Euzebia** jest dodana osobno od wysp ujścia Bugu, przy ujściu Rządzy
w rejonie Arciechowa/Ryni. Ma nieregularny obrys, płycizny, wybrane
łagodne piaszczyste podejścia i pięć drzew do cumowania. W obecnym
modelu jest największą wyspą. Jej obrys i wymiar są interpretowane. Zachodnia i część południowej
strony mają łagodne podejście z ciągłym przejściem nachylenia 0,085–0,21.
Płytki pas wody jest rysowany z cache rastra `bottomAt` o komórce 2 m,
z interpolacją Canvas, a suchy piasek jest osobno nad linią wody.
Dwie nowe kępy szuwarów mają ten sam opór co istniejące rośliny.
Współrzędne drzew i ich stare indeksy pozostają bez przesuwania.

**Pilawa** leży po wschodniej stronie południowego basenu według
dostarczonej mapki lokalizacyjnej. Model ma cztery poprzeczne pomosty,
dwie sekcje osłony z wejściem, 19 dodatkowych łodzi motorowych/żaglowych/
skuterów oraz oznaczone stanowisko ORLEN pośród miejsc postojowych.
Rozmiary pomostów pozostają fizyczne, ich nasady są dopasowane do brzegu.
Pomost paliwa ma połączenie i własne polery/odbijacze; nie jest
samotnym obiektem na otwartej wodzie. Basen ma umowne pogłębienie.

**Stopień weryfikacji tych dwóch miejsc:** nazwa i okolica Euzebii pochodzą
z informacji/linku użytkownika, lokalizacja Pilawy z jego załącznika.
Załącznik nie pokazuje szczegółów pomostów. Bezpośrednia weryfikacja
OpenStreetMap/Overpass, strony portu i wskazanego Facebooka jest
zablokowana przez politykę sieci środowiska. Przygotowano projekt
rozszerzenia dostępu; nie traktujemy go jako uzyskanego dostępu ani
przejrzanego źródła. Obecne kształty, układ pomostów, liczba miejsc
i położenie dystrybutora są **treningowym przybliżeniem, nie repliką 1:1**.
Dane są wydzielone w `lake-sites.js`, aby można je było poprawić po
uzyskaniu rzeczywistej geometrii bez przebudowy reszty świata.

Głębokości, pogłębienia portowe, mielizny, lokalne przepływy i plaże są
modelowane na potrzeby ćwiczeń, nie z sondaży. Mosty mają założone
prześwity 7,5/6,5/3,5 m bez dokumentacji zarządców. Mapa nie jest
źródłem informacji nawigacyjnej o rzeczywistym Zegrzu.

## Logbook i zarządzanie flotą

`logbook.js` używa osobnego klucza `przystan-logbook-v1`. Bieżący save
nadal ma stary klucz i schemat. Sesja otrzymuje trwały `logbookId`, a
agregator sumuje przyrosty liczników poszczególnych łodzi. Kolejne
zapisy/wyjścia/odczyty aktualizują ten sam rejs. Zapamiętany najwyższy
stan liczników zapobiega powtórnemu naliczaniu po odczycie starszej kopii.
Dystans na wodzie, logiczne motogodziny, zużyte paliwo i liczba uderzeń
są sumowane bez danych SUV-a; po usunięciu łodzi wcześniejszy wkład zostaje.

Zachowywane są 30 ostatnich sesji i 200 incydentów, niezależnie od sum
całego użytkowania. Incydenty mają stabilne sekwencje, czas symulacji
i czas wyświetlany lokalnie. Kontakt ciągły jest jednym epizodem,
nie 120 uderzeniami na sekundę; pokazywana jest policzona energia J,
bez deklarowania nieznanej szczytowej siły. Zapis następuje razem z
okresowym autosave oraz opuszczeniem strony. Modal ma przełącznik
zapisywania; brak miejsca lub dostępu nie uszkadza zapisu samej gry.

`removeFleetBoat` usuwa dodatkowe ciało i jego liny holownicze/cumy,
przywraca stanowisko podstawowe, jeżeli to usuwane było aktywne,
i aktualizuje wspólne źródła wake. Identyfikatory nie są ponownie
używane. Ostatnia łódź oraz łódź przypisana do zestawu SUV są chronione,
aby zachować dotychczasową logikę przyczepy. Krótsze nazwy są wspólne
dla nowych menu; stare automatycznie wygenerowane nazwy są normalizowane
przy odczycie, bez zmiany parametrów lub wyposażenia starych jednostek.

## Zapis, zgodność i architektura

Wszystko działa w przeglądarce. `session-save.js` zapisuje localStorage
pod niezmiennym kluczem `przystan-session-v1`, z wersją schematu 1.
Zawiera wszystkie jednostki, silniki i godziny, paliwo, elektrykę,
uszkodzenia, zęzę, kotwice, cumy/hol, trasy/wake, SUV/przyczepę,
stan akwenu, ratownictwo, pogodę i ustawienia widoku. Główne ciało
i wspólne obiekty są ponownie łączone po odczycie. Sterowania chwilowe
są zerowane, aby nie utrzymać gazu/wybierania po powrocie.

Zapis co 30 s i przy istotnych zdarzeniach ma poprzednią kopię zapasową.
Walidacja odrzuca niezgodną skalę/schemat, błędne liczby, nadmierny
rozmiar i niebezpieczne pola. Nic nie jest naliczane za czas offline.
Nie ma synchronizacji, konta ani pliku eksportowego.

Polery nowych miejsc są wyłącznie dopisywane. Wszystkie 332 wcześniejsze
indeksy i współrzędne są sprawdzane przez fixture; stare cumy nie
przeskakują do nowego portu. Odczyt starego zapisu zachowuje stan
wcześniejszych łodzi portowych po ID i dopisuje nowe, brakujące ciała.
Brak ratownictwa w starym zapisie daje pusty stan treningowy.

Czyste nowe obliczenia: `hydro-interactions.js`, `rescue.js` oraz
rozszerzenia `towable-water.js`. Osobne adaptery sceny podają brzeg,
inne ciała i środowisko; UI nie liczy sił. Zasilanie, silniki, cumy,
kotwica i główny zapis nie mają równoległych konkurencyjnych modeli.

## Testy i wydajność

`npm test` sprawdza model, masę/zanurzenie, każdy typ napędu, prop walk/
wash, wentylację, fale, odbicia, cumy, odbijacze, szkody, bilge,
chłodzenie, elektrykę, SUV/przyczepę, załadunek, flotę i zapis.
`npm run test:e2e -- --workers=2` steruje prawdziwym Chromium:
interfejs, dotyk/pinch, klawiatura, dźwięk, konfiguracje, zapis i powrót.
`npm run test:production` bada gotowy, samodzielny HTML pod ścieżką
GitHub Pages, również na emulowanym telefonie. Nie zastępuje to testów
na każdym fizycznym urządzeniu. Nazwy starszych plików regresyjnych
pozostają technicznymi identyfikatorami testów, nie dokumentacją wydań.

`interactions-rescue.test.js` dodaje sprawdzenia kwadratu prędkości,
zaniku i limitów ssania, faktycznej siły/momentu przy kei, wzajemnych
impulsów mijania, opcjonalności, dryfu i masy MOB/koła, podjęcia,
kontaktu, limitów i zapisu. Mierzy też whip banana i materaca podczas
realnego holowania, przechył, opór na bocznej fali oraz opóźniony wake.
Audyt nowych miejsc obejmuje ląd/wodę, nasady pomostów, polery,
cumowane ciała, paliwo, starty i kompatybilność starego zapisu.
Testy przeglądarkowe obejmują dostęp do nowych miejsc i ratownictwa
oraz działające aktualne odnośniki dokumentacji.

`development.test.js` sprawdza wiatr, audio, osiągi i trym wyścigowej,
limity napędów, domyślne strumieniowe, usuwanie floty, trwałe sumy Logbooku,
ponowne odczyty i starsze kopie, faktyczne głazy, masę/przegłębienie wody,
zatrzask zwarcia, naprawę osuszonej instalacji i łagodne podejścia wyspy.
`development.spec.js` sprawdza menu i kontrolki, rzeczywiste głosy Web Audio
z BOV, obraz wiatru, Logbook po odczycie, usuwanie stanowiska, oznakowanie,
zatopioną elektronikę i widok telefonu. Starsze testy zostały dostosowane
wyłącznie do celowych nowych wymagań: limitu wyścigowej, fabrycznych
strumieniowych oraz OFF po zwarciu zamiast dawnego zapłonu.

`npm run audit:physics` wypisuje deterministyczne pomiary zachowania
zamiast tylko wyszukiwania funkcji w kodzie. `npm run benchmark`
mierzy czas CPU kroku floty i 8000 zapytań o pole wake; opcjonalnie
może wskazywać katalog `src` innego checkoutu. Wynik zależy od sprzętu
i obciążenia. Nie jest pomiarem FPS użytkownika ani obietnicą płynności.

Program i style są budowane do jednego HTML. Nie ma streamingu mapy,
zdjęć ani sampli audio podczas rejsu. Ograniczenia to CPU fizyki i
rysowanie Canvas. Wake ma indeks przestrzenny i cache tej samej
geometrii na dany czas, bez zmiany równań; test porównuje je ze
starszym niezależnym wzorcem. Minimapę odświeża się 10 Hz.

Nowe ciała Pilawy próbkują zewnętrzne pola wiatru/fal 20 Hz, a siły
kontaktu, bezwładność i cumy nadal integrują się co 1/120 s. Stare
łodzie zachowują pełne próbkowanie. Odrzucanie odległych kolizji
i niewidocznych grafik ogranicza koszt większej przystani. Nie
przyspiesza to zegara fizyki, pomp, propagacji ani ruchu.

## Źródła i pochodzenie założeń

Punkty odniesienia konstrukcji modelu, nie przeniesione współczynniki
realnych motorówek:

- [Fossen — Handbook of Marine Craft Hydrodynamics and Motion Control](https://github.com/cybergalactic/FossenHandbook),
  struktura równań manewrowych, masa dodana i siły środowiska.
- [PythonVehicleSimulator — Otter](https://github.com/cybergalactic/PythonVehicleSimulator/blob/master/src/python_vehicle_simulator/vehicles/otter.py)
  oraz [MSS crossFlowDrag](https://github.com/cybergalactic/MSS/blob/master/LIBRARY/modeling/crossFlowDrag.m),
  rozdzielenie ciągów, ramion i lokalnego oporu przekrojów. Otter jest
  USV, nie naszym profilem motorówki.
- [NREL MoorPy — Catenary](https://github.com/NREL/MoorPy/blob/main/moorpy/Catenary.py),
  ciężar w wodzie, EA, zwis i odcinek na dnie. Nasz solver jest osobnym
  uproszczeniem, nie uruchomieniem całego MoorPy.
- [MoorDyn — struktura modelu](https://github.com/FloatingArrayDesign/MoorDyn/blob/master/docs/structure.rst),
  rozdzielenie ciężaru, wyporu, sprężystości, tłumienia i wymuszeń.
- [Geoportal Zegrza](https://github.com/patrycjamormus/geoportal-zegrze),
  punkt kontroli źródeł BDOT10k/OSM i lokalizacji. Kod odsyła do lokalnego
  serwera WMS; nie dostarcza gotowego obrysu Euzebii ani układu Pilawy.
- [GeoNames](https://www.geonames.org/), dane kontroli miejscowości
  z geonamescache, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/):
  Serock 52,51036/21,0691; Nieporęt 52,43152/21,03212; Białobrzegi
  52,44199/21,05255; Wieliszew 52,4513/20,96827.
- Mapy/zdjęcia przekazane przez użytkownika i jego
  [wskazanie Euzebii przy Rządzy](https://www.facebook.com/arciechow/posts/euzebiato-najwi%C4%99ksza-wyspa-jeziora-zegrzy%C5%84skiego-le%C5%BC%C4%85ca-tu%C5%BC-przy-uj%C5%9Bciu-rzeki-rz/538736598240482/).
  To wskazanie źródła, nie deklaracja odczytania zablokowanego wpisu.

Wartości ssania, oporów, uszkodzeń, pomp, chłodzenia i granic rozruchu
są przyjętymi parametrami symulatora. Nie należy traktować ich jako
instrukcji producenta, bezpiecznych prędkości rzeczywistych uderzeń
ani oceny dopuszczalności manewru w prawdziwym porcie.
