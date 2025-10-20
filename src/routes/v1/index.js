const express = require('express');
const authRoute = require('./auth.route');
const holidayRoute = require('./holiday.route');
const categoryRoute = require('./category.route');
const questionRoute = require('./question.route');
const blogsRoute = require('./blogs.route');

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
];


defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});


module.exports = router;
