'use strict';
//@ts-check
const nconf = require('nconf');

/* Make sure that config/test.json has access credentials for a database
 * you'll use for testing.  The tests will wipe this database. */
nconf.argv().env().file({ file: 'config/test.json' });

const {
  rebuildDatabase,
  addUser,
  getUserById,
  getUserByName,
  setAdminState,
  listUsers,
  updateUser,
  deleteUser,
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
} = require('./queries');

beforeAll(async () => {
  /* Wipe and recreate the database before running the tests. */
  return rebuildDatabase();
});

function makeUser(i) {
  return {
    email: `email-${i}@example.com`,
    username: `username-${i}`,
    password: `$2$....`,
    lastname: `lastname-${i}`,
    firstname: `firstname-${i}`,
    phone: i >= 10 ? `150783600${i}` : `1507836000${i}`,
    admin: 0,
  };
}

function makeTrip(i) {
  return {
    userid: i,
    pickupLocation: `location-${i % 10}`,
    destination: `location-${(i + 1) % 11}`,
    price: i,
    departureTime: `1000-01-01 00:00:0${i % 10}`,
  };
}

describe('Test User Management', function () {
  for (let i = 1; i <= 35; i++) {
    it(`tests that user #${i} can be added`, async () => {
      const userAdd = async (i) => {
        let id = await addUser(makeUser(i)); // Expect AUTO_INCREMENT
        return id === i;
      };
      return expect(userAdd(i)).resolves.toBe(true);
    });
  }

  it(`tests that usernames are unique`, async () => {
    const userAdd = () =>
      addUser({ ...makeUser(1), email: `email-unique@example.com` });
    return expect(userAdd()).rejects.toHaveProperty('code', 'ER_DUP_ENTRY');
  });

  it(`tests that emails are unique`, async () => {
    const userAdd = () =>
      addUser({
        ...makeUser(1),
        username: `username-unique`,
      });
    return expect(userAdd()).rejects.toHaveProperty('code', 'ER_DUP_ENTRY');
  });

  for (let i = 1; i <= 35; i++) {
    it(`tests that user ${i} can be retrieved by id`, async () => {
      const shouldBe = { ...makeUser(i), id: i };
      const users = await getUserById(i);
      expect(users.length).toBe(1);
      const [user] = users;
      return expect(user).toEqual(shouldBe);
    });
  }

  for (let i = 1; i <= 35; i++) {
    it(`tests that user ${i} can be retrieved by name`, async () => {
      const shouldBe = { ...makeUser(i), id: i };
      const users = await getUserByName(shouldBe.username);
      expect(users).toHaveLength(1);
      const [user] = users;
      return expect(user).toEqual(shouldBe);
    });
  }

  it(`tests that existing users can be appointed admins`, async () => {
    const res = await setAdminState(1, 1);
    expect(res).toHaveProperty('affectedRows', 1);
    expect(res).toHaveProperty('changedRows', 1);
    const user = await getUserById(1);
    expect(user).toHaveLength(1);
    expect(user[0]).toHaveProperty('admin', 1);
  });

  it(`tests that users 1-10 can be listed `, async () => {
    // note: 0, 10 does not mean 0 to 10; it means the
    // first 10 entries, sorted by id
    let res = await listUsers(0, 10);
    expect(res).toHaveLength(10);
    expect(res).toMatchObject(
      [...Array(10).keys()].map((i) => {
        // eslint-disable-next-line no-unused-vars
        let { password, admin, ...rest } = makeUser(i + 1);
        return { ...rest };
      })
    );
  });

  it(`tests that users 18-24 can be listed `, async () => {
    let res = await listUsers(3, 6);
    expect(res).toHaveLength(6);
    expect(res).toMatchObject(
      [...Array(6).keys()].map((i) => {
        // eslint-disable-next-line no-unused-vars
        let { password, admin, ...rest } = makeUser(i + 19);
        return { ...rest };
      })
    );
  });

  let partialUpdate = {
    email: 'newemail1@example.com',
    firstname: 'newfirst',
    password: '#2...',
  };

  it(`tests that user information can be updated`, async () => {
    let res = await updateUser(1, partialUpdate);
    expect(res).toHaveProperty('affectedRows', 1);
    expect(res).toHaveProperty('changedRows', 1);

    res = updateUser(2, partialUpdate); // should trigger duplicate email
    expect(res).rejects.toHaveProperty('code', 'ER_DUP_ENTRY');

    res = await updateUser(3, { password: 'newpass' });
    expect(res).toHaveProperty('affectedRows', 1);
    expect(res).toHaveProperty('changedRows', 1);

    let users = await getUserById(3);
    expect(users.length).toBe(1);
    let [user] = users;
    return expect(user).toEqual({ ...makeUser(3), id: 3, password: 'newpass' });
  });
});

