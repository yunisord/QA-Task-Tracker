import { $ } from "./utils.js";


import {

  setupModalEvents

} from "./modals.js";


import {

  setupNavigation

} from "./navigation.js";


import {

  openTask,

  setupTaskForm,

  setupGameSuggestions,

  renderTasks

} from "./tasks.js";


import {

  openMember,

  setupMemberForm,

  renderMembers

} from "./members.js";


import {

  openGame,

  setupGameForm,

  renderGames

} from "./games.js";


import {

  renderDashboard

} from "./dashboard.js";


/* =========================
   BUG TRACKER
========================= */

import {

  initBugTracker

} from "./bugTracker.js";


/* =========================
   EVENT SETUP
========================= */

function setupEvents() {


  /* Navigation */

  setupNavigation();


  /* Modals */

  setupModalEvents();


  /* Task */

  setupTaskForm();

  setupGameSuggestions();


  /* Member */

  setupMemberForm();


  /* Game */

  setupGameForm();


  /* Bug Tracker */

  initBugTracker();


  /* Add Task */

  $("addTask")

    .addEventListener(

      "click",

      () => {

        openTask();

      }

    );


  /* Add Member */

  $("addMember")

    .addEventListener(

      "click",

      () => {

        openMember();

      }

    );


  /* Add Game */

  $("addGame")

    .addEventListener(

      "click",

      () => {

        openGame();

      }

    );


  /* Dashboard Search */

  $("dashSearch")

    .addEventListener(

      "input",

      renderDashboard

    );


  /* Dashboard Status */

  $("dashStatus")

    .addEventListener(

      "change",

      renderDashboard

    );


  /* Task Search */

  $("taskSearch")

    .addEventListener(

      "input",

      renderTasks

    );


  /* Task Status */

  $("taskStatus")

    .addEventListener(

      "change",

      renderTasks

    );

}


/* =========================
   INITIALIZE APPLICATION
========================= */

function initialize() {


  setupEvents();


  renderDashboard();

  renderTasks();

  renderMembers();

  renderGames();


}


/* =========================
   START APP
========================= */

initialize();