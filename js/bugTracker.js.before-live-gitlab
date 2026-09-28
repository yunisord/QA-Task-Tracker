import {
  games
} from "./storage.js";

import {
  $,
  flatGames,
  showNotification
} from "./utils.js";

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


let bugs = [];
let filteredBugs = [];

let currentPage = 1;
let pageSize = 10;

const STORAGE_KEY = "qa_bug_tracker";


/* =========================================================
   HELPERS
========================================================= */

function normalize(value) {

  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

}


function normalizeKey(value) {

  return normalize(value)
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

}


/* =========================================================
   NORMALIZE IMPORT HEADER
========================================================= */

function normalizeHeader(value) {

  return normalize(value)
    .toLowerCase()
    .replace(/[\s_\-./\\]+/g, "");

}


/* =========================================================
   CHECK URL
========================================================= */

function isUrl(value) {

  const text =
    normalize(value);

  return (
    /^https?:\/\//i.test(text) ||
    /^www\./i.test(text)
  );

}


/* =========================================================
   REAL-TIME UI REFRESH
========================================================= */

function refreshAllViews() {

  if ($("dashboard")) {
    renderDashboard();
  }

  if ($("tasks")) {
    renderTasks();
  }

  if ($("team")) {
    renderMembers();
  }

  if ($("games")) {
    renderGames();
  }

  renderBugTracker();

}


/* =========================================================
   CENTER MODAL
========================================================= */

function showCenterModal({
  title = "Confirmation",
  message = "",
  type = "confirm",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm = null
} = {}) {

  const existing =
    document.getElementById(
      "centerActionModal"
    );

  if (existing) {
    existing.remove();
  }


  const iconMap = {

    confirm:
      "fa-triangle-exclamation",

    warning:
      "fa-triangle-exclamation",

    error:
      "fa-circle-xmark",

    info:
      "fa-circle-info"

  };


  const modal =
    document.createElement("div");


  modal.id =
    "centerActionModal";


  modal.className =
    "modal center-action-modal show";


  modal.innerHTML = `

    <div
      class="modalCard center-action-card"
    >

      <div
        class="center-action-icon ${escapeHTML(
          type
        )}"
      >

        <i class="fa-solid ${
          iconMap[type] ||
          iconMap.confirm
        }"></i>

      </div>


      <h3>
        ${escapeHTML(title)}
      </h3>


      <p class="center-action-message">
        ${escapeHTML(message)}
      </p>


      <div class="modalActions">

        <button
          type="button"
          class="btn"
          data-center-cancel
        >
          ${escapeHTML(cancelText)}
        </button>


        ${
          type === "info"
            ? ""
            : `
              <button
                type="button"
                class="btn danger"
                data-center-confirm
              >
                ${escapeHTML(confirmText)}
              </button>
            `
        }

      </div>

    </div>

  `;


  document.body.appendChild(
    modal
  );


  const close = () => {

    modal.classList.remove(
      "show"
    );

    setTimeout(
      () => modal.remove(),
      150
    );

  };


  modal
    .querySelector(
      "[data-center-cancel]"
    )
    ?.addEventListener(
      "click",
      close
    );


  modal
    .querySelector(
      "[data-center-confirm]"
    )
    ?.addEventListener(
      "click",
      () => {

        close();

        if (
          typeof onConfirm ===
          "function"
        ) {

          onConfirm();

        }

      }
    );


  modal.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        modal
      ) {

        close();

      }

    }
  );

}


/* =========================================================
   EXTRACT TICKET ID
========================================================= */

function extractTicketId(value) {

  const raw =
    normalize(value);

  if (!raw) {
    return "";
  }


  /*
    Supported examples:

    468
    #468
    BUG-468

    https://gitlab.example.com/issues/468
    https://example.com/ticket/468
  */


  let cleaned =
    raw.replace(
      /^#/,
      ""
    );


  if (
    isUrl(cleaned)
  ) {

    try {

      const url =
        new URL(
          cleaned.startsWith("www.")
            ? `https://${cleaned}`
            : cleaned
        );


      const segments =
        url.pathname
          .split("/")
          .filter(Boolean);


      if (
        segments.length > 0
      ) {

        const lastSegment =
          normalize(
            segments[
              segments.length - 1
            ]
          ).replace(
            /^#/,
            ""
          );


        /*
          Handles:
          /issues/468
          /issues/468/
          /issues/468?foo=bar
        */

        const numeric =
          lastSegment.match(
            /^(\d+)$/
          );

        if (numeric) {
          return numeric[1];
        }


        /*
          Handles:
          BUG-468
          BUG_468
          Ticket-468
        */

        const issueNumber =
          lastSegment.match(
            /(\d+)$/
          );

        if (issueNumber) {
          return issueNumber[1];
        }


        return lastSegment;

      }

    } catch (error) {

      /*
        Fall back to string parsing
        if URL construction fails.
      */

    }

  }


  const hashMatch =
    cleaned.match(
      /#(\d+)\s*$/
    );

  if (hashMatch) {
    return hashMatch[1];
  }


  /*
    BUG-468
    BUG_468
    Ticket-468
  */

  const suffixNumberMatch =
    cleaned.match(
      /(?:^|[-_\s])(\d+)\s*$/
    );

  if (suffixNumberMatch) {
    return suffixNumberMatch[1];
  }


  const numericMatch =
    cleaned.match(
      /\/(\d+)\/?(?:[?#].*)?$/
    );

  if (numericMatch) {
    return numericMatch[1];
  }


  const lastPart =
    cleaned
      .split("/")
      .pop()
      ?.split("?")[0]
      ?.split("#")[0];


  return normalize(
    lastPart
  ).replace(
    /^#/,
    ""
  );

}


/* =========================================================
   GET TICKET ID
========================================================= */

function getTicketId(bug) {

  if (!bug) {
    return "";
  }


  if (
    bug.ticketId
  ) {

    return normalize(
      bug.ticketId
    ).replace(
      /^#/,
      ""
    );

  }


  if (
    bug.ticketUrl
  ) {

    const extractedId =
      extractTicketId(
        bug.ticketUrl
      );


    if (extractedId) {
      return extractedId;
    }

  }


  return normalize(
    bug["Ticket ID"] ||
    bug.ticket ||
    bug.id
  ).replace(
    /^#/,
    ""
  );

}


/* =========================================================
   FIND VALUE FROM IMPORTED ROW
========================================================= */

function getRowValue(
  row,
  aliases = []
) {

  const keys =
    Object.keys(
      row || {}
    );


  const normalizedAliases =
    aliases.map(
      alias =>
        normalizeHeader(
          alias
        )
    );


  const matchingKey =
    keys.find(
      key =>
        normalizedAliases.includes(
          normalizeHeader(
            key
          )
        )
    );


  if (
    matchingKey !==
    undefined
  ) {

    const value =
      row[matchingKey];


    if (
      value !==
      undefined &&
      value !==
      null
    ) {

      return value;

    }

  }


  return "";

}


/* =========================================================
   FIND GAME CATEGORY
========================================================= */

function getGameCategory(
  gameName
) {

  const name =
    normalize(
      gameName
    );


  if (!name) {
    return "";
  }


  const gameList =
    flatGames(
      games
    );


  const match =
    gameList.find(
      game =>
        normalizeKey(
          game.name
        ) ===
        normalizeKey(
          name
        )
    );


  return match?.category ||
    "";

}


/* =========================================================
   NORMALIZE BUG
========================================================= */

/*
  Canonical bug field order:

  1. Build
  2. Ticket URL
  3. Game
  4. Category
  5. Bug Title
  6. Priority
  7. Date Created
  8. Status
  9. Created By
  10. Validated By
  11. Remarks

  ticketId is kept internally at the end
  for duplicate detection and ticket actions.
*/

function normalizeBug(row) {

  if (!row) {
    return {};
  }


  /* =======================================================
     BUILD
  ======================================================= */

  const build =
    normalize(
      getRowValue(
        row,
        [
          "Build",
          "build"
        ]
      )
    );


  /* =======================================================
     TICKET URL
  ======================================================= */

  const rawTicketUrl =
    normalize(
      getRowValue(
        row,
        [
          "Ticket URL",
          "TicketURL",
          "ticketUrl",
          "ticket url",
          "URL",
          "Url",
          "Link",
          "Ticket Link"
        ]
      )
    );


  /* =======================================================
     TICKET ID
  ======================================================= */

  const rawTicketId =
    normalize(
      getRowValue(
        row,
        [
          "Ticket ID",
          "TicketID",
          "ticketId",
          "ticket id",
          "Ticket Number",
          "TicketNumber",
          "Ticket No",
          "TicketNo",
          "Ticket",
          "ID"
        ]
      )
    );


  /*
    If Ticket ID itself contains a URL,
    preserve that URL so the ticket
    remains clickable.
  */

  const ticketUrl =
    rawTicketUrl ||
    (
      isUrl(
        rawTicketId
      )
        ? rawTicketId
        : ""
    );


  const ticketId =
    extractTicketId(
      rawTicketId
    ) ||
    extractTicketId(
      ticketUrl
    );


  /* =======================================================
     GAME
  ======================================================= */

  const game =
    normalize(
      getRowValue(
        row,
        [
          "Game",
          "Games",
          "game",
          "games"
        ]
      )
    );


  /* =======================================================
     CATEGORY
  ======================================================= */

  const importedCategory =
    normalize(
      getRowValue(
        row,
        [
          "Category",
          "category",
          "Game Category",
          "GameCategory"
        ]
      )
    );


  const category =
    importedCategory ||
    getGameCategory(
      game
    );


  /* =======================================================
     BUG TITLE
  ======================================================= */

  const bugTitle =
    normalize(
      getRowValue(
        row,
        [
          "Bug Title",
          "BugTitle",
          "Title",
          "bugTitle",
          "Bug"
        ]
      )
    );


  /* =======================================================
     PRIORITY
  ======================================================= */

  const priority =
    normalize(
      getRowValue(
        row,
        [
          "Priority",
          "priority"
        ]
      )
    );


  /* =======================================================
     DATE CREATED
  ======================================================= */

  const dateCreated =
    normalize(
      getRowValue(
        row,
        [
          "Date Created",
          "DateCreated",
          "Created Date",
          "CreatedDate",
          "dateCreated"
        ]
      )
    );


  /* =======================================================
     STATUS
  ======================================================= */

  const status =
    normalize(
      getRowValue(
        row,
        [
          "Status",
          "status"
        ]
      )
    );


  /* =======================================================
     CREATED BY
  ======================================================= */

  const createdBy =
    normalize(
      getRowValue(
        row,
        [
          "Created By",
          "CreatedBy",
          "createdBy"
        ]
      )
    );


  /* =======================================================
     VALIDATED BY
  ======================================================= */

  const validatedBy =
    normalize(
      getRowValue(
        row,
        [
          "Validated By",
          "ValidatedBy",
          "validatedBy"
        ]
      )
    );


  /* =======================================================
     REMARKS
  ======================================================= */

  const remarks =
    normalize(
      getRowValue(
        row,
        [
          "Remarks",
          "Remark",
          "remarks"
        ]
      )
    );


  /* =======================================================
     RETURN
  ======================================================= */

  return {

    build,

    ticketUrl,

    game,

    category,

    bugTitle,

    priority,

    dateCreated,

    status,

    createdBy,

    validatedBy,

    remarks,

    /*
      Internal only.
      Not displayed as a separate column.
    */
    ticketId

  };

}


/* =========================================================
   STORAGE
========================================================= */

function loadBugs() {

  try {

    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );


    if (!saved) {

      bugs = [];

      return;

    }


    const parsed =
      JSON.parse(
        saved
      );


    if (
      Array.isArray(
        parsed
      )
    ) {

      bugs =
        deduplicateBugs(
          parsed
        );

      saveBugs();

    } else {

      bugs = [];

    }

  } catch (error) {

    console.error(
      "Failed to load bugs:",
      error
    );

    bugs = [];

  }

}


function saveBugs() {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      bugs
    )
  );

}