describe('Test Trip Management', function () {
  for (let i = 1; i <= 35; i++) {
    it(`tests that driver's trip #${i} can be added`, async () => {
      const driverTripAdd = async (i) => {
        let id = await addDriverTrip(makeTrip(i)); // Expect AUTO_INCREMENT
        return id === i;
      };
      return expect(driverTripAdd(i)).resolves.toBe(true);
    });
  }

  for (let i = 1; i <= 35; i++) {
    it(`tests that passenger's trip #${i} can be added`, async () => {
      const passTripAdd = async (i) => {
        let id = await addPassengerTrip(makeTrip(i)); // Expect AUTO_INCREMENT
        return id === i;
      };
      return expect(passTripAdd(i)).resolves.toBe(true);
    });
  }

  it(`Test that the duplicate drivers trip cannot be added`, async () => {
    let res = addDriverTrip(makeTrip(1));
    return expect(res).rejects.toHaveProperty('code', 'ER_DUP_ENTRY');
  });

  it(`Test that the duplicate passenger's trip cannot be added`, async () => {
    let res = addPassengerTrip(makeTrip(1));
    return expect(res).rejects.toHaveProperty('code', 'ER_DUP_ENTRY');
  });

  it(`Test that a user can be deleted`, async () => {
    await deleteUser(1);
    const user = await getUserById(1);
    return expect(user.length).toBe(0);
  });

  it(`Test that driverTrips 35-24 can be listed `, async () => {
    // note: 0, 10 does not mean 0 to 10; it means the
    // first 10 entries, sorted by id
    let res = await listDriverTrips(0, 10);
    expect(res).toHaveLength(10);
    expect(res).toMatchObject(
      [...Array(10).keys()].map((i) => {
        // eslint-disable-next-line no-unused-vars
        let { userid, price, ...rest } = makeTrip(35 - i);
        return {
          username: `username-${35 - i}`,
          price: price.toFixed(2),
          userid,
          id: 35 - i,
          ...rest,
        };
      })
    );
  });

  it(`Test that passengerTrips 17-12 can be listed `, async () => {
    let res = await listPassengerTrips(3, 6);
    expect(res).toHaveLength(6);
    expect(res).toMatchObject(
      [...Array(6).keys()].map((i) => {
        // eslint-disable-next-line no-unused-vars
        let { userid, price, ...rest } = makeTrip(17 - i);
        return {
          username: `username-${17 - i}`,
          price: price.toFixed(2),
          userid,
          id: 17 - i,
          ...rest,
        };
      })
    );
  });

  for (let i = 2; i <= 10; i++) {
    it(`Test that passenger's trip ${i} can be retrieved by id`, async () => {
      let { price, ...rest } = makeTrip(i);
      const shouldBe = {
        ...rest,
        price: price.toFixed(2),
        username: `username-${i}`,
        phone: makeUser(i).phone,
      };
      const driverTripID = await getPassTripsByID(i);
      expect(driverTripID.length).toBe(1);
      const [trip] = driverTripID;
      return expect(trip).toEqual(shouldBe);
    });
  }

  for (let i = 2; i <= 10; i++) {
    it(`Test that driver's trip ${i} can be retrieved by id`, async () => {
      let { price, ...rest } = makeTrip(i);
      const shouldBe = {
        ...rest,
        price: price.toFixed(2),
        username: `username-${i}`,
        phone: makeUser(i).phone,
      };
      const driverTripID = await getDriverTripsByID(i);
      expect(driverTripID.length).toBe(1);
      const [trip] = driverTripID;
      return expect(trip).toEqual(shouldBe);
    });
  }

  it(`Test that driver's trip can be listed based on destinations`, async () => {
    let res = await listDriverTripsByDest(`location-3`);
    expect(res).toHaveLength(4);
    expect(res).toMatchObject(
      [...Array(4).keys()].map((i) => {
        // eslint-disable-next-line no-unused-vars
        let { userid, price, ...rest } = makeTrip(11 * i + 2); // user-2, 13, 24, 35
        return {
          username: `username-${11 * i + 2}`,
          userid,
          price: price.toFixed(2),
          ...rest,
        };
      })
    );
  });

  it(`Test that driver's trip can be listed based on pickup locations`, async () => {
    let res = await listDriverTripsByPickupLoc(`location-3`);
    expect(res).toHaveLength(4);
    expect(res).toMatchObject(
      [...Array(4).keys()].map((i) => {
        // eslint-disable-next-line no-unused-vars
        let { userid, price, ...rest } = makeTrip(10 * i + 3); // user-3, 13, 23, 33
        return {
          username: `username-${10 * i + 3}`,
          userid,
          price: price.toFixed(2),
          ...rest,
        };
      })
    );
  });

  it(`Test that driver's trip can be listed based on pickup location and the destination`, async () => {
    let res = await listDriverTripsByPD(`location-3`, `location-2`);
    expect(res).toHaveLength(1);
    expect(res).toMatchObject(
      [...Array(1).keys()].map(() => {
        // eslint-disable-next-line no-unused-vars
        let { userid, price, ...rest } = makeTrip(23);
        return {
          username: `username-${23}`,
          userid,
          price: price.toFixed(2),
          ...rest,
        };
      })
    );
  });

  it(`Test that passenger's trip can be listed based on destinations`, async () => {
    let res = await listPassTripsByDest(`location-3`);
    expect(res).toHaveLength(4);
    expect(res).toMatchObject(
      [...Array(4).keys()].map((i) => {
        // eslint-disable-next-line no-unused-vars
        let { userid, price, ...rest } = makeTrip(11 * i + 2); // user-2, 13, 24, 35
        return {
          username: `username-${11 * i + 2}`,
          userid,
          price: price.toFixed(2),
          ...rest,
        };
      })
    );
  });

  it(`Test that passenger's trip can be listed based on pickup locations`, async () => {
    let res = await listPassTripsByPickupLoc(`location-3`);
    expect(res).toHaveLength(4);
    expect(res).toMatchObject(
      [...Array(4).keys()].map((i) => {
        // eslint-disable-next-line no-unused-vars
        let { userid, price, ...rest } = makeTrip(10 * i + 3); // user-3, 13, 23, 33
        return {
          username: `username-${10 * i + 3}`,
          userid,
          price: price.toFixed(2),
          ...rest,
        };
      })
    );
  });

  it(`Test that passenger's trip can be listed based on pickup location and the destination`, async () => {
    let res = await listPassTripsByPD(`location-3`, `location-2`);
    expect(res).toHaveLength(1);
    expect(res).toMatchObject(
      [...Array(1).keys()].map(() => {
        // eslint-disable-next-line no-unused-vars
        let { userid, price, ...rest } = makeTrip(23);
        return {
          username: `username-${23}`,
          userid,
          price: price.toFixed(2),
          ...rest,
        };
      })
    );
  });
});

afterAll(async () => {
  const dbPool = require('./pool');
  return dbPool.end();
});
