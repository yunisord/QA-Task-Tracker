import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
  express.json()
);

const db = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

const PORT =
  Number(process.env.PORT || 3000);

app.get("/api/health/db", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT current_user, current_database(), NOW() AS server_time"
    );

    res.json({
      ok: true,
      database: result.rows[0]
    });
  } catch (error) {
    console.error("PostgreSQL health check failed:", error);

    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

const GITLAB_BASE_URL =
  String(
    process.env.GITLAB_BASE_URL ||
      "https://gitlab.ntt.lan"
  ).replace(/\/+$/, "");

const GITLAB_TOKEN =
  String(
    process.env.GITLAB_TOKEN || ""
  ).trim();

const GROUP_IDS =
  String(
    process.env.GITLAB_GROUP_IDS ||
      "218,219"
  )
    .split(",")
    .map(value => Number(value.trim()))
    .filter(Number.isInteger);

const POLL_INTERVAL_MS =
  Math.max(
    5000,
    Number(
      process.env.GITLAB_POLL_INTERVAL_MS ||
        15000
    )
  );


if (!GITLAB_TOKEN) {

  console.error(
    "ERROR: GITLAB_TOKEN is not configured."
  );

  process.exit(1);

}


/* =========================================================
   GAME MAPPING
========================================================= */

const PROJECT_GAME_MAP = {

  "game/bingo/bingo-base":
    "Bingo Base",

  "game/bingo/bingo-go":
    "Bingo Go",

  "game/bingo/bingo-pilipino":
    "Bingo Pilipino",

  "game/bingo/champion-ii":
    "Champion II",

  "game/bingo/multi-mega":
    "Multi Mega",

  "game/bingo/multi-plus":
    "Multi Plus",

  "game/bingo/plus-3":
    "Plus 3",

  "game/bingo/viva-mexico":
    "Viva Mexico",


  "game/slots/cafe-charm-fortune":
    "Cafe Charm Fortune",

  "game/slots/dragon-jewels":
    "Dragon Jewels",

  "game/slots/dragons-fortune":
    "Dragons Fortune",

  "game/slots/embracing-good-fortune":
    "Embracing Good Fortune",

  "game/slots/filipina-reels":
    "Filipina Reels",

  "game/slots/flow-of-fortune":
    "Flow of Fortune",

  "game/slots/fruitysplash":
    "FruitySplash",

  "game/slots/sally-cocos":
    "Sally Cocos",

  "game/slots/sallys-sari-store":
    "Sallys Sari Store",

  "game/slots/summer-charm-fortune":
    "Summer Charm Fortune"

};


/* =========================================================
   GITLAB STATE
========================================================= */

let gitlabBugs = [];

let lastSyncAt = null;

let lastSyncError = null;

/*
  Each GitLab group keeps its own polling checkpoint.
  This allows incremental polling without mixing
  update timestamps between groups.
*/
const groupSyncCheckpoints = new Map();

const clients = new Set();


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


function projectToGame(project) {

  const fullPath =
    normalize(
      project?.path_with_namespace
    );

  if (
    PROJECT_GAME_MAP[
      fullPath
    ]
  ) {

    return PROJECT_GAME_MAP[
      fullPath
    ];

  }


  const path =
    fullPath
      .toLowerCase()
      .replace(/^game\//, "");


  const parts =
    path.split("/");

  const projectName =
    parts.at(-1) || "";


  return projectName
    .split("-")
    .map(
      part =>
        part
          ? part[0].toUpperCase() +
            part.slice(1)
          : ""
    )
    .join(" ");

}


function getLabel(
  labels,
  prefix
) {

  if (!Array.isArray(labels)) {
    return "";
  }


  const found =
    labels.find(
      label =>
        normalize(label)
          .toLowerCase()
          .startsWith(
            prefix.toLowerCase()
          )
    );


  if (!found) {
    return "";
  }


  return normalize(
    found.slice(prefix.length)
  );

}


function getPriority(labels) {

  const priority =
    getLabel(
      labels,
      "Priority:"
    );

  return priority;

}


function getProdState(labels) {

  return getLabel(
    labels,
    "prod-state:"
  );

}


function getCategory(
  game
) {

  const bingoGames = new Set([

    "Bingo Base",
    "Bingo Go",
    "Bingo Pilipino",
    "Champion II",
    "Multi Mega",
    "Multi Plus",
    "Plus 3",
    "Viva Mexico"

  ]);


  if (
    bingoGames.has(
      game
    )
  ) {

    return "Bingo Games";

  }


  return "Slot Games";

}


function extractBuild(
  description
) {

  const text =
    String(
      description || ""
    );


  const match =
    text.match(
      /\*\*Build:\*\*\s*[\r\n]+([^\r\n]+)/i
    );


  return normalize(
    match?.[1] || ""
  );

}


function extractEnvironment(
  description
) {

  const text =
    String(
      description || ""
    );


  const match =
    text.match(
      /\*\*Environment:\*\*\s*[\r\n]+([^\r\n]+)/i
    );


  return normalize(
    match?.[1] || ""
  );

}


function extractDevice(
  description
) {

  const text =
    String(
      description || ""
    );


  const match =
    text.match(
      /\*\*Device:\*\*\s*[\r\n]+([^\r\n]+)/i
    );


  return normalize(
    match?.[1] || ""
  );

}


function buildRemarks(
  issue
) {

  const environment =
    extractEnvironment(
      issue.description
    );

  const device =
    extractDevice(
      issue.description
    );


  const parts = [];


  if (environment) {

    parts.push(
      `Environment: ${environment}`
    );

  }


  if (device) {

    parts.push(
      `Device: ${device}`
    );

  }


  return parts.join(" | ");

}


/* =========================================================
   GITLAB FETCH
========================================================= */

async function gitlabRequest(
  url
) {

  const response =
    await fetch(
      url,
      {
        headers: {
          "PRIVATE-TOKEN":
            GITLAB_TOKEN,

          "Accept":
            "application/json"
        }
      }
    );


  if (!response.ok) {

    const body =
      await response.text();


    throw new Error(
      `GitLab ${response.status}: ${body.slice(
        0,
        500
      )}`
    );

  }


  return response.json();

}


async function fetchGroupIssues(
  groupId,
  updatedAfter = null
) {

  const allIssues = [];

  let page = 1;


  while (true) {

    const params =
      new URLSearchParams({

        scope:
          "all",

        state:
          "all",

        per_page:
          "100",

        page:
          String(page)

      });


    if (
      updatedAfter
    ) {

      params.set(
        "updated_after",
        updatedAfter
      );

    }


    const url =
      `${GITLAB_BASE_URL}/api/v4/groups/${groupId}/issues?${params}`;


    const issues =
      await gitlabRequest(
        url
      );


    if (
      !Array.isArray(
        issues
      )
    ) {

      break;

    }


    allIssues.push(
      ...issues
    );


    if (
      issues.length < 100
    ) {

      break;

    }


    page++;

  }


  return allIssues;

}


/* =========================================================
   NORMALIZE GITLAB ISSUE
========================================================= */

function normalizeGitLabIssue(
  issue
) {

  const title =
    normalize(
      issue.title
    );


  if (
    !title
      .toUpperCase()
      .startsWith("[BUG]")
  ) {

    return null;

  }


  const game =
    projectToGame(
      issue.references
        ? {
            path_with_namespace:
              issue.references.full
          }
        : null
    );


  /*
    GitLab group issue responses can contain
    references but not always the complete
    project path.

    The project information is therefore
    also resolved from issue.web_url.
  */

  const url =
    normalize(
      issue.web_url
    );


  const projectPath =
    extractProjectPath(
      url
    );


  const mappedGame =
    PROJECT_GAME_MAP[
      projectPath
    ] ;
if (!mappedGame){
return null;
}


  const labels =
    Array.isArray(
      issue.labels
    )
      ? issue.labels
      : [];


  const prodState =
    getProdState(
      labels
    );


  const status =
    prodState ||
    (
      normalize(
        issue.state
      )
        .toLowerCase() ===
      "closed"
        ? "closed"
        : "opened"
    );


  const author =
    normalize(
      issue.author?.name ||
      issue.author?.username ||
      ""
    );


  const closedBy =
    normalize(
      issue.closed_by?.name ||
      issue.closed_by?.username ||
      ""
    );


  const priority =
    getPriority(
      labels
    );


  const build =
    extractBuild(
      issue.description
    );


  return {

    build,

    ticketUrl:
      url,

    game:
      mappedGame,

    category:
      getCategory(
        mappedGame
      ),

    bugTitle:
      title,

    priority,

    dateCreated:
      normalizeDate(
        issue.created_at
      ),

    status,

    createdBy:
      author,

    validatedBy:
      closedBy,

    remarks:
      buildRemarks(
        issue
      ),

    ticketId:
      String(
        issue.iid
      ),

    source:
      "gitlab",

    gitlabIssueId:
      issue.id,

    gitlabProjectId:
      issue.project_id,

    gitlabProjectPath:
      projectPath,

    gitlabUpdatedAt:
      issue.updated_at,

    gitlabState:
      issue.state

  };

}


function extractProjectPath(
  url
) {

  const marker =
    "/-/issues/";


  const index =
    url.indexOf(
      marker
    );


  if (
    index === -1
  ) {

    return "";

  }


  return url
    .slice(
      0,
      index
    )
    .replace(
      /^https?:\/\/[^/]+\//,
      ""
    );

}


function normalizeDate(
  value
) {

  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return normalize(
      value
    );

  }


  return date
    .toISOString()
    .slice(
      0,
      10
    );

}


/* =========================================================
   SYNC
========================================================= */

async function syncGitLab() {

  try {

    /*
      First sync:
      Fetch the complete GitLab issue set.

      Later syncs:
      Fetch only issues updated after the
      previous successful checkpoint.
    */

    const isInitialSync =
      gitlabBugs.length === 0;


    const collected = [];

    let totalFetched = 0;

    let changedCount = 0;


    for (
      const groupId
      of GROUP_IDS
    ) {

      const updatedAfter =
        isInitialSync
          ? null
          : groupSyncCheckpoints.get(
              groupId
            ) || null;


      const issues =
        await fetchGroupIssues(
          groupId,
          updatedAfter
        );


      totalFetched +=
        issues.length;


      /*
        Advance the checkpoint only after
        the GitLab request succeeded.
      */
      const syncCheckpoint =
        new Date().toISOString();


      for (
        const issue
        of issues
      ) {

        const bug =
          normalizeGitLabIssue(
            issue
          );


        if (bug) {

          collected.push(
            bug
          );

        }

      }


      groupSyncCheckpoints.set(
        groupId,
        syncCheckpoint
      );

    }


    /*
      Initial sync replaces the empty cache.
    */
    if (
      isInitialSync
    ) {

      const unique =
        new Map();


      for (
        const bug
        of collected
      ) {

        const key =
          `${bug.gitlabProjectId}:${bug.ticketId}`;


        unique.set(
          key,
          bug
        );

      }


      gitlabBugs =
        Array.from(
          unique.values()
        );


      changedCount =
        gitlabBugs.length;

    } else {

      /*
        Incremental sync:
        Keep every existing ticket and replace
        only tickets that are new or changed.
      */

      const existing =
        new Map();


      for (
        const bug
        of gitlabBugs
      ) {

        const key =
          `${bug.gitlabProjectId}:${bug.ticketId}`;


        existing.set(
          key,
          bug
        );

      }


      for (
        const bug
        of collected
      ) {

        const key =
          `${bug.gitlabProjectId}:${bug.ticketId}`;


        const previous =
          existing.get(
            key
          );


        if (
          !previous ||
          previous.gitlabUpdatedAt !==
            bug.gitlabUpdatedAt
        ) {

          existing.set(
            key,
            bug
          );

          changedCount++;

        }

      }


      if (
        changedCount > 0
      ) {

        gitlabBugs =
          Array.from(
            existing.values()
          );

      }

    }


    lastSyncAt =
      new Date().toISOString();

    lastSyncError =
      null;


    /*
      Nothing changed:
      Keep the existing cache and do not
      send an unnecessary SSE update.
    */
    if (
      changedCount === 0
    ) {

      console.log(
        `[GitLab] No changes. Cached ${gitlabBugs.length} [BUG] issues.`
      );

      return;

    }


    broadcast();


    if (
      isInitialSync
    ) {

      console.log(
        `[GitLab] Initial sync: cached ${gitlabBugs.length} [BUG] issues.`
      );

    } else {

      console.log(
        `[GitLab] Updated ${changedCount} [BUG] issues. Cache: ${gitlabBugs.length}.`
      );

    }

  } catch (error) {

    lastSyncError =
      error.message;

    console.error(
      "[GitLab] Sync failed:",
      error
    );

    console.error(
      "[GitLab] Error message:",
      error?.message
    );

    console.error(
      "[GitLab] Error cause:",
      error?.cause
    );

    console.error(
      "[GitLab] Error stack:",
      error?.stack
    );


    broadcast();

  }

}


/* =========================================================
   SSE
========================================================= */

function sendSSE(
  response,
  event,
  data
) {

  response.write(
    `event: ${event}\n`
  );

  response.write(
    `data: ${JSON.stringify(data)}\n\n`
  );

}


function broadcast() {

  const payload = {

    bugs:
      gitlabBugs,

    syncedAt:
      lastSyncAt,

    error:
      lastSyncError

  };


  for (
    const response
    of clients
  ) {

    sendSSE(
      response,
      "bugs",
      payload
    );

  }

}


function broadcastDataChange(
  resource
) {

  const payload = {

    resource,
    timestamp:
      new Date().toISOString()

  };


  for (
    const response
    of clients
  ) {

    sendSSE(
      response,
      "data",
      payload
    );

  }

}


/* =========================================================
   POSTGRESQL CRUD API
========================================================= */

/*
 * Convert a database task row into the
 * frontend task object shape.
 */
function mapTask(row) {

  return {
    id:
      String(row.id),

    member:
      row.assigned_to || "",

    task:
      row.title || "",

    game:
      row.game || "",

    start:
      row.start_date
        ? String(row.start_date)
        : "",

    due:
      row.due_date
        ? String(row.due_date)
        : "",

    ticket:
      row.ticket_url || "",

    status:
      row.status || "To Do",

    remarks:
      row.remarks || "",

    updated:
      row.updated_at
        ? new Date(row.updated_at).toISOString()
        : null

  };

}


/* =========================================================
   MEMBERS
========================================================= */

app.get(
  "/api/members",
  async (req, res) => {

    try {

      const result =
        await db.query(`
          SELECT
            id,
            name
          FROM members
          ORDER BY id
        `);

      res.json({
        members:
          result.rows.map(
            row => row.name
          )
      });

    } catch (error) {

      console.error(
        "GET /api/members failed:",
        error
      );

      res.status(500).json({
        error:
          error.message
      });

    }

  }
);


app.post(
  "/api/members",
  async (req, res) => {

    const name =
      String(
        req.body?.name || ""
      ).trim();

    if (!name) {

      return res.status(400).json({
        error:
          "Member name is required."
      });

    }

    try {

      const duplicate =
        await db.query(
          `
            SELECT id
            FROM members
            WHERE LOWER(name) = LOWER($1)
            LIMIT 1
          `,
          [name]
        );

      if (duplicate.rowCount > 0) {

        return res.status(409).json({
          error:
            "That member already exists."
        });

      }

      const result =
        await db.query(
          `
            INSERT INTO members (
              name,
              updated_at
            )
            VALUES (
              $1,
              NOW()
            )
            RETURNING id, name
          `,
          [name]
        );

      broadcastDataChange("members");

      res.status(201).json({
        member:
          result.rows[0].name
      });

    } catch (error) {

      console.error(
        "POST /api/members failed:",
        error
      );

      res.status(500).json({
        error:
          error.message
      });

    }

  }
);


app.put(
  "/api/members/:id",
  async (req, res) => {

    const id =
      Number(req.params.id);

    const name =
      String(
        req.body?.name || ""
      ).trim();

    if (!Number.isInteger(id)) {

      return res.status(400).json({
        error:
          "Invalid member ID."
      });

    }

    if (!name) {

      return res.status(400).json({
        error:
          "Member name is required."
      });

    }

    const client =
      await db.connect();

    try {

      await client.query(
        "BEGIN"
      );

      const current =
        await client.query(
          `
            SELECT name
            FROM members
            WHERE id = $1
            FOR UPDATE
          `,
          [id]
        );

      if (
        current.rowCount === 0
      ) {

        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          error:
            "Member not found."
        });

      }

      const oldName =
        current.rows[0].name;

      const duplicate =
        await client.query(
          `
            SELECT id
            FROM members
            WHERE LOWER(name) = LOWER($1)
              AND id <> $2
            LIMIT 1
          `,
          [name, id]
        );

      if (duplicate.rowCount > 0) {

        await client.query(
          "ROLLBACK"
        );

        return res.status(409).json({
          error:
            "That member already exists."
        });

      }

      await client.query(
        `
          UPDATE members
          SET
            name = $1,
            updated_at = NOW()
          WHERE id = $2
        `,
        [name, id]
      );

      /*
       * Tasks store member names rather
       * than member IDs, so keep them
       * synchronized inside the same
       * transaction.
       */
      await client.query(
        `
          UPDATE tasks
          SET
            assigned_to = $1,
            updated_at = NOW()
          WHERE assigned_to = $2
        `,
        [name, oldName]
      );

      await client.query(
        "COMMIT"
      );

      broadcastDataChange("members");

      res.json({
        member:
          name
      });

    } catch (error) {

      await client.query(
        "ROLLBACK"
      );

      console.error(
        "PUT /api/members/:id failed:",
        error
      );

      res.status(500).json({
        error:
          error.message
      });

    } finally {

      client.release();

    }

  }
);


