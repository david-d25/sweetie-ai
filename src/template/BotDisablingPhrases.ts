const phrases = [
    "В отрубе. Жёстком.",
    "Иду спать.",
    "Аривидерчи.",
    "Адиос.",
    "Bonne journée.",
    "Чусс!",
    "Чао-какао, котики!",
    "Auf Wiedersehen!",
    "До свидания, или, как говорят рибосомы, UAA/UAG!",
    "Но, может быть, ещё вернётся..."
];

export function getRandomBotDisablingPhrase(): string {
    return "🔴 Бот выключен. " + phrases[Math.floor(Math.random() * phrases.length)];
}