const multer = require("multer");

// Memory storage for external upload
const storage = multer.memoryStorage();

// File filter (accept only images)
const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  const excelAllowed = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ];
  if (allowed.includes(file.mimetype) || excelAllowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Invalid file type."), false);
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
