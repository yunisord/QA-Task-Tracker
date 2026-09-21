import {
  games,
  tasks,
  saveData
} from "./storage.js";

import {
  $,
  esc,
  flatGames,
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
   RENDER GAMES
========================= */

export function renderGames() {

  let html = "";


  for (
    const [category, gameList]
    of Object.entries(games)
  ) {

    html += `

      <div class="gameGroup">

        ${esc(category)}
        ·
        ${gameList.length}

      </div>

      <div class="list">

    `;


    html +=
      gameList
        .map(game => `

          <div class="listItem">

            <div>
              <b>
                ${esc(game)}
              </b>
            </div>


            <div class="iconBtns">

              <button
                type="button"
                class="iconBtn edit-game"
                title="Edit"
                aria-label="Edit Game"
                data-name="${esc(game)}"
              >
                <i class="fa-solid fa-pen"></i>
              </button>


              <button
                type="button"
                class="iconBtn danger delete-game"
                title="Delete"
                aria-label="Delete Game"
                data-name="${esc(game)}"
              >
                <i class="fa-solid fa-trash"></i>
              </button>

            </div>

          </div>

        `)
        .join("");


    html += `
      </div>
    `;

  }


  $("gameList").innerHTML =
    html;


  setupGameActions();

}


/* =========================
   GAME ACTIONS
========================= */

function setupGameActions() {

  document
    .querySelectorAll(".edit-game")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          openGame(
            button.dataset.name
          );

        }
      );

    });


  document
    .querySelectorAll(".delete-game")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          deleteGame(
            button.dataset.name
          );

        }
      );

    });

}


/* =========================
   OPEN GAME MODAL
========================= */

export function openGame(
  oldName = null
) {

  openModal("gameModal");


  $("gameTitle")
    .textContent =
      oldName
        ? "Edit Game"
        : "Add Game";


  $("gameOld").value =
    oldName || "";


  $("gameName").value =
    oldName || "";


  const category =
    Object.keys(games)
      .find(
        category =>
          games[category]
            .includes(oldName)
      );


  $("gameCategory").value =
    category ||
    "Bingo Games";

}


/* =========================
   GAME FORM
========================= */

export function setupGameForm() {

  $("gameForm")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const oldName =
          $("gameOld").value;


        const newName =
          $("gameName")
            .value
            .trim();


        const category =
          $("gameCategory").value;


        /*
         * Game name validation.
         */

        if (!newName) {

          await showCenterAlert(
            "Please enter a game name.",
            "Game Name Required"
          );

          return;
        }


        /*
         * Duplicate validation.
         */

        const duplicate =
          flatGames(games)
            .find(
              game =>
                game.name
                  .toLowerCase() ===
                newName
                  .toLowerCase()
            );


        if (
          duplicate &&
          duplicate.name !== oldName
        ) {

          await showCenterAlert(
            "That game already exists.",
            "Duplicate Game"
          );

          return;
        }


        if (oldName) {

          const oldCategory =
            Object.keys(games)
              .find(
                category =>
                  games[category]
                    .includes(oldName)
              );


          if (oldCategory) {

            games[oldCategory] =
              games[oldCategory]
                .filter(
                  game =>
                    game !== oldName
                );

          }


          games[category]
            .push(newName);


          tasks.forEach(task => {

            if (
              task.game === oldName
            ) {

              task.game =
                newName;

            }

          });

        } else {

          games[category]
            .push(newName);

        }


        saveData();


        closeModal("gameModal");


        /*
         * Refresh Dashboard,
         * Tasks, Members and Games
         * immediately.
         */

        notifyDataChanged();


        renderGames();


        showNotification(
          oldName
            ? "Game changes have been saved."
            : "New game has been added.",
          "success",
          oldName
            ? "Game updated"
            : "Game added"
        );

      }
    );

}


/* =========================
   DELETE GAME
========================= */

export async function deleteGame(
  name
) {

  /*
   * Use the centered confirmation
   * modal instead of browser confirm().
   */

  const confirmed =
    await showCenterConfirm(
      `Delete ${name}? Tasks using this game will also be deleted.`,
      "Delete Game"
    );


  if (!confirmed) {
    return;
  }


  const category =
    Object.keys(games)
      .find(
        category =>
          games[category]
            .includes(name)
      );


  if (category) {

    games[category] =
      games[category]
        .filter(
          game => game !== name
        );

  }


  for (
    let index = tasks.length - 1;
    index >= 0;
    index--
  ) {

    if (
      tasks[index].game === name
    ) {

      tasks.splice(index, 1);

    }

  }


  saveData();


  /*
   * Refresh all dependent
   * views immediately.
   */

  notifyDataChanged();


  renderGames();


  showNotification(
    `"${name}" has been deleted.`,
    "success",
    "Game deleted"
  );

}