# Przystań — symulator manewrów na Zegrzu

**[Uruchom w przeglądarce](https://piothepio.github.io/BoatSimulator/?v=32.3.0)** · komputer, telefon lub tablet, bez konta i instalowania gry.

Symulator z widokiem z góry do ćwiczenia manewrów, cumowania, kotwiczenia,
holowania i wodowania z przyczepy. Ma dziewięć profili łodzi, pięć rodzajów
napędu, niezależne silniki, instalację elektryczną, paliwo, uszkodzenia,
zęzę i pompę. Wiatr, prąd, fale, kilwater, cumy i odbijacze fizycznie
oddziałują na jednostki. SUV z przyczepą pozwala przećwiczyć slipowanie.

Można tworzyć flotę do ośmiu jednostek, w tym barkę, banan, materac,
wiosłówkę i kajak, oraz rzucać koło ratunkowe i treningowy manekin MOB.
Tor treningowy ma znaki IALA A i fizyczne podwodne przeszkody.
Wyścigowa ma dwa turbodoładowane diesle do 600 KM każdy. Logbook zbiera
łączne statystyki i incydenty. Lokalny automatyczny zapis umożliwia kontynuowanie próby po powrocie oraz punkty cofnięcia około 30 s / 3 min / 5 min.
SAR działa z menu mapy, a obiekty reagują na fale i strumienie napędów.

Mapa jest interpretacją Jeziora Zegrzyńskiego ze skróconymi odległościami 50%.
Euzebia korzysta z obrysu OSM/PRNG. Ujście Kanału Żerańskiego, most drogowy,
most kolejowy, Port Nieporęt i osobny Port Pilawa mają wspólny szczegółowy
brzeg w lokalnej skali metrów 1:1. Wodna stacja ORLEN leży w większym
basenie Nieporętu, przy zachodniej kei. Zrzuty i zakres oszacowań:
[geometria i porównanie mapy](docs/MODEL.md#ujście-kanału-żerańskiego-i-porty).
Głębokości są symulacyjne; model nie jest mapą nawigacyjną ani kalibracją
konkretnej rzeczywistej łodzi.

## Dokumentacja do przekazania dalej

- **[Instrukcja użytkownika](docs/INSTRUKCJA.md)** — obsługa od pierwszego
  uruchomienia, wszystkie stanowiska i mechaniki, skróty, ćwiczenia,
  zapis i rozwiązywanie problemów.
- **[Model, możliwości i zakres odwzorowania](docs/MODEL.md)** — co rzeczywiście
  działa, jak jest liczone, przyjęte parametry, uproszczenia, źródła,
  architektura, wydajność i testy.

Oba dokumenty opisują aktualny stan, bez dziennika kolejnych wydań.
Historię zmian przechowuje Git.

## Uruchomienie projektu

Node.js ≥20.19, npm oraz Chromium do testów przeglądarkowych.

```sh
npm ci
npm run dev
```

Adres serwera pokazuje Vite. Do własnego hostingu statycznego:

```sh
npm run build
```

Wynikiem jest `dist/index.html` z osadzonym kodem i stylami. Projekt nie
pobiera kafelków mapy ani dźwięków podczas pływania. GitHub Pages publikuje
z gałęzi `main` po przejściu automatycznych kontroli.

## Sprawdzenie projektu

```sh
npm test
npm run test:e2e -- --workers=2
npm run test:production
npm run audit:physics
npm run benchmark
```

Testy e2e domyślnie korzystają z `/usr/bin/chromium`; inną lokalizację można
ustawić zmienną `CHROMIUM_PATH`. Szczegóły pomiarów i zakres testów opisuje
[Model](docs/MODEL.md#testy-i-wydajność).

Aby odtworzyć trzy widoki porównawcze mapy, uruchom serwer `npm run dev`,
a następnie `npm run capture:map`. Zrzuty trafiają do `docs/images/`.
Pomiar klatek: `npm run benchmark:browser -- --cpu=4`.
