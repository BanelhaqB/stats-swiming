/* eslint-disable prefer-destructuring */
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

exports.deleteOne = async (Model, req, next) => {
  const doc = await Model.findByIdAndDelete(req.params.id);

  if (!doc) {
    return next(new AppError('No document find with that ID', 404));
  }

  return 'success';
};

exports.updateOne = async (Model, req, next) => {
  const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!doc) {
    return next(new AppError('No document found with that ID', 404));
  }
  console.log(doc);
  return doc;
};

exports.createOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: { data: doc }
    });
  });

exports.getOne = async (Model, req, next, popOptions) => {
  const query = Model.findById(req.params.id, '-races');
  let doc = {};
  doc = await query;

  if (!doc) {
    return next(new AppError('No document find with that ID', 404));
  }

  if (popOptions === 'addTeachers') {
    const teachers = await Model.find(
      {
        $or: [{ role: 'teacher' }, { role: 'teacher-admin' }]
      },
      '-teacher _id firstName lastName'
    );

    return { doc, teachers };
  }

  return { doc };
};

exports.getAll = async (Model, req) => {
  let filter = {};
  if (req.params.teacherId) filter = { teacher: req.params.teacherId };

  //EXECUTE THE QUERY
  const features = new APIFeatures(Model.find(filter), req.query)
    .filter()
    .search()
    .sort()
    .limitFields()
    .paginate();

  const doc = await features.query;

  // SEND RESPOND
  return doc;
};