/* =========================================================
   DUPLICATE CONTROL
========================================================= */

function deduplicateBugs(
  list
) {

  const unique =
    new Map();


  list.forEach(
    rawBug => {

      const bug =
        normalizeBug(
          rawBug
        );


      const ticketId =
        getTicketId(
          bug
        );


      /*
        If there is no Ticket ID,
        preserve the record with a
        temporary unique key.
      */

      if (!ticketId) {

        unique.set(
          `NO_ID_${unique.size}`,
          bug
        );

        return;

      }


      const key =
        normalizeKey(
          ticketId
        );


      /*
        First record wins.
      */

      if (
        !unique.has(
          key
        )
      ) {

        unique.set(
          key,
          bug
        );

      }

    }
  );


  return Array.from(
    unique.values()
  );

}


/* =========================================================
   IMPORT
========================================================= */

async function importFile(
  file
) {

  if (!file) {
    return;
  }


  try {

    const extension =
      file.name
        .split(".")
        .pop()
        .toLowerCase();


    let importedRows = [];


    /* =====================================================
       JSON
    ===================================================== */

    if (
      extension === "json"
    ) {

      importedRows =
        await readJSON(
          file
        );

    }


    /* =====================================================
       CSV
    ===================================================== */

    else if (
      extension === "csv"
    ) {

      importedRows =
        await readCSV(
          file
        );

    }


    /* =====================================================
       TSV
    ===================================================== */

    else if (
      extension === "tsv"
    ) {

      importedRows =
        await readTSV(
          file
        );

    }


    /* =====================================================
       TXT
    ===================================================== */

    else if (
      extension === "txt"
    ) {

      importedRows =
        await readTXT(
          file
        );

    }


    /* =====================================================
       EXCEL
    ===================================================== */

    else if (
      extension === "xlsx" ||
      extension === "xls" ||
      extension === "slxc"
    ) {

      importedRows =
        await readExcel(
          file
        );

    }


    /* =====================================================
       DOCX
    ===================================================== */

    else if (
      extension === "docx"
    ) {

      importedRows =
        await readDOCX(
          file
        );

    }


    /* =====================================================
       UNSUPPORTED
    ===================================================== */

    else {

      showCenterModal({

        title:
          "Unsupported File",

        message:
          "Please select an XLSX, XLS, SLXC, CSV, TSV, TXT, JSON, or DOCX file.",

        type:
          "error",

        cancelText:
          "Close"

      });

      return;

    }


    /* =====================================================
       NO DATA
    ===================================================== */

    if (
      !Array.isArray(
        importedRows
      ) ||
      importedRows.length === 0
    ) {

      showCenterModal({

        title:
          "No Bug Records",

        message:
          "No bug records were found in the imported file. Make sure the first row contains the column headers.",

        type:
          "warning",

        cancelText:
          "Close"

      });

      return;

    }


    /* =====================================================
       NORMALIZE IMPORTED DATA
    ===================================================== */

    const normalizedImported =
      importedRows
        .map(
          normalizeBug
        )
        .filter(
          bug =>
            bug.ticketId ||
            bug.ticketUrl ||
            bug.bugTitle
        );


    if (
      normalizedImported.length === 0
    ) {

      showCenterModal({

        title:
          "Invalid Import",

        message:
          "The imported file does not contain usable bug records. Expected columns include Build, Ticket URL, Game, Category, Bug Title, Priority, Date Created, Status, Created By, Validated By, and Remarks.",

        type:
          "error",

        cancelText:
          "Close"

      });

      return;

    }


    /* =====================================================
       EXISTING TICKETS
    ===================================================== */

    const existingTicketIds =
      new Set(

        bugs
          .map(
            bug =>
              getTicketId(
                bug
              )
          )
          .filter(Boolean)
          .map(
            normalizeKey
          )

      );


    /* =====================================================
       REMOVE DUPLICATES FROM IMPORT
    ===================================================== */

    const importedUnique =
      deduplicateBugs(
        normalizedImported
      );


    /* =====================================================
       COUNT NEW TICKETS
    ===================================================== */

    const newTicketCount =
      importedUnique.filter(
        bug => {

          const ticketId =
            getTicketId(
              bug
            );


          if (!ticketId) {
            return true;
          }


          return !existingTicketIds.has(
            normalizeKey(
              ticketId
            )
          );

        }
      ).length;


    const duplicateCount =
      normalizedImported.length -
      importedUnique.length;


    /* =====================================================
       MERGE
    ===================================================== */

    bugs =
      deduplicateBugs([
        ...bugs,
        ...importedUnique
      ]);


    saveBugs();


    currentPage =
      1;


    closeImportModal();


    refreshAllViews();


    let message =
      `${newTicketCount} new bug ticket(s) imported successfully.`;


    if (
      duplicateCount > 0
    ) {

      message +=
        ` ${duplicateCount} duplicate record(s) were ignored.`;

    }


    showNotification(
      message,
      "success",
      "Import completed"
    );

  } catch (error) {

    console.error(
      "Import failed:",
      error
    );


    showCenterModal({

      title:
        "Import Failed",

      message:
        error?.message ||
        "Unable to import the file. Please check the file format and try again.",

      type:
        "error",

      cancelText:
        "Close"

    });

  }

}


