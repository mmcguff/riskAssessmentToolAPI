const { User, validate } = require('../models/User');
const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const utils = require('./helper/utils');
const targetIncidents = [
  'Fire',
  'Flood',
  'Drought',
  'Hurricane',
  'Tornado',
  'Earthquake',
  'Snow'
];
const MongoClient = require('mongodb').MongoClient;
const { url, configs } = require('../configs/dbConfig');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

router.post('/', async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const user = new User({
    email: req.body.email,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    streetAddress: req.body.streetAddress,
    state: req.body.state,
    zip: req.body.zip,
    household: req.body.household
  });
  await user.save();

  res.send(user);
});

router.get('/:userId', async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user)
    return res.status(404).send('The user with the given ID was not found.');

  MongoClient.connect(url, { useNewUrlParser: true }, (err, db) => {
    if (err) throw err;
    const dbo = db.db(configs.db);
    const query = { state: user.state, incidentType: { $in: targetIncidents } };
    dbo
      .collection('fema')
      .find(query)
      .toArray((err, body) => {
        if (err) throw err;
        res.send(utils.transformFEMABody(body));
        db.close();
      });
  });
});

module.exports = router;
