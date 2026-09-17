import {
  members,
  tasks
} from "./storage.js";

import {
  $,
  esc,
  initials,
  badge
} from "./utils.js";

import {
  editTask,
  deleteTask,
  openTask
} from "./tasks.js";


/* =========================
   DASHBOARD
========================= */

export function renderDashboard() {

  updateStatistics();

  renderTeamCards();

}


/* =========================
   STATISTICS
========================= */

function updateStatistics() {

  $("sMembers").textContent =
    members.length;


  $("sActive").textContent =
    tasks.filter(
      task =>
        task.status !== "Done"
    ).length;


  $("sBlocked").textContent =
    tasks.filter(
      task =>
        task.status === "Blocked"
    ).length;


  $("sDone").textContent =
    tasks.filter(
      task =>
        task.status === "Done"
    ).length;

}


/* =========================
   TEAM CARDS
========================= */

function renderTeamCards() {

  const query =
    $("dashSearch")
      .value
      .trim()
      .toLowerCase();


  const status =
    $("dashStatus").value;


  const html =
    members
      .map(member => {

        /*
         * Get ALL active tasks
         * assigned to this member.
         */
        const memberTasks =
          tasks.filter(task =>
            task.member === member &&
            task.status !== "Done"
          );


        /*
         * Search through the member
         * and ALL of their tasks.
         */
        let matches =
          !query ||
          member.toLowerCase().includes(query) ||
          memberTasks.some(task =>
            [
              task.task,
              task.game,
              task.ticket,
              task.remarks,
              task.status
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(query)
          );


        /*
         * Status filter.
         *
         * A member is displayed if
         * at least one of their active
         * tasks matches the selected status.
         */
        if (status) {

          const hasMatchingStatus =
            memberTasks.some(
              task =>
                task.status === status
            );


          if (!hasMatchingStatus) {
            matches = false;
          }

        }


        if (!matches) {
          return "";
        }


        return `

          <div class="person">

            <!-- MEMBER HEADER -->

            <div class="personHead">

              <div class="personName">

                <div class="avatar">
                  ${initials(member)}
                </div>

                ${esc(member)}

              </div>


              <span class="taskCount">
                ${memberTasks.length}
                ${
                  memberTasks.length === 1
                    ? "Active Task"
                    : "Active Tasks"
                }
              </span>

            </div>


            <!-- ACTIVE TASKS -->

            <div class="memberTasks">

              ${
                memberTasks.length > 0

                  ? memberTasks
                      .map(task => `

                        <div class="task">

                          <div class="taskHeader">

                            <b>
                              ${esc(task.task)}
                            </b>

                            ${badge(task.status)}

                          </div>


                          <div class="meta">

                            ◈
                            ${esc(
                              task.game ||
                              "No game"
                            )}

                            <br>

                            ♧
                            ${esc(
                              task.ticket ||
                              "No ticket"
                            )}

                            <br>

                            ▣ Started
                            ${esc(
                              task.start ||
                              "No start date"
                            )}

                            ${
                              task.due
                                ? `
                                  <br>

                                  ▣ Due
                                  ${esc(task.due)}
                                `
                                : ""
                            }

                          </div>


                          ${
                            task.remarks
                              ? `
                                <div class="taskRemarks">
                                  ${esc(task.remarks)}
                                </div>
                              `
                              : ""
                          }


                          <div class="taskActions">

                           <button
    type="button"
    class="dashboard-icon edit"
    data-id="${esc(task.id)}"
    title="Edit Task"
  >
    ✎
  </button>

  <button
    type="button"
    class="dashboard-icon delete"
    data-id="${esc(task.id)}"
    title="Delete Task"
  >
    🗑
  </button>

                          </div>

                        </div>

                      `)
                      .join("")

                  : `

                      <div class="task">

                        <div class="empty">
                          No active task assigned.
                        </div>

                      </div>

                    `
              }

            </div>


            <!-- ADD TASK -->

            <button
              type="button"
              class="addMemberTask"
              data-member="${esc(member)}"
            >
              + Add Task
            </button>

          </div>

        `;

      })
      .join("");


  $("teamCards").innerHTML =
    html ||

    `
      <div class="empty">
        No matching members.
      </div>
    `;


  setupDashboardActions();

}


/* =========================
   DASHBOARD ACTIONS
========================= */

function setupDashboardActions() {


  /*
   * EDIT TASK
   */

  document
    .querySelectorAll(
      ".dashboard-icon.edit"
    )
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


  /*
   * DELETE TASK
   */

  document
    .querySelectorAll(
      ".dashboard-icon.delete"
    )
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


  /*
   * ADD TASK FOR MEMBER
   */

  document
    .querySelectorAll(
      ".addMemberTask"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const member =
            button.dataset.member;


          /*
           * Open a new task
           * and automatically
           * select this member.
           */

          openTask(
            null,
            member
          );

        }
      );

    });

}