/* =========================================================
   CSV
========================================================= */

function readCSV(
  file
) {

  return readDelimitedFile(
    file,
    ","
  );

}


/* =========================================================
   TSV
========================================================= */

function readTSV(
  file
) {

  return readDelimitedFile(
    file,
    "\t"
  );

}


/* =========================================================
   TXT
========================================================= */

function readTXT(
  file
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const reader =
        new FileReader();


      reader.onload =
        event => {

          try {

            const text =
              String(
                event.target.result ||
                ""
              );


            /*
              Automatically use tab if
              the TXT file is tab-separated.
              Otherwise use comma.
            */

            const delimiter =
              text.includes("\t")
                ? "\t"
                : ",";


            const rows =
              parseDelimited(
                text,
                delimiter
              );


            if (
              rows.length < 2
            ) {

              resolve([]);

              return;

            }


            const headers =
              rows[0].map(
                header =>
                  normalize(
                    header
                  )
              );


            const data =
              rows
                .slice(1)
                .map(
                  row => {

                    const object =
                      {};


                    headers.forEach(
                      (
                        header,
                        index
                      ) => {

                        object[header] =
                          row[index] ??
                          "";

                      }
                    );


                    return object;

                  }
                );


            resolve(
              data
            );

          } catch (error) {

            reject(
              error
            );

          }

        };


      reader.onerror =
        reject;


      reader.readAsText(
        file
      );

    }
  );

}


/* =========================================================
   DELIMITED FILE
========================================================= */

function readDelimitedFile(
  file,
  delimiter
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const reader =
        new FileReader();


      reader.onload =
        event => {

          try {

            const text =
              String(
                event.target.result ||
                ""
              );


            const rows =
              parseDelimited(
                text,
                delimiter
              );


            if (
              rows.length < 2
            ) {

              resolve([]);

              return;

            }


            const headers =
              rows[0].map(
                header =>
                  normalize(
                    header
                  )
              );


            const data =
              rows
                .slice(1)
                .map(
                  row => {

                    const object =
                      {};


                    headers.forEach(
                      (
                        header,
                        index
                      ) => {

                        object[header] =
                          row[index] ??
                          "";

                      }
                    );


                    return object;

                  }
                );


            resolve(
              data
            );

          } catch (error) {

            reject(
              error
            );

          }

        };


      reader.onerror =
        reject;


      reader.readAsText(
        file
      );

    }
  );

}


/* =========================================================
   DELIMITED PARSER
========================================================= */

function parseDelimited(
  text,
  delimiter = ","
) {

  const rows = [];

  let row = [];

  let value = "";

  let insideQuotes =
    false;


  /*
    Remove UTF-8 BOM.
  */

  text =
    String(
      text ?? ""
    ).replace(
      /^\uFEFF/,
      ""
    );


  for (
    let i = 0;
    i < text.length;
    i++
  ) {

    const char =
      text[i];

    const next =
      text[i + 1];


    if (
      char === '"' &&
      insideQuotes &&
      next === '"'
    ) {

      value += '"';

      i++;

      continue;

    }


    if (
      char === '"'
    ) {

      insideQuotes =
        !insideQuotes;

      continue;

    }


    if (
      char === delimiter &&
      !insideQuotes
    ) {

      row.push(
        value
      );

      value = "";

      continue;

    }


    if (
      (
        char === "\n" ||
        char === "\r"
      ) &&
      !insideQuotes
    ) {

      if (
        char === "\r" &&
        next === "\n"
      ) {

        i++;

      }


      row.push(
        value
      );

      value = "";


      if (
        row.some(
          cell =>
            String(
              cell
            ).trim() !== ""
        )
      ) {

        rows.push(
          row
        );

      }


      row = [];

      continue;

    }


    value += char;

  }


  if (
    value.length > 0 ||
    row.length > 0
  ) {

    row.push(
      value
    );


    if (
      row.some(
        cell =>
          String(
            cell
          ).trim() !== ""
        )
    ) {

      rows.push(
        row
      );

    }

  }


  return rows;

}


/* =========================================================
   JSON
========================================================= */

function readJSON(
  file
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const reader =
        new FileReader();


      reader.onload =
        event => {

          try {

            const parsed =
              JSON.parse(
                event.target.result
              );


            if (
              Array.isArray(
                parsed
              )
            ) {

              resolve(
                parsed
              );

              return;

            }


            if (
              Array.isArray(
                parsed.bugs
              )
            ) {

              resolve(
                parsed.bugs
              );

              return;

            }


            if (
              Array.isArray(
                parsed.data
              )
            ) {

              resolve(
                parsed.data
              );

              return;

            }


            if (
              Array.isArray(
                parsed.rows
              )
            ) {

              resolve(
                parsed.rows
              );

              return;

            }


            resolve([]);

          } catch (error) {

            reject(
              error
            );

          }

        };


      reader.onerror =
        reject;


      reader.readAsText(
        file
      );

    }
  );

}


/* =========================================================
   EXCEL
========================================================= */

function readExcel(
  file
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      if (
        typeof XLSX ===
        "undefined"
      ) {

        reject(
          new Error(
            "SheetJS is not loaded. Please add the XLSX library to index.html before app.js."
          )
        );

        return;

      }


      const reader =
        new FileReader();


      reader.onload =
        event => {

          try {

            const workbook =
              XLSX.read(
                event.target.result,
                {
                  type: "array"
                }
              );


            if (
              !workbook.SheetNames.length
            ) {

              resolve([]);

              return;

            }


            /*
              Prefer the worksheet containing
              the required bug tracker headers.

              This allows Excel files to have
              dashboard/progress sheets before
              the actual bug list.
            */

            const requiredHeaders = [
              "Build",
              "Ticket URL",
              "Game",
              "Category",
              "Bug Title",
              "Priority",
              "Date Created",
              "Status",
              "Created By",
              "Validated By",
              "Remarks"
            ];


            const normalizeHeader =
              value =>
                String(
                  value ?? ""
                )
                  .trim()
                  .toLowerCase()
                  .replace(
                    /[\s_\-./\\]+/g,
                    ""
                  );


            let selectedSheet =
              null;


            for (
              const sheetName
              of workbook.SheetNames
            ) {

              const sheet =
                workbook.Sheets[
                  sheetName
                ];


              const rows =
                XLSX.utils.sheet_to_json(
                  sheet,
                  {
                    header: 1,
                    defval: "",
                    raw: false
                  }
                );


              if (
                !rows.length
              ) {
                continue;
              }


              const normalizedRequired =
                requiredHeaders.map(
                  normalizeHeader
                );


              const hasRequiredHeaders =
                rows.some(
                  row => {

                    if (
                      !Array.isArray(row)
                    ) {
                      return false;
                    }


                    const normalizedRow =
                      row.map(
                        normalizeHeader
                      );


                    return normalizedRequired.every(
                      header =>
                        normalizedRow.includes(
                          header
                        )
                    );

                  }
                );


              if (
                hasRequiredHeaders
              ) {

                selectedSheet =
                  sheet;

                break;

              }

            }


            /*
              Fallback to the first sheet
              if no matching bug sheet exists.
            */

            if (
              !selectedSheet
            ) {

              selectedSheet =
                workbook.Sheets[
                  workbook.SheetNames[0]
                ];

            }


            const data =
              XLSX.utils.sheet_to_json(
                selectedSheet,
                {
                  defval: "",
                  raw: false
                }
              );


            resolve(
              data
            );

          } catch (error) {

            reject(
              error
            );

          }

        };


      reader.onerror =
        reject;


      reader.readAsArrayBuffer(
        file
      );

    }
  );

}


