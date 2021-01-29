"use strict";

const request = require("supertest");

const app = require("../app");

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
    testTechIds,
    u1Token,
    adminToken,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /techs */

describe("POST /techs", function () {
    test("ok for admin", async function () {
        const resp = await request(app)
            .post(`/techs`)
            .send({
                name: "new-tech"
            })
            .set("authorization", `Bearer ${adminToken}`);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            technology: {
                id: expect.any(Number),
                name: "new-tech"
            }
        });
    });

    test("unauth for users", async function () {
        const resp = await request(app)
            .post(`/techs`)
            .send({
                name: "new-tech"
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("bad request with missing data", async function () {
        const resp = await request(app)
            .post(`/techs`)
            .send({})
            .set("authorization", `Bearer ${adminToken}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("bad request with invalid data", async function () {
        const resp = await request(app)
            .post(`/techs`)
            .send({
                name: 2
            })
            .set("authorization", `Bearer ${adminToken}`);
        expect(resp.statusCode).toEqual(400);
    });

});

/************************************** GET /techs */

describe("GET /techs", function () {
    test("ok for anon", async function () {
        const resp = await request(app).get(`/techs`);
        expect(resp.body).toEqual({
            technologies: [
                {
                    id: testTechIds[0],
                    name: "tech1"  
                },
                {
                    id: testTechIds[1],
                    name: "tech2"
                },
                {
                    id: testTechIds[2],
                    name: "tech3"
                }
            ],
        });
    });

    test("works: filtering", async function () {
        const resp = await request(app)
            .get(`/techs`)
            .query({ name: "1" });
        expect(resp.body).toEqual({
            technologies: [
                {
                    id: testTechIds[0],
                    name: "tech1"
                }
            ]
        });
    });   

    test("bad request on invalid filter key", async function () {
        const resp = await request(app)
            .get(`/techs`)
            .query({ id: 2 });
        expect(resp.statusCode).toEqual(400);
    });
});

// /************************************** GET /techs/:id */

describe("GET /techs/:id", function () {
    test("works for anon", async function () {
        const resp = await request(app).get(`/techs/${testTechIds[0]}`);
        expect(resp.body).toEqual({
            technology: {
                id: testTechIds[0],
                name: "tech1"  
            }
        });
    });

    test("not found for no such tech", async function () {
        const resp = await request(app).get(`/techs/0`);
        expect(resp.statusCode).toEqual(404);
    });
});

// /************************************** PATCH /techs/:id */

describe("PATCH /techs/:id", function () {
    test("works for admin", async function () {
        const resp = await request(app)
            .patch(`/techs/${testTechIds[0]}`)
            .send({
                name: "t-New",
            })
            .set("authorization", `Bearer ${adminToken}`);
        expect(resp.body).toEqual({
            technology: {
                id: testTechIds[0],
                name: "t-New"
            },
        });
    });

    test("unauth for others", async function () {
        const resp = await request(app)
            .patch(`/techs/${testTechIds[0]}`)
            .send({
                name: "t-New",
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("not found on no such tech", async function () {
        const resp = await request(app)
            .patch(`/techs/0`)
            .send({
                name: "new",
            })
            .set("authorization", `Bearer ${adminToken}`);
        expect(resp.statusCode).toEqual(404);
    });

    test("bad request on invalid field update", async function () {
        const resp = await request(app)
            .patch(`/techs/${testTechIds[0]}`)
            .send({
                id: 99,
            })
            .set("authorization", `Bearer ${adminToken}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("bad request with invalid data", async function () {
        const resp = await request(app)
            .patch(`/techs/${testTechIds[0]}`)
            .send({
                name: 111,
            })
            .set("authorization", `Bearer ${adminToken}`);
        expect(resp.statusCode).toEqual(400);
    });
});

// /************************************** DELETE /techs/:id */

describe("DELETE /techs/:id", function () {
    test("works for admin", async function () {
        const resp = await request(app)
            .delete(`/techs/${testTechIds[0]}`)
            .set("authorization", `Bearer ${adminToken}`);
        expect(resp.body).toEqual({ deleted: testTechIds[0] });
    });

    test("unauth for others", async function () {
        const resp = await request(app)
            .delete(`/techs/${testTechIds[0]}`)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("unauth for anon", async function () {
        const resp = await request(app)
            .delete(`/techs/${testTechIds[0]}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("not found for no such tech", async function () {
        const resp = await request(app)
            .delete(`/techs/0`)
            .set("authorization", `Bearer ${adminToken}`);
        expect(resp.statusCode).toEqual(404);
    });
});
