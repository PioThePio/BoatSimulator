# Przystań — instrukcja użytkownika

Ta instrukcja opisuje całą aktualną obsługę symulatora. Wyjaśnienie równań,
parametrów i stopnia realizmu znajduje się w [opisie modelu](MODEL.md).

## Pierwsze uruchomienie i powrót

Otwórz [symulator](https://piothepio.github.io/BoatSimulator/). Wybierz łódź,
wymiary, masę kadłuba, dopuszczony dla niej napęd, liczbę silników i moc.
Ustaw zbiorniki, opcjonalne strumieniowe, załogę i wyposażenie. Podsumowanie
pokazuje rzeczywistą masę startową z paliwem oraz zanurzenie.

Wybierz miejsce startu i pogodę. Dostępne są otwarta woda, port główny,
pomosty, plaża, wyspy przy Bugu, Euzebia, Pilawa, zatoka Rządzy, paliwo,
serwis oraz zadania z SUV-em i przyczepą. Start na przyczepie podnosi
podnoszony napęd do końca. Wybór nowej próby zastępuje aktualną sesję.

Jeżeli istnieje lokalny zapis, **Kontynuuj** przywraca go w pauzie. Naciśnij
▷ lub P, aby wznowić. Nieobecność nie zużywa paliwa ani akumulatora i nie
nalicza motogodzin. Przycisk Nowa próba lub R otwiera ponownie wybór,
zachowując wcześniejsze parametry do edycji.

## Ekran i mapa

Pod mapą są obok siebie: kierownica, napęd, zegary i węższy panel stanu
z profilem zanurzenia oraz uszkodzeniami. Wybór stanowiska jest pod
sterowaniem. Na telefonie elementy są kompaktowe; nie trzeba obracać
urządzenia, ale widok poziomy ułatwia manewry.

Pasek mapy pokazuje odległość od brzegu, prędkość względem brzegu i wody,
kurs oraz prędkość obrotu. Kliknięcie paska przełącza km/h i węzły.
Wiatr oraz prąd mają osobne strzałki, wskazujące **dokąd** płyną/pchają;
kliknięcie wartości zmienia m/s na km/h. Okolica jest opisana przy mapie.

Cały akwen otwiera dużą mapę. Przeciągaj myszą lub palcem, używaj kółka
albo gestu szczypania dwoma palcami. Przyciski przywracają cały akwen
lub centrują łódź. Kliknięcie nazwanego miejsca przybliża jego okolicę,
bez przenoszenia łodzi. W tym trybie gesty nie wybierają polerów pod mapą.
Znacznik wskazuje własną jednostkę. Minimapę można kliknąć, aby obejrzeć
okolicę. Powrót do łodzi przywraca śledzenie.

Przycisk Ślad włącza lub ukrywa historię trasy. Widok łodzi oddala się
łagodnie wraz z prędkością i wraca po zwolnieniu. W SUV-ie kierunek widoku
zmienia się lekko po wybraniu D/R; P i N zachowują ostatni kierunek.

GPS pozwala wybrać przystań, w tym Pilawę i Euzebię. Odległość i ETA są
logiczne, zgodne ze skróconą geografią. ETA pojawia się podczas zbliżania
do celu, nie na postoju ani podczas oddalania. To kierunek do celu po
prostej, nie wyznaczona trasa omijająca ląd. Wyłączony GPS ukrywa odczyty.

## Sterowanie łodzią

| Czynność | Klawiatura / ekran |
| --- | --- |
| Skręt | A/D lub ←/→; chwyć obręcz albo pole między ramionami koła i obracaj po okręgu |
| Gaz / bieg | W/S lub ↑/↓; manetka oraz przyciski góra / N / dół |
| Luz obu silników | Spacja |
| Wyprostowanie | C |
| Wybór lewej / prawej manetki | 1 / 2 lub dotknięcie manetki |
| Sprzęgnięcie dwóch manetek | T lub przycisk pod nimi |
| Dziobowy strumieniowy | Przytrzymaj Q/E albo przyciski pod kierownicą |
| Rufowy strumieniowy | Przytrzymaj Z/X albo przyciski pod kierownicą |
| Odbijacze | F lub przełącznik |
| Zmiana stanowiska łódź / SUV | V lub wybór pod sterowaniem |
| Pauza / nowa próba | P / R |

Ster nie wraca sam do zera. Skok koła zależy od łodzi; skuter wymaga dużo
mniejszego ruchu niż kabinówka. Przycisk Szybkość kierownicy zmienia tempo
klawiatury na żywo, niezależnie dla łodzi i SUV-a. Wskaźnik nad kołem
rozróżnia zadany i faktyczny kąt napędu/steru.

Pierwszy krok od N wrzuca bieg pełzający. Przytrzymanie zwiększa gaz.
Silnik ma zwłokę obrotów i zmianę biegu, więc manetka nie oznacza
natychmiastowego ciągu. Dwa silniki mają własne obroty, stacyjki i siły.
Można je rozsprzęgnąć, ustawić przeciwne biegi, a w ustawieniach kierownicy
rozdzielić kąty dwóch zaburtówek/Z-etek. Trym jest wspólny.

## Rozruch, elektryka i przyrządy

Włącz główne zasilanie, ustaw N, przekręć stacyjkę w prawo: 0 → I → START.
Po rozruchu wraca do I. Obrót w lewo wyłącza silnik i zapłon do 0.
Strzałki sterowania nie obracają stacyjki. Włączony zapłon bez pracującego
silnika daje ciągły sygnał; wyłączenie zapłonu go ucisza. SUV nie ma tego
alarmu. Po zimnym rozruchu obroty lekko falują.

Pod napędem są przełączniki głównego zasilania, instrumentów, pompy,
strumieniowych, GPS i echosondy. Główne OFF odcina urządzenia i silniki.
Urządzenia działają bez zapłonu, jeśli mają zasilanie i energię.
Strumieniowe wymagają także zamontowania ich podczas konfiguracji.

Odbiorniki naprawdę zużywają akumulator. Duże obciążenie obniża napięcie,
silnik ładuje przez alternator, słaby akumulator wolniej kręci lub nie
uruchomi silnika. Wskaźnik pokazuje V i pozostały procent. Wyłączenie
samego odbiornika zachowuje jego ustawienie przy następnym zasileniu.

Zegary pokazują RPM (osobne dla dwóch silników), prędkość, paliwo, trym,
temperaturę i napięcie. Przy paliwie jest L/h. Profil obok pokazuje
uniesienie dziobu, położenie napędu, zanurzenie śruby i dno na płytkiej
wodzie. Panel stanu pokazuje zanurzenie kadłuba i wodę w zęzie.

## Trym, ślizg i chłodzenie

Przy ruszaniu i wolnych manewrach opuść napęd. W ślizgu umiarkowanie go
podnoś, obserwując prędkość, dziób i obroty. Za nisko oznacza większy opór;
za wysoko może oznaczać wentylację: RPM rośnie, ale łódź traci ciąg,
śruba napowietrza wodę. Po opuszczeniu ciąg wraca stopniowo.

Zakres roboczy trymu to 0–40%, dalej jest podnoszenie napędu. Przyciski
zmieniają cel o 5 punktów procentowych do 40%, później o 10. Zaburtówka
i Z-etka mają trym; stały wał, skuter i airboat go nie mają. Podniesienie
napędu na płyciźnie pomaga chronić śrubę, lecz ogranicza ciąg i chłodzenie.

Mały wypływ z boku rufy wskazuje pracę chłodzenia. Struga śruby zależy od
biegu, rzeczywistej mocy i kąta napędu. Nagły gaz, wstecz, hamowanie śrubą
i wentylacja dają chwilowe kotłowanie oraz pianę. Airboat nie tworzy
podwodnej strugi śruby.

Temperatura rośnie przy utracie chłodzenia, pracy wynurzonego napędu
i przeciążeniu na cumach/mieliźnie. Od 95°C jest ostrzeżenie, 105°C alarm,
120°C przegrzanie; moc stopniowo maleje. Przy 145°C silnik jest ochronnie
wyłączany. Opuść napęd, zmniejsz obciążenie, poczekaj na ochłodzenie.
Model nie dodaje trwałego zatarcia. Ponowny rozruch wymaga ≤110°C.

## Pogoda, woda i manewrowanie

☀ Pogoda otwiera przesuwalne okno. Dwa uchwyty określają minimum i maksimum
siły wiatru/prądu, osobny suwak zmienność kierunku ±. Zrównanie końców
daje stałą siłę. Fala może zależeć od wiatru albo mieć własną wysokość
i kierunek. Można włączać lokalne osłony, zacumowane łodzie oraz nowe
oddziaływanie ssania brzegowego i poprzecznej fali na holowane zabawki.

Prąd działa przez ruch względem wody; wiatr działa na nadwodną część
kadłuba i może go obracać. Kabinówka, RIB, skuter i swamp reagują inaczej.
Przy stromym brzegu/pomoście lub bliskim mijaniu równoległej łodzi
prędkość zwiększa ssanie boczne. Bez przepływu wody nowy efekt nie działa;
łagodna plaża go nie generuje. Zmniejsz prędkość i zachowaj odstęp.

Fale i kilwater docierają z opóźnieniem. Wpływają na łodzie, ich cumy,
boje i pływające Y-bomy, a słabsze odbicia wracają od twardych przeszkód.
Smugi przy kadłubie pokazują ruch względem wody, także dryf bokiem.

Echosonda pokazuje głębokość pod rufą oraz historię 60 sekund. Prześwit
pod stępką uwzględnia dziób, środek i rufę. To umowne dno symulatora.
Piasek delikatniej zatrzymuje płaskodenną i RIB; kamienie są groźniejsze.
Śruba na luzie nie zużywa się od samego kontaktu z piaskiem. Szuwary
zwiększają opór. Kolor suchej plaży jest piaskowy, płytka woda ma odcień
niebieskozielony. Nie traktuj samego koloru jako odczytu głębokości.

## Cumowanie i odbijacze

Kliknij poler, boję, dostępne drzewo lub punkt na innej jednostce.
Przesuwalne okno pokazuje schemat własnej łodzi i jej dostępne knagi.
Wybierz knagę, aby rzucić linę. Rzut na brzeg ma zasięg 6 m od knagi
i zostawia luz — nie przyciąga od razu łodzi. Przytrzymuj przyciski
wybierania/luzowania przy danej linie; puszczenie zatrzymuje pracę.
X odłącza ją. Wybór kolejnego polera zmienia cel w tym samym oknie.

| Kolor punktu z liną | Znaczenie |
| --- | --- |
| Biały | Luz, napięcie poniżej 1 N |
| Zielony | Napięta, poniżej 20% siły zrywającej |
| Brązowy | 20–80%, mocno obciążona |
| Czerwony | Od 80%, blisko zerwania |

„Za ciasna” odnosi się do obciążenia, nie tylko odległości. Naprężenie
zmieniają fala, wiatr, gaz oraz pozostałe liny. Człowiek ma ograniczoną
siłę; przy zbyt dużym obciążeniu wybieranie staje, lecz knaga nadal
utrzymuje linę. Pomaga właściwy układ cum i ostrożna praca napędem.

Trzy odbijacze na każdej burcie wystają poza kadłub, kompresują się
i pozwalają powoli przesuwać wzdłuż kei. Chronią miejsca, które faktycznie
dotykają. Silny lub nieosłonięty kontakt nadal uszkadza kadłub.

Na Euzebii pięć drzew jest punktami dzikiego cumowania. Podejdź powoli,
obserwuj dno i zanurzenie; większą jednostkę pozostaw dalej na kotwicy.
Pilawa ma ciasne przejścia między różnymi zacumowanymi łodziami.

## Kotwica

Kliknij dziób lub ⚓ Kotwica. Okno można przesuwać; podstawowy panel
pozostaje dostępny na dole. Wydawanie i wybieranie uruchamiają windę
o ograniczonym uciągu. Łańcuch i lina mają ciężar, długość i sprężystość,
a kotwica opada, chwyta dno albo jest wleczona.

Podpowiedź daje zwykle 5× odległość od dna do rolki dziobowej, przy
mocniejszych warunkach 7×. Trzy głębokości nie są ogólną zasadą dla
połączenia łańcucha z liną. Sprawdź zapas miejsca, typ dna i faktyczne
trzymanie. Profil pokazuje zwis i część łańcucha na dnie.

## Uszkodzenia, zęza, paliwo i serwis

Obrys miniatury kadłuba pokazuje uderzenia burt, jego wnętrze uszkodzenia
dna: przód/środek/tył. Napędy mają osobny stan. Chwilowy błysk pokazuje
kontakt, trwała barwa skumulowane szkody. Lekkie osiadanie na piasku
nie oznacza automatycznie zniszczenia dna. Skutki zależą od prędkości
prostopadłej do przeszkody, masy, materiału i ochrony odbijaczem.

Przeciek może powstać od uszkodzenia kadłuba, dna lub mocnego uderzenia
napędu/uszczelnienia. Samo otarcie łopatki o piasek nie dziurawi kadłuba.
Małe ilości rozprysków przy agresywnym pływaniu także trafiają do zęzy.
Panel podaje %, L/min napływu, łączną liczbę litrów i L/min odpompowania.
Ta woda zwiększa masę i zanurzenie, obniża rufę, utrudnia ślizg.

Pompa ma trzy pozycje: **OFF / AUTO / ON**. Dioda AUTO oznacza wybrany
tryb, druga rzeczywistą pracę. Pływak uruchamia ją zwykle przy 15 l
i zatrzymuje poniżej 3 l. Potrzebuje zasilania i akumulatora. Powyżej
50% zęzy działa alarm. Duży przeciek może przekroczyć wydajność pompy;
zalewanie jest widoczne na pokładzie, łódź osiada i może zatonąć, gasząc
silnik. Pompa nie naprawia dziury.

Nominalnie: otwarta/płaskodenna/swamp/skuter 32 l/min, RIB/motorówka 50,
kabinowa 95, wypornościowa 126. Napięcie wpływa na faktyczną wydajność.

Tankuj burtą przy oznaczonym pomoście paliwowym w Ryni albo ORLEN w Pilawie.
Wymagana jest przynajmniej jedna cuma do **tego** stanowiska, postój oraz
wyłączone silniki i zapłon. Tankuj uruchamia/przerywa napełnianie.

Serwis jest przy slipie portu głównego. Przycumuj do jego pomostu,
zatrzymaj łódź, wyłącz silniki i zapłon. Przycisk Napraw pojawia się
przy miejscu serwisu na mapie. Naprawa postępuje z czasem i przerywa się
po utracie warunków. Zatrzymuje przeciek; pozostałą wodę wypompuj.
Na parkingu są też dwa stanowiska SERWIS dla zabezpieczonej łodzi na
przyczepie: cały zestaw w obrysie, P lub ręczny, silniki łodzi wyłączone.

## Flota i holowanie

Flota obok Pogody otwiera konfigurację dodatkowej jednostki bez pogody.
Wybierz typ, parametry i lokalizację z listy albo wskaż na mapie.
Opcja Zacumowana zakłada rzeczywiste cumy tylko przy dostępnym, wolnym
stanowisku. Mapa odrzuca ląd, zbyt płytką wodę i przeszkody; wariant
Na mieliźnie pozwala przygotować zadanie ściągania. Awaria napędu
przygotowuje jednostkę do holowania.

Do ośmiu jednostek zachowuje niezależne paliwo, uszkodzenia, motogodziny,
akumulator, kotwicę i trasę. Przyciski przesiadki pojawiają się obok
stanowisk łódź/SUV. Pozostawiane manetki przechodzą na N; bezwładność,
wiatr i cumy nadal działają. Przesiadka nie leczy ani nie teleportuje.

Aby połączyć łodzie, kliknij punkt obcej jednostki i wybierz własną
knagę, zwykle czarny punkt przy rufie. Zasięg rzutu holu to 25 m.
Banan i materac mają tylko przednie ucho, kajak/wiosłówka przód i tył,
barka również punkty boczne i środkowy poler. Dostępne są też połączenia
za rufą i burta w burtę. Długość można zmieniać podczas trzymania
przycisków; naprężenie jest widoczne. Nagłe szarpnięcie może zerwać linę.

Banan i materac mają mniejszy opór boczny niż kadłub wypornościowy.
Na zakręcie wychodzą na zewnątrz, mogą chwilowo płynąć szybciej od łodzi,
przechylają się od naciągu i reagują na poprzeczny kilwater. Duża barka
znacznie bardziej obciąża holownik. Miękki obiekt jest przy lekkim
kontakcie odpychany, ciężki daje większą reakcję. Nie symulujemy ludzi
spadających z banana ani oplatania liny wokół śruby.

## Ratownictwo — koło i manekin MOB

Rozwiń Ratownictwo pod sterowaniem. Wybierz koło lub manekin treningowy,
burtę i Wyrzuć. Obiekt dziedziczy ruch łodzi, następnie dryfuje w prądzie
i wietrze, faluje i może osiąść przy brzegu. Rzut jest blokowany w stronę
pobliskiego pomostu/lądu i z łodzi na przyczepie.

Wybierz obiekt z listy, Pokaż centruje jego okolicę. Podejdź burtą na
mniej niż 1,7 m, ustaw obie manetki na N i zmniejsz prędkość względem
obiektu poniżej 0,55 m/s. Wtedy Podejmij kończy próbę dla tego obiektu.
Panel podaje odległość, czas fizyczny i liczbę podjęć/kontaktów kadłubem.
Maksymalnie 12 obiektów może jednocześnie być na wodzie. Ich stan jest
objęty lokalnym zapisem. To ćwiczenie z obiektem, bez fizjologii ani AI.

## SUV, parking, slip i przyczepa

SUV ma osobne sterowanie i stacyjkę, lecz panel zachowuje układ łodzi.
Rozruch jest możliwy w P/N. W/↑ gaz, S/↓ hamulec, A/D skręt. Spacja
przełącza ręczny. Q/E wybiera poprzedni/następny bieg PRND, działają też
1–4. Gaz jest po prawej, hamulec po lewej; pedały narastają stopniowo.
Reset SUV-a ustawia pojazd na parkingu bez rozpoczynania nowego rejsu.

Na suchym podłożu można zaparkować i odczepić przyczepę. Aby podpiąć,
podjedź hakiem do zaczepu, zatrzymaj się w odległości ≤0,8 m i z różnicą
kierunków ≤34°. Przy dużym złożeniu zestawu może dojść do uszkodzenia.
4×4 dołącza napęd przedniej osi, pomaga na slipie; poślizg nie znika
przy przeciążeniu lub zbyt głębokim wjeździe. Trawa i piasek zwiększają
opór, na piasku można się zakopać. Krawężniki placu są wyczuwalne.

Przed wodowaniem podnieś napęd, zwolnij pasy, pozostaw dziób na cumie
lub wciągarce. Łódź spoczywa na podporach mimo zwolnienia pasów;
nie zachowuje się od razu jak luźny pływający obiekt. Cofaj powoli.
Wraz z zanurzeniem przyczepy nacisk maleje, rufa zaczyna pływać,
na końcu uwalnia się dziób. Odepnij cumę PRZ i wciągarkę, aby odpłynąć.

Przy załadunku wyceluj między prowadnice i wejdź wolno. Prowadnice
kontaktowo prostują kadłub; wciągarka ciągnie go także częściowo na
lądzie. Przytrzymanie Wciągaj/Wydawaj zmienia długość, puszczenie ją
utrzymuje. Dziób opiera się o odbojnik. Zbyt szybkie wejście uszkadza
łódź i zestaw, a bardzo krzywe nie jest automatycznie naprawiane.
Zabezpiecz łódź przed wyjazdem; pracujący silnik nie blokuje pasów.

Profil pokazuje osobne pochylenie samochodu, przyczepy i łodzi, zanurzenie
oraz nacisk w kg. Głębokość wjazdu zależy od kąta slipu i wybranego kadłuba,
nie od jednej wymaganej pozycji kół. Zbyt głęboka przyczepa słabo prowadzi
dziób, zbyt płytka zwiększa nacisk i opór wciągania. Nachylenie slipu
można zmieniać w Pogodzie. Wynik załadunku ocenia osiowość, tor wejścia,
pozycję i prędkość zatrzymania oraz uderzenia.

## Zapis lokalny, dźwięk i problemy

Autosave zapisuje całą sesję co 30 s, przy ukrywaniu/opuszczaniu strony
i po ważnych operacjach floty. Zachowuje zapasową poprzednią kopię.
Zapis jest w danych tej przeglądarki dla tego adresu: nie przenosi się
między Chrome/Firefox, telefonem/komputerem ani różnymi domenami.
Wyczyszczenie danych strony lub zakończenie trybu prywatnego może go
usunąć. Nie ma konta, synchronizacji ani eksportu do pliku.

Dźwięk rusza po pierwszym kliknięciu/dotyku zgodnie z zasadami przeglądarki.
Jest suwak ogólny i osobny silników. Silniki reagują na obroty, obciążenie
i typ; słychać rozruch, bieg, trym, wodę, poślizg SUV-a, strumieniowe,
uderzenia i alarmy. To synteza proceduralna, nie nagrania konkretnych modeli.
Pauza i ukrycie strony wstrzymują symulację oraz dźwięk.

Przy słabym działaniu zamknij inne karty, zmniejsz liczbę jednostek,
wyłącz zacumowane łodzie lub dźwięk. Sprawdź, czy komputer nie jest
w trybie oszczędzania energii. Cały program ładuje się do przeglądarki;
zacinanie po uruchomieniu wynika głównie z obliczeń/rysowania, nie pobierania
kolejnych fragmentów jeziora.

Jeżeli strona jest pusta, sprawdź pełny adres HTTPS z `/BoatSimulator/`,
odśwież stronę i upewnij się, że JavaScript oraz dane witryny są dozwolone.
Produkcja ma kod i style osadzone w jednym HTML, co ogranicza problemy
ze ścieżkami plików na GitHub Pages. Gdy problem pozostaje, przydatne są
model urządzenia, przeglądarka i zrzut ekranu lub komunikat konsoli.
