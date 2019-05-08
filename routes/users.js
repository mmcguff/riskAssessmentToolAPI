const {User, validate} = require('../models/User');
const {Risk} = require('../models/risk');
const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const rp = require('request-promise');
const _ = require('lodash');


function filterByDrought(item){ return item.value == "Drought" ? true : false};


async function getRisks(data) {
  
  const totalIncidents = data.metadata.count;
  let incidentArray = data.DisasterDeclarationsSummaries;

  const fire = incidentArray.filter(function(incident){ return incident.incidentType == 'Fire';}).length;
  const flood = incidentArray.filter(function(incident){ return incident.incidentType == 'Flood';}).length;
  const drought = incidentArray.filter(function(incident){ return incident.incidentType == 'Drought';}).length;
  const hurricane = incidentArray.filter(function(incident){ return incident.incidentType == 'Hurricane';}).length;
  const tornado = incidentArray.filter(function(incident){ return incident.incidentType == 'Tornado';}).length;
  const earthquake = incidentArray.filter(function(incident){ return incident.incidentType == 'Earthquake';}).length;
  const snow = incidentArray.filter(function(incident){ return incident.incidentType == 'Snow';}).length;

  const payload = {
      totalIncidents,
      fire,
      flood,
      drought,
      hurricane,
      tornado,
      earthquake,
      snow
  }
  // let risk = new Risk({...payload});
  // risk = await risk.save();
  return payload; 
}


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
      risk: await getRisks(req.body.state, req.body.zip)
    });
    await user.save();
    
    res.send(user);
  });

router.get('/:userId', async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).send('The user with the given ID was not found.');
  
  const state = user.state; //TODO: Do Error handling on this
  const options = {
    uri: 'http://www.fema.gov/api/open/v1/DisasterDeclarationsSummaries',
    qs: {  
      "$inlinecount":  "allpages",
      "$select":  "title,incidentType,state",
      "$orderby":  "incidentType",
      "$filter":  "state eq '" + state 
    +  "' and incidentType eq 'Fire' or state eq '" + state 
    +  "' and incidentType eq 'Flood' or state eq '" + state 
    +  "' and incidentType eq 'Drought' or state eq '" + state 
    +  "' and incidentType eq 'Hurricane' or state eq '" + state 
    +  "' and incidentType eq 'Tornado' or state eq '" + state 
    +  "' and incidentType eq 'Earthquake' or state eq '" + state 
    +  "' and incidentType eq 'Snow'"
    },
       json: true
  };

  rp(options)
  .then(async (data) => {
      const payload = await getRisks(data);
      res.send(payload);
  })
  .catch(async (err) => {
      console.log(err);
      res.send(err);
  });

});



module.exports = router; 