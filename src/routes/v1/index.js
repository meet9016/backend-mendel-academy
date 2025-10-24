const express = require('express');
const authRoute = require('./auth.route');
const holidayRoute = require('./holiday.route');
const categoryRoute = require('./category.route');
const questionRoute = require('./question.route');
const blogsRoute = require('./blogs.route');
const preRoute = require('./prerecorded.route');
const liveRoute = require('./livecourses.route');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/holiday', 
    route: holidayRoute,
  },
  {
    path: '/category', 
    route: categoryRoute,
  },
  {
    path: '/question', 
    route: questionRoute,
  },
  {
    path: '/blogs', 
    route: blogsRoute,
  },
  {
    path: '/prerecorded', 
    route: preRoute,
  },
   {
    path: '/livecourses', 
    route: liveRoute,
  },
];


defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});


module.exports = router;