/* =========================================================
   DOCX
========================================================= */

function readDOCX(
  file
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      if (
        typeof mammoth ===
        "undefined"
      ) {

        reject(
          new Error(
            "DOCX support requires the Mammoth library. Please add Mammoth to index.html before app.js."
          )
        );

        return;

      }


      const reader =
        new FileReader();


      reader.onload =
        async event => {

          try {

            const result =
              await mammoth.convertToHtml(
                {
                  arrayBuffer:
                    event.target.result
                }
              );


            const parser =
              new DOMParser();


            const document =
              parser.parseFromString(
                result.value,
                "text/html"
              );


            const tables =
              Array.from(
                document.querySelectorAll(
                  "table"
                )
              );


            if (
              tables.length === 0
            ) {

              resolve([]);

              return;

            }


            const allRows = [];


            /*
              Read every table in the
              DOCX. This makes DOCX
              imports more flexible.
            */

            tables.forEach(
              table => {

                const rows =
                  Array.from(
                    table.querySelectorAll(
                      "tr"
                    )
                  );


                if (
                  rows.length < 2
                ) {

                  return;

                }


                const headers =
                  Array.from(
                    rows[0].querySelectorAll(
                      "th, td"
                    )
                  ).map(
                    cell =>
                      normalize(
                        cell.textContent
                      )
                  );


                rows
                  .slice(1)
                  .forEach(
                    row => {

                      const cells =
                        Array.from(
                          row.querySelectorAll(
                            "th, td"
                          )
                        );


                      const object =
                        {};


                      headers.forEach(
                        (
                          header,
                          index
                        ) => {

                          object[header] =
                            normalize(
                              cells[index]
                                ?.textContent
                            );

                        }
                      );


                      const hasData =
                        Object.values(
                          object
                        ).some(
                          value =>
                            normalize(
                              value
                            ) !== ""
                        );


                      if (
                        hasData
                      ) {

                        allRows.push(
                          object
                        );

                      }

                    }
                  );

              }
            );


            resolve(
              allRows
            );

          } catch (error) {

            reject(
              error
            );

          }

        };


      reader.onerror =
        reject;


      reader.readAsArrayBuffer(
        file
      );

    }
  );

}


/* =========================================================
   FILTER
========================================================= */

function applyBugFilters() {

  const search =
    normalize(
      $("bugSearch")?.value
    ).toLowerCase();


  const game =
    $("bugGameFilter")?.value ||
    "all";


  const status =
    $("bugStatusFilter")?.value ||
    "all";


  filteredBugs =
    bugs.filter(
      bug => {

        const ticketId =
          getTicketId(
            bug
          );


        const searchableText = [

          bug.build,
          bug.ticketUrl,
          ticketId,
          bug.game,
          bug.category,
          bug.bugTitle,
          bug.priority,
          bug.dateCreated,
          bug.status,
          bug.createdBy,
          bug.validatedBy,
          bug.remarks

        ]
          .join(" ")
          .toLowerCase();


        const matchesSearch =
          !search ||
          searchableText.includes(
            search
          );


        const matchesGame =
          game === "all" ||
          normalizeKey(
            bug.game
          ) ===
          normalizeKey(
            game
          );


        const matchesStatus =
          status === "all" ||
          normalizeKey(
            bug.status
          ) ===
          normalizeKey(
            status
          );


        return (
          matchesSearch &&
          matchesGame &&
          matchesStatus
        );

      }
    );


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredBugs.length /
        pageSize
      )
    );


  if (
    currentPage >
    totalPages
  ) {

    currentPage =
      totalPages;

  }

}


/* =========================================================
   FILTER OPTIONS
========================================================= */

function populateFilters() {

  const gameSelect =
    $("bugGameFilter");

  const statusSelect =
    $("bugStatusFilter");


  if (
    !gameSelect ||
    !statusSelect
  ) {

    return;

  }


  const currentGame =
    gameSelect.value;


  const currentStatus =
    statusSelect.value;


  const bugGames = [
    ...new Set(
      bugs
        .map(
          bug =>
            bug.game
        )
        .filter(Boolean)
    )
  ].sort(
    (a, b) =>
      a.localeCompare(
        b
      )
  );


  const statuses = [
    ...new Set(
      bugs
        .map(
          bug =>
            bug.status
        )
        .filter(Boolean)
    )
  ].sort(
    (a, b) =>
      a.localeCompare(
        b
      )
  );


  gameSelect.innerHTML = `

    <option value="all">
      All Games
    </option>

    ${bugGames
      .map(
        game => `
          <option
            value="${escapeHTML(
              game
            )}"
          >
            ${escapeHTML(
              game
            )}
          </option>
        `
      )
      .join("")}

  `;


  statusSelect.innerHTML = `

    <option value="all">
      All Statuses
    </option>

    ${statuses
      .map(
        status => `
          <option
            value="${escapeHTML(
              status
            )}"
          >
            ${escapeHTML(
              status
            )}
          </option>
        `
      )
      .join("")}

  `;


  if (
    bugGames.some(
      game =>
        normalizeKey(
          game
        ) ===
        normalizeKey(
          currentGame
        )
    )
  ) {

    gameSelect.value =
      currentGame;

  }


  if (
    statuses.some(
      status =>
        normalizeKey(
          status
        ) ===
        normalizeKey(
          currentStatus
        )
    )
  ) {

    statusSelect.value =
      currentStatus;

  }

}


/* =========================================================
   TABLE
========================================================= */

export function renderBugTable() {

  renderBugTracker();

}


function renderBugTracker() {

  populateFilters();

  applyBugFilters();

  renderStats();

  renderTable();

  renderPagination();

}


/* =========================================================
   STATS
========================================================= */

function renderStats() {

  const total =
    bugs.length;


  const open =
    bugs.filter(
      bug =>
        normalizeKey(
          bug.status
        ) === "open"
    ).length;


  const progress =
    bugs.filter(
      bug =>
        [
          "in progress",
          "ongoing"
        ].includes(
          normalizeKey(
            bug.status
          )
        )
    ).length;


  const closed =
    bugs.filter(
      bug =>
        [
          "closed",
          "resolved",
          "fixed",
          "done"
        ].includes(
          normalizeKey(
            bug.status
          )
        )
    ).length;


  const bugGames =
    new Set(
      bugs
        .map(
          bug =>
            normalizeKey(
              bug.game
            )
        )
        .filter(Boolean)
    );


  if (
    $("bugTotal")
  ) {

    $("bugTotal").textContent =
      total;

  }


  if (
    $("bugOpen")
  ) {

    $("bugOpen").textContent =
      open;

  }


  if (
    $("bugProgress")
  ) {

    $("bugProgress").textContent =
      progress;

  }


  if (
    $("bugClosed")
  ) {

    $("bugClosed").textContent =
      closed;

  }


  if (
    $("bugGameCount")
  ) {

    $("bugGameCount").textContent =
      bugGames.size;

  }

}


