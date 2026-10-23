# v22 — mapa 50%, napędy, kilwater i kontakt odbijaczy

## Skala i audyt położeń

`WORLD_DISTANCE_SCALE = 0.50` odnosi się bezpośrednio do **pierwotnego atlasu**
75 px / km, a nie do poprzedniego świata 70%. Przeliczenie każdej pozycji
geograficznej: `p50 = (80, 4) + 0.50 * (pOriginal - (80, 4))`.
Świat ma 8533,33 × 6946,67 m. Linie brzegowe, wyspy, naturalne plaże i mielizny
zachowują proporcje. Współrzędne geograficzne mają transformację odwrotną.

Port jest lokalną, sztywną grupą o rozmiarach w metrach: skalowany jest punkt
osadzenia całej grupy; nie skraca się stanowisk, nie ścieśnia Y-bomów ani
parkingu. Główny punkt odniesienia pozostaje (80, 4). Odległe przystanie
przesunięto wraz z brzegiem, po czym ich nasady osadzono na nowym brzegu.
Długości pomostów 20–40 m, szerokość 1,8 m, Y-bomy 10 × 0,25 m,
slip 7 × 44 m, samochód, przyczepa, łodzie, budynki i drzewa nie zmalały.

Znalezione i poprawione błędy:

- Cztery pomosty dawnego fikcyjnego jeziora (`DOCKS[6..9]`) miały stare,
  bezwzględne pozycje 4/17/328 m. Nie należały już do żadnego brzegu Zegrza.
  Dwa tworzą teraz L przy Dzikiej Plaży, dwa przy południowym brzegu wyspy Bugu.
  Ich fizyczne wymiary zachowano.
- Główna keja i oddzielny wschodni pomost serwisu otrzymały brakujące krótkie
  dojścia do lądu. Nie zmieniono działającej zatoki serwisowej ani slipu.
- Narożnik domku serwisowego po kompresji wpadał do wody. Cały domek
  przesunięto z (142, -3) na około (139,43, -8,99), zachowując 13 × 7 m.
- Drzewa do cumowania D1, D2, D4, D5, D6 znalazły się na wodzie lub zbyt
  blisko linii brzegu. Odsunięto je do co najmniej 1,4 m w głąb lądu.
- Stara oś mostu Zegrze przecinała półwysep. Nowe końce atlasowe
  (589, 737)–(556, 748) spinają przeciwległe brzegi, a podpory stoją w wodzie.
  Pozostałe mosty również mają test podpór i wodnego środka przeprawy.
- Start plażowy odsunął się od przeniesionego pomostu. Starty na wyspie,
  jeziorze, w kanale, przy paliwie i załadunku
  mają odpowiednią głębokość, a start na jeziorze nie ma już osamotnionego
  pomostu. Plaża zachowuje dotychczasowe ćwiczenie: mała łódź pływa i może
  rzucić cumę do D1, większy kadłub może oprzeć się na płytkim piasku.
  Osobne testy płytkiego piasku korzystają z faktycznej
  linii brzegu poza nowym pomostem, a nie ze współrzędnych menu startowego.

`operationalTimeScale = 2`, `logicalDistance = physicalDistance / 0.50`.
500 m fizycznych = 1000 m przebiegu, 600 s = 0,333 h motogodzin.
Skalowanie obejmuje wyłącznie czas rejsu, motogodziny, paliwo zależne od czasu,
przebieg, statystyki i ETA. Krok 1/120 s, ruch, kolizje, obroty wału, temperatura,
zużycie energii, pompy/przecieki, fale/cumy, SUV i przyczepa nadal pracują 1:1.

## Duża mapa

`map-controls.js` obsługuje osobny środek i zoom atlasu. Jeden wskaźnik przesuwa
mapę w metrach wynikających z projekcji ekranu. Kółko zmienia powiększenie
wokół kursora; dwa palce skalują wokół środka gestu i jednocześnie przesuwają.
Zoom jest ograniczony do 1–500 × widoku całego akwenu. „Cały akwen” przywraca
środek i dopasowanie, „Do łodzi” wznawia dotychczasową lokalną kamerę. W stanowisku SUV-a „Do łodzi” również
wybiera łódź, a nie samochód; zwykłe śledzenie SUV-a zachowuje dotychczasową kamerę.

