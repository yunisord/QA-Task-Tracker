import {
  members,
  tasks,
  saveData
} from "./storage.js";

import {
  $,
  esc,
  initials,
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
   RENDER MEMBERS
========================= */

export function renderMembers() {

  $("memberList").innerHTML =
    members
      .map(member => {

        const count =
          tasks.filter(
            task =>
              task.member === member
          ).length;


        return `

          <div class="listItem">

            <div class="info">

              <div class="avatar">
                ${initials(member)}
              </div>

              <div>

                <b>
                  ${esc(member)}
                </b>

                <div class="small">
                  ${count} task(s)
                </div>

              </div>

            </div>


            <div class="iconBtns">

              <button
                type="button"
                class="iconBtn edit-member"
                title="Edit"
                aria-label="Edit Member"
                data-name="${esc(member)}"
              >
                <i class="fa-solid fa-pen"></i>
              </button>


              <button
                type="button"
                class="iconBtn danger delete-member"
                title="Delete"
                aria-label="Delete Member"
                data-name="${esc(member)}"
              >
                <i class="fa-solid fa-trash"></i>
              </button>

            </div>

          </div>

        `;

      })
      .join("");


  setupMemberActions();

}


/* =========================
   MEMBER ACTIONS
========================= */

function setupMemberActions() {

  document
    .querySelectorAll(".edit-member")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          openMember(
            button.dataset.name
          );

        }
      );

    });


  document
    .querySelectorAll(".delete-member")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          deleteMember(
            button.dataset.name
          );

        }
      );

    });

}


/* =========================
   OPEN MEMBER MODAL
========================= */

export function openMember(
  oldName = null
) {

  openModal("memberModal");


  $("memberTitle")
    .textContent =
      oldName
        ? "Edit Member"
        : "Add Member";


  $("memberOld").value =
    oldName || "";


  $("memberName").value =
    oldName || "";

}


/* =========================
   MEMBER FORM
========================= */

export function setupMemberForm() {

  $("memberForm")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const oldName =
          $("memberOld").value;


        const newName =
          $("memberName")
            .value
            .trim();


        /*
         * Member name validation.
         */

        if (!newName) {

          await showCenterAlert(
            "Please enter a member name.",
            "Member Name Required"
          );

          return;
        }


        const duplicate =
          members.some(
            member =>
              member.toLowerCase() ===
                newName.toLowerCase() &&
              member !== oldName
          );


        /*
         * Duplicate member validation.
         */

        if (duplicate) {

          await showCenterAlert(
            "That member already exists.",
            "Duplicate Member"
          );

          return;
        }


        if (oldName) {

          const index =
            members.indexOf(oldName);


          if (index !== -1) {

            members[index] =
              newName;

          }


          /*
           * Update all existing tasks
           * assigned to the renamed member.
           */

          tasks.forEach(task => {

            if (
              task.member === oldName
            ) {

              task.member =
                newName;

            }

          });

        } else {

          members.push(newName);

        }


        saveData();


        closeModal("memberModal");


        /*
         * Refresh all dependent views
         * immediately.
         */

        notifyDataChanged();


        renderMembers();


        showNotification(
          oldName
            ? "Member changes have been saved."
            : "New member has been added.",
          "success",
          oldName
            ? "Member updated"
            : "Member added"
        );

      }
    );

}


/* =========================
   DELETE MEMBER
========================= */

export async function deleteMember(
  name
) {

  /*
   * Use the centered confirmation
   * modal instead of browser confirm().
   */

  const confirmed =
    await showCenterConfirm(
      `Delete ${name}? Their assigned tasks will also be deleted.`,
      "Delete Member"
    );


  if (!confirmed) {
    return;
  }


  const memberIndex =
    members.indexOf(name);


  if (memberIndex !== -1) {
    members.splice(
      memberIndex,
      1
    );
  }


  /*
   * Remove all tasks assigned
   * to the deleted member.
   */

  for (
    let index = tasks.length - 1;
    index >= 0;
    index--
  ) {

    if (
      tasks[index].member === name
    ) {

      tasks.splice(index, 1);

    }

  }


  saveData();


  /*
   * Refresh all dependent views
   * immediately.
   */

  notifyDataChanged();


  renderMembers();


  showNotification(
    `"${name}" has been deleted.`,
    "success",
    "Member deleted"
  );

}

