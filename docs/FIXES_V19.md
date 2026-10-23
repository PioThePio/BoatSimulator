# v19 — serwis, kokpit, załadunek i czytelność symulacji

## Serwis rzeczywiście przy pomoście

V18 sprawdzała, czy cały kadłub mieści się w wąskim prostokącie po jednej
stronie slipu. Cuma do sąsiedniego pomostu nie wystarczała. V19 sprawdza
bliskość pomostów serwisu oraz rzeczywistą cumę do ich dostępnej strony.
Obsługiwane są również zwykłe polery R1–R3 L/P przy slipie, nie tylko SER22.
Postój nadal dopuszcza lekki ruch: do 0,30 m/s i 0,08 rad/s. Silniki
i zapłon muszą być wyłączone.

Przycisk naprawy pojawia się na mapie w pobliżu serwisu. Na parkingu
pojawia się przy stanowiskach naprawczych. Nie trzeba szukać go w dolnym
menu ani idealnie ustawiać całej łodzi w niewidzialnej strefie. Naprawa
pozostaje stopniowa i przerywa się po odcumowaniu/odpłynięciu. Serwis
naprawia też zalany silnik; wodę nadal trzeba wypompować.

## Kontakt i szkody

Usunięto automatyczne 100% szkody po przekroczeniu 1,5/1,8 m/s. Te wartości
mogą oznaczać silny błysk kontaktu, ale nie przesądzają już o utracie łodzi.
Obliczenie zwykłej kolizji używa energii punktu kontaktu:

```
E = 0.5 * effectiveMass * normalSpeed²
excess = max(0, E - 0.5 * effectiveMass * gentleSpeed²)
capacity = max(4500, structureMass * 8) J
capacity *= 2.5, jeżeli działa odbijacz
damage = 100 * excess / capacity
```

Parametry odporności są umowną kalibracją symulatora. Przy ciągłym kontakcie
z tą samą częścią przeszkody dopisywany jest tylko wzrost szczytowej szkody.
Solver nie nalicza co pół sekundy ponownie tej samej energii. Oddzielne
uderzenie po rozdzieleniu kontaktu nadal może zwiększyć uszkodzenie.
Ścieranie dna i obracającej się śruby zachowuje osobne mechanizmy.

Regresje obejmują realny, wolny ruch pomiędzy pomostem i zacumowaną łodzią,
30 s ciągłego nacisku oraz mocne uderzenie nadal niszczące kadłub.

## Slip i przyczepa

Problem z pasami wynikał z kontroli „za płytko”, stosowanej także wtedy,
gdy kadłub już leżał na podporach. Teraz podparcie pozwala zabezpieczyć
ustawioną łódź zarówno na płytszej rampie, jak i całkowicie na lądzie.
Pozostają warunki osiowości, miejsca zatrzymania, względnej prędkości,
połączenia dziobowego i odpięcia cum od brzegu/kotwicy. Pasy zachowują
osiągnięte położenie; nie ustawiają łodzi teleportacyjnie.

Prowadnice mają wewnętrzne powierzchnie kontaktu także nad zanurzonymi
podporami. Ograniczają ruch częściowo pływającej rufy. Zewnętrzna strona
prowadnicy odpycha źle wprowadzony kadłub na zewnątrz, zamiast przeciągać
go przez słupek do osi przyczepy. Siły mają ograniczenie i tłumienie,
bez zadawania kadłubowi docelowej pozycji. Błędne wpłynięcie ma niski wynik
i nie prowadzi samo do poprawnego zabezpieczenia.

Domyślny start załadunku przesunięto o 2 m płycej. Dla naszej geometrii:
slip 8°, SUV z rozstawem osi 2,9 m, poziom wody na y=7,5 m:

- przednie koła pozostają suche;
- tylne koła są zanurzone około **0,13 m**;
- podpory motorówki 5,5 m około **0,22 m** poniżej wody;
- częściowe podparcie prowadzi dziób, podczas gdy rufa może już pływać.

