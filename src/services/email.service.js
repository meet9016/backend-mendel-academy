// const nodemailer = require('nodemailer');
// const config = require('../config/config');
// const logger = require('../config/logger');
// const moment = require('moment');

// const transport = nodemailer.createTransport(config.email.smtp);
// if (config.env !== 'test') {
//   transport
//     .verify()
//     .then(() => logger.info('Connected to email server'))
//     .catch(() => logger.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env'));
// }

// const sendEmail = async (to, subject, text) => {
//   const msg = { from: config.email.from, to, subject, text };
//   await transport.sendMail(msg);
// };


// const sendResetPasswordEmail = async (to, token) => {
//   const subject = 'Reset password';
//   // replace this url with the link to the reset password page of your front-end app
//   const resetPasswordUrl = `http://link-to-app/reset-password?token=${token}`;
//   const text = `Dear user,
// To reset your password, click on this link: ${resetPasswordUrl}
// If you did not request any password resets, then ignore this email.`;
//   await sendEmail(to, subject, text);
// };

// const sendVerificationEmail = async (to, token) => {
//   const subject = 'Email Verification';
//   // replace this url with the link to the email verification page of your front-end app
//   const verificationEmailUrl = `http://link-to-app/verify-email?token=${token}`;
//   const text = `Dear user,
// To verify your email, click on this link: ${verificationEmailUrl}
// If you did not create an account, then ignore this email.`;
//   await sendEmail(to, subject, text);
// };


// const sendLeaveRequestEmail = async (to, token, leaveData) => {
//   const subject = 'Leave Request';
//   // replace this url with the link to the email verification page of your front-end app
//   const approvalUrl = `${config.backendUrl}/api/v1/leave/approve-leave?token=${token}&id=${leaveData._id}`;
//   const rejectionUrl = `${config.backendUrl}/api/v1/leave/reject-leave?token=${token}&id=${leaveData._id}`;

//   const html = `<!DOCTYPE html>
//         <html>
//         <head>
//             <meta name="viewport" content="width=device-width, initial-scale=1.0">
//                 <style>
//                     @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap');
        
//                     html , body  {
//                         font-family: 'Poppins', sans-serif;
//                         margin: 0;
//                         padding: 0;
//                     }
//                     .pg_template_email {
//                        max-width: 600px;
//                        margin: 0 auto;
//                        padding: 50px;
//                     }
//                     .pg_template_email .pg_logo_tmp {
//                         text-align: center;
//                         max-width: 100%;
//                     }
//                     .pg_template_email .pg_logo_tmp img{
//                         max-width: 40px;
//                     }
//                     .pg_template_email .pg_template_content {
//                         background-color: #f7fbff;
//                         padding: 25px;
//                     }
//                     .pg_template_email .pg_template_content p span {
//                         font-size: 14px;
//                         font-weight: 600;
//                         color: #5F6C91;
//                         line-height: 1.4;
//                     }
//                     .pg_template_email .pg_template_content p {
//                         font-size: 14px;
//                         color: #5F6C91;
//                         font-weight: 400;
//                         margin-bottom: 25px;
//                         line-height: 1.4;
//                     }
//                     .pg_template_email .pg_logo_tmp h2 {
//                         font-size: 18px;
//                         text-align: center;
//                         margin: 25px 0 20px;
//                         font-weight: bold;
//                         color: #313337;
//                         text-transform: capitalize;
//                         padding: 20px 0 0;
//                         line-height: 1.4;
//                     }
//                     .pg_template_email .pg_center {
//                         text-align: center;
//                     }
//                     .pg_template_email .pg_template_content .pg_btn{
//                         padding: 10px 35px;
//                         background: #fff;
//                         color: #fff;
//                         font-weight: 500;
//                         background-color: #848bf5;
//                         font-size: 16px;
//                         line-height: 1.4;
//                         text-decoration: none;
//                         text-transform: capitalize;
//                         border-radius: 5px;
//                         margin: 10px 0 10px;
//                         display: inline-flex;
//                     }
//                     .pg_template_email .pg_success_content  {  
//                        margin:35px 0 0;
//                     }
//                     .pg_template_email .pg_success_content p {  
//                         font-size: 14px;
//                         color: #313337;
//                         font-weight: 400;
//                         line-height: 1.6;
//                         margin: 0;
//                         letter-spacing: 0.5px;
//                         text-transform: capitalize;
//                     }
//                     @media only screen and (max-width: 600px) {
//                         .pg_template_email {
//                             max-width: 100%;
//                             padding: 20px;
//                         }
//                         .pg_template_email .pg_logo_tmp h2 {
//                             margin: 20px 0 15px;
//                             padding: 20px 0 0;
//                             font-size: 18px;
//                             font-weight: bold;
//                         }
//                         .pg_template_email .pg_template_content .pg_btn {
//                             padding: 10px 25px;
//                             margin: 0 0 10px;
//                             font-size: 14px;
//                         }
//                         .pg_template_email .pg_template_content {
//                             padding: 20px;
//                         }
//                     }
//                 </style>
//         </head>
//         <body>
//             <div class="pg_template_email">
//                 <div class="pg_logo_tmp">
//                     <h2>Leave Request</h2>
//                 </div>
//                 <div class="pg_template_content">
//                     <p>Employee Name: <span>${leaveData?.user?.firstName + " " + leaveData?.user?.lastName}</span></p>
//                     <p>Employee Email: <span>${leaveData.user.email}</span></p>
//                     <div class="pg_success">
//                         <div class="pg_success_content">
//                             <p>Click on the button below to approve or reject the leave request.</p>
//                         </div>
//                     </div>

