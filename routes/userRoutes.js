const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
// const raceController = require('../controllers/raceController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

//Protect all routes below
router.use(authController.protect);

// router.get('/me', userController.getMe, userController.getUser);
router.patch('/updateMe', userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);
router.patch('/updateMyPW', authController.updatePW);

router.get('/:teacherId/allStudents', userController.getAllUsers);
router.patch('/deleteStudent/:studentId', userController.deleteStudent);

router.get('/resetGroups', userController.resetGroups);
router.get('/deleteGroups', userController.deleteGroups);
router.get('/getGroups', userController.getGroups);
router.get('/getGroupRaces', userController.getGroupRaces);

// router.use(authController.restrictTo('admin', 'teacher-admin'));

router.post('/upload-csv', userController.uploadCSV, userController.importData);

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