To sprawdzenie geometrii modelowanego zestawu, nie uniwersalna głębokość
wodowania wszystkich samochodów i przyczep. Większe zanurzenie kadłuba,
inna wysokość podpór i kąt rampy zmieniają potrzebne ustawienie. Nie dodano
liczb rzekomo potwierdzonych instrukcją konkretnego producenta.

Pełna nowa regresja używa tego startu: wpłynięcie z niewielkim odchyleniem,
kontakt prowadnic, wciąganie, wyjazd SUV-em na podpory, zatrzymanie i pasy.
Historyczne próby v13–v17 zachowują jawnie wcześniejszą głębokość startu,
aby nadal weryfikować te same warunki, obok nowej próby v19.

## Kamery i mapa

Kamera SUV-a obejmuje obwiednię całego złożonego zestawu, a przy jeździe solo
sam samochód. Przesunięcie na D/R wynosi maksymalnie **1,5 m** względem
środka tej obwiedni i jest dodatkowo ograniczane brzegami kadru. Nie zależy
od prędkości. Dopasowanie skali ma te same warunki dla każdego biegu.
Testowane są wszystkie narożniki zestawu przy różnych skrętach, rozmiarach
łodzi, przybliżeniach i szerokościach ekranu.

Kamera łodzi zmienia fizyczną skalę płynnie: od 1,0 do 0,6 między 2 a 10 m/s,
ze stałą 1,5 s. Po zwolnieniu wraca do wcześniejszej skali ręcznej.
Sprawdzono zarówno stan fizyki, jak i rzeczywistą skalę zwróconą przez renderer.

Nazwy akwenu mają rozmieszczenie w pikselach z unikaniem kolizji tekstu
i obszarów przyrządów. Dotyczy to również wybranego polera. W widoku całego
jeziora łódź dostaje kontrastowy znacznik o stałym rozmiarze i podpis.
Minimapa pokazuje lokalne **3,5 km**; jej przeliczenie kliknięcia używa tego
samego powiększenia. Nazwa jeziora jest u góry, pod nią bieżąca okolica.

## Napędy przypisane do jednostek

| Jednostka | Domyślna moc | Dostępny napęd | Domyślny skręt |
| --- | --- | --- | --- |
| Otwarta 4,2 m | 25 KM | Zaburtowy | ±45° |
| Motorówka 5,5 m | 90 KM | Zaburtowy, Z-drive | ±45° |
| Kabinowa 7,5 m | 200 KM | Zaburtowy, Z-drive, stały wał ze sterem | ±45° |
| Wypornościowa 9 m | 90 KM | Stały wał ze sterem | ±45° |
| Skuter 3,2 m | 170 KM | Waterjet | ±28° |
| Płaskodenna 4,6 m | 50 KM | Zaburtowy | ±45° |
| RIB 5,2 m | 100 KM | Zaburtowy | ±45° |
| Swamp boat 5,3 m | 180 KM | Śmigło powietrzne i stery w jego strumieniu | ±45° |

Pierwsza pozycja jest domyślna. To wybór konfiguracji tych modeli, nie zakaz
budowy innych odmian rzeczywistych łodzi. Zniknął suwak wyboru maksymalnego
skrętu. Wewnętrzne testy porównawcze nadal mogą jawnie zadawać 35° dla
powtarzalności starszego manewru. Śruba stałego wału jest pod rufą, a osobny,
wyraźniejszy ster za pawężą; mają też odrębne ramiona sił w modelu.

Swamp boat ma większy ciąg statyczny `40*KM^0.8 N`, ramię `−0.5*L` oraz
silniejszy udział sterów przy końcu zakresu. Przy średnim skręcie zachowuje
postęp i poślizg; przy pełnym skręcie od postoju w teście obraca się ponad
90° w 4,5 s, przemieszczając się mniej niż długość kadłuba. Po zdjęciu gazu
pozostaje mierzalna bezwładność. To empiryczny model, bez kalibracji do
konkretnego airboata.

