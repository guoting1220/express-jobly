const bcrypt = require("bcrypt");

const db = require("../db.js");
const { BCRYPT_WORK_FACTOR } = require("../config");

const testJobIds = [];
const testTechIds = [];

async function commonBeforeAll() {
  // noinspection 
  await db.query("DELETE FROM companies");
  await db.query("DELETE FROM users");
  await db.query("DELETE FROM jobs");
  await db.query("DELETE FROM applications");
  await db.query("DELETE FROM technologies");
  await db.query("DELETE FROM requirements");
  await db.query("DELETE FROM techskills");

  await db.query(`
    INSERT INTO companies(handle, name, num_employees, description, logo_url)
    VALUES ('c1', 'C1', 1, 'Desc1', 'http://c1.img'),
           ('c2', 'C2', 2, 'Desc2', 'http://c2.img'),
           ('c3', 'C3', 3, 'Desc3', 'http://c3.img')`);

  const resultsJobs = await db.query(`
    INSERT INTO jobs (title, salary, equity, company_handle)
    VALUES ('Job1', 100, '0.1', 'c1'),
           ('Job2', 200, '0.2', 'c1'),
           ('Job3', 300, '0', 'c1'),
           ('Job4', NULL, NULL, 'c1')
    RETURNING id`);
  testJobIds.splice(0, 0, ...resultsJobs.rows.map(r => r.id));

  await db.query(`
    INSERT INTO users(username,
                      password,
                      first_name,
                      last_name,
                      email)
    VALUES ('u1', $1, 'U1F', 'U1L', 'u1@email.com'),
           ('u2', $2, 'U2F', 'U2L', 'u2@email.com'),
           ('u3', $3, 'U3F', 'U3L', 'u3@email.com')
    RETURNING username`,
  [
    await bcrypt.hash("password1", BCRYPT_WORK_FACTOR),
    await bcrypt.hash("password2", BCRYPT_WORK_FACTOR),
    await bcrypt.hash("password3", BCRYPT_WORK_FACTOR),
  ]);

  await db.query(`
    INSERT INTO applications(username, job_id)
    VALUES ('u1', $1),
           ('u1', $2)`,
    [testJobIds[0], testJobIds[1]]);

  const resultsTechs =await db.query(`
    INSERT INTO technologies(name)
    VALUES ('tech1'),
           ('tech2'),
           ('tech3')
    RETURNING id`);
  testTechIds.splice(0, 0, ...resultsTechs.rows.map(r => r.id));

  await db.query(`
    INSERT INTO requirements(job_id, tech_id)
    VALUES ($1, $2),
           ($3, $4),
           ($5, $6),
           ($7, $8),
           ($9, $10)`,
    [ testJobIds[0], testTechIds[0],
      testJobIds[0], testTechIds[1],
      testJobIds[1], testTechIds[0],
      testJobIds[1], testTechIds[1],
      testJobIds[1], testTechIds[2]     
    ]
  );

  await db.query(`
    INSERT INTO techskills(username, tech_id)
    VALUES ('u1', $1),
           ('u1', $2),
           ('u2', $3),
           ('u2', $4),
           ('u2', $5),
           ('u3', $6)`,
    [ testTechIds[0],
      testTechIds[1],
      testTechIds[0],
      testTechIds[1],
      testTechIds[2],
      testTechIds[0]
    ]
  );
}

async function commonBeforeEach() {
  await db.query("BEGIN");
}

async function commonAfterEach() {
  await db.query("ROLLBACK");
}

async function commonAfterAll() {
  await db.end();
}


module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testJobIds,
  testTechIds
};