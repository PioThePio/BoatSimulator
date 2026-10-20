# Model v3: podstawy, założenia i ograniczenia

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

## Co było nie tak w v1

- Gaz dawał natychmiastowy ciąg proporcjonalny do położenia manetki.
  Nie było obrotów, narastania ciągu, przerwy zmiany biegu ani limitu mocy.
- Używano wyłącznie masy sztywnej 900 kg, bez bezwładności otaczającej wody.
- Opór nie zmieniał reżimu z prędkością i nie uwzględniał opływu skegu.
- Cuma miała stałą sztywność 4200 N/m niezależną od długości.
  Kliknięcie skracało ją natychmiast o 25 cm, wykonując pracę bez limitu siły.
- Wymiarów i napędu nie można było zmieniać; nie było dna, kotwicy i fal.

## Kadłub i napęd

Wielkości w SI. Układ świata: x na wschód, y na południe. Układ kadłuba:
x do dziobu, y do prawej burty. Dodatni obrót w prawo.

Profile (przed dodaniem silników i 150 kg załogi):

| Profil | L × B | Masa kadłuba | Zanurzenie | Domyślny silnik | Typ |
| --- | --- | --- | --- | --- | --- |
| Otwarta | 4,2 × 1,75 m | 380 kg | 0,28 m | 25 KM | ślizgowy |
| Motorówka | 5,5 × 2,15 m | 800 kg | 0,38 m | 60 KM | ślizgowy |
| Kabinowa | 7,5 × 2,65 m | 2100 kg | 0,55 m | 150 KM | ślizgowy |
| Wypornościowa | 9 × 3,1 m | 4200 kg | 0,75 m | 90 KM | wypornościowy |

Można zmieniać L, B i masę kadłuba. Każdy silnik dodaje szacunkowo
`28 + 0,62*KM` kg, załoga 150 kg. To nie są katalogowe masy modeli silników.
Zanurzenie skaluje się potęgą 0,32 masy kadłuba względem profilu, a nie
pełną hydrostatyką nowych, dowolnie zmienionych kształtów.

`Izz = m*((0,27*L)^2 + (0,22*B)^2)`.
Macierz efektywnej bezwładności: `diag(1,08*m, 1,65*m, 1,55*Izz)`.
Współczynniki dodanej masy są przybliżone, rozróżniają ruch wzdłużny,
poprzeczny i obrót. Równania w osiach kadłuba:

```
mx * u_dot = X + my*v*r
my * v_dot = Y - mx*u*r
Iz * r_dot = N + (mx-my)*u*v
```

Do całkowania świata poprawnie przekształcamy pochodne układu obracającego
się. Opory zależą od prędkości względem wody, wiatr od prędkości względem
powietrza. Stały prąd nie jest sztuczną stałą siłą pchającą łódź.

### Śruba i zmiana kierunku

- Obroty mają stan, narastają ze stałą czasową 0,9 s i opadają 0,45 s.
  Ciąg jest w przybliżeniu proporcjonalny do kwadratu obrotów, moc do sześcianu.
- Zmiana biegu wymaga spowolnienia wału poniżej progu i co najmniej 0,65 s
  przejścia przez luz. Redukcja obrotów przy rozłączonej przekładni: 0,28 s.
  To przyjęta łagodna obsługa przekładni; nie symulujemy jej mechanicznej awarii.
- Maksymalny statyczny ciąg jednego silnika szacujemy jako `85*KM^0,8 N`.
  Wstecz: 58% tej wartości. To przybliżenie dla typowej śruby, nie wynik
  dobierania konkretnej średnicy, skoku i krzywej KT(J).
- Ciąg spada z dodatnim posuwem, a praca nie przekracza `0,55*P_wału`
  przy niezerowej prędkości. Na postoju obowiązuje limit statyczny,
  zamiast nieokreślonego `P/v`.
- Rzeczywisty kąt silnika podąża za kołem do 0,38 rad/s. Koło zachowuje
  nastawę, ale nie teleportuje silnika. Oba silniki mają wspólny układ skrętu.
- Każdy silnik działa na rufie w `x=-0,44*L`; dwa są oddalone o `0,46*B`.
  Sumujemy osobne siły i `N = x*Fy - y*Fx`.