/* =========================================================
   TABLE RENDER
========================================================= */

function renderTable() {

  const tbody =
    $("bugTableBody");


  if (!tbody) {
    return;
  }


  const start =
    (currentPage - 1) *
    pageSize;


  const end =
    start + pageSize;


  const pageRows =
    filteredBugs.slice(
      start,
      end
    );


  if (
    pageRows.length === 0
  ) {

    tbody.innerHTML = `

      <tr>

        <td
          colspan="12"
          class="bug-empty"
        >

          <div>

            <strong>
              No bugs found
            </strong>

            <span>
              Import a bug file or change your filters.
            </span>

          </div>

        </td>

      </tr>

    `;

    return;

  }


  tbody.innerHTML =
    pageRows
      .map(
        bug =>
          createBugRow(
            bug
          )
      )
      .join("");

}


/* =========================================================
   CREATE TABLE ROW

   COLUMN ORDER:

   1. Build
   2. Ticket URL
   3. Game
   4. Category
   5. Bug Title
   6. Priority
   7. Date Created
   8. Status
   9. Created By
   10. Validated By
   11. Remarks
   12. Actions
========================================================= */

function createBugRow(
  bug
) {

  const ticketId =
    getTicketId(
      bug
    );


  /*
    The UI displays #468,
    but the original Ticket URL
    remains attached to the link.
  */

  const ticketCell =
    bug.ticketUrl &&
    ticketId

      ? `

        <a
          href="${escapeHTML(
            bug.ticketUrl
          )}"
          class="ticketLink"
          target="_blank"
          rel="noopener noreferrer"
          title="Open ticket ${escapeHTML(
            ticketId
          )}"
          onclick="event.stopPropagation();"
        >

          #${escapeHTML(
            ticketId
          )}

        </a>

      `

      : `

        <span
          class="ticketLink disabled"
          title="No ticket URL available"
        >

          ${
            ticketId
              ? `#${escapeHTML(
                  ticketId
                )}`
              : "—"
          }

        </span>

      `;


  return `

    <tr>

      <!-- 1. BUILD -->

      <td>

        <span class="buildText">

          ${escapeHTML(
            bug.build ||
            "—"
          )}

        </span>

      </td>


      <!-- 2. TICKET URL -->

      <td
        class="ticketUrlCell"
      >

        ${ticketCell}

      </td>


      <!-- 3. GAME -->

      <td>

        ${escapeHTML(
          bug.game ||
          "—"
        )}

      </td>


      <!-- 4. CATEGORY -->

      <td>

        ${escapeHTML(
          bug.category ||
          "—"
        )}

      </td>


      <!-- 5. BUG TITLE -->

      <td>

        <div
          class="bugTitleCell"
          title="${escapeHTML(
            bug.bugTitle ||
            ""
          )}"
        >

          ${escapeHTML(
            bug.bugTitle ||
            "—"
          )}

        </div>

      </td>


      <!-- 6. PRIORITY -->

      <td>

        ${createPriorityPill(
          bug.priority
        )}

      </td>


      <!-- 7. DATE CREATED -->

      <td>

        ${escapeHTML(
          bug.dateCreated ||
          "—"
        )}

      </td>


      <!-- 8. STATUS -->

      <td>

        ${createStatusPill(
          bug.status
        )}

      </td>


      <!-- 9. CREATED BY -->

      <td>

        ${escapeHTML(
          bug.createdBy ||
          "—"
        )}

      </td>


      <!-- 10. VALIDATED BY -->

      <td>

        ${escapeHTML(
          bug.validatedBy ||
          "—"
        )}

      </td>


      <!-- 11. REMARKS -->

      <td>

        <div
          class="remarksCell"
          title="${escapeHTML(
            bug.remarks ||
            ""
          )}"
        >

          ${escapeHTML(
            bug.remarks ||
            "—"
          )}

        </div>

      </td>


      <!-- 12. ACTIONS -->

      <td>

        <div
          class="bugActions"
        >

          <button
            type="button"
            class="bugAction view"
            data-ticket="${escapeHTML(
              ticketId
            )}"
            title="View Details"
            aria-label="View Details"
          >

            <i
              class="fa-solid fa-eye"
            ></i>

          </button>


          <button
            type="button"
            class="bugAction edit"
            data-ticket="${escapeHTML(
              ticketId
            )}"
            title="Edit Bug"
            aria-label="Edit Bug"
          >

            <i
              class="fa-solid fa-pen"
            ></i>

          </button>


          <button
            type="button"
            class="bugAction delete"
            data-ticket="${escapeHTML(
              ticketId
            )}"
            title="Delete Bug"
            aria-label="Delete Bug"
          >

            <i
              class="fa-solid fa-trash"
            ></i>

          </button>

        </div>

      </td>

    </tr>

  `;

}


/* =========================================================
   PAGINATION
========================================================= */

function renderPagination() {

  const info =
    $("bugPaginationInfo");

  const pageNumbers =
    $("bugPageNumbers");

  const prev =
    $("bugPrevPage");

  const next =
    $("bugNextPage");


  if (
    !info ||
    !pageNumbers ||
    !prev ||
    !next
  ) {

    return;

  }


  const total =
    filteredBugs.length;


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total /
        pageSize
      )
    );


  const start =
    total === 0
      ? 0
      : (
          (currentPage - 1) *
          pageSize
        ) + 1;


  const end =
    Math.min(
      currentPage *
        pageSize,
      total
    );


  info.textContent =
    `Showing ${start}–${end} of ${total} bugs`;


  prev.disabled =
    currentPage <= 1;


  next.disabled =
    currentPage >=
    totalPages;


  pageNumbers.innerHTML =
    createPageNumbers(
      totalPages
    );

}


function createPageNumbers(
  totalPages
) {

  const pages = [];


  if (
    totalPages <= 7
  ) {

    for (
      let i = 1;
      i <= totalPages;
      i++
    ) {

      pages.push(
        i
      );

    }

  } else {

    pages.push(
      1
    );


    if (
      currentPage > 4
    ) {

      pages.push(
        "..."
      );

    }


    const start =
      Math.max(
        2,
        currentPage - 1
      );


    const end =
      Math.min(
        totalPages - 1,
        currentPage + 1
      );


    for (
      let i = start;
      i <= end;
      i++
    ) {

      pages.push(
        i
      );

    }


    if (
      currentPage <
      totalPages - 3
    ) {

      pages.push(
        "..."
      );

    }


    pages.push(
      totalPages
    );

  }


  return pages
    .map(
      page => {

        if (
          page === "..."
        ) {

          return `

            <span
              class="bugPageEllipsis"
            >
              ...
            </span>

          `;

        }


        return `

          <button
            type="button"
            class="bugPageNumber ${
              page === currentPage
                ? "active"
                : ""
            }"
            data-page="${page}"
          >

            ${page}

          </button>

        `;

      }
    )
    .join("");

}


/* =========================================================
   BUG DETAILS MODAL

   FIELD ORDER:

   Build
   Ticket URL
   Game
   Category
   Bug Title
   Priority
   Date Created
   Status
   Created By
   Validated By
   Remarks
========================================================= */

