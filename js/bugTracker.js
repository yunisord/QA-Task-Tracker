import { $ } from "./utils.js";

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
  return normalize(value).toLowerCase();
}


/* =========================================================
   EXTRACT TICKET ID FROM URL
========================================================= */

function extractTicketId(ticketUrl) {

  const url =
    normalize(ticketUrl);

  if (!url) {
    return "";
  }

  /*
    Example:

    https://gitlab.ntt.lan/game/bingo/bingo-pilipino/-/issues/468

    Result:
    468

    The URL itself is NOT modified.
  */

  const match =
    url.match(
      /\/([^/?#]+)\/?(?:[?#].*)?$/
    );

  if (!match) {
    return "";
  }

  return normalize(
    match[1]
  );
}


/* =========================================================
   GET TICKET ID
========================================================= */

function getTicketId(bug) {

  /*
    Ticket ID is now automatically
    generated from Ticket URL.

    Existing old records that still
    contain ticketId are supported so
    previously imported data does not
    immediately break.
  */

  if (bug.ticketUrl) {

    const extractedId =
      extractTicketId(
        bug.ticketUrl
      );

    if (extractedId) {
      return extractedId;
    }
  }


  /*
    Backward compatibility for
    previously saved records.
  */
  return normalize(
    bug.ticketId ||
    bug["Ticket ID"] ||
    bug.ticket ||
    bug.id
  );
}


/* =========================================================
   NORMALIZE BUG
========================================================= */

function normalizeBug(row) {

  const ticketUrl =
    normalize(
      row.ticketUrl ||
      row["Ticket URL"] ||
      row.ticketURL ||
      row.url ||
      row.URL ||
      row.link ||
      row.Link
    );


  return {

    game: normalize(
      row.game ||
      row.Game
    ),

    build: normalize(
      row.build ||
      row.Build
    ),

    /*
      Ticket ID is automatically
      derived from Ticket URL.
    */
    ticketId:
      extractTicketId(
        ticketUrl
      ) ||
      normalize(
        row.ticketId ||
        row["Ticket ID"] ||
        row.ticket ||
        row.id
      ),

    /*
      Keep the ORIGINAL URL.
      Do not modify or normalize
      the actual URL structure.
    */
    ticketUrl: ticketUrl,

    product: normalize(
      row.product ||
      row.Product
    ),

    bugTitle: normalize(
      row.bugTitle ||
      row["Bug Title"] ||
      row.title ||
      row.Title
    ),

    priority: normalize(
      row.priority ||
      row.Priority
    ),

    dateCreated: normalize(
      row.dateCreated ||
      row["Date Created"]
    ),

    status: normalize(
      row.status ||
      row.Status
    ),

    environment: normalize(
      row.environment ||
      row.Environment
    ),

    deviceBrowser: normalize(
      row.deviceBrowser ||
      row["Device/Browser"] ||
      row.device ||
      row.browser
    ),

    createdBy: normalize(
      row.createdBy ||
      row["Created By"]
    ),

    assignedTo: normalize(
      row.assignedTo ||
      row["Assigned To"]
    ),

    validatedBy: normalize(
      row.validatedBy ||
      row["Validated By"]
    ),

    fixedBuild: normalize(
      row.fixedBuild ||
      row["Fixed Build"]
    ),

    dateResolved: normalize(
      row.dateResolved ||
      row["Date Resolved"]
    ),

    remarks: normalize(
      row.remarks ||
      row.Remarks
    )
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
   Ticket ID comes from Ticket URL.
========================================================= */

function deduplicateBugs(list) {

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
        keep the row but do not use
        an empty Ticket ID as the key.
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
        Ticket ID already exists:
        keep the FIRST record.
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

async function importFile(file) {

  if (!file) return;


  try {

    const extension =
      file.name
        .split(".")
        .pop()
        .toLowerCase();


    let importedRows = [];


    if (
      extension === "json"
    ) {

      importedRows =
        await readJSON(
          file
        );

    } else if (
      extension === "csv"
    ) {

      importedRows =
        await readCSV(
          file
        );

    } else if (
      extension === "xlsx" ||
      extension === "xls"
    ) {

      importedRows =
        await readExcel(
          file
        );

    } else {

      alert(
        "Unsupported file type."
      );

      return;
    }


    if (
      !Array.isArray(
        importedRows
      ) ||
      importedRows.length === 0
    ) {

      alert(
        "No bug records were found in the imported file."
      );

      return;
    }


    /*
      Normalize imported rows.

      Ticket ID is generated
      automatically from Ticket URL.
    */
    const normalizedImported =
      importedRows
        .map(
          normalizeBug
        )
        .filter(
          bug => {

            return (
              bug.ticketUrl ||
              bug.ticketId ||
              bug.bugTitle
            );

          }
        );


    /*
      Count existing Ticket IDs.
    */
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


    /*
      Merge existing + imported records.

      Ticket number controls
      duplicate checking.
    */
    const mergedBugs =
      deduplicateBugs([
        ...bugs,
        ...normalizedImported
      ]);


    /*
      Calculate new unique tickets.
    */
    const newTicketCount =
      mergedBugs.filter(
        bug => {

          const ticketId =
            getTicketId(
              bug
            );


          return (
            ticketId &&
            !existingTicketIds.has(
              normalizeKey(
                ticketId
              )
            )
          );

        }
      ).length;


    bugs =
      mergedBugs;


    saveBugs();


    currentPage = 1;


    renderBugTracker();


    closeImportModal();


    alert(
      `${newTicketCount} new bug ticket(s) imported successfully.`
    );

  } catch (error) {

    console.error(
      "Import failed:",
      error
    );

    alert(
      "Unable to import the file. Please check the file format."
    );
  }
}


/* =========================================================
   CSV
========================================================= */

function readCSV(file) {

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
              event.target.result;


            const rows =
              parseCSV(
                text
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


function parseCSV(text) {

  const rows = [];

  let row = [];

  let value = "";

  let insideQuotes =
    false;


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
      char === "," &&
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
            cell.trim() !== ""
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
          cell.trim() !== ""
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

function readJSON(file) {

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


            /*
              Also support:

              {
                "bugs": [...]
              }
            */
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

function readExcel(file) {

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
            "SheetJS is not loaded. Add the XLSX script before app.js."
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


            const firstSheet =
              workbook.Sheets[
                workbook.SheetNames[0]
              ];


            const data =
              XLSX.utils.sheet_to_json(
                firstSheet,
                {
                  defval: ""
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


        /*
          Search includes:
          Bug Title
          Ticket Number
          Game
          Build
          etc.
        */
        const searchableText = [

          bug.bugTitle,
          ticketId,
          bug.game,
          bug.build,
          bug.product,
          bug.priority,
          bug.status,
          bug.environment,
          bug.deviceBrowser,
          bug.createdBy,
          bug.assignedTo,
          bug.validatedBy,
          bug.fixedBuild,
          bug.dateResolved,
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


  const games = [
    ...new Set(
      bugs
        .map(
          bug =>
            bug.game
        )
        .filter(Boolean)
    )
  ].sort();


  const statuses = [
    ...new Set(
      bugs
        .map(
          bug =>
            bug.status
        )
        .filter(Boolean)
    )
  ].sort();


  gameSelect.innerHTML = `
    <option value="all">
      All Games
    </option>

    ${games
      .map(
        game => `
          <option value="${escapeHTML(
            game
          )}">
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
          <option value="${escapeHTML(
            status
          )}">
            ${escapeHTML(
              status
            )}
          </option>
        `
      )
      .join("")}
  `;


  if (
    games.some(
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
          "in-progress",
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


  const games =
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
      games.size;
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
          colspan="10"
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
========================================================= */

function createBugRow(bug) {

  const ticketId =
    getTicketId(
      bug
    );


  /*
    Ticket number is displayed
    as #468.

    The ORIGINAL Ticket URL is
    used as the href.

    Example:

    Display:
    #468

    href:
    https://gitlab.ntt.lan/game/bingo/bingo-pilipino/-/issues/468
  */

  const ticketCell =
    bug.ticketUrl && ticketId
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

      <!-- GAME -->
      <td>
        ${escapeHTML(
          bug.game ||
          "—"
        )}
      </td>


      <!-- BUILD -->
      <td>
        <span class="buildText">
          ${escapeHTML(
            bug.build ||
            "—"
          )}
        </span>
      </td>


      <!-- TICKET -->
      <td class="ticketIdCell">
        ${ticketCell}
      </td>


      <!-- BUG TITLE -->
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


      <!-- PRIORITY -->
      <td>
        ${createPriorityPill(
          bug.priority
        )}
      </td>


      <!-- DATE CREATED -->
      <td>
        ${escapeHTML(
          bug.dateCreated ||
          "—"
        )}
      </td>


      <!-- STATUS -->
      <td>
        ${createStatusPill(
          bug.status
        )}
      </td>


      <!-- CREATED BY -->
      <td>
        ${escapeHTML(
          bug.createdBy ||
          "—"
        )}
      </td>


      <!-- VALIDATED BY -->
      <td>
        ${escapeHTML(
          bug.validatedBy ||
          "—"
        )}
      </td>


      <!-- REMARKS -->
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


      <!-- ACTIONS -->
      <td>

        <div class="bugActions">

          <button
            type="button"
            class="bugAction view"
            data-ticket="${escapeHTML(
              ticketId
            )}"
            title="View Details"
          >
            👁
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

      pages.push(i);
    }

  } else {

    pages.push(1);


    if (
      currentPage > 4
    ) {

      pages.push("...");
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

      pages.push(i);
    }


    if (
      currentPage <
      totalPages - 3
    ) {

      pages.push("...");
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
        "Game",
        bug.game
      )}

      ${detailItem(
        "Build",
        bug.build
      )}

      ${detailItem(
        "Ticket",
        ticketIdValue
          ? `#${ticketIdValue}`
          : ""
      )}

      ${detailItem(
        "Ticket URL",
        bug.ticketUrl
      )}

      ${detailItem(
        "Product",
        bug.product
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
        "Environment",
        bug.environment
      )}

      ${detailItem(
        "Device / Browser",
        bug.deviceBrowser
      )}

      ${detailItem(
        "Created By",
        bug.createdBy
      )}

      ${detailItem(
        "Assigned To",
        bug.assignedTo
      )}

      ${detailItem(
        "Validated By",
        bug.validatedBy
      )}

      ${detailItem(
        "Fixed Build",
        bug.fixedBuild
      )}

      ${detailItem(
        "Date Resolved",
        bug.dateResolved
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
      class="bugPill priority-${key}"
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
      class="bugPill status-${key}"
    >
      ${escapeHTML(
        status
      )}
    </span>
  `;
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
      saveNewBug
    );


  /* =======================================================
     CLOSE ADD BUG MODAL
  ======================================================= */

  const closeBugButton =
    $("closeBugModal");


  if (closeBugButton) {

    closeBugButton.addEventListener(
      "click",
      closeBugFormModal
    );
  }


  const cancelBugButton =
    $("cancelBug");


  if (cancelBugButton) {

    cancelBugButton.addEventListener(
      "click",
      closeBugFormModal
    );
  }


  /* =======================================================
     CLOSE ADD BUG MODAL
     WHEN CLICKING OUTSIDE
  ======================================================= */

  const bugModal =
    $("bugModal");


  if (bugModal) {

    bugModal.addEventListener(
      "click",
      event => {

        if (
          event.target ===
          bugModal
        ) {

          closeBugFormModal();
        }

      }
    );
  }


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
     PAGE NUMBERS + BUG DETAILS
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


      const ticketButton =
        event.target.closest(
          ".bugAction.view"
        );


      if (ticketButton) {

        openBugDetails(
          ticketButton.dataset.ticket
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

        return;
      }


      const confirmed =
        confirm(
          "Clear all imported bug tickets?"
        );


      if (!confirmed) {
        return;
      }


      bugs = [];


      saveBugs();


      currentPage = 1;


      renderBugTracker();

    }
  );


  /* =======================================================
     CLOSE IMPORT MODAL
     WHEN CLICKING OUTSIDE
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
     WHEN CLICKING OUTSIDE
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


  renderBugTracker();
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

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


/* =========================================================
   ADD BUG MODAL
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


  const bugId =
    $("bugId");


  if (bugId) {

    bugId.value = "";
  }


  const title =
    $("bugModalTitle");


  if (title) {

    title.textContent =
      "Add Bug";
  }


  const subtitle =
    $("bugModalSubtitle");


  if (subtitle) {

    subtitle.textContent =
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


  modal.classList.add(
    "show"
  );
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


  select.innerHTML = `
    <option value="">
      Select game
    </option>
  `;


  const games = [
    ...new Set(
      bugs
        .map(
          bug =>
            bug.game
        )
        .filter(Boolean)
    )
  ].sort();


  games.forEach(
    game => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        game;


      option.textContent =
        game;


      select.appendChild(
        option
      );

    }
  );
}


/* =========================================================
   CLOSE ADD BUG MODAL
========================================================= */

function closeBugFormModal() {

  const modal =
    $("bugModal");


  if (!modal) {

    console.error(
      "bugModal not found."
    );

    return;
  }


  modal.classList.remove(
    "show"
  );
}


/* =========================================================
   SAVE NEW BUG
========================================================= */

function saveNewBug(event) {

  event.preventDefault();


  const form =
    $("bugForm");


  if (!form) {

    console.error(
      "bugForm not found."
    );

    return;
  }


  const formData =
    new FormData(
      form
    );


  /*
    Get Ticket URL FIRST.
    Ticket ID will automatically
    come from the last part.
  */
  const ticketUrl =
    normalize(
      formData.get(
        "ticketUrl"
      )
    );


  const ticketId =
    extractTicketId(
      ticketUrl
    );


  const bug =
    normalizeBug({

      game:
        formData.get(
          "game"
        ),

      build:
        formData.get(
          "build"
        ),

      ticketUrl:
        ticketUrl,

      bugTitle:
        formData.get(
          "bugTitle"
        ),

      priority:
        formData.get(
          "priority"
        ),

      dateCreated:
        formData.get(
          "dateCreated"
        ),

      status:
        formData.get(
          "status"
        ),

      createdBy:
        formData.get(
          "createdBy"
        ),

      validatedBy:
        formData.get(
          "validatedBy"
        ),

      remarks:
        formData.get(
          "remarks"
        )

    });


  /* =======================================================
     VALIDATION
  ======================================================= */

  if (!bug.game) {

    alert(
      "Please select a game."
    );

    return;
  }


  if (!ticketUrl) {

    alert(
      "Please enter a Ticket URL."
    );

    return;
  }


  if (!ticketId) {

    alert(
      "Unable to get the Ticket ID from the Ticket URL."
    );

    return;
  }


  if (!bug.bugTitle) {

    alert(
      "Please enter a bug title."
    );

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

    alert(
      `Ticket #${ticketId} already exists.`
    );

    return;
  }


  /* =======================================================
     ADD BUG
  ======================================================= */

  bugs.push(
    bug
  );


  saveBugs();


  currentPage =
    1;


  renderBugTracker();


  closeBugFormModal();


  alert(
    `Bug #${ticketId} added successfully.`
  );
}