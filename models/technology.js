"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for technologies. */

class Technology {
    /** Create a technology (from data), update db, return new technology data.
     *
     * data should be { name }
     *
     * Returns { id, name }
     **/

    static async create({ name }) {
        const duplicateCheck = await db.query(
            `SELECT name
           FROM technologies
           WHERE name = $1`,
            [name]);

        if (duplicateCheck.rows[0])
            throw new BadRequestError(`Duplicate technology: ${name}`);

        const result = await db.query(
            `INSERT INTO technologies (name)
             VALUES ($1)
             RETURNING id, name`,
            [name]
        );

        return result.rows[0];
    }

    /** Find all technologies (optional filter on searchFilters).
    *
    * searchFilters (all optional):    
    * - name (will find case-insensitive, partial matches)
    *
    * Returns [{ id, name }, ...]
    * */

    static async findAll(searchFilter = {}) {
        const { name } = searchFilter;
        let searchQueries = [];
        let values = [];
        let idx = 1;

        // build the search query part with the searchFilter params
        if (name) {
            searchQueries.push(`name ILIKE $${idx}`);
            values.push(`%${name}%`);
            idx++;
        }

        if (searchQueries.length !== 0) {
            searchQueries = "WHERE " + searchQueries.join(" AND ");
        }

        const techRes = await db.query(
            `SELECT id, name     
             FROM technologies            
           ${searchQueries}`,
            values
        );

        return techRes.rows;
    }

    /** Given a technology id, return data about technology.
     *
     * Returns { id, name }
     *  
     * Throws NotFoundError if not found.
     **/

    static async get(id) {
        const techRes = await db.query(
            `SELECT id, name     
             FROM technologies   
             WHERE id = $1`,
            [id]
        );

        const tech = techRes.rows[0];

        if (!tech) throw new NotFoundError(`No technology: ${id}`);

        return tech;
    }

    /** Update techonology data with `data`.
    *
    * This is a "partial update" --- it's fine if data doesn't contain
    * all the fields; this only changes provided ones.
    *
    * Data can include: { name }
    *
    * Returns { id, name }
    *
    * Throws NotFoundError if not found.
    */

    static async update(id, data) {
        const { setCols, values } = sqlForPartialUpdate(
            data, {});
        const idVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE technologies 
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id, name`;
        const result = await db.query(querySql, [...values, id]);
        const tech = result.rows[0];

        if (!tech) throw new NotFoundError(`No technology: ${id}`);

        return tech;
    }

    /** Delete given technology from database; returns undefined.
     *
     * Throws NotFoundError if technology not found.
     **/

    static async remove(id) {
        const result = await db.query(
            `DELETE
             FROM technologies
             WHERE id = $1
             RETURNING id`,
            [id]);
        const tech = result.rows[0];

        if (!tech) throw new NotFoundError(`No technology: ${id}`);
    }
}


module.exports = Technology;
