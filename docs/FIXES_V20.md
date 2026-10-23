# Poprawki v20

## Praca napędu widoczna na wodzie

Stałe kółka za rufą w v19 wynikały z dodatniego minimum efektu także na N.
Usunięto minimum. Wypływ chłodzenia wychodzi przy tylnej części burty;
jest zależny od rzeczywistego stanu silnika, chłodzenia i zanurzenia.
Silnik wyłączony, całkowicie sucha stopa, zalana jednostka i airboat nie
wytwarzają tego wypływu.

Zwykła praca śruby daje delikatną, ciągłą strugę; V i zmarszczki kadłuba
pozostają. Wyraźna piana jest zależna od gwałtownego wzrostu prędkości wału,
przepływu przeciwnego do biegu podczas hamowania wstecznym oraz wentylacji.
Impuls po dodaniu gazu zanika z czasem 0,65 s; steruje nim zegar fizyki,
a nie liczba klatek. Na N piana śruby jest wyłączona. Na wstecznym struga
idzie do przodu i rozchodzi się obok rufy; kadłub zasłania jej podwodną część.
Efekty nie dodają sztucznego ciągu ani momentu do modelu silnika.

Usunięto kreski i poprzeczne znaczniki za zaburtówką/Z-drive. Osobny ster
za rufą jest widoczny tylko przy nieruchomym wale.

## Pompy i informacja o wodzie

| Jednostka | Wydajność nominalna | Odpowiednik US GPH |
|---|---:|---:|
| Otwarta 4,2 m | 32 l/min | 500 |
| Płaskodenna | 32 l/min | 500 |
| RIB 5,2 m | 50 l/min | 800 |
| Motorówka 5,5 m | 50 l/min | 800 |
| Kabinowa 7,5 m | 95 l/min | 1500 |
| Wypornościowa / houseboat 9 m | 126 l/min | 2000 |
| Skuter i swamp boat | 32 l/min | przyjęta mała pompa |

Dla kabinowej wybrano górną wartość wskazanego zakresu. Poniżej 12 V wydajność
maleje proporcjonalnie, powyżej jest ograniczona do nominalnej. Brak energii
zatrzymuje pompę. Pobór 4,5 A × √(wydajność / 32) różnicuje pompy również
w bilansie akumulatora. Są to założenia symulatora, bez konkretnej charakterystyki
producenta, wysokości podnoszenia i strat węża.

Panel podaje kolejno procent, napływ l/min, całkowite litry i wypompowywanie
l/min, tym samym krojem i rozmiarem cyfr. Usunięto tekst „AUTO czeka”.
Przycisk ON/OFF nadal pokazuje rzeczywistą pracę AUTO. Usuwane litry znikają
z masy i zanurzenia łodzi. Progi pływaka i mechanika przecieków zachowane.

## Odbijacze, kokpit i kamera

Trzy odbijacze na stronę obejmują tylne ćwiartki (42% długości za środkiem),
środek i przednią część burty. Ta sama szóstka jest używana przez mapę,
wskaźnik stanu i fizyczne kontakty z pomostem oraz innymi łodziami.
Nie zmieniono energetycznego modelu szkód.

Zachowano pierwszy rząd: kierownica, napęd, zegary, informacja. Zegary mają
więcej szerokości i większe tarcze, prawy panel jest węższy. Na telefonie
jezioro wróciło z 48 do 58% wysokości widoku, minimum 400 px; na komputerze
ma 60% i maksimum 800 px. P/N zapamiętuje ostatni kierunek kamery R/D.
Prędkość nadal nie przesuwa kamery SUV-a; cały zestaw mieści się w kadrze.

## Fale, cumy i mosty

Istniejące V jest teraz próbkowane także przez zacumowane łodzie. Wysokość,
nachylenie i orbitalne przyspieszenie tej samej rozchodzącej się fali sterują
ich ruchem pionowym, przechyłem, pochyleniem oraz siłami przy dziobie/rufie.
Różnica sił daje obrót, a rzeczywiste cumy ograniczają ruch i zmieniają napięcie.
Nie ma natychmiastowego kołysania od samej odległości do przepływającego gracza.

Dodano pierwsze odbicie metodą źródła lustrzanego. Normale do powierzchni
odwracają kierunek prędkości i nachylenia; długość przebytej drogi decyduje
o dotarciu grzbietu. Test przecięcia skończonego odcinka pomostu zapobiega
odbiciu od jego wyobrażonego przedłużenia. Współczynniki amplitudy:
**0,42 pomost, 0,26 brzeg, 0,12 plaża**. Energia pojedynczego odbicia jest
odpowiednio mniejsza. Wysokość fali nadal wygasa; nie ma wielokrotnego wzmacniania.

Są maksymalnie cztery pobliskie ściany pomostów i lokalna styczna brzegu,
w zasięgu 70 m. Dla fal pogodowych zasięg wynosi 24 m i dochodzi tłumienie
na drodze. To przybliżenie pierwszego odbicia, bez pełnej dyfrakcji, odbić
wielokrotnych ani CFD. Pomosty nie są traktowane jako idealne zapory do dna.
Odbite grzbiety są rysowane na wodzie, a pokład mostu po wszystkich efektach
wody i kadłubach. Filar nadal zderza się fizycznie z łodzią.

## Skrócony świat

Geograficzne współrzędne x/y pomnożono przez 0,70 względem głównej kei.
Proporcje jeziora pozostają takie same. Pomosty zdalne zmieniły położenie,
ale zachowały długości, szerokości i polery. Główny port, slip, parking,
łodzie, budynki, drzewa, metry fizyki i prędkości pozostają w swojej skali.
Szczegóły i historyczna kalibracja: [Zegrze](ZEGRZE.md).

## Weryfikacja

Dodano 11 testów modelu w `tests/fixes-v20.test.js` i 6 testów Chromium
w `tests/fixes-v20.spec.js`: wydajność/masa/zanurzenie i zasilanie pomp,
pamięć kamery, ochrona odbijaczami, impulsy piany i chłodzenie,
opóźniona reakcja zacumowanych łodzi z napinaniem cum, pasywne i skończone
odbicia, ograniczona fala pogodowa, suchy parking, kompresja mapy,
kokpit 360–1440 px, liczniki zęzy, kierunek strugi, osobny ster i warstwy mostu.

Dotychczasowe regresje v18/v19 zaktualizowano wyłącznie dla zmienionych wymagań:
70% geografii, chłodzenie zamiast piany na N, zachowanie kamery w P/N,
a także zastąpienie tekstu o czekającej pompie odczytem litrów.

Końcowa regresja: **247 testów modelu, 98 interfejsu i 5 produkcyjnych — 350/350**.
Build standalone: 297,4 KiB, bez osobnych żądań JS/CSS. Sprawdzono układ
360/390/768/1153/1440 px oraz uruchomienie z profilem Android Chrome.
