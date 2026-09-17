import { $ } from "./utils.js";


export function openModal(id) {

  $(id).classList.add("show");

}


export function closeModal(id) {

  $(id).classList.remove("show");

}


export function setupModalEvents() {

  document
    .querySelectorAll(".modal")
    .forEach(modal => {

      modal.addEventListener(
        "click",
        event => {

          if (
            event.target === modal
          ) {
            modal.classList.remove(
              "show"
            );
          }

        }
      );

    });


  $("cancelTask")
    .addEventListener(
      "click",
      () => closeModal("taskModal")
    );


  $("cancelMember")
    .addEventListener(
      "click",
      () => closeModal("memberModal")
    );


  $("cancelGame")
    .addEventListener(
      "click",
      () => closeModal("gameModal")
    );

}