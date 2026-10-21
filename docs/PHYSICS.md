# Model v7: podstawy, założenia i ograniczenia

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
D_r = 0,5*rho*B*L^4*(0,004+0,014*udział_ślizgu)
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

Siła każdego pasa, `local=v+r*x`:
`Y=-0,5*rho*draft*dx*[2,05*shape*(1-0,28*plane)*abs(local)*local
 +(0,50+1,10*plane)*abs(u)*local] - m*0,035/13*local`.
Współczynnik 2,05 i składnik zależny od ślizgu są naszymi przybliżeniami,
nie przeniesionymi wartościami z tabel Hoernera. Większy opór poprzeczny
ogranicza liniowe znoszenie, a dynamiczny składnik poprawia stabilność
przy szybkim płynięciu.

Opór zakrętu:
`q²=v²+(0,4*r*L)²`,
`D_turn=0,5*rho*draft*L*0,7*q²*abs(u)/sqrt(u²+q²+0,5²)`.
Działa przeciwnie do `u` i **płynnie zanika przy u→0**. Dawny stały co do
wartości opór `sign(u)*(v²+(rL)²)` potrafił przytrzymywać prędkość wzdłużną
blisko zera mimo ciągu naprzód. To była główna przyczyna pełzania bokiem
i obrotu bez postępu. Mniejsze tłumienie obrotu w ruchu wypornościowym
pozwala na ciaśniejszy zakręt przy średniej prędkości. W ślizgu opór boczny
i tłumienie wzrastają, chroniąc przed nagłym obrotem przy lekkim sterze.
W v7 dochodzi opór przy dużym wychyleniu napędu:
`X_steer=-0,5*rho*L*draft*0,16*sin(delta)^2*u*abs(u)`.
To empiryczna powierzchnia zastępcza dla oporów manewrowych, nie wzór
na opór samego skegu ani współczynnik przeniesiony z modelu Fossena.
Jest zawsze dyssypatywny, rośnie kwadratowo z prędkością i łagodnie
zanika przy małym kącie. Pełny skręt z dużej prędkości powoduje wyraźne
wyhamowanie; mniejsza prędkość i udział ślizgu zmniejszają tłumienie
obrotu, przez co promień stopniowo maleje. Nie obniżamy prędkości
odgórnym limitem po wciśnięciu skrętu.
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
(85 kg na skuterze), zbiorniki i paliwo. Masa kadłuba skutera obejmuje jego
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

Ciąg statyczny zaburtowego: `85*KM^0,8 N`, wstecz 58%; sprawność graniczna
`T*v <= 0,55*P_wału`. Ciąg zależy także od posuwu, szkód i wentylacji.
Ramię silnika: `-0,44*L`, rozstaw dwóch: `0,46*B`. Sumujemy siły i momenty
każdego, dlatego przeciwny bieg obraca łódź, a równe wychylenia przeciwnych
manetek nie równoważą ciągów. Skeg działa także na luzie, gdy opływa go woda.
Oba zaburtowe skręcają wspólnie, z ograniczeniem szybkości rzeczywistego
kąta do 0,38 rad/s. Koło wykonuje dwa i pół obrotu między oporami i nie wraca do zera.

Skuter: inna masa, zanurzenie, bezwładność, kąt dyszy ±28°, ramię `-0,40*L`,
ciąg statyczny `62*KM^0,8`, sprawność 0,63, deflektor wstecz 34%.
Nie ma skegu zaburtowego ani regulowanego trymu. Bez strugi ma mały autorytet
sterowania, zaś gaz wytwarza moment przez skręconą dyszę. Kontakt z dnem
próbkujemy przy wlocie pod kadłubem. Nie modelujemy konkretnego systemu
hamowania/iBR, wyrzutu pasażera ani pełnej hydrauliki deflektora.

## Ślizg, trym i wysokość dziobu

