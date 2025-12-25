export const TIMEZONE_IST = 'Asia/Kolkata';

/**
 * Returns the current date/time as a Date object, but "shifted" so that its UTC components
 * match what the wall-clock time is in IST.
 * 
 * NOTE: This is a "shifted" date. Use only for extracting local time components (getUTCHours, etc.)
 * or for display formatting where you want strict control.
 * 
 * Be careful comparing this directly to other Date objects (which are UTC).
 */
export function getNowIST(): Date {
    const now = new Date();
    // Get the prolonged string in IST
    const istString = now.toLocaleString('en-US', { timeZone: TIMEZONE_IST });
    return new Date(istString);
}

/**
 * Returns the current time in minutes (0 - 1439) for IST.
 * Useful for comparing against "HH:mm" strings like "09:30".
 */
export function getCurrentISTTimeMinutes(): number {
    const nowIST = getNowIST();
    // Since we created nowIST from a locale string, the local methods return the IST time
    return nowIST.getHours() * 60 + nowIST.getMinutes();
}

/**
 * Returns an ISO string representing the start of the current day in IST (00:00:00 IST),
 * converted back to UTC time.
 * 
 * Example: If it's 25th Dec in India, this returns "2025-12-24T18:30:00.000Z" (which is Dec 24th 18:30 UTC = Dec 25th 00:00 IST)
 * Use this for database queries filtering for "today".
 */
export function getStartOfTodayIST(): string {
    const now = new Date();

    // Create a date object for the current IST time
    const istString = now.toLocaleString('en-US', { timeZone: TIMEZONE_IST });
    const istDate = new Date(istString);

    // Reset to midnight
    istDate.setHours(0, 0, 0, 0);

    // Now we need to convert this "shifted" midnight back to the true UTC timestamp
    // The offset for IST is +5:30. So 00:00 IST is Previous Day 18:30 UTC.
    // We can compute this by identifying the offset.

    // Hardcoded logic for reliability since we know we want IST:
    // IST is UTC + 5.5 hours.
    // So to get the UTC timestamp of "00:00 IST", we take "00:00 Local" and subtract 5.5 hours? 
    // No, strictly relying on the Date object parsing is better.

    // Actually, a safer way to get the ISO string for the DB:
    // 1. Get current year, month, day in IST.
    // 2. Construct a string "YYYY-MM-DDT00:00:00+05:30"
    // 3. Convert that to a Date object, then to ISO string.

    const formatter = new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD
        timeZone: TIMEZONE_IST,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    const yyyymmdd = formatter.format(now); // "2025-12-25"

    const startOfTodayIST = new Date(`${yyyymmdd}T00:00:00+05:30`);
    return startOfTodayIST.toISOString();
}

/**
 * Returns a readable string of the current time in IST
 */
export function formatIST(date?: Date): string {
    return (date || new Date()).toLocaleString('en-US', {
        timeZone: TIMEZONE_IST,
        dateStyle: 'full',
        timeStyle: 'medium'
    });
}
