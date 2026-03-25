/**
 * Parse simple date text into a Date. Returns null if unparseable.
 * Handles: "today", "tomorrow", "today 6 p.m", "today 18:00", etc.
 */
export function parseDateText(text: string): Date | null {
  const lower = text.toLowerCase().trim();
  const now = new Date();

  let date: Date | null = null;

  if (lower.startsWith("today") || lower.startsWith("сегодня")) {
    date = new Date(now);
  } else if (lower.startsWith("tomorrow") || lower.startsWith("завтра")) {
    date = new Date(now);
    date.setDate(date.getDate() + 1);
  } else {
    return null;
  }

  // Try to extract time: "6 p.m", "18:00", "6pm", "14:30"
  const timeMatch = text.match(
    /(\d{1,2})(?::(\d{2}))?\s*(p\.?m\.?|a\.?m\.?)?/i,
  );
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3]?.toLowerCase().replace(/\./g, "");

    if (ampm === "pm" && hours < 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;

    date.setHours(hours, minutes, 0, 0);
  }

  return date;
}
