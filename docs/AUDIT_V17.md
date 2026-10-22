# Audyt fizyki v17 — 22 października 2026

Zmiany lokalne po v16. Wyniki poniżej pochodzą z integracji modelu w kroku 1/120 s, nie z odczytania samych parametrów UI. Scenariusze otwartej wody utrzymują położenie środka w głębokim basenie, pozostawiając prędkości, obrót i dynamikę napędu swobodne, aby uniknąć przypadkowego wpłynięcia na ląd. Próby przyczepy odbywają się w rzeczywistej geometrii świata.

Odtwarzanie: `npm run audit:physics`. Pełne liczby i warunki: [audit-v17-results.json](audit-v17-results.json). To pomiary modelu uproszczonego, bez kalibracji do prób morskich konkretnej łodzi.

## Napędy

- **OUTBOARD:** zachowany skrętny wektor ciągu przy rufie i zanurzona płetwa, działająca również przy przepływie na luzie. Gaz na skręconym napędzie fizycznie przesuwa rufę i obraca kadłub.
- **Z-DRIVE:** osobny wybór. Korzysta ze skrętnego wektora ciągu, geometrii podnoszonej stopy, trymu, zanurzenia, chłodzenia i wentylacji. Wcześniej jedyna opcja stacjonarna oznaczała wał; tego rozróżnienia brakowało. Z-etka nie trafia już do gałęzi stałego wału.
- **INBOARD SHAFT:** zachowany stały kierunek śruby i osobny ster. Dopływ od śruby wzmacnia ster naprzód; na wstecznym nie dodajemy tego dopływu. Samo przekręcenie steru w nieruchomej wodzie nie obraca kadłuba.
- **WATERJET:** zachowane sterowanie wektorem strugi i słaba sterowność po odjęciu gazu. Dodano fizyczną utratę chwytu pompy po zapowietrzeniu wlotu na fali; nie dodano trymu ani klasycznego prop walk.
- **AIRBOAT:** zachowany stały ciąg powietrzny i stery w jego strudze. Nie używa zanurzonej śruby, płetwy zaburtówki ani chłodzenia wodą.

Test z postoju, pełny skręt, bieg pełzający 8%, 6 s (każdy typ na swojej jednostce; outboard/Z/shaft na tej samej motorówce):

| Napęd | Naprzód [m/s] | Bok [m/s] | Obrót [°/s] | Obrót na postoju, luz [°/s] |
|---|---:|---:|---:|---:|
| zaburtowy | 0,33 | -0,12 | 4,72 | 0,00 |
| Z-drive | 0,33 | -0,12 | 4,72 | 0,00 |
| stały wał + ster | 0,39 | -0,04 | 1,71 | 0,00 |
| waterjet | 1,22 | -0,43 | 10,86 | 0,00 |
| śmigło powietrzne | 0,22 | -0,07 | 2,96 | 0,00 |

W ruchu płetwa zaburtówki/Z oraz ster wału zachowują niewielką skuteczność na luzie. Dysza skutera bez strugi nie tworzy skrętu. Zweryfikowano też astern i różnicę reakcji wału względem napędów skrętnych.

## Prop walk

To rzeczywista siła boczna na ramieniu napędu, a nie animacja:

`Fy = -|T| × PropWalkStrength × C × max(0, 1 - |v_woda|/2,2)^2 × (1 - ślizg)`

`N = engineLever × Fy`, gdzie `C = 0,45` dla stałego wału i `0,30` dla zaburtówki/Z. Działa tylko przy pracującym pojedynczym napędzie na wstecznym. Dla przyjętej prawoskrętnej śruby rufa odchodzi na lewą burtę; układ dwóch śrub jest przeciwbieżny i efekt się znosi. Waterjet i airboat: zero.

