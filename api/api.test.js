//@ts-check
'use strict';
const nconf = require('nconf');
nconf
  .overrides({
    jwtsecret: 'test sauce',
    jwtexpirationtime: '1m',
    bcryptsaltrounds: 6,
  })
  .argv()
  .env()
  .file({ file: 'config/test.json' });

const bcrypt = require('bcrypt');

const {
  rebuildDatabase,
  addUser /* { ... user } */,
  getUserByName /* name */,
  setAdminState /* userid, 0/1 */,
} = require('../db/queries');

let api;

const request = require('supertest');

describe('Test User Database Deletion', function () {
  it('tests that the user database file can be reset', async () => {
    await rebuildDatabase();
    const adminId = await addUser({
      username: 'admin',
      password: await bcrypt.hash('adminpassword', 12),
      firstname: 'The',
      lastname: 'Admin',
      email: 'admin@admin.co',
      admin: false,
    });
    await setAdminState(adminId, 1);

    api = require('../api'); // let api see the new user file
  });
});

describe('Basic API Tests', function () {
  it('checks that the API is up', async () => {
    const res = await request(api)
      .get('/api')
      .expect('Content-Type', /json/)
      .expect(200);
    const response = res.body;
    expect(response.message).toBe('API is accessible');
  });
});

// http://listofrandomnames.com
const users = [
  'Brinda Breau',
  'Stephania Sollers',
  'Kourtney Keels',
  'Tamatha Tiggs',
  'Melanie Montijo',
  'Roselyn Relf',
  'Eugenio Eppinger',
  'Racheal Reeves',
  'Tomeka Townsley',
  'Brittani Breeden',
  'Cuc Cavallo',
  'Santana Stolz',
  'Josiah Jerkins',
  'Jerrold Jolin',
  'Leigh Langner',
  'Sunday Shulman',
  'Aimee Asay',
  'Jessie Jun',
  'Gerard Gayhart',
  'Xiomara Xiong',
  'Tijuana Tsao',
  'Lucilla Longtin',
  'Madaline Mayson',
  'Charisse Casey',
  'Genia Goldfarb',
  'Doreatha Dampier',
  'Daniella Devoe',
  'Dyan Duquette',
  'Anne Allensworth',
  'Delena Dinan',
].map((fullname) => {
  let [firstname, lastname] = fullname.split(/\s+/);
  return {
    username: firstname.toLowerCase().charAt(0) + lastname.toLowerCase(),
    password: lastname.split('').reverse().join(''),
    firstname,
    lastname,
    email: `${firstname.toLowerCase()}@${firstname.toLowerCase()}`,
    id: undefined, // help typescript
    token: undefined, // help typescript
  };
});