app.delete(
  "/api/members/:id",
  async (req, res) => {

    const id =
      Number(req.params.id);

    if (!Number.isInteger(id)) {

      return res.status(400).json({
        error:
          "Invalid member ID."
      });

    }

    const client =
      await db.connect();

    try {

      await client.query(
        "BEGIN"
      );

      const current =
        await client.query(
          `
            SELECT name
            FROM members
            WHERE id = $1
            FOR UPDATE
          `,
          [id]
        );

      if (
        current.rowCount === 0
      ) {

        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          error:
            "Member not found."
        });

      }

      const name =
        current.rows[0].name;

      await client.query(
        `
          DELETE FROM tasks
          WHERE assigned_to = $1
        `,
        [name]
      );

      await client.query(
        `
          DELETE FROM members
          WHERE id = $1
        `,
        [id]
      );

      await client.query(
        "COMMIT"
      );

      broadcastDataChange("members");

      res.json({
        ok: true
      });

    } catch (error) {

      await client.query(
        "ROLLBACK"
      );

      console.error(
        "DELETE /api/members/:id failed:",
        error
      );

      res.status(500).json({
        error:
          error.message
      });

    } finally {

      client.release();

    }

  }
);


/* =========================================================
   GAMES
========================================================= */

app.get(
  "/api/games",
  async (req, res) => {

    try {

      const result =
        await db.query(`
          SELECT
            id,
            name,
            category
          FROM games
          ORDER BY id
        `);

      const games = {
        "Bingo Games": [],
        "Slot Games": []
      };

      for (
        const row of result.rows
      ) {

        if (
          !games[row.category]
        ) {
          games[row.category] = [];
        }

        games[row.category].push(
          row.name
        );

      }

      res.json({
        games
      });

    } catch (error) {

      console.error(
        "GET /api/games failed:",
        error
      );

      res.status(500).json({
        error:
          error.message
      });

    }

  }
);


