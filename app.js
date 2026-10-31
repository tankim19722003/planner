const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const WEEK_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_NAMES = { monday: "Thứ Hai", tuesday: "Thứ Ba", wednesday: "Thứ Tư", thursday: "Thứ Năm", friday: "Thứ Sáu", saturday: "Thứ Bảy", sunday: "Chủ Nhật" };
const PLAN_KEY = "weekly-plan-tracker:plan";
const DONE_KEY = "weekly-plan-tracker:done";
const TIME_ZONE = "Asia/Ho_Chi_Minh";
const BUNDLED_PLAN = {
  version: 1,
  title: "Hôm nay",
  schedule: {
    monday: [
      { id: "morning", time: "04:30–05:45", task: "PHP: đọc codebase, hiểu luồng request" },
      { id: "work", time: "08:15–17:00", task: "Đi làm" },
      { id: "evening", time: "Buổi tối", task: "Nấu ăn, chuẩn bị cơm ngày mai" },
    ],
    tuesday: [
      { id: "morning", time: "04:30–05:45", task: "Tiếng Anh" },
      { id: "work", time: "08:15–17:00", task: "Đi làm" },
      { id: "evening", time: "Buổi tối", task: "Nấu ăn, học tiếng Trung 20 phút" },
    ],
    wednesday: [
      { id: "morning", time: "04:30–05:45", task: "PHP: SQL, debugging, testing" },
      { id: "work", time: "08:15–17:00", task: "Đi làm" },
      { id: "evening", time: "Buổi tối", task: "Nấu ăn, nghỉ ngơi" },
    ],
    thursday: [
      { id: "morning", time: "04:30–05:45", task: "Tiếng Anh kỹ thuật" },
      { id: "work", time: "08:15–17:00", task: "Đi làm" },
      { id: "evening", time: "Buổi tối", task: "Nấu ăn, học tiếng Trung 20 phút" },
    ],
    friday: [
      { id: "morning", time: "04:30–05:45", task: "PHP: tổng kết kiến thức trong tuần" },
      { id: "work", time: "08:15–17:00", task: "Đi làm" },
      { id: "evening", time: "Buổi tối", task: "Nghỉ ngơi" },
    ],
    saturday: [
      { id: "morning", time: "04:30–05:45", task: "PHP/backend chuyên sâu 2 giờ" },
      { id: "daytime", time: "08:15–17:00", task: "Tài chính cá nhân 1 giờ" },
      { id: "evening", time: "Buổi tối", task: "Nghỉ ngơi, gặp bạn bè" },
    ],
    sunday: [
      { id: "morning", time: "04:30–05:45", task: "Tiếng Trung 1 giờ, tiếng Anh 45 phút" },
      { id: "daytime", time: "08:15–17:00", task: "Mua và sơ chế thực phẩm" },
      { id: "evening", time: "Buổi tối", task: "Tổng kết, chuẩn bị tuần mới" },
    ],
  },
};

let defaultPlan;
let plan;
let toastTimer;

function zonedToday() {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short" }).format(now);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(now)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  return { year: Number(parts.year), month: Number(parts.month), date: Number(parts.day), dayIndex, day: DAYS[dayIndex] };
}

function calendarDay(offset = 0) {
  const today = zonedToday();
  const date = new Date(Date.UTC(today.year, today.month - 1, today.date + offset));
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return {
    key: `${year}-${month}-${day}`,
    short: `${day}/${month}`,
    long: new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", day: "2-digit", month: "long", year: "numeric" }).format(date),
  };
}

function currentWeek() {
  const today = zonedToday();
  const mondayOffset = today.dayIndex === 0 ? -6 : 1 - today.dayIndex;
  return WEEK_ORDER.map((day, index) => ({ day, ...calendarDay(mondayOffset + index) }));
}

