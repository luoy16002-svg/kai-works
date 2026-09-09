export const workshops = [
  {
    id: 'clay',
    name: 'Clay & form',
    detail: 'A small vessel, shaped by hand.',
    duration: 90,
    price: 4200,
    level: 'Beginner friendly',
    color: '#bd704c',
  },
  {
    id: 'print',
    name: 'Print & pattern',
    detail: 'Simple shapes. Endless combinations.',
    duration: 120,
    price: 4800,
    level: 'All levels welcome',
    color: '#496652',
  },
  {
    id: 'light',
    name: 'Light & objects',
    detail: 'Build a paper shade, layer by layer.',
    duration: 90,
    price: 3600,
    level: 'Beginner friendly',
    color: '#b79042',
  },
] as const;
export type WorkshopId = (typeof workshops)[number]['id'];
export const timezones = [
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Europe/London', label: 'London' },
  { value: 'America/New_York', label: 'New York' },
  { value: 'UTC', label: 'UTC' },
];
export type Session = {
  id: string;
  workshop: WorkshopId;
  starts: string;
  duration: number;
  price: number;
  capacity: number;
};
export type BookingDraft = {
  workshop: WorkshopId;
  session: string;
  attendees: number;
  name: string;
  email: string;
  note: string;
  timezone: string;
};
export type Booking = {
  id: string;
  session: Session;
  attendees: number;
  name: string;
  email: string;
  note: string;
  timezone: string;
  status: 'active' | 'cancelled';
  revision: number;
  createdAt: string;
  updatedAt: string;
};
export const blankDraft = (): BookingDraft => ({
  workshop: 'clay',
  session: '',
  attendees: 1,
  name: '',
  email: '',
  note: '',
  timezone: 'Asia/Shanghai',
});

