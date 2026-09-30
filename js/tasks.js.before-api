import {
  members,
  games,
  tasks,
  saveData
} from "./storage.js";

import {
  $,
  esc,
  flatGames,
  badge,
  showNotification,
  notifyDataChanged
} from "./utils.js";

import {
  openModal,
  closeModal,
  showCenterAlert,
  showCenterConfirm
} from "./modals.js";


/* =========================
   RENDER TASKS
========================= */

export function renderTasks() {

  const query =
    $("taskSearch")
      .value
      .trim()
      .toLowerCase();

  const status =
    $("taskStatus").value;


  const filteredTasks =
    tasks.filter(task => {

      const text = [
        task.task,
        task.member,
        task.game,
        task.ticket,
        task.remarks
      ]
        .join(" ")
        .toLowerCase();


      return (
        (!query ||
          text.includes(query)) &&

        (!status ||
          task.status === status)
      );

    });


  $("rows").innerHTML =
    filteredTasks
      .map(task => `

        <tr>

          <td>

            <b>
              ${esc(task.task)}
            </b>

            <br>

            <span class="small">
              ${esc(task.remarks || "")}
            </span>

          </td>

          <td>
            ${esc(task.member)}
          </td>

          <td>
            ${esc(task.game)}
          </td>

          <td>

            ${
              task.ticket
                ? `
                  <a
                    href="${esc(task.ticket)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="task-ticket-link"
                    title="Open ticket"
                  >
                    ${esc(task.ticket)}
                  </a>
                `
                : "—"
            }

          </td>

          <td>
            ${badge(task.status)}
          </td>

          <td>
            ${esc(task.start || "—")}
          </td>

          <td>
            ${esc(task.due || "—")}
          </td>

          <td>

            <div class="iconBtns">

              <button
                type="button"
                class="iconBtn edit-task"
                data-id="${esc(task.id)}"
                title="Edit"
                aria-label="Edit Task"
              >
                <i class="fa-solid fa-pen"></i>
              </button>

              <button
                type="button"
                class="iconBtn danger delete-task"
                data-id="${esc(task.id)}"
                title="Delete"
                aria-label="Delete Task"
              >
                <i class="fa-solid fa-trash"></i>
              </button>

            </div>

          </td>

        </tr>

      `)
      .join("") ||

    `
      <tr>

        <td
          colspan="8"
          class="small"
        >
          No tasks found.
        </td>

      </tr>
    `;


  setupTaskActions();

}


/* =========================
   TASK ACTIONS
========================= */

function setupTaskActions() {

  document
    .querySelectorAll(".edit-task")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {
          editTask(
            button.dataset.id
          );
        }
      );

    });


  document
    .querySelectorAll(".delete-task")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {
          deleteTask(
            button.dataset.id
          );
        }
      );

    });

}


/* =========================
   OPEN TASK MODAL
========================= */

export function openTask(
  task = null,
  selectedMember = null
) {

  openModal("taskModal");


  $("taskModalTitle")
    .textContent =
      task
        ? "Edit Task"
        : "Add Task";


  $("taskId").value =
    task?.id || "";


  $("memberField").innerHTML =
    members
      .map(member => `
        <option value="${esc(member)}">
          ${esc(member)}
        </option>
      `)
      .join("");


  /*
   * Existing task member takes
   * priority when editing.
   *
   * When Dashboard opens
   * "Add Task" for a specific
   * member, selectedMember is used.
   */

  $("memberField").value =
    task?.member ||
    selectedMember ||
    members[0] ||
    "";


  /*
   * Lock the member field when
   * adding from a member card.
   *
   * Editing an existing task
   * keeps the field editable.
   */

  $("memberField").disabled =
    !task && !!selectedMember;


  $("taskField").value =
    task?.task || "";


  $("gameField").value =
    task?.game || "";


  $("startField").value =
    task?.start ||
    new Date()
      .toISOString()
      .slice(0, 10);


  $("dueField").value =
    task?.due || "";


  $("ticketField").value =
    task?.ticket || "";


  $("statusField").value =
    task?.status ||
    "To Do";


  $("remarksField").value =
    task?.remarks || "";


  showGameSuggestions();

}


/* =========================
   EDIT TASK
========================= */

export function editTask(id) {

  const task =
    tasks.find(
      item => item.id === id
    );


  if (task) {
    openTask(task);
  }

}