Przykład przy ciągu wstecznym 1000 N, postoju i braku ślizgu: motorówka 5,5 m (siła .2) daje 60 N i 145 Nm; wypornościowa 9 m ze stałym wałem (siła .6) daje 270 N i 1069 Nm. Przy 2,2 m/s względem wody efekt zanika całkowicie. Zmierzono także faktyczny obrót kadłuba podczas rozpoczęcia cofania.

## Prop wash

W zaburtówce i Z jest nim sam skręcony strumień: `Fy = -T sin(δ)`, działający na rufie jeszcze zanim kadłub nabierze prędkości. Nie dodajemy drugiego sztucznego momentu za ten sam strumień. Przy stałym wale strumień naprzód zwiększa przepływ na osobnym sterze; ster nadal ma ograniczenie przy dużym kącie natarcia. Wyniki z tabeli pokazują faktyczny moment i przesunięcie przy małej prędkości.

## Wentylacja i trym

Zachowane współzależne RPM, obciążenie, zanurzenie i ciąg. Poprawiono odbudowę chwytu po ponownym zanurzeniu: utrata następuje od razu, powrót strugi ma stałą czasową 0,30 s. Sam efekt piany nie decyduje o wyniku. Zapowietrzenie wlotu skutera również zmniejsza ciąg i podnosi obroty.

Próba silnika 150 KM, manetka 65%, napływ 4 m/s:

| Stan | RPM | Ciąg [N] |
|---|---:|---:|
| Pełne zanurzenie | 4164 | 2573 |
| 40% zanurzenia | 4637 | 855 |
| Pierwszy krok po zanurzeniu | — | 891 |
| 2 s po zanurzeniu | 4166 | 2546 |

W rzeczywistej próbie Z-drive z tą samą manetką po 8 s prawidłowy trym 10% osiąga około 7,50 m/s, podniesienie 65% około 4,61 m/s; przy nadmiernym podniesieniu obroty rosną i ślizg nie jest osiągany. Oddzielna regresja przeprowadza zanurzoną tarczę przez rzeczywisty przebieg fali: pojawia się częściowe wynurzenie, wentylacja i chwilowy spadek ciągu.

**Start na przyczepie:** oba silniki zaburtowe lub Z od razu mają `trim = trimTarget = 100%`, bez oczekiwania na windę. Test obejmuje sześć profili × oba typy napędu × dwa silniki i rzeczywisty przejazd od parkingu na slip bez szkód ani kontaktu śruby. W SUV-ie jest również odczyt pozycji napędu łodzi, obok zabezpieczeń. Waterjet, wał i śmigło powietrzne nie mają fikcyjnego podnoszenia.

## Zęza, paliwo, załoga i wyposażenie

Każdy litr wody to 1 kg, paliwo 0,745 kg/l, pasażer 75 kg. Wyposażenie wchodzi do masy bezpośrednio. Masa zmienia przyspieszenia, moment bezwładności, zanurzenie i nośność potrzebną do ślizgu. Woda w zęzie przesuwa środek masy ku rufie; wpływa też na przegłębienie. Nie było potrzeby przepisywania działającego modelu masy.

Próba motorówki 90 KM, 250 l wody:

- Masa: 1124,7 → 1374,7 kg.
- Zanurzenie: 0,380 → 0,410 m.
- Po 12 s pełnego gazu: 10,10 → 9,14 m/s; udział ślizgu 81% → 48%.
- Ręczna pompa usuwa 40 l w próbie 90 s, odtwarzając masę i zanurzenie w granicy 0,02 kg / 0,01 mm.
- AUTO faktycznie startuje powyżej 20%, pobiera prąd i zatrzymuje się przy około 4%. Niewielka ilość pozostaje — tak działa histereza, a nie błąd pompowania.
- Przeciek wymaga uszkodzenia konstrukcji dna/kadłuba lub poważnego uderzenia w uszczelnienie napędu. Samo otarcie łopatek o piasek nie robi dziury w kadłubie. Pompa może nie nadążać za poważnym przeciekiem.