exports.races = async (Model, req, next, action, filter) => {
  let userId = req.user.id;
  if (req.params.studentId) {
    const student = await Model.findById(req.params.studentId);
    if (!student.teacher || !student.teacher === req.user.id) {
      next(new AppError('This is not your student', 403));
    }
    userId = req.params.studentId;
  }

  let races;
  const page = !filter.page ? 1 : filter.page * 1;
  if (action === 'getAll') {
    delete filter.page;
    console.log(req.query);
    filter._id = ObjectId(userId);
    console.log(filter);
    races = await Model.aggregate([
      {
        $unwind: '$races'
      },
      {
        $match: filter
      },
      {
        $project: {
          _id: 1,
          race: 1,
          firstName: 1,
          lastName: 1,
          'races._id': 1,
          'races.race': 1,
          'races.time': 1,
          'races.size': 1,
          'races.place': 1,
          'races.date': 1,
          'races.season': 1
        }
      },
      {
        $sort: {
          'races.date': 1
        }
      },
      {
        $skip: (page - 1) * 10
      },
      {
        $limit: 10
      }
    ]);

    // races = await Model.findById(userId, 'firstName lastName races');
  }
  if (action === 'create') {
    races = await Model.findByIdAndUpdate(
      userId,
      {
        $push: { races: req.body }
      },
      { runValidators: true, new: true }
    );
  }
  if (action === 'delete') {
    races = await Model.findByIdAndUpdate(
      userId,
      {
        $pull: { races: { _id: req.params.raceId } }
      },
      { new: true }
    );
  }
  if (action === 'update') {
    await Model.findByIdAndUpdate(
      userId,
      {
        $pull: { races: { _id: req.params.raceId } }
      },
      { new: true }
    );
    races = await Model.findByIdAndUpdate(
      userId,
      {
        $push: { races: req.body }
      },
      { runValidators: true, new: true }
    );
  }

  return { results: races.length, page, races };
};

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
  let filter = {};

  let groupBy = {};

  if (req.params.compareBy === 'group') {
    filter = {
      teacher: ObjectId(user.teacher._id),
      group: user.group,
      'races.race': race,
      sex: user.sex
    };
    groupBy = {
      _id: '$group',
      numRankings: { $sum: 1 },
      avgRaking: { $avg: '$races.time' },
      minRaking: { $min: '$races.time' },
      maxRaking: { $max: '$races.time' }
    };
  }

  if (req.params.compareBy === 'age') {
    filter = { birthYear: user.birthYear, 'races.race': race, sex: user.sex };
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

exports.stats = async (Model, req, next) => {
  let userId = req.user.id;

  if (req.params.studentId) {
    const student = await Model.findById(req.params.studentId);
    if (!student.teacher || !student.teacher === req.user.id) {
      next(new AppError('This is not your student', 403));
    }
    userId = req.params.studentId;
  }

  const user = await Model.findById(userId);

  const race = {
    distance: parseInt(req.params.distance, 10) || 50,
    name: req.params.race || 'nage libre'
  };

  const set = rules(req, user, race);
  const filter = { ...set.filter };
  const groupBy = { ...set.groupBy };

  //   console.log(race);

  // ---- CARD -----
  // - Personal stats -
  // Get all races sorted by time
  const racesTimePerso = await Model.aggregate([
    {
      $unwind: '$races'
    },
    {
      $match: { _id: ObjectId(userId), 'races.race': race }
    },
    {
      $project: {
        race: 1,
        'races._id': 1,
        'races.time': 1
      }
    },
    {
      $sort: {
        'races.time': 1
      }
    }
  ]);

  if (racesTimePerso.length === 0) {
    return next(new AppError('No Race', 404));
  }

  // get personal stats
  const statsPerso = await Model.aggregate([
    {
      $unwind: '$races'
    },
    {
      $match: { _id: ObjectId(userId), 'races.race': race }
    },
    {
      $project: {
        race: 1,
        'races._id': 1,
        'races.time': 1,
        'races.date': 1
      }
    },
    {
      $group: {
        _id: '$_id',
        numRankings: { $sum: 1 },
        avgRaking: { $avg: '$races.time' },
        minRaking: { $min: '$races.time' },
        maxRaking: { $max: '$races.time' }
      }
    },
    {
      $sort: {
        'races.time': 1
      }
    }
  ]);

  //-- Stats by age, sex or group --

  const statsByComapare = await Model.aggregate([
    {
      $unwind: '$races'
    },
    {
      $match: filter
    },
    {
      $project: {
        birthYear: 1,
        sex: 1,
        group: 1,
        teacher: 1,
        'races.race': 1,
        'races._id': 1,
        'races.time': 1,
        'races.date': 1
      }
    },
    {
      $group: groupBy
    },
    {
      $sort: {
        'races.time': 1
      }
    }
  ]);

  // ---- GRAPH -----
  // -- Races sorted by date --
  // -- Personal --
  const racesPersoByDate = await Model.aggregate([
    {
      $unwind: '$races'
    },
    {
      $match: { _id: ObjectId(userId), 'races.race': race }
    },
    {
      $project: {
        race: 1,
        'races._id': 1,
        'races.time': 1,
        'races.date': 1
      }
    },
    {
      $sort: {
        'races.date': 1
      }
    }
  ]);

  // -- Group By --
  const statsPersoByComapareByDates = await Model.aggregate([
    {
      $unwind: '$races'
    },
    {
      $match: { _id: ObjectId(userId), 'races.race': race }
    },
    {
      $project: {
        race: 1,
        'races._id': 1,
        'races.time': 1,
        'races.season': 1
      }
    },
    {
      $group: {
        _id: '$races.season',
        numRankings: { $sum: 1 },
        avgRaking: { $avg: '$races.time' },
        minRaking: { $min: '$races.time' },
        maxRaking: { $max: '$races.time' }
      }
    },
    {
      $sort: {
        _id: 1
      }
    }
  ]);

  const statsByComapareByDates = await Model.aggregate([
    {
      $unwind: '$races'
    },
    {
      $match: filter
    },
    {
      $project: {
        birthYear: 1,
        sex: 1,
        group: 1,
        teacher: 1,
        'races.race': 1,
        'races._id': 1,
        'races.time': 1,
        'races.date': 1,
        'races.season': 1
      }
    },
    {
      $group: {
        _id: '$races.season',
        numRankings: { $sum: 1 },
        avgRaking: { $avg: '$races.time' },
        minRaking: { $min: '$races.time' },
        maxRaking: { $max: '$races.time' }
      }
    },
    {
      $sort: {
        _id: 1
      }
    }
  ]);

  //   console.log(statsPerso);
  const data = {
    compareBy: groupBy._id.substring(1),
    race,
    statsPerso,
    MQ: getStats(racesTimePerso),
    statsByComapare,
    racesPersoByDate,
    reslutsCompare: statsByComapareByDates.length,
    statsPersoByComapareByDates,
    statsByComapareByDates
  };
  return data;
  // res.status(200).json({
  //   status: 'success',
  //   data: {
  //     statsPerso,
  //     MQ: getStats(racesTimePerso),
  //     statsByComapare,
  //     racesPersoByDate,
  //     statsByComapareByDates
  //   }
  // });
};

exports.resetGroups = async (Model, req, next) => {
  const users = await Model.find(
    {},
    '_id firstName lastName group teacher._id groups'
  );

  users.forEach(async user => {
    if (user.group && user.teacher) {
      const group = {
        teacher: user.teacher._id,
        group: user.group,
        season: new Date().getFullYear()
      };
      console.log(group);
      await Model.findByIdAndUpdate(
        user._id,
        {
          $push: { groups: group }
        },
        { new: true }
      );
    }
  });

  // console.log(users);
  return users;
};

exports.deleteGroups = async (Model, req, next) => {
  const users = await Model.find(
    {},
    '_id firstName lastName group teacher._id groups'
  );

  users.forEach(async user => {
    if (user.group && user.teacher) {
      const group = {
        teacher: user.teacher._id,
        group: user.group,
        season: new Date().getFullYear()
      };
      console.log(group);
      await Model.findByIdAndUpdate(
        user._id,
        {
          $set: { groups: [] }
        },
        { new: true }
      );
    }
  });

  // console.log(users);
  return users;
};

exports.getGroups = async (Model, req, next) => {
  const students = await Model.find(
    { teacher: ObjectId(req.user.id) },
    '-teacher -_id group'
  );
  const max = students.reduce(function(prev, current) {
    return prev.group > current.group ? prev : current;
  });

  // console.log(max.group);
  return max.group;
};

exports.getGroupRaces = async (Model, req, next, group, season, teacherId) => {
  const students = await Model.find(
    { teacher: ObjectId(req.user.id) },
    '-teacher -_id group races'
  );
  const races = [];
  students.forEach(student => {
    races.push(...student.races);
  });
  let racesByDate;
  console.log(
    group,
    season,
    teacherId,
    !teacherId ? ObjectId(req.user.id) : teacherId,
    !season || season === 0
  );

  if (season === 0 || !season) {
    racesByDate = await Model.aggregate([
      {
        $match: {
          teacher: !teacherId ? ObjectId(req.user.id) : ObjectId(teacherId)
        }
      },
      {
        $unwind: '$races'
      },
      {
        $project: { group: 1, races: 1 }
      },
      {
        $group: {
          _id: '$group',
          numRankings: { $sum: 1 },
          avgRaking: { $avg: '$races.time' },
          minRaking: { $min: '$races.time' },
          maxRaking: { $max: '$races.time' }
        }
      }
    ]);
  } else {
    racesByDate = await Model.aggregate([
      {
        $unwind: { path: '$groups' }
      },
      {
        $unwind: { path: '$races' }
      },
      {
        $match: {
          teacher: !teacherId ? ObjectId(req.user.id) : ObjectId(teacherId),
          'groups.season': season,
          'races.season': season
        }
      },
      {
        $project: {
          _id: 0,
          group: 1,
          races: 1,
          groups: 1
        }
      },
      {
        $group: {
          _id: '$groups.group',
          numRankings: { $sum: 1 },
          avgRaking: { $avg: '$races.time' },
          minRaking: { $min: '$races.time' },
          maxRaking: { $max: '$races.time' }
        }
      }
    ]);
  }

  // console.log(max.group);
  return racesByDate;
};