- Dlatego lewy naprzód / prawy wstecz daje moment w prawo; układ odwrotny
  daje moment w lewo. Równe manetki na przeciwnych biegach nie równoważą
  sił, bo wsteczny ciąg jest mniejszy. Można zrównoważyć je ręcznie.

### Prędkość i skręcanie

Opór wzdłużny ma składnik tarcia z linią `Cf=0,075/(log10(Re)-2)^2`,
opór formy, przybliżony garb falowy zależny od liczby Froude’a oraz
podparcie dynamiczne dla profili ślizgowych. Udział ślizgu przechodzi płynnie
z czasem 2,5 s. To funkcja oporu do symulacji szkoleniowej, **nie pełna
metoda Savitsky’ego** z trymem i kątem dennego V.

Dziewięć pasów kadłuba liczy opór poprzeczny i jego moment.
Dodatkowo składnik zależny od `|u|*(v+r*x)` opisuje opływ boczny przy
prędkości postępowej. Skeg reaguje także na przepływ przy neutralnym napędzie.
Siły te przeciwstawiają się lokalnej prędkości, więc mocny skręt oddaje
energię wodzie i zmniejsza prędkość. Nie ma sztucznego mnożenia prędkości
przez arbitralne „hamowanie w zakręcie”. Wstecz transom/zanurzona rufa
zwiększa opór, a moment ciągu zmienia znak.

Brakuje danych o prop walk i krzywej śruby przy przepływie przeciwnym.
Model nie dodaje zmyślonej, jednakowej siły bocznej dla wszystkich napędów.
Nie symulujemy wentylacji śruby, kawitacji, trymowania napędu ani ostrych
niestabilności ślizgu (chine walk / spin-out).

## Cumowanie i wysiłek człowieka

Cumy są jednostronnymi sprężystymi więzami o `k=EA/L`, a nie gumką ze
stałą sztywnością. EA profili: 80 / 160 / 240 / 330 kN, zerwanie:
10 / 18 / 28 / 40 kN. Są to przykładowe parametry lin, nie deklaracje
konkretnego produktu. Przy 220 N i EA=160 kN wydłużenie to ok. 0,14%.
Naciąg i tłumienie są rozwiązywane niejawnie z efektywną masą punktu
zaczepienia, aby krótka, sztywna lina nie powodowała eksplozji numerycznej.

Jedna osoba może wybierać:

- do 220 N siły (przyjęty limit do ćwiczenia),
- do 40 W pracy mechanicznej,
- do 0,18 m/s prędkości liny; luzowanie do 0,30 m/s.

Kliknięcie zadaje cel długości ±0,5 m. Algorytm uwzględnia naciąg, tempo
zmiany długości i tłumienie, zanim pozwoli skrócić linę. Nie dopisuje łodzi
prędkości ani nie przesuwa jej w stronę pomostu. Przy tej samej sile
cięższa łódź ma mniejsze przyspieszenie. Knaga utrzymuje obciążenia większe
niż 220 N — to limit wybierania ręką, nie nośności poprawnie zamocowanej cumy.

Można wybrać dowolny poler z listy lub kliknięciem mapy. Zasięg rzutu
wynosi 6 m, weryfikowany od właściwej knagi, a wybór poza zasięgiem nie
jest zastępowany najbliższym. Liny nie owijają się wokół przeszkód; brak
przewlekania przez półkluzy i pełnej pionowej geometrii cum do pomostu.

## Kotwica, łańcuch, lina, winda

Rode to łączny odcinek kotwiczny: od kotwicy wychodzi 6/8/10/14 m łańcucha
(zależnie od profilu), dalej lina, łącznie do 60 m. Wydawany jest najpierw
łańcuch, wybierana najpierw lina. Kotwica waży 6/10/16/24 kg.

Solver quasi-statyczny dzieli rode na ciężki łańcuch i lekką linę:

- ciężar łańcucha w wodzie: 12 N/m; EA 15 MN,
- ciężar liny w wodzie: 0,08 N/m; EA 180 kN,
- dla każdego odcinka `dV/ds=w`, `dx/ds=H/sqrt(H²+V²)`,
  `dz/ds=V/sqrt(H²+V²)`, wraz z wydłużeniem od naciągu,
- solver dobiera H i V0 albo długość leżącą na dnie, aby zamknąć geometrię,
- luźny zapas może leżeć w zwojach na dnie; profil jest schematem w płaszczyźnie
  kotwica–dziób, a osie profilu mają niezależne skale.

