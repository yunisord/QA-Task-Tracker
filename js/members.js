import {
  members,
  tasks,
  saveData
} from "./storage.js";

import {
  $,
  esc,
  initials
} from "./utils.js";

import {
  openModal,
  closeModal
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
                class="iconBtn edit-member"
                title="Edit"
                data-name="${esc(member)}"
              >
                ✎
              </button>


              <button
                class="iconBtn danger delete-member"
                title="Delete"
                data-name="${esc(member)}"
              >
                ×
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
      event => {

        event.preventDefault();


        const oldName =
          $("memberOld").value;


        const newName =
          $("memberName")
            .value
            .trim();


        if (!newName) {
          return;
        }


        const duplicate =
          members.some(
            member =>
              member.toLowerCase() ===
                newName.toLowerCase() &&
              member !== oldName
          );


        if (duplicate) {

          alert(
            "That member already exists."
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

        renderMembers();

      }
    );

}


/* =========================
   DELETE MEMBER
========================= */

export function deleteMember(
  name
) {

  const confirmed =
    confirm(
      `Delete ${name}? Their assigned tasks will also be deleted.`
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

  renderMembers();

}