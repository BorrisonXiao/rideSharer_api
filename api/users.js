const express = require('express');
const {
  rebuildDatabase,
  addUser /* { ... user } */,
  deleteUser /* userid */,
  getUserById /* id */,
  getUserByName /* name */,
  listUsers /* firstPage, pgSize */,
  updateUser /* id, { ...user } */,
} = require('../db/queries');
const { requireLogin, issueToken, requireAdmin } = require('./auth');
const nconf = require('nconf');
const bcryptsaltrounds = nconf.get('bcryptsaltrounds');

const userrouter = express.Router();

/* Set up the encryption package */
const bcrypt = require('bcrypt');

/* Handle the RESET request, clear the user database */
userrouter.delete('/', requireAdmin, async (req, res) => {
  await rebuildDatabase();
  res.status(200).json({ message: 'Username already existed' });
});

/* Add a user into the database */
async function create_user(user) {
  if (
    !user.firstname ||
    !user.lastname ||
    !user.password ||
    user.password === '' ||
    !user.username
  ) {
    /* Invalid user data or missing password */
    return -1;
  }
  /* User existed in the database already */
  if ((await getUserByName(user.username)).length !== 0) {
    return -2;
  }

  /* Encrypt the password before storing it */
  user.password = await bcrypt.hash(user.password, bcryptsaltrounds);
  user.admin = 0; /* By default, the user does not have admin permission */

  /* User can be created successfully */
  return await addUser(user);
}

/* Handle the POST request, create a new user in the database */
userrouter.post('/', async (req, res) => {
  let user_id = await create_user(req.body);
  let user_in_db = (await getUserById(user_id))[0];

  if (user_id >= 0) {
    /* Customized response data */
    let token = issueToken(user_in_db);
    let user = {
      /**
       * Some fields are no longer needed (email, firstname, lastname),
       * they are kept for the apitest only.
       */
      id: user_id,
      admin: user_in_db.admin,
      firstname: user_in_db.firstname,
      lastname: user_in_db.lastname,
      username: user_in_db.username,
      email: user_in_db.email,
      authenticated: true,
    };
    let message = 'Successfully Created User';
    res.status(200).json({ token, user, message });
  } else if (user_id === -1) {
    /* Invalid user data or missing password */
    res.status(400).json({
      message: 'Invalid user information, one or more field(s) missing',
    });
  } else if (user_id === -2) {
    /* User already existed in the database */
    res.status(409).json({ message: 'Username already existed' });
  } else {
    /* Error user_id */
    res.status(404).json({ message: 'Error: user id' });
  }
});

/* Handle the GET request, return a single user */
userrouter.get('/:id', async (req, res) => {
  let user_id = Number(req.params.id);

  let user_in_db = (await getUserById(user_id))[0];
  if (user_in_db) {
    res.status(200).set('Content-Type', 'application/json').json({
      username: user_in_db.username,
      firstname: user_in_db.firstname,
      lastname: user_in_db.lastname,
      email: user_in_db.email,
      id: user_in_db.id,
      admin: user_in_db.admin,
    });
  } else {
    /* If the user is not found */
    res.status(404).json({ message: 'User not found' });
  }
});

/* Handle the GET request where the users will be displayed in a list */
userrouter.get('/', requireAdmin, async (req, res) => {
  let result = [];
  let pageNumber = req.query.page ? Number(req.query.page) : 0;
  let pageSize = req.query.size ? Number(req.query.size) : 10;

  result = await listUsers(pageNumber, pageSize);

  let hasMore = result.length === pageSize;
  res.status(200).json({ users: result, has_more: hasMore });
});

/* Handle the DELETE request for a single user */
userrouter.delete('/:id', requireLogin, async (req, res) => {
  let user_id = Number(req.params.id);

  /* Non-admin user wants to delete another user */
  if (!req.user.admin && Number(req.user.id) !== user_id) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  /* Delete the user from the database */
  await deleteUser(user_id);
  return res.status(200).json({ message: 'User is deleted' });
});

/* Handle the PUT (update) request for a single user */
userrouter.put('/:id', requireLogin, async (req, res) => {
  let user_id = Number(req.params.id);
  let user = (await getUserById(user_id))[0];
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  if (req.body.password) {
    req.body.password = await bcrypt.hash(req.body.password, bcryptsaltrounds);
  }

  /* Update the user in the database */
  await updateUser(user_id, req.body);
  res
    .status(200)
    .json({ message: 'Successfully updated user', 'Content-Type': '/json/' });
});

module.exports = userrouter;
