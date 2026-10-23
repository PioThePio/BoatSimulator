# Model v20: podstawy, założenia i ograniczenia

Aktualne strugi, pompy, odbicia fal i kompresja geografii: [raport v20](FIXES_V20.md).

Poprawki v19, energia kolizji, zalewanie i konfiguracje napędów:
[osobny raport](FIXES_V19.md). Starsze rozdziały i pomiary opisują też historię modelu.

Mapa Zegrza, skala, źródła i poprawki v18: [osobny opis](ZEGRZE.md).

Model ma odtwarzać **zależności fizyczne w manewrach**, ale nie jest
zweryfikowanym cyfrowym bliźniakiem konkretnej motorówki. Nie dysponujemy
pomiarami przyspieszenia, obrotów, średnicy/pitch śruby, krzywej oporów,
rozkładu masy ani próbami skrętu i hamowania rzeczywistej jednostki.
Współczynniki wymagają takiej kalibracji, zanim można mówić o dokładności
ilościowej. Osiągi w tabelach poniżej to wyniki symulatora, nie dane producentów.

## Przejrzane materiały (ponowna weryfikacja kodu 21 października 2026)

1. [Thor I. Fossen — Handbook of Marine Craft Hydrodynamics and Motion Control](https://github.com/cybergalactic/FossenHandbook).
   Przeczytano opis podręcznika, zakres hydrostatyki, modeli manewrowych,
   sił sterujących i środowiskowych. To identyfikacja podstaw teoretycznych,
   nie deklaracja przeczytania całego podręcznika.
2. [Fossen — model Otter w PythonVehicleSimulator](https://github.com/cybergalactic/PythonVehicleSimulator/blob/master/src/python_vehicle_simulator/vehicles/otter.py).
   Przejrzano równania dynamiki, masę dodaną, człony Coriolisa, różne
   współczynniki ciągu naprzód/wstecz, dynamikę obrotów oraz ramiona dwóch
   śrub. Otter jest małym dwukadłubowym USV — jego współczynników nie
   przeniesiono wprost do motorówek. Korzystamy ze struktury modelu.
3. [Fossen — crossFlowDrag i Hoerner](https://github.com/cybergalactic/PythonVehicleSimulator/blob/master/src/python_vehicle_simulator/lib/gnc.py).
   Przejrzano całkowanie oporu poprzecznego wzdłuż kadłuba. Siła lokalna
   zależy od `v + r*x`; jej moment powstaje przez ramię `x`.
4. [NREL / MoorPy — quasi-static Catenary solver](https://github.com/NREL/MoorPy/blob/main/moorpy/Catenary.py).
   Przejrzano definicje EA, ciężaru w wodzie, poziomej/pionowej składowej
   naciągu, odcinka leżącego na dnie i kontaktu z dnem. Nasz solver jest
   osobną, uproszczoną implementacją równań dwóch materiałów. Nie jest
   portem ani uruchomieniem pełnego MoorPy.
5. [MoorDyn — struktura modelu lin i ciał](https://github.com/FloatingArrayDesign/MoorDyn/blob/master/docs/structure.rst).
   Przejrzano rozdzielenie sztywności, tłumienia, ciężaru, wyporu,
   oddziaływań fal/prądu i kontaktu z dnem. Nasza kotwica jest
   quasi-statyczna, nie jest pełną dynamiczną linią wielowęzłową MoorDyn.

Próby dostępu do strony Fossena, poradnika BoatUS o pojedynczym silniku
i poradnika West Marine o kotwiczeniu zakończyły się odmową sieci HTTP 403.
Nie traktujemy tych stron jako przeczytanych źródeł. W modelu nie ma
parametrów rzekomo „potwierdzonych przez RYA / BoatUS”. Ograniczone siłą
wybieranie, uciąg windy, współczynniki dna i progi szkód poniżej są
**jawnymi założeniami**, nie wartościami gwarantowanymi przez te poradniki.
W v7 ponownie odczytano opis parametrów i sił przy dnie w `MoorPy/Catenary.py`.
Strona instrukcji Hondy, West Marine i podana miniatura wskaźnika trymu
również zwróciły 403. Skala i zalecenia operacyjne poniżej są jawnym
przybliżeniem ogólnych zasad, bez deklaracji weryfikacji instrukcji konkretnego silnika.


W v8 ponownie odczytano [MSS crossFlowDrag.m](https://github.com/cybergalactic/MSS/blob/master/LIBRARY/modeling/crossFlowDrag.m):
całkowanie lokalnego przepływu na pasach i momenty tych samych sił.
Charakterystyka utraty przyczepności w ślizgu jest naszym rozszerzeniem,
a nie współczynnikiem tego modelu wypornościowego.
Trzy filmy podane przez użytkownika (OXca-WWzye4, qaLyC21wJVc,
BEO56pHm9gY) zwróciły HTTP 403 przez politykę sieci; nie obejrzano ich.
Zmiany uwzględniają opis użytkownika, bez twierdzenia o kalibracji do filmów.

## Stabilność kierunkowa i bezwładność

Wielkości w SI; świat: x na wschód, y na południe. Kadłub: x do dziobu,
y do prawej burty; dodatni obrót w prawo. Efektywna macierz bezwładności:
`diag(1,08*m, 1,65*m, 1,55*Izz)`, gdzie
`Izz = m*((0,27*L)^2+(0,22*B)^2) + m_paliwa*(0,16*L)^2`.

Równania z masą dodaną i empiryczną kompensacją momentu Munka:

```
mx*u_dot = X + m*v*r
my*v_dot = Y - m*u*r
Iz*r_dot = N - D_r*r*abs(r) - Iz*(0,16+0,04*abs(u)/L)*r
D_r = 0,5*rho*B*L^4*(0,004+0,003*udział_ślizgu)
```

Pochodne przeliczamy z układu obracającego się do świata. Kompensacja
niekalibrowanego momentu Munka ogranicza wzmacnianie znoszenia w obrót.
To wybór empiryczny; nie pełna identyfikacja pochodnych hydrodynamicznych.

**Porównanie z PythonVehicleSimulator:** `crossFlowDrag()` sumuje siłę
z prędkości `v+r*x` oraz moment tej samej siły z ramieniem `x`. Wcześniej
nasz model liczył prędkość w innym miejscu niż ramię części sił. W v6
usunięto tę niespójność. Trzynaście pasów używa tej samej współrzędnej do
prędkości lokalnej i momentu. Opór kwadratowy jest przeciwny do lokalnego
ruchu. Profil zanurzonego boku ma większy udział przy rufie:
`shape=(0,65+0,35*cos(pi*x/L))*(1-0,50*x/L)`.

Siła każdego pasa, `local=v+r*x`, pozostaje przeciwna do jego ruchu.
W v8 współczynnik boczny zależy także od lokalnego natarcia i przeciążenia:

```
incidence = hypot(v, 0.35*r*L) / max(2, abs(u))
release = plane * (jet ? 0.88 : 0.78)
          * clamp((incidence*(jet ? 3 : 1)-0.004)/0.055)
grip = 1-release*(0.65+0.33*max(0,-2*x/L))
stall = 1/sqrt(1+(local/(0.45+0.12*abs(u)))^2)
Y = -0.5*rho*draft*dx*grip
    * [2.05*shape*(1-0.28*plane)*abs(local)*local
       +(0.50+1.10*plane)*stall*abs(u)*local]
    - m*0.035/13*local
```

Małe natarcie zachowuje stabilność; przy dużym rufa stopniowo łatwiej
przesuwa się bokiem, a przednia część kadłuba zachowuje większą część
oporu. Zmniejszenie współczynników nie zmienia znaku siły: suma
`Y*(v+r*x)` jest niedodatnia, co sprawdzają testy. Odmienny współczynnik
skutera przybliża pracę krótkiego kadłuba i łatwiejszy uślizg. To empiryczna
charakterystyka, nie zmierzona krzywa pochodnych konkretnego kadłuba.

Opór manewrowy zależy od faktycznego ruchu:
`q²=v²+(0.4*r*L)²`,
`D_turn=0.5*rho*draft*L*0.12*q²*abs(u)/sqrt(u²+q²+0.5²)`.
Dodatkowe podparcie w zakręcie: `load=hypot(1,u*r/g)`,
`D_induced=m*g*0.10*(load²-1)*plane`.
Oba opory działają przeciwnie do ruchu wzdłużnego. Usunięto stosowany w v7
osobny opór `sin(delta)²*u²`, który hamował także mocną łódź niezależnie
od jej rzeczywistego uślizgu. Moc silnika musi pokryć opór, masa i
przeciążenie zwiększają wymagane podparcie. Przy wystarczającym ciągu łódź
utrzymuje ślizg w ciaśniejszym łuku; przy słabym silniku kadłub zanurza
się, rośnie powierzchnia zwilżona i łódź nadal skręca w ruchu wypornościowym.
Nie ma wymuszonego promienia, obrotu wokół zadanego punktu ani natychmiastowego
ustawiania prędkości wzdłuż osi kadłuba. Punkt obrotu wynika z sił i ruchu.

Wiatr działa w czterech miejscach `x/L=-0,36/-0,12/0,14/0,37`, z udziałami
`0,10/0,16/0,30/0,44`. Lokalny wiatr uwzględnia obrót. Większy nawiew na
przód oraz większy opór wodny rufy i zanurzonego napędu pozwalają łodzi
obracać się podczas dryfu. To umowny rozkład nawiewu i części podwodnej;
rzeczywisty środek nawiewu zależy także od nadbudówki i obciążenia.
Ciąg, jego ramię, napływ na śrubę, lokalny opór i masa dodana działają
równocześnie: gwałtowny gaz na postoju daje inny stosunek obrotu do ruchu
postępowego niż taki sam gaz podczas płynięcia.

Testy sprawdzają zanikanie energii bez napędu, brak sztucznych sił przy
wspólnym ruchu z wodą i powietrzem, większą bezwładność cięższego kadłuba,
większą utratę prędkości przy ciasnym skręcie i małe znoszenie przy
wychyleniu silnika o 2° w szybkim ruchu. Nie dowodzi to zgodności z próbami
morskimi; układ z empiryczną korekcją nie jest pełnym modelem idealnego płynu.

## Profile i napęd

| Profil | L × B [m] | Kadłub [kg] | Zanurzenie bazowe [m] | Moc domyślna [KM] | Zbiornik [l] |
| --- | --- | --- | --- | --- | --- |
| Otwarta | 4,2 × 1,75 | 380 | 0,28 | 25 | 45 |
| Motorówka | 5,5 × 2,15 | 800 | 0,38 | 90 | 100 |
| Kabinowa | 7,5 × 2,65 | 2100 | 0,55 | 200 | 250 |
| Wypornościowa | 9 × 3,1 | 4200 | 0,75 | 90 | 400 |
| Skuter | 3,2 × 1,22 | 310 | 0,20 | 170 | 60 |

Do masy dodajemy silniki zaburtowe `28+0,62*KM` kg każdy, załogę 150 kg
(85 kg na skuterze), zbiorniki i paliwo. Każda opcja strumieniowego
dodaje 22 kg umownego dodatkowego banku akumulatorów. Masa kadłuba skutera obejmuje jego
napęd. Można zmieniać wymiary/masę i wybrać 1–2 silniki 10–350 KM każdy;
skuter ma jeden napęd. Nietypowe konfiguracje nie są oceną dopuszczalnego
obciążenia pawęży ani rekomendacją montażu.

Każdy silnik ma osobne obroty, przekładnię, trym i stan uszkodzeń oraz temperaturę.
Przy dwóch silnikach są dwa obrotomierze. Na luzie ok. 750 obr/min;
po ustaleniu pełzającego regulator podnosi bazę o ok. 65 obr/min. Drobne
składowe okresowe (kilkanaście obr/min, inne fazy dla każdego silnika)
ożywiają wskazanie; nie dodają sztucznego ciągu ani momentu do kadłuba. Obroty
narastają ze stałą ok. 0,65–1,3 s, zależną od mocy i obciążenia, opadają
ze stałą 0,4 s. Ciąg zależy od kwadratu obrotów, limit mocy od sześcianu.
Zmiana biegu wymaga zwolnienia wału i co najmniej 0,65 s; polecenie
manetki nie oznacza natychmiastowego ciągu ani zmiany prędkości.
Dla skutera pompa narasta ze stałą 0,25–0,43 s, opada z 0,22 s;
zmiana kierunku deflektora wymaga co najmniej 0,22 s po spadku obrotów.

Ciąg statyczny zaburtowego: `85*KM^0,8 N`, wstecz 58%; sprawność graniczna
`T*v <= 0,55*P_wału`. Ciąg zależy także od posuwu, szkód i wentylacji.
Ramię silnika: `-0,44*L`, rozstaw dwóch: `0,46*B`. Sumujemy siły i momenty
każdego, dlatego przeciwny bieg obraca łódź, a równe wychylenia przeciwnych
manetek nie równoważą ciągów. Skeg działa także na luzie, gdy opływa go woda.
Oba zaburtowe skręcają wspólnie, z ograniczeniem szybkości rzeczywistego
kąta do 0,80 rad/s. Koło motorówki wykonuje dwa i pół obrotu między oporami i nie wraca do zera.

Skuter: inna masa, zanurzenie, bezwładność, kąt dyszy ±28°, ramię `-0,40*L`,
ciąg statyczny `62*KM^0,8`, sprawność 0,63, deflektor wstecz 34%.
Nie ma skegu zaburtowego ani regulowanego trymu. Bez strugi ma mały autorytet
sterowania, zaś gaz wytwarza moment przez skręconą dyszę. Kontakt z dnem
próbkujemy przy wlocie pod kadłubem. Nie modelujemy konkretnego systemu
hamowania/iBR, wyrzutu pasażera ani pełnej hydrauliki deflektora.

Koło ma różny skok między oporami: otwarta 1,5 obrotu, motorówka 2,5,
kabinowa 3, wypornościowa 3,5; skuter 0,25 obrotu, czyli 90°.
Kąt napędu zaburtowego: domyślnie ±45°, od v19 przypisany do jednostki;
wybór maksymalnego kąta usunięto z menu. To parametr modelu, bez deklaracji zgodności z instrukcją konkretnego
silnika. Dysza skutera pozostaje ±28°, bez trymu. Prędkość fizycznego
przestawienia: zaburtowy/Z-drive 0,80 rad/s, dysza skutera 1,6 rad/s.
Klawiatura przestawia koło z czasem od środka do oporu odpowiednio
1 / 1,4 / 1,7 / 1,9 / 0,45 s. Zmiana manetki po 180 ms trzymania klawisza
ma szybkość 0,8 zakresu/s (skuter 1,2); krótkie dotknięcie zachowuje bieg
pełzający. Stacyjki ignorują strzałki jako polecenia zmiany pozycji.

## Ślizg, trym i wysokość dziobu

Opór zawiera tarcie z przybliżeniem ITTC `Cf=0,075/(log10(Re)-2)^2`, garb
falowy, opór podpieranego dynamicznie kadłuba i większy opór zanurzonej rufy
na wstecznym. Udział ślizgu zależy od liczby Froude’a i ilorazu szacowanego
podparcia dynamicznego do ciężaru. Podparcie zależy od `u²`, długości,
szerokości i kąta dennego V. Cięższy kadłub wymaga większej prędkości.
Wymagane podparcie w zakręcie jest mnożone przez `hypot(1,u*r/g)`.
Cel udziału ślizgu to iloczyn `clamp((Fn-0.48)/0.4)` i
`clamp((liftRatio-0.22)/0.43)`; dla skutera drugi czynnik to
`clamp((liftRatio-0.12)/0.40)`. Ma to przybliżyć próg wynurzenia kadłuba.
Odjęcie gazu zmniejsza obroty i moc, spada prędkość, zanika podparcie,
wraca większe zwilżenie i opór wypornościowy. Pozostawiony bieg daje
pozostały ciąg, bez odgórnego zatrzymania łodzi.
Narastanie udziału ślizgu: 2,8 s; opadanie: 1,4 s. Profil wypornościowy
nie przechodzi w ślizg.

Jedna skala rozdziela **roboczy trym 0–40%** (−4° do +12°) i **tilt
40–100%** (+12° do +78°). Start: 10%, czyli kąt około 0°. Krok zadawania:
5 punktów procentowych do 40%, potem 10. Ruch do 10 punktów/s w roboczym
zakresie i 16 punktów/s w zakresie podnoszenia. Wspólny cel obu silników
jest pokazany przy przyciskach; wskaźnik pokazuje rzeczywistą pozycję.

Przy ruszaniu i wolnych manewrach niski trym utrzymuje śrubę i wlot w
wodzie. W ślizgu umiarkowane podniesienie może zmniejszyć zwilżenie i opór;
w przyjętym modelu korzystny punkt dla badanej konfiguracji to około 22%.
Nie jest to optymalna wartość dla każdej prawdziwej łodzi. Zbyt wysoki kąt
zwiększa przegłębienie, opór, odchyla ciąg od poziomu i sprzyja wentylacji.
Sam duży kąt nie jest warunkiem, że cała śruba już wyszła z wody.

**Geometria napędu:** umowny promień śruby `R=0,13+0,00013*KM m`, punkt
mocowania `x=-0,51 L`. Kolumna ma stałą długość
`l=(0,35*freeboard+0,12)+draft_ref+0,22-R`.
Zmienna masa paliwa obniża/wynosi punkt mocowania względem wodnicy;
nie wydłuża fizycznej kolumny. Punkt śruby przesuwa się do tyłu o
`l*sin(kąt)` i w górę według `l*cos(kąt)`. Uwzględniamy heave,
przegłębienie, przechył, lokalne dno oraz umowne wyniesienie 9 cm w pełnym
ślizgu. Pionowy promień tarczy to `R*cos(kąt)`. Udział zanurzonej tarczy
wynika z pola odcinka koła, z ograniczeniem 0–100%.

Kontakt z dnem używa dolnej krawędzi tej samej tarczy, którą pokazuje
schemat. Wlot chłodzenia jest 15 cm powyżej środka śruby w rzucie kolumny;
zanurzenie wlotu steruje dostępnością wody. Częściowe wynurzenie śruby
ogranicza ciąg, całkowite go zeruje. Duży kąt i przepływ mogą wywołać
wentylację także przed pełnym wynurzeniem; występują wtedy wzrost obrotów,
mniejsze obciążenie i utrata ciągu. Przy małych obrotach częściowo
podniesiony, nadal zanurzony napęd może pomóc zejść z piasku. Nasz model
nie wymusza braku ciągu po przekroczeniu arbitralnego procentu trymu.

Schemat ma poziom wody, sylwetkę, rzeczywistą pozycję śruby, wskaźnik
wlotu i profil dna, gdy jest płytko. Kontakt z dnem zmienia kolor śruby
i opis. To projekcja poglądowa z różnymi skalami osi, nie plan montażowy.
Grafika na wodzie pokazuje spienienie i ostrzeżenie. Modelujemy wentylację,
bez szczegółowej kawitacji i ciśnień przy łopatach. Rzeczywiste silniki
mogą ograniczać obroty/pracę w zakresie tilt; takich zależnych od producenta
blokad elektroniki nie odwzorowujemy.

Przegłębienie ma tłumioną dynamikę: fala, garb przejściowy, ślizg, trym,
przyspieszenie i paliwo przy rufie zmieniają wysokość dziobu. Przechył
uwzględnia falę, wiatr i pochylenie w zakręcie w ślizgu. To **model empiryczny,
nie pełny Savitsky, CFD ani sześć w pełni sprzężonych stopni swobody**.

## Paliwo, rozruch i akumulator

Łódź w aplikacji zaczyna z wyłączonymi silnikami. Sekwencja: Zapłon → Start,
na luzie. Rozrusznik działa 1,15 s i pobiera 110 A. Brak paliwa/energii
blokuje start; 0 gasi silnik i wyłącza zapłon. W testach niskopoziomowe
`createBoat()` domyślnie ma silniki pracujące; aplikacja jawnie używa `coldStart`.

Pojemność łączna 10–800 l; jeden lub dwa symetryczne zbiorniki przy
`x=-0,16*L`. Start: 75% pojemności. Gęstość benzyny 0,745 kg/l, masa
pustych zbiorników `0,08*pojemność + 2*liczba` kg. Zużycie aktualizuje masę,
środek ciężkości, bezwładność i zanurzenie (przybliżone pole wodnicy
`0,7*L*B`). Dwa zbiorniki są zużywane proporcjonalnie, bez przelewania
między nimi i bez swobodnej powierzchni cieczy.

Przyjęte zużycie pracującego silnika w l/h:
`0,45+0,003*KM+0,29*KM*n³*(0,55+0,45*obciążenie)`.
Nie jest to mapa spalania konkretnego producenta. Na luzie nadal zużywa
paliwo. Pusty zbiornik zatrzymuje silnik. Stanowisko paliwowe jest na
wschodniej burcie pomostu x=51,8 m, y=15–28 m. Pięć stałych odbijaczy ma
własne kolizje i ochronę. Burtowe podejście wymaga kąta do pomostu poniżej
około 24° i odstępu skraju kadłuba do 1,4 m. Potrzebna jest co najmniej
jedna cuma do polera tego stanowiska, prędkość ≤0,15 m/s oraz wszystkie
stacyjki w 0. Tankowanie 0,65 l/s; rozruch, odcumowanie, ruch lub opuszczenie
stanowiska przerywa je. Nie ma już koła zasięgu wokół dystrybutora.

Akumulator: bazowo 80 Ah (skuter 35 Ah), z dodatkowym bankiem 80 Ah na
każdy zamontowany strumieniowy; start 85%. Jest to skupiony model banków
równoległych, a nie schemat instalacji konkretnej łodzi. Zapłon 1,2 A,
alternator 12–34 A, moc strumieniowego szacowana jako `6.5 W/N` siły
znamionowej. Napięcie spoczynkowe `11.8+1.05*SOC`, opór banku
`0.003*80/capacity` Ω; ładowanie 13,5–14,4 V. Poprzedni stały opór 0,006 Ω
wywoływał cykliczne odcięcia obu strumieniowych przy dużym poborze.
Woltomierz i SOC nie stanowią pełnego modelu elektrochemii.

Siła znamionowa jednego strumieniowego `clamp(L*B*45,220,1550)` N zależy
od rozmiaru wyposażanej jednostki, nie od zmieniającej się masy paliwa.
Działa na zapłonie, przy SOC>4% i napięciu>10,2 V; ramię ±0,38 L,
rozpędzenie 0,22 s. Ciąg słabnie z prędkością jak `1/(1+(u/1.8)^2)`
i skaluje się z napięciem. W próbie 15 s z obiema jednostkami na zapłonie
bez ładowania: kabinowa około 870 N na końcówkę / 11,68 V,
wypornościowa około 1173 N / 11,21 V, bez cyklicznych odcięć.
Nominały, banki i moce są naszymi założeniami, nie katalogowymi danymi tuneli.

Przy 7,5 m/s wiatru i 0,95 m/s prądu ustawionych poprzecznie do kadłuba,
początkowy napór w modelu może wynosić około 3–6 kN dla większych łodzi.
Ręka 450 N i wyposażenie strumieniowe nie gwarantują pokonania takiego
naporu. Próba kabinowej 200 KM, jedna dziobowa cuma, wstecz 70%, skręt
35° i oba strumieniowe: po 10 s odsunięcie rufy jest o ponad 3 m mniejsze
niż bez wspomagania; nie traktujemy tego jako gwarancji dociągnięcia do
pomostu w dowolnej konfiguracji. Brak modelu grzania tunelu i czasu pracy.

## Cumy i kotwica

Okno kotwicy jest przesuwalne. Sugestia rode to 5 razy odległość dna od
rolki dziobowej, a przy górnej granicy wiatru od 7 m/s, prądu od 0,5 m/s
lub ręcznej fali od 0,35 m — 7 razy. Przy kotwicy na pokładzie próbkujemy
dno pod dziobem; po zrzucie pod kotwicą. Dodajemy wysokość rolki 0,65 m
i heave. Sugestię ograniczamy do zapasu; komunikat pokazuje także pełną
potrzebną długość. To jawna reguła interfejsu, bez gwarancji trzymania;
znaczenie mają dno, kotwica i przestrzeń do obrotu łodzi. Nie przyjmujemy
3:1 jako uniwersalnej reguły dla połączenia łańcucha z liną.

Kliknięty punkt na mapie pozwala też wybierać, luzować i odpinać cumy.
Kliknięcie dziobu otwiera obsługę kotwicy, współdzieląc stan z dolnym panelem.
Okno cumowania otwiera się po prawej stronie łodzi. Na telefonie widok
przesuwa łódź w lewo, zostawiając miejsce na okno. Można je przesuwać
za nagłówek myszą, dotykiem albo strzałkami
po ustawieniu fokusu na nagłówku. Rysunek ma pięć knag z przyciskami cum.
Zmiana klikniętego polera zachowuje położenie okna i dotychczasowe cumy.
Pięć knag: środek dziobu, lewy/prawy przód i lewa/prawa rufa.
Boczne przednie knagi są przy x=0,19 L, y=±0,32 B, rufowe przy
x=−0,39 L, y=±0,43 B; środek dziobu x=0,39 L. Rysunek i siły używają
tej samej geometrii, także dla jednostek portowych. Kliknij
poler, drzewo lub boję, potem knagę. Rzut do 6 m; początkowa długość to
odległość + 0,35 m. **Samo założenie nie wybiera liny i nie nadaje impulsu.**
Luźna lina nie ciągnie. Napięta: jednostronny Kelvin–Voigt, `k=EA/L`,
rozwiązanie niejawne z efektywną masą punktu zaczepienia. EA:
80/160/240/330/60 kN, zerwanie 10/18/28/40/8 kN według profilu.
Kolor łagodnie zmienia się ze wzrostem stosunku naciągu do siły zerwania.

Ręczne wybieranie działa wyłącznie podczas przytrzymania −. Siła rośnie
`min(450,120+110*t)` N, maksymalna moc 65 W i prędkość 0,18 m/s.
Równocześnie wybierane liny dzielą tę siłę i moc jednej osoby. Luzowanie
przy przytrzymaniu + ma limit 0,3 m/s. Puszczenie, anulowanie dotyku,
utrata aktywności, zamknięcie okna lub pauza zatrzymuje polecenie; knaga
nadal utrzymuje zewnętrzne napięcie. Nie kolejkujemy celu ±0,5 m.
Istniejący naciąg większy niż siła człowieka blokuje dalsze wybieranie.
Cuma pęka od łącznego naciągu przekraczającego wytrzymałość profilu;
ręka sama nie uzyskuje nieograniczonej siły przez długie przytrzymanie.
Boje mają umowne stałe położenie; nie modelujemy ich całego układu dennego.
Brak owijania lin o przeszkody i dokładnej geometrii pionowej cum.

Kotwica zachowuje solver v3: ciężki łańcuch i lekka lina, quasi-statyczny
zwis, odcinek leżący na dnie, opadanie, osadzenie, wleczenie i podnoszenie.
Dla odcinka: `dV/ds=w`, `dx/ds=H/T`, `dz/ds=V/T`, z wydłużeniem EA.
Łańcuch: 12 N/m w wodzie, EA 15 MN; lina: 0,08 N/m, EA 180 kN.
Łącznie do 60 m; łańcuch 6/8/10/14/3 m, kotwica 6/10/16/24/3 kg.

Trzymanie: `m*g*K_dna*(0,18+0,82*osadzenie)*cos(kąt)^3`, K=28 piasek,
12 muł, 3 skała. Parametry umowne. Winda: wydawanie 0,65 m/s,
wybieranie do 0,35 m/s / 650 W / 2,2 kN. Sprawdza osiągalny naciąg przed
skróceniem, wyrywa kotwicę przy stromym rode i podnosi zawieszoną.
Przeciążona wymaga podpłynięcia nad kotwicę. Profil pokazuje łańcuch/linę;
skale osi są różne. Nie jest to pełny MoorDyn ani model geotechniczny.

## Akwen, głębokość i otoczenie

Od v18 akwen to interpretacja Zegrza w obszarze 17,07 × 13,89 km:
ramiona rzek, zatoka Rządzy, Kanał Żerański, wyspy przy ujściu Bugu,
plaże, mielizny i szuwary. Główny port zachowuje stanowiska z bojami
i sześć pływających Y-bomów; dodatkowe pomosty leżą w ośmiu rejonach jeziora.
Brzeg kontaktu jest dokładną granicą wielokąta, przyspieszaną przez BVH;
rysunek wektorowy korzysta z tego samego obrysu. Batymetria pozostaje
przybliżona: głębokość płynnie rośnie od brzegu, maksymalnie do 8,5 m
w basenie i 3,2 m w rejonie Rządzy, z nałożonymi mieliznami.
Piętnaście próbek kadłuba wyznacza podparcie, tarcie i obrót przy osiadaniu.
Śruby są próbkowane osobno, niżej od kadłuba; trym zmniejsza ich zanurzenie.
Piasek stopniowo ściera, kamienie powodują znacznie większe uszkodzenia.
Skuter sprawdza wlot pod kadłubem. Szuwary można przepłynąć, ale zwiększają opór.

Przy włączonych efektach lokalnych: wiatr słabnie za wyspą/pomostami i w
przesmyku; prąd traci składową normalną przy brzegu, przyspiesza wzdłuż
przesmyku, zwalnia w śladzie wyspy i dostaje małe zmienne zawirowania przy
pomostach. Osłona ogranicza wysokość fali. Są to **zadane pola przybliżone,
nie rozwiązanie równań przepływu**; brak wymuszenia zachowania masy pola
wody w całym akwenie. Przełącznik umożliwia porównanie z jednorodnym polem.
Kierunki oznaczają dokąd płynie/wieje, nie meteorologiczne skąd.

Pogoda ma niezależne przedziały siły MIN–MAX dla wiatru i prądu oraz
osobną zmienność kierunku ±0–90°. Równe końce przedziału wyłączają zmiany
siły; ±0° wyłącza zmiany kierunku. Siła to środek zakresu plus połowa
rozpiętości razy suma trzech sinusów o wagach 0,55 / 0,30 / 0,15.
Wiatr ma częstości 0,23 / 0,61 / 1,13 rad/s, prąd 0,09 / 0,21 / 0,37;
kierunki używają osobnych wolniejszych składowych. To deterministyczne,
gładkie pola do ćwiczeń, bez modelowania turbulencji ani prognozy pogody.
Automatyczne fale korzystają z aktualnej siły wiatru, a sugestia kotwicy
z górnej granicy wybranego przedziału.

Trzy składowe fal o okresach 2,8/1,9/3,9 s wymuszają ruch orbitalny,
kołysanie i przegłębienie. Wysokość sumuje składowe, nie jest statystycznym Hs.
Automatyczna wysokość `min(0,55;0,004*V_wiatru²)` jest założeniem do
ćwiczeń, bez prognozy rozbiegu i czasu działania wiatru. Brak odbić i pełnego RAO.

**Skala portu:** wszystkie współrzędne i rysowanie są w metrach. Główny
pomost ma 2,8 m szerokości, domyślna motorówka 5,5 × 2,15 m. Y-bom jest
prostą belką 10 × 0,25 m, rozstaw 5 m; tylko przy zawiasie ma trójkątną
podporę i szerszy fragment do wejścia. Nie jest rozwidlonym pomostem
w kształcie litery Y. Pochylenie względem zawiasu reaguje na kontakt,
obciążenie cum i prąd. Ograniczenie końca pod wodą zastępuje sprężyna
skrętna `16000*delta+200000*delta³ Nm` i tłumienie, bez pełnego modelu
liny dennej. Moment bezwładności 6200 kg m², maksymalne umowne odchylenie
±0,12 rad. Polery Y-bomu przemieszczają się i mają prędkość zgodną z belką;
rzut cumy, siły, rysunek i wybór kursorem używają tego samego punktu.

Geometria uwzględnia załączone zdjęcie użytkownika. Linki referencyjne
[port Mazurski Raj](https://www.mazurskiraj.pl/thumb?file=mazurski-raj%2Fuser%2FPRZYSTA%C5%83%2Fmarina.jpg&w=1920&h=1440)
i [Y-bom Alfabryggan](https://alfabryggan.se/wp-content/uploads/2023/11/batbom-ybom-y-bom-utan-tradack-1-till-smabatshamn.jpg)
były niedostępne z tego środowiska (blokada HTTP 403); nie traktujemy ich
jako obejrzanych stron. Rozplanowanie stanowisk uwzględnia też opis
użytkownika: rufa przy pomoście, dziób do zewnętrznej boi, równoległe
wąskie rozdzielacze stanowisk.

Zacumowane motorówka, żaglówka i skuter mają masę, bezwładność, lokalny
opór hydrodynamiczny i siły środowiska. Trzymają je **rzeczywiste
jednostronne cumy między knagą a polerem/boją**, z początkowym luzem 5 cm.
Nie ma sprężyny do pozycji domowej ani zadanego sinusoidą obrotu. Każda
lina wytwarza siłę i moment, przez co jednostki mogą obracać się i kołysać
w granicach geometrii cum. EA=120 kN; niejawny solver uwzględnia efektywną
masę oraz ruch zaczepienia. Cumy tych jednostek nie są edytowalne i nie
pękają. Kontakt z graczem przenosi impuls między dwiema masami, a pływający
Y-bom odchyla się także przy kontakcie z jednostką portową. Przełącznik
wyłącza ich ruch i kolizje. Nie jest to samodzielnie sterowany ruch portowy.

Kamera płynnie oddala widok o maks. 22% pomiędzy 3 a 15 m/s, ze stałą
czasową 2 s; zbliża się przy zwolnieniu. Rysunek kadłuba zmienia skalę
według fizycznego ruchu pionowego (do ±4%); nie zmienia to metrycznych
wymiarów do kolizji. Paski na powierzchni zmieniają też krzywiznę i lekko
kołyszą się. To dodatkowe wskazówki wizualne, a nie dodatkowe siły fal.

Ślad V przy prędkości względem wody ponad 2 m/s powstaje z zapisanych
pozycji rufy nie częściej niż co 0,18 s i dopiero po rzeczywistym przebyciu
co najmniej `max(0.5,0.1*speed)` m. Brzegi rozchodzą się w bok i dryfują
z prądem; maksymalny czas życia to 28 s, limit 155 próbek. Ta sama geometria
zasila rysunek i pole falowe. Gładki pakiet `(1-z²)*exp(-z²/2)` ma grzbiet
i doliny, amplitudę zależną od prędkości (maks. około 0,31 m przed zanikiem)
i szerokość rosnącą z wiekiem. Nakładające się sąsiednie próbki są
uśredniane, aby liczba klatek nie zwiększała wysokości fali.

Próbkowanie w środku, na dziobie i rufie daje wysokość i nachylenie
spotkanej fali; falę uwzględnia także zanurzenie śruby i wlotu chłodzenia.
Pakiety młodsze niż 1 s nie działają na emitującą je łódź. Powrót przez
własny kilwater wywołuje heave/pitch/roll i ograniczoną zmianę przepływu.
Częstotliwość własna heave rośnie z 4,2 do 7,2 rad/s wraz ze ślizgiem.
To uproszczenie: brak odbić, interferencji fazowej, łamania i osłaniania
kilwateru przez ląd; nie rozwiązujemy pełnej teorii fal Kelvina ani CFD.

Echosonda: idealny pomiar dna pod rufą i historia 60 s; fish arches to
wizualny easter egg, bez symulacji akustyki ani zachowania ryb.

## Temperatura i chłodzenie

Bilans skupiony `T_dot = ciepło - chłodzenie` jest modelem szkoleniowym.
Woda ma 18°C, początkowa temperatura silnika 18°C. Ciepło zależy od
kwadratu obrotów i obciążenia. Chłodzenie zależy od zanurzenia napędu,
pompy i otwarcia umownego termostatu od 64°C. Dostępność chłodzenia
wynika z zanurzenia wlotu w geometrii napędu; zależy więc także od
przegłębienia i fali. Przy testowaniu samego silnika bez łodzi stosujemy
uproszczoną zależność od kąta. Wynurzony wlot nie dostarcza chłodzenia wodą. Mielizna zmniejsza przepływ; przy pełnym obciążeniu
na cumach lub gruncie dodajemy ciepło i ograniczamy efektywną wymianę wody
(w tym umowną recyrkulację). Postój na luzie sam w sobie nie powoduje
przegrzewania. To nie jest teza, że każdy prawdziwy silnik musi się przegrzać
przy pracy na cumach z prawidłowym chłodzeniem.

Od 105°C czerwony alarm i stopniowa redukcja mocy do 35%. Przy 145°C
zatrzymanie silnika z pozostawieniem zapłonu; ponowny start wymaga
ostygnięcia poniżej 110°C. Wyłączenie silnika usuwa produkcję ciepła,
chłodzenie naturalne jest wolne. W próbie 240 s silnik prawidłowo chłodzony
w ruchu stabilizuje się około 74°C, a utrata chłodzenia i przeciążenie
na cumach/gruncie wyzwalają ochronę. Temperatury i czasy nie są danymi
konkretnego producenta.

Ślad jest próbkowany po przebyciu 0,35 m, a nie co stały czas: drobne
drgania pozycji na postoju nie tworzą wiązki nakładających się odcinków.

## Wyniki kontrolne zakrętu (v9)

Spokojna woda, 120 Hz. Ta sama motorówka 5,5 m / kadłub 800 kg, prędkość
wejścia 9 m/s, początkowy udział ślizgu 0,9, rozkręcony silnik, pełny gaz
i skręt 35°. Po 12 s (pozycja przenoszona po każdym kroku na głęboką wodę,
żeby wyłączyć kontakt z brzegiem; nie powstaje wtedy nowy kilwater):

| Moc [KM] | Prędkość [m/s] | Obrót [rad/s] | Promień `V/r` [m] | Udział ślizgu | Ruch boczny środka [m/s] |
| --- | --- | --- | --- | --- | --- |
| 45 | 6,03 | 0,197 | 30,6 | 0,19 | -0,51 |
| 60 | 6,73 | 0,228 | 29,6 | 0,38 | -0,57 |
| 90 | 7,78 | 0,302 | 25,8 | 0,62 | -0,76 |
| 350 | 10,06 | 0,728 | 13,8 | 0,80 | -2,27 |

Prędkość boczna rufy to `v-r*0.44*L`: w mocnej konfiguracji około
-4,03 m/s, bez obracania łodzi w miejscu; ruch wzdłużny jest ponad
trzykrotnie większy od bocznego ruchu środka. Ten sam silnik 350 KM
z kadłubem 2200 kg: obrót około 0,419 rad/s, udział ślizgu 0,22,
promień 24,1 m. Moc względem masy zmienia możliwość utrzymania ślizgu.

Skuter 170 KM przy analogicznym wejściu: około 9,58 m/s,
1,05 rad/s, promień 9,2 m. Z postoju przy pełnym gazie i skręcie po 2 s:
skuter 170 KM około 5,64 m/s, motorówka 170 KM około 0,85 m/s.
Pompa ma szybsze narastanie obrotów i zmianę kierunku deflektora niż
przekładnia zaburtowa; ciąg nadal jest ograniczony mocą, napływem i masą.

Odjęcie manetki z pełnego gazu do 12% w motorówce 90 KM: przed zmianą
12,00 m/s; po 6 s 5,57 m/s, udział ślizgu 0,32; po 18 s 2,00 m/s,
udział ślizgu bliski zeru. Silnik pozostaje na biegu naprzód.

Test powrotu przez własną falę to rzeczywisty ruch po jeziorze przy
350 KM po rozbiegu i pełnym skręcie, bez fal pogodowych. Sprawdzamy
spotkanie fali >4 cm, heave >1 cm, ograniczoną amplitudę i skończone stany.
Są to wyniki symulatora, nie dane z prób morskich ani gwarantowane osiągi.

## Kolizje

Prędkość normalna punktu kontaktu uwzględnia ruch i obrót; energia
`0,5*m_ef*v_normalna²`. Od v19 szkoda rośnie z nadmiarem energii ponad
kontakt 0,15 m/s (0,30 m/s przez odbijacz), podzielonym przez umowną
energię konstrukcji `max(4500,structureMass*8) J`, z mnożnikiem odporności
2,5 dla odbijacza. Nie ma automatycznego 100% od prędkości 1,5/1,8 m/s.
Te progi mogą nadal oznaczać silny błysk kontaktu. Ciągły nacisk dolicza
jedynie wzrost szczytu szkody, nie tę samą energię co krok solvera.
Celem manewru jest kontakt bliski zeru; współczynniki nie są danymi producentów.
Kolizje z Y-bomami używają odcinka o rzeczywistej szerokości,
z ruchem punktu kontaktu, bezwładnością obrotu i reakcją na zawiasie.
Cztery odbijacze mają osobne okręgi kontaktu, zgodne z pozycjami na mapie.
Rozwiązywane są przed kadłubem: przy równoległym dobijaniu odsuwają łódź,
a wystający dziób lub pawęż nadal może uderzyć bez osłony. Kolor zielony
sygnalizuje łagodny kontakt, pomarańczowy szkody, czerwony silną kolizję.
Błysk zanika w 1,6 s; mapa ośmiu stref zachowuje przyciemniony ślad
rzeczywistej szkody. Niezależne punkty nie współdzielą globalnej blokady
sygnalizacji; ponowne drganie tej samej strefy ma odstęp 0,45 s. Dotyczy
to pomostów, Y-bomów, innych łodzi i kontaktu z dnem. Nie ma wyłącznika szkód.
Kadłuby przybliżają podłużne kapsuły i impuls. Nie liczymy deformacji materiałów. Zniszczony
pomost nadal jest przeszkodą.

## Układ interfejsu v9

Menu startowe zawiera łódź, wyposażenie, miejsce startu i pogodę. R i „Nowa
próba” otwierają je z zachowaniem wyborów; dopiero „Rozpocznij rejs” tworzy
nową próbę. Zamknięcie okna wraca do aktualnego rejsu. Pogoda jest także
w przesuwalnym oknie pod ikoną na mapie. Stan jednostki i mapa kontaktów są
w kokpicie pod schematem uniesienia dziobu. Pod konsolą pozostają cumy
i kompaktowy panel kotwicy; usunięto osobny przycisk założeń uszkodzeń.

Nad kołem są osobne znaczniki zadanego i rzeczywistego kąta napędu.
Wskaźnik paliwa ma E/F i kontrolkę poniżej 10%. Temperatura: niebieski
20–64°C, zielony 64–95°C, żółty 95–105°C, czerwony 105–140°C. Napięcie:
czerwony poniżej 11,5 V i ponad 14,8 V, żółty 11,5–12,2 V, zielony
12,2–14,8 V; napis rozróżnia ładowanie i spoczynek. Są to zakresy
przyjęte do tego modelu, bez norm konkretnego wskaźnika czy alternatora.

## Dźwięk proceduralny (v9)

Web Audio tworzy po pierwszym geście użytkownika dwa niezależne głosy
silników: puls obrotów, harmoniczne i wyższy składnik mechaniczny słyszalny
na małych głośnikach. Częstotliwość zależy od RPM i profilu, poziom od
pracy/obciążenia, rozrusznik ma osobny przerywany charakter. Osobne impulsy
sygnalizują stacyjkę, zapadkę manetki, faktyczne załączenie przekładni,
kontakt kadłuba/odbijacza i pęknięcie cumy. Filtrowany szum opisuje fale,
opływ i ślizg, a tony strumieniowe oraz pompa paliwa zależą od ich pracy.
Głośność wygładzamy, a sumę ogranicza kompresor. Pauza, menu i utrata
aktywności wyciszają główny tor. Wyłączenie dźwięku i głośność zapisujemy
lokalnie; brak Web Audio nie blokuje symulatora. Brak zewnętrznych nagrań,
modelu akustyki przestrzennej i kalibracji do rzeczywistego silnika.
Test OfflineAudioContext sprawdza sygnał, zmianę częstotliwości, brak
przesterowania oraz ciszę po wyciszeniu i pauzie; nie zastępuje odsłuchu
na różnych fizycznych głośnikach.

## Obciążenie i dźwięk w v10

Przybliżenie momentu obciążającego śrubę używa **posuwu ze znakiem**
`advance = bieg * napływ`. Przy wstecznym podczas ruchu do przodu posuw
jest ujemny, rośnie obciążenie i struga wytraca energię ruchu łodzi.
Skuter zachowuje posuw pompy od napływu na wlot: wsteczny zmienia kierunek
strugi deflektorem, nie odwraca obrotów pompy.
Nie powstaje ciąg ani bulgot hamowania w czasie oczekiwania na przekładnię.
Bazowy wskaźnik obciążenia to `clamp(1-advance/(4+12*n),0.15,1)`.
Dodajemy do niego do 0,25 z opływu poprzecznego śruby:
`0.65*crossflow²/(inflow²+(3+9*n)²)`. Nie zależy wprost od kąta koła.

Próbkowana powierzchnia wody przy każdym napędzie obejmuje fale pogodowe
i własny kilwater. Pochodna jej wysokości wzdłuż trasy, pomniejszona o
pionowy ruch rufy z heave/pitch/roll, wyznacza szybkość spotkania wody.
Przy napływającej wodzie dodajemy `clamp(2.5*abs(u)*max(0,encounter)/(g*L),0,0.25)`.
To empiryczna poprawka obciążenia, bez rozwiązywania uderzeń hydrodynamicznych,
pełnych charakterystyk śruby lub map momentu konkretnego silnika. Współczynników
nie traktujemy jako danych producenta. Całość maleje przy częściowym
zanurzeniu i napowietrzeniu; na luzie obciążenie śrubą dąży do zera.

Obciążenie wygładzamy przez 0,14 s. Powolny stan regulatora (1,4 s)
oddziela nowy skok obciążenia od pracy ustalonej. Zadane `n` zmniejszamy
o `demand*(0.035*load+0.025*max(0,load-governorLoad))`; te same obroty
wału wpływają na ciąg, ograniczenie mocą, paliwo, temperaturę i dźwięk.
Nie dodajemy losowego falowania RPM udającego obciążenie. Dotychczasowy
mały puls spalania pozostaje osobnym składnikiem wskazania obrotomierza.
W próbie silnika 200 KM, manetki 80% i napływu 8 m/s skok przepływu
poprzecznego do 8 m/s powoduje spadek około 50–60 RPM; zdjęcie dodatkowego
obciążenia pozwala odzyskać obroty. To wynik tego modelu, nie pomiar silnika.
Przy napowietrzeniu możliwe są wzrost RPM i równoczesny spadek ciągu.

Barwa **V8** jest stylizacją akustyczną wybraną dla każdego zaburtowego
od 150 KM osobno, niezależnie od sumy mocy instalacji. Nie oznacza,
że każdy prawdziwy silnik 150 KM ma osiem cylindrów. Skuter zawsze ma
wyższy ton. Głos V8 ma niższy puls wału, silny czwarty rząd, dodatkowy
bas i niższe odcięcie; głos małego silnika/strugi pozostaje brzęczący.
Obciążenie zwiększa wyższe harmoniczne, filtrowany szum wydechu i jego
poziom. Dzięki temu słychać pracę pod obciążeniem nawet przy małej zmianie RPM.

Osobna, pulsująca warstwa szumu daje bulgot: moc hamowania w wodzie
`abs(T)*max(0,-bieg*inflow)`, napowietrzona ale jeszcze zanurzona śruba
i rzeczywista szybkość podnoszenia częściowo zanurzonego napędu.
Bez pracującego silnika i załączonego biegu nie ma tej warstwy; całkowicie
sucha śruba nie bulgocze pod wodą. Nie zmieniono dotychczasowego szumu
opływu i ślizgu. Głosy dwóch silników pozostają niezależne i lekko rozstawione
w stereo. Wszystkie warstwy przechodzą przez wspólny poziom, pauzę i wyciszenie.
Testy renderują rzeczywisty sygnał w OfflineAudioContext, porównują udział
basu i jasność V8/małego silnika/skutera, reakcję na obciążenie oraz obecność
bulgotu i jego zanik po wynurzeniu. To nadal synteza bez nagrań V8.

Odczyt zanurzenia kadłuba pokazuje `spec.draft`, czyli nominalne zanurzenie
w spoczynku po uwzględnieniu aktualnego paliwa. Nie obejmuje wystającej śruby.
Osobno podajemy bieżące `underKeel` z tych samych 15 punktów kadłuba,
których używa kontakt z dnem: uwzględnia rzeczywiste pochylenie, przechył,
heave i lokalną głębokość. Prześwit poniżej 0,20 m jest żółty, osiadanie
czerwone. To odczyt aktualnego modelu dna pod łodzią, bez przewidywania
głębokości przed dziobem ani dodatkowego marginesu bezpieczeństwa.

## Miks i alarmy w v11

Zmniejszono poziom ciągłych tonów silnika, udział wysokich harmonicznych
i górną częstotliwość filtra. Harmoniczna pomocnicza jest trójkątem zamiast
piły, składnik mechaniczny cichym sinusem. Filtr ma Q=0,5, bez uwydatniania
wąskiego pasma. Wydech ma osobny filtrowany szum modulowany rytmem pracy,
również na luzie. Zachowano reakcję na RPM i obciążenie. W próbce 200 KM,
3600 RPM i obciążenia 50% RMS silnika zmalał z około 0,0217 do 0,0102
(około −6,5 dB). To porównanie cyfrowego miksu przy tym samym poziomie,
bez pomiaru głośności rzeczywistego silnika ani fizycznych głośników.

Strumieniowe używają filtrowanego szumu bez oscylatora o słyszalnej
wysokości tonu. W tej samej próbie pełne wysterowanie daje RMS około
0,0022 wobec 0,0099 poprzednio (około −13 dB). Kliknięcia mają wyższy poziom
i właściwe pasmo filtra; wcześniej domyślne odcięcie 350 Hz tłumiło nawet
klik 900 Hz. Odbijacz daje miękki, krótki bas z lekkim szmerem, nieosłonięty
kadłub mocniejszy stuk z szerszym impulsem szumu. Wspólny kompresor nadal
ogranicza sumę. Testy renderują rzeczywiste impulsy ponad pracującym silnikiem
i sprawdzają ich zanik i poziom maksymalny.

Udział ślizgu 0,2–0,8 płynnie przenosi miks od niższego szumu opływu
do osobnych pasm rozbryzgu w stereo. Szybkość względem wody wyznacza
poziom i pasmo; sam pozostawiony stan ślizgu przy zatrzymanej łodzi nie
generuje szumu jazdy. Nie jest to symulacja akustyki CFD ani nagranie łodzi.

W pozycji I bez pracy silnika jeden wspólny alarm 1050 Hz brzmi ciągle
(od v13; w v11–12 był przerywany). Zmiana poziomu ma wygładzone zbocza. Przy dwóch silnikach
wystarczy jeden pozostawiony na zapłonie; alarm obejmuje także zgaśnięcie
z braku paliwa i zatrzymanie przez ochronę termiczną. Nie dublujemy
brzęczyków. START, praca i 0 nie uruchamiają tego alarmu. Wyciszenie,
pauza i menu obejmują również alarm. To umowny sygnał zapłonu,
bez odwzorowania kodów diagnostycznych konkretnej marki.

Zimny bieg jałowy dodaje do istniejącego pulsowania małe, wolniejsze
falowanie (18 i 9 RPM przy 2,1 i 3,3 rad/s). Waga maleje od 1 przy 18°C
do 0 przy 60°C oraz zanika przy zwiększaniu obrotów. Faza jest osobna
dla każdego silnika. Jest to drobny model pracy regulatora biegu jałowego
wskazywany przez obrotomierz i słyszalny w dźwięku; nie dodaje sił kołyszących
kadłub ani obrotów na wyłączonym silniku.

Podany [film cqrbpDy6Ol0](https://www.youtube.com/watch?v=cqrbpDy6Ol0)
zwrócił odmowę proxy HTTP 403; nie odsłuchano go i nie pobrano ścieżki.
Zmiany uwzględniają zgłoszoną męczącą barwę i pożądany miks,
bez twierdzenia o dopasowaniu widma do tego nagrania.

## Dno, napędy, serwis i poziomy audio w v12

Kontakt z dnem zapisujemy oddzielnie od bocznego obrysu. Każda z 15 próbek
kadłuba należy do przedniej, środkowej albo tylnej strefy dna według
lokalnego x/L (granice ±0,15). W obrębie strefy sumujemy udział penetracji
i wyznaczamy prędkość zbliżania do dna z ruchu pionowego, pitch/roll oraz
iloczynu gradientu głębokości i prędkości poziomej punktu. Siły podparcia,
tarcia i ruch przy osiadaniu pozostają fizycznie aktywne także bez szkody.

Usunięto naliczanie dowolnie małej szkody od każdego wolnego kontaktu
z piaskiem. Dla kontaktu co najmniej co sekundę umowny przyrost to
`[a*max(0,V-V0)^2 + c*max(0,V_normal-N0)^2] * clamp(pen/0.15,0,2) * udział_strefy`.
Dla piasku a=0,15, V0=1,25 m/s, c=2, N0=0,5 m/s; dla mułu a=0,06,
V0=1,6 m/s i ten sam próg pionowy; dla kamieni a=8, V0=0,18 m/s, c=12,
N0=0,08 m/s. To założenia modelu treningowego, nie rzeczywiste bezpieczne
progi konkretnego kadłuba. Szybkość jest próbkowana przed tarciem kontaktu.
Wolne osiadanie na piasku może więc dawać kontakt i podparcie bez szkód,
a szybkie tarcie lub uderzanie dnem o falę nadal może uszkodzić kadłub.

Śruba dostaje małą szkodę od pierwszego poruszającego się kontaktu
z piaskiem (około 0,12–0,50 punktu procentowego), potem dotychczasowe
ścieranie zależne od penetracji, ruchu i obrotów. Powtórny pierwszy kontakt
ma odstęp co najmniej sekundy. Kamienie zachowują znacznie większy impuls
uszkodzenia; każda śruba jest oceniana osobno. Nieruchoma, nieobracająca się
śruba na piasku nie ściera sama siebie.

Wskaźnik ma osiem odcinków obrysu dla kolizji bocznych, trzy pola dna
i jeden/dwa symbole napędu. Koła śrub pokazują ich szkody, korpus napędu
również ostrzeżenie temperatury. Trwała barwa: poniżej 10% żółta,
10–35% pomarańczowa, 35–65% ciemniejsza, od 65% czerwona. Kontakt bez
szkód może krótko błysnąć zielono; nie zostawia czerwonego śladu. Samo
osiadanie bez szkód ma żółty status. Ułamkowe otarcie śruby jest widoczne
przy odczycie zdrowia z dokładnością do 0,1 punktu procentowego.

Slip w v13 leży przy x=121–128, y=−8–36, obok pomostów serwisowych.
Od v19 naprawę można rozpocząć po przycumowaniu do dowolnej dostępnej
strony pomostów serwisu, przy prędkości do 0,30 m/s, obrocie do 0,08 rad/s
i wyłączonym zapłonie. Nie wymaga całego kadłuba w prostokącie. Kadłub odnawia 3 punkty zdrowia
na sekundę, śruby po 4. Zerwanie warunków przerywa pracę. Proces nie
przemieszcza łodzi ani nie zmienia szkód pomostu. Slipowanie przyczepą
jest osobnym mechanizmem opisanym niżej; naprawa nadal odbywa się przy pomoście.
Domki są na lądzie i stanowią przeszkody; nowe pomosty używają tej samej
skali metrów i solvera kontaktu co reszta portu.

Suwak „Silniki” 0–200% steruje osobnym torem silników/wydechu przed
wspólnym poziomem i kompresorem. Nie zmienia wody, trymu, strumieniowych,
kliknięć ani alarmu. Obie nastawy zapisujemy lokalnie, starszy zapis
bez poziomu silnika otrzymuje 100%. Elektryczna pompa trymu ma osobny
szmer i ton mechaniczny; słychać je wyłącznie przy niezerowej fizycznej
prędkości regulacji, do osiągnięcia celu. Skuter nie generuje tego dźwięku.

## SUV, przyczepa i slipowanie w v13

SUV to osobne ciało: masa 2400 kg, 250 KM, długość 4,9 m, rozstaw osi
2,9 m, skręt kół ±34°, koło 2,5 obrotu. Przyczepa dobiera długość,
szerokość, liczbę osi i masę do wybranej łodzi. Masa własna to
`220 + 65*L + 0,055*max(0,masa_łodzi-1200)` kg. Zestawy o nośności
powyżej 750 kg mają model hamulców przyczepy także po zdjęciu łodzi.
To wybrane parametry treningowe, bez przypisania do konkretnego SUV-a.

Samochód i przyczepa mają po trzy stopnie swobody w płaszczyźnie.
Impulsy w dwóch osiach wymuszają zgodność pozycji i prędkości zaczepu;
osiem iteracji na krok 1/120 s przenosi siły i momenty między ciałami.
Kąt przyczepy wynika z ruchu, sił opon i przegubu, więc cofanie może
złożyć zestaw. Zderzenie kończące zakres przy około 80° ogranicza dalsze
załamanie. Przednia i tylna oś SUV-a oraz oś/osiowy środek przyczepy
mają tłumione poprzeczne poślizgi z limitem Coulomba. Napęd i boczna
przyczepność dzielą budżet siły opon. Ściany, domki i pomosty zatrzymują
pojazdy. Linie parkingowe nie są przeszkodami.

PRND określa kierunek napędu albo hamulec postojowy. Zmiana kierunku
wymaga prędkości poniżej 0,25 m/s; rozruch pozycji P/N, trwa 0,85 s.
Gaz ma stałą narastania 0,25 s, obroty dochodzą do celu z bezwładnością.
Maksymalny uciąg napędu 13,1 kN dodatkowo ograniczają moc 150 kW na
kołach i przyczepność. Dochodzą opory toczenia, hamulce, opór wody,
hamowanie silnikiem i składowa grawitacji na rampie. Bieg R ogranicza
napęd powyżej 3,2 m/s; zjazd pod ciężarem może przekroczyć ten zakres.
Każdy pedał działa do puszczenia; klawiatura nie zmienia manetek łodzi.
Paliwa SUV-a ubywa według pracy napędu i obrotów jałowych. Audio korzysta
z rzeczywistych obrotów i obciążenia SUV-a.

Pochylnia x=121–128, y=−8–36 ma linię wody y=7,5 i regulowany kąt
4–18°. Głębokość to `(y−7,5)*tan(kąt)`; na bokach i końcu rampy
przechodzi w dno jeziora. Zmiana kąta aktualizuje fizyczne dno i jego
obraz. Parking na lądzie ma 64 × 40 m i miejsca około 4,7 × 13 m.
Tył SUV-a częściowo wjeżdża do wody; układ pokazuje głębokość przy
kołach i pod podporami. μ suchego podłoża wynosi 0,78, a mokrego/
zanurzonego zmniejsza się od 0,44 do 0,22. Głębokie zanurzenie nadwozia
zmniejsza nacisk osi. Przekroczenie 0,9 m przy przedniej osi gasi silnik
(dolot pod wodą); nie można wtedy ponownie go uruchomić. Ciężar,
nachylenie i poślizg mogą uniemożliwić wyjazd. Ostrzeżenie powyżej 3,5 t
na haku odnosi się do umownej zdolności tej jednostki holującej.

Podpory znajdują się `0,6 + 0,15*zanurzenie_kadłuba` m nad rampą.
Wypór odciąża przyczepę stopniowo jako
`clamp((głębokość-podpory)/zanurzenie_kadłuba,0,1)`. Na przyczepie
kadłub jest podparty: zachowuje prześwit, pochylenie rampy i ruch zestawu,
a wyłączony kontakt z dnem nie nalicza fałszywych szkód transportowych.
Zwolnienie zabezpieczeń na sucho nie przenosi łodzi na wodę. Dopiero
prawie całkowity wypór zwalnia podparcie i przywraca pełną fizykę łodzi,
z zachowaniem położenia i prędkości. Zwolniona cuma nadal ogranicza ruch,
a usunięcie jej następuje przez zwykłą obsługę lin.

Załadunek wymaga podejścia dziobem, ustawienia względem prowadnic
(do około 11,5°, 65 cm wzdłużnie i 20% szerokości + 10 cm poprzecznie),
względnej prędkości poniżej 0,3 m/s, postoju samochodu, wyłączonych
silników i cumy dziobowej do PRZ. Za mała głębokość zwiększa opór
przesuwania po podporach; stalowe prowadnice przenoszą kontakt na zestaw.
Za głęboko (ponad podpory + zanurzenie + 45 cm) nie można zabezpieczyć
łodzi, dopóki SUV nie podjedzie płycej. Ruchomy poler PRZ ma prędkość
punktu przyczepy i odbiera reakcję od cumy, zamiast zachowywać się jak
nieruchomy punkt na brzegu. Lina do PRZ nie zalicza się jako cumowanie
do pomostu serwisowego. Model nie obejmuje pracy rolek 3D, zawieszenia,
przechyłu poprzecznego rampy ani rzeczywistych opon/ciśnienia.

Alarm zapłonu w v13 jest ciągłym tonem 1050 Hz; wygładzenie głośności
pozostaje przy włączaniu i wyłączaniu. Nie ma cyklicznej bramki.
Strzałka po prawej pokazuje lokalny aktualny wiatr z osłonami, w m/s
oraz kurs **dokąd** wieje (zgodnie z panelem pogody).
Kolory knag w menu to dostępność połączenia: jasna wolna, zielona do
wybranego punktu, beżowa do innego. Nie oznaczają napięcia. To ostatnie
jest podane w kN i oddzielnie zmienia kolor liny na mapie.

Testy obejmują start/stacyjkę, PRND, masę i hamowanie, skręcanie naprzód/
wstecz, zgodność zaczepu, odciążanie wyporem, odczepienie na sucho,
załadunek i jego warunki, reakcję ruchomego polera, mokrą przyczepność,
przeciążony zestaw na stromym slipie, zanurzenie dolotu oraz pełny cykl
wodowania i powrotu na ląd. Testy przeglądarkowe obejmują przełączanie
kokpitu, trzymane pedały, klawiaturę, pogodę, kąt rampy i ekran telefonu.

## Poprawki zestawu i podparcie kadłuba w v14

Poniższy opis zastępuje odpowiednie uproszczenia v13. Parametry są jawnymi
założeniami treningowymi, nadal bez kalibracji dla konkretnego pojazdu.

Pedał przyspieszenia narasta liniowo 1,5/s, hamulec 2,2/s; zwalnianie
5/s i 6/s. Po lewej jest hamulec, po prawej gaz. Spacja przełącza ręczny
na tylnej osi; S/↓ to osobny hamulec nożny. Q/E przesuwa wybór PRND,
z zachowaniem blokady zmiany kierunku podczas ruchu. Alarm silnika na
zapłonie pozostaje w łodzi, a jest wyłączony w torze audio SUV-a.

Osie SUV-a mają oddzielne naciski: ciężar na haku obciąża tył i odciąża
przód, dochodzi transfer na pochyłości i utrata nacisku przez zanurzenie.
Domyślny napęd 2WD działa na tył, przełącznik 4×4 dzieli zapotrzebowanie
na obie osie. Wspólny limit koła tarcia obejmuje siłę wzdłużną i boczną
na każdej osi. Powstały poślizg boczny zmniejsza dostępny ciąg; w 2WD
przód zachowuje sterowanie, gdy tył traci przyczepność od gazu. Przy 4×4
każda oś może osiągnąć swój limit. Pomoc przedniej suchej osi na mokrym
slipie wynika z jej nacisku i μ, nie mnożnika siły silnika.

Piasek ma μ=0,45 i opór toczenia 0,085 nacisku, asfalt/beton 0,80 i 0,014.
Na mokrym betonie μ maleje 0,44→0,22. Pas do prób piasku leży na parkingu
x=145–161, y=−43–−14. Przy małej prędkości i buksowaniu koleina rośnie
maksymalnie 0,13 m/s pomnożone przez poślizg i pedał, do 45 cm.
Nacisk osi powyżej nominalnego dodatkowo zmniejsza przyczepność piasku;
koleina zwiększa opór i dalej zmniejsza μ. Jazda oczyszcza koleinę z
szybkością 0,015*V m/s, twarde podłoże stopniowo usuwa obciążenie koleiny.
Bardzo przeciążone auto może pozostać zakopane również po dołączeniu 4×4.

Środek osi przyczepy jest teraz 0,14 L za środkiem łodzi (zamiast 0,08 L),
a zaczep 1,45 m przed dziobem. Dłuższy dyszel i masa zachowują rzeczywiste
ramiona momentów. Odczepienie wymaga postoju i suchego podłoża pod
przyczepą. Odłączona przyczepa otrzymuje hamulec i podporę; przegub nie
przenosi już sił na SUV-a. Przyłączenie: do 55 cm i 0,5 rad różnicy kursów.
Złożenie powyżej około 70° podczas kontaktu/ruchu nalicza szkody SUV-a,
przyczepy i zaczepu. Ograniczenie przy 80° pozostaje kontaktem mechanicznym.
Postój sam w sobie nie nalicza kolejnych szkód. Zniszczony zaczep rozłącza
zestaw; szkody pojazdu ograniczają dostępny napęd.

SUV ma wysokość i pitch z dwóch punktów pod osiami. Przyczepa ma osobną
wysokość osi i pitch z zaczepu (lub podpory po odłączeniu). Całe grafiki,
z kołami i nadwoziem/ramą, są obracane o te kąty, bez spłaszczania ramy.
Kadłub używa swojego heave/pitch/roll i nie kopiuje kąta przyczepy po
zwolnieniu pasów. Widok przy łodzi również pokazuje przyczepę, gdy jest
ona w zasięgu manewru. Po odczepieniu kokpit SUV-a pokazuje auto solo.

Zapięte pasy blokują kadłub względem ramy. Po ich zwolnieniu łódź jest
osobnym ciałem, także na lądzie i w ruchu. Trzy sekcje wodnicy mają wagi
0,32/0,36/0,32 i lokalny wypór zależny od rzeczywistego zanurzenia.
Sześć kontaktów (dwie belki × trzy sekcje) daje jednostronne siły podpór
z momentem przegłębienia i przechyłu. Podparcie o efektywnym ugięciu
2,5 cm ma tłumienie i stabilizację na kroku 1/120 s. Tarcie wzdłuż rolek
μ=0,035, poprzecznie μ=0,30. Ramy znajdują się poniżej belek: nie tworzą
niewidzialnych wysokich ścian, które utrzymałyby zsuwającą się łódź.
Przesunięty kadłub traci podparcie jednej strony, przechyla się i może spaść.

Wypór stopniowo odciąża każdą sekcję. Rufa może pływać, gdy dziób nadal
opiera się na belkach. Wskaźnik sumuje naciski i podaje kg, osobno wypór
rufy. Po utracie podpór łódź zachowuje położenie, prędkość oraz zwykłą
cumę dziobową do PRZ. Nie ma teleportacji ani jednolitego progu głębokości
zwalniającego całą łódź. Początkowa cuma ma 35 cm luzu; siła i zerwanie
używają tego samego solvera co pozostałe cumy. Na lądzie masa dodana
hydrodynamiczna zanika wraz z zanurzeniem. Spadający kadłub podlega
grawitacji, kontaktowi z gruntem, tarciu i uszkodzeniom dna. Granicę świata
przesunięto poza parking, aby nie wypychała zwolnionej łodzi z obszaru ćwiczeń.

Podpory i niezapięty kadłub przekazują wzajemne impulsy. Kontakt z ramą,
wspornikiem dziobowym i SUV-em ma prędkość względną punktów, ramiona i
masę efektywną. Szybkość ponad 1,8 m/s może wyłamać wspornik: znika
przeszkoda i cuma na zniszczonym PRZ. Łódź może wtedy uderzyć w SUV-a.
Cofający pojazd również może pchnąć i uszkodzić łódź. To oddzielne szkody
od pomostu; nie zużywają wskaźnika stanu pomostu.

Start transportowy podnosi zaburtowe do 100% trymu. Rozruch na przyczepie
jest dozwolony. Zanurzenie śruby i wlotu chłodzenia liczymy z faktycznej
geometrii. Suchy wlot przy transportowej pracy dodaje 0,65 + 0,8*n °C/s
do empirycznego bilansu ciepła, więc alarm i odcięcie termiczne następują
znacznie wcześniej niż przy zanurzonym chłodzeniu. Wpływ ciągu zanurzonego
napędu z zapiętymi pasami przenosi się na przyczepę.

Testy obejmują nacisk i unoszenie rufy, pozostawanie na cumie dziobowej po
zwodowaniu, zsunięcie i upadek w ostrym zakręcie, rozruch i brak chłodzenia,
kolizje dziobu/SUV-a, ramę poniżej belek, odpinanie i ponowne przyczepianie,
koło tarcia osi, pomoc 4×4, zakopanie w piachu, szkody przegubu, stopniowe
pedały i poprawne obroty całych sylwetek. Model nie obejmuje pełnej dynamiki
zawieszenia, deformacji opon, rozkładu ciśnienia gleby ani sprężystości ramy.

## v15: manewry, obciążenie i zęza

### Śruba, pęd boczny i kadłuby

`propWalkStrength` (0–1) wynosi domyślnie: otwarta / motorówka / płaskodenna
0,2; RIB 0,25; kabinowa 0,4; wypornościowa 0,6; skuter 0. Przyjęto śrubę
prawoskrętną: na wstecznym siła poprzeczna przy rufie jest skierowana na
lewą burtę. Wynosi `-|T| * strength * c * fade`, gdzie `c=0,30` dla
zaburtówki, `0,45` dla wału, a `fade=max(0,1-|Vw|/2,2)^2*(1-planing)`.
Dla bliźniaczych napędów przyjęto śruby przeciwbieżne: brak tego dodatku.
To parametr manewrowy, nie pomiar konkretnej przekładni czy śruby.

Prop wash zaburtówki jest już obecny w wektorze ciągu na rzeczywistym
ramieniu rufowym. Nie dodajemy drugi raz sztucznego momentu „skrętu w miejscu”.
Opcja stacjonarna utrzymuje ciąg osiowy i ma osobny ster z dopływem od śruby,
stall i słabszym sterowaniem na wstecznym. Nie symuluje saildrive. Od v17 osobny Z-drive ma wektorowany ciąg i podnoszoną stopę z trymem.
Roboczy trym jest dla niej zablokowany, wał nie unosi się na przyczepie.

Opór każdej sekcji kadłuba nadal przeciwdziała jej prędkości `v+r*x`.
Zmniejszono zbyt silny liniowy opór poprzeczny przy wolnym ruchu i tłumienie
obrotu. Przy mocnym ciągu i dużym skręcie strumień osłabia chwyt rufowych
sekcji (do 38%, zanik do 5 m/s), bez dodawania energii do pasywnego kadłuba.
Przy 150 KM po pół sekundy od neutralu test zachowuje ponad 75% ruchu
bocznego i ponad 50% prędkości obrotowej z wolnego zakrętu.

Płaskodenny ma deadrise 3°, zanurzenie referencyjne 0,23 m i łatwiejszy próg
ślizgu. RIB ma lekki kadłub, próg 0,78 względem motorówki i większą ekspozycję
na wiatr. V i kabinówka wymagają większego stosunku siły nośnej do ciężaru;
kabinówka ma też większą masę i bezwładność. Wypornościowa nigdy nie włącza
ślizgu i ma narastający opór falowy. Reakcja na fale zależy od kadłuba;
płaskodenny silniej kołysze się i podskakuje w ślizgu. Nie jest to pełna
symulacja uderzeń dna o wodę.

Wentylacja wynika z położenia napędu, prędkości i rzeczywistego zanurzenia
śruby. Poniżej 70% powierzchni zanurzonej narasta składnik zasysania powietrza;
pozostaje też składnik nadmiernego kąta trymu. Spada obciążenie i ciąg,
wzrastają obroty oraz ton silnika. Zanurzenie jest dodatkowym ograniczeniem
ciągu, a całkowicie sucha śruba nie napędza łodzi. Zgaszenie silnika zeruje
wentylację; rysowanie piany wymaga pracującej, obracającej się śruby.
Piasek ściera wyłącznie pracującą śrubę, lecz kamień może uszkodzić także
nieobracającą się stopę. Kontakt i ostrzeżenie pozostają niezależne od zużycia.

### Masa, wiatr i brzeg

Masa jest liczona ze struktury, silników, zbiorników, wyposażenia, osób
(75 kg/osobę), paliwa (0,745 kg/l) i wody w zęzie (1 kg/l).
Domyślna załoga to 2 osoby, dla skutera 1; wyposażenie 25 kg / skuter 5 kg.
Referencyjne zanurzenie odnosi się do tych standardowych ładunków i 75%
paliwa. Dodatkowy ładunek zwiększa zanurzenie o `Δm/(1000*L*B*0,7)`;
przeliczane są masa dodana i bezwładność. Woda w zęzie ma środek masy
przesunięty 0,3 długości do rufy: rufa siedzi niżej. Masa już wcześniej
wpływała na przyspieszenie i stosunek nośności do ciężaru podczas ślizgu.

`windageFactor`: skuter 0,3; otwarta i płaskodenna 0,55; motorówka 0,6;
RIB 0,9; kabinowa i wypornościowa 1,0. Mnoży boczną ekspozycję względem
motorówki (0,6), oprócz geometrycznej powierzchni i rozłożonego momentu wiatru.

W odległości do dwóch długości kadłuba od pomostu lub lądu model dodaje
słabą siłę do brzegu (maks. około 1% ciężaru przy 3 m/s), na rufowym ramieniu,
oraz do 6% osłabienia skuteczności sterowania. Siła zanika z odległością
i kwadratem prędkości względem wody; stojąca łódź nie otrzymuje losowych
impulsów. To umowny efekt manewrowy, bez CFD ani modelu przepływu pod pomostem.

### Przeciek i pompa

Zęza mieści `max(100,55*L*B)` litrów (uproszczona przestrzeń zalewana).
Przeciek zależy od uszkodzenia konstrukcji powyżej 18%, uszkodzenia dna
powyżej 8% oraz ewentualnego uszkodzenia uszczelnienia napędu przy mocnym
uderzeniu o kamienie. Otarcie samej łopatki nie tworzy fikcyjnej dziury.
Wydajność napływu wynika z umownego pola otworu i wysokości słupa wody,
`Q=0,62*A*sqrt(2*g*h)`; na suchym, uniesionym kadłubie napływ ustaje.

Pompa pobiera 4,5 A i usuwa nominalnie 33 l/min, zależnie od napięcia.
Manualne ON wymusza pracę. Od v18 AUTO odczytuje faktyczne litry przed
decyzją pływaka: start `min(15 l, 5% pojemności)`, stop `min(3 l, 1%)`.
Działa z akumulatora także bez zapłonu; poniżej 2% ładunku przestaje działać.
Alarm i czerwony wskaźnik zaczynają się od 50%. Naprawa konstrukcji i napędu
usuwa przeciek, ale wodę trzeba wypompować. Od v19 przy dużym zalaniu
utrata rezerwy wyporu dodatkowo obniża kadłub, aż do całkowitego zanurzenia;
silnik może zgasnąć po zanurzeniu osłony. To uproszczony mechanizm opisany
w raporcie v19, bez pełnego modelu 3D swobodnej powierzchni i wszystkich otworów.

### Cumy i transport

Limit prędkości wybierania wzrósł z 0,18 do 0,28 m/s; moc jednej osoby
pozostaje 65 W, siła narasta od 120 do 450 N. Tłumienie sprężystej cumy
zmniejszono z 0,65 do 0,38 tłumienia krytycznego. W teście szarpnięcia
0,5 m/s wydłużenie jest mniejsze niż 1,5%, występuje małe odbicie, a energia
kinetyczna nie przekracza początkowej.

Zestaw na parkingu zaczyna ze złożeniem około 3,7°. Podpięcie wymaga
postoju (do 0,2 m/s), odległości haka do 80 cm i kąta do 34°; w tym zakresie
przechwycenie przesuwa SUV-a do nieruchomego zaczepu, usuwając błąd więzu
przed pierwszym krokiem solvera. Poza zasięgiem nic nie jest teleportowane.
Reset SUV-a zachowuje rejs i stan łodzi; zabezpieczona łódź wraca z zestawem,
a odczepiona przyczepa pozostaje w swoim miejscu. Przy przesiadaniu skala
świata jest wspólna, z kompensacją automatycznego oddalenia kamery łodzi.
Rozrusznik samochodu ma oddzielny mechaniczny szum i modulację kompresji;
wciskanie pedału nie odtwarza już dźwięku manetki łodzi.

## v16: poprawki przyczepy i portu

Parking wcześniej dziedziczył wysokość z odległości od brzegu. Nawet na
postoju przyczepa była pochylona, a współczynnik oporu rolek 0,035 pozwalał
łodzi zjeżdżać. Plac jest teraz poziomy i łączy się z suchym końcem slipu.
Sześć podpór ma tarcie wzdłużne 0,24, boczne do 0,55, niższe podczas
przesuwania po prowadnicach. Kolebka daje ograniczoną siłę centrującą tylko
przy dodatnim nacisku kadłuba na podpory. Częściowo wyparta rufa może nadal
pływać. Zbyt głęboka przyczepa nie przyciąga pływającego kadłuba do osi.

Wciągarka jest oddzielna od ręcznych cum: uciąg `clamp(0.65*m*g,5000,40000) N`,
moc `800+80*L W`, maks. zwijanie 0,16 m/s i wydawanie 0,3 m/s. Długość liny
zmienia się tylko podczas trzymania. Prędkość maleje przy obciążeniu,
hamulec utrzymuje linę, przeciążenie ponad 1,8 uciągu zrywa linę. Reakcja
trafia do przyczepy; nie jest to kinematyczne przesuwanie kadłuba. Rzut cumą
nadal zostawia luz, a wybieranie ręką pozostaje ograniczone do 450 N / 65 W.
Przejście cumy z luzu do naprężenia uwzględnia chwilę kontaktu wewnątrz kroku.

Wspornik jest przy `offset+0,59*L+0,35 m`, a szeroki odbojnik przy
`offset+0,50*L+0,08 m`. Powolny kontakt z odbojnikiem nie uszkadza dziobu;
za szybki może wyłamać wspornik i dopuścić uderzenie w SUV-a. Linia wciągarki
i podparcie są uproszczonym modelem; nie obliczamy odkształceń ramy,
krzywizny rzeczywistego kadłuba ani pełnej przestrzennej geometrii liny.

Ocena podejścia waży osiowość i odchylenie boczne przebytą drogą, żeby
stanie w miejscu nie poprawiało średniej. Składniki: 35% oś, 35% tor,
30% pozycja i prędkość zatrzymania. Każdy punkt szkody kadłuba odejmuje
2 punkty wyniku. Zapis następuje przed dopasowaniem pozycji przy zapinaniu
pasów. Nie jest to ocena zdolności żeglarza, lecz informacja do ćwiczeń.

Trakcja mokrego betonowego slipu wynosi teraz 0,60–0,42 zależnie od zanurzenia,
a suchego 0,80. Poprzednio mokra tylna oś nie zapewniała nawet siły potrzebnej
na wyciągnięcie pustej przyczepy przy domyślnym nachyleniu 8°. Nadal obowiązują
ograniczenia tarcia, odciążenie zanurzonego samochodu, opory ciężkiego ładunku,
napęd tylnej osi / 4×4 i grzęźnięcie na piasku. W przyczepach wieloosiowych
środek osi jest cofnięty o 0,12 długości łodzi: zmienia miejsce działania opon,
wysokość ramy i obciążenie haka, a nie tylko grafikę. Test obejmuje wyjazd
pustej przyczepy dwuosiowej w 2WD i pozostawia regresję ciężkiego zestawu
na stromym slipie. Dźwięk buksowania zależy od rzeczywistego poślizgu i gazu.

Dwa stanowiska lądowego serwisu wymagają ustawienia łodzi i podłączonego
SUV-a wewnątrz obrysu, postoju w P lub na ręcznym, zapiętych pasów i
wyłączonych silników łodzi oraz zapłonu. Nie wymagają cumy do pomostu.
Zapinanie samych pasów nie wymaga wyłączenia silnika. Naprawa z wody
zachowuje poprzednie zasady.

Na piasku model przyznaje mniejsze szkody przy rozłożonym kontakcie płaskiego
dna (mnożnik 0,55 i wyższy próg powolnego osiadania) oraz RIB (0,75).
RIB ma też mniejsze zanurzenie i masę niż kabinówka. To umowne współczynniki
szkoleniowe, nie ogólna deklaracja większej wytrzymałości każdego RIB-a:
wytrzymałość rzeczywistego dna zależy także od materiału, konstrukcji i stanu.
Mnożniki nie obniżają szkód od kamieni. Uszkodzenia śruby pozostają osobne.

Swamp boat ma kadłub płaski 5,3 × 2,35 m, zanurzenie 0,16 m i śmigło
powietrzne. Ciąg bazowy jest niższy niż wodnej śruby tej samej mocy,
`25*hp^0,8`, i nadal ograniczony mocą wału. Sterowanie powstaje na rufowych
sterach w strumieniu śmigła; śmigło ma stałą oś. Opór poprzeczny i nośność
boczna są mniejsze, więc rufa wyraźnie ślizga się. Nie ma prop walk,
wentylacji wodnej, trymu, chłodzenia wodą ani biegu wstecznego. Jest to
wariant z prostym stałym śmigłem, bez odwracania jego skoku.

Woda na suchym lądzie ma zerowy prąd i wymuszenie falowe. Widoczne ślady
wymagają kontaktu kadłuba z wodą. Strzałki przy dziobie, środku i rufie używają
rzeczywistej prędkości tych punktów względem lądu; osobne drobne zmarszczki
odpowiadają przepływowi względem wody. Zacumowany ruch portowy ma dynamiczne
oscylatory heave/roll/pitch i rozłożone wymuszenie momentu falowego, nadal
ograniczony fizycznymi linami do swoich punktów cumowania.


## v17: audyt, Z-drive i lokalne poprawki

[Raport audytu v17](AUDIT_V17.md) zawiera pomiary ruchu, parametry domyślnych profili, znalezione błędy i pełną listę nowych/zmienionych testów. [Dane pomiarowe](audit-v17-results.json) odtwarza `npm run audit:physics`.