Opór zawiera tarcie z przybliżeniem ITTC `Cf=0,075/(log10(Re)-2)^2`, garb
falowy, opór podpieranego dynamicznie kadłuba i większy opór zanurzonej rufy
na wstecznym. Udział ślizgu zależy od liczby Froude’a i ilorazu szacowanego
podparcia dynamicznego do ciężaru. Podparcie zależy od `u²`, długości,
szerokości i kąta dennego V. Cięższy kadłub wymaga większej prędkości.
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
paliwo. Pusty zbiornik zatrzymuje silnik. Tankowanie w promieniu 6 m od
stanowiska `(58;19,5)`, przy prędkości <0,15 m/s i zgaszonych silnikach:
0,65 l/s. Ruszenie lub rozruch przerywa tankowanie.

Akumulator: 80 Ah, skuter 35 Ah; start 85%. Zapłon 1,2 A,
alternator pracującego silnika 12–34 A, strumieniowe osobne obciążenie.
Napięcie zależy od naładowania i spadku pod obciążeniem; podczas ładowania
13,5–14,4 V. Woltomierz nie jest dokładnym modelem chemii akumulatora.

Strumieniowe przy kierownicy (opcje dziobowy i rufowy) działają tylko przy zapłonie,
wystarczającym napięciu i energii. Siła boczna 150–850 N zależna od masy,
ramię ±0,38 L, rozpędzenie ok. 0,22 s. Skuteczność maleje jak
`1/(1+(u/1,8)^2)`; moc elektryczna szacowana z siły. Mogą przesuwać łódź
bokiem lub obracać ją, również przy zgaszonych silnikach i włączonym zapłonie.
Brak modelu nagrzewania i znamionowego czasu pracy tunelu.

## Cumy i kotwica

Okno kotwicy jest przesuwalne. Sugestia rode to 5 razy odległość dna od
rolki dziobowej, a przy wietrze od 7 m/s, prądzie od 0,5 m/s lub ręcznej
fali od 0,35 m — 7 razy. Przy kotwicy na pokładzie próbkujemy dno pod
dziobem; po zrzucie pod kotwicą. Dodajemy wysokość rolki 0,65 m i heave.
Przycisk wpisuje sugestię do obu kontrolek; człowiek nadal decyduje, ile
wydać. Jeśli potrzebna długość przekracza zapas, komunikat pokazuje
pełną potrzebną długość, a przycisk ogranicza wpis do dostępnego rode.
To jawna reguła interfejsu, **nie wynik solvera MoorPy ani gwarancja
trzymania kotwicy**. 3:1 nie przyjmujemy jako reguły dla łańcucha z liną;
znaczenie mają dno, wiatr, fala, kotwica i wolne miejsce na obrót łodzi.

Kliknięty punkt na mapie pozwala też wybierać, luzować i odpinać cumy.
Kliknięcie dziobu otwiera obsługę kotwicy, współdzieląc stan z dolnym panelem.
Okno cumowania można przesuwać za nagłówek myszą, dotykiem albo strzałkami
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

Ręka wybiera do 220 N / 40 W / 0,18 m/s; luzowanie do 0,3 m/s. Przyciski
zadają cel ±0,5 m wykonywany stopniowo. Knaga może utrzymać większy naciąg,
ale człowiek go nie wybierze. Boje są punktami zaczepienia z umownym
stałym położeniem; nie symulujemy ich całego własnego układu dennego.
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

Akwen 600 × 400 m ma nieregularną granicę, większą wyspę (ok. 164 × 128 m),
przesmyk szerokości ok. 13 m z łagodnymi zakrętami, plaże, cztery mielizny,
cztery płaty szuwarów, oryginalny mały port z przedłużonym pomostem głównym,
trzema stanowiskami prostopadłymi z bojami i sześcioma pływającymi Y-bomami
oraz pomosty na plaży/wyspie. Dno i rysunek korzystają z tej samej funkcji odległości od brzegu.
Głębokość płynnie rośnie od brzegu; środek przesmyku ma ok. 2 m.
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
pozycji rufy co 0,14 s. Brzegi rozchodzą się w bok, dryfują z prądem
i zanikają po 6 s; po zakręcie zostają na przebytej trasie. To wizualny
model kilwateru, nie pełna teoria fal Kelvina ani numeryczna powierzchnia wody.

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

## Wyniki kontrolne v7

Spokojna woda, bez kolizji terenowych (utrzymywanie pozycji testowej),
krok 1/120 s. To wyniki równań symulatora, **nie dane osiągowe prawdziwej łodzi**.