function openBugDetails(
  ticketId
) {

  const bug =
    bugs.find(
      item =>
        normalizeKey(
          getTicketId(
            item
          )
        ) ===
        normalizeKey(
          ticketId
        )
    );


  if (!bug) {
    return;
  }


  const modal =
    $("bugDetailsModal");

  const title =
    $("bugDetailsTitle");

  const content =
    $("bugDetailsContent");


  if (
    !modal ||
    !content
  ) {

    return;

  }


  if (title) {

    title.textContent =
      bug.bugTitle ||
      "Bug Details";

  }


  const ticketIdValue =
    getTicketId(
      bug
    );


  content.innerHTML = `

    <div
      class="bugDetailGrid"
    >

      ${detailItem(
        "Build",
        bug.build
      )}

      ${detailItem(
        "Ticket URL",
        bug.ticketUrl
      )}

      ${detailItem(
        "Game",
        bug.game
      )}

      ${detailItem(
        "Category",
        bug.category
      )}

      ${detailItem(
        "Bug Title",
        bug.bugTitle
      )}

      ${detailItem(
        "Priority",
        bug.priority
      )}

      ${detailItem(
        "Date Created",
        bug.dateCreated
      )}

      ${detailItem(
        "Status",
        bug.status
      )}

      ${detailItem(
        "Created By",
        bug.createdBy
      )}

      ${detailItem(
        "Validated By",
        bug.validatedBy
      )}

      ${detailItem(
        "Remarks",
        bug.remarks
      )}

    </div>

  `;


  modal.classList.add(
    "show"
  );

}


function detailItem(
  label,
  value
) {

  return `

    <div
      class="bugDetailItem"
    >

      <span>

        ${escapeHTML(
          label
        )}

      </span>

      <strong>

        ${escapeHTML(
          value ||
          "—"
        )}

      </strong>

    </div>

  `;

}


function closeBugDetails() {

  $("bugDetailsModal")
    ?.classList.remove(
      "show"
    );

}


/* =========================================================
   IMPORT MODAL
========================================================= */

function openImportModal() {

  $("bugImportModal")
    ?.classList.add(
      "show"
    );


  const preview =
    $("bugImportPreview");


  if (preview) {

    preview.innerHTML = `

      <div class="empty">

        No file selected.

      </div>

    `;

  }

}


function closeImportModal() {

  $("bugImportModal")
    ?.classList.remove(
      "show"
    );

}


/* =========================================================
   PILL HELPERS
========================================================= */

function createPriorityPill(
  priority
) {

  if (!priority) {
    return "—";
  }


  const key =
    normalizeKey(
      priority
    ).replace(
      /\s+/g,
      "-"
    );


  return `

    <span
      class="bugPill priority-${escapeHTML(
        key
      )}"
    >

      ${escapeHTML(
        priority
      )}

    </span>

  `;

}


function createStatusPill(
  status
) {

  if (!status) {
    return "—";
  }


  const key =
    normalizeKey(
      status
    ).replace(
      /\s+/g,
      "-"
    );


  return `

    <span
      class="bugPill status-${escapeHTML(
        key
      )}"
    >

      ${escapeHTML(
        status
      )}

    </span>

  `;

}


/* =========================================================
   REMOVE CRITICAL PRIORITY
========================================================= */

function removeCriticalPriorityOption() {

  const priorityField =
    $("bugPriorityField");


  if (!priorityField) {
    return;
  }


  [
    ...priorityField.options
  ].forEach(
    option => {

      if (
        normalizeKey(
          option.value
        ) ===
        "critical" ||
        normalizeKey(
          option.textContent
        ) ===
        "critical"
      ) {

        option.remove();

      }

    }
  );

}


/* =========================================================
   FORM VALUE HELPER
========================================================= */

/*
  FormData only reads fields that have
  matching name="" attributes.

  This helper supports BOTH name=""
  and ID-based fields.
*/

function getFormValue(
  formData,
  names = [],
  ids = []
) {

  for (
    const name of names
  ) {

    const value =
      normalize(
        formData.get(
          name
        )
      );

    if (value) {
      return value;
    }

  }


  for (
    const id of ids
  ) {

    const field =
      $(id);

    if (
      field
    ) {

      const value =
        normalize(
          field.value
        );

      if (value) {
        return value;
      }

    }

  }


  return "";

}


/* =========================================================
   EVENTS
========================================================= */

export function initBugTracker() {

  loadBugs();


  const importButton =
    $("importBugs");

  const clearButton =
    $("clearBugs");

  const fileInput =
    $("bugFileInput");


  /* =======================================================
     IMPORT
  ======================================================= */

  importButton?.addEventListener(
    "click",
    openImportModal
  );


  $("selectBugFile")
    ?.addEventListener(
      "click",
      () => {

        fileInput?.click();

      }
    );


  fileInput?.addEventListener(
    "change",
    event => {

      const file =
        event.target.files?.[0];


      if (file) {

        importFile(
          file
        );

      }


      event.target.value =
        "";

    }
  );


  /* =======================================================
     DRAG AND DROP IMPORT
  ======================================================= */

  const dropzone =
    document.querySelector(
      ".bugDropzone"
    );


  if (dropzone) {

    dropzone.addEventListener(
      "dragover",
      event => {

        event.preventDefault();

        event.stopPropagation();

        dropzone.classList.add(
          "dragover"
        );

      }
    );


    dropzone.addEventListener(
      "dragenter",
      event => {

        event.preventDefault();

        event.stopPropagation();

        dropzone.classList.add(
          "dragover"
        );

      }
    );


    dropzone.addEventListener(
      "dragleave",
      event => {

        event.preventDefault();

        event.stopPropagation();


        if (
          event.target ===
          dropzone
        ) {

          dropzone.classList.remove(
            "dragover"
          );

        }

      }
    );


    dropzone.addEventListener(
      "drop",
      event => {

        event.preventDefault();

        event.stopPropagation();

        dropzone.classList.remove(
          "dragover"
        );


        const files =
          event.dataTransfer?.files;


        if (
          !files ||
          files.length === 0
        ) {

          return;

        }


        importFile(
          files[0]
        );

      }
    );

  }


  /* =======================================================
     ADD BUG
  ======================================================= */

  $("addBug")
    ?.addEventListener(
      "click",
      openAddBugModal
    );


  $("bugForm")
    ?.addEventListener(
      "submit",
      saveBug
    );


  /* =======================================================
     CLOSE ADD/EDIT BUG MODAL
  ======================================================= */

  $("closeBugModal")
    ?.addEventListener(
      "click",
      closeBugFormModal
    );


  $("cancelBug")
    ?.addEventListener(
      "click",
      closeBugFormModal
    );


  $("bugModal")
    ?.addEventListener(
      "click",
      event => {

        if (
          event.target ===
          $("bugModal")
        ) {

          closeBugFormModal();

        }

      }
    );


  /* =======================================================
     CLOSE IMPORT MODAL
  ======================================================= */

  $("closeBugImport")
    ?.addEventListener(
      "click",
      closeImportModal
    );


  /* =======================================================
     CLOSE DETAILS MODAL
  ======================================================= */

  $("closeBugDetails")
    ?.addEventListener(
      "click",
      closeBugDetails
    );


  /* =======================================================
     SEARCH
  ======================================================= */

  $("bugSearch")
    ?.addEventListener(
      "input",
      () => {

        currentPage = 1;

        renderBugTracker();

      }
    );


  /* =======================================================
     GAME FILTER
  ======================================================= */

  $("bugGameFilter")
    ?.addEventListener(
      "change",
      () => {

        currentPage = 1;

        renderBugTracker();

      }
    );


  /* =======================================================
     STATUS FILTER
  ======================================================= */

  $("bugStatusFilter")
    ?.addEventListener(
      "change",
      () => {

        currentPage = 1;

        renderBugTracker();

      }
    );


  /* =======================================================
     PAGE SIZE
  ======================================================= */

  $("bugPageSize")
    ?.addEventListener(
      "change",
      event => {

        pageSize =
          Number(
            event.target.value
          ) || 10;

        currentPage = 1;

        renderBugTracker();

      }
    );


  /* =======================================================
     PREVIOUS PAGE
  ======================================================= */

  $("bugPrevPage")
    ?.addEventListener(
      "click",
      () => {

        if (
          currentPage > 1
        ) {

          currentPage--;

          renderBugTracker();

        }

      }
    );


  /* =======================================================
     NEXT PAGE
  ======================================================= */

  $("bugNextPage")
    ?.addEventListener(
      "click",
      () => {

        const totalPages =
          Math.max(
            1,
            Math.ceil(
              filteredBugs.length /
              pageSize
            )
          );


        if (
          currentPage <
          totalPages
        ) {

          currentPage++;

          renderBugTracker();

        }

      }
    );


  /* =======================================================
     PAGE NUMBERS / VIEW / EDIT / DELETE
  ======================================================= */

  document.addEventListener(
    "click",
    event => {

      const pageButton =
        event.target.closest(
          ".bugPageNumber"
        );


      if (pageButton) {

        currentPage =
          Number(
            pageButton.dataset.page
          );

        renderBugTracker();

        return;

      }


      const viewButton =
        event.target.closest(
          ".bugAction.view"
        );


      if (viewButton) {

        openBugDetails(
          viewButton.dataset.ticket
        );

        return;

      }


      const editButton =
        event.target.closest(
          ".bugAction.edit"
        );


      if (editButton) {

        openEditBugModal(
          editButton.dataset.ticket
        );

        return;

      }


      const deleteButton =
        event.target.closest(
          ".bugAction.delete"
        );


      if (deleteButton) {

        confirmDeleteBug(
          deleteButton.dataset.ticket
        );

      }

    }
  );


  /* =======================================================
     CLEAR
  ======================================================= */

  clearButton?.addEventListener(
    "click",
    () => {

      if (
        bugs.length === 0
      ) {

        showCenterModal({

          title:
            "Nothing to Clear",

          message:
            "There are currently no bug tickets to remove.",

          type:
            "info",

          cancelText:
            "Close"

        });

        return;

      }


      showCenterModal({

        title:
          "Clear All Bug Tickets?",

        message:
          "This will permanently remove all bug tickets from the tracker.",

        type:
          "confirm",

        confirmText:
          "Clear All",

        cancelText:
          "Cancel",

        onConfirm:
          clearAllBugs

      });

    }
  );


  /* =======================================================
     CLOSE IMPORT MODAL
  ======================================================= */

  $("bugImportModal")
    ?.addEventListener(
      "click",
      event => {

        if (
          event.target ===
          $("bugImportModal")
        ) {

          closeImportModal();

        }

      }
    );


  /* =======================================================
     CLOSE DETAILS MODAL
  ======================================================= */

  $("bugDetailsModal")
    ?.addEventListener(
      "click",
      event => {

        if (
          event.target ===
          $("bugDetailsModal")
        ) {

          closeBugDetails();

        }

      }
    );


  /*
    Remove Critical from the existing
    priority select if it is still
    present in index.html.
  */

  removeCriticalPriorityOption();


  renderBugTracker();

}