## Przyczepa: podpory, prowadnice, wciągarka, scoring

- Zachowano pionowe sprężyste podpory i tarcie zależne od rzeczywistego nacisku. Prowadnice otrzymały fizyczną szczelinę 15 mm: siła sprężyny/tłumika powstaje dopiero po kontakcie kadłuba z boczną powierzchnią prowadzącą, przy dodatnim podparciu. Nie ma siły przyciągającej swobodnie pływającą łódź do środka. Siły działają w punktach kontaktu, tworzą moment prostujący i reakcję na przyczepę; nie przestawiają współrzędnych łodzi.
- Po odbezpieczeniu suchy kadłub pozostaje na podporach. Spokojne ruszanie/hamowanie bez liny i wciągarki nie wyrzuca go na bok. Na slipie wyporność stopniowo zastępuje nacisk i tarcie.
- Wciągarka ma niezależną jednostronną linę sprężystą, hamulec, ograniczenie uciągu i mocy. Do 0,16 m/s zwijania i 0,30 m/s luzowania; ograniczenie mocy zwalnia zwijanie przy dużym obciążeniu. Po puszczeniu długość nie zmienia się. Może wciągać na sucho.
- Miękki odbojnik dziobowy ogranicza dalszy najazd; wspornik wciągarki stoi dalej z przodu. Wolne dojście bez szkód, szybkie uderzenie może wyłamać wspornik i spowodować kontakt z SUV-em — zachowane regresje.
- Scoring waży osiowość 35%, tor 35%, zatrzymanie 30%, odejmuje za szkody. Ocenia faktyczną drogę najazdu, a nie samo zaznaczenie „zabezpiecz”. Zapięcie pasów zachowuje osiągnięte boczne położenie i kąt; nie teleportuje do idealnej osi i nie poprawia zamrożonego wyniku.

Próby wciągania ze skręceniem:

| Początkowe przesunięcie [m] | Końcowe przesunięcie [m] | Końcowy kąt [°] | Wynik | Można zabezpieczyć |
|---|---:|---:|---:|---|
| 0,20 | 0,11 | 3,0 | 92/100 | tak |
| 0,65 | 0,04 | 0,7 | 83/100 | tak |
| 1,40 | 0,58 | 16,8 | 40/100 | nie |

Na suchych podporach wciągarka przemieściła kadłub z 0,60 m przed pozycją docelową do odbojnika (około +0,04 m), bez szkód. Po puszczeniu zmiana długości liny wynosi dokładnie 0.

Przejście wyporność/podparcie (spokojna woda, brak przenoszenia pozycji na stan „pływa”):

| Y środka SUV-a [m] | Nacisk na przyczepę [kg] | Wypór rufy | Wypór dziobu | Stan |
|---|---:|---:|---:|---|
| -20 | 1125 | 0% | 0% | podparta/częściowo pływa |
| 5 | 871 | 71% | 0% | podparta/częściowo pływa |
| 9 | 201 | 100% | 54% | podparta/częściowo pływa |
| 11 | 0 | 100% | 100% | pływa |

## SUV, parking i slip

Konkretny znaleziony błąd: boczne brzegi początku rampy miały skok wysokości nawet ponad metr. Środkowy tor był ciągły, ale najazd trochę obok mógł powodować pozornie niewytłumaczalny kontakt. Usunięto skok: płaski plac dochodzi do początku slipu; cała szerokość rampy jest ciągła, a pobocza mają łagodne przejście do brzegu. Nachylenie zaczyna się w tym samym miejscu co narysowany slip.

Siła grawitacji wynika teraz z wysokości pod przednią osią, tylną osią i osią przyczepy, a nie z włączenia stałego nachylenia po przekroczeniu granicy przez środek pojazdu. Działa także przy częściowym wjechaniu na rampę i bocznym zjeździe.

