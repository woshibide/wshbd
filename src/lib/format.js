// "22 OCT 2026, 19:55 CEST"
export function formatAmsterdamDate(date) {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Amsterdam',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZoneName: 'short',
    }).format(date).toUpperCase();
}

// "19:55:03" in the Netherlands, wherever the visitor is.
export function formatAmsterdamClock(date) {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Amsterdam',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    }).format(date);
}

// Copy buttons grow an exclamation mark per click: "email" -> "email COPIED!" -> "email COPIED!!" ...
// and wrap back to the plain label once `maxExtra` marks were added.
export function nextCopyLabel(current, label, maxExtra) {
    if (current === label) return `${label} COPIED!`;
    if (current.length - `${label} COPIED`.length >= maxExtra) return label;
    return `${current}!`;
}

// Restores a saved label only if it is one this button could have produced.
export function restoreCopyLabel(saved, label) {
    if (saved === label || saved?.startsWith(`${label} COPIED!`)) return saved;
    if (saved?.startsWith('COPIED!')) return `${label} ${saved}`; // format saved by older versions
    return label;
}
