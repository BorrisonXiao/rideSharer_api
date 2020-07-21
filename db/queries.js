//@ts-check
const dbPool = require('./pool');
const fs = require('fs');

async function rebuildDatabase() {
  const createDbScript = `${__dirname}/createdb.sql`;

  const sql = fs.readFileSync(createDbScript, 'utf8');
  return dbPool.query(sql);
}

/* Insert an user into the database, return the inserted user's id */
async function addUser(user) {
  let packet = await dbPool.query(`INSERT INTO users SET ?`, {
    username: user.username,
    password: user.password,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    phone: user.phone,
    admin: user.admin,
  });
  return packet.insertId;
}

async function getUserById(userid) {
  return dbPool.query(`SELECT * FROM users WHERE id = ?`, [userid]);
}

async function getUserByName(username) {
  return dbPool.query(`SELECT * FROM users WHERE username = ?`, [username]);
}

/* Change a user's admin state based on the user's id */
async function setAdminState(userid, state) {
  return dbPool.query(`UPDATE users SET admin = ? WHERE id = ?`, [
    state,
    userid,
  ]);
}

/* Delete a user from the database */
async function deleteUser(userid) {
  /* Explicity delete the trips associated with the user first */
  await dbPool.query('DELETE FROM passengerTrips WHERE userid = ?', [userid]);
  await dbPool.query('DELETE FROM driverTrips WHERE userid = ?', [userid]);
  return dbPool.query('DELETE FROM users WHERE id = ?', [userid]);
}

/* List users with paging. <page> indicates the page number, <size> indicates the page size */
async function listUsers(page = 0, size = 10) {
  let start = page * size;
  return dbPool.query(
    `SELECT id, admin, email, firstname, lastname, phone, username FROM users LIMIT ?, ?`,
    [start, size]
  );
}

/* Update a user whose id is <userid> with the passed <userinfo> */
async function updateUser(userid, userinfo) {
  return dbPool.query(`UPDATE users SET ? WHERE id = ?`, [userinfo, userid]);
}

/* Insert an driver's trip into the database, return the inserted trip's id */
async function addDriverTrip(tripInfo) {
  let packet = await dbPool.query(`INSERT INTO driverTrips SET ?`, {
    userid: tripInfo.userid,
    pickupLocation: tripInfo.pickupLocation,
    destination: tripInfo.destination,
    price: tripInfo.price,
    departureTime: tripInfo.departureTime,
  });
  return packet.insertId;
}

/* Insert an user into the database, return the inserted user's id */
async function addPassengerTrip(tripInfo) {
  let packet = await dbPool.query(`INSERT INTO passengerTrips SET ?`, {
    userid: tripInfo.userid,
    pickupLocation: tripInfo.pickupLocation,
    destination: tripInfo.destination,
    price: tripInfo.price,
    departureTime: tripInfo.departureTime,
  });
  return packet.insertId;
}

/* List driver trips with paging. <page> indicates the page number, <size> indicates the page size */
async function listDriverTrips(page = 0, size = 10) {
  let start = page * size;
  return dbPool.query(
    `SELECT d.id AS id, u.username AS username, u.id AS userid, pickupLocation, destination, FORMAT(price, 2) AS price, departureTime FROM driverTrips d LEFT JOIN users u ON d.userid = u.id LIMIT ?, ?`,
    [start, size]
  );
}

/* List driver trips with paging. <page> indicates the page number, <size> indicates the page size */
async function listPassengerTrips(page = 0, size = 10) {
  let start = page * size;
  /**
   * Note that the following statement must added into the mysql configuration
   * (in default.json or test.json) to solve the mysql DATETIME conversion:
   * "dateStrings": true
   */
  return dbPool.query(
    `SELECT p.id AS id, u.username AS username, u.id AS userid, pickupLocation, destination, FORMAT(price, 2) AS price, departureTime FROM passengerTrips p LEFT JOIN users u ON p.userid = u.id LIMIT ?, ?`,
    [start, size]
  );
}

