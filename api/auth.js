const nconf = require('nconf');
const jwtsecret = nconf.get('jwtsecret');
const jwtexpirationtime = nconf.get('jwtexpirationtime');
const { getUserByName /* name */ } = require('../db/queries');

/* Set up the "passport" packages */
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy,
  ExtractJwt = require('passport-jwt').ExtractJwt;

/* Set up the encryption package */
const bcrypt = require('bcrypt');

/* Set up the strategy options */
var opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = jwtsecret;

/* Strategy for verifying the payload */
passport.use(
  new JwtStrategy(opts, async function (jwt_payload, done) {
    /* Get the username in the database */
    let user_in_db = (await getUserByName(jwt_payload.username))[0];

    /* Check if the user is still in the database */
    if (user_in_db) {
      if (Date.now() / 1000 > jwt_payload.exp) {
        done('Token has expired', null, null);
      } else {
        done(null, user_in_db, null);
      }
    } else {
      done("User doesn't exist", null, null);
    }
  })
);

/* Set up jwt package */
const jwt = require('jsonwebtoken');
const issue_token = (user) => {
  let token = jwt.sign(
    {
      username: user.username,
      id: user.id,
      admin: user.admin,
    },
    jwtsecret,
    { expiresIn: jwtexpirationtime }
  );
  return token;
};

const loginRequestHandler = async (req, res) => {
  let user_in_db = (await getUserByName(req.body.username))[0];
  if (user_in_db) {
    if (await bcrypt.compare(req.body.password, user_in_db.password)) {
      /* Username and password match */
      res.status(200).json({
        user: {
          /**
           * Some fields are no longer needed (email, firstname, lastname),
           * they are kept for the apitest only.
           */
          id: user_in_db.id,
          admin: user_in_db.admin,
          firstname: user_in_db.firstname,
          lastname: user_in_db.lastname,
          email: user_in_db.email,
          username: user_in_db.username,
          authenticated: true,
        },
        token: issue_token(user_in_db),
        message: 'Successfully logged in',
      });
    } else {
      /* Password doesn't match */
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } else {
    /* User not found */
    res.status(401).json({ message: 'Invalid username or password' });
  }
};

const requireAuthenticationWithPredicate = (pred) => (req, res, next) => {
  // your code here
  passport.authenticate('jwt', { session: false }, function (err, user) {
    if (err) {
      return res.status(403).json({ message: err });
    }
    if (!user) {
      /* No token is provided */
      if (pred.message) {
        return res.status(401).json({ message: pred.message });
      }
      return res.status(401).json({ message: 'Authentication failed' });
    }
    /* Token verified, check predicate */
    if (pred.test(user)) {
      req.user = user;
      return next();
    } else {
      /* Predicate false, user instead of admin */
      if (pred.message) {
        return res.status(403).json({ message: pred.message });
      }
      return res.status(403).json({ message: 'Authentication failed' });
    }
  })(req, res, next);
};

module.exports = {
  requireAdmin: requireAuthenticationWithPredicate({
    test: (user) => {
      return user.admin;
    },
    message: 'needs admin permissions',
  }),
  issueToken: issue_token,
  loginRequestHandler: loginRequestHandler,
  requireLogin: requireAuthenticationWithPredicate({ test: () => true }),
};
