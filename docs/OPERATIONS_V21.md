# v21 — czas eksploatacyjny, chłodzenie i instalacja

## 1. Co zaimplementowano

Dodano warstwę księgowania w `src/operations.js`, używaną przez istniejące
systemy łodzi i SUV-a. Nie zmieniono integratora, kroku 1/120 s, równań ruchu,
kolizji, fal, wiatru, prądu, cum, kotwicy, przyczepy ani trakcji samochodu.
Nowe liczniki znajdują się pod dotychczasową konsolą: czas podróży/rejsu,
przebieg, osobne motogodziny L/P i całkowite zużycie paliwa.

To liczniki bieżącej próby. Nowa łódź/próba zeruje je wraz z resztą symulacji;
reset położenia samego SUV-a zachowuje jego liczniki. Nie są naliczane
kilometry za teleportację do parkingu lub korektę penetracji kolizji.

Rozwinięto istniejące chłodzenie o etapy temperatury, dźwięk alarmu i wygaszenie
stanu awaryjnego po ostygnięciu. Rozwinięto tę samą baterię i bilans prądu
o odbiorniki, pomiar amperów i alternator zależny od rzeczywistych RPM.
Nie utworzono drugiego modelu akumulatora. Woltomierz zachował równania v20.

Dodano wybór portu głównego, ośmiu przystani i stacji paliw oraz ETA.
Punkty docelowe są na wodzie, poza pomostami. ETA to przybliżenie w linii
prostej do punktu podejścia, przy aktualnej prędkości zbliżania, bez planowania
trasy wokół lądu/mostów. Na postoju, przy oddalaniu się albo braku zasilania
GPS nie ma fikcyjnego odliczania. Promień osiągnięcia celu: 18 m mapy.

## 2. Przyjęte parametry

### Zegary i liczniki

- `worldScale = 0.70` z istniejącej definicji geografii.
- `operationalTimeScale = 1 / worldScale = 1.428571428…`.
- `logicalDistance = physicalMapDistance / worldScale`.
- Motogodziny naliczane oddzielnie tylko przy `key === 'running'`;
  zapłon, rozrusznik i wyłączony silnik nie naliczają godzin.
- Czas podróży zaczyna biec przy pierwszym ruchu >0,10 m/s lub pracującym
  silniku; po rozpoczęciu obejmuje także postoje w ramach próby.
  Transportowana łódź nie zbiera czasu rejsu ani kilometrów od SUV-a.
  Jej pracujący silnik nadal zużywa paliwo i nalicza motogodziny.
- Przebieg to całka prędkości względem brzegu; obejmuje rzeczywisty dryf,
  bezwzględną drogę przy cofaniu i zakręty. Nie jest odległością między portami.
- L/h pozostaje stawką na godzinę logiczną. Ubytek:
  `L/h × dt_fizyki × operationalTimeScale / 3600`.
  W dwóch silnikach zużycie dzielone jest według ich faktycznych strumieni paliwa.
  Ubytek jest ograniczony ilością w zbiorniku i nadal zmienia masę/zanurzenie
  według dotychczasowego modelu. To celowy skutek zużycia paliwa, bez zmiany
  współczynników hydrodynamicznych lub przyspieszania integratora.
- SUV stosuje tę samą zasadę wyłącznie do paliwa, motogodzin i liczników;
  jego jazda, skrzynia, pedały, trakcja i przyczepa pozostają w czasie fizyki.

Przykład testowy: 700 m mapy w 840 s daje 1000 m przebiegu, 1200 s czasu
logicznego i 0,333333 h pracy silnika. Obroty i zegar animacji obejmują nadal
840 s fizycznych. `engine.clock` nie służy do naliczania motogodzin.

### Temperatura

| Etap | Temperatura |
|---|---:|
| HIGH TEMP | od 95°C |
| ALARM | od 105°C |
| OVERHEAT | od 120°C |
| Awaryjne zatrzymanie, istniejący próg | 145°C |
| Ponowny rozruch, istniejący warunek | ≤110°C |
| Skasowanie flagi awaryjnej po ostygnięciu | ≤100°C |

Zachowano bilans dopływu ciepła, termostat 64–76°C, chłodzenie zależne
od zanurzenia/wlotu i obciążenia oraz ograniczenie mocy od 105°C
(maksymalna redukcja 65%, przed zatrzymaniem ochronnym).
HIGH TEMP zapala bursztynowe ostrzeżenie; ALARM/OVERHEAT uruchamia sygnał
w istniejącym torze audio. Sygnał wymaga zasilania i włączonej stacyjki.
Przywrócenie chłodzenia i zmniejszenie gazu obniża temperaturę fizycznie,
bez natychmiastowego resetowania. Zatrzymany ochronnie silnik wymaga
ponownego rozruchu; nie uruchamia się sam. Nie dodano zatarcia ani trwałej
szkody termicznej i nie trzeba jechać do serwisu tylko z powodu przegrzania.

### Prąd i napięcie

| Odbiornik | Przyjęty pobór |
|---|---:|
| Rozrusznik | 110 A na uruchamiany silnik, dotychczasowa wartość |
| Zapłon | 1,2 A dla instalacji, dotychczasowa wartość |
| Światła LED | 0,65 A |
| GPS | 0,35 A |
| Echosonda | 0,70 A |
| Instrumenty | 0,55 A |
| Pompa zęzowa | 4,5 A × √(wydajność / 32), z v20 |
| Strumieniowe | dotychczasowy pobór zależny od siły, napięcia i wysterowania |