/* =========================================================
   OPEN ADD BUG MODAL
========================================================= */

function openAddBugModal() {

  const modal =
    $("bugModal");


  if (!modal) {

    console.error(
      "bugModal not found."
    );

    return;

  }


  const form =
    $("bugForm");


  if (form) {

    form.reset();

  }


  if ($("bugId")) {
    $("bugId").value = "";
  }


  if ($("bugModalTitle")) {

    $("bugModalTitle").textContent =
      "Add Bug";

  }


  if ($("bugModalSubtitle")) {

    $("bugModalSubtitle").textContent =
      "Add a bug ticket for tracking.";

  }


  const dateField =
    $("bugDateField");


  if (dateField) {

    dateField.value =
      new Date()
        .toISOString()
        .split("T")[0];

  }


  populateBugGameField();

  removeCriticalPriorityOption();


  modal.classList.add(
    "show"
  );

}


/* =========================================================
   OPEN EDIT BUG MODAL
========================================================= */

function openEditBugModal(
  ticketId
) {

  const bug =
    bugs.find(
      item =>
        normalizeKey(
          getTicketId(
            item
          )
        ) ===
        normalizeKey(
          ticketId
        )
    );


  if (!bug) {

    showCenterModal({

      title:
        "Bug Not Found",

      message:
        `Bug ticket #${ticketId} could not be found.`,

      type:
        "error",

      cancelText:
        "Close"

    });

    return;

  }


  const modal =
    $("bugModal");

  const form =
    $("bugForm");


  if (
    !modal ||
    !form
  ) {

    return;

  }


  populateBugGameField();

  removeCriticalPriorityOption();


  if ($("bugId")) {

    $("bugId").value =
      getTicketId(
        bug
      );

  }


  if ($("bugModalTitle")) {

    $("bugModalTitle").textContent =
      "Edit Bug";

  }


  if ($("bugModalSubtitle")) {

    $("bugModalSubtitle").textContent =
      "Update the bug ticket details.";

  }


  /*
    1. Build
  */

  setField(
    "bugBuildField",
    bug.build
  );


  /*
    2. Ticket URL
  */

  setField(
    "bugTicketField",
    bug.ticketUrl ||
    bug.ticketId
  );


  /*
    3. Game
  */

  setField(
    "bugGameField",
    bug.game
  );


  /*
    4. Category
  */

  setField(
    "bugCategoryField",
    bug.category
  );


  /*
    5. Bug Title
  */

  setField(
    "bugTitleField",
    bug.bugTitle
  );


  /*
    6. Priority
  */

  setField(
    "bugPriorityField",
    bug.priority
  );


  /*
    7. Date Created
  */

  setField(
    "bugDateField",
    bug.dateCreated
  );


  /*
    8. Status
  */

  setField(
    "bugStatusField",
    bug.status
  );


  /*
    9. Created By
  */

  setField(
    "bugCreatedByField",
    bug.createdBy
  );


  /*
    10. Validated By
  */

  setField(
    "bugValidatedByField",
    bug.validatedBy
  );


  /*
    11. Remarks
  */

  setField(
    "bugRemarksField",
    bug.remarks
  );


  /*
    Alternate IDs
  */

  setField(
    "bugGame",
    bug.game
  );


  setField(
    "bugBuild",
    bug.build
  );


  setField(
    "bugTicketUrl",
    bug.ticketUrl ||
    bug.ticketId
  );


  setField(
    "bugTicketId",
    bug.ticketId
  );


  setField(
    "bugTitle",
    bug.bugTitle
  );


  setField(
    "bugPriority",
    bug.priority
  );


  setField(
    "bugDate",
    bug.dateCreated
  );


  setField(
    "bugStatus",
    bug.status
  );


  setField(
    "bugCreatedBy",
    bug.createdBy
  );


  setField(
    "bugValidatedBy",
    bug.validatedBy
  );


  setField(
    "bugRemarks",
    bug.remarks
  );


  setField(
    "bugCategory",
    bug.category
  );


  modal.classList.add(
    "show"
  );

}


/* =========================================================
   SET FIELD
========================================================= */

function setField(
  id,
  value
) {

  const field =
    $(id);


  if (field) {

    field.value =
      value || "";

  }

}


/* =========================================================
   POPULATE GAME DROPDOWN
========================================================= */

function populateBugGameField() {

  const select =
    $("bugGameField");


  if (!select) {
    return;
  }


  const currentValue =
    select.value;


  select.innerHTML = `

    <option value="">
      Select game
    </option>

  `;


  const gameList =
    flatGames(
      games
    );


  gameList.forEach(
    game => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        game.name;


      option.textContent =
        game.name;


      select.appendChild(
        option
      );

    }
  );


  if (currentValue) {

    select.value =
      currentValue;

  }

}


/* =========================================================
   CLOSE BUG MODAL
========================================================= */

function closeBugFormModal() {

  $("bugModal")
    ?.classList.remove(
      "show"
    );

}


/* =========================================================
   SAVE BUG
========================================================= */

