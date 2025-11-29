const express = require('express');
const authRoute = require('./auth.route');
const categoryRoute = require('./category.route');
const questionRoute = require('./question.route');
const blogsRoute = require('./blogs.route');
const preRoute = require('./pathology/prerecorded.route');
const liveRoute = require('./pathology/livecourses.route');
const upcommingprogramRoute = require('./pathology/upComingProgram.route')
const examListRoute = require('./examCategory.route');
const cartRoute = require('./cart.route');
const paymentRoute = require('./payment.route');
const faqRoute = require('./faq.route')
const contactusRoute = require('./contactUs.route')
const upcommingRoute = require('./upcomming.route')

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
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
  {
    path: '/examlist',
    route: examListRoute,
  },
  {
    path: '/cart',
    route: cartRoute,
  },
  {
    path: '/payment',
    route: paymentRoute,
  },
  {
    path: '/faq',
    route: faqRoute
  },
  {
    path: '/contactus',
    route: contactusRoute
  },
  {
    path: '/upcomming',
    route: upcommingRoute
  },
  {
    path: '/upcomming-program',
    route: upcommingprogramRoute
  }
];


defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});


module.exports = router;
