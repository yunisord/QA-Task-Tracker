import { $ } from "./utils.js";

import {
  renderDashboard
} from "./dashboard.js";

import {
  renderTasks
} from "./tasks.js";

import {
  renderMembers
} from "./members.js";

import {
  renderGames
} from "./games.js";

import {
  renderBugTable
} from "./bugTracker.js";


/* =========================================================
   CURRENT VIEW
========================================================= */

export let currentView =
  "dashboard";


/* =========================================================
   PAGE TITLES
========================================================= */

const PAGE_TITLES = {

  dashboard:
    "QA Dashboard",

  tasks:
    "All Tasks",

  bugs:
    "Bug Tracker",

  team:
    "QA Members",

  games:
    "Game Library"

};


/* =========================================================
   PAGE SUBTITLES
========================================================= */

const SUBTITLES = {

  dashboard:
    "Track what each QA member is currently working on.",

  tasks:
    "Create, update, and delete QA tasks.",

  bugs:
    "Track and manage bugs across all QA games.",

  team:
    "Manage the QA members in your workspace.",

  games:
    "Manage the games available for task assignment."

};


/* =========================================================
   AVAILABLE VIEWS
========================================================= */

const VIEWS = [
  "dashboard",
  "tasks",
  "bugs",
  "team",
  "games"
];


/* =========================================================
   SET VIEW
========================================================= */

export function setView(view) {

  /* -------------------------
     Validate View
  ------------------------- */

  if (!VIEWS.includes(view)) {
    view = "dashboard";
  }


  /* -------------------------
     Save Current View
  ------------------------- */

  currentView = view;


  /* -------------------------
     Show / Hide Sections
  ------------------------- */

  VIEWS.forEach(section => {

    const element = $(section);

    if (!element) {
      return;
    }

    element.classList.toggle(
      "hidden",
      section !== view
    );

  });


  /* -------------------------
     Update Navigation
  ------------------------- */

  document
    .querySelectorAll(".nav button")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.view === view
      );

    });


  /* -------------------------
     Add Task Button
  ------------------------- */

  const addTask =
    $("addTask");

  if (addTask) {

    addTask.classList.toggle(
      "hidden",
      view !== "dashboard" &&
      view !== "tasks"
    );

  }


  /* -------------------------
     Update Page Title / Subtitle
  ------------------------- */

  const titleContainer =
    document.querySelector(".title");

  const showPageHeader =
    view === "dashboard" ||
    view === "tasks";

  if (titleContainer) {

    titleContainer.classList.toggle(
      "hidden",
      !showPageHeader
    );

  }

  const pageTitle =
    $("pageTitle");

  if (pageTitle) {

    pageTitle.textContent =
      PAGE_TITLES[view] ||
      "";

  }


  const subtitle =
    $("subtitle");

  if (subtitle) {

    subtitle.textContent =
      SUBTITLES[view] ||
      "";

  }


  /* -------------------------
     Render View
  ------------------------- */

  renderCurrentView();

}


/* =========================================================
   RENDER CURRENT VIEW
========================================================= */

export function renderCurrentView() {

  switch (currentView) {

    /* -------------------------
       Dashboard
    ------------------------- */

    case "dashboard":

      renderDashboard();

      break;


    /* -------------------------
       Tasks
    ------------------------- */

    case "tasks":

      renderTasks();

      break;


    /* -------------------------
       Bug Tracker
    ------------------------- */

    case "bugs":

      renderBugTable();

      break;


    /* -------------------------
       Members
    ------------------------- */

    case "team":

      renderMembers();

      break;


    /* -------------------------
       Games
    ------------------------- */

    case "games":

      renderGames();

      break;


    /* -------------------------
       Fallback
    ------------------------- */

    default:

      setView("dashboard");

      break;

  }

}


/* =========================================================
   NAVIGATION EVENTS
========================================================= */

export function setupNavigation() {

  document
    .querySelectorAll(".nav button")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const view =
            button.dataset.view;

          if (!view) {
            return;
          }

          setView(view);

        }
      );

    });


  /* -------------------------
     Initial View
  ------------------------- */

  setView(currentView);

}