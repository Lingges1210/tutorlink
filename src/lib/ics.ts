// src/lib/ics.ts
function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toICSDateUTC(d: Date) {
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeICS(text: string) {
  return (text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function buildIcs(opts: {
  method: "REQUEST" | "CANCEL";
  uid: string;
  sequence: number;
  start: Date;
  end: Date;
  title: string;
  description: string;
  organizerName: string;
  organizerEmail: string;
  attendeeName: string;
  attendeeEmail: string;
}) {
  const dtstamp = toICSDateUTC(new Date());
  const dtstart = toICSDateUTC(opts.start);
  const dtend = toICSDateUTC(opts.end);

  const isCancel = opts.method === "CANCEL";

  return [
    "BEGIN:VCALENDAR",
    "PRODID:-//TutorLink//EN",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    `METHOD:${opts.method}`,
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `SEQUENCE:${opts.sequence}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeICS(opts.title)}`,
    `DESCRIPTION:${escapeICS(opts.description)}`,
    `ORGANIZER;CN=${escapeICS(opts.organizerName)}:MAILTO:${opts.organizerEmail}`,
    `ATTENDEE;CN=${escapeICS(opts.attendeeName)};ROLE=REQ-PARTICIPANT;PARTSTAT=${
      isCancel ? "DECLINED" : "NEEDS-ACTION"
    };RSVP=${isCancel ? "FALSE" : "TRUE"}:MAILTO:${opts.attendeeEmail}`,
    `STATUS:${isCancel ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

