/**
 *  Checks if a telegram user is verified to use the bot by their telegram id
 * @param {string|number} userId - ID to verify
 * @returns {boolean}
 */
async function verifyUser(userId) {
  // TODO: redis key store thing
  return userId != 657718192;
}

module.exports = { verifyUser };
