// Shared renderer for every plan's status page. Reads two globals set by the
// per-plan <slug>-status.data.js, loaded before this script:
//   PLAN_META  = { title, planFile }
//   PLAN_TASKS = [{ id, name, status: "done"|"progress"|"todo", detail }]
// Adding a feature (a filter, a timestamp, a link) means editing this file
// once -- every plan's page picks it up on next open. Nothing here reads the
// filesystem or git; PLAN_TASKS is a plain hand-maintained array, kept
// current as part of each task's checkpoint commit.

document.title = `${PLAN_META.title} — Progress`;

const STATUS_LABEL = { done: "Done", progress: "In progress", todo: "Not started" };

function render() {
  const done = PLAN_TASKS.filter((t) => t.status === "done").length;
  const progress = PLAN_TASKS.filter((t) => t.status === "progress").length;
  const todo = PLAN_TASKS.length - done - progress;
  const pct = Math.round((done / PLAN_TASKS.length) * 100);

  document.getElementById("title").textContent = PLAN_META.title;
  document.getElementById("subtitle").innerHTML =
    `Progress on <code>${PLAN_META.planFile}</code>`;
  document.getElementById("progress-bar").style.width = `${pct}%`;
  document.getElementById("progress-label").textContent =
    `${done} of ${PLAN_TASKS.length} done` +
    (progress ? ` · ${progress} in progress` : "") +
    (todo ? ` · ${todo} not started` : "");

  const list = document.getElementById("tasks");
  list.innerHTML = "";
  for (const t of PLAN_TASKS) {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="task-id">${t.id}</span>
      <span class="task-body">
        <div class="task-name">${t.name}</div>
        <div class="task-detail">${t.detail}</div>
      </span>
      <span class="status ${t.status}">${STATUS_LABEL[t.status]}</span>
    `;
    list.appendChild(li);
  }
}

render();