describe('Test User Creation', function () {
  it.each(users)(`tests that user %j can be created`, async (ut) => {
    const res = await request(api).post('/api/users').send(ut).expect(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    const { token, user, message, ...rest } = res.body;
    expect(message.length).toBeGreaterThan(8);
    expect(rest).toEqual({});
    expect(user.username).toBe(ut.username);
    expect(user.email).toBe(ut.email);
    expect(user.firstname).toBe(ut.firstname);
    expect(user.lastname).toBe(ut.lastname);
    expect(user).not.toHaveProperty('password');
    ut.id = user.id;
    ut.token = token;
  });

  it(`tests that attempts to create incomplete users are rejected`, async () => {
    return request(api)
      .post('/api/users')
      .send({ lastname: 'Mr. NoName & NoPassword' })
      .expect(400); // incomplete request
  });

  it(`tests that attempts to create users w/o password are rejected`, async () => {
    return request(api)
      .post('/api/users')
      .send({ lastname: 'Mrs. NoPassword', username: 'mrsnopassword' })
      .expect(400); // incomplete request
  });
});

describe('Test User Creation', function () {
  const { id, ...usersansid } = users[0]; // eslint-disable-line no-unused-vars
  it(`tests that existing users can't be created again with the same name`, async () => {
    return request(api).post('/api/users').send(usersansid).expect(409);
  });
});

describe('Test User Login', function () {
  it(`tests that system treats wrong users and passwords the same`, async () => {
    let res = await request(api)
      .post(`/api/login`)
      .send({ username: 'admin', password: 'nottheadminpassword' })
      .expect(401);
    expect(res.body).toHaveProperty('message');
    let msg_wrong_password = res.body.message;
    let res2 = await request(api)
      .post(`/api/login`)
      .send({ username: 'thisuserdoesnotexist', password: 'does not matter' })
      .expect(401);
    expect(res2.body).toHaveProperty('message');
    expect(res2.body.message).toBe(msg_wrong_password);
  });
});

let admintoken;
describe('Test Post User Creation', function () {
  it.each(users)(`tests that user %j can be retrieved`, async (user) => {
    let res = await request(api)
      .get(`/api/users/${user.id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)
      .expect('Content-Type', /json/);

    const ruser = res.body;
    expect(ruser.username).toEqual(user.username);
    expect(ruser.email).toEqual(user.email);
    expect(ruser.lastname).toEqual(user.lastname);
    expect(ruser.firstname).toEqual(user.firstname);
    expect(ruser).not.toHaveProperty('password');
  });

  it('that I can log on as administrator', async () => {
    let res = await request(api)
      .post(`/api/login`)
      .send({ username: 'admin', password: 'adminpassword' })
      .expect(200);
    expect(res.body).toHaveProperty('token');
    admintoken = res.body.token;
  });

  it('tests that an admin can list users', async () => {
    let listSome = async (from, to, page, expectedHasMore) => {
      let res = await request(api)
        .get(`/api/users?page=${page}`)
        .set('Authorization', `Bearer ${admintoken}`)
        .expect(200);
      const { users: rusers, has_more } = res.body;
      expect(has_more).toBe(expectedHasMore);
      for (const { username, id, firstname, lastname, email } of users.slice(
        from,
        to
      )) {
        expect(rusers).toContainEqual({
          username,
          id,
          lastname,
          firstname,
          email,
          admin: 0,
        });
      }
    };
    return Promise.all([
      listSome(0, 9, 0, true), // omit id 1, which is admin
      listSome(9, 19, 1, true),
      listSome(19, 29, 2, true),
      listSome(29, users.length, 3, false), // last page should return has_more == false
    ]);
  });

  it('tests that an unauthorized user cannot list users', async () => {
    return request(api).get(`/api/users`).expect(401);
  });

  it('tests that an authorized non-admin user cannot list users', async () => {
    return request(api)
      .get(`/api/users`)
      .set('Authorization', `Bearer ${users[0].token}`)
      .expect(403);
  });

  let usera = users[0];
  it('tests that an unauthorized user cannot delete users', async () => {
    return request(api).delete(`/api/users/${usera.id}`).expect(401);
  });

  it('tests that a user can delete themselves when authorized', async () => {
    await request(api)
      .delete(`/api/users/${usera.id}`)
      .set('Authorization', `Bearer ${usera.token}`)
      .expect(200);
    return request(api)
      .get(`/api/users/${usera.id}`)
      .set('Authorization', `Bearer ${usera.token}`)
      .expect(404); // and subsequently cannot be found
  });

  let userb = users[1];
  it('tests that an admin can delete a user', async () => {
    await request(api)
      .delete(`/api/users/${userb.id}`)
      .set('Authorization', `Bearer ${admintoken}`)
      .expect(200);
    return request(api)
      .get(`/api/users/${userb.id}`)
      .set('Authorization', `Bearer ${admintoken}`)
      .expect(404); // and subsequently cannot be found
  });

  let userc = users[2];
  it("tests that a user's name and password can be updated", async () => {
    return Promise.all(
      [admintoken, userc.token].map(async (token) => {
        await request(api)
          .put(`/api/users/${userc.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            firstname: 'Stephania',
            lastname: 'Kellogg',
            password: 'new password',
          })
          .expect(200);
        let res = await request(api)
          .get(`/api/users/${userc.id}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        const ruser = res.body;
        expect(ruser.lastname).toBe('Kellogg');
        expect(ruser.firstname).toBe('Stephania');
        userc.firstname = 'Stephania';
        userc.lastname = 'Kellogg';
        userc.password = 'new password';
      })
    );
  });

  it('tests that a user cannot be updated w/o authentication', async () => {
    return request(api)
      .put(`/api/users/${userc.id}`)
      .send({ fullname: 'Stephania Kellogg', password: 'new password1' })
      .expect(401);
  });

  it('tests that a user cannot be updated w/o authorization', async () => {
    return request(api)
      .put(`/api/users/${userc.id}`)
      .set('Authorization', `Bearer ${userb.token}`)
      .send({ fullname: 'Stephania Kellogg', password: 'new password2' })
      .expect(403);
  });
});

describe('Test Post User Creation', function () {
  const byName = {};
  users.forEach((user) => (byName[user.username] = user));

  it('tests that users can be listed', async () => {
    let res = await request(api)
      .get(`/api/users?page=0`)
      .set('Authorization', `Bearer ${admintoken}`)
      .expect('Content-Type', /json/)
      .expect(200);
    const { users: rusers } = res.body;
    const justName = ({ username }) => username;
    const have = new Set(rusers.map(justName));
    const shouldBe = new Set(
      users
        .slice(2, 11) // first two were deleted
        .map(justName)
    );
    shouldBe.add('admin');
    expect(have).toEqual(shouldBe);
    return expect(
      Promise.all(
        rusers.map(async (ruser) => {
          const token =
            ruser.username in byName
              ? byName[ruser.username].token
              : admintoken;
          const {
            body: { username, id, firstname, lastname, email },
          } = await request(api)
            .get(`/api/users/${ruser.id}`)
            .set('Authorization', `Bearer ${token}`)
            .expect('Content-Type', /json/)
            .expect(200);
          expect(username).toBe(ruser.username);
          expect(lastname).toBe(ruser.lastname);
          expect(firstname).toBe(ruser.firstname);
          expect(id).toBe(ruser.id);
          if (token !== admintoken) {
            expect(lastname).toBe(byName[username].lastname);
            expect(firstname).toBe(byName[username].firstname);
            expect(email).toBe(byName[username].email);
          }
        })
      )
    ).resolves;
  });

  it('checks that all passwords are encrypted properly', async () => {
    return Promise.all(
      users.slice(2).map(async (user) => {
        let [storeduser] = await getUserByName(user.username);
        expect(
          await bcrypt.compare(user.password, storeduser.password)
        ).toBeTruthy();
      })
    );
  });
});

afterAll(async () => {
  const dbPool = require('../db/pool');
  return dbPool.end();
});