/* Get the passenger's trip by the ID */
async function getPassTripsByID(tripid) {
  return dbPool.query(
    `SELECT u.username AS username, u.id AS userid, u.phone AS phone, pickupLocation, destination, FORMAT(price, 2) AS price, departureTime FROM passengerTrips p \
  LEFT JOIN users u ON p.userid = u.id WHERE p.id = ?`,
    [tripid]
  );
}

/* Get the driver's trip by the ID */
async function getDriverTripsByID(tripid) {
  return dbPool.query(
    `SELECT u.username AS username, u.id AS userid, u.phone AS phone, pickupLocation, destination, FORMAT(price, 2) AS price, departureTime FROM driverTrips d \
  LEFT JOIN users u ON d.userid = u.id WHERE d.id = ?`,
    [tripid]
  );
}

/* List the driver's trips by destination */
async function listDriverTripsByDest(dest, page = 0, size = 10) {
  let start = page * size;

  return dbPool.query(
    `SELECT u.username AS username, u.id AS userid, pickupLocation, destination, FORMAT(price, 2) AS price, departureTime FROM driverTrips d \
    LEFT JOIN users u ON d.userid = u.id WHERE destination = ? LIMIT ?, ?`,
    [dest, start, size]
  );
}

/* List the driver's trips by destination */
async function listDriverTripsByPickupLoc(pickup, page = 0, size = 10) {
  let start = page * size;

  return dbPool.query(
    `SELECT u.username AS username,  u.id AS userid, pickupLocation, destination, FORMAT(price, 2) AS price, departureTime FROM driverTrips d \
    LEFT JOIN users u ON d.userid = u.id WHERE pickupLocation = ? LIMIT ?, ?`,
    [pickup, start, size]
  );
}

/* List the driver's trips by pickup location and the destination */
async function listDriverTripsByPD(pickup, dest, page = 0, size = 10) {
  let start = page * size;

  return dbPool.query(
    `SELECT u.username AS username, u.id AS userid, pickupLocation, destination, FORMAT(price, 2) AS price, departureTime FROM driverTrips d \
      LEFT JOIN users u ON d.userid = u.id WHERE pickupLocation = ? AND destination = ? LIMIT ?, ?`,
    [pickup, dest, start, size]
  );
}

/* List the driver's trips by destination */
async function listPassTripsByDest(dest, page = 0, size = 10) {
  let start = page * size;

  return dbPool.query(
    `SELECT u.username AS username, u.id AS userid, pickupLocation, destination, FORMAT(price, 2) AS price, departureTime FROM passengerTrips p \
      LEFT JOIN users u ON p.userid = u.id WHERE destination = ? LIMIT ?, ?`,
    [dest, start, size]
  );
}

/* List the driver's trips by destination */
async function listPassTripsByPickupLoc(pickup, page = 0, size = 10) {
  let start = page * size;

  return dbPool.query(
    `SELECT u.username AS username, u.id AS userid, pickupLocation, destination, FORMAT(price, 2) AS price, departureTime FROM passengerTrips p \
      LEFT JOIN users u ON p.userid = u.id WHERE pickupLocation = ? LIMIT ?, ?`,
    [pickup, start, size]
  );
}

/* List the driver's trips by pickup location and the destination */
async function listPassTripsByPD(pickup, dest, page = 0, size = 10) {
  let start = page * size;

  return dbPool.query(
    `SELECT u.username AS username, u.id AS userid, pickupLocation, destination, FORMAT(price, 2) AS price, departureTime FROM passengerTrips p \
        LEFT JOIN users u ON p.userid = u.id WHERE pickupLocation = ? AND destination = ? LIMIT ?, ?`,
    [pickup, dest, start, size]
  );
}

module.exports = {
  rebuildDatabase,
  addUser,
  getUserById,
  getUserByName,
  setAdminState,
  deleteUser,
  listUsers,
  updateUser,
  addDriverTrip,
  addPassengerTrip,
  listDriverTrips,
  listPassengerTrips,
  getPassTripsByID,
  getDriverTripsByID,
  listDriverTripsByDest,
  listDriverTripsByPickupLoc,
  listDriverTripsByPD,
  listPassTripsByPickupLoc,
  listPassTripsByDest,
  listPassTripsByPD,
};
