# v24 — kontynuacja lokalna i flota z holowaniem

## Zapis i powrót

Jeden aktualny autosave w `localStorage`, klucz `przystan-session-v1`, format
wersjonowany (`version: 1`, skala świata 0,50). Zapis co 30 s, przy ukryciu karty,
`pagehide`, utracie fokusu oraz zmianach stanowiska/floty. Bieżąca poprawna kopia
zostaje atomowo zastąpiona; poprzednia jest kopią awaryjną. Uszkodzony zapis główny
może być odtworzony z niej. Błąd dostępu/limitu pamięci pokazuje komunikat, nie
zatrzymuje gry. Nie ma eksportu, importu, serwera ani konta.

Zapis zawiera wszystkie kadłuby i ich rzeczywiste stany: pozycje, prędkości,
obroty, konfiguracje, paliwo/zbiorniki, akumulatory, silniki/trym/temperatury,
motogodziny, przebieg i zużycie, uszkodzenia, przecieki, pompy, kotwice, cumy,
hole, trasę każdej jednostki (dotychczasowy limit 1800 punktów), GPS, pogodę,
stan dynamicznych jednostek portowych, boi i Y-bomów. SUV, przyczepa, zabezpieczenia,
wciągarka i jej długość również są zapisane. Widok mapy, wybór stanowiska, sonar
i widoczność śladu wracają.

Przy starcie bez nadpisywania zapisu pokazuje się **Kontynuuj** i data kopii.
Odtworzona symulacja jest w pauzie. Wznowienie: ▷ / P. Podczas nieobecności nie
nalicza się fizyka, paliwo, Ah, temperatura, przecieki ani motogodziny.
Przytrzymywane przyciski, strumieniowe i sterowanie linami są zwolnione;
trwałe położenia manetek, stacyjek i przełączników są zachowane.
Rozpoczęcie nowej próby zastępuje bieżący zapis. Dane są przypisane do tej
przeglądarki/urządzenia i mogą zniknąć po usunięciu danych witryny.

## Flota i umieszczanie

**Flota** pod sterowaniem: do 8 jednostek łącznie, wszystkie istniejące profile
plus pięć obiektów poniżej. Dodatkowa motorówka ma wybór liczby/mocy silników,
kursu i stanu: sprawna, awaria napędu, na mieliźnie. Kliknięcie na mapie ustawia
nową jednostkę, bez przenoszenia już istniejących. Zajęte miejsca, pomosty, ląd
i zbyt płytkie starty są odrzucane; stan „na mieliźnie” wymaga płytkiej wody.
Anuluj / Esc wycofuje umieszczanie. Tryb działa również na mapie całego akwenu;
kliknięcie umieszczające nie obsługuje równocześnie polera/kotwicy.

**Stanowisko** przełącza sterowanie bez resetowania świata lub stanu łodzi.
Opuszczana jednostka otrzymuje luz, zachowując prędkość, bezwładność i stan
silników. **Pokaż** tylko przesuwa kamerę. Pozostałe jednostki dalej dryfują,
pracują na cumach/kotwicy, nabierają lub wypompowują wodę, zużywają prąd/paliwo
i reagują na kolizje. Można wybrać także obiekt bez napędu i standardowo cumować
go z polera. Kajak i wiosłówka mają sterowany wysiłek wiosłowania (W/S oraz
manetka, kierunek A/D), bez rozrusznika i pozornego silnika.

Wspólny świat portowy jest integrowany raz na krok 1/120 s, niezależnie od liczby
łodzi. Każda łódź dostaje cudze historie wake. Obiekty własnej floty mają
obustronne impulsy kolizyjne i mogą kontaktować się przez odbijacze. Podstawowe
równania dotychczasowych jednostek nie zostały przestrojone; regresja pojedynczej
jednostki porównuje wynik z dawną ścieżką krok po kroku. SUV i przyczepa pozostają
przypisane do pierwszej łodzi próby, a przejście do SUV-a wybiera jej stanowisko.

## Jednostki bez napędu

Parametry przybliżone, w SI; masa obejmuje wymienione obciążenie, jest masą
fizyczną modelu, a nie samą dekoracją. Wyporność/draft, momenty bezwładności,
masa dodana, zanurzenie na falach, opór wzdłużny/poprzeczny i dno korzystają
z dotychczasowych mechanik. Dodatkowa woda w otwartym kadłubie zwiększa masę
i zanurzenie. Zamknięte, nadmuchiwane obiekty nie mają fikcyjnej zęzy ani pompy.

