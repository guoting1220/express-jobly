"use strict";

const { NotFoundError, BadRequestError } = require("../expressError");
const db = require("../db.js");
const Technology = require("./technology.js");
const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
    testTechIds
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
    let newTech = {
        name: "tech4"
    };   

    test("works", async function () {
        let tech = await Technology.create(newTech);
        expect(tech).toEqual({
            ...newTech,
            id: expect.any(Number)
        });
    });

    test("invalid if duplicate", async function () {
        try {
            await Technology.create({name: "tech1"});
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }        
    });
});

/************************************** findAll */

describe("findAll", function () {
    test("works: no filter", async function () {
        let techs = await Technology.findAll();
        expect(techs).toEqual([
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
        ]);
    });

    test("works: filter by name", async function () {
        let techs = await Technology.findAll({ name: "1" });
        expect(techs).toEqual([
            {
                id: testTechIds[0],
                name: "tech1"
            }
        ]);
    });
});

// /************************************** get */

describe("get", function () {
    test("works", async function () {
        let tech = await Technology.get(testTechIds[0]);
        expect(tech).toEqual({
            id: testTechIds[0],
            name: "tech1"
        })  
    });

    test("not found if no such tech", async function () {
        try {
            await Technology.get(99);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

// /************************************** update */

describe("update", function () {
    let updateData = {
        name: "New"        
    };
    test("works", async function () {
        let tech = await Technology.update(testTechIds[0], updateData);
        expect(tech).toEqual({
            id: testTechIds[0],
            name: "New"
        });
    });

    test("not found if no such tech", async function () {
        try {
            await Technology.update(99, {
                name: "test",
            });
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });

    test("bad request with no data", async function () {
        try {
            await Technology.update(testTechIds[0], {});
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});

// /************************************** remove */

describe("remove", function () {
    test("works", async function () {
        await Technology.remove(testTechIds[0]);
        const res = await db.query(
            "SELECT id FROM technologies WHERE id=$1", [testTechIds[0]]);
        expect(res.rows.length).toEqual(0);
    });

    test("not found if no such tech", async function () {
        try {
            await Technology.remove(0);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});
