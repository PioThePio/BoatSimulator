# Przystań — symulator manewrów motorówką

Aplikacja w przeglądarce, widok z góry. Model sił i momentów, opór wody,
bezwładność, skrętny silnik zaburtowy, wiatr i prąd. Sprężyste cumy,
odbijacze burtowe oraz kolizje łodzi z pomostami i brzegiem.
Interfejs w języku polskim. Bez kont, backendu i zewnętrznych zasobów w czasie działania.

## Uruchomienie

Node.js 20.19+ (zalecane 24) i npm:

```sh
npm ci --cache /tmp/boat-npm-cache
npm run dev
```

Otwórz port wskazany przez Vite (domyślnie 5173). `npm run build` tworzy
statyczny katalog `dist`, który można udostępnić dowolnym serwerem HTTP.
`npm run preview` lokalnie sprawdza tę wersję. Nie otwieraj pliku HTML przez `file://`.

```sh
npm test           # testy sił, dryfu, cum, kolizji i stabilności
npm run build     # kompilacja produkcyjna
npm run test:e2e   # testy interfejsu w Chromium
```

Testy E2E wymagają Chromium, domyślnie `/usr/bin/chromium`.
Inną instalację wskaż zmienną `CHROMIUM_PATH`. Konfiguracja automatycznie
uruchamia Vite, chyba że serwer już działa na porcie 5173.

## Sterowanie

| Działanie | Klawisze / mysz |
| --- | --- |
| Skręt silnika | A/D lub ←/→, przeciąganie koła w prawo/lewo albo w górę/dół |
| Wyprostowanie | C lub przycisk „Wyprostuj ster” |
| Manetka w przód / wstecz | W/S lub ↑/↓, suwak |
| Luz (bez hamowania) | Spacja lub „Luz” |
| Odbijacze | F lub przełącznik |
| Pauza / nowa próba | P / R lub przyciski |
| Cumy | + przy dziobie/rufie, potem −/+ wybiera/luzuje o 0,25 m, × odczepia |

Koło **nie wraca do zera** po puszczeniu. Manetka też zachowuje ustawienie.
W polach formularza strzałki obsługują dane pole zamiast łodzi.
Pomoc otwiera się pod „?”; na czas jej wyświetlania fizyka jest wstrzymana.
Reset przywraca łódź, cumy i stan pomostu, zachowując wybrane warunki pogodowe.

Wybierz pozycję „Przy pomoście”, aby szybko przetestować cumowanie. Cuma
łączy wybraną knagę z najbliższym polerem w zasięgu 6 m. Na mapie polery
są żółte. Linia jest widoczna, także gdy jest luźna. Porywy zmieniają
prędkość wiatru deterministycznie; kierunki w panelu oznaczają **dokąd**
płynie woda / wieje wiatr (nie meteorologiczne „skąd”).

## Model fizyczny

- Układ SI: metry, sekundy, kilogramy. Oś x na wschód, y na południe.
- Kadłub 5,5 × 2,1 m, masa 900 kg, moment bezwładności 2600 kg·m².
- Silnik klasy 40 KM, uproszczony maksymalny ciąg 2400 N naprzód,
  1300 N wstecz. Kierunek ciągu obracany o ±35° w punkcie 2,4 m za środkiem.
  Moment ciągu zmienia znak przy zmianie biegu.
- Opór liniowy i kwadratowy zależy od prędkości względem wody, silniejszy
  poprzecznie niż wzdłuż kadłuba. Pięć punktów oporu daje tłumienie obrotu.
- Wiatr działa aerodynamicznie względem powietrza, na środek parcia
  przesunięty 0,35 m w stronę dziobu. Prąd jest wektorem prędkości wody.
- Cuma: sprężyna jednostronna 4200 N/m, tłumienie 1200 N·s/m.
  Luźna nie przenosi siły. Zerwanie powyżej 6500 N; minimalna długość 0,5 m.
- Krok 1/120 s, półjawny Euler. Kadłub do kontaktów przybliżają trzy koła.
  Impuls kontaktu uwzględnia prędkość obrotową, ramię siły i masę efektywną.
- Odbijacze działają wyłącznie przy kontakcie burtowym z pomostem.
  Brzeg oraz dziób/rufa nie korzystają z ich ochrony.

### Umowne progi szkód

Liczy się prędkość punktu kontaktu **prostopadła** do przeszkody,
a nie sama prędkość łodzi względem brzegu.

| Wynik | Bez ochrony | Burta z odbijaczami |
| --- | --- | --- |
| Łagodny kontakt bez szkód w modelu | ≤ 0,15 m/s (0,29 kn) | ≤ 0,30 m/s (0,58 kn) |
| Uszkodzenia | > 0,15 i < 1,50 m/s | > 0,30 i < 1,80 m/s |
| Zniszczenie | ≥ 1,50 m/s (2,92 kn) | ≥ 1,80 m/s (3,50 kn) |

**To założenia symulacji, nie ustalone bezpieczne prędkości prawdziwej łodzi.**
Nie istnieje uniwersalny próg: znaczenie mają konstrukcja, masa, kąt,
sztywność pomostu, fala, kształt i jakość odbijaczy. Praktyczny cel to
prędkość kontaktu bliska zeru.

Energia = ½ m_ef v_normal². Przy uszkadzającym kontakcie model odejmuje
budżet absorpcji 10 J lub 40 J z odbijaczami i nalicza szkody kadłuba
według pozostałej energii (9 J/punkt procentowy, minimum 1%, maksimum 75%
na zarejestrowany kontakt). Pomost ma osobny budżet 80 J i 18 J/punkt.
Kontakt w kategorii zniszczenia ustawia szkody łodzi i uderzonego pomostu
na 100%. Brzeg nie zmienia stanu pomostu. Kontakty są rejestrowane z
odstępem co najmniej 0,65 s. Skumulowane szkody ograniczają ciąg;
100% wyłącza napęd, ale jednostka dalej dryfuje. Zniszczony pomost
pozostaje przeszkodą — nie jest symulowane jego rozpadające się drewno.

Nie modelujemy fal, przechyłów, ślizgu, deformacji, wpływu głębokości,
oddziaływania śruby w bok i zmiany charakterystyki oporu przy ślizgu.
To model do ćwiczenia manewrów wypornościowych, a nie zweryfikowany
symulator konkretnego kadłuba. Wartości są jawne w `src/physics.js`.

## Struktura

- `src/physics.js` — niezależna od DOM fizyka i geometria akwenu.
- `src/main.js` — panel sterowania, wejście, render Canvas i pętla czasu.
- `src/style.css` — responsywny interfejs.
- `tests/physics.test.js` — regresje fizyki w Node.
- `tests/browser.spec.js` — rzeczywiste sterowanie, cumy i widok mobilny.

Projekt powstał według opisu wymagań. Strona referencyjna helmly.space
była niedostępna z sieci środowiska, więc jej implementacja nie została
obejrzana ani skopiowana.