app.post(
  "/api/games",
  async (req, res) => {

    const name =
      String(
        req.body?.name || ""
      ).trim();

    const category =
      String(
        req.body?.category || ""
      ).trim();

    if (!name) {

      return res.status(400).json({
        error:
          "Game name is required."
      });

    }

    if (!category) {

      return res.status(400).json({
        error:
          "Game category is required."
      });

    }

    try {

      const duplicate =
        await db.query(
          `
            SELECT id
            FROM games
            WHERE LOWER(name) = LOWER($1)
            LIMIT 1
          `,
          [name]
        );

      if (duplicate.rowCount > 0) {

        return res.status(409).json({
          error:
            "That game already exists."
        });

      }

      const result =
        await db.query(
          `
            INSERT INTO games (
              name,
              category,
              updated_at
            )
            VALUES (
              $1,
              $2,
              NOW()
            )
            RETURNING id, name, category
          `,
          [name, category]
        );

      broadcastDataChange("games");

      res.status(201).json({
        game:
          result.rows[0]
      });

    } catch (error) {

      console.error(
        "POST /api/games failed:",
        error
      );

      res.status(500).json({
        error:
          error.message
      });

    }

  }
);


app.put(
  "/api/games/:id",
  async (req, res) => {

    const id =
      Number(req.params.id);

    const name =
      String(
        req.body?.name || ""
      ).trim();

    const category =
      String(
        req.body?.category || ""
      ).trim();

    if (!Number.isInteger(id)) {

      return res.status(400).json({
        error:
          "Invalid game ID."
      });

    }

    if (!name || !category) {

      return res.status(400).json({
        error:
          "Game name and category are required."
      });

    }

    const client =
      await db.connect();

    try {

      await client.query(
        "BEGIN"
      );

      const current =
        await client.query(
          `
            SELECT name
            FROM games
            WHERE id = $1
            FOR UPDATE
          `,
          [id]
        );

      if (
        current.rowCount === 0
      ) {

        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          error:
            "Game not found."
        });

      }

      const oldName =
        current.rows[0].name;

      const duplicate =
        await client.query(
          `
            SELECT id
            FROM games
            WHERE LOWER(name) = LOWER($1)
              AND id <> $2
            LIMIT 1
          `,
          [name, id]
        );

      if (duplicate.rowCount > 0) {

        await client.query(
          "ROLLBACK"
        );

        return res.status(409).json({
          error:
            "That game already exists."
        });

      }

      await client.query(
        `
          UPDATE games
          SET
            name = $1,
            category = $2,
            updated_at = NOW()
          WHERE id = $3
        `,
        [name, category, id]
      );

      /*
       * Tasks store game names, so keep
       * renamed games synchronized.
       */
      await client.query(
        `
          UPDATE tasks
          SET
            game = $1,
            updated_at = NOW()
          WHERE game = $2
        `,
        [name, oldName]
      );

      await client.query(
        "COMMIT"
      );

      broadcastDataChange("games");

      res.json({
        game: {
          id,
          name,
          category
        }
      });

    } catch (error) {

      await client.query(
        "ROLLBACK"
      );

      console.error(
        "PUT /api/games/:id failed:",
        error
      );

      res.status(500).json({
        error:
          error.message
      });

    } finally {

      client.release();

    }

  }
);


