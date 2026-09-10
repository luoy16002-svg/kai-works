import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  Minus,
  Plus,
  Users,
} from 'lucide-react';
import {
  blankDraft,
  calendarFile,
  cancelBooking,
  listBookings,
  money,
  remaining,
  saveBooking,
  sessionDate,
  sessions,
  sessionTime,
  timezones,
  validateDetails,
  workshops,
  type Booking,
  type BookingDraft,
  type WorkshopId,
} from '../core/bookings';
import { download } from '../ui';
import '../gather.css';

type View = 'session' | 'details' | 'review' | 'saved' | 'bookings';
const draftKey = 'kai-gather-draft-v1';
type Editing = Pick<Booking, 'id' | 'revision'>;
function restoreDraft(): { draft: BookingDraft; editing: Editing | null } {
  const empty = { draft: blankDraft(), editing: null };
  try {
    const text = sessionStorage.getItem(draftKey);
    if (!text || text.length > 4000) return empty;
    const stored = JSON.parse(text);
    const value = stored?.draft ?? stored;
    if (!value || typeof value !== 'object') return empty;
    return {
      editing:
        typeof stored.editing?.id === 'string' &&
        stored.editing.id.length <= 60 &&
        Number.isInteger(stored.editing.revision) &&
        stored.editing.revision > 0
          ? { id: stored.editing.id, revision: stored.editing.revision }
          : null,
      draft: {
        workshop: workshops.some((item) => item.id === value.workshop)
          ? value.workshop
          : empty.draft.workshop,
        session: typeof value.session === 'string' ? value.session.slice(0, 60) : '',
        attendees:
          Number.isInteger(value.attendees) && value.attendees >= 1 && value.attendees <= 4
            ? value.attendees
            : 1,
        name: typeof value.name === 'string' ? value.name.slice(0, 80) : '',
        email: typeof value.email === 'string' ? value.email.slice(0, 254) : '',
        note: typeof value.note === 'string' ? value.note.slice(0, 280) : '',
        timezone: timezones.some((item) => item.value === value.timezone)
          ? value.timezone
          : empty.draft.timezone,
      },
    };
  } catch {
    return empty;
  }
}

