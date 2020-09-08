const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Users = require('./../models/userModel');
const factory = require('./handlerFactory');

// ---------------------------------------------------------------
// -- RACES SETTINGS
// ---------------------------------------------------------------

exports.getAllRaces = catchAsync(async (req, res, next) => {
  const data = await factory.races(Users, req, next, 'getAll', {});
  const records = await factory.records(req, res, next);

  console.log(records);

  res.status(200).json({
    status: 'success',
    results: data.results,
    races: data.races,
    records
  });
});

// exports.getRecords = catchAsync(async (req, res, next) => {

//   console.log(records);
//   res.status(200).json({
//     status: 'success',

//   });
// });

// exports.createRace = factory.races(Users, 'create');
// exports.deleteRace = factory.races(Users, 'delete');
// exports.updateRace = factory.races(Users, 'update');

// ---------------------------------------------------------------
// -- RACES STATS
// ---------------------------------------------------------------

// Calcul mediane & quartiles
const getStats = function(races) {
  const mediane = races[Math.ceil(races.length / 2) - 1];
  const fstQuartile = races[Math.ceil(races.length / 4) - 1];
  const trdQuartile = races[Math.ceil((3 * races.length) / 4) - 1];

  return {
    mediane: mediane.races.time,
    fstQuartile: fstQuartile.races.time,
    trdQuartile: trdQuartile.races.time
  };
};

const rules = function(req, user, race) {
  let filter = {
    teacher: user.teacher,
    group: user.group,
    'races.race': race
  };

  let groupBy = {
    _id: '$group',
    numRankings: { $sum: 1 },
    avgRaking: { $avg: '$races.time' },
    minRaking: { $min: '$races.time' },
    maxRaking: { $max: '$races.time' }
  };

  if (req.params.compareBy === 'age') {
    filter = { birthYear: user.birthYear, 'races.race': race };
    groupBy = {
      _id: '$birthYear',
      numRankings: { $sum: 1 },
      avgRaking: { $avg: '$races.time' },
      minRaking: { $min: '$races.time' },
      maxRaking: { $max: '$races.time' }
    };
  }

  if (req.params.compareBy === 'sex') {
    filter = { sex: user.sex, 'races.race': race };
    groupBy = {
      _id: '$sex',
      numRankings: { $sum: 1 },
      avgRaking: { $avg: '$races.time' },
      minRaking: { $min: '$races.time' },
      maxRaking: { $max: '$races.time' }
    };
  }

  return {
    filter,
    groupBy
  };
};

exports.cardStats = catchAsync(async (req, res, next) => {
  const data = await factory.stats(Users, req, next);

  res.status(200).json({
    status: 'success',
    data
  });
});

exports.progress = catchAsync(async (req, res, next) => {
  await factory.progress(req, res, next);

  res.status(200).json({
    status: 'success'
  });
});
