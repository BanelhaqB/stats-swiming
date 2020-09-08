const express = require('express');
// const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const raceController = require('../controllers/raceController');

const router = express.Router();
router.use(authController.protect);

router.get('/stats/:distance/:race/:compareBy', raceController.cardStats);
router.get(
  '/stats/:distance/:race/:compareBy/:studentId',
  raceController.cardStats
);

router.get('/', raceController.getAllRaces);
router.get('/:studentId', raceController.getAllRaces);
router.get('/progress/:race', raceController.progress);

// router.patch('/addRace', raceController.createRace);
// router.patch('/addRace/:studentId', raceController.createRace);
// router.patch('/removeRace/:raceId', raceController.deleteRace);
// router.patch('/removeRace/:studentId/:raceId', raceController.deleteRace);
// router.patch('/updateRace/:raceId', raceController.updateRace);
// router.patch('/updateRace/:studentId/:raceId', raceController.updateRace);

module.exports = router;
