# Model v5: podstawy, założenia i ograniczenia

Model ma odtwarzać **zależności fizyczne w manewrach**, ale nie jest
zweryfikowanym cyfrowym bliźniakiem konkretnej motorówki. Nie dysponujemy
pomiarami przyspieszenia, obrotów, średnicy/pitch śruby, krzywej oporów,
rozkładu masy ani próbami skrętu i hamowania rzeczywistej jednostki.
Współczynniki wymagają takiej kalibracji, zanim można mówić o dokładności
ilościowej. Osiągi w tabelach poniżej to wyniki symulatora, nie dane producentów.

## Przejrzane materiały (20 października 2026)

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

## Stabilność kierunkowa i bezwładność

Wielkości w SI; świat: x na wschód, y na południe. Kadłub: x do dziobu,
y do prawej burty; dodatni obrót w prawo. Efektywna macierz bezwładności:
`diag(1,08*m, 1,65*m, 1,55*Izz)`, gdzie
`Izz = m*((0,27*L)^2+(0,22*B)^2) + m_paliwa*(0,16*L)^2`.

W v3 niekalibrowany moment Munka `(mx-my)*u*v` wzmacniał znoszenie w obrót
przy dużej prędkości. W v4 jest kompensowany w równaniu yaw. Podobną
możliwość korekcji przy niestabilności wskazuje komentarz w modelu Otter
Fossena (ponownie sprawdzony 20.10.2026). To wybór empiryczny dla tej
aplikacji; nie pełna identyfikacja pochodnych hydrodynamicznych kadłuba.

```
mx*u_dot = X + m*v*r
my*v_dot = Y - m*u*r
Iz*r_dot = N - D_r*r*abs(r) - Iz*(0,16+0,04*abs(u)/L)*r
```

Pochodne przeliczamy z układu obracającego się do świata. Dziewięć pasów
kadłuba liczy siły zależne od `v+r*x`, kwadratowy opór poprzeczny oraz
składnik `|u|*(v+r*x)`. Przy płynięciu naprzód środek działania sił bocznych
jest przesunięty o 0,1 L ku rufie dla stabilności kierunkowej.
Dodatkowy empiryczny opór zakrętu wynosi
`0,5*rho*draft*L*0,8*(v²+(r*L)²)` i działa przeciwnie do u.
W v5 kompensacja obejmuje również sprzężenia od masy dodanej w osiach u/v,
pozostawiając symetryczny człon Coriolisa od masy sztywnej m. Dodatkowy
opór obrotu `D_r=0,5*rho*B*L^4*0,025` ogranicza narastanie obrotu po
wytraceniu prędkości. Mniejszy opór zakrętu unika wcześniejszego przejścia
od silnego wyhamowania do obrotu prawie w miejscu. Test oporu zakrętu
wymaga nadal monotonicznego spadku prędkości i co najmniej 10% różnicy
w badanej próbie; wcześniejszy arbitralny próg 15% zastąpiono dłuższą
regresją wymagającą zachowania ruchu postępowego z 350 KM i dużym skrętem.
Nie obracamy wektora prędkości natychmiast do osi kadłuba.

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

Każdy silnik ma osobne obroty, przekładnię, trym i stan uszkodzeń oraz temperaturę. Obroty
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

Trym 0–100% odpowiada umownie −4°…18° nachylenia napędu, ze zmianą do
10 punktów procentowych/s. Wpływa na poziomą składową ciągu, powierzchnię
zwilżoną, opór podparcia i równowagowe przegłębienie. Zbyt niski trym zwiększa
zwilżenie; umiarkowany zmniejsza opory w ślizgu. Zbyt wysoki podnosi dziób
i zwiększa opór, a powyżej 68% przy prędkości i gazie włącza wentylację:
rosną obroty, maleje obciążenie i ciąg (do 84% utraty).
Grafika pokazuje spienienie i ostrzeżenie. Jest to wentylacja, a nie szczegółowy
model kawitacji czy ciśnień przy łopacie.

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