app.delete(
  "/api/games/:id",
  async (req, res) => {

    const id =
      Number(req.params.id);

    if (!Number.isInteger(id)) {

      return res.status(400).json({
        error:
          "Invalid game ID."
      });

    }

    const client =
      await db.connect();

    try {

      await client.query(
        "BEGIN"
      );

      const current =
        await client.query(
          `
            SELECT name
            FROM games
            WHERE id = $1
            FOR UPDATE
          `,
          [id]
        );

      if (
        current.rowCount === 0
      ) {

        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          error:
            "Game not found."
        });

      }

      const name =
        current.rows[0].name;

      await client.query(
        `
          DELETE FROM tasks
          WHERE game = $1
        `,
        [name]
      );

      await client.query(
        `
          DELETE FROM games
          WHERE id = $1
        `,
        [id]
      );

      await client.query(
        "COMMIT"
      );

      broadcastDataChange("games");

      res.json({
        ok: true
      });

    } catch (error) {

      await client.query(
        "ROLLBACK"
      );

      console.error(
        "DELETE /api/games/:id failed:",
        error
      );

      res.status(500).json({
        error:
          error.message
      });

    } finally {

      client.release();

    }

  }
);


/* =========================================================
   TASKS
========================================================= */

app.get(
  "/api/tasks",
  async (req, res) => {

    try {

      const result =
        await db.query(`
          SELECT
            id,
            title,
            game,
            status,
            assigned_to,
            due_date,
            ticket_url,
            remarks,
            start_date,
            updated_at
          FROM tasks
          ORDER BY id
        `);

      res.json({
        tasks:
          result.rows.map(
            mapTask
          )
      });

    } catch (error) {

      console.error(
        "GET /api/tasks failed:",
        error
      );

      res.status(500).json({
        error:
          error.message
      });

    }

  }
);


