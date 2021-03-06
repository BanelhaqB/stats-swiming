// const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
// const Email = require('./../utils/email');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  //Remove the password from the output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    birthYear: req.body.birthYear,
    sex: req.body.sex,
    // club: req.body.club,
    races: req.body.races,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role
  });
  // console.log(newUser);
  res.status(200).json({
    status: 'success',
    data: newUser
  });
  //const url = `${req.protocol}://${req.get('host')}/me`;
  //console.log(url);
  //await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //1) Check if email & pw exists
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  //2) Chek if user existe && pw is correct
  console.log(1);
  const user = await User.findOne({ email }).select('+password');
  console.log(2);
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  //3) If everythings is ok, send token to the client.
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  //1) Getting token if it's exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(new AppError('You are not logged in!', 401));
  }

  //2) Validate the token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3) Check if user still exists
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return next(
      new AppError('The user belonging to this token does not exist.', 401)
    );
  }

  //4) Check if user changed PW after JWT was issued
  if (freshUser.changedPWAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );
  }
  const teachers = await User.find(
    {
      $or: [{ role: 'teacher' }, { role: 'teacher-admin' }]
    },
    '-teacher _id firstName lastName'
  );
  req.user = freshUser;
  res.locals.user = freshUser;
  req.teachers = teachers;
  res.locals.teachers = teachers;
  next();
});

//Only for rendered pages, no errors
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      //1) Verifie the token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      //2) Check if user still exists
      const freshUser = await User.findById(decoded.id);
      if (!freshUser) {
        return next();
      }

      //3) Check if user changed PW after JWT was issued
      if (freshUser.changedPWAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = freshUser;
      return next();
    } catch (err) {
      return next();
    }
  }

  next();
};

exports.restrictTo = (...roles) => {
  //console.log(roles);
  return (req, res, next) => {
    //roles ['admin','lead-guide']

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permisssion to perform this action', 403)
      );
    }
    next();
  };
};

// exports.forgotPW = catchAsync(async (req, res, next) => {
//   //1) Get user based on POSTed email
//   const user = await User.findOne({ email: req.body.email });
//   if (!user) {
//     return next(new AppError('There is no user with this email', 404));
//   }

//   //2) Generate the random rest token
//   const resetToken = user.createPWResetToken();
//   await user.save({ validateBeforeSave: false });

//   //3) Send it to user's email

//   try {
//     const resetURL = `${req.protocol}://${req.get(
//       'host'
//     )}/api/v1/users/resetPW/${resetToken}`;

//     await new Email(user, resetURL).sendPasswordReset();

//     res.status(200).json({
//       status: 'succes',
//       message: 'Token sent to email!'
//     });
//   } catch (err) {
//     user.passwordResetToken = undefined;
//     user.passwordResetExpire = undefined;
//     await user.save({ validateBeforeSave: false });

//     return next(
//       new AppError('There was an error sending the email! try later', 500)
//     );
//   }
// });

// exports.resetPW = catchAsync(async (req, res, next) => {
//   //1) Get user based on the token
//   const hashedToken = crypto
//     .createHash('sha256')
//     .update(req.params.token)
//     .digest('hex');

//   const user = await User.findOne({
//     passwordResetToken: hashedToken,
//     passwordResetExpire: { $gt: Date.now() }
//   });

//   //2) Set new pw only if the token has not expire
//   if (!user) {
//     return next(new AppError('Token is invalid or has expired', 400));
//   }

//   user.password = req.body.password;
//   user.passwordConfirm = req.body.passwordConfirm;
//   user.passwordResetToken = undefined;
//   user.passwordResetExpire = undefined;
//   await user.save();

//   //3) Update changeedPWat proprety for the user
//   //4) log the user, send JWT
//   createSendToken(user, 200, res);
// });

exports.updatePW = catchAsync(async (req, res, next) => {
  //1) Get user from the collection
  const user = await User.findById(req.user.id).select('+password');

  //2) check if posted pw is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }

  //3) if so, update the pw
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  //4) Log the user, send JWT
  createSendToken(user, 200, res);
});
