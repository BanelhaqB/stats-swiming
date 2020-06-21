const User = require('./../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');
const userController = require('../controllers/userController');
const factory = require('./handlerFactory');

exports.homePage = catchAsync(async (req, res, next) => {
  res.status(200).render('homePage', {
    title: 'Acceuil'
  });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Log into your account'
  });
};

exports.dashboard = (req, res) => {
  res.status(200).render('dashboard', {
    title: 'Tableau de Bord'
  });
};

exports.getMyAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Profil'
  });
};

exports.getAccount = catchAsync(async (req, res, next) => {
  const data = await factory.getOne(User, req, next, 'addTeachers');
  console.log(res.locals);

  res.status(200).render('account', {
    title: 'Profil',
    userAccount: true,
    userAccountData: data.doc,
    teachers: data.teachers
  });
});

exports.manageUsers = catchAsync(async (req, res, next) => {
  const users = await factory.getAll(User, req);

  res.status(200).render('manageUsers', {
    title: 'Gestion des utilisateurs',
    results: users.length,
    page: req.query.page * 1 || 1,
    users
  });
});

exports.getAllstudents = catchAsync(async (req, res, next) => {
  const users = await factory.getAll(User, req);

  res.status(200).render('students', {
    title: "Liste d'Élèves",
    results: users.length,
    page: req.query.page * 1 || 1,
    users
  });
});

exports.getHistorical = catchAsync(async (req, res, next) => {
  const data = await factory.races(User, req, next, 'getAll', req.query);
  // console.log(data.races.races);
  res.status(200).render('historical', {
    title: "Liste d'Élèves",
    results: data.results,
    page: data.page * 1 || 1,
    races: data.races
  });
});

exports.getStats = catchAsync(async (req, res, next) => {
  res.status(200).render('statistics', {
    title: 'Statistiques'
  });
});