Nie zastępujemy łańcucha nieważką gumką w rzucie z góry. Przy krótkim
rode łańcuch się podnosi, rośnie pionowa składowa siły na kotwicy, a kąt
pogarsza trzymanie. Gdy kotwica jest w toni, nie staje się punktem
zamocowanym do dna. Opada z limitem 1,1 m/s i ograniczeniem wydanej długości.

Przyjęta nośność kotwicy to `m*g*K_dna*(0,18+0,82*osadzenie)*cos(kąt)^3`,
z ograniczonym minimalnym współczynnikiem kąta. K dna: 28 piasek,
12 muł, 3 skała. Kotwica osadza się stopniowo pod niskim kątem ciągnięcia,
a po przekroczeniu nośności wlecze. To **umowny model trzymania**, nie
potwierdzona siła konkretnej kotwicy, typu dna czy płyty skalnej.

Winda: wydawanie do 0,65 m/s, wybieranie do 0,35 m/s, uciąg do 2,2 kN
i moc mechaniczna do 650 W.
Przeciążenie zatrzymuje wybieranie. Blisko pionu wybieranie wyrywa kotwicę
i podnosi ją; przeciążony rode może się zerwać. Nie ma przycisku
„przenieś łódź do kotwicy”. Pionowy naciąg wpływa w przybliżeniu na
zanurzenie i przegłębienie dziobu.

Ograniczenia: lokalnie płaskie dno w równaniach zwisu, przybliżony ruch
wleczenia i zawieszonej kotwicy, brak dynamicznych drgań poszczególnych
ogniw, tarcia łańcucha o dno, zaczepienia o kamienie i hydrodynamiki każdego
segmentu. To nie jest pełny solver MoorDyn ani model geotechniczny.

## Echosonda, fale i kołysanie

Jezioro ma 600 × 400 m wody, wyspę i plaże, ze stopniowymi płyciznami przy brzegach,
niecką i mielizną w okolicy `(91,64)`. Dno zmienia materiał: piasek, skała,
muł. Echosonda pod rufą pokazuje głębokość skorygowaną do bieżącej
powierzchni, próbkuje co 0,25 s i zachowuje do 60 s historii.
To idealizowany pomiar bez opóźnienia akustycznego i błędnych ech.

Prześwit pod stępką jest minimum próbek całej długości i szerokości kadłuba, uwzględnia
zanurzenie i ruch pionowy. Ujemny prześwit zwiększa tarcie o dno, może
zatrzymać jednostkę i powoduje szkody przy ruchu. Nie ma deformacji dna
ani pełnego kontaktu kil–grunt.

Trzy harmoniczne fal (okresy 2,8 / 1,9 / 3,9 s) dają powierzchnię,
nachylenie, orbitalny przepływ i przyspieszenie. Określenie „wysokość”
oznacza sumę wysokości składowych, nie statystyczne Hs. Głębokość
referencyjna dyspersji wynosi 3 m; orbitalny ruch uwzględnia lokalną głębokość.
Reakcja kadłuba: tłumione oscylatory ruchu pionowego, przechyłu
poprzecznego i przegłębienia oraz siły orbitalnego przepływu w 2D.
Na mapie widać ruch drobnych grzbietów, zmianę cienia i linii wody
podczas kołysania; dokładne kąty są też wyświetlane obok echosondy.

Przełącznik „fala zależna od wiatru” ustawia `min(0,55; 0,004*V_wiatru²)` m.
To przyjęte małe falowanie osłoniętej przystani, **nie prognoza** bez
znajomości rozbiegu, czasu wiatru i osłony. Nie uwzględnia odbić od pomostu,
załamań grzbietów, bryzgów, zalewania ani spektrum JONSWAP/RAO.

## Wyniki kontrolne i co znaczą

Krok 1/120 s. Poniższe pomiary wykonano w spokojnej wodzie, z wyłączonymi
kolizjami terenowymi przez utrzymywanie pozycji testowej. To porównanie
zachowania równań, nie pomiary na jeziorze.

Domyślna motorówka: 1015 kg z załogą, jeden silnik 60 KM, pełny gaz od
postoju: ok. 0,03 / 0,77 / 4,44 / 8,34 m/s po 1 / 2 / 5 / 10 s.
Wstecz po 5 s: ok. 1,74 m/s, wobec 4,44 m/s naprzód.