function saveBug(
  event
) {

  event.preventDefault();


  const form =
    $("bugForm");


  if (!form) {
    return;
  }


  const formData =
    new FormData(
      form
    );


  const editingTicketId =
    normalize(
      $("bugId")?.value
    );


  /*
    Read both name="" and ID-based fields.
  */

  /* =======================================================
     1. BUILD
  ======================================================= */

  const build =
    getFormValue(
      formData,
      [
        "build"
      ],
      [
        "bugBuildField",
        "bugBuild"
      ]
    );


  /* =======================================================
     2. TICKET URL
  ======================================================= */

  const rawTicketValue =
    getFormValue(
      formData,
      [
        "ticketUrl",
        "ticketId",
        "ticket"
      ],
      [
        "bugTicketField",
        "bugTicketUrl",
        "bugTicketId"
      ]
    );


  const ticketUrl =
    isUrl(
      rawTicketValue
    )
      ? rawTicketValue
      : "";


  const ticketId =
    extractTicketId(
      rawTicketValue
    );


  /* =======================================================
     3. GAME
  ======================================================= */

  const selectedGame =
    getFormValue(
      formData,
      [
        "game",
        "games"
      ],
      [
        "bugGameField",
        "bugGame"
      ]
    );


  /* =======================================================
     4. CATEGORY
  ======================================================= */

  const selectedCategory =
    getFormValue(
      formData,
      [
        "category",
        "bugCategory"
      ],
      [
        "bugCategoryField",
        "bugCategory"
      ]
    );


  /* =======================================================
     5. BUG TITLE
  ======================================================= */

  const bugTitle =
    getFormValue(
      formData,
      [
        "bugTitle",
        "title"
      ],
      [
        "bugTitleField",
        "bugTitle"
      ]
    );


  /* =======================================================
     6. PRIORITY
  ======================================================= */

  const priority =
    getFormValue(
      formData,
      [
        "priority"
      ],
      [
        "bugPriorityField",
        "bugPriority"
      ]
    );


  /* =======================================================
     7. DATE CREATED
  ======================================================= */

  const dateCreated =
    getFormValue(
      formData,
      [
        "dateCreated",
        "createdDate"
      ],
      [
        "bugDateField",
        "bugDate"
      ]
    );


  /* =======================================================
     8. STATUS
  ======================================================= */

  const status =
    getFormValue(
      formData,
      [
        "status"
      ],
      [
        "bugStatusField",
        "bugStatus"
      ]
    );


  /* =======================================================
     9. CREATED BY
  ======================================================= */

  const createdBy =
    getFormValue(
      formData,
      [
        "createdBy"
      ],
      [
        "bugCreatedByField",
        "bugCreatedBy"
      ]
    );


  /* =======================================================
     10. VALIDATED BY
  ======================================================= */

  const validatedBy =
    getFormValue(
      formData,
      [
        "validatedBy"
      ],
      [
        "bugValidatedByField",
        "bugValidatedBy"
      ]
    );


  /* =======================================================
     11. REMARKS
  ======================================================= */

  const remarks =
    getFormValue(
      formData,
      [
        "remarks",
        "remark"
      ],
      [
        "bugRemarksField",
        "bugRemarks"
      ]
    );


  /* =======================================================
     CREATE BUG OBJECT
  ======================================================= */

  const bug =
    normalizeBug({

      build:

        build,

      ticketUrl:

        ticketUrl,

      ticketId:

        ticketId,

      game:

        selectedGame,

      category:

        selectedCategory ||
        getGameCategory(
          selectedGame
        ),

      bugTitle:

        bugTitle,

      priority:

        priority,

      dateCreated:

        dateCreated,

      status:

        status,

      createdBy:

        createdBy,

      validatedBy:

        validatedBy,

      remarks:

        remarks

    });


  /* =======================================================
     VALIDATION
  ======================================================= */

  if (!bug.game) {

    showCenterModal({

      title:
        "Game Required",

      message:
        "Please select a game.",

      type:
        "warning",

      cancelText:
        "Close"

    });

    return;

  }


  if (!rawTicketValue) {

    showCenterModal({

      title:
        "Ticket URL Required",

      message:
        "Please enter a Ticket URL.",

      type:
        "warning",

      cancelText:
        "Close"

    });

    return;

  }


  if (!ticketId) {

    showCenterModal({

      title:
        "Invalid Ticket",

      message:
        "Unable to get the Ticket ID from the Ticket URL provided.",

      type:
        "error",

      cancelText:
        "Close"

    });

    return;

  }


  if (!bug.bugTitle) {

    showCenterModal({

      title:
        "Bug Title Required",

      message:
        "Please enter a bug title.",

      type:
        "warning",

      cancelText:
        "Close"

    });

    return;

  }


  /* =======================================================
     DUPLICATE TICKET
  ======================================================= */

  const duplicate =
    bugs.some(
      existing => {

        const existingTicketId =
          getTicketId(
            existing
          );


        if (
          editingTicketId &&
          normalizeKey(
            existingTicketId
          ) ===
          normalizeKey(
            editingTicketId
          )
        ) {

          return false;

        }


        return (
          existingTicketId &&
          normalizeKey(
            existingTicketId
          ) ===
          normalizeKey(
            ticketId
          )
        );

      }
    );


  if (duplicate) {

    showCenterModal({

      title:
        "Duplicate Ticket",

      message:
        `Ticket #${ticketId} already exists.`,

      type:
        "warning",

      cancelText:
        "Close"

    });

    return;

  }


  /* =======================================================
     EDIT EXISTING BUG
  ======================================================= */

  if (editingTicketId) {

    const index =
      bugs.findIndex(
        existing =>
          normalizeKey(
            getTicketId(
              existing
            )
          ) ===
          normalizeKey(
            editingTicketId
          )
      );


    if (index !== -1) {

      bugs[index] =
        bug;


      saveBugs();


      currentPage =
        1;


      closeBugFormModal();

      refreshAllViews();


      showNotification(
        `Bug #${ticketId} has been updated.`,
        "success",
        "Bug updated"
      );


      return;

    }

  }


  /* =======================================================
     ADD NEW BUG
  ======================================================= */

  bugs.push(
    bug
  );


  saveBugs();


  currentPage =
    1;


  closeBugFormModal();

  refreshAllViews();


  showNotification(
    `Bug #${ticketId} added successfully.`,
    "success",
    "Bug added"
  );

}


/* =========================================================
   DELETE BUG
========================================================= */

function confirmDeleteBug(
  ticketId
) {

  const bug =
    bugs.find(
      item =>
        normalizeKey(
          getTicketId(
            item
          )
        ) ===
        normalizeKey(
          ticketId
        )
    );


  if (!bug) {

    showCenterModal({

      title:
        "Bug Not Found",

      message:
        `Bug ticket #${ticketId} could not be found.`,

      type:
        "error",

      cancelText:
        "Close"

    });

    return;

  }


  showCenterModal({

    title:
      "Delete Bug Ticket?",

    message:
      `Are you sure you want to delete ticket #${getTicketId(
        bug
      )}? This action cannot be undone.`,

    type:
      "confirm",

    confirmText:
      "Delete",

    cancelText:
      "Cancel",

    onConfirm:
      () =>
        deleteBug(
          getTicketId(
            bug
          )
        )

  });

}


function deleteBug(
  ticketId
) {

  const index =
    bugs.findIndex(
      bug =>
        normalizeKey(
          getTicketId(
            bug
          )
        ) ===
        normalizeKey(
          ticketId
        )
    );


  if (index === -1) {
    return;
  }


  bugs.splice(
    index,
    1
  );


  saveBugs();


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredBugs.length /
        pageSize
      )
    );


  if (
    currentPage >
    totalPages
  ) {

    currentPage =
      totalPages;

  }


  refreshAllViews();


  showNotification(
    `Bug #${ticketId} has been deleted.`,
    "success",
    "Bug deleted"
  );

}


/* =========================================================
   CLEAR ALL BUGS
========================================================= */

function clearAllBugs() {

  bugs = [];


  saveBugs();


  currentPage =
    1;


  refreshAllViews();


  showNotification(
    "All bug tickets have been removed.",
    "success",
    "Bug tracker cleared"
  );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
  value
) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}