/** A rolling, fictional schedule. Capacity applies only to this browser's demo records. */
export function sessions(now = new Date()): Session[] {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() + ((6 - start.getUTCDay() + 7) % 7 || 7));
  return workshops.flatMap((workshop, index) =>
    [0, 1, 2].map((week) => {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + week * 7);
      date.setUTCHours([9, 13, 16][index]);
      return {
        id: `${workshop.id}-${date.toISOString().slice(0, 10)}`,
        workshop: workshop.id,
        starts: date.toISOString(),
        duration: workshop.duration,
        price: workshop.price,
        capacity: date.getUTCDate() % 5 === index ? 0 : [6, 8, 4][index],
      };
    }),
  );
}
export const money = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
export function sessionDate(session: Session, timezone: string) {
  return new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(session.starts));
}
export function sessionTime(session: Session, timezone: string) {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  };
  const formatter = new Intl.DateTimeFormat('en-GB', options);
  return `${formatter.format(new Date(session.starts))}–${formatter.format(new Date(Date.parse(session.starts) + session.duration * 60000))}`;
}
export function remaining(session: Session, bookings: Booking[], excludeId?: string) {
  return Math.max(
    0,
    session.capacity -
      bookings
        .filter(
          (booking) =>
            booking.id !== excludeId &&
            booking.status === 'active' &&
            booking.session.id === session.id,
        )
        .reduce((total, booking) => total + booking.attendees, 0),
  );
}
export function validateDetails(
  draft: BookingDraft,
): Partial<Record<'name' | 'email' | 'note', string>> {
  const errors: Partial<Record<'name' | 'email' | 'note', string>> = {};
  if (draft.name.trim().length < 2 || draft.name.trim().length > 80)
    errors.name = 'Enter a name between 2 and 80 characters.';
  if (draft.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()))
    errors.email = 'Enter an email address, such as alex@example.com.';
  if (draft.note.length > 280) errors.note = 'Keep your note under 280 characters.';
  return errors;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('kai-gather-bookings', 1);
    let blocked = false;
    request.onupgradeneeded = () => request.result.createObjectStore('bookings', { keyPath: 'id' });
    request.onsuccess = () => {
      if (blocked) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () =>
      reject(
        new Error('Browser storage is unavailable. Your form is still here; please try again.'),
      );
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Close other Gather tabs, then try again.'));
    };
  });
}
export async function listBookings(): Promise<Booking[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('bookings', 'readonly');
    const request = transaction.objectStore('bookings').getAll();
    transaction.oncomplete = () => {
      db.close();
      resolve((request.result as Booking[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    };
    transaction.onabort = () => {
      db.close();
      reject(new Error('Saved bookings could not be read. Please try again.'));
    };
  });
}

/** Read capacity and write a record in one transaction, including edits from other tabs. */
async function changeBooking(change: (all: Booking[]) => Booking): Promise<Booking> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('bookings', 'readwrite');
    const store = transaction.objectStore('bookings');
    const request = store.getAll();
    let result: Booking;
    let failure = 'The booking could not be saved. Your form is still here; please try again.';
    request.onsuccess = () => {
      try {
        result = change(request.result);
        store.put(result);
      } catch (cause) {
        failure = cause instanceof Error ? cause.message : failure;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => {
      db.close();
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('kai-gather-updates');
        channel.postMessage('changed');
        channel.close();
      }
      resolve(result);
    };
    transaction.onabort = () => {
      db.close();
      reject(new Error(failure));
    };
  });
}
export async function saveBooking(
  draft: BookingDraft,
  editing?: Pick<Booking, 'id' | 'revision'> | null,
) {
  const errors = validateDetails(draft);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const session = sessions().find(
    (item) => item.id === draft.session && item.workshop === draft.workshop,
  );
  if (!session || Date.parse(session.starts) <= Date.now())
    throw new Error('That session is no longer available. Choose another date.');
  if (!Number.isInteger(draft.attendees) || draft.attendees < 1 || draft.attendees > 4)
    throw new Error('Choose between 1 and 4 people.');
  if (!timezones.some((zone) => zone.value === draft.timezone))
    throw new Error('Choose one of the listed timezones.');
  return changeBooking((all) => {
    const existing = editing ? all.find((booking) => booking.id === editing.id) : undefined;
    if (
      editing &&
      (!existing || existing.status === 'cancelled' || existing.revision !== editing.revision)
    )
      throw new Error(
        'This booking changed in another tab. Open Your bookings to load the latest version.',
      );
    if (!editing && all.length >= 100)
      throw new Error('This demo has reached its limit of 100 saved bookings.');
    if (remaining(session, all, existing?.id) < draft.attendees)
      throw new Error(
        'There are not enough places left for this group. Choose another date or fewer people.',
      );
    const email = draft.email.trim().toLowerCase();
    if (
      all.some(
        (booking) =>
          booking.id !== existing?.id &&
          booking.status === 'active' &&
          booking.session.id === session.id &&
          booking.email.toLowerCase() === email,
      )
    )
      throw new Error(
        'A booking for this email and session is already saved. You can edit it in Your bookings.',
      );
    const now = new Date().toISOString();
    return {
      id: existing?.id ?? crypto.randomUUID(),
      session,
      attendees: draft.attendees,
      name: draft.name.trim(),
      email,
      note: draft.note.trim(),
      timezone: draft.timezone,
      status: 'active',
      revision: (existing?.revision ?? 0) + 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
  });
}
export function cancelBooking(booking: Booking) {
  return changeBooking((all) => {
    const existing = all.find((item) => item.id === booking.id);
    if (!existing) throw new Error('This booking is no longer in this browser.');
    if (existing.revision !== booking.revision)
      throw new Error('This booking changed in another tab. Reload Your bookings and try again.');
    return {
      ...existing,
      status: 'cancelled',
      revision: existing.revision + 1,
      updatedAt: new Date().toISOString(),
    };
  });
}
export function calendarFile(booking: Booking) {
  const stamp = (date: Date) =>
    date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');
  const name = workshops.find((workshop) => workshop.id === booking.session.workshop)!.name;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kai//Gather Demo//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${booking.id}@kai-works`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(new Date(booking.session.starts))}`,
    `DTEND:${stamp(new Date(Date.parse(booking.session.starts) + booking.session.duration * 60000))}`,
    `SUMMARY:[Demo] Gather - ${name}`,
    'DESCRIPTION:Portfolio demo only. No real workshop has been reserved.',
    'STATUS:TENTATIVE',
    'TRANSP:TRANSPARENT',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