Kliknięty punkt na mapie pozwala też wybierać, luzować i odpinać cumy.
Kliknięcie dziobu otwiera obsługę kotwicy, współdzieląc stan z dolnym panelem.
Pięć knag: środek dziobu, lewy/prawy przód i lewa/prawa rufa. Kliknij
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
cztery płaty szuwarów, oryginalny mały port przedłużony o dwa pomosty i pojedynczy Y-bom, boje i pomosty na
plaży/wyspie. Dno i rysunek korzystają z tej samej funkcji odległości od brzegu.
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

Zacumowane łodzie, żaglówki i skutery mają masę, moment bezwładności,
prędkość i więzy z tłumieniem do pozycji postoju. Reagują na wiatr, prąd
oraz falę; kontakt przenosi impuls między jednostkami. Można je wyłączyć
wraz z kolizjami. To uproszczone więzy postoju, nie osobna pełna lina
MoorDyn dla każdego obiektu. Nie są samodzielnie sterowanym ruchem portowym.

Echosonda: idealny pomiar dna pod rufą i historia 60 s; fish arches to
wizualny easter egg, bez symulacji akustyki ani zachowania ryb.

## Temperatura i chłodzenie v5

Bilans skupiony `T_dot = ciepło - chłodzenie` jest modelem szkoleniowym.
Woda ma 18°C, początkowa temperatura silnika 18°C. Ciepło zależy od
kwadratu obrotów i obciążenia. Chłodzenie zależy od zanurzenia napędu,
pompy i otwarcia umownego termostatu od 64°C. Trym powyżej 64% stopniowo
ogranicza dopływ wody, powyżej 94% praktycznie go usuwa. Podniesiony napęd
nie jest chłodzony wodą. Mielizna zmniejsza przepływ; przy pełnym obciążeniu
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

## Wyniki kontrolne v5

Spokojna woda, bez kolizji terenowych (utrzymywanie pozycji testowej),
krok 1/120 s. To wyniki równań symulatora, **nie dane osiągowe prawdziwej łodzi**.

Motorówka domyślna, start 8 m/s, manetka 50%, po 5 s:

| Silnik | Prędkość [m/s] | Obrót [rad/s] | Zniesienie boczne [m/s] |
| --- | --- | --- | --- |
| 0° | 6,304 | 0 | 0 |
| 2° | 6,298 | 0,0060 | −0,018 |
| 8,6° | 6,209 | 0,0249 | −0,073 |
| 28,6° | 5,439 | 0,0747 | −0,226 |

Ten sam kadłub z 350 KM, pełny gaz po 35 s: trym 10% ok. 19,91 m/s,
trym 42% ok. 21,47 m/s, trym 100% ok. 7,77 m/s z wentylacją 96%.
Pokazuje to zależność jakościową, nie poprawny dobór 350 KM do tego kadłuba.
Testy sprawdzają także start/stop, brak paliwa, masę/zanurzenie zbiorników,
tankowanie, strumieniowe, skuter, linę z luzem, lokalne pola i postój jednostek.

## Kolizje

Prędkość normalna punktu kontaktu uwzględnia ruch i obrót; energia
`0,5*m_ef*v_normalna²`. Zachowano umowne progi dydaktyczne:
bez szkód do 0,15 m/s, z burtowymi odbijaczami do 0,30 m/s; zniszczenie
od 1,50 / 1,80 m/s. To nie są potwierdzone bezpieczne prędkości prawdziwej
łodzi, pomostu ani rzeczywistych odbijaczy. Celem manewru jest kontakt bliski zeru.
Kolizje z Y-bomami przybliża łańcuch małych prostokątów; z innymi jednostkami
podłużne kapsuły i impuls. Nie liczymy deformacji materiałów. Zniszczony
pomost nadal jest przeszkodą.
