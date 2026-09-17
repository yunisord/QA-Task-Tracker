export function $(id) {
  return document.getElementById(id);
}


export function esc(value = "") {

  return String(value).replace(
    /[&<>"']/g,

    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]
  );

}


export function initials(name = "") {

  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(value => value[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

}


export function badge(status) {

  const classes = {

    "In Progress": "progress",
    "Blocked": "blocked",
    "For Review": "review",
    "Done": "done",
    "To Do": "review",
    "Available": "available"

  };

  const cssClass =
    classes[status] || "done";


  return `
    <span class="badge ${cssClass}">
      ${esc(status)}
    </span>
  `;

}


export function flatGames(games) {

  return Object.entries(games)
    .flatMap(
      ([category, gameList]) =>
        gameList.map(name => ({
          name,
          category
        }))
    );

}


export function getCurrentTask(
  tasks,
  member
) {

  return tasks.find(
    task =>
      task.member === member &&
      task.status !== "Done"
  ) || null;

}