//                     <div class="pg_center" >
//                         <a  class="pg_btn" href=${approvalUrl}>Approve</a>
//                         <a  class="pg_btn" href=${rejectionUrl}>Reject</a>
//                     </div>
        
//                 </div>
//             </div>
//         </body>
//         </html>
//         `

//   const msg = {
//     from: config.email.from,
//     to,
//     subject,
//     html
//   };

//   await transport.sendMail(msg);
// }

// module.exports = {
//   transport,
//   sendEmail,
//   sendResetPasswordEmail,
//   sendVerificationEmail,
//   sendLeaveRequestEmail,
// };


const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('../config/logger');
const moment = require('moment');
const transporter = require('../config/email');

const sendWelcomeEmail = async (to, name, zoomLink) => {
  const mailOptions = {
    from: `"Mendel Shop" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Welcome to Mendel Academy! 🎓',
   html: `
  <div style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial, sans-serif;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" 
      style="max-width:600px; margin:auto; background:white; border-radius:8px; overflow:hidden;">
      
      <!-- Header -->
      <tr>
        <td style="background:#232323; text-align:center; padding:30px 20px;">
          <img src="https://content.jdmagicbox.com/v2/comp/surat/v4/0261px261.x261.230116134549.v5v4/catalogue/mendel-academy-ring-road-surat-institutes-op38wx54xr.jpg" 
               alt="Mendel Academy Logo" 
               style="width:100%; height:100%; margin-bottom:10px;"/>
          <h1 style="color:#F1C232; margin:0; font-size:26px; font-weight:bold;">
            Complete Your Registration
          </h1>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:25px 30px; color:#333;">
          <h2 style="margin-top:0;">Hi ${name}, 👋</h2>
          <p style="font-size:15px; line-height:1.6;">
            Welcome to <b>Mendel Academy</b>! Your account has been created successfully.
          </p>
          <p style="font-size:15px; line-height:1.6;">
            We’re excited to have you with us! Here are your details:
          </p>

          <!-- Zoom Section -->
          ${
            zoomLink
              ? `
              <div style="margin:20px 0; padding:15px; background:#f0f7ff; border-left:4px solid #007bff;">
                <p style="margin:0 0 10px;"><b>Your welcome meeting is ready!</b></p>
                <a href="${zoomLink}" target="_blank" 
                  style="background:#007bff; color:white; padding:12px 20px; 
                         text-decoration:none; border-radius:5px; display:inline-block;">
                  👉 Join Zoom Meeting
                </a>
                <p style="margin-top:10px; font-size:14px;">
                  Or copy link: <br/>
                  <a href="${zoomLink}" target="_blank" style="color:#007bff;">${zoomLink}</a>
                </p>
              </div>
            `
              : `
              <div style="margin:20px 0; padding:15px; background:#fff8e1; border-left:4px solid #f1c232;">
                <p style="margin:0; font-size:14px;">
                  <i>Zoom meeting link is not available yet. We’ll send it as soon as it’s ready.</i>
                </p>
              </div>
            `
          }

          <p style="font-size:15px; margin-top:20px;">
            If you have any questions, feel free to reply to this email!
          </p>

          <p style="margin-top:25px; font-size:15px;">
            Best regards,<br/>
            <b>The Mendel Academy Team</b>
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#232323; padding:15px; text-align:center;">
          <p style="color:#F1C232; margin:0; font-size:13px;">
            © ${new Date().getFullYear()} Mendel Academy. All rights reserved.
          </p>
        </td>
      </tr>
    </table>
  </div>
`

  };

  await transporter.sendMail(mailOptions);
};

const transport = nodemailer.createTransport(config.email.smtp);
if (config.env !== 'test') {
    transport
        .verify()
        .then(() => logger.info('Connected to email server'))
        .catch(() => logger.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env'));
}

const sendEmail = async (to, subject, text) => {
    const msg = { from: config.email.from, to, subject, text };
    await transport.sendMail(msg);
};


const sendResetPasswordEmail = async (to, token) => {
    const subject = 'Reset password';
    // replace this url with the link to the reset password page of your front-end app
    const resetPasswordUrl = `http://link-to-app/reset-password?token=${token}`;
    const text = `Dear user,
To reset your password, click on this link: ${resetPasswordUrl}
If you did not request any password resets, then ignore this email.`;
    await sendEmail(to, subject, text);
};

const sendVerificationEmail = async (to, token) => {
    const subject = 'Email Verification';
    // replace this url with the link to the email verification page of your front-end app
    const verificationEmailUrl = `http://link-to-app/verify-email?token=${token}`;
    const text = `Dear user,
To verify your email, click on this link: ${verificationEmailUrl}
If you did not create an account, then ignore this email.`;
    await sendEmail(to, subject, text);
};


const sendLeaveRequestEmail = async (to, token, leaveData) => {
    const subject = 'Leave Request';
    // replace this url with the link to the email verification page of your front-end app
    const approvalUrl = `${config.backendUrl}/api/v1/leave/approve-leave?token=${token}&id=${leaveData._id}`;
    const rejectionUrl = `${config.backendUrl}/api/v1/leave/reject-leave?token=${token}&id=${leaveData._id}`;

    const html = `<!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap');
        
                    html , body  {
                        font-family: 'Poppins', sans-serif;
                        margin: 0;
                        padding: 0;
                    }
                    .pg_template_email {
                       max-width: 600px;
                       margin: 0 auto;
                       padding: 50px;
                    }
                    .pg_template_email .pg_logo_tmp {
                        text-align: center;
                        max-width: 100%;
                    }
                    .pg_template_email .pg_logo_tmp img{
                        max-width: 40px;
                    }
                    .pg_template_email .pg_template_content {
                        background-color: #f7fbff;
                        padding: 25px;
                    }
                    .pg_template_email .pg_template_content p span {
                        font-size: 14px;
                        font-weight: 600;
                        color: #5F6C91;
                        line-height: 1.4;
                    }
                    .pg_template_email .pg_template_content p {
                        font-size: 14px;
                        color: #5F6C91;
                        font-weight: 400;
                        margin-bottom: 25px;
                        line-height: 1.4;
                    }
                    .pg_template_email .pg_logo_tmp h2 {
                        font-size: 18px;
                        text-align: center;
                        margin: 25px 0 20px;
                        font-weight: bold;
                        color: #313337;
                        text-transform: capitalize;
                        padding: 20px 0 0;
                        line-height: 1.4;
                    }
                    .pg_template_email .pg_center {
                        text-align: center;
                    }
                    .pg_template_email .pg_template_content .pg_btn{
                        padding: 10px 35px;
                        background: #fff;
                        color: #fff;
                        font-weight: 500;
                        background-color: #848bf5;
                        font-size: 16px;
                        line-height: 1.4;
                        text-decoration: none;
                        text-transform: capitalize;
                        border-radius: 5px;
                        margin: 10px 0 10px;
                        display: inline-flex;
                    }
                    .pg_template_email .pg_success_content  {  
                       margin:35px 0 0;
                    }
                    .pg_template_email .pg_success_content p {  
                        font-size: 14px;
                        color: #313337;
                        font-weight: 400;
                        line-height: 1.6;
                        margin: 0;
                        letter-spacing: 0.5px;
                        text-transform: capitalize;
                    }
                    @media only screen and (max-width: 600px) {
                        .pg_template_email {
                            max-width: 100%;
                            padding: 20px;
                        }
                        .pg_template_email .pg_logo_tmp h2 {
                            margin: 20px 0 15px;
                            padding: 20px 0 0;
                            font-size: 18px;
                            font-weight: bold;
                        }
                        .pg_template_email .pg_template_content .pg_btn {
                            padding: 10px 25px;
                            margin: 0 0 10px;
                            font-size: 14px;
                        }
                        .pg_template_email .pg_template_content {
                            padding: 20px;
                        }
                    }
                </style>
        </head>
        <body>
            <div class="pg_template_email">
                <div class="pg_logo_tmp">
                    <h2>Leave Request</h2>
                </div>
                <div class="pg_template_content">
                    <p>Employee Name: <span>${leaveData?.user?.firstName + " " + leaveData?.user?.lastName}</span></p>
                    <p>Employee Email: <span>${leaveData.user.email}</span></p>
                    <div class="pg_success">
                        <div class="pg_success_content">
                            <p>Click on the button below to approve or reject the leave request.</p>
                        </div>
                    </div>

                    <div class="pg_center" >
                        <a  class="pg_btn" href=${approvalUrl}>Approve</a>
                        <a  class="pg_btn" href=${rejectionUrl}>Reject</a>
                    </div>
        
                </div>
            </div>
        </body>
        </html>
        `

    const msg = {
        from: config.email.from,
        to,
        subject,
        html
    };

    await transport.sendMail(msg);
}

module.exports = {
    sendWelcomeEmail,
    transport,
    sendEmail,
    sendResetPasswordEmail,
    sendVerificationEmail,
    sendLeaveRequestEmail,
};