/* =========================
   DELETE TASK
========================= */

export async function deleteTask(id) {

  const task =
    tasks.find(
      item => item.id === id
    );


  if (!task) {
    return;
  }


  /*
   * Use the centered confirmation
   * modal instead of browser confirm().
   */

  const confirmed =
    await showCenterConfirm(
      `Delete "${task.task}"?`,
      "Delete Task"
    );


  if (!confirmed) {
    return;
  }


  const index =
    tasks.findIndex(
      item => item.id === id
    );


  if (index !== -1) {
    tasks.splice(index, 1);
  }


  saveData();


  /*
   * Refresh all dependent views
   * immediately.
   */

  notifyDataChanged();


  renderTasks();


  showNotification(
    `"${task.task}" has been deleted.`,
    "success",
    "Task deleted"
  );

}


/* =========================
   TASK FORM
========================= */

export function setupTaskForm() {

  $("taskForm")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const existingId =
          $("taskId").value;


        const isEditing =
          Boolean(existingId);


        const id =
          existingId ||
          Date.now().toString();


        const task = {

          id,

          member:
            $("memberField").value,

          task:
            $("taskField")
              .value
              .trim(),

          game:
            $("gameField")
              .value
              .trim(),

          start:
            $("startField").value,

          due:
            $("dueField").value,

          ticket:
            $("ticketField")
              .value
              .trim(),

          status:
            $("statusField").value,

          remarks:
            $("remarksField")
              .value
              .trim(),

          updated:
            new Date()
              .toISOString()

        };


        /*
         * Task name validation.
         */

        if (!task.task) {

          await showCenterAlert(
            "Please enter a task name.",
            "Invalid Task"
          );

          return;
        }


        /*
         * Member validation.
         */

        if (!task.member) {

          await showCenterAlert(
            "Please select a member.",
            "Invalid Member"
          );

          return;
        }


        const validGame =
          flatGames(games)
            .some(
              game =>
                game.name
                  .toLowerCase() ===
                task.game
                  .toLowerCase()
            );


        if (!validGame) {

          await showCenterAlert(
            "Please select a game from the game list.",
            "Invalid Game"
          );

          return;
        }


        const index =
          tasks.findIndex(
            item => item.id === id
          );


        if (index === -1) {

          tasks.push(task);

        } else {

          tasks[index] = task;

        }


        saveData();


        closeModal("taskModal");


        /*
         * Refresh Dashboard,
         * Tasks, Members and Games
         * immediately.
         */

        notifyDataChanged();


        renderTasks();


        showNotification(
          isEditing
            ? "Task changes have been saved."
            : "New task has been added.",
          "success",
          isEditing
            ? "Task updated"
            : "Task added"
        );

      }
    );

}


/* =========================
   GAME SUGGESTIONS
========================= */

function showGameSuggestions() {

  const query =
    $("gameField")
      .value
      .trim()
      .toLowerCase();


  const matches =
    flatGames(games)
      .filter(game =>
        game.name
          .toLowerCase()
          .includes(query)
      );


  $("gameSuggestions").innerHTML =
    matches
      .map(game => `

        <div
          class="suggestion"
          data-name="${esc(game.name)}"
        >

          <span>
            ${esc(game.name)}
          </span>

          <span class="pill">
            ${esc(
              game.category
                .replace(" Games", "")
            )}
          </span>

        </div>

      `)
      .join("") ||

    `
      <div class="suggestion">
        <span>
          No matching games
        </span>
      </div>
    `;


  $("gameSuggestions")
    .classList
    .remove("hidden");


  document
    .querySelectorAll(
      ".suggestion[data-name]"
    )
    .forEach(item => {

      item.addEventListener(
        "click",
        () => {

          $("gameField").value =
            item.dataset.name;

          $("gameSuggestions")
            .classList
            .add("hidden");

        }
      );

    });

}


/* =========================
   GAME SEARCH EVENTS
========================= */

export function setupGameSuggestions() {

  $("gameField")
    .addEventListener(
      "input",
      showGameSuggestions
    );


  $("gameField")
    .addEventListener(
      "focus",
      showGameSuggestions
    );


  document.addEventListener(
    "click",
    event => {

      if (
        !event.target
          .closest(".gamePicker")
      ) {

        $("gameSuggestions")
          .classList
          .add("hidden");

      }

    }
  );

}

