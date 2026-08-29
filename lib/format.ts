import {
  format,
  formatDistanceToNowStrict,
  isToday,
  isTomorrow,
  isYesterday,
} from "date-fns";

export function formatEventDate(iso: string) {
  const d = new Date(iso);
  const time = format(d, "h:mm a");
  if (isToday(d)) return `Today · ${time}`;
  if (isTomorrow(d)) return `Tomorrow · ${time}`;
  if (isYesterday(d)) return `Yesterday · ${time}`;
  return format(d, "EEE d MMM · h:mm a");
}

export function formatRelative(iso: string) {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
}

export function toDatetimeLocalValue(iso?: string) {
  const d = iso ? new Date(iso) : new Date(Date.now() + 60 * 60 * 1000);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60 * 1000).toISOString().slice(0, 16);
}
