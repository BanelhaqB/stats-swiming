/* eslint-disable no-restricted-syntax */
/* eslint-disable no-plusplus */
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');
const _ = require('lodash');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Users = require('./../models/userModel');
const factory = require('./handlerFactory');

// ---------------------------------------------------------------
// -- IMPORT CSV
// ---------------------------------------------------------------

//***************** Uploading Data *****************
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('text/csv')) {
    cb(null, true);
  } else {
    cb(new AppError('Not a csv! Please upload only csv.', 400), false);
  }
};

const upload = multer({
  dest: 'tmp/csv',
  fileFilter: multerFilter
});

exports.uploadCSV = upload.fields([{ name: 'csv' }]);

let users = [];
//***************** Set the headers *****************
const headers = [
  'race',
  'sex',
  'lastName',
  'firstName',
  'birthYear',
  'clubCode',
  'clubName',
  'nation',
  'size',
  'time',
  'date',
  'place',
  'season',
  'realy'
];

//***************** Adapt CSV for the database *****************
// eslint-disable-next-line no-unused-vars
const adaptCSV = function({ header, index, value }) {
  if (header === 'date') {
    const date = [
      value.split('/')[2],
      value.split('/')[1],
      value.split('/')[0]
    ].join();
    return Date.parse(date);
  }
  if (header === 'race') {
    const race = {
      distance: value.split(' ')[0] * 1,
      name: value
        .split(' ')
        .slice(1)
        .join(' ')
    };
    return race;
  }
  if (header === 'birthYear' || header === 'season') {
    return value * 1;
  }
  if (header === 'time') {
    const time =
      Math.round(
        (value.split(':')[2] * 1 +
          value.split(':')[1] * 60 +
          value.split(':')[0] * 3600) *
          100
      ) / 100;
    return time;
  }

  return value;
};

//***************** Group the races by users (--firstName & lastName & birthYear--) *****************
const groupRacesByUser = async () => {
  const userGrouped = await _.groupBy(users, function(el) {
    const key = `${el.firstName}#${el.lastName}#${el.birthYear}`;
    return key;
  });

  users = await _.map(userGrouped, function(user) {
    return {
      sex: user[0].sex,
      firstName: user[0].firstName,
      lastName: user[0].lastName,
      birthYear: user[0].birthYear,
      email: `${user[0].birthYear}@${
        user[0].firstName
      }.${user[0].lastName.replace(/ /g, '-')}.cpn`,
      password: 'pass1234',
      passwordConfirm: 'pass1234',
      races: user
    };
  });
  // console.log(userGrouped);
};

const getCategory = (sex, age) => {
  if (sex === 'F') {
    if (age <= 10) return 'avenir';
    if (age <= 13) return 'jeune';
    if (age <= 17) return 'junior';
    if (age >= 18) return 'senior';
  }
  if (sex === 'M') {
    if (age <= 11) return 'avenir';
    if (age <= 14) return 'jeune';
    if (age <= 18) return 'junior';
    if (age >= 19) return 'senior';
  }
};

//***************** Convert CSV to JSON *****************
const convertCSVToJSON = function(file) {
  fs.createReadStream(`${file}`, 'utf-8')
    .pipe(
      csv({
        headers,
        mapValues: adaptCSV,
        skipLines: 1,
        separator: ';'
      })
    )
    .on('data', data => {
      data.age = data.season - data.birthYear;
      data.category = getCategory(data.sex, data.age);
      // console.log(data);
      users.push(data);
    })
    .on('end', async () => {
      await groupRacesByUser();
      // console.log(users[0].races);
    });
};

const addRecord = async (req, res, next) => {
  const allUsers = await factory.getAll(Users, req, '++');
  for await (user of allUsers) {
    const map = new Map();

    user.races.forEach(race => {
      const season = race.season - 2000;

      if (!map.get(`${race.race.distance} ${race.race.name}`)) {
        const seasons = [];
        for (let index = 0; index < new Date().getFullYear() - 2000; index++) {
          seasons.push(-1);
        }
        seasons[season] = race.time;
        map.set(`${race.race.distance} ${race.race.name}`, seasons);
      } else if (
        map.get(`${race.race.distance} ${race.race.name}`)[season] === -1 ||
        race.time < map.get(`${race.race.distance} ${race.race.name}`)[season]
      ) {
        const seasons = map.get(`${race.race.distance} ${race.race.name}`);
        seasons[season] = race.time;
        map.set(`${race.race.distance} ${race.race.name}`, seasons);
        // console.log(user.firstName, user.lastName, map);
      }
    });

    req.params.id = user._id;
    req.body = { records: map };

    await factory.updateOne(Users, req, next);

    // console.log(
    //   user.firstName,
    //   user.lastName,
    //   ': ',
    //   map,
    //   '\n ---------------------- \n'
    // );
  }
};

