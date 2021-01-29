"use strict";

const request = require("supertest");

const db = require("../db.js");
const app = require("../app");
const User = require("../models/user");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  testJobIds,
  testTechIds,
  u1Token,
  u2Token,
  adminToken
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /users */

describe("POST /users", function () {
  test("works for admin: create non-admin", async function () {
    const resp = await request(app)
        .post("/users")
        .send({
          username: "u-new",
          firstName: "First-new",
          lastName: "Last-newL",
          email: "new@email.com",
          isAdmin: false,
        })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      user: {
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        email: "new@email.com",
        isAdmin: false,
      }, token: expect.any(String),
    });
  });

  test("will fail for unadmin users: create non-admin", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        email: "new@email.com",
        isAdmin: false,
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);    
  });

  test("works for admin: create admin", async function () {
    const resp = await request(app)
        .post("/users")
        .send({
          username: "u-new",
          firstName: "First-new",
          lastName: "Last-newL",
          email: "new@email.com",
          isAdmin: true,
        })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      user: {
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        email: "new@email.com",
        isAdmin: true,
      }, token: expect.any(String),
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .post("/users")
        .send({
          username: "u-new",
          firstName: "First-new",
          lastName: "Last-newL",
          email: "new@email.com",
          isAdmin: true,
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request if missing data", async function () {
    const resp = await request(app)
        .post("/users")
        .send({
          username: "u-new",
        })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request if invalid data", async function () {
    const resp = await request(app)
        .post("/users")
        .send({
          username: "u-new",
          firstName: "First-new",
          lastName: "Last-newL",
          email: "not-an-email",
          isAdmin: true,
        })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request if providing password", async function () {
    const resp = await request(app)
      .post("/users")
      .send({
        username: "u-new",
        firstName: "First-new",
        lastName: "Last-newL",
        password: "password",
        email: "new@email.com",
        isAdmin: false,
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /users */

describe("GET /users", function () {
  test("works for admin", async function () {
    const resp = await request(app)
        .get("/users")
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      users: [
        {
          username: "u1",
          firstName: "U1F",
          lastName: "U1L",
          email: "user1@user.com",
          isAdmin: false,
        },
        {
          username: "u2",
          firstName: "U2F",
          lastName: "U2L",
          email: "user2@user.com",
          isAdmin: false,
        },
        {
          username: "u3",
          firstName: "U3F",
          lastName: "U3L",
          email: "user3@user.com",
          isAdmin: false,
        },
      ],
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .get("/users");
    expect(resp.statusCode).toEqual(401);
  });

    test("unauth for unadmin users", async function () {
    const resp = await request(app)
        .get("/users")
        .set("authorization", `Bearer ${u1Token}`);;
    expect(resp.statusCode).toEqual(401);
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE users CASCADE");
    const resp = await request(app)
        .get("/users")
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /users/:username */

describe("GET /users/:username", function () {
  test("works for admin", async function () {
    const resp = await request(app)
        .get(`/users/u1`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
        applideJobs: [{ "jobId": testJobIds[0] }, 
               { "jobId": testJobIds[1] }],
        techSkills: [
          { techId: testTechIds[0], techName: "tech1" },
          { techId: testTechIds[1], techName: "tech2"}
        ]
      },
    });
  });

  test("works for user himself", async function () {
    const resp = await request(app)
      .get(`/users/u1`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
        applideJobs: [{ "jobId": testJobIds[0] },
        { "jobId": testJobIds[1] }],
        techSkills: [
          { techId: testTechIds[0], techName: "tech1" },
          { techId: testTechIds[1], techName: "tech2" }
        ]
      },
    });
  });

  test("unauth for unadmin user excluding himself", async function () {
    const resp = await request(app)
      .get(`/users/u1`)
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .get(`/users/u1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found if user not found", async function () {
    const resp = await request(app)
        .get(`/users/nope`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /users/:username */

describe("PATCH /users/:username", () => {
  test("works for admin", async function () {
    const resp = await request(app)
        .patch(`/users/u1`)
        .send({
          firstName: "New",
        })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "New",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
      },
    });
  });

  test("works for user himself", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({
        firstName: "New",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "New",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
      },
    });
  });

  test("unauth for unadmin user excluding himself", async function () {
    const resp = await request(app)
        .patch(`/users/u1`)
        .send({
          firstName: "New",
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({
        firstName: "New",
      });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found if no such user", async function () {
    const resp = await request(app)
        .patch(`/users/nope`)
        .send({
          firstName: "Nope",
        })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request if invalid data", async function () {
    const resp = await request(app)
        .patch(`/users/u1`)
        .send({
          firstName: 42,
        })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("works: user himself can set new password", async function () {
    const resp = await request(app)
        .patch(`/users/u1`)
        .send({
          password: "new-password",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
      },
    });
    const isSuccessful = await User.authenticate("u1", "new-password");
    expect(isSuccessful).toBeTruthy();
  });

  test("works: admin can set new password", async function () {
    const resp = await request(app)
      .patch(`/users/u1`)
      .send({
        password: "new-password",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      user: {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "user1@user.com",
        isAdmin: false,
      },
    });
    const isSuccessful = await User.authenticate("u1", "new-password");
    expect(isSuccessful).toBeTruthy();
  });
});



/************************************** DELETE /users/:username */

describe("DELETE /users/:username", function () {
  test("works for user himself", async function () {
    const resp = await request(app)
        .delete(`/users/u1`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({ deleted: "u1" });
  });

  test("works for admin", async function () {
    const resp = await request(app)
      .delete(`/users/u1`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({ deleted: "u1" });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .delete(`/users/u1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for unadmin user excluding user himself", async function () {
    const resp = await request(app)
      .delete(`/users/u1`)
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(401);
  });


  test("not found if user missing", async function () {
    const resp = await request(app)
        .delete(`/users/nope`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});


/************************************* POST /users/:username/jobs/:job_id */

describe("POST /users/:username/jobs/:job_id", function () {
  test("works for user himself", async function () {
    const resp = await request(app)
      .post(`/users/u2/jobs/${testJobIds[0]}`)
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.body).toEqual({ applied: testJobIds[0] });
  });

  test("works for admin", async function () {
    const resp = await request(app)
      .post(`/users/u2/jobs/${testJobIds[0]}`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({ applied: testJobIds[0] });
  });

  test("invalid if duplicate", async function () {
    const resp = await request(app)
      .post(`/users/u1/jobs/${testJobIds[0]}`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });


  test("unauth for anon", async function () {
    const resp = await request(app)
      .post(`/users/u2/jobs/${testJobIds[0]}`)
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for unadmin user excluding user himself", async function () {
    const resp = await request(app)
      .post(`/users/u2/jobs/${testJobIds[0]}`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found if user missing", async function () {
    const resp = await request(app)
      .post(`/users/xx/jobs/${testJobIds[0]}`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("not found if job missing", async function () {
    const resp = await request(app)
      .post(`/users/u2/jobs/0`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });  
});


/************************************* POST /users/:username/techs/:tech_id */

describe("POST /users/:username/techs/:tech_id", function () {
  test("works for user himself", async function () {
    const resp = await request(app)
      .post(`/users/u1/techs/${testTechIds[2]}`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({ skillAdded: testTechIds[2] });
  });

  test("works for admin", async function () {
    const resp = await request(app)
      .post(`/users/u1/techs/${testTechIds[2]}`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({ skillAdded: testTechIds[2] });
  });

  test("invalid if duplicate", async function () {
    const resp = await request(app)
      .post(`/users/u1/techs/${testTechIds[0]}`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });


  test("unauth for anon", async function () {
    const resp = await request(app)
      .post(`/users/u1/techs/${testTechIds[2]}`)
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for unadmin user excluding user himself", async function () {
    const resp = await request(app)
      .post(`/users/u1/techs/${testTechIds[2]}`)
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found if user missing", async function () {
    const resp = await request(app)
      .post(`/users/xx/techs/${testTechIds[2]}`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("not found if tech missing", async function () {
    const resp = await request(app)
      .post(`/users/u1/techs/0`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************* GET /users/:username/matched-jobs */

describe("GET /users/:username//matched-jobs", function () {
  test("works for user himself", async function () {
    const resp = await request(app)
      .get(`/users/u1/matched-jobs`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({ 
      matchedJobs: [
        {
          id: testJobIds[0],
          title: "J1",
          salary: 1,
          equity: "0.1",
          company: {
            handle: "c1",
            name: "C1",
            description: "Desc1",
            numEmployees: 1,
            logoUrl: "http://c1.img",
          },
          requirements: [
            {
              "techId": testTechIds[0],
              "techName": "tech1"
            },
            {
              "techId": testTechIds[1],
              "techName": "tech2"
            }
          ]
        },
        {
          id: testJobIds[2],
          title: "J3",
          salary: 3,
          equity: null,
          company: {
            handle: "c1",
            name: "C1",
            description: "Desc1",
            numEmployees: 1,
            logoUrl: "http://c1.img",
          },
          requirements: []
        }
      ]
    });
  });

  test("works for admin -1", async function () {
    const resp = await request(app)
      .get(`/users/u1/matched-jobs`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      matchedJobs: [
        {
          id: testJobIds[0],
          title: "J1",
          salary: 1,
          equity: "0.1",
          company: {
            handle: "c1",
            name: "C1",
            description: "Desc1",
            numEmployees: 1,
            logoUrl: "http://c1.img",
          },
          requirements: [
            {
              "techId": testTechIds[0],
              "techName": "tech1"
            },
            {
              "techId": testTechIds[1],
              "techName": "tech2"
            }
          ]
        },
        {
          id: testJobIds[2],
          title: "J3",
          salary: 3,
          equity: null,
          company: {
            handle: "c1",
            name: "C1",
            description: "Desc1",
            numEmployees: 1,
            logoUrl: "http://c1.img",
          },
          requirements: []
        }
      ]
    });
  });

  test("works for admin -2", async function () {
    const resp = await request(app)
      .get(`/users/u3/matched-jobs`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      matchedJobs: [
        {
          id: testJobIds[2],
          title: "J3",
          salary: 3,
          equity: null,
          company: {
            handle: "c1",
            name: "C1",
            description: "Desc1",
            numEmployees: 1,
            logoUrl: "http://c1.img",
          },
          requirements: []
        }
      ]
    });
  });


  test("works for admin -3", async function () {
    const resp = await request(app)
      .get(`/users/u2/matched-jobs`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      matchedJobs: [
        {
          id: testJobIds[0],
          title: "J1",
          salary: 1,
          equity: "0.1",
          company: {
            handle: "c1",
            name: "C1",
            description: "Desc1",
            numEmployees: 1,
            logoUrl: "http://c1.img",
          },
          requirements: [
            {
              "techId": testTechIds[0],
              "techName": "tech1"
            },
            {
              "techId": testTechIds[1],
              "techName": "tech2"
            }
          ]
        },

        {
          id: testJobIds[1],
          title: "J2",
          salary: 2,
          equity: "0.2",
          company: {
            handle: "c1",
            name: "C1",
            description: "Desc1",
            numEmployees: 1,
            logoUrl: "http://c1.img",
          },
          requirements: [
            {
              "techId": testTechIds[0],
              "techName": "tech1"
            },
            {
              "techId": testTechIds[1],
              "techName": "tech2"
            },
            {
              "techId": testTechIds[2],
              "techName": "tech3"
            }
          ]
        },

        {
          id: testJobIds[2],
          title: "J3",
          salary: 3,
          equity: null,
          company: {
            handle: "c1",
            name: "C1",
            description: "Desc1",
            numEmployees: 1,
            logoUrl: "http://c1.img",
          },
          requirements: []
        }
      ]
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .get(`/users/u1/matched-jobs`)
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for unadmin user excluding user himself", async function () {
    const resp = await request(app)
      .get(`/users/u1/matched-jobs`)
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found if user missing", async function () {
    const resp = await request(app)
      .get(`/users/xx/matched-jobs`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});