Domyślnie GPS, echosonda i instrumenty są włączone, światła wyłączone.
Światła są widoczne na kadłubie tylko przy rzeczywistym zasilaniu;
wyłączenie echosondy zatrzymuje zbieranie jej historii i pobór, a wyłączenie
instrumentów przygasza zegary. Woltomierz pozostaje dostępny. Pompa AUTO
zachowuje bezpośredni obwód akumulatora i istniejące zabezpieczenie rozładowania.

Alternator każdego pracującego silnika:
`12 + 22 × clamp((RPM - 750) / 4750, 0, 1)` amperów.
Zachowano dotychczasowy zakres 12–34 A, uzależniając go bezpośrednio od RPM.
W dwóch silnikach prądy alternatorów sumują się. Alternator zasila odbiorniki,
a nadwyżka ładuje ten sam akumulator. Bez silnika odbiorniki go rozładowują.
Odbiorniki są odcinane przy braku energii / niskim napięciu; działający
alternator może bezpośrednio zasilić akcesoria.

Pozostały pojemności i kalibracja v20: skuter 35 Ah, pozostałe 80 Ah
+80 Ah za każdy zainstalowany strumieniowy, `OCV = 11,8 + 1,05 × SOC`,
rezystancja `0,003 × 80 / pojemność` Ω. SOC jest całkowany z rzeczywistych
amperów i sekund fizyki. Pod obciążeniem występuje rzeczywisty spadek
napięcia; przy ładowaniu zachowano istniejący zakres 13,5–14,4 V.
Pobór, alternator i bilans widoczne są pod konsolą. W modelu dodatni
`battery.current` oznacza rozładowanie; UI pokazuje je jako „− A”,
a ładowanie jako „+ A”. Wskaźnik SUV-a nie został przebudowany.

## 3. Co używa czasu eksploatacyjnego

Wyłącznie czas rejsu/podróży, motogodziny, czasowe zużycie paliwa,
przebieg i statystyki podróży, w tym logiczna odległość/ETA do celu.
Dane księgowania nie wracają do równań sił, obrotów ani kołysania.
`operationalTimeScale` jest użyty w `operations.js` oraz opisie liczników;
ETA używa tych samych funkcji przeliczenia.

## 4. Co nadal używa czasu fizyki 1:1

Integrator 120 Hz, przyspieszenie i obrót, narastanie RPM i zmiana biegu,
trym, chłodzenie i temperatura, rozrusznik, kolizje i szkody, fale i ich
odbicia, wiatr/prąd, cumy, kotwica/wciągarki, pompy i przecieki,
ładowanie/rozładowanie akumulatora, tankowanie, naprawy, SUV/przyczepa,
sonar i wszystkie animacje oraz dźwięki. Pauza zatrzymuje oba zegary.

## 5. Testy

Dodano `tests/operations-v21.test.js` — 14 testów:

1. 700 m → 1000 m i 840 s → 0,333 h.
2. Rzeczywisty krok fizyki, zegar silnika i czas załączenia biegu.
3. Duża zmiana samych statystyk nie zmienia ruchu, kontaktów, cum, fal,
   temperatury, baterii ani pompy w dwóch identycznych symulacjach.
4. Stawka L/h, ubytek, podział na dwa silniki i masa paliwa.
5. Godziny tylko pracujących silników, brak ujemnego paliwa.
6. Łódź na przyczepie i reset SUV-a bez fikcyjnego przebiegu.
7. Pompa, przeciek i bilans Ah nadal w sekundach fizyki.
8. Faktyczny pobór każdego akcesorium i odcięcie przy pustym akumulatorze.
9. Rozrusznik 110 A, spadek napięcia i fizyczne sekundy poboru.
10. Wydajność alternatora zależna od RPM, ładowanie i dwa alternatory.
11. Strumieniowy: istniejący pobór, spadek napięcia i powrót po puszczeniu.
12. Etapy temperatury, alarm i odwracalne ograniczenie mocy bez szkód.
13. Zatrzymanie ochronne, ostygnięcie i rozruch bez serwisu.
14. Wodne punkty podejścia i ETA tylko przy zbliżaniu oraz zasilaniu GPS.

Dodano `tests/operations-v21.spec.js` — 6 testów Chromium:

- osobne motogodziny i zatrzymanie liczników przez pauzę;
- rzeczywiste przełączniki odbiorników, sonar i instrumenty;
- rozrusznik, alternator i wspólny wskaźnik napięcia;
- dynamiczne ETA i wyłączenie GPS;
- zachowany układ kokpitu i dopasowanie 360/390/768 px;
- nawigacyjne światła na mapie zależne od zasilania.

Testy starej fizyki zachowano; produkcyjne adresy testowe zmieniono na v21.

Końcowa weryfikacja: **261 testów modelu + 104 interfejsu + 5 produkcyjnych
= 370/370**. Dotychczasowe testy fizyki przeszły bez zmiany oczekiwań.
Build standalone 307,4 KiB bez zewnętrznych skryptów/CSS; sprawdzono też
uruchomienie z ustawieniami Android Chrome oraz układ telefonu i komputera.
