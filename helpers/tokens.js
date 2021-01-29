const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");

/** return signed JWT from user data. */

function createToken(user) {
//  The console.assert() method writes an error message to 
// the console if the assertion is false.If the assertion 
// is true, nothing happens. 
  console.assert(user.isAdmin !== undefined,
      "createToken passed user without isAdmin property");

  let payload = {
    username: user.username,
    isAdmin: user.isAdmin || false,
  };

  // return the token
  return jwt.sign(payload, SECRET_KEY);
}

module.exports = { createToken };