function validatePlan(value) {
  if (!value || typeof value !== "object" || !value.schedule || typeof value.schedule !== "object") {
    throw new Error("File cần có thuộc tính schedule.");
  }
  for (const day of DAYS) {
    if (!Array.isArray(value.schedule[day])) throw new Error(`Thiếu danh sách ${day}.`);
    for (const item of value.schedule[day]) {
      if (!item || typeof item.id !== "string" || typeof item.task !== "string" || typeof item.time !== "string") {
        throw new Error(`Mỗi việc trong ${day} cần có id, task và time.`);
      }
    }
    if (new Set(value.schedule[day].map(({ id }) => id)).size !== value.schedule[day].length) {
      throw new Error(`id trong ${day} không được trùng nhau.`);
    }
  }
  return value;
}

function readDone() {
  try { return JSON.parse(localStorage.getItem(DONE_KEY)) || {}; }
  catch { return {}; }
}

function saveDone(done) { localStorage.setItem(DONE_KEY, JSON.stringify(done)); }

function setCompleted(dateKey, itemId, completed) {
  const done = readDone();
  const key = `${dateKey}:${itemId}`;
  if (completed) done[key] = true;
  else delete done[key];
  saveDone(done);
}

function showStatus(message) {
  const status = document.querySelector("#import-status");
  status.textContent = message;
  status.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => status.classList.remove("show"), 3200);
}

function renderToday() {
  const today = zonedToday();
  const date = calendarDay();
  const items = plan.schedule[today.day];
  const done = readDone();
  const tasks = document.querySelector("#tasks");

  document.querySelector("#today-date").textContent = `${DAY_NAMES[today.day]} · ${date.long}`;
  tasks.replaceChildren();
  document.querySelector("#empty-state").hidden = items.length > 0;

  items.forEach((item, index) => {
    const key = `${date.key}:${item.id}`;
    const label = document.createElement("label");
    label.className = `task${done[key] ? " done" : ""}`;
    const number = document.createElement("span");
    number.className = "task-index";
    number.textContent = String(index + 1).padStart(2, "0");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(done[key]);
    checkbox.setAttribute("aria-label", `Hoàn thành: ${item.task}`);
    const text = document.createElement("strong");
    text.textContent = item.task;
    const time = document.createElement("small");
    time.textContent = item.time;

    checkbox.addEventListener("change", () => {
      setCompleted(date.key, item.id, checkbox.checked);
      renderToday();
    });
    label.append(number, text, time, checkbox);
    tasks.append(label);
  });

  const completed = items.filter(({ id }) => done[`${date.key}:${id}`]).length;
  const percent = items.length ? Math.round((completed / items.length) * 100) : 0;
  document.querySelector("#progress-percent").textContent = `${percent}%`;
  document.querySelector("#progress-text").textContent = `${completed}/${items.length} việc hoàn thành`;
  document.querySelector("#progress-bar").style.width = `${percent}%`;
}

function renderWeek() {
  const week = currentWeek();
  const todayKey = calendarDay().key;
  const done = readDone();
  const grid = document.querySelector("#week-grid");
  let total = 0;
  let completed = 0;

  grid.replaceChildren();
  for (const date of week) {
    const items = plan.schedule[date.day];
    const dayCompleted = items.filter(({ id }) => done[`${date.key}:${id}`]).length;
    total += items.length;
    completed += dayCompleted;

    const card = document.createElement("article");
    card.className = `day-card${date.key === todayKey ? " today" : ""}`;
    const head = document.createElement("div");
    head.className = "day-head";
    const title = document.createElement("h3");
    title.textContent = DAY_NAMES[date.day];
    const count = document.createElement("span");
    count.textContent = `${dayCompleted}/${items.length}`;
    head.append(title, count);

    const progress = document.createElement("div");
    progress.className = "day-progress";
    const progressValue = document.createElement("div");
    progressValue.style.width = items.length ? `${(dayCompleted / items.length) * 100}%` : "0%";
    progress.append(progressValue);

    const list = document.createElement("div");
    list.className = "week-tasks";
    for (const item of items) {
      const key = `${date.key}:${item.id}`;
      const label = document.createElement("label");
      label.className = `week-task${done[key] ? " done" : ""}`;
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(done[key]);
      checkbox.setAttribute("aria-label", `${DAY_NAMES[date.day]}: ${item.task}`);
      const text = document.createElement("span");
      text.textContent = item.task;
      checkbox.addEventListener("change", () => {
        setCompleted(date.key, item.id, checkbox.checked);
        renderWeek();
      });
      label.append(checkbox, text);
      list.append(label);
    }
    card.append(head, progress, list);
    grid.append(card);
  }

  const percent = total ? Math.round((completed / total) * 100) : 0;
  document.querySelector("#week-percent").textContent = `${percent}%`;
  document.querySelector("#week-progress-ring").style.setProperty("--progress", `${percent * 3.6}deg`);
  document.querySelector("#week-done").textContent = completed;
  document.querySelector("#week-left").textContent = total - completed;
}

