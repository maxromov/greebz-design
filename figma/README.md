# Сирі дані з Figma

`raw-2026-09-22.tar.gz` — відповіді Figma REST API, зняті 22.09.2026 з файлу
`6nkDvtUkBzaOalaQ1q7bmJ`, сторінка Design. Лежать тут, бо на Starter-плані
ліміт вартісний: після великого запиту API закривається на кілька діб.

| Файл усередині | Що це |
| --- | --- |
| `node-381-1345.json` | увесь холст Design, глибина 3: усі екрани, їхні фони й верхні рівні |
| `colors-deep.json` | кадр `Colors`: Main, System, Accent, Transparency. Повна палітра зі значеннями |
| `fonts-deep.json` | кадр `Fonts`: шкала на 1920 / 1440 / 744 / 375, ролі H big…Link |
| `icons.json` | кадри `Icon` (30 UI-компонентів 24×24) і `GREEBZ_icons-01/-02`: id і назви |
| `buttons.json` | кадр `Кнопки/посилання` |
| `inputs.json` | кадр `Імпути` |

Палітра й шкала вже перенесені в `tokens.css` і `BRAND-KEY.md`. Кнопки, поля
й іконки ще ні.