Pustą przyczepę SUV już w v16 wyciągał środkiem domyślnego slipu; nie stwierdzono braku mocy w tej próbie. Poprawki v17 usuwają błędną geometrię poza środkiem i uwzględniają rzeczywiste nachylenie pod osiami, zamiast niepotrzebnie zwiększać moc silnika. Zapas trakcji nadal ograniczają obciążenie, mokra nawierzchnia, zanurzenie i napęd RWD/4×4.

- Pusta przyczepa 2-osiowa 784 kg, RWD: podjazd 6,06 m w 4 s, końcowo 4,29 m/s.
- Pusta przyczepa 2-osiowa 784 kg, 4×4: podjazd 15,88 m w 4 s, końcowo 8,78 m/s.
- Pusta przyczepa 3-osiowa 998 kg, RWD: podjazd 5,22 m w 4 s, końcowo 3,74 m/s.
- Pusta przyczepa 3-osiowa 998 kg, 4×4: podjazd 14,27 m w 4 s, końcowo 7,93 m/s.

Niski krawężnik 7 cm wokół placu ma fizyczną wysokość, opór przy najeździe i zmianę pochylenia SUV-a. Wjazd na slip jest otwarty, bez krawężnika przecinającego tor. Opory toczenia: beton 0,014, trawa 0,045, piasek 0,110; różnicę potwierdza próba swobodnego toczenia. Usunięto też błędną klasyfikację suchej trawy jako plażowego piasku. Buksowanie ma zachowany osobny szum zależny od rzeczywistego poślizgu; nie jest uruchamiane samym gazem.

## Cumy, wiatr, prąd i fale

Nie zmieniano poprawnie działającego modelu cum. Podmuchy, prąd i przyspieszenia od fali generują przemieszczenia, obrót i zmienne naprężenia. W próbie 20 s z wiatrem 7 m/s, prądem 0,5 m/s i falą 0,3 m pierwsza zacumowana jednostka miała do około 1,18 m przemieszczenia, 5,8° obrotu i 0,20 m kołysania pionowego; naprężenia zmieniały się od 0 do 1,83 kN. Na spokojnej wodzie bez wymuszenia nie powstaje sztuczny ruch. Osobne regresje sprawdzają sprężysty odskok napiętej cumy bez dodawania energii oraz natychmiastowe zatrzymanie wybierania po puszczeniu przycisku.

## Ruch wody i grafika napędów

Usunięto groty strzałek przy kadłubie. Krótkie ukośne falujące kreski i istniejące zmarszczki zależą od prędkości punktu kadłuba względem lokalnej wody (prąd + orbitalny ruch fali, również własnej). Uwzględniają obrót dziobu/rufy. Łódź unoszona dokładnie z prądem nie produkuje fałszywego kilwateru naprzód, a stojąca przy pomoście pokazuje przepływ wody obok. Na suchym kadłubie nie ma efektów wodnych. Zachowano kilwater V przy szybkiej jeździe oraz osobne strzałki wiatru i prądu w HUD.

Zewnętrzne prostokąty silników zastąpiono krótkimi oznaczeniami kierunku napędów. Wał zachowuje osiowe oznaczenie śruby i osobny ster; airboat nadal ma śmigło w osłonie.

## RIB, płaskodenna i swamp boat

Zachowano łagodniejszy kontakt z piaskiem: mnożnik uszkodzeń RIB 0,75, płaskodenna 0,55, z wyższym progiem miękkiego wejścia dla szerokiego dna. Kontakt przy małej prędkości może nie uszkodzić kadłuba. Nie dotyczy to kamieni; szybkie wejście na piasek nadal uszkadza wszystkie jednostki.

Swamp boat: zanurzenie 0,16 m, masa kadłuba 650 kg, silnik 180 KM, jedna śruba powietrzna; boczny opór poprzeczny ×0,32 i składowa nośna ×0,25 względem standardowego modelu, tłumienie obrotu ×0,55. Stery kierują strugę powietrzną; ciąg osiowy i siła sterów mają różne zależności od kąta. Brak wstecznego, trymu, prop walk i podwodnej śruby.