Klikalny jest dokładny ekranowy prostokąt **rzeczywiście narysowanej** nazwy POI.
Kliknięcie ustawia lokalny środek na współrzędnych tego POI i normalny zoom,
bez modyfikowania pozycji łodzi. Nie ma zgadywania najbliższego polera.
Gesty przechwytują pointerdown/move/up/cancel i click w fazie capture;
po kliknięciu POI pochłaniany jest również końcowy click, choć mapa zdążyła już
przejść do widoku lokalnego. Przeciągnięcie >4 px i pinch wykluczają kliknięcie.
Dotyk ma pointer capture i `touch-action:none`. Lokalne klikanie polerów
pozostaje dostępne po zakończeniu obsługi atlasu.

## Napędy, chłodzenie i struga

Przywrócone osobne korpusy zaburtówki i Z-etki znajdują się za pawężą,
obracają się wraz z fizycznym napędem i pokazują podnoszenie. Oddzielny ster
rysuje się wyłącznie za klasycznym wałem, ze śrubą pod rufą.

`drive-effects.js` korzysta z fizycznego położenia śruby, kąta wektora siły
oraz `effectiveThrust` po uwzględnieniu trymu, zanurzenia, wentylacji i szkód.
Dla ciągu T długość strugi wynosi `0.55 + 0.075 * sqrt(abs(T))` m,
szerokość początkowa `0.09 + 0.004 * sqrt(abs(T))` m; krycie również rośnie
z ciągiem. Pełzanie daje małą, ciągłą strugę, średni i pełny gaz coraz dłuższą.
Ruchome wstęgi/przekroje pokazują przepływ, a bąble są zarezerwowane dla
zaburzeń. Piana nie wynika wyłącznie z wysokiego RPM.

Zaburtowy i Z-drive skręcają strugę zgodnie z przeciwnym do siły kierunkiem
wyrzucanej wody. Wał zachowuje oś stałej śruby niezależnie od steru, waterjet
korzysta z dyszy, airboat nie tworzy podwodnej strugi. Każdy z dwóch silników
ma własny ciąg, kąt i efekt. Domyślnie działa wspólna kierownica. W istniejących
ustawieniach kierownicy można odpiąć wspólne sterowanie i wybrać osobno kąty
obu zaburtówek/Z-etek; ograniczenie i prędkość aktuatora pozostają takie same.
Ten sam kąt jest użyty w wektorze siły, grafice napędu i strudze.

Krótkie kotłowanie występuje po szybkim wzroście obrotów/załączeniu biegu
(zanik około 0,65 s), podczas hamowania śrubą, wentylacji oraz odzyskiwania
przyczepności (dodatkowy impuls zanikający w około 0,45 s). Istniejący fizyczny
model wentylacji i płynnego powrotu ciągu nie został zastąpiony. Zgaszony,
całkowicie wynurzony silnik i airboat nie produkują piany śruby.

Wypływ chłodzenia jest przy 53% długości za środkiem, po zewnętrznej stronie
rufy; strużka ma 6,5–10 cm szerokości i rozchodzi się małym kręgiem.
W parze silników znak rzeczywistego `engine.y` określa lewą/prawą stronę,
zamiast błędnego odwrócenia indeksów. Pracujący, chłodzony silnik ma strużkę
również na luzie; wyłączony lub bez wody chłodzącej jej nie ma.

## Zęza od rozprysków

Napływ ma osobne `leakInflow` i `deckInflow`, sumowane do istniejącego L/min.
Przeciek nadal wynika z uszkodzenia konstrukcji/uszczelnienia. Dodatkowy,
nieuszkadzający napływ zależy od prędkości >3 m/s, przyspieszenia bocznego
powyżej 0,12 g, przechyłu >0,16 rad, bocznego nachylenia fali i zalania krawędzi
pokładu. Maksimum wynosi 0,04 l/s = 2,4 l/min; kabinowe/wypornościowe mają
mnożnik 0,35, zamknięty skuter 0,08. Zwykły prosty rejs po spokojnej wodzie
ma zerowy napływ z pokładu. Osadzona lub wieziona na przyczepie łódź go nie ma.
`deckTotal` i `leakTotal` pozwalają rozdzielić źródła. Każdy litr dodaje faktyczną
masę i zanurzenie; dotychczasowa pompa/AUTO, wydajności i energia pracują bez zmian.

