// desk — a whiteboard-calendar custom sidebar for cmux.
//
// A white-framed board with a marker resting on top, a month calendar with today
// circled in red, your sessions ruled off with hand-drawn pencil lines, and a cork
// strip at the bottom pinning the sessions that are waiting on you. Click any row
// to jump to that session.
//
// Install: copy to ~/.config/cmux/sidebars/desk.js, then right-click the sidebar
// toggle button and pick "desk" (or run `cmux sidebar select desk`).
//
// Custom sidebars can only use system fonts and shapes (no custom fonts, no images,
// no gradients), so the paper grain, pencil lines and cork are drawn from shapes and
// tiny dot characters.

const DEMO = false;   // true: show made-up sample sessions (handy for screenshots)

const WALL = "#d3cebf";     // behind the board; matches the Pencil Paper terminal background
const FRAME = "#f7f5f0";    // whiteboard frame
const BOARD = "#f2eee3";    // board surface
const GRID = "#2b3a5a40";   // calendar lines, navy
const NAVY = "#2b3a5a";     // page border
const INK = "#24211d";
const DIM = "#8b867d";
const RED = "#b3261e";
const BLUE = "#27477e";
const CORK = "#c49a68";

const now = () => new Date((data.clock()?.epoch ?? 0) * 1000);
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December"];

// ---------- calendar ----------
// 6 rows x 7 columns; recomputed only when the date changes (the clock ticks every second)
const day = computed(() => { const d = now(); return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate(); });
const cells = computed(() => {
  day();
  const d = now(), first = new Date(d.getFullYear(), d.getMonth(), 1);
  const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Array.from({ length: 42 }, (_, i) => {
    const n = i - first.getDay() + 1;
    return n >= 1 && n <= days ? n : 0;
  });
});

function cell(i) {
  const n = () => cells()[i];
  const today = () => n() === now().getDate();
  return ZStack({ alignment: "topLeading" }, [
    Rectangle({ height: 26 }).fill("#00000000").frame({ maxWidth: "infinity" }),
    ZStack({}, [
      Circle({ size: 18 }).fill(() => (today() ? RED : "#00000000")),
      Text(() => (n() ? String(n()) : "")).font(10).weight(() => (today() ? "bold" : "regular"))
        .color(() => (today() ? "#ffffff" : INK)),
    ]).padding(2),
  ]).borderColor(GRID).borderWidth(0.5);
}

const STRIPES = ["#c8333a", "#22324f", "#e0b45a", "#1f5a46", "#e8b4b8", "#a9bfdc", "#2f8a5b",
  "#e0b45a", "#c8333a", "#2f8a5b", "#22324f", "#e8b4b8", "#1f5a46", "#a9bfdc"];
// one color per weekday, Sunday first; light tabs get ink text, dark tabs white text
const DAYTAB = [["#e8b4b8", INK], ["#e0b45a", INK], ["#1f5a46", "#ffffff"], ["#c8333a", "#ffffff"],
  ["#a9bfdc", INK], ["#22324f", "#ffffff"], ["#2f8a5b", "#ffffff"]];

function stripes() {
  return HStack({ spacing: 0 }, Array.from({ length: 32 }, (_, i) =>
    Rectangle({ height: 9 }).fill(STRIPES[i % STRIPES.length]).frame({ maxWidth: "infinity" })))
    .frame({ maxWidth: "infinity" });
}

function calendar() {
  const head = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  return VStack({ spacing: 4 }, [
    stripes(),
    HStack({ spacing: 6 }, [
      // the month name keeps its width in a narrow sidebar; the clock gives way first
      Text(() => MONTH[now().getMonth()]).font(14).weight("bold").color(INK).lineLimit(1).layoutPriority(3),
      Text(() => String(now().getFullYear())).font(10).monospaced().color(DIM).lineLimit(1).layoutPriority(2),
      Spacer({ minLength: 0 }),
      Text(() => data.clock()?.time?.slice(0, 5) ?? "").font(11).monospaced().color(DIM).lineLimit(1),
    ]),
    // the colored tab is its own layer: a JS sidebar's .background only wraps the text itself
    HStack({ spacing: 2 }, head.map((h, i) =>
      ZStack({}, [
        RoundedRectangle({ height: 14, cornerRadius: 2 }).fill(DAYTAB[i][0]).frame({ maxWidth: "infinity" }),
        Text(h).font(9).weight("semibold").color(DAYTAB[i][1]),
      ]).frame({ maxWidth: "infinity" }))),
    VStack({ spacing: 0 }, Array.from({ length: 6 }, (_, r) =>
      HStack({ spacing: 0 }, Array.from({ length: 7 }, (_, c) => cell(r * 7 + c))))),
  ]);
}

