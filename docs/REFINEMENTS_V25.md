# v25 — flota, holowane obiekty i pierwsza optymalizacja

## Menu i miejsca

Flota jest na mapie, bezpośrednio obok Pogody. Menu ma układ konfiguracji
jednostki z nowej próby, bez sekcji pogody: długość, szerokość, masa kadłuba,
liczba/moc/typ silników dozwolonych dla danego profilu, paliwo, zbiorniki,
strumieniowe, załoga i wyposażenie. Dla obiektów bez silnika osprzęt napędu
jest ukryty, a osoby po 75 kg i masa obiektu rzeczywiście zmieniają masę,
zanurzenie i bezwładność. Pusty materac 18 kg również daje się zapisać.

Lokalizacja: wodne miejsca z menu startu albo pozycja na mapie. Stan sprawny,
awaria lub mielizna oraz bez cum / zacumowana. Menu pokazuje, czy znaleziono
wolne miejsce z odpowiednią głębokością i polerami. Zacumowany start wyszukuje
rzeczywisty bok pomostu, kontroluje kolizje i zakłada do dwóch normalnych cum,
z luzem, w zasięgu 6 m. Nie ma sztucznego zamrażania pozycji. Po wskazaniu
miejsca na mapie bez dostępnego polera nie można zadeklarować cumowania.
Stan w tabeli wynika z faktycznych lin. Parking/przyczepa pozostają stanowiskiem
pierwszej łodzi, konfigurowanym w nowej próbie.

Przyciski kolejnych jednostek są obok Łódź / SUV pod sterowaniem. Wybór
pierwszej Łodzi wraca do jednostki podstawowej. Pokaż przesuwa tylko kamerę.
Otwarta konfiguracja floty, podobnie jak nowa próba, wstrzymuje symulację;
zamknięcie wraca do jej poprzedniego stanu pauzy/pracy.

## Łączenie z mapy

Kliknij widoczny punkt obcej jednostki, a następnie knagę własnej jednostki
w standardowym, przesuwalnym oknie cumowania. Dodatkowy czarny punkt przy
rufie znajduje się 0,46 długości za środkiem kadłuba. − / + oraz × w tym
oknie i w dolnym cumowaniu wybierają, wydają i odłączają także hol. Działają
wyłącznie podczas trzymania. Paski pokazują rzeczywistą siłę i granicę zerwania.

Punkty:

- zwykła motorówka i RIB: dotychczasowe pięć knag plus środkowa rufowa;
- banan i materac: wyłącznie przednie ucho;
- wiosłówka i kajak: dziób i rufa;
- barka: dziewięć punktów, w tym boczne środkowe oraz centralny poler.

Każdy koniec liny ma własne ramię przyłożenia. Obie jednostki otrzymują
przeciwne impulsy i wynikające z nich momenty. Zasięg rzutu 25 m; przy
zakładaniu 35 cm luzu, bez przyciągania. Istniejące parametry sprężystości,
tłumienia, długości 0,6–60 m, ograniczenia ręki 450 N / 65 W i zerwania według
wytrzymałości słabszego punktu są zachowane. Nie dodano zahaczania o silnik.
Stare hole zapisane w v24 pozostają w symulacji.

## Hydrodynamika i wake

Banan i materac mają osobną gałąź oporu. Nie korzystają z bocznego trzymania
stępki klasycznej motorówki. Opór wzdłużny:

`0.5 * rho * B * draft * (0.55*(1-planing)+0.10*planing) * u*abs(u)`

plus łagodny opór podparcia. Pięć bocznych pasów liczy lokalną prędkość
`v + yaw*x`, z oporem malejącym w ślizgu. Boczne masy dodane: 1,15 × masa;
bezwładność obrotowa: 1,2 × moment kadłuba; dodatkowy opór obrotu 12% gałęzi
klasycznej łodzi. Siły oporu są rozpraszające, nie dodano sztucznej siły
wyrzucającej obiekt na zewnątrz. Wynika to z zachowania pędu i siły liny,
przy mniejszym oporze bocznym. Normalnych motorówek nie przestrojono.

Wake nadal ma czas propagacji i odbicia. Dla nadmuchiwanego obiektu oprócz
ruchu pionowego i przechyłu próbkowane są wymuszenia na dziobie i rufie:
powstaje również moment obrotowy od nierównej fali. Test ostrego zwrotu 200 KM
z bananem wykazał boczny poślizg ponad 1 m/s, prędkość na łuku większą od
holownika i spotkanie jego kilwateru powyżej 5 mm; lina pozostawała cała.
To przybliżony model 2D, bez kalibracji dla konkretnego producenta sprzętu.

## Zderzenia

