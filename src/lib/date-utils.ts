/**
 * Returns an ISO string representing 48 hours ago in UTC.
 * This is used to fetch a buffer of trades from the database, which we will then
 * filter client-side based on the user's local midnight.
 */
export function getRecentTradesStartDate(): string {
    const date = new Date();
    date.setUTCHours(date.getUTCHours() - 48); // 48 hour buffer
    return date.toISOString();
}

/**
 * Checks if the current browser time is within the specified start/end window strings (HH:mm).
 * Returns true if the window is open, false otherwise.
 * 
 * @param startStr - Start time format "HH:mm" (e.g. "09:30")
 * @param endStr - End time format "HH:mm" (e.g. "16:00")
 */
export function isWithinTimeWindow(startStr: string, endStr: string): boolean {
    if (!startStr || !endStr) return true; // No window defined = always open

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
        // Standard window (e.g. 09:00 to 17:00)
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
        // Overnight window (e.g. 22:00 to 06:00)
        // Active if after start time OR before end time
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
}

/**
 * Gets the start of the current day in the user's local time.
 */
export function getStartOfLocalDay(): Date {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
}

/**
 * Returns a readable string of the current time in the user's locale
 */
export function formatLocalTime(date?: Date): string {
    return (date || new Date()).toLocaleString(undefined, {
        dateStyle: 'full',
        timeStyle: 'medium'
    });
}