app.post(
  "/api/tasks",
  async (req, res) => {

    const body =
      req.body || {};

    const title =
      String(
        body.task || ""
      ).trim();

    const member =
      String(
        body.member || ""
      ).trim();

    const game =
      String(
        body.game || ""
      ).trim();

    const start =
      body.start || null;

    const due =
      body.due || null;

    const ticket =
      String(
        body.ticket || ""
      ).trim();

    const status =
      String(
        body.status || "To Do"
      ).trim();

    const remarks =
      String(
        body.remarks || ""
      ).trim();

    if (!title) {

      return res.status(400).json({
        error:
          "Task name is required."
      });

    }

    if (!member) {

      return res.status(400).json({
        error:
          "Member is required."
      });

    }

    if (!game) {

      return res.status(400).json({
        error:
          "Game is required."
      });

    }

    try {

      const result =
        await db.query(
          `
            INSERT INTO tasks (
              title,
              game,
              status,
              assigned_to,
              due_date,
              ticket_url,
              remarks,
              start_date,
              updated_at
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              NOW()
            )
            RETURNING
              id,
              title,
              game,
              status,
              assigned_to,
              due_date,
              ticket_url,
              remarks,
              start_date,
              updated_at
          `,
          [
            title,
            game,
            status,
            member,
            due,
            ticket,
            remarks,
            start
          ]
        );

      broadcastDataChange("tasks");

      res.status(201).json({
        task:
          mapTask(
            result.rows[0]
          )
      });

    } catch (error) {

      console.error(
        "POST /api/tasks failed:",
        error
      );

      res.status(500).json({
        error:
          error.message
      });

    }

  }
);


