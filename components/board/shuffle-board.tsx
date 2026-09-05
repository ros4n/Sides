"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { Shuffle, Eraser } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { ProfileLite } from "@/lib/friends";
import { displayName, firstName } from "@/lib/friends";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Assignment = { user_id: string; team_index: number | null; slot: number | null };
type AsgMap = Record<string, { team_index: number | null; slot: number | null }>;
type Viewer = { user_id: string; name: string; avatar_url: string | null };
type Held = { by: string; byName: string; byAvatar?: string | null; at: number };
type HeldMap = Record<string, Held>;

/* One riso blue for every team; they're told apart by the hand-drawn number,
   never by hue (direction contract; colour is never the only carrier). */
const MARK = "var(--alarm)"; // fluoro-pink = something is LIVE right now

export function ShuffleBoard({
  eventId,
  teamCount,
  playersPerTeam,
  canShuffle,
  meId,
  meName,
  meAvatarUrl,
  initialAssignments,
  initialProfiles,
  initialVersion,
  initialEditorId,
  initialEditorExpiresAt,
}: {
  eventId: string;
  teamCount: number;
  playersPerTeam: number;
  canShuffle: boolean;
  meId: string;
  meName: string;
  meAvatarUrl: string | null;
  initialAssignments: Assignment[];
  initialProfiles: Record<string, ProfileLite>;
  initialVersion: number;
  initialEditorId: string | null;
  initialEditorExpiresAt: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [asg, setAsg] = useState<AsgMap>(() => {
    const m: AsgMap = {};
    for (const a of initialAssignments)
      m[a.user_id] = { team_index: a.team_index, slot: a.slot };
    return m;
  });
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>(initialProfiles);
  const [version, setVersion] = useState(initialVersion);
  const versionRef = useRef(version);
  // Sync the ref from an effect — never mutate it during render. A ref torn
  // during React 19 concurrent rendering fed stale base versions into
  // commit_shuffle retries, so they never converged (shuffle retry-storm).
  useEffect(() => {
    versionRef.current = version;
  }, [version]);

  type Move = { user_id: string; team_index: number | null; slot: number | null };
  const commitInFlight = useRef(false);
  const queuedMoves = useRef<Move[] | null>(null);
  const hiddenSkip = useRef(false);
  const commitRef = useRef<((m: Move[]) => Promise<void>) | null>(null);

  const [editorId, setEditorId] = useState(initialEditorId);
  const [editorExpires, setEditorExpires] = useState(initialEditorExpiresAt);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [heldBy, setHeldBy] = useState<HeldMap>({});
  const [pulse, setPulse] = useState<Held | null>(null); // transient "X reshuffled" activity
  const [iAmActive, setIAmActive] = useState(false); // I'm mid-drag / just acted
  const [now, setNow] = useState(() => Date.now());
  const [dragId, setDragId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const t = setInterval(() => {
      const ts = Date.now();
      setNow(ts);
      // prune stale "held" markers in case a release broadcast was missed
      setHeldBy((h) => {
        let changed = false;
        const next: HeldMap = {};
        for (const [k, v] of Object.entries(h)) {
          if (ts - v.at < 8000) next[k] = v;
          else changed = true;
        }
        return changed ? next : h;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const nameOf = useCallback(
    (id: string) =>
      viewers.find((v) => v.user_id === id)?.name ??
      Object.values(heldBy).find((h) => h.by === id)?.byName ??
      (pulse?.by === id ? pulse.byName : undefined) ??
      "Someone",
    [viewers, heldBy, pulse],
  );

  const editorLockFresh =
    !!editorId &&
    !!editorExpires &&
    new Date(editorExpires).getTime() > now;

  // Everyone (other than me) who is shuffling right now.
  const activeOthers = useMemo(() => {
    const ids = new Set<string>();
    if (editorLockFresh && editorId && editorId !== meId) ids.add(editorId);
    for (const h of Object.values(heldBy)) {
      if (h.by !== meId && now - h.at < 8000) ids.add(h.by);
    }
    if (pulse && pulse.by !== meId && now - pulse.at < 4000) ids.add(pulse.by);
    return [...ids].map((id) => ({ id, name: nameOf(id) }));
  }, [editorLockFresh, editorId, meId, heldBy, pulse, now, nameOf]);

  // Read via a ref (not the `profiles` dep) so this callback's identity is
  // stable — it's a dep of the realtime-wiring effect below, and churning it
  // on every profile fetch was tearing down and resubscribing that channel
  // (and re-firing release_shuffle_editor) each time.
  const profilesRef = useRef(profiles);
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  const ensureProfiles = useCallback(
    async (ids: string[]) => {
      const missing = ids.filter((id) => !profilesRef.current[id]);
      if (!missing.length) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", missing);
      if (data?.length) {
        setProfiles((p) => {
          const next = { ...p };
          for (const row of data) next[row.id] = row;
          return next;
        });
      }
    },
    [supabase],
  );

  const resync = useCallback(async () => {
    const [{ data: rows }, { data: state }] = await Promise.all([
      supabase
        .from("team_assignments")
        .select("user_id, team_index, slot")
        .eq("event_id", eventId),
      supabase
        .from("shuffle_state")
        .select("version, active_editor_id, editor_expires_at")
        .eq("event_id", eventId)
        .maybeSingle(),
    ]);
    if (rows) {
      const m: AsgMap = {};
      for (const r of rows) m[r.user_id] = { team_index: r.team_index, slot: r.slot };
      setAsg(m);
      void ensureProfiles(rows.map((r) => r.user_id));
    }
    if (state) {
      setVersion(state.version);
      // Update the ref directly so a retry in the same tick rebases on the
      // server's version instead of waiting for the sync effect to run.
      versionRef.current = state.version;
      setEditorId(state.active_editor_id);
      setEditorExpires(state.editor_expires_at);
    }
  }, [supabase, eventId, ensureProfiles]);

  // A backgrounded tab / installed PWA must never push commits. When it comes
  // back to the foreground, pull server truth instead of replaying stale moves.
  useEffect(() => {
    function onVisibility() {
      if (document.hidden) return;
      if (hiddenSkip.current) {
        hiddenSkip.current = false;
        void resync();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [resync]);

  // Realtime wiring
  useEffect(() => {
    const channel = supabase.channel(`board:${eventId}`, {
      config: { presence: { key: meId } },
    });

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_assignments", filter: `event_id=eq.${eventId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { user_id?: string };
            if (oldRow.user_id)
              setAsg((m) => {
                const next = { ...m };
                delete next[oldRow.user_id!];
                return next;
              });
            return;
          }
          const row = payload.new as Assignment;
          setAsg((m) => ({
            ...m,
            [row.user_id]: { team_index: row.team_index, slot: row.slot },
          }));
          setHeldBy((h) => {
            if (!h[row.user_id]) return h;
            const next = { ...h };
            delete next[row.user_id];
            return next;
          });
          void ensureProfiles([row.user_id]);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shuffle_state", filter: `event_id=eq.${eventId}` },
        (payload) => {
          const row = payload.new as {
            version: number;
            active_editor_id: string | null;
            editor_expires_at: string | null;
          };
          setVersion(row.version);
          setEditorId(row.active_editor_id);
          setEditorExpires(row.editor_expires_at);
        },
      )
      .on("broadcast", { event: "move" }, ({ payload }) => {
        if (payload.by === meId) return;
        setAsg((m) => ({
          ...m,
          [payload.user_id]: {
            team_index: payload.team_index,
            slot: payload.slot ?? m[payload.user_id]?.slot ?? null,
          },
        }));
        setHeldBy((h) => {
          if (!h[payload.user_id]) return h;
          const next = { ...h };
          delete next[payload.user_id];
          return next;
        });
        void ensureProfiles([payload.user_id]);
      })
      .on("broadcast", { event: "grab" }, ({ payload }) => {
        if (payload.by === meId) return;
        setHeldBy((h) => ({
          ...h,
          [payload.player]: {
            by: payload.by,
            byName: payload.byName,
            byAvatar: payload.byAvatar ?? null,
            at: Date.now(),
          },
        }));
      })
      .on("broadcast", { event: "release" }, ({ payload }) => {
        setHeldBy((h) => {
          const held = h[payload.player];
          if (!held || held.by !== payload.by) return h;
          const next = { ...h };
          delete next[payload.player];
          return next;
        });
      })
      .on("broadcast", { event: "activity" }, ({ payload }) => {
        if (payload.by === meId) return;
        setPulse({ by: payload.by, byName: payload.byName, at: Date.now() });
      })
      .on("presence", { event: "sync" }, () => {
        const st = channel.presenceState<Viewer>();
        const list: Viewer[] = [];
        for (const key of Object.keys(st)) {
          const entry = st[key][0];
          if (entry)
            list.push({
              user_id: entry.user_id,
              name: entry.name,
              avatar_url: entry.avatar_url ?? null,
            });
        }
        setViewers(list);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: meId, name: meName, avatar_url: meAvatarUrl });
        }
      });

    channelRef.current = channel;
    return () => {
      if (releaseTimer.current) clearTimeout(releaseTimer.current);
      if (canShuffle) void supabase.rpc("release_shuffle_editor", { _event: eventId });
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [supabase, eventId, meId, meName, meAvatarUrl, canShuffle, ensureProfiles]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
  );

  const teams = useMemo(() => {
    const groups: string[][] = Array.from({ length: teamCount }, () => []);
    const pool: string[] = [];
    const order = Object.keys(asg).sort((a, b) => {
      const sa = asg[a].slot ?? 999;
      const sb = asg[b].slot ?? 999;
      if (sa !== sb) return sa - sb;
      return (profiles[a] ? displayName(profiles[a]) : a).localeCompare(
        profiles[b] ? displayName(profiles[b]) : b,
      );
    });
    for (const uid of order) {
      const ti = asg[uid].team_index;
      if (ti === null || ti === undefined || ti >= teamCount) pool.push(uid);
      else groups[ti].push(uid);
    }
    return { groups, pool };
  }, [asg, teamCount, profiles]);

  function broadcast(event: string, payload: Record<string, unknown>) {
    channelRef.current?.send({ type: "broadcast", event, payload });
  }

  function markActive() {
    setIAmActive(true);
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
  }
  function scheduleIdle() {
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = setTimeout(() => {
      setIAmActive(false);
      if (canShuffle) void supabase.rpc("release_shuffle_editor", { _event: eventId });
    }, 1500);
  }

  function onDragStart(e: DragStartEvent) {
    const player = String(e.active.id);
    setDragId(player);
    markActive();
    if (canShuffle) {
      void supabase.rpc("claim_shuffle_editor", { _event: eventId });
      broadcast("grab", {
        by: meId,
        byName: meName,
        byAvatar: meAvatarUrl,
        player,
      });
    }
  }

  async function onDragEnd(e: DragEndEvent) {
    const userId = String(e.active.id);
    setDragId(null);
    broadcast("release", { by: meId, player: userId });
    scheduleIdle();

    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;

    const newTeam = overId === "pool" ? null : Number(overId.replace("team-", ""));
    const current = asg[userId]?.team_index ?? null;
    if (current === newTeam) return;

    const slot =
      newTeam === null
        ? null
        : Object.values(asg).filter((a) => a.team_index === newTeam).length;

    setAsg((m) => ({ ...m, [userId]: { team_index: newTeam, slot } }));
    broadcast("move", { by: meId, user_id: userId, team_index: newTeam, slot });
    await commit([{ user_id: userId, team_index: newTeam, slot }]);
  }

  function onDragCancel() {
    if (dragId) broadcast("release", { by: meId, player: dragId });
    setDragId(null);
    scheduleIdle();
  }

  const commit = useCallback(
    async (moves: Move[]) => {
      // Never push from a backgrounded tab. A wedged hidden client looping
      // commit_shuffle is exactly what pinned prod DB CPU; keep the optimistic
      // local state and reconcile via resync() on visibilitychange.
      if (typeof document !== "undefined" && document.hidden) {
        hiddenSkip.current = true;
        return;
      }
      // Coalesce: if a commit is already running, remember only the latest
      // batch and flush it once the in-flight one settles.
      if (commitInFlight.current) {
        queuedMoves.current = moves;
        return;
      }
      commitInFlight.current = true;
      setBusy(true);
      try {
        const MAX_ATTEMPTS = 3;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          const { data, error } = await supabase.rpc("commit_shuffle", {
            _event: eventId,
            _moves: moves,
            _base_version: versionRef.current,
          });
          if (!error) {
            if (typeof data === "number") setVersion(data);
            break;
          }
          const stale = error.code === "40001" || /stale/i.test(error.message);
          if (!stale) {
            toast.error(error.message);
            await resync();
            break;
          }
          // Rebase on the server's version (resync updates versionRef directly)
          // and retry with a capped exponential backoff — then give up so a
          // stuck client can't hammer the RPC forever.
          await resync();
          if (attempt === MAX_ATTEMPTS) {
            toast.error("Board changed — please try that move again.");
            break;
          }
          await new Promise((r) => setTimeout(r, 250 * 3 ** (attempt - 1)));
        }
      } finally {
        commitInFlight.current = false;
        setBusy(false);
        const queued = queuedMoves.current;
        queuedMoves.current = null;
        if (queued) void commitRef.current?.(queued);
      }
    },
    [supabase, eventId, resync],
  );

  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);

  async function autoShuffle() {
    if (!canShuffle) return;
    setBusy(true);
    markActive();
    broadcast("activity", { by: meId, byName: meName });
    try {
      const { data, error } = await supabase.rpc("auto_shuffle", {
        _event: eventId,
        _base_version: versionRef.current,
      });
      if (error) {
        toast.error(error.message);
        await resync();
      } else {
        if (typeof data === "number") setVersion(data);
        await resync();
        toast.success("Teams shuffled");
      }
    } finally {
      setBusy(false);
      scheduleIdle();
    }
  }

  async function clearTeams() {
    if (!canShuffle) return;
    const moves = Object.keys(asg)
      .filter((uid) => asg[uid].team_index !== null)
      .map((uid) => ({ user_id: uid, team_index: null, slot: null }));
    if (!moves.length) return;
    markActive();
    broadcast("activity", { by: meId, byName: meName });
    setAsg((m) => {
      const next = { ...m };
      for (const mv of moves) next[mv.user_id] = { team_index: null, slot: null };
      return next;
    });
    await commit(moves);
    scheduleIdle();
  }

  const totalPlayers = Object.keys(asg).length;
  const iAmShuffling = iAmActive || dragId !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-3">
        <div>
          <h1 className="zine-head text-3xl sm:text-4xl">Team sheet</h1>
          <p className="font-sans text-mini uppercase tracking-widest text-ink-soft">
            {totalPlayers} in · aiming for {playersPerTeam} a side ·{" "}
            <span className="border border-ink px-1">draft {version}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PresenceStack
            viewers={viewers}
            meId={meId}
            activeIds={new Set(activeOthers.map((o) => o.id))}
            iAmActive={iAmShuffling}
          />
          {canShuffle ? (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={busy} onClick={clearTeams}>
                <Eraser /> Clear
              </Button>
              <Button size="sm" disabled={busy} onClick={autoShuffle}>
                <Shuffle /> Auto-pick
              </Button>
            </div>
          ) : (
            <Badge variant="outline">Watching only</Badge>
          )}
        </div>
      </div>

      <LiveActivityBar
        activeOthers={activeOthers}
        iAmShuffling={iAmShuffling}
        canShuffle={canShuffle}
      />

      {!mounted ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StaticColumn title="Not picked" teamNo={null} userIds={teams.pool} profiles={profiles} capacity={null} />
          {teams.groups.map((ids, i) => (
            <StaticColumn
              key={i}
              title="Team"
              teamNo={i + 1}
              userIds={ids}
              profiles={profiles}
              capacity={playersPerTeam}
            />
          ))}
        </div>
      ) : (
        <DndContext
          id="shuffle-board"
          sensors={sensors}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Column
              id="pool"
              title="Not picked"
              teamNo={null}
              userIds={teams.pool}
              profiles={profiles}
              heldBy={heldBy}
              meId={meId}
              disabled={!canShuffle}
              capacity={null}
            />
            {teams.groups.map((ids, i) => (
              <Column
                key={i}
                id={`team-${i}`}
                title="Team"
                teamNo={i + 1}
                userIds={ids}
                profiles={profiles}
                heldBy={heldBy}
                meId={meId}
                disabled={!canShuffle}
                capacity={playersPerTeam}
              />
            ))}
          </div>

          <DragOverlay
            dropAnimation={{ duration: 160, easing: "cubic-bezier(0.2, 0.9, 0.2, 1)" }}
          >
            {dragId && profiles[dragId] ? (
              <NameSlip profile={profiles[dragId]} overlay accent={MARK} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

/* ---------- collaboration UI ---------- */

function PresenceStack({
  viewers,
  meId,
  activeIds,
  iAmActive,
}: {
  viewers: Viewer[];
  meId: string;
  activeIds: Set<string>;
  iAmActive: boolean;
}) {
  const list = viewers.length ? viewers : [{ user_id: meId, name: "You", avatar_url: null }];
  const ordered = [...list].sort((a, b) => {
    const aa = activeIds.has(a.user_id) || (a.user_id === meId && iAmActive) ? 0 : 1;
    const bb = activeIds.has(b.user_id) || (b.user_id === meId && iAmActive) ? 0 : 1;
    return aa - bb;
  });
  const shown = ordered.slice(0, 5);
  const extra = ordered.length - shown.length;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-1.5">
        {shown.map((v) => {
          const active = activeIds.has(v.user_id) || (v.user_id === meId && iAmActive);
          return (
            <span
              key={v.user_id}
              title={
                v.user_id === meId
                  ? `You${active ? " · shuffling" : ""}`
                  : `${v.name}${active ? " · shuffling" : " · watching"}`
              }
              className={cn("relative", active && "z-10")}
              style={
                active
                  ? { boxShadow: `0 0 0 2px var(--paper), 0 0 0 4px ${MARK}` }
                  : undefined
              }
            >
              <Avatar name={v.name} src={v.avatar_url} size={26} plain className="border border-ink" />
              {active && (
                <span className="alarm-dot absolute -bottom-1 -right-1 size-2.5 border border-ink bg-alarm" />
              )}
            </span>
          );
        })}
      </div>
      {extra > 0 && (
        <span className="font-sans text-mini text-ink-soft">+{extra}</span>
      )}
      <span className="hidden font-display text-micro font-bold uppercase tracking-[0.12em] text-ink-soft sm:inline">
        {ordered.length} here
      </span>
    </div>
  );
}

function LiveActivityBar({
  activeOthers,
  iAmShuffling,
  canShuffle,
}: {
  activeOthers: { id: string; name: string }[];
  iAmShuffling: boolean;
  canShuffle: boolean;
}) {
  if (activeOthers.length === 0) return null;

  const names =
    activeOthers.length === 1
      ? firstName(activeOthers[0].name)
      : activeOthers.length === 2
        ? `${firstName(activeOthers[0].name)} & ${firstName(activeOthers[1].name)}`
        : `${firstName(activeOthers[0].name)} +${activeOthers.length - 1}`;
  const verb = activeOthers.length === 1 ? "is" : "are";

  return (
    <div className="flex flex-wrap items-center gap-2 border-2 border-ink bg-alarm/15 px-3 py-1.5">
      <span className="alarm-dot size-2.5 shrink-0 bg-alarm" />
      <span className="font-display text-mini font-extrabold uppercase tracking-[0.14em] text-ink">
        Stop press —
      </span>
      <span className="font-sans text-note font-bold text-ink">
        {names} {verb} shuffling the teams
      </span>
      {iAmShuffling && canShuffle && (
        <span className="font-sans text-mini text-ink-soft">
          · you&apos;re on it too, last change sticks
        </span>
      )}
    </div>
  );
}

/* ---------- team sheets & name-slips ---------- */

function SheetShell({
  title,
  teamNo,
  count,
  capacity,
  isOver,
  children,
  refCb,
}: {
  title: string;
  teamNo: number | null;
  count: number;
  capacity: number | null;
  isOver?: boolean;
  children: ReactNode;
  refCb?: (el: HTMLElement | null) => void;
}) {
  const over = capacity !== null && count > capacity;
  const isTeam = teamNo !== null;
  return (
    <section
      ref={refCb}
      className={cn(
        "flex min-h-44 flex-col border-2 bg-paper-2 transition-colors",
        isOver ? "border-riso" : "border-ink",
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between gap-2 px-2 py-1",
          isTeam ? "bg-riso text-riso-ink" : "border-b-2 border-ink bg-paper text-ink",
        )}
      >
        <span className="flex items-baseline gap-1.5">
          {isTeam && (
            <span className="zine-hand text-2xl leading-none">{teamNo}</span>
          )}
          <span className="font-display text-mini font-extrabold uppercase tracking-[0.16em]">
            {title}
          </span>
        </span>
        <span
          className={cn(
            "border px-1 font-sans text-micro font-bold",
            isTeam ? "border-riso-ink/60" : "border-ink",
            over && "border-alarm bg-alarm text-ink",
          )}
        >
          {count}
          {capacity !== null ? `/${capacity}` : ""}
        </span>
      </header>
      <div className="ruled flex flex-1 flex-col gap-1 px-2 py-1.5">{children}</div>
    </section>
  );
}

function Column({
  id,
  title,
  teamNo,
  userIds,
  profiles,
  heldBy,
  meId,
  disabled,
  capacity,
}: {
  id: string;
  title: string;
  teamNo: number | null;
  userIds: string[];
  profiles: Record<string, ProfileLite>;
  heldBy: HeldMap;
  meId: string;
  disabled: boolean;
  capacity: number | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <SheetShell
      title={title}
      teamNo={teamNo}
      count={userIds.length}
      capacity={capacity}
      isOver={isOver}
      refCb={setNodeRef}
    >
      {userIds.length === 0 && (
        <p className="m-auto font-sans text-mini uppercase tracking-widest text-ink-soft">
          drop a name here
        </p>
      )}
      {userIds.map((uid) => {
        const held = heldBy[uid];
        const heldByOther = held && held.by !== meId ? held : undefined;
        return profiles[uid] ? (
          <DraggableChip
            key={uid}
            id={uid}
            profile={profiles[uid]}
            disabled={disabled}
            heldByOther={heldByOther}
          />
        ) : (
          <div key={uid} className="h-8 animate-pulse border border-rule bg-paper" />
        );
      })}
    </SheetShell>
  );
}

/** Non-interactive column used for the pre-hydration render. */
function StaticColumn({
  title,
  teamNo,
  userIds,
  profiles,
  capacity,
}: {
  title: string;
  teamNo: number | null;
  userIds: string[];
  profiles: Record<string, ProfileLite>;
  capacity: number | null;
}) {
  return (
    <SheetShell title={title} teamNo={teamNo} count={userIds.length} capacity={capacity}>
      {userIds.length === 0 && (
        <p className="m-auto font-sans text-mini uppercase tracking-widest text-ink-soft">
          drop a name here
        </p>
      )}
      {userIds.map((uid) =>
        profiles[uid] ? (
          <NameSlip key={uid} profile={profiles[uid]} />
        ) : (
          <div key={uid} className="h-8 animate-pulse border border-rule bg-paper" />
        ),
      )}
    </SheetShell>
  );
}

function DraggableChip({
  id,
  profile,
  disabled,
  heldByOther,
}: {
  id: string;
  profile: ProfileLite;
  disabled: boolean;
  heldByOther?: Held;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "touch-none",
        isDragging ? "anim-peel opacity-40" : "transition-transform",
        !disabled && "cursor-grab active:cursor-grabbing",
      )}
    >
      <NameSlip
        profile={profile}
        holder={
          heldByOther
            ? {
                name: firstName(heldByOther.byName),
                avatarUrl: heldByOther.byAvatar ?? null,
              }
            : undefined
        }
      />
    </div>
  );
}

/** A die-cut name slip. `accent` / a held marker both use the LIVE pink. */
function NameSlip({
  profile,
  overlay,
  accent,
  holder,
}: {
  profile: ProfileLite;
  overlay?: boolean;
  accent?: string;
  holder?: { name: string; avatarUrl: string | null };
}) {
  const edge = holder ? MARK : accent;
  return (
    <div
      className={cn(
        "relative flex items-center gap-2 border-2 bg-paper px-2 py-1.5",
        overlay && "-rotate-2 scale-[1.04] shadow-[3px_8px_14px_rgba(0,0,0,0.28)]",
      )}
      style={edge ? { borderColor: edge } : { borderColor: "var(--ink)" }}
    >
      <Avatar name={displayName(profile)} src={profile.avatar_url} size={28} plain className="border border-ink" />
      <span className="truncate font-mono text-note font-bold text-ink">
        {displayName(profile)}
      </span>

      {holder && (
        <div className="presence-flag pointer-events-none absolute -right-1.5 -top-4 z-20 flex items-center gap-1">
          <span
            className="presence-flag-inner border border-ink bg-paper p-[2px] shadow-[1px_2px_0_rgba(28,24,19,0.3)]"
            style={{ boxShadow: `0 0 0 2px ${MARK}` }}
          >
            <Avatar name={holder.name} src={holder.avatarUrl} size={18} plain />
          </span>
          <span className="zine-hand border border-ink bg-paper px-1 text-note leading-none text-ink">
            {holder.name}
          </span>
        </div>
      )}
    </div>
  );
}