// ---------- sessions ----------
function stateOf(w, t) {
  const a = (w.agents ?? []).find((x) => x.panelId === t.id);
  return a ? a.status : "none";
}

function sample() {
  const at = (data.clock()?.epoch ?? 0) - 60;
  const w = { id: "demo", title: "Studio", selected: true };
  const s = (id, title, prompt, state, ago, focused) =>
    ({ w, t: { id, title, latestPrompt: prompt, latestAt: at - ago * 60, focused }, s: state });
  return [
    s("1", "Landing page redesign", "make the hero section calmer", "working", 0, true),
    s("2", "Fix flaky login test", "run it 20 times and tell me", "working", 2),
    s("3", "Weekly newsletter", "tighten the second paragraph", "idle", 14),
    s("4", "Photo archive cleanup", "keep the originals", "idle", 47),
    s("5", "Recipe app API", "add pagination to /recipes", "idle", 95),
    s("6", "Blog: notes on typography", "", "idle", 180),
    s("7", "Release v2.3", "ok, ship it after the changelog", "needs_input", 3),
    s("8", "Database migration", "approve dropping the old column?", "needs_input", 9),
  ];
}

const sessions = computed(() => {
  if (DEMO) return sample();
  const out = [];
  for (const w of data.workspaces() ?? []) for (const t of w.tabs ?? []) out.push({ w, t, s: stateOf(w, t) });
  return out;
});
// working sessions first, then by last activity; sessions waiting on you go to the cork strip instead
const listed = computed(() => sessions()
  .filter((e) => e.s !== "needs_input")
  .sort((a, b) => (b.s === "working") - (a.s === "working") || (b.t.latestAt ?? 0) - (a.t.latestAt ?? 0))
  .slice(0, 9));   // more than this pushes the cork strip out of view
const pinned = computed(() => sessions().filter((e) => e.s === "needs_input").slice(0, 6));

