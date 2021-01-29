"use strict";

const db = require("../db");
const { NotFoundError, BadRequestError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
    /** Create a job (from data), update db, return new job data.
     *
     * data should be { title, salary, equity, companyHandle }
     *
     * Returns { id, title, salary, equity, companyHandle }
     **/

    static async create({ title, salary, equity, companyHandle }) {
        const result = await db.query(
            `INSERT INTO jobs (title, salary, equity, company_handle)
             VALUES ($1, $2, $3, $4)
             RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
            [title, salary, equity, companyHandle]
        );
        return result.rows[0];
    }

    /** Find all jobs (optional filter on searchFilters).
    *
    * searchFilters (all optional):
    * - minSalary
    * - hasEquity (true returns only jobs with equity > 0, other values ignored)
    * - title (will find case-insensitive, partial matches)
    *
    * Returns [{ id, title, salary, equity, companyHandle, companyName }, ...]
    * where requirments is: [techId,...]
    * */

    static async findAll(searchFilter = {}) {
        const { title, minSalary, hasEquity } = searchFilter;
        let searchQueries = [];
        let values = [];
        let idx = 1;

        // build the search query part with the searchFilter params
        if (title) {
            searchQueries.push(`title ILIKE $${idx}`);
            values.push(`%${title}%`);
            idx++;
        }

        if (minSalary) {
            searchQueries.push(`salary >= $${idx}`);
            values.push(minSalary);
            idx++;
        }

        if (hasEquity) {
            searchQueries.push(`equity > 0`);
        }

        if (searchQueries.length !== 0) {
            searchQueries = "WHERE " + searchQueries.join(" AND ");
        }

        const jobsRes = await db.query(
            `SELECT id,
                  title,
                  salary,
                  equity,
                  jobs.company_handle AS "companyHandle",
                  companies.name AS "companyName"
            FROM jobs
            LEFT JOIN companies 
            ON jobs.company_handle = companies.handle
           ${searchQueries}`,
            values
        );

        return jobsRes.rows;
    }

    /** Given a job id, return data about job.
     *
     * Returns { id, title, salary, equity, company, requirements }
     *   where company is { handle, name, description, numEmployees, logoUrl },
     *   requirements is [{techId, techName},...]
     *
     * Throws NotFoundError if not found.
     **/

    static async get(id) {
        const jobRes = await db.query(
            `SELECT id,
                title,
                salary,
                equity,
                company_handle AS "companyHandle"                  
            FROM jobs
            WHERE id = $1`,
            [id]
        );

        const job = jobRes.rows[0];

        if (!job) throw new NotFoundError(`No job: ${id}`);

        const companiesRes = await db.query(
            `SELECT handle, 
                    name, 
                    description, 
                    num_employees AS "numEmployees", 
                    logo_url AS "logoUrl"
             FROM companies
             WHERE handle = $1`,
            [job.companyHandle]
        );

        delete job.companyHandle;
        job.company = companiesRes.rows[0];  
        
        const requirementsRes = await db.query(
            `SELECT r.tech_id AS "techId", 
                    t.name AS "techName"            
             FROM requirements AS r
             JOIN technologies As t
             ON  r.tech_id = t.id
             WHERE job_id = $1`,
            [id]
        );
       
        job.requirements = requirementsRes.rows;    

        return job;
    }

    /** Update job data with `data`.
    *
    * This is a "partial update" --- it's fine if data doesn't contain
    * all the fields; this only changes provided ones.
    *
    * Data can include: { title, salary, equity }
    *
    * Returns { id, title, salary, equity, companyHandle }
    *
    * Throws NotFoundError if not found.
    */

    static async update(id, data) {
        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                companyHandle: "company_handle"    
            });
        const idVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id, title, salary, equity, company_handle AS "companyHandle"`;
        const result = await db.query(querySql, [...values, id]);
        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job: ${id}`);

        return job;
    }

    /** Delete given job from database; returns undefined.
     *
     * Throws NotFoundError if company not found.
     **/

    static async remove(id) {
        const result = await db.query(
            `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
            [id]);
        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job: ${id}`);
    }

    /** require a technology skill; returns {jobId, techId}.
     *
     * Throws NotFoundError if jobId or techId not found.
     **/
    static async requireTech(jobId, techId) {
        const checkJobId = await db.query(
            `SELECT id
            FROM jobs
            WHERE id = $1`,
            [jobId]
        );

        if (!checkJobId.rows[0]) {
            throw new NotFoundError(`No job: ${jobId}`);
        }

        const checkTechId = await db.query(
            `SELECT id
            FROM technologies
            WHERE id = $1`,
            [techId]
        );

        if (!checkTechId.rows[0]) {
            throw new NotFoundError(`No tech: ${techId}`);
        }

        const duplicateCheck = await db.query(
            `SELECT job_id, tech_id
            FROM requirements
            WHERE job_id = $1 AND tech_id = $2`,
            [jobId, techId]
        );

        if (duplicateCheck.rows[0]) {
            throw new BadRequestError(`Duplicate tech requirement.`);
        }

        let result = await db.query(
            `INSERT INTO requirements (job_id, tech_id)
            VALUES ($1, $2)
            RETURNING job_id AS "jobId", tech_id AS "techId"`,
            [jobId, techId]
        );

        return result.rows[0];
    }

    /** get qualified applicants; returns [user,..]     
     *    where user is : {username, firstName, lastName, email, isAdmin, techSkills}
     *    where techSkills is: [techName,...]
     * 
     * Throws NotFoundError if job not found.
     **/
    // static async getQualifiedUsers(id) {
    //     const checkJobId = await db.query(
    //         `SELECT id
    //         FROM jobs
    //         WHERE id = $1`,
    //         [jobId]
    //     );

    //     if (!checkJobId.rows[0]) {
    //         throw new NotFoundError(`No job: ${jobId}`);
    //     }

    //   ....

    //     return result.rows[0];
    // }

}


module.exports = Job;