Próba 20 s pełny gaz/pełny skręt, potem luz: przed odjęciem gazu około 2,05 m/s naprzód, 2,23 m/s bokiem i 21,2°/s obrotu. Po 0,5 s pozostaje 85% prędkości; kierunek wektora prędkości zmienia się tylko o około 4,1°. Po 5 s łódź nadal przesuwa się 1,19 m/s, stopniowo tracąc ruch. Osobny test sprawdza ruch po rzeczywistej płytkiej plaży i brak uszkodzeń nieistniejącej podwodnej śruby.

## Domyślne konfiguracje

Fabryczne parametry profili, bez ręcznych nadpisań. Masa całkowita zawiera silnik, zbiornik, startowe paliwo, załogę i wyposażenie. Wszystkie startują z jednym zbiornikiem napełnionym do 75%, bez sterów strumieniowych. Przy świeżej konfiguracji jednostki inne niż PWC/airboat mają zaburtówkę; Z-drive i stały wał wybiera się osobno. Zmiana profilu w otwartym menu zachowuje wybraną liczbę silników i zgodny typ napędu, aby nie kasować ręcznych ustawień. Silniki wyłączone na starcie. Na wodzie trym 10%, na przyczepie napędy podnoszone mają 100%.

| Jednostka | Dł. × szer. [m] | Kadłub / całość [kg] | Zanurzenie [m] | Napęd [KM] | Paliwo start / pojemność [l] | Załoga [os.] / wyposażenie [kg] | Obroty koła od oporu do oporu |
|---|---:|---:|---:|---|---:|---:|---:|
| Łódź otwarta 4,2 m | 4,2 × 1,75 | 380 / 629 | 0,28 | 1 × 25 · zaburtowy | 33,8 / 45 | 2 / 25 | 1,50 |
| Motorówka 5,5 m | 5,5 × 2,15 | 800 / 1125 | 0,38 | 1 × 90 · zaburtowy | 75,0 / 100 | 2 / 25 | 2,50 |
| Kabinowa 7,5 m | 7,5 × 2,65 | 2100 / 2589 | 0,55 | 1 × 200 · zaburtowy | 187,5 / 250 | 2 / 25 | 3,00 |
| Wypornościowa 9 m | 9,0 × 3,10 | 4200 / 4716 | 0,75 | 1 × 90 · zaburtowy | 300,0 / 400 | 2 / 25 | 3,50 |
| Skuter wodny 3,2 m | 3,2 × 1,22 | 310 / 430 | 0,20 | 1 × 170 · waterjet | 45,0 / 60 | 1 / 5 | 0,25 |
| Płaskodenna 4,6 m | 4,6 × 1,90 | 440 / 705 | 0,23 | 1 × 50 · zaburtowy | 33,8 / 45 | 2 / 25 | 1,50 |
| RIB 5,2 m | 5,2 × 2,25 | 470 / 801 | 0,30 | 1 × 100 · zaburtowy | 75,0 / 100 | 2 / 25 | 2,00 |
| Swamp boat · śmigło powietrzne 5,3 m | 5,3 × 2,35 | 650 / 1024 | 0,16 | 1 × 180 · śmigło powietrzne | 67,5 / 90 | 2 / 25 | 0,75 |

Menu: liczba silników i rodzaj napędu w jednym wierszu, załoga i wyposażenie na końcu. Przy skuterze wyświetlany jest waterjet, nie nieaktywna etykieta zaburtówki.

## Testy i regresje

Dodano 27 prób modelu w `tests/audit-v17.test.js` (pięć pierwszych generuje wspólna macierz):

