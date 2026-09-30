import {
  DEFAULT_MEMBERS,
  DEFAULT_GAMES,
  STORAGE_KEYS
} from "./data.js";


export let members =
  JSON.parse(
    localStorage.getItem(
      STORAGE_KEYS.members
    )
  ) || [...DEFAULT_MEMBERS];


export let games =
  JSON.parse(
    localStorage.getItem(
      STORAGE_KEYS.games
    )
  ) || structuredClone(DEFAULT_GAMES);


export let tasks =
  JSON.parse(
    localStorage.getItem(
      STORAGE_KEYS.tasks
    )
  ) || [];


export function saveData() {

  localStorage.setItem(
    STORAGE_KEYS.members,
    JSON.stringify(members)
  );

  localStorage.setItem(
    STORAGE_KEYS.games,
    JSON.stringify(games)
  );

  localStorage.setItem(
    STORAGE_KEYS.tasks,
    JSON.stringify(tasks)
  );

}


export function setMembers(value) {
  members = value;
}


export function setGames(value) {
  games = value;
}


export function setTasks(value) {
  tasks = value;
}