## Zęza i podtapianie

Przycisk pompy jest przy napędzie. Pokazuje ON także podczas pracy AUTO,
OFF po jej wyłączeniu; informacja o wodzie i zasilaniu jest w prawym panelu.
Ręczne ON bez wody pozostaje żądaniem pracy, co panel opisuje jako oczekiwanie.
Progi AUTO i wydajność pompy zachowano z v18.

Woda nadal dodaje fizyczną masę i zwiększa zanurzenie. Od 35% zalania dochodzi
uproszczona utrata rezerwy wyporu:

```
sinkTarget = clamp((bilgeLevel - 0.35) / 0.65, 0, 1)^1.65
             * (freeboard * 1.3 + 0.65)
```

Rzeczywisty ruch pionowy dochodzi do tego stanu płynnie, z zachowaniem
podparcia na dnie. Rysunek boczny, pozycja napędu i pokład korzystają z tego
samego zanurzenia. Na pokładzie pojawia się woda, zanurzony kadłub przebija
spod powierzchni, a po całkowitym zalaniu znika w wodzie. Po 1,5 s zanurzenia
modelowanego silnika powyżej jego osłony silnik gaśnie i wymaga serwisu.
Pompowanie usuwa masę i może przywrócić pływalność. Nie jest to pełny model
3D stateczności, swobodnej powierzchni ani napływu przez wszystkie otwory.

## Woda i kokpit

Bez zmiany kilometrowej skali dodano drobniejsze zatoczki brzegu i zmienny
spadek dna. Port ma łagodnie przechodzący, utrzymywany basen. Slip i poziomy
parking zachowują własną geometrię. Start przy wyspie ma zapas głębokości
dla wszystkich jednostek. Sucha plaża jest żółta; zanurzony piasek niebieskozielony.

Na biegu jałowym widać delikatną pracę wody przy odpalonym silniku; przy
dużej mocy, wentylacji i wstecznym przeciw ruchowi silniejsze kotłowanie.
Wyłączony lub suchy napęd nie wytwarza tego efektu. Przy silniejszym wietrze
pojawiają się zmarszczki w jego kierunku; prąd ma własne przemieszczające się
ślady/pianę, także przy wyłączonych falach.

Koło, napęd, zegary i panel informacyjny mają jeden rząd pod mapą, również
na telefonie. Przy dwóch silnikach manetki i stacyjki nie nachodzą na siebie.
Profile SUV-a i kadłuba mają gładsze obrysy; koła i podpory zachowują skalę.

## Regresje

Dodano 17 testów modelu w `tests/fixes-v19.test.js` oraz 10 testów
przeglądarki w `tests/fixes-v19.spec.js`. Obejmują pełne cykle naprawy
i załadunku, szkody przy rzeczywistym ciasnym przejściu, długotrwały nacisk,
zewnętrzną stronę prowadnicy w poprzednich regresjach, zalanie i odzyskanie
pływalności, naprawę zalanego silnika, geometrię kamery, zakresy napędów,
obrót airboata, wodę, kolory brzegu, marker i czytelny układ kokpitu.

Zmodyfikowane starsze próby zachowują fizyczny sens: jawnie pierwotny punkt
na slipie, kamienie poza nową głębszą częścią portu, dopuszczalne konfiguracje
napędu, energię zderzenia zamiast natychmiastowego zniszczenia i nowe etykiety.
Sprawdzenia wydania: `npm test`, `npm run test:e2e`, `npm run test:production`.

Wynik wydania: **236/236 testów modelu, 92/92 interfejsu i 5/5 samodzielnego
HTML produkcyjnego**. Build poprawny; obejrzano układ 390 px z dwoma
silnikami, SUV-a przy 1153 px i pełny akwen. Test Android Chrome jest emulacją,
nie próbą na fizycznym telefonie.
