const express = require('express');
const {
  addDriverTrip,
  addPassengerTrip,
  listDriverTrips,
  listPassengerTrips,
  getPassTripsByID,
  getDriverTripsByID,
} = require('../db/queries');
const { requireLogin } = require('./auth');

const triprouter = express.Router();

/* Insert a driver trip */
triprouter.post('/driver', requireLogin, async (req, res) => {
  /* In case the request body contains invalid input */
  try {
    let id = await addDriverTrip(req.body);

    return res.status(200).json({ message: 'Trip succesfully inserted', id });
  } catch (err) {
    return res.status(400).json({ message: err });
  }
});

/* Get a driver trip by its id */
triprouter.get('/driver/:tid', requireLogin, async (req, res) => {
  /* In case the request body contains invalid input */
  try {
    let tid = Number(req.params.tid);

    let trip = await getDriverTripsByID(tid);

    /* Trip not found */
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    trip.id = tid;
    return res.status(200).json(trip);
  } catch (err) {
    return res.status(400).json({ message: err });
  }
});

/* List the driver trips */
triprouter.get('/driver', requireLogin, async (req, res) => {
  let result = [];
  let pageNumber = req.query.page ? Number(req.query.page) : 0;
  let pageSize = req.query.size ? Number(req.query.size) : 10;

  result = await listDriverTrips(pageNumber, pageSize);

  let hasMore = result.length === pageSize;
  res.status(200).json({ trips: result, has_more: hasMore });
});

/* Insert a passenger trip */
triprouter.post('/passenger', requireLogin, async (req, res) => {
  /* In case the request body contains invalid input */
  try {
    let id = await addPassengerTrip(req.body);

    return res.status(200).json({ message: 'Trip succesfully inserted', id });
  } catch (err) {
    return res.status(400).json({ message: err });
  }
});

/* Get a passenger trip by its id */
triprouter.get('/passenger/:tid', requireLogin, async (req, res) => {
  /* In case the request body contains invalid input */
  try {
    let tid = Number(req.params.tid);

    let trip = await getPassTripsByID(tid);

    /* Trip not found */
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    trip.id = tid;
    return res.status(200).json(trip);
  } catch (err) {
    return res.status(400).json({ message: err });
  }
});

/* List the passenger trips */
triprouter.get('/passenger', requireLogin, async (req, res) => {
  let result = [];
  let pageNumber = req.query.page ? Number(req.query.page) : 0;
  let pageSize = req.query.size ? Number(req.query.size) : 10;

  result = await listPassengerTrips(pageNumber, pageSize);

  let hasMore = result.length === pageSize;
  res.status(200).json({ trips: result, has_more: hasMore });
});

module.exports = triprouter;