Motorówka 5,5 m, trym 10%, pełny gaz: rozpędzenie przez 40 s, następnie
pełny skręt 35° bez zmiany gazu. Promień to chwilowy `|V|/|r|`.

| Moc [KM] | Na wprost [m/s] | Po 3 s skrętu [m/s] | Po 10 s [m/s] | Promień po 3 s [m] | Promień po 10 s [m] |
| --- | --- | --- | --- | --- | --- |
| 90 | 12.00 | 6.13 | 3.84 | 39.00 | 13.78 |
| 350 | 20.35 | 9.25 | 7.76 | 33.50 | 22.72 |

Start z postoju, domyślne 90 KM i pełny skręt, po 25 s:

| Manetka | Ruch wzdłużny [m/s] | Ruch boczny [m/s] | Obrót [rad/s] | Promień [m] |
| --- | --- | --- | --- | --- |
| 8% | 0.846 | -0.157 | 0.0578 | 14.89 |
| 25% | 1.662 | -0.340 | 0.1359 | 12.49 |
| 50% | 2.165 | -0.487 | 0.2023 | 10.97 |
| 100% | 3.040 | -0.707 | 0.2999 | 10.41 |

350 KM na wprost, pełny gaz po 35 s:

| Trym | Prędkość [m/s] | Wentylacja | Zanurzenie tarczy |
| --- | --- | --- | --- |
| 0% | 19.40 | 0% | 100% |
| 22% | 21.47 | 0% | 100% |
| 70% | 5.83 | 83% | 100% |
| 100% | 0.00 | 100% | 0% |

To wyniki konkretnej próby symulatora, nie poprawny dobór 350 KM do tej
łodzi ani pomiar ustalonej średnicy zwrotu prawdziwej jednostki. Przy
pełnym podniesieniu od początku śruba jest poza wodą i łódź nie rusza.
Test zejścia z piasku: start `(8;155)`, dziób na zachód, trym 70%,
po ustaleniu podparcia gaz wstecz 60% przez 40 s: x rośnie do około
48,5 m, łódź jest na wodzie, śruba pozostaje nieuszkodzona.

## Kolizje

Prędkość normalna punktu kontaktu uwzględnia ruch i obrót; energia
`0,5*m_ef*v_normalna²`. Zachowano umowne progi dydaktyczne:
bez szkód do 0,15 m/s, z burtowymi odbijaczami do 0,30 m/s; zniszczenie
od 1,50 / 1,80 m/s. To nie są potwierdzone bezpieczne prędkości prawdziwej
łodzi, pomostu ani rzeczywistych odbijaczy. Celem manewru jest kontakt bliski zeru.
Kolizje z Y-bomami używają odcinka o rzeczywistej szerokości,
z ruchem punktu kontaktu, bezwładnością obrotu i reakcją na zawiasie.
Kadłuby przybliżają podłużne kapsuły i impuls. Nie liczymy deformacji materiałów. Zniszczony
pomost nadal jest przeszkodą.

## Układ interfejsu v7

Menu startowe zawiera łódź, wyposażenie, miejsce startu i pogodę. R i „Nowa
próba” otwierają je z zachowaniem wyborów; dopiero „Rozpocznij rejs” tworzy
nową próbę. Zamknięcie okna wraca do aktualnego rejsu. Pogoda jest także
w przesuwalnym oknie pod ikoną na mapie. Stan jednostki jest pod mapą,
a niżej pozostają konsola, cumy i kompaktowy panel kotwicy.

Nad kołem są osobne znaczniki zadanego i rzeczywistego kąta napędu.
Wskaźnik paliwa ma E/F i kontrolkę poniżej 10%. Temperatura: niebieski
20–64°C, zielony 64–95°C, żółty 95–105°C, czerwony 105–140°C. Napięcie:
czerwony poniżej 11,5 V i ponad 14,8 V, żółty 11,5–12,2 V, zielony
12,2–14,8 V; napis rozróżnia ładowanie i spoczynek. Są to zakresy
przyjęte do tego modelu, bez norm konkretnego wskaźnika czy alternatora.
