'use client';
import Image from 'next/image';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  ArrowUp,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Map,
  Footprints,
  DoorOpen,
  Plus,
  Minus,
  X,
  HelpCircle,
  Sun,
  Moon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  rooms,
  waypoints,
  getWaypoint,
  findWaypoint,
  findRoom,
  roomAt,
  type WaypointId,
  type RoomId,
} from '@/lib/landscape-config';
import { personalContent } from '@/lib/personal-content';
import LandscapeScene, {
  type LandscapeHandle,
  type ViewState,
} from './LandscapeScene';
import RoomContents from './RoomContents';
export default function LandscapeExperience() {
  const scene = useRef<LandscapeHandle | null>(null);
  const [view, setView] = useState<ViewState>({
    mode: 'walk',
    waypoint: 'arrival',
    traveling: false,
    destination: null,
    freeWalking: false,
  });
  const [ready, setReady] = useState(false),
    [available, setAvailable] = useState(true),
    [paused, setPaused] = useState(true),
    [night, setNight] = useState(false);
  const [menu, setMenu] = useState(false),
    [help, setHelp] = useState(false),
    [reading, setReading] = useState<RoomId | null>(null),
    [photoId, setPhotoId] = useState<string | null>(null);
  const [requested, setRequested] = useState<{
    id: WaypointId;
    serial: number;
  } | null>(null);
  const processedRequest = useRef<typeof requested>(null);
  const lastArrival = useRef<WaypointId>('arrival');
  // A collection to open as soon as the walk into its room finishes.
  const pendingOpen = useRef<RoomId | null>(null);
  const point = getWaypoint(view.waypoint),
    nearRoom = roomAt(view.waypoint),
    room = findRoom(reading),
    photo = personalContent.photos.find((p) => p.id === photoId);
  const onReady = useCallback((ok: boolean) => {
    setPaused(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    setReady(true);
    setAvailable(ok);
  }, []);
  const go = useCallback((id: WaypointId, record = true) => {
    setMenu(false);
    setHelp(false);
    setReading(null);
    setPhotoId(null);
    setRequested((p) => ({ id, serial: (p?.serial ?? 0) + 1 }));
    if (record) window.history.pushState(null, '', `#at/${id}`);
  }, []);
  /** Open a room's collection after its arrival transition when needed. */
  const openCollection = useCallback(
    (id: RoomId) => {
      const target = findRoom(id)!;
      setMenu(false);
      setHelp(false);
      if (
        !available ||
        (!view.traveling && lastArrival.current === target.node)
      ) {
        pendingOpen.current = null;
        setReading(id);
        return;
      }
      pendingOpen.current = id;
      go(target.node);
    },
    [available, go, view.traveling],
  );
  useEffect(() => {
    if (
      ready &&
      available &&
      requested &&
      processedRequest.current !== requested &&
      !menu &&
      !reading
    ) {
      scene.current?.travelTo(requested.id);
      processedRequest.current = requested;
    }
  }, [requested, ready, available, menu, reading]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setPaused(media.matches);
    const navigate = () => {
      const key = window.location.hash.slice(1).replace(/^at\//, '');
      const node = findWaypoint(key)?.id ?? findRoom(key)?.node ?? 'arrival';
      pendingOpen.current = null;
      go(node, false);
    };
    if (window.location.hash) navigate();
    media.addEventListener('change', motion);
    window.addEventListener('popstate', navigate);
    window.addEventListener('hashchange', navigate);
    return () => {
      media.removeEventListener('change', motion);
      window.removeEventListener('popstate', navigate);
      window.removeEventListener('hashchange', navigate);
    };
  }, [go]);
  useEffect(() => {
    document.title = reading
      ? `${findRoom(reading)?.subject} — Serena`
      : 'Serena — A place to wander';
  }, [reading]);
  const stop = useCallback((next: ViewState) => {
    setView(next);
    if (next.freeWalking) pendingOpen.current = null;
    if (!next.traveling && next.mode === 'walk') {
      if (next.waypoint !== lastArrival.current) {
        lastArrival.current = next.waypoint;
        const hash = `#at/${next.waypoint}`;
        if (window.location.hash !== hash)
          window.history[next.freeWalking ? 'replaceState' : 'pushState'](
            null,
            '',
            hash,
          );
      }
      const open = pendingOpen.current;
      if (open && findRoom(open)?.node === next.waypoint) {
        pendingOpen.current = null;
        setReading(open);
      }
    }
  }, []);
  const caption =
    view.mode === 'overview'
      ? 'Choose a room to return to the ground.'
      : point.room
        ? `The ${findRoom(point.room)?.objectName.toLowerCase()} is waiting. Click it, or press Enter.`
        : nearRoom
          ? `The ${nearRoom.objectName.toLowerCase()} is just inside. Click it to open ${nearRoom.subject.toLowerCase()}.`
          : null;
  return (
    <main
      className={`landscape-experience ${ready ? 'is-ready' : ''} ${available ? '' : 'unavailable'} ${view.traveling ? 'is-traveling' : ''}`}
    >
      <section className="immersive-world" aria-label="Explore Serena’s estate">
        <LandscapeScene
          ref={scene}
          paused={paused}
          night={night}
          blocked={menu || help || !!reading || !!photo}
          onReady={onReady}
          onState={stop}
          onOpen={openCollection}
        />
        <div className="world-markers" aria-label="Paths and rooms">
          {waypoints.map((p) => (
            <button
              key={p.id}
              data-stop={p.id}
              className="walking-marker"
              onClick={() => go(p.id)}
              tabIndex={-1}
              aria-label={p.name}
            >
              <span>
                <ArrowUp size={23} />
              </span>
              <b>{p.name}</b>
            </button>
          ))}
          {rooms.map((r) => (
            <button
              key={r.id}
              data-room={r.id}
              className="room-marker"
              style={{ '--room-accent': r.accent } as CSSProperties}
              onClick={() => go(r.node)}
              tabIndex={-1}
              aria-label={`${r.name} — ${r.subject}. Visit the room.`}
              title={r.name}
            >
              <span className="room-pin-chip">
                <span className="room-pin-number">{r.number}</span>
                <span className="room-pin-text">
                  <span>{r.subject}</span>
                  <small>{r.name}</small>
                </span>
                <ArrowUpRight size={13} aria-hidden="true" />
              </span>
            </button>
          ))}
          {rooms.map((r) => (
            <button
              key={r.id}
              data-object={r.id}
              className="object-marker"
              style={{ '--room-accent': r.accent } as CSSProperties}
              onClick={() => openCollection(r.id)}
              tabIndex={-1}
            >
              <span className="object-marker-glow" aria-hidden="true">
                <BookOpen size={17} strokeWidth={1.6} />
              </span>
              <span className="object-marker-text">
                <small>
                  {r.number} · {r.subject}
                </small>
                <span>{r.action}</span>
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
      <div className="scene-shade" />
      <header className="landscape-header">
        <div className="header-controls">
          <button
            className="day-night-button"
            aria-label="Night mode"
            aria-pressed={night}
            title={night ? 'Switch to daylight' : 'Switch to nighttime'}
            disabled={!ready || !available}
            onClick={() => setNight((value) => !value)}
          >
            {night ? <Moon size={17} /> : <Sun size={17} />}
            <span>{night ? 'Night' : 'Day'}</span>
          </button>
          <button
            className="mode-button"
            aria-label={
              view.mode === 'walk' ? 'View from above' : 'Back to the path'
            }
            disabled={!ready || !available}
            onClick={() =>
              view.mode === 'walk'
                ? scene.current?.overview()
                : scene.current?.walk()
            }
          >
            {view.mode === 'walk' ? (
              <Map size={17} />
            ) : (
              <Footprints size={17} />
            )}
            <span>
              {view.mode === 'walk' ? 'View from above' : 'Back to the path'}
            </span>
          </button>
          <button className="rooms-button" onClick={() => setMenu(true)}>
            <DoorOpen size={17} />
            <span>Rooms</span>
          </button>
        </div>
      </header>
      {!ready && (
        <div className="landscape-loading">
          <span />
          <p>Finding the path…</p>
        </div>
      )}
      <div className="view-controls">
        <button
          aria-label="Zoom in"
          title="Zoom in"
          disabled={!ready || !available}
          onClick={() => scene.current?.zoom(-230)}
        >
          <Plus size={18} />
        </button>
        <button
          aria-label="Zoom out"
          title="Zoom out"
          disabled={!ready || !available}
          onClick={() => scene.current?.zoom(280)}
        >
          <Minus size={18} />
        </button>
        <i />
        <button
          aria-label="How to explore"
          title="How to explore"
          onClick={() => setHelp(true)}
        >
          <HelpCircle size={18} />
        </button>
      </div>
      <footer className="landscape-hud">
        <div className="location-caption" aria-live="polite">
          <p>
            {view.mode === 'overview'
              ? 'THE WHOLE ESTATE'
              : view.traveling
                ? 'FOLLOWING THE PATH'
                : 'YOU ARE HERE'}
          </p>
          <h1>
            {view.mode === 'overview'
              ? 'Find your next door.'
              : view.traveling && view.destination
                ? getWaypoint(view.destination).name
                : point.name}
          </h1>
          {caption && <span>{caption}</span>}
        </div>
        <div className="hud-note">
          {view.mode === 'walk' ? (
            <>
              <kbd>↑</kbd>
              <kbd>↓</kbd>
              <kbd>←</kbd>
              <kbd>→</kbd>
              <span>walk & turn</span>
              <kbd className="wide">Enter</kbd>
              <span>open</span>
            </>
          ) : (
            <>
              <Footprints size={15} /> Your position and view are saved.
            </>
          )}
        </div>
      </footer>
      <Dialog open={menu} onOpenChange={setMenu}>
        <DialogContent className="rooms-dialog" showCloseButton={false}>
          <div className="notes-toolbar">
            <span>Explore</span>
            <button onClick={() => setMenu(false)} aria-label="Close rooms">
              <X size={19} />
            </button>
          </div>
          <div className="rooms-scroll">
            <DialogTitle>Rooms</DialogTitle>
            <DialogDescription>
              A few different parts of my life. Choose a room to read more.
            </DialogDescription>
            <ul className="room-directory">
              {rooms.map((r) => (
                <li key={r.id}>
                  <div>
                    <button
                      className="room-directory-read"
                      onClick={() => openCollection(r.id)}
                    >
                      {r.subject}
                    </button>
                    <p>{r.subtitle}</p>
                  </div>
                  {available && (
                    <button
                      className="room-directory-visit"
                      onClick={() => go(r.node)}
                      aria-label={`Visit ${r.name} without opening the portfolio`}
                    >
                      Visit room
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!room}
        onOpenChange={(open) => {
          if (!open) setReading(null);
        }}
      >
        <DialogContent className="reading-dialog" showCloseButton={false}>
          {room && (
            <>
              <div className="notes-toolbar">
                <button className="notes-back" onClick={() => setReading(null)}>
                  <ArrowLeft size={15} aria-hidden="true" /> Back to the garden
                </button>
                <button
                  onClick={() => setReading(null)}
                  aria-label="Close portfolio"
                >
                  <X size={19} />
                </button>
              </div>
              <nav className="notes-nav" aria-label="Portfolio sections">
                {rooms.map((r) => (
                  <button
                    key={r.id}
                    aria-current={r.id === room.id ? 'page' : undefined}
                    onClick={() => setReading(r.id)}
                  >
                    {r.subject}
                  </button>
                ))}
              </nav>
              {/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- This scrollable pane needs keyboard focus so arrow keys can scroll long notes. */}
              <section
                className="notes-scroll"
                key={room.id}
                tabIndex={0}
                aria-label={`${room.subject} notes`}
              >
                <header className="notes-header">
                  <DialogTitle>{room.subject}</DialogTitle>
                  <DialogDescription>{room.subtitle}</DialogDescription>
                </header>
                <RoomContents room={room} onPhoto={setPhotoId} />
              </section>
              {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="help-dialog" showCloseButton={false}>
          <div className="dialog-top">
            <span>How to explore</span>
            <button onClick={() => setHelp(false)} aria-label="Close help">
              <X size={19} />
            </button>
          </div>
          <DialogTitle>A place to wander.</DialogTitle>
          <DialogDescription>
            Take your time. There’s no right route. Use Day / Night to change
            the light.
          </DialogDescription>
          <ul>
            <li>
              <strong>Look around</strong>
              <span>
                Scroll to look up and down. Drag the scene, or hold <kbd>←</kbd>{' '}
                <kbd>→</kbd> to turn smoothly. Use + and − to zoom.
              </span>
            </li>
            <li>
              <strong>Walk</strong>
              <span>
                Hold <kbd>↑</kbd> to walk forward and <kbd>↓</kbd> to walk
                backward. You can leave the paths and explore the garden;
                glowing markers are optional shortcuts.
              </span>
            </li>
            <li>
              <strong>Open a collection</strong>
              <span>
                Each room has a glowing book or scroll. Click it from the
                doorway or inside, or press <kbd>Enter</kbd>.
              </span>
            </li>
            <li>
              <strong>See the whole estate</strong>
              <span>
                Press <kbd>M</kbd> or choose “View from above.”
              </span>
            </li>
          </ul>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!photo}
        onOpenChange={(open) => {
          if (!open) setPhotoId(null);
        }}
      >
        <DialogContent className="full-photo">
          {photo && (
            <>
              <Image
                src={photo.src}
                alt={photo.alt}
                width={photo.width}
                height={photo.height}
                unoptimized
              />
              <DialogTitle>{photo.title}</DialogTitle>
              <DialogDescription>
                {[photo.location, photo.year].filter(Boolean).join(' · ')}
              </DialogDescription>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