app.put(
  "/api/tasks/:id",
  async (req, res) => {

    const id =
      Number(req.params.id);

    if (!Number.isInteger(id)) {

      return res.status(400).json({
        error:
          "Invalid task ID."
      });

    }

    const body =
      req.body || {};

    const title =
      String(
        body.task || ""
      ).trim();

    const member =
      String(
        body.member || ""
      ).trim();

    const game =
      String(
        body.game || ""
      ).trim();

    const start =
      body.start || null;

    const due =
      body.due || null;

    const ticket =
      String(
        body.ticket || ""
      ).trim();

    const status =
      String(
        body.status || "To Do"
      ).trim();

    const remarks =
      String(
        body.remarks || ""
      ).trim();

    if (!title || !member || !game) {

      return res.status(400).json({
        error:
          "Task, member, and game are required."
      });

    }

    try {

      const result =
        await db.query(
          `
            UPDATE tasks
            SET
              title = $1,
              game = $2,
              status = $3,
              assigned_to = $4,
              due_date = $5,
              ticket_url = $6,
              remarks = $7,
              start_date = $8,
              updated_at = NOW()
            WHERE id = $9
            RETURNING
              id,
              title,
              game,
              status,
              assigned_to,
              due_date,
              ticket_url,
              remarks,
              start_date,
              updated_at
          `,
          [
            title,
            game,
            status,
            member,
            due,
            ticket,
            remarks,
            start,
            id
          ]
        );

      if (
        result.rowCount === 0
      ) {

        return res.status(404).json({
          error:
            "Task not found."
        });

      }

      broadcastDataChange("tasks");

      res.json({
        task:
          mapTask(
            result.rows[0]
          )
      });

    } catch (error) {

      console.error(
        "PUT /api/tasks/:id failed:",
        error
      );

      res.status(500).json({
        error:
          error.message
      });

    }

  }
);