function WorkshopArt({ kind }: { kind: WorkshopId }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}gather/${kind}-still-life.webp`}
      alt=""
      width={1024}
      height={1024}
      draggable={false}
    />
  );
}
export default function Gather() {
  const [restored] = useState(restoreDraft);
  const [draft, setDraft] = useState<BookingDraft>(restored.draft);
  const [view, setView] = useState<View>('session');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [editing, setEditing] = useState<Editing | null>(restored.editing);
  const [saved, setSaved] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [detailErrors, setDetailErrors] = useState<ReturnType<typeof validateDetails>>({});
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(true);
  const panel = useRef<HTMLElement>(null);
  const previousView = useRef(view);
  const schedule = sessions();
  const workshop = workshops.find((item) => item.id === draft.workshop)!;
  const displayedWorkshop = view === 'saved' && saved ? saved.session.workshop : draft.workshop;
  const chosen = schedule.find(
    (session) => session.id === draft.session && session.workshop === draft.workshop,
  );
  const activeBookings = bookings.filter((booking) => booking.status === 'active');
  const step = ['session', 'details', 'review'].indexOf(view);
  const refresh = useCallback(async () => {
    try {
      setBookings(await listBookings());
      setStorageError('');
    } catch (cause) {
      setStorageError(cause instanceof Error ? cause.message : 'Saved bookings could not be read.');
    }
  }, []);
  useEffect(() => {
    void refresh();
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('kai-gather-updates');
    channel.onmessage = () => void refresh();
    return () => channel.close();
  }, [refresh]);
  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ draft, editing }));
      setDraftSaved(true);
    } catch {
      setDraftSaved(false);
    }
  }, [draft, editing]);
  useEffect(() => {
    if (previousView.current === view) return;
    previousView.current = view;
    panel.current?.scrollIntoView({ block: 'start' });
    document.getElementById('gather-step-title')?.focus({ preventScroll: true });
  }, [view]);
  const update = (next: Partial<BookingDraft>) => {
    setDraft((current) => ({ ...current, ...next }));
    setError('');
    setDetailErrors((current) => ({
      ...current,
      ...Object.fromEntries(Object.keys(next).map((key) => [key, undefined])),
    }));
  };
  const chooseError = () => {
    if (!chosen) return 'Choose a date to continue.';
    if (remaining(chosen, bookings, editing?.id) < draft.attendees)
      return 'Choose a session with enough places for your group.';
    return '';
  };
  const move = (next: View) => {
    setError('');
    setDetailErrors({});
    setView(next);
  };
  const next = (event: FormEvent) => {
    event.preventDefault();
    if (view === 'session') {
      const issue = chooseError();
      if (issue) {
        setError(issue);
        document.getElementById('gather-dates')?.focus();
        return;
      }
      move('details');
    } else if (view === 'details') {
      const issues = validateDetails(draft);
      if (Object.keys(issues).length) {
        setDetailErrors(issues);
        document.getElementById(`gather-${Object.keys(issues)[0]}`)?.focus();
        return;
      }
      move('review');
    } else if (view === 'review') void save();
  };
  const save = async () => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      const booking = await saveBooking(draft, editing);
      setSaved(booking);
      setEditing(null);
      setDraft(blankDraft());
      await refresh();
      setView('saved');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The booking could not be saved. Please try again.',
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const edit = (booking: Booking) => {
    setEditing({ id: booking.id, revision: booking.revision });
    setDraft({
      workshop: booking.session.workshop,
      session: booking.session.id,
      attendees: booking.attendees,
      name: booking.name,
      email: booking.email,
      note: booking.note,
      timezone: booking.timezone,
    });
    setCancelId(null);
    move('session');
  };
  const startNew = () => {
    setEditing(null);
    setSaved(null);
    setDraft(blankDraft());
    move('session');
  };
  const cancel = async (booking: Booking) => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      await cancelBooking(booking);
      setCancelId(null);
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The booking could not be cancelled. Please try again.',
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const exportCalendar = (booking: Booking) =>
    download('gather-demo-session.ics', calendarFile(booking), 'text/calendar;charset=utf-8');
  const exportBooking = (booking: Booking) =>
    download(
      `gather-${booking.id.slice(0, 8)}.json`,
      JSON.stringify({ demo: true, ...booking }, null, 2),
    );

  return (
    <div className="gather-page" data-view={view}>
      <main className="gather-main" id="main-content" tabIndex={-1}>
        <header className="gather-heading">
          <div className="gather-heading-start">
            <a href="#/" aria-label="Back to portfolio" className="gather-home">
              <ArrowLeft size={19} />
            </a>
            <h1 className="gather-wordmark">gather</h1>
          </div>
          <div className="gather-heading-side">
            <button
              onClick={() => {
                setCancelId(null);
                move('bookings');
                void refresh();
              }}
              disabled={busy}
            >
              <CalendarDays size={16} /> Your bookings <span>{activeBookings.length}</span>
            </button>
          </div>
        </header>
        <div className="gather-layout">
          <aside className="gather-collection" aria-label="Workshops">
            {workshops.map((item) => (
              <button
                key={item.id}
                className="gather-workshop"
                data-workshop={item.id}
                aria-pressed={view === 'bookings' ? undefined : displayedWorkshop === item.id}
                disabled={busy || view === 'saved' || view === 'bookings'}
                onClick={() => {
                  update({ workshop: item.id, session: '' });
                  move('session');
                }}
              >
                <span className="gather-art">
                  <WorkshopArt kind={item.id} />
                </span>
                <span className="gather-workshop-copy">
                  <span className="gather-workshop-heading">
                    <strong>{item.name}</strong>
                    {view !== 'bookings' && displayedWorkshop === item.id && <Check size={17} />}
                  </span>
                  <span className="gather-workshop-meta">
                    <b>{money(item.price)}</b>
                    <span>{item.duration} min</span>
                  </span>
                </span>
              </button>
            ))}
          </aside>
          <section ref={panel} className="gather-panel" aria-label="Booking form">
            {step >= 0 && (
              <ol className="gather-steps" aria-label="Booking progress">
                {(['session', 'details', 'review'] as const).map((item, index) => (
                  <li
                    key={item}
                    aria-current={view === item ? 'step' : undefined}
                    data-complete={index < step}
                  >
                    <button
                      type="button"
                      disabled={index > step || busy}
                      onClick={() => move(item)}
                    >
                      <span>{index < step ? <Check size={13} /> : index + 1}</span>
                      {['Session', 'Details', 'Review'][index]}
                    </button>
                  </li>
                ))}
              </ol>
            )}
            {editing && step >= 0 && (
              <p className="gather-editing">
                Editing booking {editing.id.slice(0, 8).toUpperCase()}. Changes are saved after
                review.
              </p>
            )}
            {step >= 0 && (
              <form noValidate onSubmit={next}>
                {view === 'session' && (
                  <>
                    <h2 id="gather-step-title" className="gather-sr-only" tabIndex={-1}>
                      Choose a session
                    </h2>
                    <div className="gather-date-header">
                      <h3>Available sessions</h3>
                      <label>
                        Times in{' '}
                        <select
                          aria-label="Session timezone"
                          value={draft.timezone}
                          onChange={(event) => update({ timezone: event.target.value })}
                        >
                          {timezones.map((zone) => (
                            <option key={zone.value} value={zone.value}>
                              {zone.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div
                      className="gather-dates"
                      id="gather-dates"
                      tabIndex={-1}
                      role="group"
                      aria-label="Available sessions"
                    >
                      {schedule
                        .filter((session) => session.workshop === draft.workshop)
                        .map((session) => {
                          const seats = remaining(session, bookings, editing?.id);
                          return (
                            <button
                              type="button"
                              key={session.id}
                              aria-pressed={draft.session === session.id}
                              disabled={seats < draft.attendees}
                              className="gather-date"
                              onClick={() => update({ session: session.id })}
                            >
                              <span className="gather-date-radio" aria-hidden="true">
                                {draft.session === session.id && <span />}
                              </span>
                              <span className="gather-date-info">
                                <strong>{sessionDate(session, draft.timezone)}</strong>
                                <span>{sessionTime(session, draft.timezone)}</span>
                              </span>
                              <span className="gather-spots">
                                {seats === 0 ? 'Fully booked' : `${seats} places left`}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                    <div className="gather-people">
                      <h3>
                        People <span className="gather-limit">up to 4</span>
                      </h3>
                      <div className="gather-stepper" role="group" aria-label="Number of attendees">
                        <button
                          type="button"
                          aria-label="Remove one attendee"
                          disabled={draft.attendees === 1}
                          onClick={() => update({ attendees: draft.attendees - 1 })}
                        >
                          <Minus size={15} />
                        </button>
                        <output aria-live="polite">{draft.attendees}</output>
                        <button
                          type="button"
                          aria-label="Add one attendee"
                          disabled={draft.attendees === 4}
                          onClick={() => update({ attendees: draft.attendees + 1 })}
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
                {view === 'details' && (
                  <>
                    <h2 id="gather-step-title" tabIndex={-1}>
                      Your details
                    </h2>
                    <button
                      type="button"
                      className="gather-example"
                      onClick={() => update({ name: 'Alex Chen', email: 'alex@example.com' })}
                    >
                      Fill sample details <ArrowUpRight size={13} />
                    </button>
                    <div className="gather-fields">
                      <label htmlFor="gather-name">
                        Name on the booking
                        <input
                          id="gather-name"
                          name="name"
                          autoComplete="name"
                          maxLength={80}
                          value={draft.name}
                          aria-invalid={!!detailErrors.name}
                          aria-describedby={detailErrors.name ? 'gather-name-error' : undefined}
                          onChange={(event) => update({ name: event.target.value })}
                          placeholder="Your name"
                          required
                        />
                        {detailErrors.name && (
                          <span id="gather-name-error" className="gather-field-error">
                            {detailErrors.name}
                          </span>
                        )}
                      </label>
                      <label htmlFor="gather-email">
                        Email address
                        <input
                          id="gather-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          maxLength={254}
                          value={draft.email}
                          aria-invalid={!!detailErrors.email}
                          aria-describedby={
                            detailErrors.email ? 'gather-email-error' : 'gather-email-help'
                          }
                          onChange={(event) => update({ email: event.target.value })}
                          placeholder="you@example.com"
                          required
                        />
                        <small id="gather-email-help">Stored with your local demo booking.</small>
                        {detailErrors.email && (
                          <span id="gather-email-error" className="gather-field-error">
                            {detailErrors.email}
                          </span>
                        )}
                      </label>
                      <label htmlFor="gather-note">
                        <span>
                          Note for the session <small>Optional</small>
                        </span>
                        <textarea
                          id="gather-note"
                          name="note"
                          maxLength={280}
                          rows={3}
                          value={draft.note}
                          aria-invalid={!!detailErrors.note}
                          onChange={(event) => update({ note: event.target.value })}
                          placeholder="For example, what would you like to make?"
                        />
                        <small className="gather-count">{draft.note.length} / 280</small>
                      </label>
                    </div>
                  </>
                )}
                {view === 'review' && (
                  <>
                    <h2 id="gather-step-title" tabIndex={-1}>
                      Review booking
                    </h2>
                    <div className="gather-review-section">
                      <div className="gather-review-heading">
                        <h3>Your session</h3>
                        <button type="button" onClick={() => move('session')}>
                          Edit session
                        </button>
                      </div>
                      <strong className="gather-review-workshop">{workshop.name}</strong>
                      {chosen ? (
                        <>
                          <p>
                            <CalendarDays size={15} />
                            {sessionDate(chosen, draft.timezone)}
                          </p>
                          <p>
                            <Clock3 size={15} />
                            {sessionTime(chosen, draft.timezone)} · {draft.timezone}
                          </p>
                        </>
                      ) : (
                        <p className="gather-field-error">
                          This date is no longer available. Choose another session.
                        </p>
                      )}
                      <p>
                        <Users size={15} />
                        {draft.attendees} {draft.attendees === 1 ? 'person' : 'people'} ·{' '}
                        {workshop.duration} minutes
                      </p>
                    </div>
                    <div className="gather-review-section">
                      <div className="gather-review-heading">
                        <h3>Your details</h3>
                        <button type="button" onClick={() => move('details')}>
                          Edit details
                        </button>
                      </div>
                      <p>{draft.name}</p>
                      <p className="gather-break">{draft.email}</p>
                      {draft.note.trim() && <p className="gather-review-note">{draft.note}</p>}
                    </div>
                  </>
                )}
                {error && (
                  <p className="gather-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="gather-total">
                  <div>
                    <span>
                      {draft.attendees} × {money(workshop.price)}
                    </span>
                  </div>
                  <strong>
                    {money(workshop.price * draft.attendees)} <small>USD</small>
                  </strong>
                </div>
                <div className="gather-form-actions">
                  {view !== 'session' && (
                    <button
                      type="button"
                      className="gather-back"
                      disabled={busy}
                      onClick={() => move(view === 'review' ? 'details' : 'session')}
                    >
                      <ArrowLeft size={15} /> Back
                    </button>
                  )}
                  <button type="submit" className="gather-primary" disabled={busy}>
                    {busy
                      ? 'Saving…'
                      : view === 'review'
                        ? editing
                          ? 'Save changes'
                          : 'Save demo booking'
                        : view === 'details'
                          ? 'Review booking'
                          : 'Continue'}
                    {!busy && <ArrowRight size={16} />}
                  </button>
                </div>
                {!draftSaved && (
                  <p className="gather-draft-note" role="status">
                    Keep this tab open; your draft could not be saved.
                  </p>
                )}
              </form>
            )}
            {view === 'saved' && saved && (
              <div className="gather-saved">
                <div className="gather-complete-mark">
                  <Check size={28} />
                </div>
                <h2 id="gather-step-title" tabIndex={-1}>
                  Booking saved
                </h2>
                <div className="gather-ticket">
                  <div>
                    <span>GATHER / {saved.id.slice(0, 8).toUpperCase()}</span>
                    <strong>
                      {workshops.find((item) => item.id === saved.session.workshop)!.name}
                    </strong>
                    <p>
                      {sessionDate(saved.session, saved.timezone)}
                      <br />
                      {sessionTime(saved.session, saved.timezone)} · {saved.timezone}
                    </p>
                  </div>
                  <div>
                    <span>Booked by</span>
                    <b>{saved.name}</b>
                    <p>
                      {saved.attendees} {saved.attendees === 1 ? 'person' : 'people'} ·{' '}
                      {money(saved.session.price * saved.attendees)}
                    </p>
                  </div>
                </div>
                <div className="gather-downloads">
                  <button onClick={() => exportCalendar(saved)}>
                    <CalendarDays size={16} /> Save calendar file
                  </button>
                  <button onClick={() => exportBooking(saved)}>
                    <ArrowDownToLine size={16} /> Download booking
                  </button>
                </div>
                <button className="gather-primary" onClick={() => move('bookings')}>
                  Manage your booking <ArrowRight size={16} />
                </button>
                <button className="gather-text-button" onClick={startNew}>
                  Book another session
                </button>
                <p className="gather-draft-note">
                  Calendar entries are labelled as a demo. No real workshop is reserved.
                </p>
              </div>
            )}
            {view === 'bookings' && (
              <div className="gather-bookings">
                <h2 id="gather-step-title" tabIndex={-1}>
                  Your bookings
                </h2>
                <div className="gather-bookings-actions">
                  <button className="gather-primary" onClick={startNew} disabled={busy}>
                    New booking <Plus size={16} />
                  </button>
                  {draft.session && (
                    <button
                      className="gather-text-button"
                      onClick={() => move('session')}
                      disabled={busy}
                    >
                      Continue draft
                    </button>
                  )}
                </div>
                {!bookings.length && !storageError && (
                  <div className="gather-empty">
                    <CalendarDays size={26} />
                    <h3>No bookings yet</h3>
                  </div>
                )}
                {bookings.map((booking) => (
                  <article
                    key={booking.id}
                    className="gather-booking-card"
                    data-cancelled={booking.status === 'cancelled'}
                  >
                    <div className="gather-booking-top">
                      <span>{booking.id.slice(0, 8).toUpperCase()}</span>
                      <span>{booking.status === 'cancelled' ? 'Cancelled' : 'Saved'}</span>
                    </div>
                    <h3>{workshops.find((item) => item.id === booking.session.workshop)?.name}</h3>
                    <p>
                      {sessionDate(booking.session, booking.timezone)} ·{' '}
                      {sessionTime(booking.session, booking.timezone)}
                      <br />
                      <span>
                        {booking.timezone} · {booking.attendees}{' '}
                        {booking.attendees === 1 ? 'person' : 'people'}
                      </span>
                    </p>
                    <p className="gather-booking-name">
                      {booking.name} <span>{money(booking.attendees * booking.session.price)}</span>
                    </p>
                    <div className="gather-booking-tools">
                      {booking.status === 'active' && (
                        <>
                          <button
                            disabled={busy || Date.parse(booking.session.starts) <= Date.now()}
                            onClick={() => edit(booking)}
                          >
                            Edit booking
                          </button>
                          <button disabled={busy} onClick={() => setCancelId(booking.id)}>
                            Cancel
                          </button>
                          <button
                            onClick={() => exportCalendar(booking)}
                            aria-label={`Save calendar file for ${workshops.find((item) => item.id === booking.session.workshop)?.name}`}
                          >
                            <CalendarDays size={15} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => exportBooking(booking)}
                        aria-label={`Download booking ${booking.id.slice(0, 8)}`}
                      >
                        <ArrowDownToLine size={15} />
                      </button>
                    </div>
                    {cancelId === booking.id && (
                      <div className="gather-cancel">
                        <p>Cancel this demo booking and release its places?</p>
                        <button disabled={busy} onClick={() => void cancel(booking)}>
                          {busy ? 'Cancelling…' : 'Yes, cancel booking'}
                        </button>
                        <button disabled={busy} onClick={() => setCancelId(null)}>
                          Keep it
                        </button>
                      </div>
                    )}
                  </article>
                ))}
                {error && (
                  <p role="alert" className="gather-error">
                    {error}
                  </p>
                )}
              </div>
            )}
            {storageError && (
              <div className="gather-error" role="alert">
                {storageError}
                <button className="gather-text-button" onClick={() => void refresh()}>
                  Try again
                </button>
              </div>
            )}
          </section>
        </div>
        <footer className="gather-footer">
          <span>Demo only · Saved on this device · No real reservations or payments</span>
          <a href="#/case/gather">
            About this demo <ArrowUpRight size={14} />
          </a>
        </footer>
      </main>
    </div>
  );
}
