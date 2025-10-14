const config = require("../config/config");
const moment = require('moment');
const fs = require('fs');



const saveFile = (files) => {
    let fileUploadPath = config.fileUploadPath + '/images/';
    const fileName = moment().unix() + Math.floor(1000 + Math.random() * 9000) + '.' + files.name.split('.').pop();;
    return new Promise(async (resolve, reject) => {
        fileUploadPath = fileUploadPath + fileName;
        files.mv(fileUploadPath, async (err) => {
            if (err) {
                reject(err);
            } else {
                resolve({
                    upload_path: '/images/' + fileName,
                    file_name: fileName
                });
            }
        });
    })
}


const removeFile = (file_name) => {
    let fileUploadPath = config.fileUploadPath;
    return new Promise(async (resolve, reject) => {
        fileUploadPath = fileUploadPath + file_name;
        fs.unlink(fileUploadPath, async (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(true);
            }
        });
    })
}


module.exports = {
    saveFile,
    removeFile
}