const express = require('express');
const viewController = require('../controllers/viewsController');
const authController = require('../controllers/authController');

const router = express.Router();

router.get('/', authController.isLoggedIn, viewController.homePage);
router.get('/login', authController.isLoggedIn, viewController.getLoginForm);

// router.use(authController.protect);

router.get('/dashboard', authController.isLoggedIn, viewController.dashboard);
router.get(
  '/me',
  authController.protect,
  authController.isLoggedIn,
  viewController.getMyAccount
);

router.get(
  '/account/:id',
  authController.protect,
  authController.restrictTo('admin', 'teacher-admin'),
  authController.isLoggedIn,
  viewController.getAccount
);

router.get(
  '/manageUsers',
  authController.protect,
  authController.restrictTo('admin', 'teacher-admin'),
  authController.isLoggedIn,
  viewController.manageUsers
);

router.get(
  '/students',
  authController.protect,
  authController.restrictTo('teacher', 'teacher-admin'),
  authController.isLoggedIn,
  viewController.getAllstudents
);

router.get(
  '/students/:teacherId',
  authController.protect,
  authController.restrictTo('teacher', 'teacher-admin'),
  authController.isLoggedIn,
  viewController.getAllstudents
);

router.get(
  '/historical',
  authController.protect,
  authController.isLoggedIn,
  viewController.getHistorical
);

router.get(
  '/historical/:id',
  authController.protect,
  authController.isLoggedIn,
  viewController.getHistorical
);

router.get(
  '/statistics',
  authController.protect,
  authController.isLoggedIn,
  viewController.getStats
);

router.get(
  '/statistics/:studentId',
  authController.protect,
  authController.isLoggedIn,
  viewController.getStats
);

// router.get(
//   '/students/account/:studentId',
//   authController.protect,
//   authController.restrictTo('teacher', 'teacher-admin'),
//   authController.isLoggedIn,
//   viewController.updateStudent
// );
module.exports = router;