Impuls kolizyjny wynika z mas dodanych i ramion obu kadłubów. Energia szkody
nie jest już dzielona zawsze po równo. Podatność nadmuchiwanego obiektu jest
większa niż sztywnego kadłuba; wolny kontakt wykorzystuje jego sprężystość.
Barka stalowa jest mniej podatna i cięższa, więc silniej zatrzymuje motorówkę.

Banan/materac: do 900 J osłony drugiego kadłuba oraz 180 J progu miękkiego
kontaktu własnego obiektu; większa energia może mocno uszkodzić obiekt.
RIB: dodatkowe 180 J pochłaniania i odporność burty ×2,8; stępka i pawęż nie
otrzymują tej osłony. Kontakt odbijacza nadal nie jest liczony drugi raz jako
pełna szkoda kadłuba. Zniszczenie przy silnej kolizji pozostaje możliwe.
Test przy 1 m/s odpycha banana bez szkody motorówki; przy 8 m/s banan otrzymuje
znacznie większą szkodę niż motorówka. Te progi są parametrami gry.

## Pompa

Jeden przycisk: OFF → AUTO → ON → OFF. To wykluczające się tryby korzystające
z dotychczasowych flag i bilansu prądu, bez drugiej pompy. AUTO pozostaje
zależne od pływaka, ON działa ręcznie, OFF zatrzymuje pompę. Niebieska dioda
pokazuje AUTO, zielona faktyczną pracę. Bez energii zielona nie świeci nawet
przy wybranym ON. Główny wyłącznik i brak energii nadal odcinają pompowanie.
Stare zapisy flag manual/auto są obsługiwane.

## Ładowanie i wydajność

Gotowa strona jest jednym plikiem HTML z JS, CSS i geometrią mapy. Przeglądarka
pobiera go na początku; podczas pływania nie dociąga mapy ani tekstur z sieci.
Następnie CPU liczy fizykę, fale i rysuje Canvas. Przycięcia narastające po
rozpędzeniu wskazywały na koszt kilwateru, nie na zbyt duży jednorazowy download.

Profil CPU wskazał wielokrotne przeliczanie tych samych frontów wake oraz
alokowanie ścian pomostów dla każdej próbki. Zmieniono:

1. Geometrię pakietów fali przygotowuje się raz dla historii i danego czasu.
2. Indeks przestrzenny z komórkami 20 m wybiera kandydatów; dokładne równania
   i odbicia są potem liczone jak poprzednio. Nie usuwa się wkładów niezerowych.
3. Stałe ściany pomostów przygotowuje się raz; brzeg nadal zależy od pozycji.
4. Minimapa jest rysowana 10 Hz, główna plansza zachowuje animację przeglądarki.

Fizyka nadal 120 Hz, czas 1:1, ta sama historia wake i straty energii.
Nie zamrożono pozostałych jednostek. Test porównuje wynik ze wzorcem v24 dla
różnych czasów, punktów, jednego/dwóch odbić i wygaśnięcia, z tolerancją 1e-12.

Pomiar Node 24 na tym samym środowisku, sekwencyjnie bez równoległych testów:

| Obciążenie | v24 | v25 |
| --- | --- | --- |
| Średni krok fizyki floty, 120 Hz | 2,864 ms | 1,166 ms |
| 8000 próbek kilwateru, 180 segmentów i odbicie | 577,16 ms | 19,15 ms |
| Suma kontrolna pola | 0,6842715283806695 | 0,6842715283806695 |

Koszt kroku spadł o około 59%, próbkowanie pola było około 30 razy szybsze.
To pomiar obliczeń CPU, nie FPS na komputerze użytkownika; wpływa na nie także
rysowanie i sprzęt. [Surowe wyniki](performance-v25.json).
Powtórzenie: `node scripts/benchmark-v25.mjs`, opcjonalnie ścieżka do katalogu
`src` wersji v24 jako argument.

## Weryfikacja

- 337 testów modelu, 124 interfejsu Chrome i 6 gotowej strony — 467 zaliczonych.
- `refinements-v25.test.js`: 12 nowych przypadków punktów zaczepienia, parametrów,
  masy pustego obiektu, rzeczywistych cum, zachowania banana na łuku i wake,
  uszkodzeń miękkiego obiektu/barki/RIB-a, pompy i zgodności szybszego wake.
- `refinements-v25.spec.js`: 4 nowe przypadki pełnej konfiguracji, rzeczywistego
  zacumowanego startu, zapisania pustego materaca, przycisków stanowisk, diod
  pompy z brakiem energii oraz telefonu.
- Regresje v24 floty i produkcyjne przechodzą przez klikanie punktów na mapie.
  Testy liczby knag i napisów pompy uwzględniają nową rufową oraz tryb AUTO.
- Sprawdzono samodzielny HTML pod ścieżką GitHub Pages, Android Chrome,
  brak osobnych żądań JS/CSS oraz diagnostykę startu. Kontrola wizualna menu
  i okna łączenia w Chrome: bez błędów JavaScript.