| Typ | Rozmiar m | Masa kg | Zanurzenie m | Opór wzdłużny × | Opór boczny × | Lina/knaga max |
| --- | --- | --- | --- | --- | --- | --- |
| Barka | 10,5 × 3,5 | 4100 | 0,48 | 1,65 | 1,20 | 40 kN |
| Banan, 3 osoby | 4,8 × 1,1 | 260 | 0,14 | 0,60 | 0,45 | 6 kN |
| Materac, 1 osoba | 2,2 × 1,6 | 93 | 0,08 | 1,10 | 0,55 | 5 kN |
| Wiosłówka, 1 osoba | 3,8 × 1,5 | 140 | 0,18 | 0,85 | 1,00 | 6 kN |
| Kajak, 1 osoba | 3,6 × 0,7 | 100 | 0,14 | 0,65 | 1,15 | 4 kN |

Barka pozostaje wypornościowa; banan i materac mogą uzyskać dynamiczne podparcie
przy holowaniu. Średnia moc wiosłowania ograniczona do 85 W, siła do 90 N;
nieobsadzona jednostka nie wiosłuje. To rozszerzenie istniejącego modelu 2D,
bez kalibracji dla konkretnego producenta obiektu ani modelu uszkodzeń jego komór.

## Lina holownicza

Warianty: rufa → dziób oraz burta w burtę (dwie osobne liny przód/tył).
Zasięg rzutu 25 m, początkowa długość = odległość knag + 0,50 m luzu.
Nie ma teleportowania, automatycznego centrowania ani siły przy luźnym holu.

Każda napięta lina jest jednostronną sprężyną z tłumieniem Kelvin–Voigta,
rozwiązywaną niejawnie z efektywną masą obu kadłubów i ramionami knag.
`k = EA / max(1, długość)`; tłumienie `2 × 0,22 × sqrt(k / invMass)`.
Przeciwny impuls działa na obie jednostki; poza środkiem masy tworzy moment
obrotowy. Ciąg holownika musi pokonać opór i bezwładność drugiej jednostki,
a na mieliźnie również istniejące tarcie/podparcie dna.

Wybór liny: 4, 18 lub 40 kN, ograniczony wytrzymałością słabszych knag.
Szarpnięcie powyżej tej granicy zrywa hol i powiadamia obie jednostki;
zerwany hol nie generuje dalszych sił. Długość 0,60–60 m. Przytrzymaj −:
wybieranie do 0,28 m/s, 450 N / 65 W ręki; pod zbyt dużym naciągiem wybieranie
się blokuje. Przytrzymaj +: wydawanie do 0,75 m/s. Zwolnienie zatrzymuje zmianę
długości od następnego kroku. Liczby, miernik oraz kolor liny pokazują naciąg;
Odłącz usuwa daną linę. Nie ma zamkniętych pętli holowania.

## Regresje

- `fleet-v24.test.js`: 20 testów masy/zanurzenia wszystkich typów, miejsc
  umieszczania, przełączania, wspólnego świata, zgodności pojedynczej łodzi,
  luzu holu, obustronnych impulsów/momentów, zerwania, wybierania/wydawania,
  burty w burtę, obciążenia holownika, wiosłowania, dryfu, awarii, cumowania,
  ściągania z piasku, pełnego zapisu, załadowanej przyczepy, kopii awaryjnej,
  błędów pamięci i braku naliczania nieobecności.
- `fleet-v24.spec.js`: 5 testów Chrome — okresowy zapis płynącego rejsu,
  rzeczywiste przeładowanie/Continue/pauza, flota/hol/zmiana stanowiska,
  przytrzymywanie liny, telefon, brak przenikania interakcji, uszkodzony
  lub niedostępny zapis.
- `startup.production.js`: dodatkowy test gotowego samodzielnego HTML na
  ścieżce GitHub Pages: umieszczenie obiektu, hol, przeładowanie i odtworzenie.

Pełny zestaw: 325 testów modelu, 120 testów interfejsu i 6 testów produkcyjnego
HTML. Build nadal zawiera JS/CSS w jednym pliku, bez zewnętrznych assetów.
