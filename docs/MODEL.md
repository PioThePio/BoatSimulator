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
i ETA oraz bilansu Ah akumulatora (ładowania i rozładowania). `logicalDistance = physicalDistance/0.50`: 500 m mapy daje 1000 m
licznika. Motogodziny naliczane są osobno tylko pracującym silnikom.
Paliwo zużyte w kroku: `L/h × dt × 2 / 3600`.

Fizyka kadłuba, obroty, chłodzenie, chwilowe prądy i spadki napięcia, przecieki, pompa, cumy,
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
0–100% paliwa w stałym zbiorniku z tabeli, podzielonym opcjonalnie na 1/2 zbiorniki, 0–12 osób, 0–1500 kg wyposażenia.
To zakres eksperymentów, nie potwierdzenie dopuszczalności takich
konfiguracji przez producenta.

Benzyna ma 0,745 kg/l, opcjonalny olej napędowy 0,84 kg/l, woda zęzowa 1 kg/l. Zanurzenie rośnie według
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
2 × 600 KM, 450 l benzyny, trym początkowy 20%, 1,5 obrotu koła.
To umowny turbodoładowany silnik benzynowy, a nie katalogowy diesel.
Na spokojnej wodzie przy domyślnej masie i trymie 20% test 70 s daje około
164 km/h i 6800 RPM. Zakres 160–180 km/h jest celem kalibracji tej jednostki,
nie gwarancją dla dowolnego kadłuba 1200 KM. Opory, masa, trym, fala,
wentylacja i skręt nadal zmieniają osiągi. Zegary mają zakresy 200 km/h i 7000 RPM.

Stała narastania obrotów wynosi 0,22–0,38 s. Bieg jałowy: 800 RPM,
zakres wału: 6000 RPM ponad bieg jałowy, z istniejącym obciążeniem,
falowaniem i wentylacją. Doładowanie narasta osobno ze stałą 0,65 s,
opada 0,16 s i zależy od obrotów, żądania gazu i obciążenia. Rzeczywista
moc wału to `KM × 735.5 × n³ × (0.48+0.52×boost)`. Przy niskich obrotach
nie ma pełnej mocy; po rozkręceniu turbo rośnie zarówno moc, jak i dźwięk.
Ciąg jest ograniczony mocą użyteczną 68% mocy wału i charakterystyką
śruby o większym skoku; nie ma sztucznego dodawania prędkości.

Opór w ślizgu mnoży się przez `0.20 + 0.5 × clamp(abs(trim-.20)/.22,0,1)`;
w wyporności korekta zanika. To kalibracja powierzchni zwilżonej i oporu,
bez danych z prób konkretnej marki. Opór płetwy Z-etki korzysta z efektywnego
pola 0,035 m². Silnie skręcony napęd pod mocą zmniejsza boczny opór rufy
wyścigówki; efekt zanika wraz z małym ciągiem, prostowaniem napędu i dużą
prędkością. Wszystkie sekcje kadłuba nadal odbierają energię ruchowi.
Ostry zwrot wytraca prędkość i powoduje poślizg; moc nie utrzymuje 164 km/h
przy 45° wychylenia. Pozostałe profile zachowują swoją kalibrację.

Spalanie wyścigówki wynika z mocy wału: przyjęto 0,32 kg/kWh i benzynę
0,745 kg/l plus jałowy pobór. Gwizd turbo 650–2200 Hz odczytuje fizyczne
`boost` i tempo jego wzrostu. Ustalony gwizd ma wzmocnienie 0,0015×boost; podczas rozkręcania dochodzi do 0,006×boost. Towarzyszy mu filtrowany szum.
Spadek żądania gazu o ponad 0,2 przy boost >0,25 zapisuje zdarzenie BOV w kroku silnika; nie zależy od odstępu między klatkami audio. Jedno odjęcie gazu generuje jeden syk białego szumu przez 0,38 s (pasmo schodzi 2600→950 Hz). Kolejne rozpędzenie ponownie uzbraja upust.
Wyłączony silnik nie generuje doładowania ani gwizdu. Suwak Silniki,
pauza i wyciszenie obejmują cały napęd.

### Opcjonalny diesel

Benzyna pozostaje domyślna. Diesel można wybrać dla motorówki z Z-drive,
kabinowej z Z-drive/wałem i wypornościowej z wałem, również we Flocie.
Zaburtowe, waterjet, airboat i wyścigówka nie dostają przypadkowego diesla.
`combustion.js` oddziela paliwo i charakterystykę silnika od sposobu sterowania
napędem. Zachowany jest ten sam układ elektryczny, chłodzenie, trym/ster i przekładnia.

Model diesla ma 700 RPM jałowo i około 3500 RPM pod pełnym obciążeniem
(tarcza 4000 RPM). Krzywa mocy `n^2.65`, mniejszy spadek obrotów pod obciążeniem
oraz podłużna charakterystyka uciągu dają szerszy dolny zakres. Moment wału
wynika z `P / (RPM × π/30)`: większy moment przy niższych RPM nie oznacza
większej mocy znamionowej ani darmowego wzrostu prędkości maksymalnej.
Przyjęto masę silnika `115+1.05×KM` kg, paliwo 0,84 kg/l i zużycie
0,225 kg/kWh plus pobór jałowy. Większa masa silnika i paliwa zwiększa
masę całkowitą oraz zanurzenie względem benzynowego wariantu. Dźwięk
ma niższą częstotliwość i inny układ harmonicznych. Osobna warstwa szumu około 1450 Hz jest bramkowana impulsami spalania z częstością RPM/30, jako umowny czterocylindrowy czterosuw. Daje klekot, wyraźniejszy przy małych obrotach, zależny od obciążenia; gaśnie wraz z silnikiem.

Przy tej samej znamionowej mocy i właściwie dobranej przekładni diesel nie ma dodatkowej energii na śrubie. Większy moment wału wynika z niższych RPM; przełożenie i śruba przekształcają moment i obroty. W modelu różnią się krzywa częściowej mocy i regulacja pod obciążeniem, a cięższy napęd może utrudniać ślizg i pogarszać przyspieszenie. Efektywny uciąg pozostaje ograniczony mocą wału.