app.delete(
  "/api/tasks/:id",
  async (req, res) => {

    const id =
      Number(req.params.id);

    if (!Number.isInteger(id)) {

      return res.status(400).json({
        error:
          "Invalid task ID."
      });

    }

    try {

      const result =
        await db.query(
          `
            DELETE FROM tasks
            WHERE id = $1
            RETURNING id
          `,
          [id]
        );

      if (
        result.rowCount === 0
      ) {

        return res.status(404).json({
          error:
            "Task not found."
        });

      }

      broadcastDataChange("tasks");

      res.json({
        ok: true
      });

    } catch (error) {

      console.error(
        "DELETE /api/tasks/:id failed:",
        error
      );

      res.status(500).json({
        error:
          error.message
      });

    }

  }
);


/* =========================================================
   API
========================================================= */

app.get(
  "/api/bugs",
  (req, res) => {

    res.json({

      bugs:
        gitlabBugs,

      syncedAt:
        lastSyncAt,

      error:
        lastSyncError

    });

  }
);


app.get(
  "/api/bugs/stream",
  (req, res) => {

    res.writeHead(
      200,
      {
        "Content-Type":
          "text/event-stream",

        "Cache-Control":
          "no-cache",

        "Connection":
          "keep-alive",

        "X-Accel-Buffering":
          "no"
      }
    );


    clients.add(
      res
    );


    sendSSE(
      res,
      "bugs",
      {
        bugs:
          gitlabBugs,

        syncedAt:
          lastSyncAt,

        error:
          lastSyncError
      }
    );


    req.on(
      "close",
      () => {

        clients.delete(
          res
        );

      }
    );

  }
);


/* =========================================================
   STATIC FRONTEND
========================================================= */

app.use(
  express.static(
    __dirname
  )
);


/* =========================================================
   START
========================================================= */

app.listen(
  PORT,
  () => {

    console.log(
      `QA Task Tracker running at http://localhost:${PORT}`
    );

    console.log(
      `GitLab groups: ${GROUP_IDS.join(", ")}`
    );

    console.log(
      `GitLab polling interval: ${POLL_INTERVAL_MS} ms`
    );

    syncGitLab();

    setInterval(
      syncGitLab,
      POLL_INTERVAL_MS
    );

  }
);