## Physical wake, odbicia i odbiorcy

Generator przyjmuje dowolne ciało/specyfikację i historię. Rejestr
`registerWakeSource(world, id, history)` pozwala podłączyć kolejne źródła bez
specjalnej zależności od gracza. **Nie dodano NPC.**

Amplituda zależy od prędkości względnej wody (liczby Froude'a), masy do potęgi
0,32, pierwiastka powierzchni L×B, typu kadłuba i stopnia ślizgu. Rozróżnienie
kadłubów: jet 0,42, airboat 0,65, RIB 0,78, płaskodenna 0,85, wypornościowa 1,18.
Wypornościowy garb fali zwiększa emisję, stabilny ślizg ją ogranicza względem
podobnej prędkości. Prędkości portowe są silnie tłumione; limit amplitudy
źródła 0,44 m. Emisja od 0,65 m/s, co najmniej co 0,20 s i po przebyciu
minimalnego dystansu; obracanie na postoju nie tworzy przemieszczonego kilwateru.

Fronty V rozchodzą się z prędkością `min(4.8, 0.65 + 0.28*v)` m/s i są
unoszone prądem. Rysunek i fizyka próbkują te same fronty. Wiek minimum 0,35 s,
czas zaniku 13 s i ostateczne usunięcie po 36 s; maksymalnie 185 próbek.
Pakiet fali ma zerową średnią, a sąsiednie segmenty są uśredniane, dzięki czemu
zwiększenie FPS nie zwiększa energii. Przyspieszenia orbitalne rzeczywiście
wymuszają translację i obrót, a wysokości/nachylenia — heave/roll/pitch.

Zacumowane jednostki mają fizyczne ruchy, działające cumy i teraz także
kontakt odbijaczy z pomostem. Składowa przyspieszeń od wake ma w ich istniejącym
modelu wymuszeń dodatkowy mnożnik 1,7; pogodowe współczynniki pozostały bez zmian.
Zmiany naprężenia, luzu i docisk pojawiają się po dotarciu frontu, a potem gasną.
Y-bomy zachowują istniejący zawias, sprężynę, reakcję od cum i limit ±0,12 rad;
dodano ruch pionowy i mały moment od wody. Nie odpinają się od pomostu.
Boje mają masę 140 kg, sprężystość kotwiczenia 2500 N/m, tłumienie 1000 N·s/m,
limit przesunięcia 0,55 m oraz kołysanie; są także rzeczywistym ruchomym końcem cumy.

Odbicia korzystają ze skończonych ścian i lustrzanego źródła: fala musi najpierw
dolecieć do ściany, a następnie do odbiorcy. Współczynniki amplitudy: pomost 0,56,
serwis 0,64, twarda keja 0,62, naturalny brzeg 0,34, plaża 0,08. Dopuszczono
maksymalnie dwa odbicia, drugie tylko pomiędzy bliskimi przeciwległymi ścianami
i z dodatkowym ×0,20 (maksymalnie około 8,2% pierwotnej amplitudy). Trzeciego
odbicia nie ma. Nie ma pętli magazynującej i odbijającej energię bez końca.
To przybliżony model pakietów falowych, nie CFD.

## Odbijacze i rozdzielenie szkód

Pozycje trzech odbijaczy na każdej burcie: x/L = -0,42, -0,04, +0,25.
`hull-geometry.js` odtwarza istniejący obrys kadłuba V, płaskiego i tuby RIB-a.
Dla lokalnego x liczy półszerokość i normalną powierzchni. Środek odbijacza
jest odsunięty o promień + 18 mm wzdłuż tej normalnej. Dzięki temu cały
odbijacz wisi na zewnątrz także przy zwężonej rufie i dziobie.

Promień `clamp(0.065*beam, .09, .22)` m, długość `clamp(.075*length,.28,.62)` m.
Grafika i solver używają tych samych SI pozycji i kształtu kapsuły. Zderzenie
wybiera najgłębszy kontakt jej środka/zaokrąglonych końców — nie nalicza trzech
sprężyn za jeden odbijacz. Rotacja kadłuba obraca wszystko wspólnie.

Sprężyna `k=12000*(radius/.14)^.8` N/m, tłumienie
`c=1.05*sqrt(k*effectiveMass)` N·s/m, stabilizowane niejawnie w kroku 120 Hz.
Zakres sprężysty do 1,45 promienia (72,5% średnicy), limit wizualnego zgniotu
1,9 promienia (95% średnicy); siła ma ograniczoną pojemność. Tarcie wzdłużne
μ=0,035 pozwala ślizgać się wzdłuż pomostu, bez zahaczania/teleportowania.
Po ustaniu docisku odbijacz rozpręża się. Stopień kompresji i siła są wspólne
dla mapy, fizyki i schematu stanu jednostki.

Energia przejęta przez odbijacz nie jest księgowana jako szkoda kadłuba ani
pomostu. Po wyczerpaniu pojemności i dalszym dociśnięciu **rzeczywistego obrysu
kadłuba** stary model uszkodzeń otrzymuje wyłącznie pozostałą prędkość/energię
kontaktu. Niechroniony dziób, pawęż i odcinki burty nadal mogą uderzyć bezpośrednio.
Twardy kontakt nie jest wyłączany samą obecnością odbijaczy. Uniknięto także
zapisywania fikcyjnych sekcji uszkodzeń z zerową wartością.

## Regresje

- `map-water-v22.test.js`: 36 nowych testów modelowych — skala i pozycje, rzeczywiste
  połączenia z lądem, podpory mostów, głębokości startów, transformacje atlasu,
  creep/średni/pełny ciąg, dwa niezależne kąty, wał/jet/airboat, chłodzenie,
  surge/reverse/vent/regrip, rozpryski i masa zęzy, źródła wake, identyczna
  fizyka/odbicia źródła zewnętrznego, propagacja,
  cumowane kadłuby/cumy, boje, zawiasy Y-bomów, odbicia, 8 kształtów łodzi,
  6 odbijaczy, docisk samym opóźnionym wake bez wiatru, łagodne przesuwanie
  wzdłuż kei i pozostała energia mocnego uderzenia.
- `map-water-v22.spec.js`: 7 nowych testów Chrome — rzeczywiste gesty myszy
  i dotyku/CDP, kółko/pinch/fit, POI bez teleportu/przebicia kliknięcia,
  faktycznie widoczna grafika napędów, kąty obu napędów, kompresja grafiki
  i schematu stanu jednostki; centrowanie łodzi także ze stanowiska SUV-a.
- Zmienione regresje: `operations-v21.test.js` (500 m/1000 m i czynnik 2),
  `fixes-v20.test.js` (50% pierwotnego atlasu), `fixes-v20.spec.js` (nowe fizyczne
  wymiary grafiki odbijaczy i wypływ chłodzenia), `shore-fixture.js`, `coast.test.js`,
  `audit-v17.test.js`, `loading-v16.test.js`, `handling.test.js` (rzeczywiste płytkie
  stanowiska poza przeniesionymi pomostami), `physics.test.js`/`handling-v8.test.js`
  (pierwszy kontakt z nowym obrysem i energią odbijaczy), `handling-v7.test.js`
  (skończony 36-sekundowy czas wake), `browser.spec.js` (kontakt aktualnego obrysu
  oraz małe wychylenie kierownicy w deterministycznym zegarze),
  `startup.production.js` (wydanie v22).
- Pozostałe testy zachowują m.in. cykl załadunku/wodowania, SUV, naprawę,
  prop walk/wash, wentylację, pompę AUTO, cieplne i elektryczne systemy,
  zachowanie kamery D/R oraz P/N i układ czterech stacji kokpitu.

Weryfikacja wydania: **297/297 testów modelu, 111/111 testów interfejsu
oraz 5/5 testów gotowego pliku produkcyjnego**. Nowe scenariusze POI obejmują
paliwo, most, miejscowość, wyspę i pomost, z dodatkowym testem centrowania łodzi
ze stanowiska SUV-a. Wygenerowany `index.html` ma około 324,4 KiB i zawiera
cały JavaScript oraz CSS — test produkcyjny uruchamia go bez katalogu assets,
także pod ścieżką `/BoatSimulator/` i z dotykowym Chrome Android.
