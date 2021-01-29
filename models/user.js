"use strict";

const db = require("../db");
const bcrypt = require("bcrypt");
const { sqlForPartialUpdate } = require("../helpers/sql");
const {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} = require("../expressError");

const { BCRYPT_WORK_FACTOR } = require("../config.js");
const app = require("../app");

/** Related functions for users. */

class User {
  /** authenticate user with username, password.
   *
   * Returns { username, first_name, last_name, email, is_admin }
   *
   * Throws UnauthorizedError is user not found or wrong password.
   **/

  static async authenticate(username, password) {
    // try to find the user first
    const result = await db.query(
          `SELECT username,
                  password,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin"
           FROM users
           WHERE username = $1`,
        [username],
    );

    const user = result.rows[0];

    if (user) {
      // compare hashed password to a new hash from password
      const isValid = await bcrypt.compare(password, user.password);
      if (isValid === true) {
        delete user.password;
        return user;
      }
    }

    throw new UnauthorizedError("Invalid username/password");
  }

  /** Register user with data.
   *
   * Returns { username, firstName, lastName, email, isAdmin }
   *
   * Throws BadRequestError on duplicates.
   **/

  static async register(
      { username, password, firstName, lastName, email, isAdmin }) {
    const duplicateCheck = await db.query(
          `SELECT username
           FROM users
           WHERE username = $1`,
        [username],
    );

    if (duplicateCheck.rows[0]) {
      throw new BadRequestError(`Duplicate username: ${username}`);
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

    const result = await db.query(
          `INSERT INTO users
           (username,
            password,
            first_name,
            last_name,
            email,
            is_admin)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING username, first_name AS "firstName", last_name AS "lastName", email, is_admin AS "isAdmin"`,
        [
          username,
          hashedPassword,
          firstName,
          lastName,
          email,
          isAdmin,
        ],
    );

    const user = result.rows[0];

    return user;
  }

  /** Find all users.
   *
   * Returns [{ username, first_name, last_name, email, is_admin }, ...]
   **/

  static async findAll() {
    const result = await db.query(
          `SELECT username,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin"
           FROM users
           ORDER BY username`,
    );

    return result.rows;
  }

  /** Given a username, return data about user.
   *
   * Returns { username, firstName, lastName, eamil, isAdmin, applideJobs, techSkills }
   *   where applideJobs is [ jobId, jobId, ... ]
   *   techSkills is [{techId, techName},...]
   *
   * Throws NotFoundError if user not found.
   **/

  static async get(username) {
    const userRes = await db.query(
          `SELECT username,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin"
           FROM users
           WHERE username = $1`,
        [username],
    );

    const user = userRes.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);

    const jobsRes = await db.query(
      `SELECT job_id AS "jobId"
       FROM applications
       WHERE username = $1`,
       [username]
    )

    user.applideJobs = jobsRes.rows;

    const skillRes = await db.query(
      `SELECT t.id AS "techId", t.name AS "techName"
       FROM techskills AS sk
       JOIN technologies AS t 
       ON t.id = sk.tech_id
       WHERE sk.username = $1`,
      [username]
    )

    user.techSkills = skillRes.rows;

    return user;
  }

  /** Update user data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain
   * all the fields; this only changes provided ones.
   *
   * Data can include:
   *   { firstName, lastName, password, email, isAdmin }
   *
   * Returns { username, firstName, lastName, email, isAdmin }
   *
   * Throws NotFoundError if not found.
   *
   * WARNING: this function can set a new password or make a user an admin.
   * Callers of this function must be certain they have validated inputs to this
   * or a serious security risks are opened.
   */

  static async update(username, data) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, BCRYPT_WORK_FACTOR);
    }

    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          firstName: "first_name",
          lastName: "last_name",
          isAdmin: "is_admin",
        });
    const usernameVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE users 
                      SET ${setCols} 
                      WHERE username = ${usernameVarIdx} 
                      RETURNING username,
                                first_name AS "firstName",
                                last_name AS "lastName",
                                email,
                                is_admin AS "isAdmin"`;
    const result = await db.query(querySql, [...values, username]);
    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);

    delete user.password;
    return user;
  }

  /** Delete given user from database; returns undefined. */

  static async remove(username) {
    let result = await db.query(
          `DELETE
           FROM users
           WHERE username = $1
           RETURNING username`,
        [username],
    );
    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);
  }

  /** Apply a job;  returns {username, jobId}. 
   *   
   ** Throws NotFoundError if username or jobId not found.
   ** Throws BadRequestError on duplicates.
  */

  static async applyToJob(username, jobId) {
    const checkUsername = await db.query(
      `SELECT username
       FROM users
       WHERE username = $1`,
       [username]
    );
    
    if (!checkUsername.rows[0]) {
      throw new NotFoundError(`No user: ${username}`);
    }
      
    const checkJobId = await db.query(
      `SELECT id
       FROM jobs
       WHERE id = $1`,
      [jobId]
    );    

    if (!checkJobId.rows[0]) {
      throw new NotFoundError(`No job: ${jobId}`);
    }

    const duplicateCheck = await db.query(
      `SELECT username, job_id
       FROM applications
       WHERE username = $1 AND job_id = $2`,
      [username, jobId],
    );

    if (duplicateCheck.rows[0]) {
      throw new BadRequestError(`Duplicate application`);
    }

    let result = await db.query(
      `INSERT INTO applications (username, job_id)
       VALUES ($1, $2)
       RETURNING username, job_id AS "jobId"`,
      [username, jobId]
    );

    return result.rows[0];
  }


  /** add a tech skill;  returns {username, techId}. 
   *   
   ** Throws NotFoundError if username or techId not found.
   ** Throws BadRequestError on duplicates.
  */

  static async addTechSkill(username, techId) {
    const checkUsername = await db.query(
      `SELECT username
        FROM users
        WHERE username = $1`,
      [username]
    );

    if (!checkUsername.rows[0]) {
      throw new NotFoundError(`No user: ${username}`);
    }

    const checkTechId = await db.query(
      `SELECT id
        FROM technologies
        WHERE id = $1`,
      [techId]
    );

    if (!checkTechId.rows[0]) {
      throw new NotFoundError(`No job: ${techId}`);
    }

    const duplicateCheck = await db.query(
      `SELECT username, tech_id
       FROM techskills
       WHERE username = $1 AND tech_id = $2`,
      [username, techId],
    );

    if (duplicateCheck.rows[0]) {
      throw new BadRequestError(`Duplicate tech skill addition.`);
    }


    let result = await db.query(
      `INSERT INTO techskills (username, tech_id)
        VALUES ($1, $2)
        RETURNING username, tech_id AS "techId"`,
      [username, techId]
    );

    return result.rows[0];
  }

}

module.exports = User;
