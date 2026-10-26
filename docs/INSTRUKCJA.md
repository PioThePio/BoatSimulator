# Przystań — instrukcja użytkownika

Ta instrukcja opisuje całą aktualną obsługę symulatora. Wyjaśnienie równań,
parametrów i stopnia realizmu znajduje się w [opisie modelu](MODEL.md).

## Pierwsze uruchomienie i powrót

Otwórz [symulator](https://piothepio.github.io/BoatSimulator/). Wybierz łódź,
wymiary, masę kadłuba, dopuszczony dla niej napęd, liczbę silników i moc.
Ustaw ilość paliwa na start, liczbę zbiorników, opcjonalne strumieniowe, załogę i wyposażenie. Pojemność zbiornika jest stała dla typu łodzi; podział na dwa zbiorniki nie podwaja jej. Podsumowanie
pokazuje rzeczywistą masę startową z paliwem oraz zanurzenie.

Kabinowa ma domyślnie strumieniowy dziobowy, a wypornościowa dziobowy i rufowy; można je odznaczyć. Wyścigowa ma zawsze dwa Z-drive do 600 KM każdy. Pozostałe jednostki zachowują limit 350 KM na silnik.

Wybierz miejsce startu i pogodę. Dostępne są otwarta woda, port główny,
pomosty, plaża, wyspy przy Bugu, Euzebia, Pilawa, Port Nieporęt, ujście Kanału Żerańskiego, zatoka Rządzy, paliwo,
serwis oraz zadania z SUV-em i przyczepą. Start na przyczepie podnosi
podnoszony napęd do końca. Wybór nowej próby zastępuje aktualną sesję.

Jeżeli istnieje lokalny zapis, **Kontynuuj** przywraca go w pauzie. Naciśnij
▷ lub P, aby wznowić. Nieobecność nie zużywa paliwa ani akumulatora i nie
nalicza motogodzin. Przycisk Nowa próba lub R otwiera ponownie wybór,
zachowując wcześniejsze parametry do edycji. Obok Kontynuuj są punkty
przywracania około 30 s, 3 min i 5 min przed ostatnim stanem. Przycisk
jest dostępny dopiero po zgromadzeniu odpowiednio starego zapisu; jego
podpowiedź pokazuje faktyczną godzinę. Odczyt punktu także zaczyna w pauzie.

## Ekran i mapa

Mapa zaczyna się przy górnej krawędzi. Znak ? przy nazwie jeziora otwiera
pomoc. Pod mapą są obok siebie: kierownica, napęd, zegary i węższy panel stanu
z profilem zanurzenia oraz uszkodzeniami. Wybór stanowiska jest pod
sterowaniem, a pod nim regulacja dźwięku. Strona mieści się w wysokości
ekranu; na bardzo niskim ekranie przewija się tylko konsola lub otwarte
okno. Przycisk Rejs otwiera liczniki, GPS, bilans instalacji i ustawienie
slipu w SUV-ie, pozostawiając sterowanie aktywne. Na telefonie elementy
są kompaktowe; widok poziomy ułatwia manewry.

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

GPS pozwala wybrać przystań, w tym Pilawę, Port Nieporęt, wodną stację ORLEN i Euzebię. Odległość i ETA są
logiczne, zgodne ze skróconą geografią. ETA pojawia się podczas zbliżania
do celu, nie na postoju ani podczas oddalania. To kierunek do celu po
prostej, nie wyznaczona trasa omijająca ląd. Wyłączony GPS ukrywa odczyty.

## Tor wodny i znaki

Przycisk ⚑ Znaki otwiera legendę. Umowny kierunek toru biegnie z jeziora
w górę Narwi i Bugu: zielone stożki są po prawej, czerwone walce po lewej.
Kardynalne wskazują stronę omijania przeszkody. Dwa stożki w górę oznaczają
N, w dół S, podstawami do siebie E, wierzchołkami do siebie W.

Odizolowane niebezpieczeństwo ma barwy czarny–czerwony–czarny i dwie
czarne kule. Pod takimi znakami są fizyczne głazy z wodą płytszą niż
0,5 m: można uszkodzić dno i śrubę. Znaki ukryjesz w Pogodzie; podwodne
przeszkody pozostają. To treningowy tor i przeszkody, bez deklaracji
zgodności z aktualnym oznakowaniem rzeczywistego akwenu.

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

Silnik benzynowy pozostaje domyślny. Diesel wybierzesz w konfiguracji dla
motorówki z Z-etką, kabinowej z Z-etką/wałem i wypornościowej z wałem.
Pracuje przy niższych RPM (około 3500), ma większy moment na wale,
większą masę i inny dźwięk. Masa diesla i cięższego paliwa zwiększa zanurzenie;
sama zmiana paliwa nie daje dodatkowych koni mechanicznych.

## Wyścigowa offshore

Wyścigowa jest w menu nowej próby i Flocie. Ma 9,2 m długości, głęboki
kadłub V i dwa turbodoładowane benzynowe napędy Z-drive po maksymalnie 600 KM.
Manetki szybciej podnoszą obroty. Sprzężenie manetek, osobne stacyjki,
niezależne kąty i trym działają jak w pozostałych łodziach.

Optimum modelu trymu jest w pobliżu 20%. Za niski i wysoki zwiększają
opór; nadmierne podniesienie nadal napowietrza śruby i ogranicza chłodzenie.
Na spokojnej wodzie konfiguracja domyślna w pomiarze modelowym osiąga
około 164 km/h przy około 6800 RPM. Masa, paliwo, trym, skręt i fala zmieniają osiągi.
Prędkościomierz ma zakres 200 km/h, obrotomierze 7000 RPM.
Głęboki dźwięk dwóch silników uzupełnia gwizd turbo rosnący z obciążeniem
i obrotami podczas rozkręcania, cichszy szum przy ustalonym doładowaniu oraz wyraźny syk po odjęciu gazu. Suwak Silniki reguluje
pracę napędu; cały dźwięk nadal podlega wyciszeniu i pauzie.

## Rozruch, elektryka i przyrządy

Włącz główne zasilanie, ustaw N, przekręć stacyjkę w prawo: 0 → I → START.
Po rozruchu wraca do I. Obrót w lewo wyłącza silnik i zapłon do 0.
Kluczyk można przekręcać także bez głównego zasilania: pozycja I pozostaje, a START sprężynuje do I, lecz rozrusznik nie kręci i nie pobiera prądu.
Strzałki sterowania nie obracają stacyjki. Włączony zapłon bez pracującego
silnika daje ciągły sygnał; wyłączenie zapłonu go ucisza. SUV nie ma tego
alarmu. Po zimnym rozruchu obroty lekko falują.

Pod napędem są przełączniki głównego zasilania, instrumentów, pompy,
strumieniowych, GPS, echosondy i świateł nawigacyjnych. Główne OFF
odcina urządzenia i gasi silniki, zachowując kluczyki w I. Nie obraca
ich do 0. Ponowne zasilenie wymaga ponownego START; silnik sam nie ruszy.
Urządzenia działają bez zapłonu, jeśli mają zasilanie i energię.
Strumieniowe wymagają także zamontowania ich podczas konfiguracji.

Odbiorniki naprawdę zużywają akumulator. Duże obciążenie obniża napięcie,
silnik ładuje przez alternator, słaby akumulator wolniej kręci lub nie
uruchomi silnika. Wskaźnik pokazuje V i pozostały procent. Wyłączenie
samego odbiornika zachowuje jego ustawienie przy następnym zasileniu.

Zegary pokazują RPM (osobne dla dwóch silników), prędkość, paliwo, trym,
temperaturę i napięcie. RPM L/P, TRIM, KM/H, PALIWO, BAT i TEMP mają jednakową czcionkę na tarczach. Spalanie L/h leży drobniej między E/F, a SOC między 8/16. Pod tarczami są wartości: km/h, litry, V i °C.
Spalanie w L/h również jest na tarczy paliwa. Wartości są pod tarczami:
prędkość z km/h, ilość paliwa w litrach i temperatura z °C.
Wyłączenie instrumentów opuszcza wskazówki poza BAT; wyłączenie głównego
zasilania opuszcza również BAT. Wyłączone odczyty cyfrowe pokazują kreskę. Profil obok pokazuje
uniesienie dziobu, położenie napędu, zanurzenie śruby i dno na płytkiej
wodzie. Panel stanu pokazuje zanurzenie kadłuba i wodę w zęzie.

Nagłe otwarcie gazu na mocno skręconym zaburtowym/Z-drive lub skuterze
przy małej prędkości chwilowo zwiększa poślizg rufy. Powolne dodawanie
gazu daje słabszy efekt; przy większej prędkości zanika. Wiosłówka/kajak
skręcają różnicą pracy wioseł; pełny skręt pozwala obracać się z małym
ruchem naprzód, a N zatrzymuje wiosłowanie. Skuter ma przednie ucho
holownicze, widoczne i dostępne z menu cumowania.

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
Samo osiadanie dziobu lub szuwary nie oznaczają utraty chłodzenia. Liczy
się zanurzenie wlotu i jego rzeczywisty kontakt z dnem. Komunikat rozróżnia
podniesiony napęd, wynurzenie rufy oraz wlot przy dnie; obserwuj wypływ.
Żółte/czerwone ostrzeżenia są na dole mapy między sonarem a zoomem.
Nacisk na dno jest stale pokazywany w kg obok zanurzenia (siła / 9,81).

## Pogoda, woda i manewrowanie

☀ Pogoda otwiera przesuwalne okno. Dwa uchwyty określają minimum i maksimum
siły wiatru/prądu, osobny suwak zmienność kierunku ±. Zrównanie końców
daje stałą siłę. Fala może zależeć od wiatru albo mieć własną wysokość
i kierunek. Można włączać lokalne osłony, zacumowane łodzie oraz nowe
oddziaływanie ssania brzegowego i poprzecznej fali na holowane zabawki.

Przy 0–3 m/s tafla pozostaje spokojniejsza. Powyżej 6 m/s rośnie liczba
białych zmarszczek i piany, a woda staje się bardziej szarawa. Szum wiatru
rośnie płynnie z aktualną siłą i milknie przy zerze. Efekty wizualne
i szum można wyłączyć osobno w Pogodzie, bez zmiany samych sił wiatru.

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
Obsługa odbywa się na mapie. Przycisk Cumowanie obok Kotwicy otwiera
aktualny albo najbliższy poler; samo otwarcie nie zakłada liny.

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

Na zachodniej stronie Euzebii widać suchą piaszczystą plażę, niebieskozielony
pas płytkiej wody i stopniowe pogłębianie. Kolor płytkiej wody jest liczony
z tego samego dna co echosonda i kontakt kadłuba. Przy dwóch miejscach są
szuwary: można w nie wpłynąć, ale zwiększają opór.

Na Euzebii pięć drzew jest punktami dzikiego cumowania. Podejdź powoli,
obserwuj dno i zanurzenie; większą jednostkę pozostaw dalej na kotwicy.
Pilawa to wąski basen na północny wschód od ujścia Kanału Żerańskiego.
Wpływa się od północy, między zakrzywioną osłoną a wschodnim brzegiem.
Pomosty wychodzą ze wschodniej strony, a środkowy ma poprzeczne odnogi.
Większy Port Nieporęt jest osobnym basenem dalej na południowy zachód:
ma sześć pomostów od zachodu, długi pomost od wschodu, zatoczki i wodne paliwo.
Z jeziora można też wpłynąć do kanału i przepłynąć pod mostem drogowym,
a dalej pod osobnym mostem kolejowym. Pokłady mostów nie blokują wody.
Prześwity wysokościowe i głębokości są założeniami treningowymi, nie pomiarem.
Nie wszystkie stanowiska są zajęte; opcja zacumowanych łodzi działa jak w innych portach.

## Kotwica

Kliknij dziób lub ⚓ Kotwica. Jedyne okno kotwicy jest na mapie i można
je przesuwać. Kompaktowy profil i wartości pokazują odcinek łańcucha/liny
na dnie, część zawieszoną, głębokość kotwicy i trzymanie albo wleczenie.
Wydawanie i wybieranie uruchamiają windę o ograniczonym uciągu. Prędkość
wydawania wynosi 0,55–0,75 m/s, wybierania do 0,28–0,42 m/s zależnie
od wielkości łodzi; obciążenie spowalnia wybieranie. Kotwice ręczne na
jednostkach bez napędu i skuterze działają wolniej. Elektryczna winda
pobiera prąd i po utracie zasilania zatrzymuje się na hamulcu. Łańcuch i lina mają ciężar, długość i sprężystość,
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

Całkowite zatonięcie albo silnie uszkodzony napęd z zalaną instalacją
powodują zwarcie: akumulator spada do 0 V, gasną odbiorniki, zatrzymuje
się pompa i strumieniowe, a rozrusznik nie działa. Przełącznik główny
nie przywraca sam zasilania. Po osuszeniu i naprawie instalacji w serwisie
można je ponownie włączyć. Profil wyraźnie oznacza pokład pod wodą lub
położenie poniżej linii wody; bieżące zanurzenie przy zalewaniu uwzględnia
osiadanie i niższą rufę.

Nominalnie: otwarta/płaskodenna/swamp/skuter 32 l/min, RIB/motorówka 50,
kabinowa 95, wypornościowa 126. Napięcie wpływa na faktyczną wydajność.

Stałe pojemności: otwarta i płaskodenna 45 l, motorówka i RIB 100 l, kabinowa 250 l, wypornościowa 400 l, skuter 60 l, swamp boat 90 l, wyścigowa 450 l. Wybranie 225 l w wyścigowej daje połowę skali E–F. Domyślnie na starcie jest 75% paliwa. Starszy zapis z paliwem ponad nową pojemność zachowuje dawny większy zbiornik, aby nie usuwać zapasu.

Tankuj burtą przy oznaczonym pomoście paliwowym w Ryni albo przy wodnej
stacji ORLEN na zachodnim brzegu większego Portu Nieporęt. W Pilawie
nie ma tej stacji; drogowy ORLEN przy rondzie nie jest punktem obsługi łodzi.
Wymagana jest przynajmniej jedna cuma do **tego** stanowiska, postój oraz
wyłączone silniki i zapłon. Kliknij dystrybutor na mapie: małe okno
pokazuje warunki i poziom paliwa. Jego Tankuj uruchamia/przerywa napełnianie.

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
knagę, zwykle czarny punkt przy rufie. Zasięg podłączenia holu to 20 m. Długość już założonej liny można nadal regulować do 60 m.
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

W oknie Flota przy dodatkowych jednostkach jest Usuń. Usunięcie odpina
wszystkie połączone z nią hole i cumy oraz usuwa ją z zapisu. Gdy usuwasz
aktualne stanowisko, sterowanie wraca do łodzi podstawowej. Zebrane
statystyki zostają w Logbooku. Łódź podstawowa przypisana do SUV-a jest
chroniona przed usunięciem, aby zachować zestaw i co najmniej jedną łódź.

## Ratownictwo — koło i manekin MOB

Kliknij SAR obok Floty. Menu po lewej pozwala wybrać koło lub manekin
i Wyrzuć teraz. Burta jest losowa, z próbą drugiej strony, jeśli pierwszą
zajmuje pomost lub ląd. Losowy alarm wyrzuca wybrany obiekt po 30–180 s
aktywnej symulacji i daje trzy sygnały. Ponowne kliknięcie tego polecenia
anuluje oczekiwanie. Pauza i nieobecność nie odliczają czasu.

Obiekt dziedziczy ruch łodzi, następnie dryfuje, kołysze się i może osiąść
przy brzegu. Reaguje również na docierający kilwater, falę gwałtownego
hamowania oraz lokalny strumień śruby lub strumieniowych. Rzut z łodzi
na przyczepie jest blokowany.

Wybierz obiekt z listy, Pokaż centruje jego okolicę. Podejdź burtą na
mniej niż 1,7 m. Do 0,55 m/s (1,98 km/h) na N podjęcie jest pewne.
Przy większej prędkości przycisk Spróbuj podjąć pozostaje dostępny,
ale szansa płynnie maleje do zera przy 1,4 m/s (5,04 km/h). Także przy
jeszcze większej prędkości kliknięcie zapisuje nieudaną próbę i jej powód.
Na biegu szansa jest dodatkowo mnożona przez 80%, a udane podjęcie ma
karę 30 punktów. Zalecany jest N lub wyłączone silniki.

Nieudana próba pozostawia obiekt na wodzie. Komunikat podaje przyczynę,
a Logbook zapisuje prędkość względną, odległość i napędy. Ponowienie jest
możliwe po 1,2 s aktywnej symulacji. Bliskie minięcie bez naciśnięcia
przycisku jest rejestrowane raz po odpłynięciu dalej niż 2,4 m. Kara
rośnie z nadmierną prędkością, bliskością i pracą na biegu. Kliknięta
próba i to samo minięcie nie są liczone podwójnie; łączna kara za
nieudane podejścia jest ograniczona do 30 pkt.
Linia na mapie prowadzi od kadłuba do wybranego obiektu. Karta SAR
podaje odległość od burty, podpisane zbliżanie (+ do obiektu, − oddalanie),
pełną prędkość względną oraz maksymalną szacowaną siłę kontaktu w N/kN.
Przycisk Podejmij jest też na mapie. Do oceny N liczą się rzeczywiste biegi
i polecenia manetek; przesunięcie manetki podczas zmiany biegu nie daje
od razu pełnej punktacji.

Wynik 0–100 uwzględnia prędkość podjęcia, najmocniejszy kontakt i kontakt
na biegu F/R, samo podjęcie na biegu i nieudane podejścia. Pokazuje osobno N/F/R i pracę/wyłączenie każdego silnika.
Siła jest oszacowaniem miękkiego kontaktu z obiektem treningowym, nie
pomiarem sił ani oceną obrażeń człowieka. Czas ćwiczenia jest fizyczny.
Rozpoczęcie i zakończenie z wynikiem trafiają do Logbooka; wybrany obiekt
i wynik pozostają w autozapisie.
Maksymalnie 12 obiektów może jednocześnie być na wodzie. Ich stan jest
objęty lokalnym zapisem. To ćwiczenie z obiektem, bez fizjologii ani AI. Progi i prawdopodobieństwa
są kalibracją gry, nie potwierdzoną normą ratowniczą ani oceną szans
ratowania prawdziwego człowieka.

## SUV, parking, slip i przyczepa

SUV ma osobne sterowanie i stacyjkę, lecz panel zachowuje układ łodzi.
Rozruch jest możliwy w P/N. W/↑ gaz, S/↓ hamulec, A/D skręt. Spacja
przełącza ręczny. Q/E wybiera poprzedni/następny bieg PRND, działają też
1–4. Gaz jest po prawej, hamulec po lewej; pedały narastają stopniowo.
Reset SUV-a ustawia pojazd na parkingu bez rozpoczynania nowego rejsu.
Osobny **Reset przyczepy** odzyskuje również odpiętą przyczepę na stanowisku parkingowym, z hamulcem i podporą. Nie przenosi samochodu ani już zwodowanej łodzi. Zabezpieczona łódź pozostaje na odzyskiwanej przyczepie.

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

## Logbook — dziennik użytkownika

▤ Logbook na mapie ma trzy sekcje: kafle łącznego dystansu na wodzie,
motogodzin silników, zużytego paliwa i liczby uderzeń; ostatnie rejsy
z datą, czasem, paliwem i maksymalną prędkością; przewijane incydenty
z godziną, jednostką i opisem. Energia uderzenia jest podawana w J,
bez wymyślania niezmierzonej szczytowej siły w kN.

Zapis aktualizuje ten sam rejs przy autosave i opuszczaniu strony.
Kontynuacja nie dopisuje powtórnie tych samych kilometrów czy godzin.
Nowa próba tworzy nowy rejs. Usunięte jednostki zachowują już zebrany
wkład do sum. SUV nie powiększa dystansu na wodzie ani paliwa łodzi.
Obowiązują te same logiczne dystanse/godziny co w licznikach symulatora.

Dziennik przechowuje 30 ostatnich rejsów i 200 incydentów, a sumy
obejmują także wcześniejsze rejsy. Można wyłączyć zapisywanie w oknie.
Jest lokalny dla przeglądarki i witryny, niezależny od bieżącego zapisu
gry; rozpoczęcie nowej próby nie czyści sum. Czyszczenie danych witryny
usuwa oba zapisy.

Przy pierwszym uruchomieniu dziennik przejmuje dostępne liczniki bieżącego
zapisu. Nie odtwarza wcześniej usuniętych sesji ani dawnych incydentów.
Uszkodzone dane dziennika nie blokują kontynuacji samej gry.

## Zapis lokalny, dźwięk i problemy

Autosave zapisuje całą sesję co 30 s, przy ukrywaniu/opuszczaniu strony
i po ważnych operacjach floty. Zachowuje zapasową poprzednią kopię.
Osobna, kompresowana historia tworzy dodatkowe punkty w odstępach około
30 s. Historia jest ograniczona pojemnością przeglądarki; nie blokuje
głównego zapisu. Ostatnie zamknięcie strony zawsze próbuje zapisać bieżący
stan synchronicznie, nawet gdy kompresowanie historii nie zdąży się skończyć.
Odczyt dawnych zapisów przy Euzebii i przebudowanym ujściu kanału przenosi lokalne łodzie,
cumy i boje do poprawionych miejsc, zachowując stan silników, akumulator,
paliwo, liczniki i czas rejsu.
Zapis jest w danych tej przeglądarki dla tego adresu: nie przenosi się
między Chrome/Firefox, telefonem/komputerem ani różnymi domenami.
Wyczyszczenie danych strony lub zakończenie trybu prywatnego może go
usunąć. Nie ma konta, synchronizacji ani eksportu do pliku.

Dźwięk rusza po pierwszym kliknięciu/dotyku zgodnie z zasadami przeglądarki.
Jest suwak ogólny i osobny silników. Silniki reagują na obroty, obciążenie
i typ; słychać rozruch, bieg, trym, wodę, poślizg SUV-a, strumieniowe,
uderzenia i alarmy. Pozostawione włączone silniki innych jednostek
słychać ciszej, do około 140 m, z płynnym zanikiem i położeniem stereo.
To synteza proceduralna, nie nagrania konkretnych modeli.
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
