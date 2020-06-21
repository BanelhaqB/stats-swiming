const path = require('path');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const globalErrorHandler = require('./controllers/errorController');
const userRouter = require('./routes/userRoutes');
const raceRouter = require('./routes/raceRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1-GLOBAL MIDDLEWARE *****************************************************
app.use(express.static(path.join(__dirname, 'public')));
app.use(helmet()); //Security HTTP headers --- Has to be the first middleware

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests froom this IP, please try again in an hour!'
});
app.use('/api', limiter);

//Reading data from body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

//Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 3- ROUTES *****************************************************
app.use('/', viewRouter);

app.use('/api/v1/users', userRouter);
app.use('/api/v1/races', raceRouter);

app.use(globalErrorHandler);

module.exports = app;
