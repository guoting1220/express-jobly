const { BadRequestError } = require("../expressError");

/**
 * Generate a selective update query based on a request body:
 *
 * - dataToUpdate: the list of columns you want to update
 * e.g. { firstName: 'Aliya', age: 32 } 
 * 
 * - jsToSql: an object mapping from key names in JS to column names of the table in SQL
 * e.g. {
          firstName: "first_name",
          lastName: "last_name",
          isAdmin: "is_admin",
        }
 * Returns object containing a DB query as a string, and array of string values to be updated
 * e.g. { 
 *        setCols: '"first_name"=$1,"age"=$2',
 *        values: ['Aliya', 32] 
 *      }
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  //  collect the column names which to be updated
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // build the columns part of the update query
  // {firstName, age} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  // return object like:
  // {
  //   setCols: '"first_name"=$1, "age"=$2',
  //   values: ['Aliya', 32]
  // }
  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
