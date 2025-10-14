const jwt = require('jsonwebtoken');

const generateAuthTokens = async (user) => {
  const accessToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  return { access: accessToken };
};

module.exports = {
  generateAuthTokens,
};