Punkty odniesienia: [Yanmar 4JH110](https://www.yanmar.com/marine/product/engines/4jh110/)
— 110 mhp przy 3200 RPM, [Yanmar 6LY](https://www.yanmar.com/marine/product/engines/6ly/)
— 440 mhp przy 3300 RPM; [Yanmar 4LV250](https://www.yanmar.com/marine/product/engines/4lv250/) — 250 mhp przy 3800 RPM, 334 kg bez przekładni (4JH110: 229 kg). Nasz zakres i masa są przybliżeniem kilku klas,
nie kopią tych konkretnych silników. [Go-Fast: prędkość łodzi](https://www.go-fast.com/Knowledge-base/Boat-Speed-calculator)
podkreśla wpływ masy gotowej do rejsu, mocy wału i poślizgu śruby.

Niskoprędkościowy impuls mocy (`maneuver-transient.js`) odczytuje wzrost
rzeczywistej bocznej składowej ciągu, nie same położenie manetki.
Pamięć impulsu wygasa ze stałą 0,75 s. Normalizacja narastania to
`mass × 2.2`; wzmocnienie zanika jak `(1-(|u|/5)^2)^2` do 5 m/s
i rośnie z wychyleniem steru. Zmniejsza opór poprzeczny tylnych sekcji
(maksymalny dodatkowy współczynnik 0,48) i opór obrotowy (do 42%).
Nie dodaje drugiego ciągu ani sztucznego momentu; każda sekcja nadal
odbiera energię ruchowi. Szybki wzrost ciągu mocniejszego napędu powoduje
większą odpowiedź niż powolne otwieranie gazu. Wał i airboat zachowują
własne istniejące modele. Wiosła dają dwa podłużne wysiłki po przeciwnych
burtach: suma maleje z wychyleniem, różnica obraca kadłub. Limit 90 N /
85 W; pełny skręt daje pracę przeciwną obu wioseł, N daje zerową siłę.

Dla napędu wałowego osobny ster ma powierzchnię `clamp(0.07×L×zanurzenie, 0.18, 0.55)` m² i lokalny napływ `v+yaw×ramięSteru`. Praca naprzód dodaje strumień na ster; cofanie nie daje fikcyjnego strumienia za śrubą, lecz sam wsteczny przepływ tworzy siłę normalną do płetwy. Powierzchnia jest większa w ciężkiej jednostce i daje wyraźniejszą sterowność wstecz przy faktycznym ruchu. Bez przepływu ster nie generuje siły. Prop walk jest zachowany.

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
temperatura używają fizycznych sekund, nie czasu eksploatacyjnego. Alarm wynurzonego wlotu wymaga ciągłego braku zanurzenia przez ponad 0,35 s; samo chłodzenie i temperatura nadal reagują na faktyczne zanurzenie. Krótkie rozbryzgi nie są ogłaszane jako trwała utrata chłodzenia. Prawdziwe podniesienie napędu lub długa utrata wody nadal prowadzą do przegrzania.

## Instalacja elektryczna i paliwo

Jeden akumulator zasila cały bilans: `I = odbiorniki - alternator`.
`SOC -= I × operationalSeconds(dt) / (3600 × Ah)`, czyli bilans Ah działa 2× tak jak czas rejsu. Sam prąd w A, obciążone V, rozruch i przepompowane litry nadal wynikają z fizycznego czasu 1:1. Pojemność: skuter 35 Ah; inne 80 Ah
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
Master OFF gasi silnik, zachowując kluczyk w I i zapobiegając samoczynnemu
rozruchowi po powrocie zasilania. Ruch kluczyka jest mechanicznie dostępny także bez prądu; START jest wtedy tylko chwilowym wychyleniem grafiki, bez prądu rozrusznika lub RPM. Zwarcie od zalania nadal ma osobny
zatrzask i wyłącza kluczyki. Winda jest kolejnym odbiornikiem tego samego
akumulatora: moc / (0,7 × napięcie), z małym poborem przy wydawaniu.
Przycisk pompy zmienia tylko OFF→AUTO→ON; odświeżenie telemetryczne nie
podmienia jego dzieci bez zmiany trybu, więc nie gubi kliknięcia.
Wyłączone instrumenty mają wskazówki na minimum (BAT pozostaje czynny),
a master OFF wyłącza także BAT. Odczyty cyfrowe wtedy pokazują kreskę. Wskazówki mają wyłącznie wizualną bezwładność: 1,2 s przy zmianie zasilania, 0,18 s przy zwykłej zmianie odczytu. Stopka przełączników pokazuje SOC do 0,01%, napięcie do 0,01 V i prąd netto (− pobór, + ładowanie).

Wspólny moduł `alarms.js` zasila lampkę i audio. Zapłon I bez pracy silnika daje ciągły sygnał i stałą lampkę. Woda w zęzie od 50% oraz temperatura ≥105°C dają migającą lampkę i pulsujący dźwięk. Alarmy wymagają dostępnego napięcia >9,5 V i energii z akumulatora lub alternatora; master OFF lub zwarcie je wycisza, zachowując wizualne ostrzeżenia o stanie kadłuba. Kliknięcie lampki potwierdza obecne źródła, nie usuwa awarii. Nowe źródło, nawrót po ustąpieniu, eskalacja do OVERHEAT ≥120°C lub rzeczywisty cykl master OFF/ON ponownie włącza dźwięk. Potwierdzenie jest częścią tego samego autozapisu.

Zużycie standardowego silnika benzynowego [l/h] jest empiryczne:
`0.45 + 0.003×KM + 0.29×KM×n^3×(0.55+0.45×load)`.
Dotyczy logicznej godziny; masa znika ze zbiornika zgodnie z tym samym
ubytkiem. Zbiorniki rozdzielają paliwo proporcjonalnie. Tankowanie
0,65 l/s używa czasu fizycznego i wymaga lokalnego stanowiska,
rzeczywistej cumy, prędkości ≤0,15 m/s i stacyjek OFF. Rynia i Port Nieporęt
korzystają z jednej wspólnej logiki. Stanowisko ma styczną do pomostu i normalną ku wodzie. Osiowość kadłuba, odstęp burty oraz mocowanie cumy sprawdzane są w tym lokalnym układzie, także dla ukośnego pomostu. W Nieporęcie pomost 20×2,8 m, polery i odbijacze wynikają z tej samej osi dopasowanej do brzegu. Dystrybutor przesunięto o około 5 m od wcześniejszego punktu, z lądu na pomost.

`initialFuelLitres` określa wyłącznie zapełnienie. `fuelCapacity` pochodzi z profilu łodzi, również przy dwóch zbiornikach. Wskaźnik pokazuje litry/pojemność. Przy wczytaniu starszej konfiguracji pojemność jest poprawiana bez usuwania paliwa; jeśli zapas przekracza pojemność profilu, pozostaje dawny większy zbiornik. Przeorientowanie starej cumy przy stacji zachowuje jej identyfikator, paliwo, motogodziny i akumulator.

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
włączenia. Serwis obejmuje zewnętrzną pompę 600 l/min niezależną od pokładowego zasilania, liczoną w czasie fizycznym. Naprawia poszycie i uszczelnienie, usuwa rzeczywiste litry, przelicza masę i czeka na wynurzenie pokładu przez istniejącą wyporność. Nie przestawia XY ani heave. Dopiero po osuszeniu i wynurzeniu czyści zalanie, zatrzask zwarcia i alarm; zachowuje cumy, paliwo i liczniki. Można odzyskać także stary zapis z naprawionym, ale nadal zatopionym kadłubem. Przerwanie zachowuje wykonany postęp. Zdrowy akumulator i odwracalna termika zachowują stare zasady.

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
odczyt sondy; nie gwarantuje trzymania. Brak pełnej dynamiki każdego ogniwa. `anchor-winch.js` dobiera parametry:

| Jednostka | Moc / uciąg | Wydawanie / wybieranie maks. |
|---|---|---|
| Ręczna: bez napędu / skuter | 65 W / 450 N | 0,35 / 0,18 m/s |
| Długość <4,8 m | 350 W / 1400 N | 0,55 / 0,28 m/s |
| 4,8–7,2 m | 650 W / 2200 N | 0,65 / 0,35 m/s |
| ≥7,2 m | 900 W / 3500 N | 0,75 / 0,42 m/s |

Wybieranie ogranicza także moc/napięcie liny. Elektryczna winda wymaga
master ON, SOC>4% i V>10,2. Po utracie prądu hamulec utrzymuje rode;
siły kotwicy pozostają aktywne. Są to parametry symulatora, nie dane
konkretnego katalogowego modelu windy.

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
się niezależnie w zadanym zakresie. Osłony wysp i budynków oraz
zawirowania i kierowanie przy brzegu są lokalnymi przybliżeniami.
Nie odtwarzają rzeczywistych prądów Zegrza. Niskie pomosty i wąskie odnogi nie tłumią wiatru jak ściany; ich wcześniejsze wielokrotne osłanianie nadmiernie wyciszało port. Zabudowa rzuca słabnący cień do 45 m.

`wind-loads.js` liczy cztery panele na ramionach −0,36/−0,12/+0,14/+0,37 długości kadłuba. Rozkład udziałów zależy od profilu: kabinowa jest bardziej wystawiona z przodu, wypornościowa ma bardziej równomierną zabudowę, swamp boat ma silny napór na tylną osłonę śmigła. Stosuje się prędkość powietrza względem poruszającego i obracającego się panelu. Składowe siły mają postać `0.5×1.225×Cd×A×|Vrel|×VrelComponent`; boczna powierzchnia nadal zawiera WindageFactor. Moment wynika z rzeczywistego ramienia panelu, bez losowego obracania łodzi. Przy bocznym wietrze 8 m/s domyślna motorówka otrzymuje około 147 N, kabinowa 592 N, wypornościowa 926 N; prędkość wiatru nie jest prędkością dryfu.

`wind-field.js` dodaje ciągłe, deterministyczne strefy tylko przy `spatialEffects` i niezerowej zmienności. Współrzędne są w metrach fizycznych; skale pola to 180 m wzdłuż średniego wiatru i 130 m w poprzek, adwekcja `0.8+0.18×średniaSiła` m/s. Trzy gładkie składowe przestrzenne dają 55% odchylenia, dotychczasowa regionalna zmienność czasowa 45%. Siła i kierunek korzystają z osobnych pól i pozostają w zakresach użytkownika; stałych ustawień pole nie zmienia. Nie są to sztywne komórki ani symulacja frontu burzowego. Te same lokalne warunki trafiają do sił kadłuba, zakotwiczonych jednostek, strzałek i szumu wiatru. Zapis zachowuje czas pola i parametry, bez losowania nowej pogody po Kontynuuj.

Łódź zachowuje wektor prędkości X/Y. Nie ustawia go automatycznie w osi dziobu. W równomiernym prądzie, po wyrównaniu prędkości z wodą, prostoliniowe przesuwanie jest prawidłowe. Przy przeszkodach `current-shear.js` próbkuje prąd na dziobie/rufie co 0,05 s; różnica bocznego przepływu zmienia siły rozłożone na 13 sekcjach kadłuba i generuje moment. Integracja ruchu nadal odbywa się 120 Hz.

Zwykła fala to suma trzech składowych o okresach 2,8/1,9/3,9 s,
z wysokością, kierunkiem, orbitalnymi prędkościami i przyspieszeniami.
Fale wymuszają heave, roll i pitch oraz chwilowe zanurzenie napędu.
Heave jest wizualizowany także subtelną zmianą wielkości łodzi. W trybie AUTO wysokość jest przybliżona przez `min(0.55, 0.004×|wiatr−prąd|²)`, z umownym stałym rozbiegiem; model nie prognozuje narastania fal przez wiele godzin ani rzeczywistego rozbiegu dla konkretnego kierunku na Zegrzu. Sama jednostajnie płynąca woda przy bezwietrznej pogodzie nie tworzy dużej fali.

`wave-current.js` rozwiązuje dyspersję `(omega−kU)²=gk tanh(kh)`: przeciwny prąd skraca falę i zwiększa stromiznę, zgodny wydłuża ją. Wzrost wysokości wynika z przybliżonego zachowania strumienia działania falowego, ograniczonego do 1,65; przy blokowaniu fala traci energię, a stromizna `A×k` nie przekracza 0,23. Trzy regionalne składowe mają referencyjną głębokość fazy 3 m; rzeczywista lokalna głębokość zmienia ruch orbitalny. Nie liczy się `k(x)×x` od nowa dla każdej próbki dna, bo taki skrót wytwarzałby fałszywe szybkie oscylacje. Nie ma pełnego modelu refrakcji ani łamania fal. Zmienny prąd przy pomostach nadal działa na kadłub i obiekty; regionalna faza pozostaje spójna. Niezmienne widmo jest buforowane maksymalnie w 512 wpisach.

Kierunek i liczba falowa istniejącego morza korzystają ze średnich, regionalnych parametrów ustawionych zakresów (`waveReference`), a nie z lokalnych podmuchów. Wysokość AUTO nadal reaguje na zmienną siłę. Zapobiega to natychmiastowemu obrotowi fal w strefie i fałszywym oscylacjom `k(t)×pozycja` daleko od początku mapy. Nie jest to model stopniowego narastania nowego widma po zmianie kierunku. Wysokość w prawym górnym panelu (`waveHeightAt`) sumuje wysokości tych samych trzech składowych po osłonie, wpływie prądu i ograniczeniu stromizny; na lądzie jest zerowa. Nie pokazuje chwilowego heave ani samej amplitudy jednej składowej.

Przechył dodatni podnosi prawą burtę, opuszcza lewą. W ślizgu prawy zakręt daje przechył ujemny, czyli na prawą burtę. Samo ścieśnienie przez `cos(roll)` nie rozróżnia znaków, więc grafika przesuwa nadbudówkę zgodnie z `−sin(roll)×wysokość` i zaznacza zanurzoną/unoszoną burtę. Obok schematu dziobu jest przekrój poprzeczny i odczyt stopni L/P. Docelowy przechył w zakręcie ma limit zależny od profilu (motorówka około 11,5°, kabinowa 10,3°, skuter 16°), tłumienie 0,62; fala i wiatr nadal dodają własne wymuszenie. Wiatr przechyla kadłub w stronę, w którą pcha nadwodną część. Pochylenie dziobu korzysta z rzeczywistego przyspieszenia wzdłuż kadłuba, nie pochodnej prędkości w obracającym się układzie; wkład hamowania jest ograniczony do −0,03 rad.

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
zawias/restytucję oraz własną bezwładność; nie są nieruchomymi obrazkami. Zacumowane jednostki próbkują też orbitalną prędkość wody, więc cykl fali napina/luzuje linę i dociska/odciąża odbijacz. Nie ma wymuszonego losowego odsuwania od pomostu.

Boja cumownicza ma efektywną bezwładność 140 kg i kotwiczenie `k=2500+22000×max(0,d−0.15)²` N/m, tłumienie 1000 Ns/m oraz ograniczony zasięg 0,55 m. Napór cumy pochyla oko boi. Kadłub dotyka miękkiego pływaka o promieniu 0,42 m przez sprężynę 12 kN/m i tłumienie, z przeciwnym impulsem na łódź; kontakt nie jest twardym uderzeniem w pomost. Grafika pokazuje pływający korpus, oko i wodnicę. W Nieporęcie boje każdego rzędu leżą 12 m od osi własnego pomostu; długość cumy zależy od długości łodzi. Odczyt starego zapisu przenosi punkt kotwiczenia z zachowaniem pozycji łodzi oraz dotychczasowego luzu cumy.

Zejście ze ślizgu przy hamowaniu powyżej 0,4 m/s² lub mocne hamowanie śrubą powyżej 1,2 m/s² emituje pojedynczą falę z przodu (przy ruchu wstecz z rufy). Pakiet ma maksymalną amplitudę 0,42 m, prędkość 2–4,8 m/s, tłumienie `exp(−wiek/6)`, zanika po 14 s. Dociera do innych ciał z opóźnieniem; kolejne zmniejszanie gazu w tym samym epizodzie nie produkuje niekończących się fal.

Odbicia wykorzystują lustrzane źródła od skończonych odcinków, najwyżej
dwa odbicia. Twarde pomosty mają współczynniki około 0,56–0,64, naturalny
brzeg 0,34, łagodna plaża 0,08, dodatkowo energia szybko maleje z drogą
i liczbą odbić. Nie ma niekończącego się wzmacniania fal. Most jest
rysowany nad wodą; kolidują jego podpory, nie cały przelot.

## Wizualna i akustyczna reakcja na wiatr

`render-weather.js` rozdziela trzy warstwy. `surface-weather.js` wyznacza krótkie strzałki zgodne z lokalnym wektorem wiatru (6–10 px, maksymalnie 40 w kadrze), wygięte, półprzezroczyste pasma grzbietów oraz niewielkie, nieregularne skupiska piany. Grzbiety poruszają się według dominującej fazy `k×n.dot(pozycja)−omega×czas`, nie według prędkości strzałek. Piana jest ograniczona do 14 skupisk, ma gładki cykl zanikania i pojawia się na części grzbietów przy wietrze powyżej 6 m/s. W oddaleniu pomijane są szczegóły, zamiast generować tysiące fal. To przybliżenie wyglądu, bez zmiany sił wake, cum i kolizji.

`wind-response.js` ustala subtelne przyciemnienie tafli i ilość piany. Znaczniki prądu pozostają osobną turkusową warstwą. Przełącznik „Znaczniki wiatru i piana” ukrywa strzałki, pianę i przyciemnienie; nie wyłącza fizyki wiatru ani obrazu ręcznie ustawionych fal.

Szum powietrza to biały szum przez filtr dolnoprzepustowy. `windSound` wyznacza gain liniowo `0.004×lokalnaPrędkośćWiatru`, cutoff `250+95×prędkość` Hz. Przy zerze i wyłączeniu szumu gain jest zerowy; wygładzanie Web Audio ogranicza trzaski. Zmiany nie przebudowują dźwięków silników, manetek ani stacyjki.

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
Długość 0,6–60 m, podłączenie do 20 m, ręczne wybieranie do 450 N/65 W,
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
Rzut dziedziczy prędkość łodzi i dodaje 1,5 m/s na losowo wybraną burtę;
druga burta jest próbą awaryjną przy przeszkodzie. Losowy alarm używa
czasu fizycznego, 30–180 s, zapisuje oczekujące zdarzenie i uruchamia trzy
impulsy audio z odstępem 0,22 s. Odczyt istniejącego obiektu nie powtarza alarmu.

Lokalny prąd (`local-water.js`) jest sumą istniejącego prądu, rozchodzących
się strug śrub/strumieniowych, małego transportu wake i fali hamowania.
Strugi używają rzeczywistego ciągu, kąta, biegu i zanurzenia każdego
napędu. Prędkość wylotowa `sqrt(2T/(rho×A))` jest ograniczona do 8 m/s,
struga poszerza się o 0,16 m/m i słabnie z odległością. Zasięg śruby do
18 m, strumieniowego do 7 m; wypadkowy prąd lokalny ograniczono do 8 m/s.
Strumieniowy wypycha wodę przeciwnie do reakcji kadłuba. Airboat nie ma
strugi podwodnej. Prąd napędza istniejący opór obiektu, nie teleportuje go.
Wymuszenie przyspieszeniem fali ma mnożnik 0,42 (z umownej masy dodanej),
a orbitalny przepływ 0,85. Te efekty nie tworzą drugiej siły na łodzi.

`braking-waves.js` emituje ograniczony impuls dziobowy po hamowaniu
>1,2 m/s² z prędkości >2 m/s, nie częściej niż co 0,8 s. Maksymalna
amplituda 0,42 m, prędkość frontu 2–4,8 m/s, czas życia 14 s, limit
16 impulsów. Front ma ograniczoną szerokość, silniejszy przód i tłumienie
wykładnicze/geometr. Z daleka obiekt reaguje dopiero po nadejściu fali.
Transport bezpośredniego wake jest rzędu `3×(A/sigma)^2×c`, ograniczony do
0,65 m/s i uśredniany między nakładającymi się segmentami. To przybliżenie
ruchu pływającego obiektu, nie model CFD ani ocena sił działających na człowieka.

Podejmowanie wymaga ≤1,7 m od obrysu kadłuba, względnej prędkości
≤0,55 m/s dla pewnego podjęcia na N. `rescue-attempts.js` oddziela
możliwość kliknięcia od szansy powodzenia. W zasięgu ≤1,7 m próba jest
możliwa także przy nadmiernej prędkości. Prawdopodobieństwo na N wynosi
`1-smoothstep((v_rel-0.55)/0.85)`, ograniczone do [0,1]: 100% do
0,55 m/s, 0% od 1,4 m/s. Na F/R mnożnik wynosi 0,8. Losowanie jest
wstrzykiwane do funkcji, aby testy były deterministyczne. Niepowodzenie
nie zmienia pozycji/sił obiektu i nie oznacza podjęcia; ponowienie po
1,2 s fizycznego czasu. Udane podjęcie na biegu nadal kosztuje 30 pkt. Limit 12 aktywnych obiektów, ograniczona
historia 16 podjętych. Kontakt z kadłubem odpycha lekki obiekt i jest
liczony w treningu; nie uszkadza automatycznie łodzi. Telemetria używa
prędkości punktu podejmowania (`v + omega × arm`), a zbliżanie jest
rzutem względnej prędkości na linię kadłub–obiekt. Luz sprawdza rzeczywisty
bieg i polecenia obu manetek.

`rescue-metrics.js` odczytuje prędkość normalną przed miękkim odepchnięciem.
Siła szczytowa jest szacowana przez `m_eff × v_normal² / d`, gdzie masa
obiektu uwzględnia istniejącą masę dodaną ×1,7, a `m_eff` jest masą
zredukowaną łódź–obiekt. Umowna droga ugięcia: koło 0,08 m, manekin
0,12 m. Jest to niezależne od kroku czasu oszacowanie trójkątnego impulsu
siły, nie pomiar siły ze sztywnego solvera ani model urazów. Nie zmienia
istniejącego odepchnięcia obiektu i sił kadłuba. Każda łódź ma oddzielne
kontakty z obiektem; ciągły kontakt nie jest nowym uderzeniem co klatkę.

Wynik to 100 minus: do 40 pkt za kwadrat prędkości podjęcia / 0,55 m/s,
do 50 pkt za siłę szczytową / 1000 N oraz 10 pkt za kontakt na biegu i 30 pkt za podjęcie bez N.
Dodatkowa łączna kara za nieudane podejścia jest ograniczona do 30 pkt.
Każda nieudana próba kosztuje `3+5×risk+3×inGear+2×proximity`, a minięcie
bez kliknięcia `3+6×risk+3×inGear+2×proximity`; risk rośnie liniowo między
0,55 a 1,4 m/s, proximity między odległością 1,7 a 0 m.

Histereza bliskiego minięcia: wejście ≤1,7 m, wyjście >2,4 m; wymagane
rzeczywiste zbliżanie >0,03 m/s i ruch łodzi >0,05 m/s. Sam rzut z
nieruchomej łodzi nie tworzy nieudanej próby. Rejestrowane są minimum
odległości, względna prędkość przy nim, stan biegu i brak kliknięcia.
Oceniana jest tylko aktualnie sterowana jednostka; łodzie bierne i holowane
nadal oddziałują fizycznie na obiekt, ale nie naliczają kary za brak kliknięcia.
Kliknięta próba oznacza ten epizod jako obsłużony, więc nie dopisuje się
drugiej kary za to samo odpłynięcie. Ostatnich 60 prób jest w stanie SAR,
nieudane trafiają do Logbooka razem z komunikatem przyczyny. Dane i
oczekujące epizody są walidowane i zachowane w autozapisie.
Wynik, czas fizyczny, prędkość, siła i kluczyki/biegi silników są zapisane
w stanie SAR oraz zdarzeniu Logbooka. Zachowano klucz i wersję autozapisu;
dodatkowe pola są opcjonalne dla starych sesji. Obiekty korzystają
ze wspólnego pola fal i wake. Limity podjęcia są kalibracją gry.
Nie twierdzimy, że 0,55 m/s, 1,4 m/s albo 1,7 m stanowią zalecenie
RNLI, RYA czy BoatUS. Prawdopodobieństwa są mechaniką treningową.
To nie jest symulacja zachowania człowieka.

Stały odczyt nacisku na dno jest `groundLoad / 9.81` kg; nie dodaje
nowej siły ani obciążenia. Chłodzenie korzysta z zanurzenia wlotu
i `intakeClearance = bottomDepth + intakeZ`; wlot poniżej dna ogranicza
przepływ do 20%. Samo `grounded` nie ogranicza chłodzenia; nadal zwiększa
obciążenie termiczne przy pracy na dużym gazie w miejscu. Ostrzeżenie
nie radzi opuszczać napędu, gdy niskie położenie nie jest przyczyną.

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

Na postoju kontakt lewego/prawego koła hamowanej osi oraz podpora dyszla rozwiązują dwuwymiarowe impulsy z ograniczeniem Coulomba μ×N×dt. Budżet impulsu jest wspólny dla 20 iteracji, więc nie mnoży się z ich liczbą. Utrzymuje położenie i obrót w granicach przyczepności, ale duża zewnętrzna siła może przesunąć zestaw. Ręczny działa na tył SUV-a, P na obie osie; odpięta przyczepa ma hamulec i podporę. Nacisk podpory i osi sumuje się do ciężaru. Kolizje drogowe również korzystają z rzeczywistego obróconego obrysu pomostów.

Osobny reset odpiętej przyczepy zeruje jej ruch i uszkodzenie zaczepu na stanowisku parkingowym, zachowuje samochód i zwodowaną łódź. Audio SUV-a jest przechowywane w WeakMap, poza zapisywanym stanem: nie tworzy cyklicznego odwołania blokującego JSON/autozapis.

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

**Euzebia** używa obrysu OSM way 193668247 (PRNG 29584). Środek obwiedni
52,4779419 N / 21,07161465 E, obwiednia około 162×162 m w rzeczywistości,
81×81 m na mapie 50%. Współrzędne są przeliczone przez istniejący
`fromGeo`, bez dopasowywania wyspy do wymyślonej elipsy. Zachowano
zachodnie/południowe łagodne podejścia, pięć drzew, płycizny z nachyleniem
0,085–0,21 i dwie kępy szuwarów. Płytki pas wody korzysta z rastra
`bottomAt` 2 m; odcień mokrego piasku jest odrębny od suchej plaży.

### Ujście Kanału Żerańskiego i porty

To jeden powiązany obszar, a nie niezależne generowane zatoki. Odtworzono go
z przesłanych map i zdjęć satelitarnych, porównanych z geometrią OSM.
Na szerokim zrzucie odcinek 100 m zajmuje około 130 pikseli: około 0,77 m/piksel.
Zbliżenia dopasowano przez wspólne końce osłon, most i brzegi basenów;
nie przenoszono między nimi samych odległości w pikselach. Północ jest u góry.
Wektory brzegu są z ways 1318889433 / 1318889432 relacji zbiornika 2329494,
a kanału z way 107588782. Granice działek i obrys opisany `leisure=marina`
nie służą jako automatyczna maska wody.

`projectNieporet` korzysta z dotychczasowego `fromGeo`. Kotwica to
52,433 N / 21,038 E, osie pozostają te same, bez obrotu i bez rozciągania
jednej osi. W całym wspólnym fragmencie metr geometrii odpowiada metrowi
fizycznemu: `anchor + (fromGeo(point)-anchor)/0.5`. To zachowuje wymiary
brzegu, kanału, pomostów i odstępów względem nieskalowanych kadłubów.
Reszta atlasu nadal ma geograficzne 50%; połączenia obrysów leżą poza
szczegółowym fragmentem. `nieporetToGeo` jest odwrotnością lokalnej transformacji.
Globalny czas fizyki 1:1 i istniejące liczniki eksploatacyjne ×2 pozostają bez zmian.

Kanał ma asymetryczne brzegi i przewężenie na południe. Most drogowy w ciągu
ul. Zegrzyńskiej ma oś z way 107588848, a kolejowy — z way 99750424.
Oba pokłady mostów są nad wodą. Nie dodano podpór w wodzie; końcowe przyczółki
są rysowane i zderzane z tych samych obróconych odcinków. Przyjęte szerokości
pokładów 11 / 7 m, przyczółki 3,5 m i prześwity 3,5 / 4,5 m są oszacowaniami
symulacji, nie pomiarem z widoku z góry. Prześwit nie jest modelem kolizji masztu.

**Port Nieporęt** jest większym, nieregularnym basenem na wschód od półwyspu.
Ma północne otwarcie, występy i zatoczki od wschodu oraz zaokrąglone południe.
Sześć pomostów od zachodu ma źródłowe kierunki i długości około 24–37 m;
długi pomost od wschodu ma około 71,8 m (way 711114031). Są też krótkie
pomosty przy zatoczkach. Główne szerokości 2,1–2,4 m są przyjęte z geometrii
pomostów; wąskie odnogi 0,45 m i długości około 8 m są uproszczeniem zdjęć.
Rozstaw wynosi około 4–5 m; liczba drobnych odnóg nie jest inwentaryzacją.
19 jednostek różnych typów stoi na osobnych cumach, pozostawiając wolne miejsca.

Osłona przy „Zatopionych Barkach” wykorzystuje obrys way 974972779,
włączony do wspólnego brzegu. Przyjęto ją jako stałą osłonę z dostępnymi
punktami cumowania. OSM opisuje ją jako hulk/floating breakwater; sposób
posadowienia i ruchomość nie wynikają pewnie ze zdjęcia. Nie dodano tam
drugiego drewnianego pomostu ani niewidocznych podpór.

**Pilawa** jest osobnym, wąskim basenem dalej na północny wschód.
Zachowano zakrzywioną zachodnią osłonę, zamknięty południowy koniec i wejście
na północnym końcu. Pomosty leżą przy wschodnim brzegu; środkowy ma trzy
poprzeczne odnogi zgodne z way 1052289092, a południowy z way 1052289095.
Krótki północny pomost (około 7 m) jest oszacowany ze zdjęcia. Dokładna
liczba drobnych stanowisk oraz aktualna obsada pozostają uproszczeniami.
Trzy zacumowane jednostki pokazują obsadę bez zablokowania wejścia.

**Wodna stacja ORLEN** znajduje się przy zachodniej kei większego Portu Nieporęt,
w miejscu czerwonego zaznaczenia. Punkt OSM 2818500152 ma współrzędne
52,4358481 N / 21,0412369 E. Stanowisko ma 20 m kei, polery i pięć odbijaczy.
Nie jest to drogowy ORLEN przy rondzie ani stacja w osobnej Pilawie.
Stary identyfikator techniczny `pilawa-fuel` pozostaje aliasem dla zgodności
zapisów; na mapie i w obsłudze jest tylko jeden lokalny punkt tankowania.

Nie powiększono niezależnie żadnego basenu ani wejścia. Głębokości są
wyłącznie treningowe: mokre baseny mają co najmniej 2,7 m poza krótkim
przejściem przy brzegu, tor kanału co najmniej 3,2 m. Suchy ląd nadal jest
suchy; pogłębianie nigdy nie otwiera przejazdu przez półwysep. Kolory wody
w tym fragmencie korzystają z cache `bottomAt` 3 m i dokładnego klipu brzegu.
Stare uproszczone maski i umowny most/kanał zostały zastąpione.
Istniejący pomost plażowy przy zachodnim łączeniu atlasu dosunięto do brzegu;
to nadal umowne miejsce treningowe. Wymiary łodzi, SUV-a, przyczepy i slipu
pozostają bez zmian.

Porównywalne widoki z północą u góry i podziałką fizycznych metrów:

- [Ujście, oba mosty i oba baseny](images/nieporet-overview.png)
- [Port Nieporęt, pomosty i wodna stacja](images/nieporet-basin.png)
- [Pilawa, wejście i pomosty](images/pilawa-basin.png)
- [Poprawione zegary w konsoli](images/cockpit-gauges.png)

`npm run capture:map` odtwarza te zrzuty z działającego renderera. W grze nie
ma zdjęcia jako tekstury ani referencyjnej nakładki. Przy porównaniu zachowano
asymetrię ujścia, kąty pomostów, oba wejścia, końce osłon oraz zatoki wschodnie.
Najmniej pewne są drobne odnogi, pomost północny Pilawy i detale konstrukcyjne.

Ukośne pomosty mają obwiednie AABB wyłącznie do odrzucania odległych
obiektów. `solid-geometry.js` liczy kontakt w ich obróconym lokalnym
układzie, zwracając rzeczywistą normalną. Tę samą geometrię wykorzystują
kadłub, odbijacze, obiekty SAR, umieszczanie floty, przepływ przy kei,
odbicia fal i renderowanie. Dawne osiowe prostokąty zachowują te same
równania kontaktu. Nie powstaje niewidzialna prostokątna ściana obok
ukośnego pomostu.

Statyczna siatka kontaktów odrzuca odległe pomosty, zachowując kolejność
i dokładne równania kontaktu. Wybór czterech najbliższych powierzchni odbicia
nie sortuje już całej listy odnóg; wynik jest porównywany z pełnym skanem
w testach. Minimapę rysuje się z tego samego brzegu, bez kosztownej lokalnej
warstwy głębokości. Łodzie stojące równolegle w Pilawie mają cumy burtowe
i szpringi w obu kierunkach, korzystające z istniejącego modelu lin.

Dane wektorowe odczytano z API OSM 25 października 2026 i porównano
z materiałami użytkownika. `site-geography-data.js` zawiera Euzebię,
a `nieporet-reference.js` wspólną geometrię ujścia. © OpenStreetMap contributors,
ODbL 1.0; atrybucja jest również na mapie. To rekonstrukcja treningowa,
a nie bieżący pomiar geodezyjny lub batymetryczny.

Głębokości, pogłębienia portowe, mielizny, lokalne przepływy i plaże są
modelowane na potrzeby ćwiczeń, nie z sondaży. Mosty mają założone
prześwity 7,5/6,5/3,5/4,5 m bez dokumentacji zarządców. Mapa nie jest
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
`restore-history.js` dodaje osobny klucz `przystan-restore-history-v1`:
co najmniej 29 s między punktami, maksymalnie 13 punktów, gzip/base64 przez
CompressionStream (surowy zapis jako fallback). Budżet 1,4 mln znaków,
priorytet punktów bliskich 30/180/300 s przed ostatnim zapisem. Przycisk
nie wybiera kopii starszej od celu o ponad 45 s. Błąd kompresji/limitu
nie usuwa podstawowego zapisu. Przy zamknięciu strony synchronizowany
jest przede wszystkim bieżący stan; asynchroniczna historia może nie
zdążyć się dopisać. Walidacja podczas zapisu używa tych samych warunków
co odczyt, bez tworzenia całego świata wyłącznie na potrzeby sprawdzania.

Indeksy i tożsamości dawnych polerów są zachowane. Wyjątkiem od dawnych
współrzędnych są obiekty przebudowanego obszaru: pomost zachodni, plażowy
oraz błędnie nazwana wcześniej marina. Migracja `siteGeometryVersion=3`
przenosi powiązane łodzie i osprzęt do poprawionych punktów. Sprawdza też,
czy dawny obrys kadłuba nie przecina nowych odnóg; w razie potrzeby szuka
najbliższego wolnego położenia. Dawny umowny kanał przywracany jest do
bezpiecznej wody nowego ujścia. Przeskalowanie nie resetuje motogodzin,
paliwa, SOC, kluczy stacyjek, czasu rejsu, uszkodzeń ani dziennika.
Nowe polery i jednostki portowe są dopisywane. Odczyt starych zapisów
z Euzebii zachowuje wcześniejszą migrację. W pozostałych portach stan
zacumowanych jednostek nie jest resetowany.

Odizolowane obliczenia: `hydro-interactions.js`, `rescue.js` oraz
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

`sar-feedback.test.js` weryfikuje chłodzenie przy rzeczywistym osiadaniu
w szuwarach, kontakt wlotu z dnem, zbliżanie i obrót punktu podejmowania,
rzeczywiste N, siłę kontaktu, scoring, Logbook i kompatybilny zapis SAR.
`sar-feedback.spec.js` sprawdza stały nacisk kg, położenie ostrzeżeń na
telefonie/desktopie, linię celu, podjęcie z mapy, wynik i Kontynuuj.
Dawne testy dolnego panelu cumowania używają teraz prawdziwego klikania
polerów i knag na mapie, z zachowaniem testów wybierania/luzowania,
serwisu i tankowania.

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
Profilowanie przeglądarki obejmuje także renderowanie, sterowanie i telemetrię.
W kontrolowanej spokojnej scenie 1440×1000, z CPU Chromium spowolnionym ×4,
mediana klatki zmalała około 200→50–67 ms (około 5→15–20 kl./s). To obciążający test,
nie wynik dla komputera użytkownika ani gwarancja 60 FPS. Pomiar CPU floty
z wiatrem, prądem i holowanym bananem zmalał około 3,2→1,9 ms/krok;
suma kontrolna wake pozostała 0,6842715283806693.

Optymalizacje nie zmieniają kroku 1/120 s: buforowane są dokładne zapytania
brzegu/dna (bez zaokrąglania współrzędnych), osłona i lokalny prąd korzystają
z indeksu przestrzennego, a nie pełnego skanu pomostów. Zmiana kąta slipu
unieważnia cache dna. Boje obu nowych portów próbkują pole co 0,05 s,
a siły, sprężyny i ich ruch są nadal całkowane 120 razy na sekundę.

Całkiem nieruchoma zacumowana łódź o zerowych siłach pomija zerowe obliczenia;
pierwsza fala, wiatr, ruch polera/boi, zmiana liny lub kontakt przywraca normalne
obliczenia. Statyczną kolizję można pominąć tylko gdy suma przesunięcia
kadłuba i maksymalnego przesunięcia od obrotu jest mniejsza od dokładnie
zmierzonego odstępu. Kontaktujące odbijacze zawsze trafiają do solvera.
Nieruchomy teren jest buforowany na Canvas; ruch kamery/zoom odświeża bufor
po wyjściu poza jego zakres. Zmarszczki rysuje się w klipie wspólnej geometrii
wody, bez zapytania fizycznego dla każdej kreski. To optymalizacja obrazu,
nie nowa maska kolizji. `npm run benchmark:browser -- --cpu=4` mierzy klatki
lokalnego serwera; `--seconds=5` ustala długość próby.

Regresje `engine-performance.test.js` obejmują realną prędkość/RPM/moc,
boost, zarzucanie rufy, diesla i zachowanie postępu przy odczycie starej
wyścigówki. `performance-regression.test.js` sprawdza cache boi,
wybudzanie cum, konserwatywne pomijanie kontaktów i zmianę kąta slipu.
`engine-cockpit.spec.js` sprawdza tarcze, sąsiedztwo manetek, wybór diesla,
kontynuację oraz unieważnianie wizualnego cache terenu.

`service-alarms.test.js` sprawdza zasilanie i potwierdzanie alarmów, nowe źródła i eskalację, zapis zatrzasku, bilans akumulatora 2× przy pompie 1:1, rzeczywiste zatonięcie/naprawę/wynurzenie/rozruch, stary stan pod wodą, anulowanie i odczyt częściowej naprawy oraz klasyfikację komunikatów. `service-alarms.spec.js` mierzy mapę i cztery kolumny przy 390–1440 px, testuje lampkę, rzeczywiste próbki alarmu Web Audio, animację wskazówek, widoczny ubytek SOC, umiejscowienie informacji/awarii oraz pełną naprawę i Kontynuuj. Testy bilansu w `operations-v21.test.js` i `power-v23.test.js` wymagają teraz czasu eksploatacyjnego wyłącznie dla Ah.

Mapa zajmuje minimum 52% wysokości okna; konsola ma najwyżej 48% i może przewijać się wewnętrznie na niskim ekranie. Zęza i zanurzenie tworzą wspólny blok, a kierownica, napęd, zegary i węższy stan kadłuba pozostają obok siebie. Neutralne informacje są u góry mapy; awarie i uszkodzenia w dolnym pasku (żółty/czerwony). Oba miejsca korzystają z istniejącego komunikatu, bez powielania zdarzeń.

Program i style są budowane do jednego HTML. Nie ma streamingu mapy,
zdjęć ani sampli audio podczas rejsu. Ograniczenia to CPU fizyki i
rysowanie Canvas. Wake ma indeks przestrzenny i cache tej samej
geometrii w konserwatywnych przedziałach 0,1 s; dokładne fronty
są nadal liczone w fizycznym czasie zapytania i współdzielone dla
identycznego czasu, bez zmiany równań; test porównuje je ze
starszym niezależnym wzorcem. Minimapę odświeża się 10 Hz.

Jednostki w szczegółowych portach próbkują zewnętrzne pola wiatru/fal 20 Hz, a siły
kontaktu, bezwładność i cumy nadal integrują się co 1/120 s. Stare
łodzie zachowują pełne próbkowanie. Odrzucanie odległych kolizji
i niewidocznych grafik ogranicza koszt większej przystani. Nie
przyspiesza to zegara fizyki, pomp, propagacji ani ruchu.
Kontakty odrzucają odległe prostokąty/Y-bomy przed dokładnym solverem.
Nabrzeża mają indeks przestrzenny; obrys wody i wysp korzysta z Path2D,
drobne zmarszczki z dwóch zbiorczych ścieżek zamiast osobnego stroke na
każdy fragment. Niewidoczny raster płycizn Euzebii nie jest generowany.
Schemat kontaktów pomija niezmienione atrybuty DOM, zachowując animację
błysku 20 Hz. Aktualizacja parametrów audio jest 30 Hz, z ograniczaniem
kolejki AudioParam. Cztery dodatkowe głosy silników mają zanik
`0.55/(1+(distance/18)^2)` i zasięg 140 m, bez dublowania szumu środowiska.

`helm-sar-refinements.test.js` sprawdza impuls/rampę i brak dodawania energii,
rzeczywisty obrót i poślizg, różnicowe wiosła, kierunek/zanik strug, reakcję
koła, opóźnioną falę hamowania, losowy alarm, karę i log za bieg, kompresję
oraz wybór kopii, pobór windy i hamulec, dźwięk zależny od dystansu,
ucho skutera i zgodność pola wake wewnątrz przedziału cache. Odpowiedni
plik `.spec.js` bada brak przewijania strony, pompę podczas odświeżania,
opadanie wskazówek, zachowanie kluczyka, światła, SAR, odczyt wybranej
kopii i rzeczywiste próbki Web Audio.

`rescue-port-refinements.test.js` sprawdza zasięg 1,4 m przy szybszym
podejściu, granice szans, deterministyczne niepowodzenie/ponowienie,
F/R, karę zależną od ryzyka, pojedyncze minięcie bez kliknięcia, zapis
prób, odrzucanie uszkodzonego stanu, prawdziwe ukośne kontakty, obrys
PRNG/OSM Euzebii i zachowanie identyfikatorów polerów. Sprawdza wolną
drogę o średnicy 11,2 m do paliwa między rzeczywistymi przeszkodami i
zacumowanymi łodziami. Motorówka fizycznie przepływa trasę bez kolizji,
a pięć profili cumuje, pozostaje na wodzie i tankuje. Testy obejmują też
migrację istniejącej cumy i nowy limit rzutu holu 20 m. Plik `.spec.js`
sprawdza te menu w Chromium, logi niepowodzeń, suwaki przy 360–1440 px,
zawartość tarcz, przycisk cumowania i powiększone światła.

Testy `environment-handling.test.js` / `.spec.js` obejmują 8 m/s naporu i ramiona wiatru, dryf po skosie, brak sztucznego obrotu w jednorodnym prądzie, moment od gradientu, przechył do wnętrza zakrętu, chłodzenie dwóch napędów, dyspersję i blokowanie fal, pracę zacumowanej łodzi na odbijaczach, ugięcie i potrącenie boi, liniowość rzędów boi, zgodność zapisu, cofanie ze sterem wałowym oraz pojedynczą falę hamowania. Kontrolowany test wynurzania śruby ustawia jawnie poziome położenie kadłuba, zamiast dziedziczyć jego dawny błędny kąt po hamowaniu.

`weather-surface.test.js` i `.spec.js` sprawdzają rozdzielenie strzałek/fal/piany, kierunki N/E/S/W, ograniczenie liczby i długości znaków, zgodność grzbietów z fazą, cykl piany, niezależne zakresy stref, ich adwekcję i ciągłość, rzeczywiste siły i zachowanie pędu, lokalny dźwięk, zgodność Kontynuuj, stabilność fal daleko od początku mapy, wysokość w panelu oraz układ telefonu. Starszy test renderowania rozpoznaje nowy kolor strzałek, nadal wymagając osobnego ruchu wiatru i prądu przy wyłączonej fali. Test dawnego zagęszczania kresek sprawdza teraz ograniczoną liczbę strzałek i kolor tafli, zachowując kontrolę rzeczywistych próbek audio. Test mostu wstrzykuje kontrastową falę przez nową operację wypełnienia pasma i nadal wymaga, żeby most ją przykrył.

## Źródła i pochodzenie założeń

Model względnych prędkości, sił i momentów: [Thor I. Fossen — Marine Craft Model](https://www.fossen.biz/html/marineCraftModel.html). Odniesienie prędkości wiatru i stanu morza: [Met Office — Beaufort scale](https://www.metoffice.gov.uk/weather/guides/coast-and-sea/beaufort-scale). Skala stanu otwartego morza nie jest używana wprost jako wysokość fal na jeziorze. Współczynniki poszczególnych rekreacyjnych kadłubów, rozkłady nadbudówki i progi alarmów pozostają jawnymi założeniami treningowego modelu.

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
- [Euzebia — OSM way 193668247 / PRNG 29584](https://www.openstreetmap.org/way/193668247),
  [Port Pilawa — way 871129082](https://www.openstreetmap.org/way/871129082),
  [Port Nieporęt — way 871129083](https://www.openstreetmap.org/way/871129083),
  [kanał — way 107588782](https://www.openstreetmap.org/way/107588782),
  [most drogowy — way 107588848](https://www.openstreetmap.org/way/107588848),
  [most kolejowy — way 99750424](https://www.openstreetmap.org/way/99750424),
  [ORLEN — node 2818500152](https://www.openstreetmap.org/node/2818500152),
  [zbiornik — relation 2329494](https://www.openstreetmap.org/relation/2329494).
  Dane OSM/PRNG odczytane przez API 2026-10-25; współrzędne i ID pomostów
  są zachowane w pliku danych. [© OpenStreetMap contributors / ODbL 1.0](https://www.openstreetmap.org/copyright).
- Mapy/zdjęcia przekazane przez użytkownika i jego
  [wskazanie Euzebii przy Rządzy](https://www.facebook.com/arciechow/posts/euzebiato-najwi%C4%99ksza-wyspa-jeziora-zegrzy%C5%84skiego-le%C5%BC%C4%85ca-tu%C5%BC-przy-uj%C5%9Bciu-rzeki-rz/538736598240482/).
  To wskazanie źródła, nie deklaracja odczytania zablokowanego wpisu.

Wartości ssania, oporów, uszkodzeń, pomp, chłodzenia i granic rozruchu
są przyjętymi parametrami symulatora. Nie należy traktować ich jako
instrukcji producenta, bezpiecznych prędkości rzeczywistych uderzeń
ani oceny dopuszczalności manewru w prawdziwym porcie.


Testy szczegółowego ujścia obejmują wspólną skalę i odwrotność projekcji,
brak samoprzecięć brzegu, ciągłość toru pod mostami, brak wymyślonych podpór,
wejścia obu basenów i drogę do stanowiska paliwowego z obsadą portową.
Oddzielnie sprawdzane są fizyczne przepłynięcia podejść, postój i tankowanie
pięciu profili, poprawne starty dziewięciu profili, cumowanie floty,
wyświetlanie tej samej wody na minimapie, układ zegarów i migracja zapisów.


Testy napraw eksploatacyjnych (`marine-fixes.test.js`, `marine-fixes.spec.js`) sprawdzają mechaniczny kluczyk bez prądu, połowę i pusty zbiornik, migrację paliwa, wieloklatkowe BOV, słyszalność upustu i klekotu w OfflineAudioContext, 90-sekundowy postój skośnego zestawu, skończony uciąg hamulca, reset odpiętej przyczepy, zapis po audio SUV-a i rzeczywiste tankowanie pięciu kadłubów w obu kierunkach przy obu stacjach. Testy wcześniejszych stacji zostały przeliczone we wspólnym układzie pomostu; warunki bezpieczeństwa tankowania pozostały te same.
