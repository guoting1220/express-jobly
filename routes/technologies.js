"use strict";

/** Routes for technologies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureIsAdmin } = require("../middleware/auth");
const Technology = require("../models/technology");
const techNewSchema = require("../schemas/techNew.json");
const techUpdateSchema = require("../schemas/techUpdate.json");
const techSearchSchema = require("../schemas/techSearch.json");
const router = new express.Router();


/** POST / { technology } =>  { technology }
 *
 * technology should be { id, name }
 *
 * Returns { id, name }
 *
 * Authorization required: admin
 */

router.post("/", ensureIsAdmin, async function (req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, techNewSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const technology = await Technology.create(req.body);
        return res.status(201).json({ technology });
    } catch (err) {
        return next(err);
    }
});

/** GET / =>
 *   { technologies: [ { id, name }, ...] }
 *
 * Can provide search filter in query:
 * - name (will find case-insensitive, partial matches)

 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
    const searchFilter = req.query;
    try {
        const validator = jsonschema.validate(searchFilter, techSearchSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        const technologies = await Technology.findAll(searchFilter);
        return res.json({ technologies });
    } catch (err) {
        return next(err);
    }
});

/** GET /[id] => { technology }
 *
 * Returns { id, name }
 *   
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
    try {
        const technology = await Technology.get(req.params.id);
        return res.json({ technology });
    } catch (err) {
        return next(err);
    }
});

/** PATCH /[id] { fld1, fld2, ... } => { technology }
 *
 * Patches technology data.
 *
 * fields can be: { name }
 *
 * Returns { id, name }
 *
 * Authorization required: admin
 */

router.patch("/:id", ensureIsAdmin, async function (req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, techUpdateSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const technology = await Technology.update(req.params.id, req.body);
        return res.json({ technology });
    } catch (err) {
        return next(err);
    }
});

/** DELETE /[id]  =>  { deleted: id }
 *
 * Authorization: admin
 */

router.delete("/:id", ensureIsAdmin, async function (req, res, next) {
    try {
        await Technology.remove(req.params.id);
        return res.json({ deleted: +req.params.id });
    } catch (err) {
        return next(err);
    }
});


module.exports = router;
