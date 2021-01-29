"use strict";

/** Routes for users. */

const jsonschema = require("jsonschema");
const pwdGenerator = require("generate-password");
const express = require("express");
const { ensureLoggedIn, ensureIsAdmin, ensureAdminOrCorrectUser } = require("../middleware/auth");
const { BadRequestError } = require("../expressError");
const User = require("../models/user");
const { createToken } = require("../helpers/tokens");
const userNewSchema = require("../schemas/userNew.json");
const userUpdateSchema = require("../schemas/userUpdate.json");
const Job = require("../models/job");
const isSubset = require('../helpers/subset')

const router = express.Router();


/** POST / { user }  => { user, token }
 *
 * Adds a new user. This is not the registration endpoint --- instead, this is
 * only for admin users to add new users. The new user being added can be an
 * admin.
 *
 * This returns the newly created user and an authentication token for them:
 *  {user: { username, firstName, lastName, email, isAdmin }, token }
 *
 * Authorization required: admin
 **/

router.post("/", ensureIsAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const user = await User.register({
      ...req.body, 
      password: pwdGenerator.generate({
        length: 10,
        numbers: true
      })
    });

    const token = createToken(user);
    
    return res.status(201).json({ user, token });
  } catch (err) {
    return next(err);
  }
});


/** GET / => { users: [ {username, firstName, lastName, email }, ... ] }
 *
 * Returns list of all users.
 *
 * Authorization required: admin
 **/

router.get("/", ensureIsAdmin, async function (req, res, next) {
  try {
    const users = await User.findAll();
    return res.json({ users });
  } catch (err) {
    return next(err);
  }
});


/** GET /[username] => { user }
 *
 * Returns { username, firstName, lastName, isAdmin }
 *
 * Authorization required: admin or user shemselves
 **/

router.get("/:username", ensureAdminOrCorrectUser, async function (req, res, next) {
  try {
    const user = await User.get(req.params.username);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});


/** PATCH /[username] { user } => { user }
 *
 * Data can include:
 *   { firstName, lastName, password, email }
 *
 * Returns { username, firstName, lastName, email, isAdmin }
 *
 * Authorization required: admin or user shemselves
 **/

router.patch("/:username", ensureAdminOrCorrectUser, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const user = await User.update(req.params.username, req.body);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});


/** DELETE /[username]  =>  { deleted: username }
 *
 * Authorization required: admin or user shemselves
 **/

router.delete("/:username", ensureAdminOrCorrectUser, async function (req, res, next) {
  try {
    await User.remove(req.params.username);
    return res.json({ deleted: req.params.username });
  } catch (err) {
    return next(err);
  }
});



/** POST /[username]/jobs/[jobId]  =>  { applied: jobId }
 *
 * Authorization required: admin or user shemselves
 **/

router.post("/:username/jobs/:job_id", ensureAdminOrCorrectUser, async function (req, res, next) {
  const { username, job_id } = req.params;
  const jobId = +job_id;
  try {
    await User.applyToJob(username, jobId);
    return res.json({ applied: jobId });
  } catch (err) {
    return next(err);
  }
});


/** POST /[username]/techs/[techId]  =>  { skillAdded: techId }
 *
 * Authorization required: admin or user shemselves
 **/

router.post("/:username/techs/:tech_id", ensureAdminOrCorrectUser, async function (req, res, next) {
  const { username, tech_id } = req.params;
  const techId = +tech_id;
  try {
    await User.addTechSkill(username, techId);
    return res.json({ skillAdded: techId });
  } catch (err) {
    return next(err);
  }
});



/** GET /[username]/matched-jobs  =>  [job,...]
 *    where job is: {id, title, salary, company, requirements}
 *
 * Authorization required: admin or user shemselves
 **/

router.get("/:username/matched-jobs", ensureAdminOrCorrectUser, async function (req, res, next) {
  let { username } = req.params;  
  try {    
    let matchedJobs = [];
    
    const user = await User.get(username);
    const userTechSkillIds = user.techSkills.map(t => t.techId);
    const allJobs = await Job.findAll();  
    
    for (let j of allJobs) {
      const job = await Job.get(j.id);
      const requiredSkillIds = job.requirements.map(r => r.techId)
      if (isSubset(requiredSkillIds, userTechSkillIds)) {
        matchedJobs.push(job);
      }
    }

    return res.json({ matchedJobs });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
