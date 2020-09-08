const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const _ = require('lodash');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'A user must have a firstname'],
      trim: true,
      lowercase: true,
      maxlength: [30, 'Tour name must have less than 30 caracters'],
      minlength: [3, 'Tour name must have more than 3 caracters']
    },
    lastName: {
      type: String,
      required: [true, 'A user must have a lastname'],
      trim: true,
      lowercase: true,
      maxlength: [30, 'Tour name must have less than 30 caracters'],
      minlength: [3, 'Tour name must have more than 3 caracters']
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, 'Your email is note valid']
    },
    birthYear: {
      type: Number,
      minimum: 1940,
      maximum: new Date().getFullYear()
    },
    sex: {
      type: String,
      required: [true, 'A user must have a sex'],
      trim: true,
      enum: ['M', 'F']
    },
    role: {
      type: String,
      enum: ['user', 'teacher', 'teacher-admin', 'admin'],
      default: 'user'
    },
    teacher: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    group: Number,
    groups: [
      {
        teacher: { type: mongoose.Schema.ObjectId, ref: 'User' },
        group: Number,
        season: Number
      }
    ],
    password: {
      type: String,
      required: [true, 'A user must have a password'],
      minlength: [8, 'Tour name must have more than 8 caracters'],
      select: false
    },
    passwordConfirm: {
      type: String,
      required: [true, 'You must confirm your password'],
      validate: {
        //This only works on CREAT & SAVE!!
        validator: function(el) {
          return el === this.password;
        },
        message: 'Passwords are not the same'
      }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpire: Date,
    active: {
      type: Boolean,
      default: true,
      select: false
    },
    records: {
      // season: {
      //   type: Number,
      //   minimum: 1940,
      //   maximum: new Date().getFullYear()
      // },

      type: Map,
      of: [Number]
    },
    races: [
      {
        race: {
          distance: Number,
          name: {
            type: String,
            enum: [
              'nage libre',
              'dos',
              'brasse',
              'papillon',
              '4 nages',
              'relais nage libre',
              'relais 4 nages'
            ],
            lowercase: true
          }
        },
        date: Date,
        age: Number,
        category: {
          type: String,
          enum: ['avenir', 'jeune', 'junior', 'senior']
        },
        season: {
          type: Number,
          minimum: 1940,
          maximum: new Date().getFullYear()
        },
        place: String,
        time: Number,
        size: {
          type: String,
          enum: ['25', '50']
        },
        relay: {
          type: Boolean,
          default: false
        }
      }
    ]
  }
  // {
  //   toJSON: { virtuals: true },
  //   toObject: { virtuals: true }
  // }
);

userSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'teacher',
    select: '_id sex firstName lastName'
  });

  next();
});

// userSchema.pre(/^find/, function(next) {
//   this.populate({
//     path: 'groups.',
//     select: '_id sex firstName lastName'
//   });

//   next();
// });

const joinRaces = function(races, newRaces) {
  const allRacesFiltred = _.uniqBy(races.concat(newRaces), function(el) {
    return `${el.race}#${el.date}#${el.time}`;
  });

  return allRacesFiltred;
};

userSchema.pre('save', async function(next) {
  if (await this.model('User').exists({ email: this.email })) {
    const user = await this.model('User').find({ email: this.email });
    const allRacesFiltred = joinRaces(user[0].races, this.races);

    await this.model('User').findOneAndUpdate(
      { email: this.email },
      { races: allRacesFiltred }
    );
  }

  next();
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;

  next();
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function(next) {
  // this point to the current query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function(candidatePW, userPW) {
  return await bcrypt.compare(candidatePW, userPW);
};

userSchema.methods.changedPWAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  return false;
};

userSchema.methods.createPWResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  //console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