- Macierz napędów: outboard, Z-drive, wał, waterjet i airboat — fizyczne przesunięcie i obrót pod gazem, brak obrotu na postoju na luzie, wsteczny.
- shaft rudder wash turns from rest but is weaker than a vectored drive, especially astern.
- single-screw reverse prop walk applies a stern force and yaw moment; fixed shaft has the strongest walk, jets and fans have none.
- neutral reduces moving-hull steering; a coasting waterjet loses nozzle steering completely.
- ventilation raises RPM, cuts thrust and restores wet grip gradually instead of jumping to full thrust.
- a waterjet that inhales air loses pump grip, flares RPM and recovers after its inlet is submerged.
- wave exposure really removes propeller grip and its return is gradual.
- bilge water adds physical mass/draft, slows acceleration and delays planing; manual pump restores mass/draft.
- guide contacts gradually centre a mild approach, while a grossly skewed approach cannot secure itself and receives a low score.
- guides cannot attract a floating hull with no bunk contact and cannot move a supported hull inside their clearance.
- dry winch hauls against bunk friction, stops at the bow roller without damage and holds its exact paid-out length on release.
- score measures heading, lateral tracking, stop position and impact penalty independently.
- dry support, partial flotation and full flotation exchange load continuously without launch damage.
- SUV pulls empty tandem and larger trailers up the wet ramp in RWD; AWD improves climb and actual wheelspin has sound.
- parking and entire slip width join continuously; yard is flat and the slope starts at the drawn ramp entrance.
- outboard and Z-drive loaded starts keep every engine fully raised throughout an actual reverse journey from parking to slip.
- grass and sand have measurably higher rolling resistance than the paved yard.
- a low parking curb changes wheel height, SUV pitch and its physical coasting speed.
- mooring lines allow wave/current/wind-driven movement and yaw with dynamic slack and tension; calm boats stay still.
- hull water effects follow current and wave-relative point velocity, including lateral drift; drifting with current produces no false forward motion.
- sand gives RIB and flat hulls less low-speed damage, but high-speed entry remains damaging.
- swamp fan/air rudders generate broad sideslip and carry world momentum after throttle release instead of acting as an outboard.
- swamp boat traverses water shallower than a submerged propeller and never incurs propeller-bottom damage.

Dodano 4 próby interfejsu w `tests/features-v17.spec.js`:

- Z-drive is distinct from a fixed shaft and has working shared trim/tilt controls.
- trailer starts show actual raised drive in SUV mode and preserve 100% after entering the boat and restarting a trial.
- setup pairs engine and propulsion, places crew/equipment last and identifies the jet correctly.
- mobile setup and revised water/drive rendering remain usable with independent wind/current arrows.

Zmodyfikowano istniejące regresje:

- `tests/loading-v16.test.js`: wynik zamraża się przed zapięciem pasów, a samo zapięcie zachowuje pozycję i kąt kadłuba. Nie zamienia średniego wpłynięcia w idealne.
- `tests/towing-v14.test.js`: niebezpieczny manewr 50 km/h nadal zrzuca odbezpieczony kadłub i powoduje uszkodzenia dna; obserwacja trwa 10 s zamiast 8 s po usunięciu skoku terenu. Zachowana cuma może utrzymać dziób — test wymaga wtedy ograniczonego wydłużenia, zamiast wymuszać jej zerwanie w arbitralnym momencie.
- `tests/startup.production.js`: adresy testowe z numerem wersji 17; zachowane pięć testów rzeczywistego samodzielnego buildu, w tym emulacja Android/Chrome i obsługa błędu uruchomienia.

Walidacja końcowa: `npm test` — 206/206; `npm run test:e2e -- --reporter=line` — 74/74; `npm run test:production` — 5/5. Łącznie 285 prób. Szczegóły powyżej odnoszą się do nowych/zmienionych testów; wcześniejsze regresje sterowności, kilwateru, cum, fal, hałasu, slipowania, uszkodzeń, kotwicy i serwisu również zostały uruchomione.