function render() {
  if (document.body.dataset.page === "week") renderWeek();
  else renderToday();
  animatePage();
}

function animatePage() {
  if (!window.gsap || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  gsap.registerPlugin(window.ScrollTrigger);
  gsap.from(".topbar", { y: -24, opacity: 0, duration: 0.7, ease: "power3.out" });
  gsap.from(".compact-progress, .stat-card", { y: 32, opacity: 0, stagger: 0.1, duration: 0.7, delay: 0.28, ease: "power3.out" });
  const trigger = document.querySelector(".task-list, .week-grid");
  if (trigger) {
    gsap.from(".task, .day-card", { y: 54, opacity: 0, stagger: 0.07, duration: 0.7, ease: "power2.out", scrollTrigger: { trigger, start: "top 88%" } });
  }
}

document.querySelector("#plan-file").addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  try {
    const imported = validatePlan(JSON.parse(await file.text()));
    localStorage.setItem(PLAN_KEY, JSON.stringify(imported));
    plan = imported;
    render();
    showStatus(`Đã dùng kế hoạch từ ${file.name}.`);
  } catch (error) {
    showStatus(`Không import được: ${error.message}`);
  } finally {
    event.target.value = "";
  }
});

document.querySelector("#restore-plan")?.addEventListener("click", () => {
  localStorage.removeItem(PLAN_KEY);
  plan = defaultPlan;
  render();
  showStatus("Đã khôi phục kế hoạch mẫu.");
});

document.querySelector("#reset-day")?.addEventListener("click", () => {
  const today = zonedToday();
  const date = calendarDay();
  const done = readDone();
  for (const item of plan.schedule[today.day]) delete done[`${date.key}:${item.id}`];
  saveDone(done);
  renderToday();
});

document.querySelector("#reset-all-data")?.addEventListener("click", () => {
  const confirmed = window.confirm("Xóa toàn bộ dấu check và kế hoạch đã import trên trình duyệt này?");
  if (!confirmed) return;
  localStorage.removeItem(DONE_KEY);
  localStorage.removeItem(PLAN_KEY);
  plan = defaultPlan;
  renderWeek();
  showStatus("Đã xóa toàn bộ dữ liệu và khôi phục kế hoạch mẫu.");
});

async function start() {
  try {
    try {
      const response = await fetch("plan.json");
      if (!response.ok) throw new Error("Không tải được plan.json.");
      defaultPlan = validatePlan(await response.json());
    } catch {
      // shortcut: direct file:// access cannot fetch JSON; keep this fallback synchronized with plan.json.
      defaultPlan = validatePlan(BUNDLED_PLAN);
    }
    const saved = localStorage.getItem(PLAN_KEY);
    plan = saved ? validatePlan(JSON.parse(saved)) : defaultPlan;
    render();
  } catch (error) {
    showStatus(`Không mở được kế hoạch: ${error.message}`);
  }
}

start();