Start 8 m/s, manetka 50%, po 5 s:

| Koło / silnik | Prędkość końcowa | Obrót |
| --- | --- | --- |
| 0 rad | ok. 5,81 m/s | 0 rad/s |
| 0,15 rad | ok. 5,55 m/s | 0,22 rad/s |
| 0,50 rad | ok. 4,49 m/s | 0,41 rad/s |

Wartości pozwalają wykrywać regresje: nie dowodzą, że konkretny kadłub
osiągnie takie samo przyspieszenie lub promień skrętu.

Automatyczne testy sprawdzają m.in. bilans energii bez napędu, reakcję na
zmianę biegu, kierunek momentu dwóch silników, większą utratę prędkości
w ciasnym skręcie, skalowanie bezwładności, limit ręcznego wybierania,
wybór polera, kontakt z dnem, zwis/naprężenie rode, wydawanie/podnoszenie
kotwicy i stabilność fal z cumami. Oddzielne testy Chromium sprawdzają UI.

## Kolizje

Zachowano dydaktyczne progi v1 (0,15 / 0,30 m/s kontakt bez szkód,
1,50 / 1,80 m/s zniszczenie), rozróżniając burtowe odbijacze.
Nie są rzeczywistymi bezpiecznymi prędkościami. Masa efektywna kontaktu
uwzględnia teraz parametry wybranego kadłuba i masę dodaną. Zniszczony
pomost pozostaje przeszkodą.

## Zmiany v3 — brzeg, śruba, sterowanie i wyciąganie kotwicy

Akwen ma teraz **600 × 400 m** i wyspę w środku. Funkcja odległości od
brzegu opisuje jednocześnie ląd, płyciznę i obrys wyspy. Plaże są na
północy, zachodzie, południu oraz po południowej stronie wyspy.
Przykładowe drzewa przy plażach są punktami D1–D8; można wybrać je
identycznie jak poler. Limit rzutu 6 m nadal liczymy od knagi.
Zmieniono materiał dna w zatokach i nachylenia, więc opis akwenu v2 powyżej
jest historyczny — szczegóły poniżej go zastępują.

### Osiadanie kadłuba

Brzeg nie jest już prostokątną ścianą kolizji. Głębokość w pobliżu plaży
rośnie jak `8,5*(1-exp(-d*0,085/8,5))`, na pozostałym brzegu stosujemy
stromszy współczynnik 0,24. Na lądzie głębokość jest ujemna, czyli podłoże
wystaje nad powierzchnię. Położenie elementów i sonda korzystają z tego
samego dna; obszar narysowanego koloru płytkiej wody jest orientacyjny.

Piętnaście próbek spodu kadłuba (pięć przekrojów × trzy punkty poprzecznie)
uwzględnia wznios dna kadłuba na końcach i przy burtach oraz aktualne
przegłębienie/kołysanie. Po wejściu w grunt:

- podłoże podtrzymuje kadłub; heave nie może umieścić dna kadłuba pod gruntem,
- część ciężaru wcześniej podtrzymywana wyporem przechodzi na dno,
- każda próbka ma własną siłę tarcia i ramię względem środka ciężkości,
  więc niesymetryczne osiadanie może obrócić łódź,
- tarcie działa przeciwnie do lokalnego ruchu, a spadek dna dodaje składową
  skierowaną ku głębszej wodzie; nie zerujemy skokowo całej prędkości,
- piasek/muł zwykle dają mniejsze szkody kadłuba niż kamienie.

To aproksymacja sztywnego kadłuba na podłożu, bez deformacji piasku,
ugniatania, grzęźnięcia i dokładnego kontaktu powierzchniowego. Wartości
współczynników tarcia i szkód są założeniami szkoleniowymi.

### Osobna śruba każdego silnika

Okrąg śruby jest próbkowany przy rufie, na `x=-0,51*L`, przy odpowiednim
poprzecznym położeniu silnika. Opuszczona końcówka sięga w modelu o 0,22 m
niżej niż nominalne zanurzenie kadłuba. Dzięki temu śruba może dotknąć
płycizny, mimo że kadłub jeszcze pływa.

Piasek nalicza stopniowe ścieranie zależne od zagłębienia, obrotów wału
i ruchu względem dna; nieruchoma, nieobracająca się śruba nie ściera się
sama. Kamienie dają oddzielne impulsy uszkodzeń, z przerwą co najmniej
0,45 s, większe przy obrotach i prędkości. Muł jest mniej ścierny niż piasek.
To zależności umowne, nie obliczenia naprężeń konkretnego stopu aluminium.

