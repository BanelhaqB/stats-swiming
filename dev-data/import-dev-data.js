const fs = require('fs');
const csv = require('csv-parser');
const _ = require('lodash');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Users = require('./../models/userModel');

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => console.log('DB connection successful!'));

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
  // console.log(2, users);
};

fs.createReadStream(`${__dirname}/all_rankings_maitres.csv`, 'utf-8')
  .pipe(
    csv({
      headers,
      mapValues: adaptCSV,
      skipLines: 1,
      separator: ';'
    })
  )
  .on('data', data => users.push(data))
  .on('end', groupRacesByUser);

// setTimeout(() => console.log(12, users), 5000);

//IMPORTE DATA INTO DB
const importData = async () => {
  try {
    setTimeout(async () => {
      try {
        await Users.create(users, { validateBeforeSave: false });
        console.log('Data succesfuly loaded!');
        process.exit();
      } catch (err) {
        if (err.code === 11000) {
          console.log('Data succesfuly updated!');
          process.exit();
        } else {
          console.log(err);
          process.exit();
        }
      }
    }, 5000);
  } catch (err) {
    console.log(err);
    process.exit();
  }
};

// DELETE ALL DATA FROM DB
const deleteData = async () => {
  try {
    await Users.deleteMany();
    console.log('Data succesfuly deleted!');
    process.exit();
  } catch (err) {
    console.log(err);
  }
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
