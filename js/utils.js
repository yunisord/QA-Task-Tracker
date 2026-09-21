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


/* =========================================================
   GLOBAL NOTIFICATIONS
   Automatically disappear after 5 seconds
========================================================= */

export function showNotification(
  message,
  type = "success",
  title = null
) {

  const container =
    document.getElementById(
      "notificationContainer"
    );

  if (!container) return;


  const titles = {

    success: "Saved successfully",
    error: "Something went wrong",
    warning: "Warning",
    info: "Information"

  };


  const icons = {

    success: "fa-check",
    error: "fa-xmark",
    warning: "fa-triangle-exclamation",
    info: "fa-info"

  };


  const notification =
    document.createElement("div");


  notification.className =
    `notification ${type}`;


  notification.innerHTML = `

    <div class="notification-icon">

      <i class="fa-solid ${
        icons[type] || icons.info
      }"></i>

    </div>


    <div class="notification-content">

      <div class="notification-title">
        ${esc(
          title ||
          titles[type] ||
          "Notification"
        )}
      </div>


      <div class="notification-message">
        ${esc(message)}
      </div>

    </div>


    <button
      type="button"
      class="notification-close"
      aria-label="Close notification"
    >

      <i class="fa-solid fa-xmark"></i>

    </button>

  `;


  container.appendChild(
    notification
  );


  const closeButton =
    notification.querySelector(
      ".notification-close"
    );


  /* =======================================================
     MANUAL CLOSE
  ======================================================= */

  closeButton.addEventListener(
    "click",
    () => {

      removeNotification(
        notification
      );

    }
  );


  /* =======================================================
     AUTO CLOSE AFTER 5 SECONDS
  ======================================================= */

  const autoDismiss =
    setTimeout(
      () => {

        removeNotification(
          notification
        );

      },
      5000
    );


  /* =======================================================
     CLEAR TIMER WHEN REMOVED
  ======================================================= */

  notification.addEventListener(
    "notification:remove",
    () => {

      clearTimeout(
        autoDismiss
      );

    },
    {
      once: true
    }
  );

}


/* =========================================================
   REMOVE NOTIFICATION
========================================================= */

function removeNotification(
  notification
) {

  if (!notification) return;


  /* Prevent duplicate removal */

  if (
    notification.classList.contains(
      "removing"
    )
  ) {

    return;

  }


  /* Tell the notification to clear
     its auto-dismiss timer */

  notification.dispatchEvent(
    new CustomEvent(
      "notification:remove"
    )
  );


  notification.classList.add(
    "removing"
  );


  setTimeout(
    () => {

      notification.remove();

    },
    200
  );

}


/* =========================================================
   REAL-TIME DATA REFRESH
========================================================= */

export function notifyDataChanged() {

  window.dispatchEvent(
    new CustomEvent(
      "qa:data-changed"
    )
  );

}