exports.importData = catchAsync(async (req, res, next) => {
  await Promise.all(
    req.files.csv.map(async file => {
      convertCSVToJSON(file.path);
      fs.unlink(file.path, err => {
        if (err) {
          //   console.log(err);
          return next();
        }
      });
      setTimeout(async () => {
        try {
          await Users.create(users, { validateBeforeSave: false });
          // console.log(users);
          await addRecord(req, res, next);
          console.log('Data succesfuly loaded!');
        } catch (err) {
          if (err.code === 11000) {
            // console.log(users);
            await addRecord(req, res, next);
            console.log('Data succesfuly updated!');
          } else {
            console.log(err);
          }
        }
      }, 5000);
    })
  );
  res.status(200).json({
    status: 'success',
    data: req.files
  });
});

// ---------------------------------------------------------------
// -- USERS SETTINGS
// ---------------------------------------------------------------

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });

  return newObj;
};

exports.updateMe = catchAsync(async (req, res, next) => {
  //1) Create error if user posts pw data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'Vous ne pouvez pas modifier votre mot de passe via ce formulaire',
        400
      )
    );
  }

  if (req.body.teacher === '-1') {
    // next(new AppError('Vous devez renseigner un professeur', 400));
    req.body.teacher = null;
  }

  const filteredBody = filterObj(
    req.body,
    'firstName',
    'lastName',
    'birthYear',
    'teacher',
    'email'
  );

  // 3) Update user document
  console.log(req.body);
  const updatedUser = await Users.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });
  console.log(2);
  res.status(200).json({
    status: 'success',
    data: { user: updatedUser }
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await Users.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined! Please use /signup'
  });
};

exports.getMe = (req, res, next) => {
  console.log(req.user);
  req.params.id = req.user.id;
  next();
};

exports.getAllUsers = catchAsync(async (req, res, next) => {
  // eslint-disable-next-line no-shadow
  const users = await factory.getAll(Users, req);

  res.status(200).json({
    status: 'success',
    results: users.length,
    users: users
  });

  next();
});

exports.updateUser = catchAsync(async (req, res, next) => {
  const user = await factory.updateOne(Users, req, next);

  res.status(200).json({
    status: 'success',
    user
  });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  const message = await factory.deleteOne(Users, req, next);

  res.status(200).json({
    status: message,
    data: null
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const data = await factory.getOne(Users, req, next, 'addTeachers');
  // console.log(data);

  res.status(200).json({
    status: 'success',
    user: data.doc,
    teachers: data.teachers
  });

  next();
});
// ---------------------------------------------------------------
// -- STUDENTS SETTINGS
// ---------------------------------------------------------------

// exports.getAllStudents = factory.getAll(Users);
exports.deleteStudent = catchAsync(async (req, res, next) => {
  // Check if it is your student
  const student = await Users.findById(req.params.studentId);
  if (!student.teacher || !student.teacher._id === req.user.id) {
    next(new AppError('This is not your student', 403));
  }

  // Delete the teacher from the student
  await Users.findByIdAndUpdate(req.params.studentId, { teacher: undefined });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.resetGroups = catchAsync(async (req, res, next) => {
  const users = await factory.resetGroups(Users, req, next);
  // console.log(data);

  res.status(200).json({
    status: 'success',
    results: users.length,
    users: users
  });

  next();
});

exports.deleteGroups = catchAsync(async (req, res, next) => {
  const users = await factory.deleteGroups(Users, req, next);
  // console.log(data);

  res.status(200).json({
    status: 'success',
    results: users.length,
    users: users
  });

  next();
});

exports.getGroups = catchAsync(async (req, res, next) => {
  const nbGroups = await factory.getGroups(Users, req, next);
  // console.log(data);

  res.status(200).json({
    status: 'success',
    nbGroups
  });

  next();
});

exports.getGroupRaces = catchAsync(async (req, res, next) => {
  const races = await factory.getGroupRaces(
    Users,
    req,
    next,
    1,
    2017,
    '5e5930ca831a3d4f0bb66516'
  );
  console.log(races);

  res.status(200).json({
    status: 'success',
    races
  });

  next();
});
