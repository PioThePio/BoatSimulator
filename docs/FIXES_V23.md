# v23 — zaburtówka, przełączniki i akumulator

## Grafika

Zaburtówka ma osobną, szeroką osłonę silnika 0,76 × 0,62 m, obejmę pawęży,
pokrywę i widoczną część nogi po podniesieniu. Z-drive ponownie ma wcześniejszą,
wąską sylwetkę nogi i poprzecznej śruby; silnik znajduje się wewnątrz kadłuba.
Obydwa obracają się z fizycznym kątem napędu, za pawężą. Nie dodano znacznika
steru do tych napędów; klasyczny osobny ster pozostał przy wale.

## Przełączniki pod napędem

Sześć graficznych przełączników kołyskowych: główne zasilanie, instrumenty,
pompa, strumieniowe, GPS i echosonda. AUTO pompy i stan akumulatora (%) / V
znajdują się przy nich. Na telefonie są dwie kolumny bez rozszerzania kokpitu.
Przełączniki instrumentów/GPS/sonaru przeniesiono, nie skopiowano. Rozwinięta
sekcja instalacji nadal pokazuje bilans A, alternator i odbiorniki oraz światła.

Główne OFF odcina odbiorniki, pompę (również AUTO), zapłon i rozrusznik;
silniki gasną, alternator przestaje ładować. Po ON trzeba ponownie użyć stacyjki.
Pozycje przełączników osprzętu pozostają zapamiętane. Wyłączone instrumenty
przy głównym ON zachowują widoczny woltomierz, główne OFF wygasza też wskazówki.

Stery strumieniowe wymagają głównego zasilania, własnego przełącznika,
zainstalowanego wyposażenia i dostatecznego napięcia/energii. Nie wymagają
zapłonu silnika. Wyłączenie ich obwodu usuwa ciąg i pobór. Niezainstalowane
strumieniowe mają nieaktywny przełącznik.

Pompa ręczna może pracować i pobierać prąd również bez wody (wypompowywanie
wtedy wynosi 0). OFF zatrzymuje też AUTO; AUTO można ponownie włączyć
oddzielnym przełącznikiem pływaka. Wydajności pomp i progi pływaka nie zmieniły się.

## Jeden model akumulatora

Rozwinięto istniejące `battery` / `electrics`, bez drugiego bilansu energii.

- Pojemność zachowana: 35 Ah skuter, 80 Ah podstawa + 80 Ah na zainstalowany
  ster strumieniowy. Początkowo 85%.
- Spoczynkowa krzywa OCV w V względem SOC: 0% → 10,6; 10% → 11,8;
  25% → 12,0; 50% → 12,2; 75% → 12,45; 100% → 12,75 (interpolacja liniowa).
- Rezystancja wewnętrzna: `0.003 * 80/Ah * (1 + 8*(1-SOC)^4)` Ω.
  Słaby akumulator ma większy spadek napięcia pod tym samym obciążeniem.
- Napięcie obciążone: OCV minus `I*R`. Zdjęcie obciążenia przywraca napięcie
  spoczynkowe, bez fikcyjnego odzyskiwania Ah.
- Pobór: rozrusznik 110 A na silnik, zapłon 1,2 A, GPS 0,35 A,
  sonar 0,70 A, instrumenty 0,55 A, światła 0,65 A; pompa wg dotychczasowej
  wydajności, strumieniowe wg rzeczywistej mocy i napięcia.
- Bilans `I = odbiorniki - alternator`; SOC zmienia się o `I*dt/(3600*Ah)`.
  Czas elektryki jest fizyczny 1:1, niezależny od licznika eksploatacyjnego ×2.
- Alternator nadal 12–34 A na silnik, zależnie od RPM; dwa silniki sumują
  wydajność. Najpierw zasila odbiorniki. Przy nadmiarze ładuje, przy niedoborze
  akumulator dostarcza resztę. Napięcie ładowania 13,5–14,4 V.
- Regulator ogranicza ładowanie powyżej 99%; przy 100% alternator zasila
  odbiorniki, a prąd ładowania wynosi 0. Nie rośnie ponad 100%.

## Rozruch

START jest blokowany poniżej 8% SOC lub zmierzonego 10 V oraz przy głównym OFF.
Już wcześniej rozruch może się nie udać wskutek spadku napięcia pod obciążeniem.
RPM rozrusznika wynosi `260 * clamp((V-8)/3.8, .15, 1)`; wymagane minimum
185 RPM. Wolne kręcenie nie przyspiesza postępu zapłonu. Po 3 s nieudanej próby
lub poniżej 9 V silnik wraca na zapłon i wyświetla komunikat słabego akumulatora.
Zdrowy akumulator zachowuje dotychczasowy rozruch około 1,15 s. Po doładowaniu
możliwy jest ponowny rozruch; nie dodano trwałej awarii silnika.

## Regresje

`power-v23.test.js`: 8 nowych testów głównego odłącznika, strumieniowych bez
zapłonu, indywidualnych poborów i suchej pompy, Ah/OCV, zwiększonej rezystancji,
rzeczywiście wolnego/nieudanego rozruchu, alternatora i odzyskania rozruchu.

`power-v23.spec.js`: 4 nowe testy Chrome — sześć przełączników na telefonie,
wyłączenie całej instalacji, rzeczywisty pobór osprzętu i pompy, ster bez zapłonu
oraz wyraźnie odmienne sylwetki zaburtówki i Z-drive.

Zaktualizowane testy `systems.test.js` i `systems-v9.test.js` odcinają teraz
strumieniowe właściwym przełącznikiem osprzętu zamiast stacyjką. Pozostałe
regresje akumulatora, alternatora, pompy AUTO, kokpitu, napędów i pojazdów
pozostały obowiązujące. Produkcyjny test używa adresu wersji v23.

Wynik weryfikacji: **305 testów modelowych, 115 testów interfejsu Chrome
oraz 5 testów gotowej aplikacji produkcyjnej — wszystkie zaliczone**.
Kontrola wizualna telefonu 390 px: sześć przełączników, brak błędów JS
oraz brak przewijania poziomego. Build: samodzielny HTML około 331,3 KiB.
