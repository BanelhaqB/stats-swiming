/* eslint-disable no-nested-ternary */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-plusplus */
/* eslint-disable prefer-destructuring */
const mongoose = require('mongoose');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');
const csvParser = require('csv-parser');
const User = require('../models/userModel');

const ObjectId = mongoose.Types.ObjectId;

exports.deleteOne = async (Model, req, next) => {
  const doc = await Model.findByIdAndDelete(req.params.id);

  if (!doc) {
    return next(new AppError('No document find with that ID', 404));
  }

  return 'success';
};

exports.updateOne = async (Model, req, next) => {
  if (req.body.teacher === '-1') {
    // next(new AppError('Vous devez renseigner un professeur', 400));
    req.body.teacher = null;
  }

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

exports.getAll = async (Model, req, options) => {
  let filter = {};
  if (req.params.teacherId)
    filter = { teacher: new ObjectId(req.params.teacherId) };

  console.log(filter, req.query);
  //EXECUTE THE QUERY
  let features;
  if (options === '++') {
    features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .search(filter.teacher)
      .sort()
      .limitFields();
  } else {
    features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .search(filter.teacher)
      .sort()
      .limitFields()
      .paginate();
  }

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

exports.records = async (req, res, next) => {
  let user = req.user;
  if (req.params.studentId) {
    const student = await User.findById(req.params.studentId);
    if (!student.teacher || !student.teacher === req.user.id) {
      next(new AppError('This is not your student', 403));
    }
    user = student;
  }

  const records = user.records;

  return records;
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

  // const set = rules(req, user, race);
  // const filter = { ...set.filter };
  // const groupBy = { ...set.groupBy };

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

  const persoStats = await Model.aggregate([
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
        'races.date': 1,
        'races.age': 1,
        'races.category': 1
      }
    },
    {
      $sort: {
        'races.age': 1
      }
    }
  ]);

  //-- Stat of club
  const clubStats = async by => {
    const data = await Model.aggregate([
      {
        $unwind: '$races'
      },
      {
        $match: { sex: user.sex, 'races.race': race }
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
          'races.season': 1,
          'races.age': 1,
          'races.category': 1
        }
      },
      {
        $group: {
          _id: `$races.${by}`,
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

    console.log(req.params);
    return data;
  };

  const datade = await clubStats(req.params.compareBy);
  // console.log(1, datade);

  const joinDataCourse = by => {
    const data = persoStats.map(course => {
      let obj;
      datade.forEach(age => {
        const compareby =
          by === 'category' ? course.races.category : course.races.age;
        if (compareby === age._id) {
          obj = {
            _id: course._id,
            time: course.races.time,
            date: course.races.date,
            age: course.races.age,
            category: course.races.category,
            avgRanking: age.avgRaking,
            maxRanking: age.maxRaking,
            minRanking: age.minRaking
          };
        }
        return obj;
      });
      return obj;
    });
    return data;
  };

  const margesClub = async by => {
    const data = await Model.aggregate([
      {
        $project: {
          sex: 1,
          group: 1,
          teacher: 1,
          progress: { $objectToArray: '$progress' }
        }
      },
      {
        $unwind: '$progress'
      },
      {
        $match: { sex: user.sex, 'progress.k': `${race.distance} ${race.name}` }
      },
      {
        $unwind: '$progress.v'
      },
      {
        $project: { sex: 1, group: 1, teacher: 1, 'progress.v': 1 }
      },
      {
        $group: {
          _id: `$progress.v.${by}`,
          numRankings: { $sum: 1 },
          avgRaking: { $avg: '$progress.v.poucentage' },
          minRaking: { $min: '$progress.v.poucentage' },
          maxRaking: { $max: '$progress.v.poucentage' }
        }
      },
      {
        $sort: {
          _id: 1
        }
      }
    ]);

    return data;
    // console.log(data);
  };

  const margesClubs = await margesClub(req.params.compareBy);
  // console.log(margesClubs);

  const joinDataMarge = by => {
    const data = user.progress
      .get(`${race.distance} ${race.name}`)
      .map(course => {
        let obj;
        margesClubs.forEach(age => {
          const compareby = by === 'category' ? course.category : course.age;
          if (compareby === age._id) {
            obj = {
              _id: course._id,
              pourcentage: course.poucentage,
              season: course.season,
              age: course.age,
              category: course.category,
              avgRanking: age.avgRaking,
              maxRanking: age.maxRaking,
              minRanking: age.minRaking
            };
          }
          return obj;
        });
        return obj;
      });
    return data;
  };
  // console.log(joinDataMarge('age'));
  // // ---- GRAPH -----
  // // -- Races sorted by date --
  // // -- Personal --
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

  // console.log(
  //   race,
  //   user.records.get(`${race.distance} ${race.name}`),
  //   user.progress.get(`${race.distance} ${race.name}`)
  // );

  console.log(req.params.compareBy, joinDataCourse(req.params.compareBy));
  const data = {
    // compareBy: groupBy._id.substring(1),
    race,
    statsPerso,
    MQ: getStats(racesTimePerso),
    // statsByComapare,
    racesPersoByDate,
    // reslutsCompare: statsByComapareByDates.length,
    // statsPersoByComapareByDates,
    // statsByComapareByDates,
    records: user.records.get(`${race.distance} ${race.name}`),
    progress: user.progress.get(`${race.distance} ${race.name}`),
    rankings: joinDataCourse(req.params.compareBy),
    marges: joinDataMarge(req.params.compareBy)
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
      // console.log(group);
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
      // console.log(group);
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
  // console.log(
  //   group,
  //   season,
  //   teacherId,
  //   !teacherId ? ObjectId(req.user.id) : teacherId,
  //   !season || season === 0
  // );

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

exports.progress = async (req, res, next) => {
  const race = req.params.race;

  // const recordsTmp = req.user.records.get(race);
  const recordsAllRaces = await User.findById(req.user._id, 'records');
  const recordsTmp = recordsAllRaces.records.get(race);
  // console.log(recordsTmp);

  const records = [];
  const progress = [];

  if (!recordsTmp) {
    next(new AppError(`Pas de course au ${race}`, 404));
  } else {
    for (let k = 0; k < recordsTmp.length; k++) {
      if (recordsTmp[k] !== -1)
        records.push({ season: k + 2000, time: recordsTmp[k] });
    }

    // console.log(records.length < 2);

    if (records.length < 2) {
      next(new AppError(`Pas assez de course au ${race}`, 404));
    } else {
      for (let k = 0; k < records.length - 1; k++) {
        const prog = {
          season: records[k + 1].season,
          time:
            Math.round(
              ((records[k].time - records[k + 1].time) / records[k].time) *
                100 *
                100
            ) / 100
        };

        progress.push(prog);
      }

      // console.log(race, records, progress);
    }
  }
};

exports.updateProgress = async (req, res, next) => {
  const allUsers = await this.getAll(User, req, '++');
  const allIds = allUsers.map(el => el._id);
  const users = [];
  const races = [
    '50 nage libre',
    '50 dos',
    '50 brasse',
    '50 papillon',
    '50 4 nages',
    '100 nage libre',
    '100 dos',
    '100 brasse',
    '100 papillon',
    '100 4 nages',
    '200 nage libre',
    '200 dos',
    '200 brasse',
    '200 papillon',
    '200 4 nages',
    '400 nage libre',
    '400 dos',
    '400 brasse',
    '400 papillon',
    '400 4 nages',
    '800 nage libre',
    '800 dos',
    '800 brasse',
    '800 papillon',
    '800 4 nages',
    '1500 nage libre',
    '1500 dos',
    '1500 brasse',
    '1500 papillon',
    '1500 4 nages'
  ];

  for await (id of allIds) {
    const AllRaces = await User.findById(id, 'records birthYear sex');
    let records = [];
    let progress = [];
    const allProgess = new Map();
    console.log(`------${id}-------`);

    for await (race of races) {
      records = [];
      progress = [];
      // const recordsTmp = req.user.records.get(race);

      const recordsTmp = AllRaces.records.get(race);
      // console.log(recordsTmp);

      if (!recordsTmp) {
        console.log(`Pas de course au ${race}`, 404);
      } else {
        for (let k = 0; k < recordsTmp.length; k++) {
          if (recordsTmp[k] !== -1)
            records.push({ season: k + 2000, time: recordsTmp[k] });
        }

        // console.log(records.length < 2);

        if (records.length < 2) {
          console.log(`Pas assez de course au ${race}`, 404);
        } else {
          for (let k = 0; k < records.length - 1; k++) {
            const season = records[k + 1].season;
            const age = season - AllRaces.birthYear;
            let category;

            if (AllRaces.sex === 'F') {
              category =
                age <= 10
                  ? 'avenir'
                  : age <= 13
                  ? 'jeune'
                  : age <= 17
                  ? 'junior'
                  : 'senior';
            } else {
              category =
                age <= 11
                  ? 'avenir'
                  : age <= 14
                  ? 'jeune'
                  : age <= 18
                  ? 'junior'
                  : 'senior';
            }

            const prog = {
              season,
              age,
              category,
              poucentage:
                Math.round(
                  ((records[k].time - records[k + 1].time) / records[k].time) *
                    100 *
                    100
                ) / 100
            };

            progress.push(prog);
          }

          console.log(race, '\n', records, '\n', progress);
          allProgess.set(race, progress);
        }
      }
    }
    console.log(allProgess);
    const user = await User.findByIdAndUpdate(
      id,
      { progress: allProgess },
      {
        new: true,
        runValidators: true
      }
    );
    users.push(user);
    console.log('------------------');
  }

  return users;
  // console.log(allIds);
};