Sprawność przekazywania ciągu maleje jak `(1-uszkodzenia/100)^1,5`.
Przy 100% dany silnik nie daje ciągu, mimo że może mieć obroty. Dwa silniki
mają niezależne prześwity i stan śrub. Przełącznik podnoszenia napędów
wyłącza ciąg i opór skegów oraz usuwa śruby z kontaktu z dnem. Pozwala
podejść do drzewa dryfem lub na cumie. Nie modeluje pracy silnika na sucho.

### Kotwica: usunięte zacięcie na sztywnym łańcuchu

W v2 krok skrócenia pełnego łańcucha mógł chwilowo wymagać siły wyższej
niż limit windy. Sterownik zatrzymywał się, zanim geometria i oderwanie
kotwicy zdążyły się ustalić. Poprawiono kolejność:

1. Solver przewiduje geometrię dla żądanego skrócenia.
2. Jeśli obciążenie przekroczyłoby 2,2 kN, dobiera mniejsze skrócenie metodą
   bisekcji, zamiast wykonywać cały krok i dopiero zgłaszać przeciążenie.
3. Dla osiągalnego naciągu sprawdza wyrwanie kotwicy (kąt > 0,9 rad
   i pionowa siła większa od przyjętego oporu osadzenia).
4. Kotwica przechodzi ze stanu „dno” do „podnoszenie”. Zawieszona ma
   przybliżony tłumiony ruch wahadłowy, a jej głębokość jest ograniczona
   faktycznie wydaną długością rode.
5. Dopiero po dojściu do rolki przechodzi na pokład.

Aktualna winda: wydawanie do **0,65 m/s**, wybieranie do **0,35 m/s**,
mechaniczna moc wybierania do **650 W**, maksymalny uciąg **2,2 kN**.
Prędkość maleje pod obciążeniem. Pasek i licznik pokazują długość,
a panel podaje stan oraz faktyczne tempo. Przy rzeczywistym przeciążeniu
wyświetla „Odciąż rode: podpłyń nad kotwicę”. Nie symulujemy automatycznego
płynięcia silnikiem do kotwicy; wiatr lub gaz przeciwny do kierunku
wybierania może nadal uniemożliwić odzyskanie kotwicy.

Regresja sprawdza także kotwicę z 20 m rode po odsunięciu łodzi o 8 m,
dla motorówki i cięższego kadłuba: można wybrać rode, wyrwać kotwicę i
podnieść ją bez przekroczenia limitu windy ani zerwania sztywnego łańcucha.

### Manetka, obręcz i woda

Koło chwytamy za obręcz; zmiana położenia jest liczona z różnicy kątów
wokół środka, z ciągłym przejściem przez ±π. Centrum nie jest miejscem
chwytu, a poziome przesunięcie myszy nie jest już bezpośrednim poleceniem
skrętu. Koło nadal nie wraca samoczynnie.

Pojedyncze ↑ / W od luzu wybiera +8% (bieg pełzający), ↓ / S wybiera −8%.
Przeciwne pojedyncze naciśnięcie najpierw wybiera luz. Przytrzymanie przez
ponad 0,24 s płynnie zmienia moc. Spacja wybiera oba luzy. Dźwignie są
pionowe, z krótkim skokiem i zatrzaskiem biegu pełzającego; fizyczny napęd
zachowuje opóźnienie przekładni i obrotów. Normalizowany stan wału przy
biegu pełzającym zmierza do 0,23, a wyświetlane obroty do 750 obr/min.
Przy gazie powyżej zatrzasku obroty rosną płynnie.

Jedna kreska strugi odpowiada niskiemu ciągowi biegu pełzającego, więcej
kresek wyższym obrotom. Kierunek strugi zmienia się na wstecznym. To
wskaźnik graficzny, nie dyskretyzacja ciągu w równaniach.
Ruchy wody przy dziobie, środku i rufie korzystają z prędkości punktów
`v + ω×r` względem prądu, więc obracający się dziób i rufa mogą pokazywać
przeciwne kierunki. Krótkie ślady pozostają w układzie jeziora i są unoszone
prądem. Delikatne nierówne zmarszczki zastąpiły siatkę metrów.
