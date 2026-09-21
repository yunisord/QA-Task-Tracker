import {
  $,
  esc
} from "./utils.js";


/* =========================
   OPEN MODAL
========================= */

export function openModal(id) {

  const modal = $(id);

  if (!modal) {
    return;
  }

  modal.classList.add("show");

}


/* =========================
   CLOSE MODAL
========================= */

export function closeModal(id) {

  const modal = $(id);

  if (!modal) {
    return;
  }

  modal.classList.remove("show");

}


/* =========================
   CENTER ALERT
========================= */

export function showCenterAlert(
  message,
  title = "Notice"
) {

  return new Promise(resolve => {

    const overlay =
      document.createElement("div");


    overlay.className =
      "centerPromptOverlay";


    overlay.innerHTML = `

      <div
        class="centerPrompt"
        role="alertdialog"
        aria-modal="true"
      >

        <div class="centerPromptHeader">

          <div class="centerPromptIcon alert">

            <i class="fa-solid fa-circle-exclamation"></i>

          </div>


          <div class="centerPromptTitle">

            ${esc(title)}

          </div>


          <button
            type="button"
            class="centerPromptClose"
            aria-label="Close"
          >

            <i class="fa-solid fa-xmark"></i>

          </button>

        </div>


        <div class="centerPromptBody">

          ${esc(message)}

        </div>


        <div class="centerPromptActions">

          <button
            type="button"
            class="centerPromptConfirm"
          >

            OK

          </button>

        </div>

      </div>

    `;


    document.body.appendChild(
      overlay
    );


    let finished = false;


    const close = () => {

      if (finished) {
        return;
      }

      finished = true;

      overlay.remove();

      resolve();

    };


    overlay
      .querySelector(
        ".centerPromptConfirm"
      )
      .addEventListener(
        "click",
        close
      );


    overlay
      .querySelector(
        ".centerPromptClose"
      )
      .addEventListener(
        "click",
        close
      );


    overlay.addEventListener(
      "click",
      event => {

        if (
          event.target === overlay
        ) {

          close();

        }

      }
    );


    const handleKeydown = event => {

      if (
        event.key === "Escape"
      ) {

        document.removeEventListener(
          "keydown",
          handleKeydown
        );

        close();

      }

    };


    document.addEventListener(
      "keydown",
      handleKeydown
    );

  });

}


/* =========================
   CENTER CONFIRM
========================= */

export function showCenterConfirm(
  message,
  title = "Confirm Action",
  confirmText = "Delete"
) {

  return new Promise(resolve => {

    const overlay =
      document.createElement("div");


    overlay.className =
      "centerPromptOverlay";


    overlay.innerHTML = `

      <div
        class="centerPrompt"
        role="dialog"
        aria-modal="true"
      >

        <div class="centerPromptHeader">

          <div class="centerPromptIcon danger">

            <i class="fa-solid fa-triangle-exclamation"></i>

          </div>


          <div class="centerPromptTitle">

            ${esc(title)}

          </div>


          <button
            type="button"
            class="centerPromptClose"
            aria-label="Close"
          >

            <i class="fa-solid fa-xmark"></i>

          </button>

        </div>


        <div class="centerPromptBody">

          ${esc(message)}

        </div>


        <div class="centerPromptActions">

          <button
            type="button"
            class="centerPromptCancel"
          >

            Cancel

          </button>


          <button
            type="button"
            class="centerPromptConfirm danger"
          >

            ${esc(confirmText)}

          </button>

        </div>

      </div>

    `;


    document.body.appendChild(
      overlay
    );


    let finished = false;


    const finish = result => {

      if (finished) {
        return;
      }

      finished = true;

      overlay.remove();

      resolve(result);

    };


    overlay
      .querySelector(
        ".centerPromptCancel"
      )
      .addEventListener(
        "click",
        () => finish(false)
      );


    overlay
      .querySelector(
        ".centerPromptConfirm"
      )
      .addEventListener(
        "click",
        () => finish(true)
      );


    overlay
      .querySelector(
        ".centerPromptClose"
      )
      .addEventListener(
        "click",
        () => finish(false)
      );


    overlay.addEventListener(
      "click",
      event => {

        if (
          event.target === overlay
        ) {

          finish(false);

        }

      }
    );


    const handleKeydown = event => {

      if (
        event.key === "Escape"
      ) {

        document.removeEventListener(
          "keydown",
          handleKeydown
        );

        finish(false);

      }

    };


    document.addEventListener(
      "keydown",
      handleKeydown
    );

  });

}


/* =========================
   EXISTING MODAL EVENTS
========================= */

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


  const cancelTask =
    $("cancelTask");

  if (cancelTask) {

    cancelTask.addEventListener(
      "click",
      () =>
        closeModal("taskModal")
    );

  }


  const cancelMember =
    $("cancelMember");

  if (cancelMember) {

    cancelMember.addEventListener(
      "click",
      () =>
        closeModal("memberModal")
    );

  }


  const cancelGame =
    $("cancelGame");

  if (cancelGame) {

    cancelGame.addEventListener(
      "click",
      () =>
        closeModal("gameModal")
    );

  }

}