// drop the spinner glyphs (✳ ◐ …) agents prefix to tab titles; ignore machine messages like <task-notification>
const cleanTitle = (s) => String(s ?? "").replace(/^[^\p{L}\p{N}~(]+/u, "");
const said = (s) => (s && !String(s).trimStart().startsWith("<") ? String(s) : "");
const hhmm = (epoch) => {
  if (!epoch) return "";
  const d = new Date(epoch * 1000);
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
};

function jump(e) {
  if (DEMO) return;
  cmux("workspace.select", { workspace_id: e.w.id });
  if (e.t.surfaceId) cmux("surface.focus", { surface_id: e.t.surfaceId, workspace_id: e.w.id });
}

// hand-drawn pencil rule: short segments of random weight and darkness, seeded by key so it never changes
function rng(key) {
  let seed = 0;
  for (const ch of String(key)) seed = (seed * 31 + ch.codePointAt(0)) >>> 0;
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function pencilLine(key) {
  const rand = rng(key);
  return HStack({ spacing: 0, alignment: "center" }, Array.from({ length: 12 }, () =>
    Rectangle({ height: 0.6 + rand() * 1.1 }).fill("#2a2723")
      .opacity(0.16 + rand() * 0.3).frame({ maxWidth: "infinity" })))
    .frame({ height: 3, maxWidth: "infinity" });
}

function row(e) {
  const working = () => e().s === "working";
  return VStack({ spacing: 3 }, [
    HStack({ spacing: 8 }, [
      RoundedRectangle({ width: 3, height: 28, cornerRadius: 1.5 }).fill(() => (working() ? BLUE : "#b5ada0")),
      VStack({ spacing: 1 }, [
        Text(() => cleanTitle(e().t.title)).font(12).weight("semibold").color(INK).lineLimit(1).truncation("tail")
          .frame({ maxWidth: "infinity", alignment: "leading" }),
        Text(() => said(e().t.latestPrompt) || e().w.title).font(10).color(DIM).lineLimit(1).truncation("tail")
          .frame({ maxWidth: "infinity", alignment: "leading" }),
      ]),
      Text(() => (working() ? "writing" : hhmm(e().t.latestAt))).font(10).monospaced()
        .color(() => (working() ? BLUE : DIM)).layoutPriority(2),
    ])
      .paddingVertical(3).paddingHorizontal(4)
      .cornerRadius(4)
      .borderColor(() => (e().t.focused && e().w.selected ? "#27477e66" : "#00000000")).borderWidth(1)
      .hoverBackground("#ffffff55")
      .cursor("pointer")
      .onTap(() => jump(e())),
    pencilLine(e().t.id),
  ]);
}

// a session waiting on you, outlined like a calendar cell on the cork
function note(e) {
  return HStack({ spacing: 7 }, [
    Circle({ size: 6 }).fill(RED),
    VStack({ spacing: 1 }, [
      Text(() => cleanTitle(e().t.title)).font(11).weight("semibold").color(INK).lineLimit(1).truncation("tail")
        .frame({ maxWidth: "infinity", alignment: "leading" }),
      Text(() => said(e().t.latestPrompt)).font(9).color("#3d2a16").lineLimit(2).truncation("tail")
        .frame({ maxWidth: "infinity", alignment: "leading" }),
    ]),
  ])
    .paddingHorizontal(8).paddingVertical(6)
    .frame({ maxWidth: "infinity" })
    .borderColor("#2b1d10b3").borderWidth(0.8)
    .hoverBackground("#ffffff26")
    .cursor("pointer")
    .onTap(() => jump(e()));
}

function cork() {
  // straight top edge against the board, rounded bottom corners matching the frame
  // (a JS sidebar's cornerRadius does not clip children, so the rounding is its own shape)
  return ZStack({ alignment: "top" }, [
    RoundedRectangle({ cornerRadius: 9 }).fill(CORK).frame({ maxWidth: "infinity", maxHeight: "infinity" }),
    Rectangle({ height: 20 }).fill(CORK).frame({ maxWidth: "infinity" }),
    grain({ seed: 7, rows: 18, size: 7, dots: "  ·•·.˙:‧", colors: ["#5a3a1a59", "#f0d29c66", "#7a52283d"] }),
    VStack({ spacing: 6 }, [
      Text(() => (pinned().length ? "Needs you · " + pinned().length : "Nothing waiting on you")).font(10)
        .color("#3d2a16").frame({ maxWidth: "infinity", alignment: "leading" }),
      VStack({ spacing: 0 }, [
        ForEach({ items: pinned, key: (e) => e.t.id }, (e) => note(e)),
      ]),
    ]).padding(12),
  ]).frame({ maxWidth: "infinity" });
}

// paper grain: rows of faint random dots layered under the board, generated once from a fixed seed.
// Too many rows makes the board taller and pushes the cork strip out of view.
function grain({ seed, rows, size, dots, colors }) {
  const rand = rng(seed);
  const out = [];
  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let c = 0; c < 110; c++) line += dots[Math.floor(rand() * dots.length)];
    out.push(Text(line).font(size).monospaced().lineLimit(1).color(colors[r % colors.length]));
  }
  return VStack({ spacing: 0 }, out).frame({ maxWidth: "infinity", maxHeight: "infinity" });
}

// the marker resting on top of the board
function marker() {
  return HStack({ spacing: 0 }, [
    Spacer(),
    Capsule({ width: 16, height: 9 }).fill(INK),
    Capsule({ width: 46, height: 9 }).fill("#fbfaf6").stroke("#00000033").strokeWidth(0.8),
    Spacer(),
  ]);
}

sidebar(() =>
  VStack({ spacing: 0 }, [
    marker(),
    ZStack({ alignment: "top" }, [
      grain({ seed: 20261015, rows: 90, size: 6, dots: "     ··˙.‧", colors: ["#3d352a33", "#3d352a24", "#6b604f2e"] }),
      VStack({ spacing: 0 }, [
        // navy page border. Modifiers in a JS sidebar set properties on one node rather than wrapping it
        // (a second .padding replaces the first), so the outer margin needs its own container.
        VStack({ spacing: 0 }, [
          VStack({ spacing: 10 }, [
            calendar(),
            pencilLine("calendar"),
            VStack({ spacing: 3 }, [
              ForEach({ items: listed, key: (e) => e.t.id }, (e) => row(e)),
            ]),
            Spacer(),
          ])
            .padding(10)
            .frame({ maxWidth: "infinity", maxHeight: "infinity" })
            .borderColor(NAVY).borderWidth(1),
        ]).padding(8).frame({ maxWidth: "infinity", maxHeight: "infinity" }),
        cork(),
      ]),
    ])
      .background(BOARD).cornerRadius(14)
      .borderColor(FRAME).borderWidth(6),
    // room for the buttons cmux floats over the bottom-left of the sidebar
    Rectangle({ height: 40 }).fill("#00000000"),
  ])
    .padding(8)
    .frame({ maxWidth: "infinity", maxHeight: "infinity" })
    .background(WALL)
);
